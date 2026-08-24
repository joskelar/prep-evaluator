import {
  Question,
  Stimulus,
  BankManifest,
  NormalizedDataStore,
  ValidationReport,
  AggregatedValidationError,
  ExamTargetConfig,
  StudyCard
} from '@/types';

// Module level state
let cachedManifest: BankManifest | null = null;
let cachedExamTargets: Record<string, ExamTargetConfig> | null = null;
const fileCache: Record<string, any> = {};

export const questionsById: Record<string, Question> = {};
export const stimuliById: Record<string, Stimulus> = {};
export const questionsByArea: Record<string, Question[]> = {};
export const questionsByCategory: Record<string, Record<string, Question[]>> = {};
export const allQuestions: Question[] = [];

const validationReport: ValidationReport = { isValid: true, errors: [] };

// Path resolution helper for Vite + GitHub Pages
export function resolvePath(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cleanBase}${cleanPath}`;
}

export function getValidationReport(): ValidationReport {
  return validationReport;
}

export function clearValidationReport(): void {
  validationReport.isValid = true;
  validationReport.errors = [];
}

export function addValidationError(error: AggregatedValidationError): void {
  if (error.type !== 'warning') {
    validationReport.isValid = false;
  }
  validationReport.errors.push(error);
}

// Reset store
export function resetDataStore(): void {
  // Clear objects
  for (const key in questionsById) delete questionsById[key];
  for (const key in stimuliById) delete stimuliById[key];
  for (const key in questionsByArea) delete questionsByArea[key];
  for (const key in questionsByCategory) delete questionsByCategory[key];
  allQuestions.length = 0;
  clearValidationReport();
}

// Populate store from loaded questions and stimuli
export function populateStore(loadedQuestions: Question[], loadedStimuli: Stimulus[]): void {
  // Populate stimuli
  loadedStimuli.forEach(stim => {
    stimuliById[stim.id] = stim;
  });

  // Populate questions
  loadedQuestions.forEach(q => {
    questionsById[q.id] = q;
    allQuestions.push(q);

    // Group by Area
    if (!questionsByArea[q.area]) {
      questionsByArea[q.area] = [];
    }
    questionsByArea[q.area].push(q);

    // Group by Category
    if (!questionsByCategory[q.area]) {
      questionsByCategory[q.area] = {};
    }
    if (!questionsByCategory[q.area][q.category]) {
      questionsByCategory[q.area][q.category] = [];
    }
    questionsByCategory[q.area][q.category].push(q);
  });
}

// Load manifest
export async function loadManifest(): Promise<BankManifest> {
  if (cachedManifest) return cachedManifest;

  const url = resolvePath('data/config/bank-manifest.json');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const manifest = await res.json() as BankManifest;
    if (typeof manifest.version !== 'number' || !Array.isArray(manifest.banks) || !Array.isArray(manifest.stimuli)) {
      throw new Error('Manifest is missing required fields: version, banks, stimuli');
    }
    cachedManifest = manifest;
    return manifest;
  } catch (err: any) {
    const errMsg = `Failed to load bank-manifest.json: ${err.message}`;
    addValidationError({ filePath: 'data/config/bank-manifest.json', message: errMsg });
    throw new Error(errMsg);
  }
}

// Load exam targets configuration
export async function loadExamTargets(): Promise<Record<string, ExamTargetConfig>> {
  if (cachedExamTargets) return cachedExamTargets;

  const url = resolvePath('data/config/exam-targets.json');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json() as Record<string, ExamTargetConfig>;
    cachedExamTargets = data;
    return data;
  } catch (err: any) {
    const errMsg = `Failed to load exam-targets.json: ${err.message}`;
    addValidationError({ filePath: 'data/config/exam-targets.json', message: errMsg });
    throw new Error(errMsg);
  }
}

// Load individual question set
export async function loadQuestionSet(path: string): Promise<Question[]> {
  if (fileCache[path]) {
    return fileCache[path] as Question[];
  }

  const url = resolvePath(path);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Question set JSON must be an array of questions');
    }
    
    // Validate each question
    const validQuestions: Question[] = [];
    data.forEach((item: any, index: number) => {
      const qErrors = validateQuestion(item, path, index);
      if (qErrors.length > 0) {
        qErrors.forEach(err => addValidationError(err));
      }
      validQuestions.push(item as Question);
    });

    fileCache[path] = validQuestions;
    return validQuestions;
  } catch (err: any) {
    const errMsg = `Failed to load question set at ${path}: ${err.message}`;
    addValidationError({ filePath: path, message: errMsg });
    throw new Error(errMsg);
  }
}

// Load individual stimulus set
export async function loadStimulusSet(path: string): Promise<Stimulus[]> {
  if (fileCache[path]) {
    return fileCache[path] as Stimulus[];
  }

  const url = resolvePath(path);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Stimulus set JSON must be an array of stimuli');
    }

    const validStimuli: Stimulus[] = [];
    data.forEach((item: any, index: number) => {
      const sErrors = validateStimulus(item, path, index);
      if (sErrors.length > 0) {
        sErrors.forEach(err => addValidationError(err));
      }
      validStimuli.push(item as Stimulus);
    });

    fileCache[path] = validStimuli;
    return validStimuli;
  } catch (err: any) {
    const errMsg = `Failed to load stimulus set at ${path}: ${err.message}`;
    addValidationError({ filePath: path, message: errMsg });
    throw new Error(errMsg);
  }
}

// Validate single question and return array of validation errors
export function validateQuestion(q: any, filePath: string, index: number): AggregatedValidationError[] {
  const errors: AggregatedValidationError[] = [];
  const qId = q && typeof q.id === 'string' ? q.id : `[Index ${index}]`;

  if (!q || typeof q !== 'object') {
    errors.push({ filePath, questionId: qId, message: `Question at index ${index} is not an object` });
    return errors;
  }

  // Required fields check
  const requiredFields = ['id', 'area', 'category', 'subcategory', 'difficulty', 'type', 'prompt', 'options', 'correct_answer', 'explanation'];
  requiredFields.forEach(field => {
    if (q[field] === undefined || q[field] === null) {
      errors.push({ filePath, questionId: qId, message: `Missing required field: '${field}'` });
    }
  });

  if (errors.length > 0) return errors; // Stop if core fields are missing

  // Specific types validation
  if (typeof q.id !== 'string' || q.id.trim() === '') {
    errors.push({ filePath, questionId: qId, message: "Field 'id' must be a non-empty string" });
  }

  if (typeof q.area !== 'string' || q.area.trim() === '') {
    errors.push({ filePath, questionId: qId, message: "Field 'area' must be a non-empty string" });
  }

  if (typeof q.category !== 'string' || q.category.trim() === '') {
    errors.push({ filePath, questionId: qId, message: "Field 'category' must be a non-empty string" });
  }

  if (typeof q.subcategory !== 'string' || q.subcategory.trim() === '') {
    errors.push({ filePath, questionId: qId, message: "Field 'subcategory' must be a non-empty string" });
  }

  if (q.difficulty !== 'easy' && q.difficulty !== 'medium' && q.difficulty !== 'hard') {
    errors.push({ filePath, questionId: qId, message: `Invalid difficulty: '${q.difficulty}'. Expected easy, medium, or hard` });
  }

  if (typeof q.prompt !== 'string' || q.prompt.trim() === '') {
    errors.push({ filePath, questionId: qId, message: "Field 'prompt' must be a non-empty string" });
  }

  // Options validation
  if (!Array.isArray(q.options)) {
    errors.push({ filePath, questionId: qId, message: "Field 'options' must be an array" });
  } else {
    if (q.options.length < 3 || q.options.length > 5) {
      errors.push({ filePath, questionId: qId, message: `Options count is ${q.options.length}. Expected 3 to 5 options` });
    }

    const optionIds = new Set<string>();
    q.options.forEach((opt: any, optIdx: number) => {
      if (!opt || typeof opt !== 'object') {
        errors.push({ filePath, questionId: qId, message: `Option at index ${optIdx} is not an object` });
        return;
      }
      if (opt.id === undefined || opt.id === null || typeof opt.id !== 'string' || opt.id.trim() === '') {
        errors.push({ filePath, questionId: qId, message: `Option at index ${optIdx} has an invalid or missing 'id'` });
      } else {
        if (optionIds.has(opt.id)) {
          errors.push({ filePath, questionId: qId, message: `Duplicate option ID found within question: '${opt.id}'` });
        }
        optionIds.add(opt.id);
      }
      if (opt.text === undefined || opt.text === null || typeof opt.text !== 'string' || opt.text.trim() === '') {
        errors.push({ filePath, questionId: qId, message: `Option at index ${optIdx} has an invalid or missing 'text'` });
      }
    });

    // Check correct answer references existing option
    if (typeof q.correct_answer !== 'string' || !optionIds.has(q.correct_answer)) {
      errors.push({
        filePath,
        questionId: qId,
        message: `correct_answer '${q.correct_answer}' does not reference a valid option ID (${Array.from(optionIds).join(', ')})`
      });
    }
  }

  // Assets validation
  if (q.assets !== undefined) {
    if (!Array.isArray(q.assets)) {
      errors.push({ filePath, questionId: qId, message: "Field 'assets' must be an array when supplied" });
    } else {
      q.assets.forEach((asset: any, assetIdx: number) => {
        if (!asset || typeof asset !== 'object') {
          errors.push({ filePath, questionId: qId, message: `Asset at index ${assetIdx} is not an object` });
          return;
        }
        if (typeof asset.src !== 'string' || asset.src.trim() === '') {
          errors.push({ filePath, questionId: qId, message: `Asset at index ${assetIdx} is missing a valid 'src'` });
        }
        if (typeof asset.description !== 'string' || asset.description.trim() === '') {
          errors.push({ filePath, questionId: qId, message: `Asset at index ${assetIdx} is missing a valid 'description'` });
        }
      });
    }
  }

  return errors;
}

// Validate single stimulus and return array of validation errors
export function validateStimulus(s: any, filePath: string, index: number): AggregatedValidationError[] {
  const errors: AggregatedValidationError[] = [];
  const sId = s && typeof s.id === 'string' ? s.id : `[Index ${index}]`;

  if (!s || typeof s !== 'object') {
    errors.push({ filePath, stimulusId: sId, message: `Stimulus at index ${index} is not an object` });
    return errors;
  }

  if (s.id === undefined || s.id === null || typeof s.id !== 'string' || s.id.trim() === '') {
    errors.push({ filePath, stimulusId: sId, message: "Field 'id' is required and must be a non-empty string" });
  }

  if (s.type === undefined || s.type === null || typeof s.type !== 'string' || s.type.trim() === '') {
    errors.push({ filePath, stimulusId: sId, message: "Field 'type' is required and must be a non-empty string" });
  }

  const textualTypes = ['passage', 'draft', 'text', 'passage_pair'];
  const graphicalTypes = ['figure', 'diagram', 'image'];

  if (s.type && textualTypes.includes(s.type)) {
    if (s.content === undefined || s.content === null || typeof s.content !== 'string' || s.content.trim() === '') {
      errors.push({ filePath, stimulusId: sId, message: `Textual stimulus of type '${s.type}' must contain non-empty 'content'` });
    }
  } else if (s.type && graphicalTypes.includes(s.type)) {
    // Graphical stimulus validation: must provide renderable asset/src/image path or description
    const hasSrc = typeof s.src === 'string' && s.src.trim() !== '';
    const hasImagePath = typeof s.image_path === 'string' && s.image_path.trim() !== '';
    const hasDescription = typeof s.description === 'string' && s.description.trim() !== '';
    
    let hasAssetsInfo = false;
    if (Array.isArray(s.assets) && s.assets.length > 0) {
      const firstAsset = s.assets[0];
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
        filePath,
        stimulusId: sId,
        message: `Graphical stimulus of type '${s.type}' must contain at least one of: src, image_path, description, or non-empty assets`
      });
    }
  } else if (s.type) {
    errors.push({ filePath, stimulusId: sId, message: `Unknown stimulus type: '${s.type}'` });
  }

  return errors;
}

// Load all stimuli files listed in manifest
export async function loadAllStimuli(): Promise<Stimulus[]> {
  const manifest = await loadManifest();
  const stimuliPromises = manifest.stimuli.map(entry =>
    loadStimulusSet(entry.path).catch(() => {
      // Error already added to validationReport, return empty array
      return [] as Stimulus[];
    })
  );

  const results = await Promise.all(stimuliPromises);
  const allLoadedStimuli = results.flat();

  // Validate duplicate stimuli IDs
  const stimulusIds = new Set<string>();
  allLoadedStimuli.forEach(stim => {
    if (stimulusIds.has(stim.id)) {
      addValidationError({
        filePath: 'Multiple Files',
        stimulusId: stim.id,
        message: `Globally duplicate stimulus ID found: '${stim.id}'`
      });
    }
    stimulusIds.add(stim.id);
  });

  return allLoadedStimuli;
}

// Load all question files listed in manifest
export async function loadAllQuestions(): Promise<Question[]> {
  const manifest = await loadManifest();
  const questionsPromises = manifest.banks.map(entry =>
    loadQuestionSet(entry.path).catch(() => {
      // Error already added to validationReport, return empty array
      return [] as Question[];
    })
  );

  const results = await Promise.all(questionsPromises);
  const allLoadedQuestions = results.flat();

  // Validate duplicate question IDs
  const questionIds = new Set<string>();
  allLoadedQuestions.forEach(q => {
    if (questionIds.has(q.id)) {
      addValidationError({
        filePath: 'Multiple Files',
        questionId: q.id,
        message: `Globally duplicate question ID found: '${q.id}'`
      });
    }
    questionIds.add(q.id);
  });

  return allLoadedQuestions;
}

// Main initialization wrapper
export async function initializeDataStore(): Promise<NormalizedDataStore> {
  resetDataStore();

  // Load exam targets, stimuli, and questions
  const [, stimuli, questions] = await Promise.all([
    loadExamTargets().catch(() => ({})),
    loadAllStimuli(),
    loadAllQuestions()
  ]);

  populateStore(questions, stimuli);

  // Validate that all questions referencing a stimulus_id point to a valid stimulus
  questions.forEach(q => {
    if (q.stimulus_id && !stimuliById[q.stimulus_id]) {
      addValidationError({
        filePath: 'Store Cross-Reference',
        questionId: q.id,
        message: `Question '${q.id}' references missing stimulus_id '${q.stimulus_id}'`
      });
    }
  });

  return {
    questionsById,
    stimuliById,
    questionsByArea,
    questionsByCategory,
    allQuestions
  };
}

// Expose store query getters that auto-initialize if empty
async function ensureStorePopulated(): Promise<void> {
  if (allQuestions.length === 0) {
    await initializeDataStore();
  }
}

export async function loadQuestionsByArea(area: string): Promise<Question[]> {
  await ensureStorePopulated();
  return questionsByArea[area] || [];
}

export async function loadQuestionsByCategory(area: string, category: string): Promise<Question[]> {
  await ensureStorePopulated();
  return (questionsByCategory[area] && questionsByCategory[area][category]) || [];
}

// Stimulus resolution utility
export function getQuestionWithStimulus(questionId: string): { question: Question; stimulus?: Stimulus } | null {
  const question = questionsById[questionId];
  if (!question) return null;

  const stimulus = question.stimulus_id ? stimuliById[question.stimulus_id] : undefined;
  return { question, stimulus };
}

// Module-level cached study cards
let cachedStudyCards: StudyCard[] | null = null;

// Load individual study card set
export async function loadStudyCardSet(path: string): Promise<StudyCard[]> {
  if (fileCache[path]) {
    return fileCache[path] as StudyCard[];
  }

  const url = resolvePath(path);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Study card set JSON must be an array');
    }
    fileCache[path] = data as StudyCard[];
    return data as StudyCard[];
  } catch (err: any) {
    const errMsg = `Failed to load study card set at ${path}: ${err.message}`;
    addValidationError({ filePath: path, message: errMsg });
    throw new Error(errMsg);
  }
}

// Load all study cards from manifest
export async function loadAllStudyCards(): Promise<StudyCard[]> {
  if (cachedStudyCards) return cachedStudyCards;

  const manifest = await loadManifest();
  if (!manifest.studyCards) {
    cachedStudyCards = [];
    return [];
  }

  const cardPromises = manifest.studyCards.map(entry =>
    loadStudyCardSet(entry.path).catch(() => {
      return [] as StudyCard[];
    })
  );

  const results = await Promise.all(cardPromises);
  const allLoadedCards = results.flat();
  cachedStudyCards = allLoadedCards;
  return allLoadedCards;
}

// Get cards matching target
export async function getStudyCardsByTarget(target: string): Promise<StudyCard[]> {
  const allCards = await loadAllStudyCards();
  return allCards.filter(card => card.examTargets.includes(target));
}

// Get cards matching area
export async function getStudyCardsByArea(area: string): Promise<StudyCard[]> {
  const allCards = await loadAllStudyCards();
  return allCards.filter(card => card.area === area);
}

// Get cards matching area & category
export async function getStudyCardsByCategory(area: string, category: string): Promise<StudyCard[]> {
  const allCards = await loadAllStudyCards();
  return allCards.filter(card => card.area === area && card.category === category);
}
