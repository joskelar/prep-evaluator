import { describe, it, expect } from 'vitest';
import { scoreSession } from '@/lib/scoring/scoring';
import { ExamSession, Question } from '@/types';

describe('Scoring Engine Unit Tests', () => {
  const mockQuestions: Question[] = [
    { id: 'Q1', area: 'math', category: 'algebra', subcategory: 'eqs', difficulty: 'easy', type: 'mc', prompt: 'P1', options: [], correct_answer: 'A', explanation: 'E1' },
    { id: 'Q2', area: 'math', category: 'geometry', subcategory: 'shapes', difficulty: 'medium', type: 'mc', prompt: 'P2', options: [], correct_answer: 'B', explanation: 'E2' },
    { id: 'Q3', area: 'spanish', category: 'reading', subcategory: 'comp', difficulty: 'hard', type: 'mc', prompt: 'P3', options: [], correct_answer: 'C', explanation: 'E3' },
    { id: 'Q4', area: 'spanish', category: 'grammar', subcategory: 'verbs', difficulty: 'easy', type: 'mc', prompt: 'P4', options: [], correct_answer: 'D', explanation: 'E4' }
  ];

  const baseSession: ExamSession = {
    id: 's1',
    mode: 'practice',
    examTarget: 'prepatec',
    questionIds: ['Q1', 'Q2', 'Q3', 'Q4'],
    currentQuestionIndex: 0,
    selectedAnswers: {},
    flaggedQuestionIds: [],
    startTime: Date.now(),
    status: 'active',
    config: { mode: 'practice', examTarget: 'prepatec', questionCount: 4 }
  };

  it('calculates correct scores when all questions are correct', () => {
    const session: ExamSession = {
      ...baseSession,
      selectedAnswers: { Q1: 'A', Q2: 'B', Q3: 'C', Q4: 'D' }
    };

    const result = scoreSession(session, mockQuestions);

    expect(result.totalQuestions).toBe(4);
    expect(result.correct).toBe(4);
    expect(result.incorrect).toBe(0);
    expect(result.unanswered).toBe(0);
    expect(result.percentage).toBe(100);
  });

  it('calculates correct scores when all questions are incorrect', () => {
    const session: ExamSession = {
      ...baseSession,
      selectedAnswers: { Q1: 'X', Q2: 'Y', Q3: 'Z', Q4: 'W' }
    };

    const result = scoreSession(session, mockQuestions);

    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(4);
    expect(result.unanswered).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('calculates correct scores when all questions are unanswered', () => {
    const result = scoreSession(baseSession, mockQuestions);

    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(0);
    expect(result.unanswered).toBe(4);
    expect(result.percentage).toBe(0);
  });

  it('handles mixed results with precise percentages', () => {
    const session: ExamSession = {
      ...baseSession,
      // 3 answered: 2 correct, 1 incorrect, 1 unanswered.
      selectedAnswers: { Q1: 'A', Q2: 'B', Q3: 'X' }
    };

    const result = scoreSession(session, mockQuestions);

    expect(result.correct).toBe(2);
    expect(result.incorrect).toBe(1);
    expect(result.unanswered).toBe(1);
    expect(result.percentage).toBe(50); // 2/4 * 100
  });

  it('creates correct breakdown by area and category', () => {
    const session: ExamSession = {
      ...baseSession,
      selectedAnswers: { Q1: 'A', Q2: 'X', Q3: 'C', Q4: 'X' }
    };

    const result = scoreSession(session, mockQuestions);

    // Area breakdown: math (Q1: correct, Q2: incorrect) -> 50%
    expect(result.areaBreakdowns['math']).toBeDefined();
    expect(result.areaBreakdowns['math'].total).toBe(2);
    expect(result.areaBreakdowns['math'].correct).toBe(1);
    expect(result.areaBreakdowns['math'].percentage).toBe(50);

    // Area breakdown: spanish (Q3: correct, Q4: incorrect) -> 50%
    expect(result.areaBreakdowns['spanish']).toBeDefined();
    expect(result.areaBreakdowns['spanish'].correct).toBe(1);
    
    // Category breakdown: algebra (Q1: correct) -> 100%
    expect(result.categoryBreakdowns['algebra']).toBeDefined();
    expect(result.categoryBreakdowns['algebra'].total).toBe(1);
    expect(result.categoryBreakdowns['algebra'].correct).toBe(1);
    expect(result.categoryBreakdowns['algebra'].percentage).toBe(100);

    // Category breakdown: geometry (Q2: incorrect) -> 0%
    expect(result.categoryBreakdowns['geometry']).toBeDefined();
    expect(result.categoryBreakdowns['geometry'].percentage).toBe(0);
  });

  it('handles 0-answer sessions correctly without crashing', () => {
    const emptySession: ExamSession = {
      ...baseSession,
      questionIds: []
    };

    const result = scoreSession(emptySession, mockQuestions);
    expect(result.totalQuestions).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('does not mutate original session object', () => {
    const sessionCopy = JSON.parse(JSON.stringify(baseSession));
    scoreSession(baseSession, mockQuestions);
    expect(baseSession).toEqual(sessionCopy);
  });
});
