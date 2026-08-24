import { describe, it, expect } from 'vitest';
import { sampleQuestions, SeededRandom } from '@/lib/engine/sampling';
import { Question } from '@/types';

const mockQuestions: Question[] = [
  { id: 'Q1', area: 'math', category: 'algebra', subcategory: 'sub', difficulty: 'easy', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' },
  { id: 'Q2', area: 'math', category: 'algebra', subcategory: 'sub', difficulty: 'medium', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' },
  { id: 'Q3', area: 'math', category: 'geometry', subcategory: 'sub', difficulty: 'hard', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' },
  { id: 'Q4', area: 'math', category: 'geometry', subcategory: 'sub', difficulty: 'easy', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' },
  { id: 'Q5', area: 'math', category: 'statistics', subcategory: 'sub', difficulty: 'medium', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' },
  { id: 'Q6', area: 'math', category: 'statistics', subcategory: 'sub', difficulty: 'hard', type: 'mc', prompt: '', options: [], correct_answer: '', explanation: '' }
];

describe('Seeded Random Number Generator', () => {
  it('should be deterministic and yield identical sequences for the same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    const rng3 = new SeededRandom(54321);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    const seq3 = Array.from({ length: 10 }, () => rng3.next());

    expect(seq1).toEqual(seq2);
    expect(seq1).not.toEqual(seq3);
  });
});

describe('Sampling Engine', () => {
  it('should return exactly the requested count of questions', () => {
    const result = sampleQuestions(
      { filter: {}, count: 3 },
      mockQuestions
    );
    expect(result.questions.length).toBe(3);
    expect(result.requestedCount).toBe(3);
    expect(result.actualCount).toBe(3);
    expect(result.candidateCount).toBe(6);
    expect(result.warnings).toBeUndefined();
  });

  it('should contain no duplicate question IDs', () => {
    const result = sampleQuestions(
      { filter: {}, count: 5 },
      mockQuestions
    );
    const ids = result.questions.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(5);
    expect(uniqueIds.size).toBe(5);
  });

  it('should handle insufficient candidates gracefully', () => {
    const result = sampleQuestions(
      { filter: {}, count: 10 }, // 10 requested, only 6 exist
      mockQuestions
    );
    expect(result.questions.length).toBe(6);
    expect(result.actualCount).toBe(6);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('Requested 10 questions, but only 6 candidates were available');
  });

  it('should behave deterministically when a seed is supplied', () => {
    const req1 = { filter: {}, count: 4, seed: 999 };
    const req2 = { filter: {}, count: 4, seed: 999 };
    const req3 = { filter: {}, count: 4, seed: 888 };

    const res1 = sampleQuestions(req1, mockQuestions);
    const res2 = sampleQuestions(req2, mockQuestions);
    const res3 = sampleQuestions(req3, mockQuestions);

    const ids1 = res1.questions.map(q => q.id);
    const ids2 = res2.questions.map(q => q.id);
    const ids3 = res3.questions.map(q => q.id);

    expect(ids1).toEqual(ids2);
    expect(ids1).not.toEqual(ids3);
  });

  it('should distribute questions as evenly as practical under stratified sampling', () => {
    // 3 categories: algebra (Q1, Q2), geometry (Q3, Q4), statistics (Q5, Q6)
    // Requesting 3 questions with stratification: should pick exactly 1 from each category!
    const result = sampleQuestions(
      { filter: {}, count: 3, stratify: true, seed: 42 },
      mockQuestions
    );

    expect(result.questions.length).toBe(3);
    
    const categoriesUsed = result.questions.map(q => q.category);
    expect(categoriesUsed.includes('algebra')).toBe(true);
    expect(categoriesUsed.includes('geometry')).toBe(true);
    expect(categoriesUsed.includes('statistics')).toBe(true);
  });
});
