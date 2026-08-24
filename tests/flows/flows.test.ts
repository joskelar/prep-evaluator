import { describe, it, expect, vi } from 'vitest';
import { createSession, checkSessionExpiration } from '@/lib/session/sessionOperations';
import { SessionConfig } from '@/types';

// Mock loader data structures
vi.mock('@/lib/data/loader', () => {
  return {
    allQuestions: [
      { id: 'Q1', area: 'math', category: 'algebra', subcategory: 'eqs', difficulty: 'easy', type: 'mc', prompt: 'P1', options: [], correct_answer: 'A' },
      { id: 'Q2', area: 'math', category: 'geometry', subcategory: 'shapes', difficulty: 'medium', type: 'mc', prompt: 'P2', options: [], correct_answer: 'B' },
      { id: 'Q3', area: 'spanish', category: 'reading', subcategory: 'comp', difficulty: 'hard', type: 'mc', prompt: 'P3', options: [], correct_answer: 'C' },
      { id: 'Q4', area: 'spanish', category: 'grammar', subcategory: 'verbs', difficulty: 'easy', type: 'mc', prompt: 'P4', options: [], correct_answer: 'D' },
      { id: 'Q5', area: 'cognitive', category: 'analogies', subcategory: 'analogies', difficulty: 'medium', type: 'mc', prompt: 'P5', options: [], correct_answer: 'A' }
    ],
    loadExamTargets: () => Promise.resolve({
      prepatec: {
        areas: ['cognitive', 'spanish', 'math'],
        categories: {
          cognitive: ['analogies'],
          spanish: ['reading', 'grammar'],
          math: ['algebra', 'geometry']
        }
      }
    }),
    initializeDataStore: () => Promise.resolve()
  };
});

describe('Student Assessment Flows Configuration', () => {
  
  describe('Practice Mode Flow', () => {
    it('creates practice session respecting category and difficulty filters', async () => {
      const config: SessionConfig = {
        mode: 'practice',
        examTarget: 'prepatec',
        questionCount: 1,
        area: 'math',
        categories: ['algebra'],
        difficulty: 'easy'
      };

      const session = await createSession(config);

      expect(session.mode).toBe('practice');
      expect(session.examTarget).toBe('prepatec');
      expect(session.durationMinutes).toBeUndefined(); // Practice is untimed by default
      expect(session.status).toBe('active');
      expect(session.questionIds.length).toBe(1);
      // Q1 is math, algebra, easy -> matches perfectly
      expect(session.questionIds[0]).toBe('Q1');
    });

    it('creates practice session filtering by difficulty correctly', async () => {
      const config: SessionConfig = {
        mode: 'practice',
        examTarget: 'prepatec',
        questionCount: 1,
        area: 'math',
        categories: ['geometry'],
        difficulty: 'medium'
      };

      const session = await createSession(config);
      // Q2 is math, geometry, medium
      expect(session.questionIds[0]).toBe('Q2');
    });
  });

  describe('General Review Flow', () => {
    it('creates review session with multiple areas and stratified sampling', async () => {
      const config: SessionConfig = {
        mode: 'general_review',
        examTarget: 'prepatec',
        questionCount: 3,
        stratify: true,
        // Include cognitive and math areas
        area: undefined, // undefined area means all allowed areas under target config
        categories: undefined
      };

      const session = await createSession(config);

      expect(session.mode).toBe('general_review');
      expect(session.config.stratify).toBe(true);
      expect(session.questionIds.length).toBe(3);
    });
  });

  describe('Exam Simulator Flow', () => {
    it('configures timed, stratified simulator session and expires correctly', async () => {
      const config: SessionConfig = {
        mode: 'simulator',
        examTarget: 'prepatec',
        questionCount: 2,
        stratify: true,
        durationMinutes: 45
      };

      const session = await createSession(config);

      expect(session.mode).toBe('simulator');
      expect(session.durationMinutes).toBe(45);
      expect(session.expirationTime).toBeDefined();
      expect(session.config.stratify).toBe(true);

      // Verify timer expiration triggers completion
      const now = Date.now();
      const expiredSession = {
        ...session,
        expirationTime: now - 1000 // 1 second ago
      };

      const updated = checkSessionExpiration(expiredSession, now);
      expect(updated.status).toBe('expired');
    });
  });
});
