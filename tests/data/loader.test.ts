import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadManifest,
  clearValidationReport,
  validateQuestion,
  validateStimulus
} from '@/lib/data/loader';

describe('Data Loading and Validation Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearValidationReport();
  });

  it('should validate manifest fields successfully', async () => {
    const mockManifest = {
      version: 1,
      banks: [
        { path: 'data/banks/math/algebra/set-001.json', area: 'math', category: 'algebra' }
      ],
      stimuli: []
    };

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const manifest = await loadManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.banks.length).toBe(1);
  });

  it('should validate single question parameters', () => {
    // Valid question
    const validQuestion = {
      id: 'MAT-ALG-001',
      area: 'math',
      category: 'algebra',
      subcategory: 'equations',
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'What is x in 2x = 4?',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' }
      ],
      correct_answer: 'B',
      explanation: 'Dividing both sides by 2 gives x = 2.'
    };

    const errors = validateQuestion(validQuestion, 'test-file.json', 0);
    expect(errors.length).toBe(0);

    // Invalid question - missing fields
    const invalidQuestion = {
      id: 'MAT-ALG-001'
      // missing fields
    };

    const errors2 = validateQuestion(invalidQuestion, 'test-file.json', 0);
    expect(errors2.length).toBeGreaterThan(0);
    expect(errors2[0].message).toContain('Missing required field');
  });

  it('should support 3, 4, or 5 options in questions', () => {
    const baseQuestion = {
      id: 'MAT-ALG-001',
      area: 'math',
      category: 'algebra',
      subcategory: 'equations',
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Solve it',
      explanation: 'explanation'
    };

    // 2 options (invalid)
    const q2 = {
      ...baseQuestion,
      correct_answer: 'A',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' }
      ]
    };
    expect(validateQuestion(q2, 'test.json', 0).length).toBeGreaterThan(0);

    // 3 options (valid)
    const q3 = {
      ...baseQuestion,
      correct_answer: 'A',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' }
      ]
    };
    expect(validateQuestion(q3, 'test.json', 0).length).toBe(0);

    // 4 options (valid)
    const q4 = {
      ...baseQuestion,
      correct_answer: 'A',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' }
      ]
    };
    expect(validateQuestion(q4, 'test.json', 0).length).toBe(0);

    // 5 options (valid)
    const q5 = {
      ...baseQuestion,
      correct_answer: 'A',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' },
        { id: 'E', text: '5' }
      ]
    };
    expect(validateQuestion(q5, 'test.json', 0).length).toBe(0);

    // 6 options (invalid)
    const q6 = {
      ...baseQuestion,
      correct_answer: 'A',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' },
        { id: 'E', text: '5' },
        { id: 'F', text: '6' }
      ]
    };
    expect(validateQuestion(q6, 'test.json', 0).length).toBeGreaterThan(0);
  });

  it('should validate that correct_answer references an existing option', () => {
    const q = {
      id: 'MAT-ALG-001',
      area: 'math',
      category: 'algebra',
      subcategory: 'equations',
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Solve it',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' }
      ],
      correct_answer: 'D', // Invalid, D is not in options
      explanation: 'explanation'
    };

    const errors = validateQuestion(q, 'test.json', 0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('does not reference a valid option ID');
  });

  it('should detect duplicate option IDs within a question', () => {
    const q = {
      id: 'MAT-ALG-001',
      area: 'math',
      category: 'algebra',
      subcategory: 'equations',
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Solve it',
      options: [
        { id: 'A', text: '1' },
        { id: 'A', text: '2' }, // Duplicate ID A
        { id: 'C', text: '3' }
      ],
      correct_answer: 'A',
      explanation: 'explanation'
    };

    const errors = validateQuestion(q, 'test.json', 0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Duplicate option ID found within question");
  });

  it('should validate single stimulus parameters', () => {
    const s = {
      id: 'SPA-PASS-001',
      type: 'passage',
      title: 'A title',
      content: 'Some passage content'
    };
    expect(validateStimulus(s, 'stim.json', 0).length).toBe(0);

    const invalidStim = {
      id: '',
      type: 'passage'
      // missing content
    };
    expect(validateStimulus(invalidStim, 'stim.json', 0).length).toBeGreaterThan(0);
  });
});
