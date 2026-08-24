// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadAllStudyCards,
  getStudyCardsByTarget,
  getStudyCardsByArea,
  getStudyCardsByCategory,
  clearValidationReport
} from '@/lib/data/loader';

describe('Study Cards Data Loader & Filters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearValidationReport();
  });

  it('loads and filters study cards using mocked fetch responses', async () => {
    const mockManifest = {
      version: 1,
      banks: [],
      stimuli: [],
      studyCards: [
        { path: 'data/study-cards/cognitive/analogies/set-001.json', area: 'cognitive', category: 'analogies' },
        { path: 'data/study-cards/math/algebra/set-001.json', area: 'math', category: 'algebra' },
        { path: 'data/study-cards/science/biology-life-sciences/set-001.json', area: 'science', category: 'biology-life-sciences' }
      ]
    };

    const mockC1 = [
      { id: 'C1', examTargets: ['prepatec'], area: 'cognitive', category: 'analogies', title: 'T1', front: 'F1', back: 'B1' }
    ];
    const mockC2 = [
      { id: 'C2', examTargets: ['prepatec', 'buap'], area: 'math', category: 'algebra', title: 'T2', front: 'F2', back: 'B2' }
    ];
    const mockC3 = [
      { id: 'C3', examTargets: ['buap'], area: 'science', category: 'biology-life-sciences', title: 'T3', front: 'F3', back: 'B3' }
    ];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      let data: any = {};
      if (url.includes('bank-manifest.json')) {
        data = mockManifest;
      } else if (url.includes('cognitive/analogies/set-001.json')) {
        data = mockC1;
      } else if (url.includes('math/algebra/set-001.json')) {
        data = mockC2;
      } else if (url.includes('science/biology-life-sciences/set-001.json')) {
        data = mockC3;
      } else if (url.includes('exam-targets.json')) {
        data = {};
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data)
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    // Test loadAllStudyCards
    const cards = await loadAllStudyCards();
    expect(cards.length).toBe(3);
    expect(cards[0].id).toBe('C1');

    // Test getStudyCardsByTarget
    const prepatecCards = await getStudyCardsByTarget('prepatec');
    expect(prepatecCards.length).toBe(2);
    expect(prepatecCards.map(c => c.id)).toContain('C1');
    expect(prepatecCards.map(c => c.id)).toContain('C2');

    const buapCards = await getStudyCardsByTarget('buap');
    expect(buapCards.length).toBe(2);
    expect(buapCards.map(c => c.id)).toContain('C2');
    expect(buapCards.map(c => c.id)).toContain('C3');

    // Test getStudyCardsByArea
    const mathCards = await getStudyCardsByArea('math');
    expect(mathCards.length).toBe(1);
    expect(mathCards[0].id).toBe('C2');

    // Test getStudyCardsByCategory
    const bioCards = await getStudyCardsByCategory('science', 'biology-life-sciences');
    expect(bioCards.length).toBe(1);
    expect(bioCards[0].id).toBe('C3');
  });
});
