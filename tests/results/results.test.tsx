// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Results from '@/pages/Results';
import PostSessionReview from '@/pages/PostSessionReview';
import { SessionResult } from '@/types';
import { saveLatestCompletedResult } from '@/lib/storage/storage';

// Mock loader methods
vi.mock('@/lib/data/loader', () => {
  return {
    resolvePath: (p: string) => p,
    initializeDataStore: () => Promise.resolve(),
    questionsById: {},
    getQuestionWithStimulus: (id: string) => {
      if (id === 'Q1') {
        return {
          question: {
            id: 'Q1',
            area: 'math',
            category: 'algebra',
            subcategory: 'eqs',
            difficulty: 'easy',
            type: 'mc',
            prompt: '¿Cuánto es 2+2?',
            options: [
              { id: 'A', text: '4' },
              { id: 'B', text: '5' }
            ],
            correct_answer: 'A',
            explanation: 'Porque 2+2=4.'
          },
          stimulus: null
        };
      }
      return null;
    }
  };
});

describe('Results & Post Session Review Components tests', () => {
  const mockResult: SessionResult = {
    sessionId: 'test-session-111',
    mode: 'practice',
    examTarget: 'prepatec',
    totalQuestions: 1,
    correct: 1,
    incorrect: 0,
    unanswered: 0,
    rawScore: 1,
    percentage: 100,
    areaBreakdowns: {
      math: { total: 1, correct: 1, incorrect: 0, unanswered: 0, percentage: 100 }
    },
    categoryBreakdowns: {
      algebra: { total: 1, correct: 1, incorrect: 0, unanswered: 0, percentage: 100 }
    },
    questionResults: [
      { questionId: 'Q1', selectedAnswer: 'A', correctAnswer: 'A', status: 'correct', flagged: false }
    ],
    timestamp: Date.now()
  };

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    saveLatestCompletedResult(mockResult);
  });

  describe('Results Page rendering', () => {
    it('renders correct scores, percentage and breakdown lists', () => {
      const { getByText, getAllByText } = render(
        <MemoryRouter initialEntries={['/results/test-session-111']}>
          <Routes>
            <Route path="/results/:sessionId" element={<Results />} />
          </Routes>
        </MemoryRouter>
      );

      expect(getAllByText('100%').length).toBeGreaterThan(0);
      expect(getByText('1 de 1 correctas')).toBeDefined();
      expect(getByText('Algebra')).toBeDefined(); // Category breakdown row
    });
  });

  describe('PostSessionReview Page rendering', () => {
    it('displays prompt, option selections, visual correct status, and explanation', async () => {
      const { findByText } = render(
        <MemoryRouter initialEntries={['/results/test-session-111/review']}>
          <Routes>
            <Route path="/results/:sessionId/review" element={<PostSessionReview />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify question prompt and badge
      expect(await findByText('¿Cuánto es 2+2?')).toBeDefined();
      expect(await findByText('Explicación Resolutiva')).toBeDefined();
      expect(await findByText('Porque 2+2=4.')).toBeDefined();

      // Verify filter toolbar rendering
      expect(await findByText('Correctas (1)')).toBeDefined();
      expect(await findByText('Incorrectas (0)')).toBeDefined();

      // Check active option visual indicators (correct check)
      const correctText = await findByText('✓ Correcta');
      expect(correctText).toBeDefined();
    });

    it('filters questions on toolbar click', async () => {
      const { findByText, queryByText } = render(
        <MemoryRouter initialEntries={['/results/test-session-111/review']}>
          <Routes>
            <Route path="/results/:sessionId/review" element={<PostSessionReview />} />
          </Routes>
        </MemoryRouter>
      );

      const incorrectFilterBtn = await findByText('Incorrectas (0)');
      fireEvent.click(incorrectFilterBtn);

      // Wait for empty state text
      expect(await findByText('No se encontraron reactivos con el filtro "INCORRECT".')).toBeDefined();
      
      // Filtered to empty, prompt should not be visible
      expect(queryByText('¿Cuánto es 2+2?')).toBeNull();
    });
  });
});
