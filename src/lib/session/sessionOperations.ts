import { ExamSession, SessionConfig, SessionProgress } from '@/types';
import { sampleQuestions } from '@/lib/engine/sampling';
import { allQuestions, loadExamTargets } from '@/lib/data/loader';

/**
 * Creates a new exam session based on configuration using the sampling engine.
 */
export async function createSession(config: SessionConfig): Promise<ExamSession> {
  const targetConfigs = await loadExamTargets();
  
  const samplingRequest = {
    filter: {
      examTarget: config.examTarget,
      area: config.area,
      categories: config.categories,
      subcategories: config.subcategories,
      difficulty: config.difficulty === 'mixed' ? undefined : config.difficulty
    },
    count: config.questionCount,
    stratify: config.stratify,
    seed: config.seed
  };

  const samplingResult = sampleQuestions(samplingRequest, allQuestions, targetConfigs);

  if (samplingResult.questions.length === 0) {
    throw new Error('No se encontraron preguntas que coincidan con los filtros seleccionados.');
  }

  const questionIds = samplingResult.questions.map(q => q.id);
  const now = Date.now();
  const expirationTime = config.durationMinutes
    ? now + config.durationMinutes * 60 * 1000
    : undefined;

  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'session-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);

  return {
    id: uuid,
    mode: config.mode,
    examTarget: config.examTarget,
    questionIds,
    currentQuestionIndex: 0,
    selectedAnswers: {},
    flaggedQuestionIds: [],
    startTime: now,
    durationMinutes: config.durationMinutes,
    expirationTime,
    status: 'active',
    config,
    warnings: samplingResult.warnings
  };
}

/**
 * Selects an answer for a specific question.
 */
export function selectAnswer(session: ExamSession, questionId: string, optionId: string): ExamSession {
  if (session.status === 'completed' || session.status === 'expired') {
    return session;
  }
  return {
    ...session,
    selectedAnswers: {
      ...session.selectedAnswers,
      [questionId]: optionId
    }
  };
}

/**
 * Clears the answer for a specific question.
 */
export function clearAnswer(session: ExamSession, questionId: string): ExamSession {
  if (session.status === 'completed' || session.status === 'expired') {
    return session;
  }
  const updatedAnswers = { ...session.selectedAnswers };
  delete updatedAnswers[questionId];
  return {
    ...session,
    selectedAnswers: updatedAnswers
  };
}

/**
 * Toggles the flagged status of a specific question.
 */
export function toggleFlag(session: ExamSession, questionId: string): ExamSession {
  if (session.status === 'completed' || session.status === 'expired') {
    return session;
  }
  const isFlagged = session.flaggedQuestionIds.includes(questionId);
  const updatedFlags = isFlagged
    ? session.flaggedQuestionIds.filter(id => id !== questionId)
    : [...session.flaggedQuestionIds, questionId];

  return {
    ...session,
    flaggedQuestionIds: updatedFlags
  };
}

/**
 * Navigates to a specific question index.
 */
export function goToQuestion(session: ExamSession, index: number): ExamSession {
  if (index < 0 || index >= session.questionIds.length) {
    return session;
  }
  return {
    ...session,
    currentQuestionIndex: index
  };
}

/**
 * Navigates to the next question.
 */
export function goNext(session: ExamSession): ExamSession {
  return goToQuestion(session, session.currentQuestionIndex + 1);
}

/**
 * Navigates to the previous question.
 */
export function goPrevious(session: ExamSession): ExamSession {
  return goToQuestion(session, session.currentQuestionIndex - 1);
}

/**
 * Completes the session.
 */
export function completeSession(session: ExamSession): ExamSession {
  if (session.status === 'completed' || session.status === 'expired') {
    return session;
  }
  return {
    ...session,
    status: 'completed'
  };
}

/**
 * Derives status for a question.
 */
export function getQuestionStatus(session: ExamSession, questionId: string) {
  const isAnswered = session.selectedAnswers[questionId] !== undefined;
  const isFlagged = session.flaggedQuestionIds.includes(questionId);
  return { isAnswered, isFlagged };
}

/**
 * Derives current session progress.
 */
export function getSessionProgress(session: ExamSession): SessionProgress {
  const totalQuestions = session.questionIds.length;
  const answeredCount = Object.keys(session.selectedAnswers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = session.flaggedQuestionIds.length;
  const currentQuestionNumber = totalQuestions > 0 ? session.currentQuestionIndex + 1 : 0;
  const completionPercentage = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  return {
    currentQuestionNumber,
    totalQuestions,
    answeredCount,
    unansweredCount,
    flaggedCount,
    completionPercentage
  };
}

/**
 * Checks if the session has expired and transitions its status if so.
 */
export function checkSessionExpiration(session: ExamSession, now: number): ExamSession {
  if (session.status === 'active' && session.expirationTime && now >= session.expirationTime) {
    return {
      ...session,
      status: 'expired'
    };
  }
  return session;
}

/**
 * Calculates remaining time in milliseconds.
 */
export function getRemainingTime(session: ExamSession, now: number): number {
  if (!session.expirationTime) {
    return 0;
  }
  return Math.max(0, session.expirationTime - now);
}

/**
 * Formats time in milliseconds to MM:SS or HH:MM:SS.
 */
export function formatRemainingTime(ms: number, forceHHMMSS = false): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0 || forceHHMMSS) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
