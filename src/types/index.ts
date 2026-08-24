export type Difficulty = 'easy' | 'medium' | 'hard';

export type Area = 'cognitive' | 'spanish' | 'math' | 'english' | 'science' | string;

export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  text: string;
}

export interface QuestionAsset {
  src: string;
  description: string;
}

export interface Question {
  id: string;
  area: Area;
  category: string;
  subcategory: string;
  difficulty: Difficulty;
  type: string; // e.g. 'multiple_choice'
  prompt: string;
  options: QuestionOption[];
  correct_answer: string; // references option.id (e.g. 'A')
  explanation: string;
  stimulus_id?: string;
  assets?: QuestionAsset[];
}

export interface Stimulus {
  id: string;
  type: string; // e.g. 'passage' | 'diagram'
  title: string | null;
  content: string;
}

export interface BankManifestEntry {
  path: string;
  area: Area;
  category: string;
}

export interface StimulusManifestEntry {
  path: string;
  area: Area;
  category?: string; // Optional category, or stimulus type
}

export interface StudyCard {
  id: string;
  examTargets: string[];
  area: Area;
  category: string;
  subcategory?: string;
  title: string;
  front: string;
  back: string;
  note?: string;
  relatedTopics?: string[];
}

export interface StudyCardManifestEntry {
  path: string;
  area: Area;
  category: string;
}

export interface BankManifest {
  version: number;
  banks: BankManifestEntry[];
  stimuli: StimulusManifestEntry[];
  studyCards?: StudyCardManifestEntry[];
  notes?: string;
}

export interface QuestionFilter {
  examTarget?: string; // e.g. 'prepatec' | 'buap'
  area?: Area;
  categories?: string[];
  subcategories?: string[];
  difficulty?: Difficulty | 'mixed';
}

export interface SamplingRequest {
  filter: QuestionFilter;
  count: number;
  stratify?: boolean;
  seed?: number;
}

export interface SamplingResult {
  questions: Question[];
  requestedCount: number;
  actualCount: number;
  candidateCount: number;
  warnings?: string[];
}

export interface ExamTargetConfig {
  areas: string[];
  categories: Record<string, string[]>;
  simulatorDefaults?: {
    questionCount: number;
    durationMinutes: number;
  };
}

export interface AggregatedValidationError {
  filePath: string;
  questionId?: string;
  stimulusId?: string;
  message: string;
  type?: 'error' | 'warning';
}

export interface ValidationReport {
  isValid: boolean;
  errors: AggregatedValidationError[];
}

export interface NormalizedDataStore {
  questionsById: Record<string, Question>;
  stimuliById: Record<string, Stimulus>;
  questionsByArea: Record<string, Question[]>;
  questionsByCategory: Record<string, Record<string, Question[]>>;
  allQuestions: Question[];
}

export type SessionMode = 'practice' | 'general_review' | 'simulator';

export type SessionStatus = 'not_started' | 'active' | 'completed' | 'expired';

export interface SessionConfig {
  mode: SessionMode;
  examTarget: string;
  questionCount: number;
  area?: Area;
  categories?: string[];
  subcategories?: string[];
  difficulty?: Difficulty | 'mixed';
  stratify?: boolean;
  durationMinutes?: number;
  seed?: number;
}

export interface ExamSession {
  id: string;
  mode: SessionMode;
  examTarget: string;
  questionIds: string[];
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string>; // questionId -> optionId (e.g. 'A')
  flaggedQuestionIds: string[];
  startTime: number;
  durationMinutes?: number;
  expirationTime?: number;
  status: SessionStatus;
  config: SessionConfig;
  warnings?: string[];
}

export interface SessionProgress {
  currentQuestionNumber: number;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  completionPercentage: number;
}

export interface SessionSnapshot {
  version: number;
  session: ExamSession;
}

export interface QuestionResult {
  questionId: string;
  selectedAnswer?: string;
  correctAnswer: string;
  status: 'correct' | 'incorrect' | 'unanswered';
  flagged: boolean;
}

export interface ResultBreakdown {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
}

export interface SessionResult {
  sessionId: string;
  mode: SessionMode;
  examTarget: string;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  rawScore: number;
  percentage: number;
  areaBreakdowns: Record<string, ResultBreakdown>;
  categoryBreakdowns: Record<string, ResultBreakdown>;
  questionResults: QuestionResult[];
  timestamp: number;
}
