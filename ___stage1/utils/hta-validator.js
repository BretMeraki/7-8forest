// @ts-nocheck
/**
 * HTA Validator – Stage-1
 * ----------------------
 * Provides minimal runtime validation for HTA node/task objects.
 * Ensures new tasks adhere to expected schema and simple integrity rules.
 */

export const ALLOWED_FIELDS = [
  'id',
  'title',
  'description',
  'difficulty',
  'duration',
  'branch',
  'priority',
  'prerequisites',
  'learningOutcome',
  'generated',
  'evolutionGenerated',
  'blueprintSource',
  'completed',
  'similarity',
  'context_similarity',
  'selection_method',
  'metadata',
  'created',
  'lastUpdated',
];

/**
 * Validate a single task/node object.
 * Returns an array of error strings (empty if valid).
 */
export function validateTask(task) {
  const errors = [];
  if (!task || typeof task !== 'object') {
    errors.push('Task is not an object');
    return errors;
  }

  // Required fields
  if (!task.id || typeof task.id !== 'string') errors.push('id missing or not a string');
  if (!task.title || typeof task.title !== 'string') errors.push('title missing or not a string');
  
  // Optional but validated fields
  if (task.branch && typeof task.branch !== 'string') {
    errors.push('branch must be a string if provided');
  }
  if (task.difficulty !== undefined && typeof task.difficulty !== 'number') {
    errors.push('difficulty must be a number if provided');
  }

  // Unknown fields
  Object.keys(task).forEach((key) => {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  });

  return errors;
} 