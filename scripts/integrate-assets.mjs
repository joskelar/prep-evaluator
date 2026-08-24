import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const parentDir = path.dirname(projectRoot);
const publicDir = path.join(projectRoot, 'public');
const reportsDir = path.join(publicDir, 'data', 'reports');

// Helper to recursively list files with extensions
function getFilesRecursively(dir, extensions = []) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.length === 0 || extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

async function main() {
  console.log('--- STARTING ASSET INTEGRATION ---');

  // 1. Discover batch folders
  const parentFiles = fs.readdirSync(parentDir);
  const batchFolders = parentFiles
    .filter(file => {
      const fullPath = path.join(parentDir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      return isDir && file.startsWith('figures-batch-');
    })
    .sort();

  console.log(`Discovered batch folders in parent directory:\n${batchFolders.map(b => `  - ${b}`).join('\n')}`);

  let assetsDiscovered = 0;
  let assetsCopied = 0;
  let assetsAlreadyPresent = 0;
  const collisions = [];
  const copiedList = [];

  // 2. Inspect and copy each batch
  for (const batch of batchFolders) {
    const batchPath = path.join(parentDir, batch);
    const batchPublicPath = path.join(batchPath, 'public');
    
    if (!fs.existsSync(batchPublicPath)) {
      console.log(`Skipping ${batch}: no 'public' directory found.`);
      continue;
    }

    const files = getFilesRecursively(batchPublicPath, ['.png', '.svg']);
    console.log(`Batch ${batch} contains ${files.length} graphical assets.`);

    for (const srcFile of files) {
      assetsDiscovered++;
      
      // Get relative path from batch root (e.g. public/assets/math/MAT-GEO-018.svg)
      const relPath = path.relative(batchPath, srcFile).replace(/\\/g, '/');
      const destFile = path.join(projectRoot, relPath);

      // Verify the target path has public/assets
      if (!relPath.startsWith('public/assets/')) {
        console.warn(`Warning: Asset ${relPath} is outside public/assets, skipping.`);
        continue;
      }

      // Check if directory exists
      const destDir = path.dirname(destFile);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Collision check
      if (fs.existsSync(destFile)) {
        const srcBuf = fs.readFileSync(srcFile);
        const destBuf = fs.readFileSync(destFile);
        
        if (srcBuf.equals(destBuf)) {
          assetsAlreadyPresent++;
          console.log(`  [Already Present] ${relPath}`);
        } else {
          collisions.push({
            asset: relPath,
            source: srcFile,
            destination: destFile,
            message: 'Files differ in content'
          });
          console.error(`  [Collision!] ${relPath} already exists and differs!`);
        }
      } else {
        // Copy file
        fs.copyFileSync(srcFile, destFile);
        assetsCopied++;
        copiedList.push(relPath);
        console.log(`  [Copied] ${relPath}`);
      }
    }
  }

  console.log(`\nCopying complete: Discovered=${assetsDiscovered}, Copied=${assetsCopied}, AlreadyPresent=${assetsAlreadyPresent}, Collisions=${collisions.length}`);

  // 3. Run audit assets again to check missing list
  console.log('\nRunning asset audit...');
  let auditPassed = false;
  let missingAfterIntegration = [];
  let totalReferences = 0;
  let availableCount = 0;
  let missingCount = 0;
  let uniqueMissingCount = 0;

  try {
    execSync('node scripts/audit-assets.mjs', { stdio: 'inherit' });
    
    // Read generated missing-assets.json
    const missingJsonPath = path.join(reportsDir, 'missing-assets.json');
    if (fs.existsSync(missingJsonPath)) {
      const missingData = JSON.parse(fs.readFileSync(missingJsonPath, 'utf8'));
      missingAfterIntegration = missingData.map(asset => ({
        asset_id: asset.asset_id,
        expected_path: asset.expected_path,
        area: asset.area,
        category: asset.category,
        priority: asset.priority
      }));

      // Parse markdown report totals
      const mdReport = fs.readFileSync(path.join(reportsDir, 'missing-assets.md'), 'utf8');
      
      const refMatch = mdReport.match(/\*\*Total de Referencias Gráficas\*\* \| (\d+)/);
      const availMatch = mdReport.match(/\*\*Activos Disponibles en Repositorio\*\* \| (\d+)/);
      const missMatch = mdReport.match(/\*\*Activos Faltantes \(Referencias\)\*\* \| (\d+)/);
      const uniqMatch = mdReport.match(/\*\*Figuras Faltantes Únicas \(Deduplicadas\)\*\* \| (\d+)/);

      totalReferences = refMatch ? parseInt(refMatch[1], 10) : 0;
      availableCount = availMatch ? parseInt(availMatch[1], 10) : 0;
      missingCount = missMatch ? parseInt(missMatch[1], 10) : 0;
      uniqueMissingCount = uniqMatch ? parseInt(uniqMatch[1], 10) : 0;

      auditPassed = (uniqueMissingCount === 0);
    }
  } catch (e) {
    console.error('Failed to run asset audit:', e.message);
  }

  // 4. Run data validation checks
  console.log('\nRunning data validation checks...');
  let dataValidationPassed = false;
  try {
    execSync('npm run data:check', { stdio: 'inherit' });
    dataValidationPassed = true;
  } catch (e) {
    console.error('Data validation failed:', e.message);
  }

  // 5. Run tests
  console.log('\nRunning unit/integration tests...');
  let testsPassed = false;
  try {
    execSync('npm run test', { stdio: 'inherit' });
    testsPassed = true;
  } catch (e) {
    console.error('Tests failed:', e.message);
  }

  // 6. Run production build
  console.log('\nRunning production build...');
  let buildPassed = false;
  try {
    execSync('npm run build', { stdio: 'inherit' });
    buildPassed = true;
  } catch (e) {
    console.error('Build failed:', e.message);
  }

  // 7. Write report files
  const reportJson = {
    batches_found: batchFolders,
    assets_discovered: assetsDiscovered,
    assets_copied: assetsCopied,
    assets_already_present: assetsAlreadyPresent,
    collisions: collisions,
    missing_after_integration: missingAfterIntegration,
    audit_passed: auditPassed,
    data_validation_passed: dataValidationPassed,
    tests_passed: testsPassed,
    build_passed: buildPassed
  };

  fs.writeFileSync(
    path.join(reportsDir, 'asset-integration-report.json'),
    JSON.stringify(reportJson, null, 2),
    'utf8'
  );

  let mdContent = `# Reporte de Integración de Activos Gráficos (Integration Report)

Este reporte detalla el resultado de la integración y copia de activos gráficos (figuras, imágenes y diagramas) desde las carpetas de lotes generadas (\`figures-batch-*\`) hacia el repositorio principal de la aplicación.

---

## Resumen de Ejecución

| Métrica | Valor |
| :--- | :---: |
| **Lotes Encontrados** | ${batchFolders.length} (${batchFolders.join(', ')}) |
| **Total de Activos Descubiertos** | ${assetsDiscovered} |
| **Activos Copiados** | ${assetsCopied} |
| **Activos Ya Presentes (Idénticos)** | ${assetsAlreadyPresent} |
| **Colisiones Detectadas** | ${collisions.length} |
| **Figuras Faltantes Después de Integración** | ${uniqueMissingCount} |

### Resultados de Verificación de Calidad y Compilación
- **Auditoría de Activos (0 Faltantes)**: ${auditPassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Validación de Datos (Integridad y Esquemas)**: ${dataValidationPassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Pruebas Unitarias e Integración (Vitest)**: ${testsPassed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Compilación de Producción (Build Vite + TS)**: ${buildPassed ? '✅ PASÓ' : '❌ FALLÓ'}

---

## Auditoría de Activos Detallada

### Referencias del Repositorio
- **Referencias Gráficas Totales**: ${totalReferences}
- **Activos Disponibles en Repositorio**: ${availableCount}
- **Activos Faltantes (Referencias)**: ${missingCount}
- **Figuras Faltantes Únicas**: ${uniqueMissingCount}

${uniqueMissingCount > 0 ? `
### Figuras que Siguen Faltando
| ID de Activo | Ruta Esperada | Área | Categoría | Prioridad |
| :--- | :--- | :---: | :---: | :---: |
${missingAfterIntegration.map(m => `| \`${m.asset_id}\` | \`${m.expected_path}\` | ${m.area} | ${m.category} | **${m.priority}** |`).join('\n')}
` : '### ✅ ¡Todos los activos requeridos están completamente disponibles en el repositorio!'}

---

## Historial de Copiado e Integración

### Colisiones Reportadas
${collisions.length > 0 ? collisions.map(c => `- **${c.asset}**: ${c.message}`).join('\n') : '*No se presentaron colisiones de contenido.*'}

### Activos Copiados Correctamente (Lotes Integrados)
${copiedList.map(item => `- \`${item}\``).join('\n')}
`;

  fs.writeFileSync(
    path.join(reportsDir, 'asset-integration-report.md'),
    mdContent,
    'utf8'
  );

  console.log('\n--- INTEGRATION REPORT GENERATED ---');
  console.log(`Report JSON: public/data/reports/asset-integration-report.json`);
  console.log(`Report MD: public/data/reports/asset-integration-report.md`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
