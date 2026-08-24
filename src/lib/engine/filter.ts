import { Question, QuestionFilter, ExamTargetConfig } from '@/types';

/**
 * Filter questions based on filter parameters and target configurations.
 * 
 * @param questions - Array of questions to filter
 * @param filter - Filter constraints (examTarget, area, categories, subcategories, difficulty)
 * @param targetConfigs - Loaded exam targets configuration
 */
export function filterQuestions(
  questions: Question[],
  filter: QuestionFilter,
  targetConfigs?: Record<string, ExamTargetConfig>
): Question[] {
  return questions.filter(q => {
    // 1. Exam Target Filtering (configuration-driven)
    if (filter.examTarget && targetConfigs) {
      const config = targetConfigs[filter.examTarget];
      if (!config) {
        // Unknown target exam, filter out all questions
        return false;
      }
      // Check if area is allowed
      if (!config.areas.includes(q.area)) {
        return false;
      }
      // Check if category is allowed for this area
      const allowedCategories = config.categories[q.area];
      if (!allowedCategories || !allowedCategories.includes(q.category)) {
        return false;
      }
    }

    // 2. Area Filtering
    if (filter.area && q.area !== filter.area) {
      return false;
    }

    // 3. Category Filtering
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(q.category)) {
        return false;
      }
    }

    // 4. Subcategory Filtering
    if (filter.subcategories && filter.subcategories.length > 0) {
      if (!filter.subcategories.includes(q.subcategory)) {
        return false;
      }
    }

    // 5. Difficulty Filtering
    if (filter.difficulty && filter.difficulty !== 'mixed') {
      if (q.difficulty !== filter.difficulty) {
        return false;
      }
    }

    return true;
  });
}
