import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const dataDir = path.join(publicDir, 'data');
const reportsDir = path.join(dataDir, 'reports');

// Helper to recursively list JSON files
function getJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getJsonFiles(fullPath));
    } else if (file.endsWith('.json') && !file.includes('bank-manifest.json') && !file.includes('exam-targets.json')) {
      results.push(fullPath);
    }
  });
  return results;
}

// Classification helpers
function getAssetType(src, description, category) {
  const s = (src || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (s.includes('venn') || d.includes('venn') || d.includes('diagrama de venn')) return 'diagram';
  if (s.includes('dia') || d.includes('diagrama') || c.includes('diagrams')) return 'diagram';
  if (s.includes('graph') || d.includes('grafica') || d.includes('gráfico') || d.includes('barras') || d.includes('pastel') || d.includes('polígono')) return 'diagram';
  if (d.includes('secuencia') || d.includes('patron') || d.includes('patrón') || d.includes('sucesion') || d.includes('sucesión')) return 'sequence';
  if (d.includes('matriz') || d.includes('cuadricula') || d.includes('cuadrícula')) return 'matrix';
  if (c.includes('geometry') || d.includes('triangulo') || d.includes('círculo') || d.includes('circulo') || d.includes('rectángulo') || d.includes('angulo') || d.includes('ángulo') || d.includes('trapecio') || d.includes('paralelas')) return 'figure';
  return 'figure';
}

function getRecommendedAction(src, description) {
  if (!description || description.trim().length <= 15) {
    return 'insufficient_description';
  }
  const d = description.toLowerCase();
  const s = src.toLowerCase();
  if (
    d.includes('examen') ||
    d.includes('original') ||
    d.includes('legacy') ||
    d.includes('como en el') ||
    d.includes('copiar') ||
    d.includes('extraer') ||
    d.includes('reproducir exactamente') ||
    s.includes('legacy') ||
    s.includes('buap') ||
    s.includes('practice-exam-q')
  ) {
    return 'recover_from_source';
  }
  return 'recreate_from_description';
}

function getPriority(area, category, prompt, description) {
  const a = (area || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const p = (prompt || '').toLowerCase();
  const d = (description || '').toLowerCase();

  // Primary P0 cases: Cognitive diagrams, Math geometry, Math statistics
  if (a === 'cognitive' && c === 'diagrams') return 'P0';
  if (a === 'math' && (c === 'geometry-measurement' || c === 'statistics-probability' || c.includes('geometry') || c.includes('statistics'))) return 'P0';

  // Text-based hints for P0
  if (
    p.includes('siguiente figura') ||
    p.includes('figura anterior') ||
    p.includes('de acuerdo con la figura') ||
    p.includes('en la figura') ||
    p.includes('el diagrama') ||
    p.includes('el gráfico') ||
    p.includes('la gráfica') ||
    p.includes('de acuerdo con el gráfico') ||
    p.includes('siguiente secuencia') ||
    p.includes('qué figura sigue') ||
    p.includes('cuál de las siguientes opciones completa') ||
    d.includes('venn') ||
    d.includes('diagrama de venn')
  ) {
    return 'P0';
  }

  // Optional/Decorative check
  if (d.includes('decorativo') || d.includes('ilustrativo') || d.includes('opcional') || d.includes('ejemplo de decoración')) {
    return 'P2';
  }

  // Materially helps (P1) is the default for other occurrences with assets
  return 'P1';
}

function getAreaGroupName(area) {
  const a = (area || '').toLowerCase();
  if (a === 'cognitive') return 'Cognitive';
  if (a === 'math') return 'Math';
  if (a === 'science') return 'Science';
  if (a === 'spanish') return 'Spanish';
  if (a === 'english') return 'English';
  return 'Other';
}

// Main execution
async function main() {
  console.log('Auditing graphical assets...');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const bankFiles = getJsonFiles(path.join(dataDir, 'banks'));
  const stimuliFiles = getJsonFiles(path.join(dataDir, 'stimuli'));

  let totalReferences = 0;
  let availableCount = 0;
  let missingCount = 0;
  let invalidPathCount = 0;

  // We will map unique assets by expected_path
  const missingAssetsMap = new Map();
  const availableAssetsSet = new Set();

  // Helper to process asset references
  function processAssetReference({ src, description, questionId, stimulusId, area, category, subcategory, prompt, sourceFile }) {
    totalReferences++;

    if (!src || typeof src !== 'string' || src.trim() === '') {
      invalidPathCount++;
      return;
    }

    const cleanSrc = src.trim();
    // Resolve expected path as frontend does
    const cleanPath = cleanSrc.startsWith('/') ? cleanSrc.substring(1) : cleanSrc;
    const expectedPath = path.join('public', cleanPath).replace(/\\/g, '/');
    const absolutePath = path.join(publicDir, cleanPath);

    const exists = fs.existsSync(absolutePath);

    if (exists) {
      availableCount++;
      availableAssetsSet.add(expectedPath);
    } else {
      missingCount++;
      
      // Derive asset_id from filename
      const ext = path.extname(cleanPath);
      const assetId = path.basename(cleanPath, ext);

      if (missingAssetsMap.has(expectedPath)) {
        const existing = missingAssetsMap.get(expectedPath);
        if (questionId && !existing.question_ids.includes(questionId)) {
          existing.question_ids.push(questionId);
        }
      } else {
        const type = getAssetType(cleanSrc, description, category);
        const action = getRecommendedAction(cleanSrc, description);
        const priority = getPriority(area, category, prompt, description);

        missingAssetsMap.set(expectedPath, {
          asset_id: assetId,
          expected_path: expectedPath,
          type: type,
          status: 'missing',
          priority: priority,
          question_ids: questionId ? [questionId] : [],
          stimulus_id: stimulusId || null,
          area: area,
          category: category,
          subcategory: subcategory || null,
          source_file: path.relative(projectRoot, sourceFile).replace(/\\/g, '/'),
          prompt_context: prompt ? (prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt) : '',
          description: description || '',
          recommended_action: action
        });
      }
    }
  }

  // 1. Scan banks
  for (const file of bankFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let questions;
    try {
      questions = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse ${file}: ${e.message}`);
      continue;
    }

    if (!Array.isArray(questions)) continue;

    for (const q of questions) {
      if (q.assets && Array.isArray(q.assets)) {
        for (const asset of q.assets) {
          processAssetReference({
            src: asset.src,
            description: asset.description,
            questionId: q.id,
            stimulusId: q.stimulus_id,
            area: q.area,
            category: q.category,
            subcategory: q.subcategory,
            prompt: q.prompt,
            sourceFile: file
          });
        }
      }
      
      // Check legacy direct fields
      const legacyFields = ['src', 'image', 'image_path', 'figure', 'diagram'];
      for (const field of legacyFields) {
        if (q[field] && typeof q[field] === 'string' && q[field].includes('.')) {
          // If not already in assets
          const alreadyProcessed = q.assets && q.assets.some(a => a.src === q[field]);
          if (!alreadyProcessed) {
            processAssetReference({
              src: q[field],
              description: q.description || '',
              questionId: q.id,
              stimulusId: q.stimulus_id,
              area: q.area,
              category: q.category,
              subcategory: q.subcategory,
              prompt: q.prompt,
              sourceFile: file
            });
          }
        }
      }
    }
  }

  // 2. Scan stimuli
  // First build a lookup of stimulus to file paths and area/category metadata
  const stimulusMeta = new Map();
  for (const file of stimuliFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let stimuli;
    try {
      stimuli = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse ${file}: ${e.message}`);
      continue;
    }

    if (!Array.isArray(stimuli)) continue;

    // Deduce area and category from filepath
    const fileParts = file.replace(/\\/g, '/').split('/');
    const stimuliIdx = fileParts.indexOf('stimuli');
    const area = fileParts[stimuliIdx + 1] || 'spanish';
    const category = fileParts[stimuliIdx + 2] || 'reading';

    for (const s of stimuli) {
      stimulusMeta.set(s.id, { area, category, file, content: s.content });
      if (s.assets && Array.isArray(s.assets)) {
        for (const asset of s.assets) {
          processAssetReference({
            src: asset.src,
            description: asset.description,
            questionId: null,
            stimulusId: s.id,
            area: area,
            category: category,
            subcategory: null,
            prompt: null,
            sourceFile: file
          });
        }
      }
    }
  }

  // 3. Export reports
  const missingAssets = Array.from(missingAssetsMap.values());
  const uniqueMissingCount = missingAssets.length;

  fs.writeFileSync(
    path.join(reportsDir, 'missing-assets.json'),
    JSON.stringify(missingAssets, null, 2),
    'utf8'
  );

  // Group by Area Group
  const groups = {
    Cognitive: [],
    Math: [],
    Science: [],
    Spanish: [],
    English: [],
    Other: []
  };

  let p0Count = 0;
  let p1Count = 0;
  let p2Count = 0;
  let actionRecover = 0;
  let actionRecreate = 0;
  let actionInsufficient = 0;

  missingAssets.forEach(asset => {
    const group = getAreaGroupName(asset.area);
    groups[group].push(asset);

    if (asset.priority === 'P0') p0Count++;
    else if (asset.priority === 'P1') p1Count++;
    else if (asset.priority === 'P2') p2Count++;

    if (asset.recommended_action === 'recover_from_source') actionRecover++;
    else if (asset.recommended_action === 'recreate_from_description') actionRecreate++;
    else if (asset.recommended_action === 'insufficient_description') actionInsufficient++;
  });

  // Write markdown report
  let mdContent = `# Reporte de Activos Gráficos Faltantes (Audit Report)

Este reporte contiene el inventario detallado de figuras, imágenes y diagramas requeridos por los bancos de preguntas (Banks 1–8) y estímulos que actualmente no se encuentran en el repositorio.

---

## Resumen de Auditoría

| Métrica | Total |
| :--- | :---: |
| **Total de Referencias Gráficas** | ${totalReferences} |
| **Activos Disponibles en Repositorio** | ${availableCount} |
| **Activos Faltantes (Referencias)** | ${missingCount} |
| **Figuras Faltantes Únicas (Deduplicadas)** | ${uniqueMissingCount} |
| **Rutas Inválidas / Metadatos Faltantes** | ${invalidPathCount} |

### Desglose de Prioridades de Impacto
- **P0 (Crítico - Necesario para resolver el reactivo)**: **${p0Count}**
- **P1 (Material - Ayuda a comprender o resolver)**: **${p1Count}**
- **P2 (Opcional o Decorativo)**: **${p2Count}**

### Desglose de Acciones Recomendadas
- **Recuperar de Fuente (\`recover_from_source\`)**: **${actionRecover}**
- **Recrear de Descripción (\`recreate_from_description\`)**: **${actionRecreate}**
- **Descripción Insuficiente (\`insufficient_description\`)**: **${actionInsufficient}**

---

## Inventario de Activos Faltantes por Área

`;

  const areaGroups = ['Cognitive', 'Math', 'Science', 'Spanish', 'English'];
  areaGroups.forEach(group => {
    const list = groups[group];
    mdContent += `### ${group === 'Cognitive' ? 'Habilidades Cognitivas' : 
                   group === 'Math' ? 'Matemáticas' : 
                   group === 'Science' ? 'Ciencias Naturales' : 
                   group === 'Spanish' ? 'Español' : 
                   group === 'English' ? 'Inglés' : group} (Total: ${list.length})\n\n`;

    if (list.length === 0) {
      mdContent += `*No se encontraron activos faltantes en esta área.*\n\n`;
      return;
    }

    mdContent += `| ID de Activo | Ruta Esperada | Tipo | Prioridad | Acción Recomendada | Reactivos / Estímulos Asociados | Descripción en JSON |\n`;
    mdContent += `| :--- | :--- | :---: | :---: | :--- | :--- | :--- |\n`;

    list.forEach(asset => {
      const associated = asset.question_ids.length > 0 
        ? asset.question_ids.join(', ') 
        : `Estímulo: ${asset.stimulus_id}`;
      
      const shortDesc = asset.description 
        ? asset.description.replace(/\n/g, ' ').substring(0, 150) + (asset.description.length > 150 ? '...' : '')
        : '*Sin descripción*';

      mdContent += `| \`${asset.asset_id}\` | \`${asset.expected_path}\` | ${asset.type} | **${asset.priority}** | \`${asset.recommended_action}\` | ${associated} | ${shortDesc} |\n`;
    });

    mdContent += `\n`;
  });

  fs.writeFileSync(
    path.join(reportsDir, 'missing-assets.md'),
    mdContent,
    'utf8'
  );

  console.log('Audit completed successfully.');
  console.log(`- Total references: ${totalReferences}`);
  console.log(`- Available: ${availableCount}`);
  console.log(`- Missing: ${missingCount}`);
  console.log(`- Unique missing: ${uniqueMissingCount}`);
  console.log(`- P0 Count: ${p0Count}`);
  console.log(`- P1 Count: ${p1Count}`);
  console.log(`- P2 Count: ${p2Count}`);
  console.log(`- Action Recover: ${actionRecover}`);
  console.log(`- Action Recreate: ${actionRecreate}`);
  console.log(`- Action Insufficient: ${actionInsufficient}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
