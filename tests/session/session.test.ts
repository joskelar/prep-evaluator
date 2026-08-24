// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selectAnswer,
  clearAnswer,
  toggleFlag,
  goToQuestion,
  goNext,
  goPrevious,
  completeSession,
  getSessionProgress,
  checkSessionExpiration,
  getRemainingTime,
  formatRemainingTime
} from '@/lib/session/sessionOperations';
import { saveSession, loadSession, deleteSession } from '@/lib/storage/storage';
import { ExamSession, SessionConfig } from '@/types';

// Mock target configs
vi.mock('@/lib/data/loader', () => {
  return {
    allQuestions: [
      { id: 'Q1', area: 'math', category: 'algebra', subcategory: 'equations', difficulty: 'easy', type: 'multiple_choice', prompt: 'P1', options: [], correct_answer: 'A' },
      { id: 'Q2', area: 'math', category: 'algebra', subcategory: 'equations', difficulty: 'medium', type: 'multiple_choice', prompt: 'P2', options: [], correct_answer: 'B' },
      { id: 'Q3', area: 'math', category: 'algebra', subcategory: 'equations', difficulty: 'hard', type: 'multiple_choice', prompt: 'P3', options: [], correct_answer: 'C' }
    ],
    loadExamTargets: () => Promise.resolve({
      prepatec: {
        areas: ['math'],
        categories: { math: ['algebra'] }
      }
    }),
    resolvePath: (p: string) => p
  };
});

describe('Pure Session Engine Operations', () => {
  let baseSession: ExamSession;

  beforeEach(() => {
    const config: SessionConfig = {
      mode: 'practice',
      examTarget: 'prepatec',
      questionCount: 3,
      area: 'math',
      difficulty: 'mixed'
    };

    baseSession = {
      id: 'test-session-123',
      mode: 'practice',
      examTarget: 'prepatec',
      questionIds: ['Q1', 'Q2', 'Q3'],
      currentQuestionIndex: 0,
      selectedAnswers: {},
      flaggedQuestionIds: [],
      startTime: Date.now(),
      status: 'active',
      config
    };
  });

  describe('Answer State Mutators', () => {
    it('should select an option and replace previous responses', () => {
      let state = selectAnswer(baseSession, 'Q1', 'A');
      expect(state.selectedAnswers['Q1']).toBe('A');

      // Change answer
      state = selectAnswer(state, 'Q1', 'B');
      expect(state.selectedAnswers['Q1']).toBe('B');
    });

    it('should clear selected options', () => {
      let state = selectAnswer(baseSession, 'Q1', 'A');
      expect(state.selectedAnswers['Q1']).toBe('A');

      state = clearAnswer(state, 'Q1');
      expect(state.selectedAnswers['Q1']).toBeUndefined();
    });

    it('should prevent modifications if session is completed', () => {
      let state = completeSession(baseSession);
      expect(state.status).toBe('completed');

      const modified = selectAnswer(state, 'Q1', 'A');
      expect(modified.selectedAnswers['Q1']).toBeUndefined();
    });
  });

  describe('Flag State Mutators', () => {
    it('should toggle flag on and off', () => {
      let state = toggleFlag(baseSession, 'Q1');
      expect(state.flaggedQuestionIds).toContain('Q1');

      state = toggleFlag(state, 'Q1');
      expect(state.flaggedQuestionIds).not.toContain('Q1');
    });
  });

  describe('Navigation Mutators', () => {
    it('should navigate next, previous, and direct jump with bounds protection', () => {
      let state = goNext(baseSession);
      expect(state.currentQuestionIndex).toBe(1);

      state = goNext(state);
      expect(state.currentQuestionIndex).toBe(2);

      // Protect bounds max
      state = goNext(state);
      expect(state.currentQuestionIndex).toBe(2);

      state = goPrevious(state);
      expect(state.currentQuestionIndex).toBe(1);

      // Direct jump
      state = goToQuestion(state, 0);
      expect(state.currentQuestionIndex).toBe(0);

      // Protect bounds min
      state = goPrevious(state);
      expect(state.currentQuestionIndex).toBe(0);
      
      // Protect bounds invalid
      state = goToQuestion(state, 5);
      expect(state.currentQuestionIndex).toBe(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should compute exact counts and progress metrics', () => {
      let state = selectAnswer(baseSession, 'Q1', 'A');
      state = toggleFlag(state, 'Q2');
      state = goToQuestion(state, 1);

      const progress = getSessionProgress(state);
      expect(progress.currentQuestionNumber).toBe(2);
      expect(progress.totalQuestions).toBe(3);
      expect(progress.answeredCount).toBe(1);
      expect(progress.unansweredCount).toBe(2);
      expect(progress.flaggedCount).toBe(1);
      expect(progress.completionPercentage).toBe(33); // 1/3 * 100
    });
  });

  describe('Timer and Expirations', () => {
    it('should compute remaining time and check absolute expirations', () => {
      const now = Date.now();
      const timedSession: ExamSession = {
        ...baseSession,
        expirationTime: now + 60000 // 1 min remaining
      };

      const rem = getRemainingTime(timedSession, now);
      expect(rem).toBe(60000);

      // No negative times
      const remOver = getRemainingTime(timedSession, now + 80000);
      expect(remOver).toBe(0);

      // Expiry check
      let expiredState = checkSessionExpiration(timedSession, now + 80000);
      expect(expiredState.status).toBe('expired');
    });

    it('should format times correctly into HH:MM:SS or MM:SS', () => {
      expect(formatRemainingTime(65000)).toBe('01:05');
      expect(formatRemainingTime(3665000)).toBe('01:01:05');
    });
  });

  describe('LocalStorage Storage & Persistence', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    });

    it('should save, load, and delete snapshots safely', () => {
      saveSession(baseSession);
      
      const loaded = loadSession(baseSession.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(baseSession.id);
      expect(loaded?.questionIds).toEqual(['Q1', 'Q2', 'Q3']);

      deleteSession(baseSession.id);
      const afterDel = loadSession(baseSession.id);
      expect(afterDel).toBeNull();
    });

    it('should return null for corrupted snapshot format', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`prep_evaluator_session_${baseSession.id}`, 'invalid-json');
        const loaded = loadSession(baseSession.id);
        expect(loaded).toBeNull();
      }
    });
  });
});
