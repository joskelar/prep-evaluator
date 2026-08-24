import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const manifestPath = path.join(publicDir, 'data', 'config', 'bank-manifest.json');

const textualTypes = ['passage', 'draft', 'text', 'passage_pair'];
const graphicalTypes = ['figure', 'diagram', 'image'];
const allowedDifficulties = ['easy', 'medium', 'hard'];

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (file.endsWith('.json')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function runValidation() {
  console.log('Running data integrity checks...');
  
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Manifest file not found at ${manifestPath}. Run generate:manifest first.`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`Error: Manifest JSON is invalid: ${err.message}`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  const manifestBankPaths = new Set(manifest.banks.map(b => b.path));
  const manifestStimuliPaths = new Set(manifest.stimuli.map(s => s.path));

  // Check manifest files existence
  manifest.banks.forEach(b => {
    const fullPath = path.join(publicDir, b.path);
    if (!fs.existsSync(fullPath)) {
      errors.push({ file: b.path, message: 'Manifest entry points to nonexistent file' });
    }
  });

  manifest.stimuli.forEach(s => {
    const fullPath = path.join(publicDir, s.path);
    if (!fs.existsSync(fullPath)) {
      errors.push({ file: s.path, message: 'Manifest entry points to nonexistent file' });
    }
  });

  // Check JSON files omitted from manifest
  const actualBankFiles = walk(path.join(publicDir, 'data', 'banks'));
  actualBankFiles.forEach(file => {
    const relPath = path.relative(publicDir, file).replace(/\\/g, '/');
    if (!manifestBankPaths.has(relPath)) {
      errors.push({ file: relPath, message: 'JSON bank file omitted from manifest' });
    }
  });

  const actualStimuliFiles = walk(path.join(publicDir, 'data', 'stimuli'));
  actualStimuliFiles.forEach(file => {
    const relPath = path.relative(publicDir, file).replace(/\\/g, '/');
    if (!manifestStimuliPaths.has(relPath)) {
      errors.push({ file: relPath, message: 'JSON bank file omitted from manifest' });
    }
  });

  // Load and validate stimuli
  const stimuliById = {};
  let totalStimuliCount = 0;
  
  manifest.stimuli.forEach(entry => {
    const fullPath = path.join(publicDir, entry.path);
    if (!fs.existsSync(fullPath)) return;
    
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (err) {
      errors.push({ file: entry.path, message: `Invalid JSON format: ${err.message}` });
      return;
    }

    if (!Array.isArray(data)) {
      errors.push({ file: entry.path, message: 'Stimuli file root must be an array' });
      return;
    }

    data.forEach((stim, idx) => {
      totalStimuliCount++;
      const sId = stim && typeof stim.id === 'string' ? stim.id : `[Index ${idx}]`;
      
      if (!stim || typeof stim !== 'object') {
        errors.push({ file: entry.path, id: sId, message: `Stimulus at index ${idx} is not an object` });
        return;
      }

      if (!stim.id || typeof stim.id !== 'string' || stim.id.trim() === '') {
        errors.push({ file: entry.path, id: sId, message: "Field 'id' is required and must be a non-empty string" });
      }

      if (stim.id) {
        if (stim.id in stimuliById) {
          errors.push({
            file: entry.path,
            id: stim.id,
            message: `Duplicate stimulus ID found. Previously defined in: ${stimuliById[stim.id].file}`
          });
        } else {
          stimuliById[stim.id] = { file: entry.path, data: stim };
        }
      }

      if (!stim.type || typeof stim.type !== 'string' || stim.type.trim() === '') {
        errors.push({ file: entry.path, id: sId, message: "Field 'type' is required and must be a non-empty string" });
        return;
      }

      if (textualTypes.includes(stim.type)) {
        if (!stim.content || typeof stim.content !== 'string' || stim.content.trim() === '') {
          errors.push({ file: entry.path, id: sId, message: `Textual stimulus of type '${stim.type}' must contain non-empty 'content'` });
        }
      } else if (graphicalTypes.includes(stim.type)) {
        const hasSrc = typeof stim.src === 'string' && stim.src.trim() !== '';
        const hasImagePath = typeof stim.image_path === 'string' && stim.image_path.trim() !== '';
        const hasDescription = typeof stim.description === 'string' && stim.description.trim() !== '';
        
        let hasAssetsInfo = false;
        if (Array.isArray(stim.assets) && stim.assets.length > 0) {
          const firstAsset = stim.assets[0];
          if (firstAsset && typeof firstAsset === 'object') {
            const hasAssetSrc = typeof firstAsset.src === 'string' && firstAsset.src.trim() !== '';
            const hasAssetDesc = typeof firstAsset.description === 'string' && firstAsset.description.trim() !== '';
            if (hasAssetSrc || hasAssetDesc) {
              hasAssetsInfo = true;
            }
          }
        }

        if (!hasSrc && !hasImagePath && !hasDescription && !hasAssetsInfo) {
          errors.push({
            file: entry.path,
            id: sId,
            message: `Graphical stimulus of type '${stim.type}' must provide at least one of: src, image_path, description, or assets`
          });
        }
      } else {
        errors.push({ file: entry.path, id: sId, message: `Unknown stimulus type: '${stim.type}'` });
      }
    });
  });

  // Load and validate questions
  const questionsById = {};
  let totalQuestionsCount = 0;
  const referencedStimuli = new Set();

  manifest.banks.forEach(entry => {
    const fullPath = path.join(publicDir, entry.path);
    if (!fs.existsSync(fullPath)) return;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (err) {
      errors.push({ file: entry.path, message: `Invalid JSON format: ${err.message}` });
      return;
    }

    if (!Array.isArray(data)) {
      errors.push({ file: entry.path, message: 'Question file root must be an array' });
      return;
    }

    data.forEach((q, idx) => {
      totalQuestionsCount++;
      const qId = q && typeof q.id === 'string' ? q.id : `[Index ${idx}]`;

      if (!q || typeof q !== 'object') {
        errors.push({ file: entry.path, id: qId, message: `Question at index ${idx} is not an object` });
        return;
      }

      // Check required fields
      const requiredFields = ['id', 'area', 'category', 'subcategory', 'difficulty', 'prompt', 'options', 'correct_answer'];
      requiredFields.forEach(field => {
        if (q[field] === undefined || q[field] === null || q[field] === '') {
          errors.push({ file: entry.path, id: qId, message: `Field '${field}' is required and cannot be empty` });
        }
      });

      if (q.id) {
        if (q.id in questionsById) {
          errors.push({
            file: entry.path,
            id: q.id,
            message: `Duplicate question ID found. Previously defined in: ${questionsById[q.id]}`
          });
        } else {
          questionsById[q.id] = entry.path;
        }
      }

      if (q.difficulty && !allowedDifficulties.includes(q.difficulty)) {
        errors.push({
          file: entry.path,
          id: qId,
          message: `Difficulty '${q.difficulty}' is invalid. Allowed values: ${allowedDifficulties.join(', ')}`
        });
      }

      // Options checks
      if (Array.isArray(q.options)) {
        if (q.options.length < 3 || q.options.length > 5) {
          errors.push({ file: entry.path, id: qId, message: `Must have 3-5 options. Has ${q.options.length}` });
        }

        const optionIds = new Set();
        q.options.forEach((opt, optIdx) => {
          if (!opt || typeof opt !== 'object') {
            errors.push({ file: entry.path, id: qId, message: `Option at index ${optIdx} is not an object` });
            return;
          }
          if (!opt.id || typeof opt.id !== 'string') {
            errors.push({ file: entry.path, id: qId, message: `Option at index ${optIdx} is missing a string id` });
          } else {
            if (optionIds.has(opt.id)) {
              errors.push({ file: entry.path, id: qId, message: `Duplicate option ID '${opt.id}' in options list` });
            } else {
              optionIds.add(opt.id);
            }
          }
          if (opt.text === undefined || opt.text === null || opt.text === '') {
            errors.push({ file: entry.path, id: qId, message: `Option '${opt.id || optIdx}' is missing text content` });
          }
        });

        if (q.correct_answer && typeof q.correct_answer === 'string' && !optionIds.has(q.correct_answer)) {
          errors.push({
            file: entry.path,
            id: qId,
            message: `correct_answer '${q.correct_answer}' does not match any valid option ID: [${Array.from(optionIds).join(', ')}]`
          });
        }
      } else if (q.options !== undefined) {
        errors.push({ file: entry.path, id: qId, message: 'Options must be an array' });
      }

      // Stimulus Reference check
      if (q.stimulus_id && typeof q.stimulus_id === 'string') {
        referencedStimuli.add(q.stimulus_id);
        if (!(q.stimulus_id in stimuliById)) {
          errors.push({
            file: entry.path,
            id: qId,
            message: `Dangling stimulus reference: stimulus_id '${q.stimulus_id}' does not exist`
          });
        }
      }

      // Assets validation
      if (q.assets !== undefined) {
        if (!Array.isArray(q.assets)) {
          errors.push({ file: entry.path, id: qId, message: "Field 'assets' must be an array" });
        } else {
          q.assets.forEach((asset, assetIdx) => {
            if (!asset || typeof asset !== 'object') {
              errors.push({ file: entry.path, id: qId, message: `Asset at index ${assetIdx} is not an object` });
              return;
            }
            if (typeof asset.src !== 'string' || asset.src.trim() === '') {
              errors.push({ file: entry.path, id: qId, message: `Asset at index ${assetIdx} is missing a valid 'src'` });
            }
            if (typeof asset.description !== 'string' || asset.description.trim() === '') {
              errors.push({ file: entry.path, id: qId, message: `Asset at index ${assetIdx} is missing a valid 'description'` });
            }
          });
        }
      }
    });
  });

  // Load and validate study cards
  const targetsPath = path.join(publicDir, 'data', 'config', 'exam-targets.json');
  let examTargetsConfig = {};
  if (fs.existsSync(targetsPath)) {
    try {
      examTargetsConfig = JSON.parse(fs.readFileSync(targetsPath, 'utf-8'));
    } catch (err) {
      errors.push({ file: 'data/config/exam-targets.json', message: `Invalid JSON: ${err.message}` });
    }
  }

  const studyCardsById = {};
  let totalStudyCardsCount = 0;
  
  if (Array.isArray(manifest.studyCards)) {
    // Check manifest files existence for study cards
    const manifestCardPaths = new Set(manifest.studyCards.map(c => c.path));
    
    manifest.studyCards.forEach(c => {
      const fullPath = path.join(publicDir, c.path);
      if (!fs.existsSync(fullPath)) {
        errors.push({ file: c.path, message: 'Manifest study card entry points to nonexistent file' });
      }
    });

    // Check JSON files omitted from manifest
    const actualCardFiles = walk(path.join(publicDir, 'data', 'study-cards'));
    actualCardFiles.forEach(file => {
      const relPath = path.relative(publicDir, file).replace(/\\/g, '/');
      if (!manifestCardPaths.has(relPath)) {
        errors.push({ file: relPath, message: 'JSON study card file omitted from manifest' });
      }
    });

    manifest.studyCards.forEach(entry => {
      const fullPath = path.join(publicDir, entry.path);
      if (!fs.existsSync(fullPath)) return;

      let data;
      try {
        data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      } catch (err) {
        errors.push({ file: entry.path, message: `Invalid JSON format: ${err.message}` });
        return;
      }

      if (!Array.isArray(data)) {
        errors.push({ file: entry.path, message: 'Study cards file root must be an array' });
        return;
      }

      data.forEach((card, idx) => {
        totalStudyCardsCount++;
        const cId = card && typeof card.id === 'string' ? card.id : `[Index ${idx}]`;

        if (!card || typeof card !== 'object') {
          errors.push({ file: entry.path, id: cId, message: `Study card at index ${idx} is not an object` });
          return;
        }

        // Required fields: id, examTargets, area, category, title, front, back
        const reqFields = ['id', 'examTargets', 'area', 'category', 'title', 'front', 'back'];
        reqFields.forEach(f => {
          if (card[f] === undefined || card[f] === null || card[f] === '') {
            errors.push({ file: entry.path, id: cId, message: `Field '${f}' is required and cannot be empty` });
          }
        });

        if (card.id) {
          if (card.id in studyCardsById) {
            errors.push({
              file: entry.path,
              id: card.id,
              message: `Duplicate study card ID found. Previously defined in: ${studyCardsById[card.id]}`
            });
          } else {
            studyCardsById[card.id] = entry.path;
          }
        }

        if (Array.isArray(card.examTargets)) {
          card.examTargets.forEach(t => {
            if (t !== 'prepatec' && t !== 'buap') {
              errors.push({
                file: entry.path,
                id: cId,
                message: `Invalid exam target: '${t}'. Must be 'prepatec' or 'buap'`
              });
            }
          });
        } else if (card.examTargets !== undefined) {
          errors.push({ file: entry.path, id: cId, message: 'examTargets must be an array' });
        }

        // Area & Category validation
        if (card.area && card.category && Object.keys(examTargetsConfig).length > 0) {
          let isValidArea = false;
          let isValidCategory = false;

          const targetsToCheck = Array.isArray(card.examTargets) ? card.examTargets : ['prepatec', 'buap'];
          
          targetsToCheck.forEach(t => {
            const tConf = examTargetsConfig[t];
            if (tConf) {
              if (tConf.areas.includes(card.area)) {
                isValidArea = true;
                const cats = tConf.categories[card.area];
                if (cats && cats.includes(card.category)) {
                  isValidCategory = true;
                }
              }
            }
          });

          if (!isValidArea) {
            errors.push({
              file: entry.path,
              id: cId,
              message: `Area '${card.area}' is not a valid area in targets: ${targetsToCheck.join(', ')}`
            });
          } else if (!isValidCategory) {
            errors.push({
              file: entry.path,
              id: cId,
              message: `Category '${card.category}' is not a valid category under area '${card.area}' in targets: ${targetsToCheck.join(', ')}`
            });
          }
        }
      });
    });
  }

  // Report statistics
  console.log('\n--- DATA VALIDATION SUMMARY ---');
  console.log(`Questions: ${totalQuestionsCount}`);
  console.log(`Stimuli: ${totalStimuliCount}`);
  console.log(`Study Cards: ${totalStudyCardsCount}`);
  console.log(`Question files: ${manifest.banks.length}`);
  console.log(`Stimulus files: ${manifest.stimuli.length}`);
  console.log(`Study Card files: ${manifest.studyCards ? manifest.studyCards.length : 0}`);
  console.log('');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log('-------------------------------\n');

  if (errors.length > 0) {
    console.error('Validation FAILED with the following errors:');
    errors.forEach(err => {
      const idStr = err.id ? ` | ID: ${err.id}` : '';
      console.error(`[${err.file}${idStr}] ${err.message}`);
    });
    process.exit(1);
  } else {
    console.log('Validation PASSED successfully!');
    process.exit(0);
  }
}

runValidation();
