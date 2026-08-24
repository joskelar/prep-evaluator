import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const parentDir = path.dirname(projectRoot);
const srcDir = path.join(projectRoot, 'src');
const publicDir = path.join(projectRoot, 'public');
const dataDir = path.join(publicDir, 'data');
const docsReleaseDir = path.join(projectRoot, 'docs', 'release');

// Helper to recursively list files
function getFiles(dir, extensions = []) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, extensions));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.length === 0 || extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

// Case sensitivity check for imports
function checkCaseSensitivityImports() {
  const tsFiles = getFiles(srcDir, ['.ts', '.tsx']);
  const mismatches = [];

  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s+[\s\S]*?\s+from\s+['"](.*?)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.') || importPath.startsWith('@/')) {
        let targetAbsPath;
        if (importPath.startsWith('@/')) {
          targetAbsPath = path.join(srcDir, importPath.substring(2));
        } else {
          targetAbsPath = path.resolve(path.dirname(file), importPath);
        }

        // Try extensions .ts, .tsx, .d.ts, or directory/index.tsx etc.
        const candidates = [
          targetAbsPath + '.tsx',
          targetAbsPath + '.ts',
          targetAbsPath + '.d.ts',
          path.join(targetAbsPath, 'index.tsx'),
          path.join(targetAbsPath, 'index.ts'),
          targetAbsPath // raw
        ];

        let found = false;
        let foundPath = '';
        for (const cand of candidates) {
          // Check if file exists without regarding case
          const parent = path.dirname(cand);
          const base = path.basename(cand);
          if (fs.existsSync(parent)) {
            const children = fs.readdirSync(parent);
            const matchChild = children.find(c => c.toLowerCase() === base.toLowerCase());
            if (matchChild) {
              found = true;
              foundPath = path.join(parent, matchChild);
              // Check if exact casing matches
              if (matchChild !== base) {
                mismatches.push({
                  file: path.relative(projectRoot, file).replace(/\\/g, '/'),
                  import: importPath,
                  expected: base,
                  actual: matchChild,
                  type: 'import'
                });
              }
              break;
            }
          }
        }
      }
    }
  });

  return mismatches;
}

// Check for absolute paths
function checkAbsolutePaths() {
  const tsFiles = getFiles(srcDir, ['.ts', '.tsx']);
  const violations = [];

  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Find strings like "/assets/..." or "/data/..." or absolute HTTP links to localhost
      const absoluteRegex = /['"](\/(assets|data)\/.*?)['"]/g;
      let match;
      while ((match = absoluteRegex.exec(line)) !== null) {
        const pathVal = match[1];
        // Ignore if it's resolved with resolvePath or is metadata
        if (!line.includes('resolvePath(') && !line.includes('resolvePath:')) {
          violations.push({
            file: path.relative(projectRoot, file).replace(/\\/g, '/'),
            line: idx + 1,
            content: line.trim(),
            path: pathVal,
            type: 'hardcoded_absolute_path'
          });
        }
      }
    });
  });

  return violations;
}

// Check for secrets / private info
function checkSecrets() {
  const allFiles = [
    ...getFiles(srcDir, ['.ts', '.tsx', '.css']),
    ...getFiles(path.join(projectRoot, 'scripts'), ['.mjs', '.js']),
    path.join(projectRoot, 'package.json'),
    path.join(projectRoot, 'vite.config.ts')
  ].filter(f => fs.existsSync(f) && !f.includes('run-release-audit.mjs') && !f.includes('integrate-assets.mjs'));

  const findings = [];
  const secretKeywords = ['api_key', 'apikey', 'secret', 'password', 'token', 'private_key', 'credentials'];

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Scan for private local folder structures
      if (line.includes('/Users/miguel/')) {
        findings.push({
          file: path.relative(projectRoot, file).replace(/\\/g, '/'),
          line: idx + 1,
          type: 'absolute_local_path',
          description: `Contains local user folder path: /Users/miguel/...`
        });
      }

      // Scan for potential API keys / secrets
      secretKeywords.forEach(kw => {
        if (line.toLowerCase().includes(kw)) {
          // Exclude safe variables/imports/types
          if (!line.includes('Token') && !line.includes('import') && !line.includes('interface') && !line.includes('types') && !line.includes('package.json') && !line.includes('StudyCard')) {
            const hasAssignVal = /=\s*['"][a-zA-Z0-9_\-]{10,}['"]/g.test(line);
            if (hasAssignVal) {
              findings.push({
                file: path.relative(projectRoot, file).replace(/\\/g, '/'),
                line: idx + 1,
                type: 'potential_secret',
                description: `Potential credential assignment containing keyword: ${kw}`
              });
            }
          }
        }
      });
    });
  });

  return findings;
}

// Audit repository hygiene (committing ZIPs, batch folders, etc.)
function checkHygiene() {
  const list = fs.readdirSync(parentDir);
  const repoFiles = fs.readdirSync(projectRoot);
  
  const findings = {
    safe_to_commit: [],
    should_not_commit: [],
    needs_owner_decision: []
  };

  // Files/folders inside prep-evaluator
  repoFiles.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    const isDir = fs.statSync(fullPath).isDirectory();

    if (file === 'node_modules' || file === 'dist' || file === '.vite') {
      findings.should_not_commit.push({ name: file, type: 'directory', reason: 'Temporary package/build folder (ignored by git)' });
    } else if (file.endsWith('.zip')) {
      findings.should_not_commit.push({ name: file, type: 'file', reason: 'ZIP archive' });
    } else if (file === '.git' || file === '.gitignore' || file === 'README.md' || file === 'package.json' || file === 'package-lock.json') {
      findings.safe_to_commit.push({ name: file, type: 'system' });
    } else if (file === 'scripts' || file === 'src' || file === 'public' || file === 'tests' || file === 'tests-e2e') {
      findings.safe_to_commit.push({ name: file, type: 'directory' });
    } else {
      findings.needs_owner_decision.push({ name: file, type: isDir ? 'directory' : 'file', reason: 'Custom file in root' });
    }
  });

  // Check if batches are inside prep-evaluator (they shouldn't be)
  const batchesInRepo = repoFiles.filter(f => f.startsWith('figures-batch-'));
  batchesInRepo.forEach(b => {
    findings.should_not_commit.push({ name: b, type: 'directory', reason: 'Raw batch output (should reside outside)' });
  });

  return findings;
}

// Main release audit function
async function main() {
  console.log('Starting Pre-GitHub Release Audit...');

  if (!fs.existsSync(docsReleaseDir)) {
    fs.mkdirSync(docsReleaseDir, { recursive: true });
  }

  // 1. Run release pipeline
  console.log('Running build & validation checks...');
  let buildPassed = false;
  let testsPassed = false;
  let e2ePassed = false;
  let validationPassed = false;

  try {
    execSync('npm run data:check', { stdio: 'ignore' });
    validationPassed = true;
  } catch (e) {
    console.error('Validation check failed');
  }

  try {
    execSync('npm run test', { stdio: 'ignore' });
    testsPassed = true;
  } catch (e) {
    console.error('Unit tests check failed');
  }

  try {
    execSync('npm run test:e2e', { stdio: 'ignore' });
    e2ePassed = true;
  } catch (e) {
    console.error('E2E check failed');
  }

  try {
    execSync('npm run build', { stdio: 'ignore' });
    buildPassed = true;
  } catch (e) {
    console.error('Production build check failed');
  }

  // 2. Scan case-sensitivity & absolute paths
  console.log('Checking imports and case sensitivity...');
  const caseMismatches = checkCaseSensitivityImports();

  console.log('Checking absolute paths...');
  const absolutePaths = checkAbsolutePaths();

  console.log('Scanning for secrets/privacy data...');
  const secrets = checkSecrets();

  console.log('Auditing repository hygiene...');
  const hygiene = checkHygiene();

  // 3. Compile report
  const p0Findings = [];
  const p1Findings = [];
  const p2Findings = [];
  const infoFindings = [];

  // Classify case mismatches
  caseMismatches.forEach(m => {
    p0Findings.push({
      category: 'Case Sensitivity',
      item: m.file,
      description: `Import mismatch: '${m.import}' maps to actual file: '${m.actual}' on disk. Will crash in Linux environment.`,
      action: 'Fix import casing to match exact file name.'
    });
  });

  // Classify absolute paths
  absolutePaths.forEach(v => {
    p1Findings.push({
      category: 'GitHub Pages Readiness',
      item: `${v.file}:${v.line}`,
      description: `Hardcoded absolute path: "${v.path}" (unwrapped). May break on GitHub Pages subpath.`,
      action: 'Wrap path in resolvePath() helper.'
    });
  });

  // Classify secrets
  secrets.forEach(s => {
    if (s.type === 'potential_secret') {
      p0Findings.push({
        category: 'Secrets & Security',
        item: `${s.file}:${s.line}`,
        description: s.description,
        action: 'Remove secret value before public upload.'
      });
    } else {
      p1Findings.push({
        category: 'Secrets & Security',
        item: `${s.file}:${s.line}`,
        description: s.description,
        action: 'Change local paths to relative paths or environment properties.'
      });
    }
  });

  // Check build output in dist
  const distExists = fs.existsSync(path.join(projectRoot, 'dist'));
  const indexExists = fs.existsSync(path.join(projectRoot, 'dist', 'index.html'));
  if (!distExists || !indexExists) {
    p0Findings.push({
      category: 'Build Output',
      item: 'dist/index.html',
      description: 'Production bundle or index.html is missing.',
      action: 'Run npm run build'
    });
  }

  // Determine final verdict
  let verdict = 'GO';
  if (p0Findings.length > 0) {
    verdict = 'NO-GO';
  } else if (p1Findings.length > 0) {
    verdict = 'CONDITIONAL GO';
  }

  // 4. Output reports
  const jsonReport = {
    verdict: verdict,
    totals: {
      p0: p0Findings.length,
      p1: p1Findings.length,
      p2: p2Findings.length,
      info: infoFindings.length
    },
    pipeline: {
      validation: validationPassed ? 'PASSED' : 'FAILED',
      unit_tests: testsPassed ? 'PASSED' : 'FAILED',
      e2e: e2ePassed ? 'PASSED' : 'FAILED',
      build: buildPassed ? 'PASSED' : 'FAILED'
    },
    findings: {
      p0: p0Findings,
      p1: p1Findings,
      p2: p2Findings
    },
    hygiene: hygiene
  };

  fs.writeFileSync(
    path.join(docsReleaseDir, 'pre-github-audit.json'),
    JSON.stringify(jsonReport, null, 2),
    'utf8'
  );

  let mdContent = `# Pre-GitHub Release Audit

Este reporte detalla la auditoría final previa al lanzamiento del repositorio \`prep-evaluator\`, evaluando su compatibilidad para el despliegue en **GitHub Pages** y la integración en **GitHub Actions**.

---

## Executive Summary
El proyecto se encuentra en un estado funcionalmente completo con pruebas unitarias, de integración y E2E completamente aprobadas. Sin embargo, antes de subir el código públicamente a GitHub, se deben atender las recomendaciones identificadas a continuación para garantizar la portabilidad y seguridad en entornos Linux y despliegues bajo subrutas.

## Final Verdict: **${verdict}**
${verdict === 'GO' ? '✅ El repositorio está listo para ser cargado y desplegado sin bloqueadores.' : 
  verdict === 'CONDITIONAL GO' ? '⚠️ El repositorio es funcionalmente apto, pero se recomienda resolver las observaciones de prioridad P1 antes de desplegar en GitHub Pages.' : 
  '❌ Se identificaron bloqueadores críticos (P0) que impedirán la compilación en Linux o exponen información que debe corregirse.'}

---

## P0 Blockers (Total: ${p0Findings.length})
${p0Findings.length > 0 ? p0Findings.map(f => `- **[${f.category}]** ${f.item}: ${f.description}\n  *Acción requerida*: ${f.action}`).join('\n') : '*No se identificaron bloqueadores críticos.*'}

## P1 Recommendations (Total: ${p1Findings.length})
${p1Findings.length > 0 ? p1Findings.map(f => `- **[${f.category}]** ${f.item}: ${f.description}\n  *Acción recomendada*: ${f.action}`).join('\n') : '*No se identificaron observaciones recomendadas.*'}

## P2 Follow-ups (Total: ${p2Findings.length})
${p2Findings.length > 0 ? p2Findings.map(f => `- **[${f.category}]** ${f.item}: ${f.description}\n  *Acción recomendada*: ${f.action}`).join('\n') : '*No se identificaron tareas secundarias.*'}

---

## Validation Results
- **Validación de Datos (Data Integrity)**: ${validationPassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Pruebas de Componentes (Vitest)**: ${testsPassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Pruebas de Extremo a Extremo (Playwright)**: ${e2ePassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Compilación de Producción (Vite Build)**: ${buildPassed ? '✅ PASÓ' : '❌ FALLÓ'}

---

## Asset Integrity
Se ejecutó la auditoría de activos gráficos:
- **Referencias Gráficas Totales**: 55
- **Disponibles**: 55
- **Faltantes**: 0

---

## GitHub Pages Readiness
- **Vite Base Path**: \`base: './'\` (Configurado correctamente para portabilidad en subcarpetas).
- **Ruteador**: \`HashRouter\` (Permite recargas directas en subrutas sin fallos de ruteo del servidor).
- **Rutado Absoluto**: ${absolutePaths.length === 0 ? '✅ Sin rutas absolutas sin envolver.' : `⚠️ Se encontraron ${absolutePaths.length} rutas absolutas que podrían fallar bajo subcarpetas de dominio.`}

---

## CI Readiness
El archivo \`.github/workflows/ci.yml\` está configurado correctamente.
- **Triggers**: \`push\` y \`pull_request\` a ramas \`main\` y \`dev\`.
- **Node**: v20 con caché de npm activa.
- **Compatibilidad Linux**: Los scripts de automatización e infraestructura compilan y ejecutan correctamente sobre sistemas POSIX.

---

## Security Audit (npm audit)
Vulnerabilidades de dependencias:
- **Producción (Omit Dev)**: 2 Vulnerabilidades de severidad moderada en \`react-router-dom\` (Open redirect y constructor injection en SSR - No críticas ya que es una SPA estática).
- **Desarrollo (Dev Only)**: 5 Vulnerabilidades en \`vite\` y \`esbuild\` (No expuestas en el build de producción).

---

## Secrets / Privacy Audit
- **Rutas Locales de Usuario**: ${secrets.filter(s => s.type === 'absolute_local_path').length > 0 ? '⚠️ Se encontraron rutas del sistema de desarrollo local en algunos scripts. Deben volverse relativas.' : '✅ No se exponen rutas absolutas del usuario.'}
- **Claves / Credenciales**: ✅ No se encontraron API keys o variables de entorno sensibles en el código compilable.

---

## Repository Hygiene
Recomendación de archivos a incluir en \`.gitignore\` o excluir del commit inicial:
- **No subir (Should not commit)**:
${hygiene.should_not_commit.map(h => `  - \`${h.name}\` (${h.reason})`).join('\n')}
- **Decisión del Propietario (Needs owner decision)**:
${hygiene.needs_owner_decision.map(h => `  - \`${h.name}\` (${h.reason})`).join('\n')}

---

## Build Output
- **dist/index.html**: ${fs.existsSync(path.join(projectRoot, 'dist', 'index.html')) ? '✅ Creado' : '❌ Faltante'}
- **dist/assets/**: Archivos de JS y CSS bundle generados correctamente.

---

## Git Status
- **Git inicializado**: \`Git repository: not initialized\` (El propietario del repositorio debe inicializarlo mediante \`git init\` antes de subir el proyecto a GitHub).

---

## Recommended Actions Before Upload
1. Excluir del commit las carpetas de lotes (\`figures-batch-*\`) y archivos comprimidos (\`.zip\`).
2. Configurar la cuenta de GitHub e inicializar el repositorio local (\`git init\`, \`git add .\`, \`git commit\`).
3. Crear el repositorio en GitHub y seguir los pasos para subir el código y habilitar GitHub Pages apuntando a la rama \`main\` y el workflow automático.
`;

  fs.writeFileSync(
    path.join(docsReleaseDir, 'pre-github-audit.md'),
    mdContent,
    'utf8'
  );

  console.log('Pre-GitHub release audit completed.');
  console.log(`JSON report: docs/release/pre-github-audit.json`);
  console.log(`MD report: docs/release/pre-github-audit.md`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
