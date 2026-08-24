import { ExamSession, Question, SessionResult, QuestionResult, ResultBreakdown } from '@/types';

/**
 * Calculates student scoring performance at completion of an exam session.
 * Pure function: does not mutate the input session object.
 */
export function scoreSession(session: ExamSession, questions: Question[]): SessionResult {
  const questionsMap = new Map<string, Question>();
  questions.forEach(q => questionsMap.set(q.id, q));

  const totalQuestions = session.questionIds.length;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const questionResults: QuestionResult[] = [];
  const areaGroups: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};
  const categoryGroups: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};

  session.questionIds.forEach(qId => {
    const q = questionsMap.get(qId);
    if (!q) {
      throw new Error(`Question ${qId} in session not found in the questions list.`);
    }

    const selected = session.selectedAnswers[qId];
    const isAnswered = selected !== undefined;
    const isCorrect = isAnswered && selected === q.correct_answer;
    const isFlagged = session.flaggedQuestionIds.includes(qId);

    let status: 'correct' | 'incorrect' | 'unanswered';
    if (!isAnswered) {
      status = 'unanswered';
      unanswered++;
    } else if (isCorrect) {
      status = 'correct';
      correct++;
    } else {
      status = 'incorrect';
      incorrect++;
    }

    questionResults.push({
      questionId: qId,
      selectedAnswer: selected,
      correctAnswer: q.correct_answer,
      status,
      flagged: isFlagged
    });

    // Populate Area breakdown groups
    if (!areaGroups[q.area]) {
      areaGroups[q.area] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }
    areaGroups[q.area].total++;
    if (status === 'correct') areaGroups[q.area].correct++;
    else if (status === 'incorrect') areaGroups[q.area].incorrect++;
    else areaGroups[q.area].unanswered++;

    // Populate Category breakdown groups
    if (!categoryGroups[q.category]) {
      categoryGroups[q.category] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }
    categoryGroups[q.category].total++;
    if (status === 'correct') categoryGroups[q.category].correct++;
    else if (status === 'incorrect') categoryGroups[q.category].incorrect++;
    else categoryGroups[q.category].unanswered++;
  });

  const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  // Format breakdowns
  const areaBreakdowns: Record<string, ResultBreakdown> = {};
  Object.keys(areaGroups).forEach(area => {
    const g = areaGroups[area];
    areaBreakdowns[area] = {
      total: g.total,
      correct: g.correct,
      incorrect: g.incorrect,
      unanswered: g.unanswered,
      percentage: g.total > 0 ? Math.round((g.correct / g.total) * 100) : 0
    };
  });

  const categoryBreakdowns: Record<string, ResultBreakdown> = {};
  Object.keys(categoryGroups).forEach(cat => {
    const g = categoryGroups[cat];
    categoryBreakdowns[cat] = {
      total: g.total,
      correct: g.correct,
      incorrect: g.incorrect,
      unanswered: g.unanswered,
      percentage: g.total > 0 ? Math.round((g.correct / g.total) * 100) : 0
    };
  });

  return {
    sessionId: session.id,
    mode: session.mode,
    examTarget: session.examTarget,
    totalQuestions,
    correct,
    incorrect,
    unanswered,
    rawScore: correct,
    percentage,
    areaBreakdowns,
    categoryBreakdowns,
    questionResults,
    timestamp: Date.now()
  };
}
