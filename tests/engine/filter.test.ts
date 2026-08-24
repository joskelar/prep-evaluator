import { describe, it, expect } from 'vitest';
import { filterQuestions } from '@/lib/engine/filter';
import { Question, ExamTargetConfig } from '@/types';

const mockQuestions: Question[] = [
  {
    id: 'Q1',
    area: 'math',
    category: 'algebra',
    subcategory: 'equations',
    difficulty: 'easy',
    type: 'multiple_choice',
    prompt: 'Prompt 1',
    options: [],
    correct_answer: 'A',
    explanation: ''
  },
  {
    id: 'Q2',
    area: 'math',
    category: 'geometry',
    subcategory: 'shapes',
    difficulty: 'medium',
    type: 'multiple_choice',
    prompt: 'Prompt 2',
    options: [],
    correct_answer: 'A',
    explanation: ''
  },
  {
    id: 'Q3',
    area: 'cognitive',
    category: 'analogies',
    subcategory: 'verbal',
    difficulty: 'hard',
    type: 'multiple_choice',
    prompt: 'Prompt 3',
    options: [],
    correct_answer: 'A',
    explanation: ''
  },
  {
    id: 'Q4',
    area: 'science',
    category: 'physics',
    subcategory: 'motion',
    difficulty: 'easy',
    type: 'multiple_choice',
    prompt: 'Prompt 4',
    options: [],
    correct_answer: 'A',
    explanation: ''
  }
];

const mockTargetConfigs: Record<string, ExamTargetConfig> = {
  prepatec: {
    areas: ['math', 'cognitive'],
    categories: {
      math: ['algebra', 'geometry'],
      cognitive: ['analogies']
    }
  },
  buap: {
    areas: ['math', 'science'],
    categories: {
      math: ['algebra'],
      science: ['physics']
    }
  }
};

describe('Filter Engine', () => {
  it('should filter by area', () => {
    const result = filterQuestions(mockQuestions, { area: 'math' });
    expect(result.map(q => q.id)).toEqual(['Q1', 'Q2']);
  });

  it('should filter by categories', () => {
    const result = filterQuestions(mockQuestions, { categories: ['algebra', 'physics'] });
    expect(result.map(q => q.id)).toEqual(['Q1', 'Q4']);
  });

  it('should filter by subcategories', () => {
    const result = filterQuestions(mockQuestions, { subcategories: ['equations'] });
    expect(result.map(q => q.id)).toEqual(['Q1']);
  });

  it('should filter by difficulty', () => {
    const result = filterQuestions(mockQuestions, { difficulty: 'easy' });
    expect(result.map(q => q.id)).toEqual(['Q1', 'Q4']);
  });

  it('should support mixed difficulty (no filter)', () => {
    const result = filterQuestions(mockQuestions, { difficulty: 'mixed' });
    expect(result.length).toBe(mockQuestions.length);
  });

  it('should filter based on exam target configuration', () => {
    // Prepatec target: math and cognitive only (allows Q1, Q2, Q3)
    const prepatecResult = filterQuestions(mockQuestions, { examTarget: 'prepatec' }, mockTargetConfigs);
    expect(prepatecResult.map(q => q.id)).toEqual(['Q1', 'Q2', 'Q3']);

    // BUAP target: math.algebra and science.physics only (allows Q1, Q4)
    const buapResult = filterQuestions(mockQuestions, { examTarget: 'buap' }, mockTargetConfigs);
    expect(buapResult.map(q => q.id)).toEqual(['Q1', 'Q4']);
  });

  it('should combine multiple filters', () => {
    const result = filterQuestions(
      mockQuestions,
      {
        examTarget: 'prepatec',
        difficulty: 'easy'
      },
      mockTargetConfigs
    );
    expect(result.map(q => q.id)).toEqual(['Q1']);
  });
});
