import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateQuestion,
  validateStimulus,
  initializeDataStore,
  getValidationReport
} from '@/lib/data/loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Extended Question and Stimulus Validation Rules', () => {
  it('should validate unique question IDs and detect duplicates', () => {
    // Check validateQuestion on unique attributes
    const q1 = {
      id: 'COG-PRA-001',
      area: 'cognitive',
      category: 'practical-reasoning',
      subcategory: 'logic',
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Prompt',
      options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }, { id: 'C', text: 'Opt C' }],
      correct_answer: 'A',
      explanation: 'Exp'
    };
    
    // Normal validation passes
    expect(validateQuestion(q1, 'file.json', 0).length).toBe(0);
  });

  it('should fail textual stimulus when content is missing', () => {
    const textStim = {
      id: 'ENG-PASS-001',
      type: 'passage',
      title: 'Passage Title',
      content: '' // empty content
    };

    const errors = validateStimulus(textStim, 'stimuli.json', 0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("must contain non-empty 'content'");
  });

  it('should pass graphical stimulus when content is empty but valid asset is supplied', () => {
    const graphStim = {
      id: 'COG-FIG-001',
      type: 'figure',
      assets: [
        {
          src: '/assets/cognitive/fig1.svg',
          description: 'A beautiful visual figure description'
        }
      ]
    };

    const errors = validateStimulus(graphStim, 'stimuli.json', 0);
    expect(errors.length).toBe(0);
  });

  it('should fail graphical stimulus when both content and asset info are missing', () => {
    const badGraphStim = {
      id: 'COG-FIG-001',
      type: 'figure',
      assets: [] // empty assets list
    };

    const errors = validateStimulus(badGraphStim, 'stimuli.json', 0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('must contain at least one of');
  });

  it('should detect dangling stimulus references during initialization', async () => {
    const mockManifest = {
      version: 1,
      banks: [{ path: 'data/banks/math/algebra/set-001.json', area: 'math', category: 'algebra' }],
      stimuli: []
    };

    const mockQuestion = [
      {
        id: 'MAT-ALG-001',
        area: 'math',
        category: 'algebra',
        subcategory: 'equations',
        difficulty: 'medium',
        type: 'multiple_choice',
        prompt: 'Solve',
        options: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }, { id: 'C', text: '3' }],
        correct_answer: 'B',
        explanation: 'Exp',
        stimulus_id: 'NON-EXISTENT-STIM' // Dangling reference
      }
    ];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('bank-manifest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        });
      }
      if (url.includes('set-001.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQuestion)
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await initializeDataStore();
    const report = getValidationReport();
    expect(report.isValid).toBe(false);
    const err = report.errors.find(e => e.message.includes("references missing stimulus_id 'NON-EXISTENT-STIM'"));
    expect(err).toBeDefined();
    
    vi.restoreAllMocks();
  });
});

describe('Manifest Generation & Validation CLI child process execution', () => {
  it('should generate manifest and run CLI checks on clean codebase successfully', () => {
    // Execute generate:manifest
    const genOut = execSync('node scripts/generate-manifest.mjs', { cwd: projectRoot, encoding: 'utf-8' });
    expect(genOut).toContain('Manifest successfully generated');

    // Execute validate:data
    const valOut = execSync('node scripts/validate-data.mjs', { cwd: projectRoot, encoding: 'utf-8' });
    expect(valOut).toContain('Validation PASSED successfully');
  });

  it('should fail validation CLI when invalid question file exists', () => {
    const tempFile = path.join(projectRoot, 'public/data/banks/temp-invalid.json');
    const badQuestions = [
      {
        id: 'COG-PRA-001', // Already existing global ID (will conflict)
        area: 'cognitive',
        category: 'practical-reasoning',
        subcategory: 'logic',
        difficulty: 'easy',
        type: 'multiple_choice',
        prompt: 'Prompt',
        options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }, { id: 'C', text: 'Opt C' }],
        correct_answer: 'A',
        explanation: 'Exp'
      }
    ];

    fs.writeFileSync(tempFile, JSON.stringify(badQuestions, null, 2), 'utf-8');

    try {
      // Re-generate manifest to include the new file
      execSync('node scripts/generate-manifest.mjs', { cwd: projectRoot });
      
      // Run validation, expect it to exit with non-zero (throw)
      expect(() => {
        execSync('node scripts/validate-data.mjs', { cwd: projectRoot, stdio: 'pipe' });
      }).toThrow();
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      // Regenerate manifest to keep it clean
      execSync('node scripts/generate-manifest.mjs', { cwd: projectRoot });
    }
  });
});
