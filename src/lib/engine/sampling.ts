import { Question, SamplingRequest, SamplingResult, ExamTargetConfig } from '@/types';
import { filterQuestions } from './filter';

// Deterministic Seeded Pseudo-Random Number Generator (Mulberry32)
export class SeededRandom {
  private a: number;

  constructor(seed: number) {
    this.a = seed | 0;
  }

  next(): number {
    let t = this.a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Shuffle array deterministically
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }
}

// Interface for unified random provider
interface RandomProvider {
  next(): number;
  shuffle<T>(array: T[]): T[];
}

class MathRandomProvider implements RandomProvider {
  next(): number {
    return Math.random();
  }
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }
}

/**
 * Sample questions from a pool based on filters, count, and options (stratify, seed).
 * 
 * @param request - Sampling request params
 * @param allQuestions - Complete pool of questions
 * @param targetConfigs - Target configurations (for examTarget filtering)
 */
export function sampleQuestions(
  request: SamplingRequest,
  allQuestions: Question[],
  targetConfigs?: Record<string, ExamTargetConfig>
): SamplingResult {
  const warnings: string[] = [];
  const { filter, count, stratify = false, seed } = request;

  // 1. Filter the candidates pool
  const candidates = filterQuestions(allQuestions, filter, targetConfigs);
  const candidateCount = candidates.length;

  if (candidateCount === 0) {
    return {
      questions: [],
      requestedCount: count,
      actualCount: 0,
      candidateCount: 0,
      warnings: ['No candidates matched the specified filters.']
    };
  }

  // Initialize random provider
  const rand: RandomProvider = seed !== undefined ? new SeededRandom(seed) : new MathRandomProvider();

  // Handle case where fewer candidates exist than requested
  if (count >= candidateCount) {
    if (count > candidateCount) {
      warnings.push(`Requested ${count} questions, but only ${candidateCount} candidates were available.`);
    }
    // Shuffle the entire candidate set to preserve randomness
    const shuffledCandidates = rand.shuffle(candidates);
    return {
      questions: shuffledCandidates,
      requestedCount: count,
      actualCount: candidateCount,
      candidateCount,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  let selectedQuestions: Question[] = [];

  if (stratify) {
    // Group candidates by category
    const categoriesMap: Record<string, Question[]> = {};
    candidates.forEach(q => {
      if (!categoriesMap[q.category]) {
        categoriesMap[q.category] = [];
      }
      categoriesMap[q.category].push(q);
    });

    // Shuffle questions within each category to preserve randomness within strata
    const categoriesList = Object.keys(categoriesMap);
    categoriesList.forEach(cat => {
      categoriesMap[cat] = rand.shuffle(categoriesMap[cat]);
    });

    // Shuffle the categories order to prevent favoring the first category
    const shuffledCategories = rand.shuffle(categoriesList);

    // Round-robin selection
    const categoryPointers: Record<string, number> = {};
    shuffledCategories.forEach(cat => {
      categoryPointers[cat] = 0;
    });

    let collectedCount = 0;
    let activeCategories = [...shuffledCategories];

    while (collectedCount < count && activeCategories.length > 0) {
      const nextActiveCategories: string[] = [];

      for (const cat of activeCategories) {
        if (collectedCount >= count) break;

        const questionsList = categoriesMap[cat];
        const ptr = categoryPointers[cat];

        if (ptr < questionsList.length) {
          selectedQuestions.push(questionsList[ptr]);
          categoryPointers[cat] = ptr + 1;
          collectedCount++;

          if (ptr + 1 < questionsList.length) {
            nextActiveCategories.push(cat);
          }
        }
      }

      activeCategories = nextActiveCategories;
    }
  } else {
    // Normal random sampling: shuffle the candidate pool and take the first N questions
    const shuffled = rand.shuffle(candidates);
    selectedQuestions = shuffled.slice(0, count);
  }

  return {
    questions: selectedQuestions,
    requestedCount: count,
    actualCount: selectedQuestions.length,
    candidateCount,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
