/**
 * HTA Validator Tests
 * Comprehensive tests for HTA task validation
 */

import { validateTask, ALLOWED_FIELDS } from '../hta-validator.js';

describe('HTA Validator', () => {
  describe('ALLOWED_FIELDS', () => {
    test('should contain all expected fields', () => {
      const expectedFields = [
        'id', 'title', 'description', 'difficulty', 'duration', 'branch',
        'priority', 'prerequisites', 'learningOutcome', 'generated',
        'evolutionGenerated', 'blueprintSource', 'completed', 'similarity',
        'context_similarity', 'selection_method', 'metadata', 'created', 'lastUpdated'
      ];
      
      expectedFields.forEach(field => {
        expect(ALLOWED_FIELDS).toContain(field);
      });
    });
  });

  describe('validateTask', () => {
    const validTask = {
      id: 'task-123',
      title: 'Learn JavaScript basics',
      description: 'Study fundamental concepts',
      difficulty: 3,
      duration: '30 minutes',
      branch: 'foundation',
      priority: 100,
      prerequisites: ['basic-programming'],
      learningOutcome: 'Understand variables',
      generated: false,
      completed: false
    };

    test('should validate a correct task', () => {
      const errors = validateTask(validTask);
      expect(errors).toEqual([]);
    });

    test('should require id field', () => {
      const taskWithoutId = { ...validTask };
      delete taskWithoutId.id;
      
      const errors = validateTask(taskWithoutId);
      expect(errors).toContain('id missing or not a string');
    });

    test('should require id to be a string', () => {
      const taskWithNumericId = { ...validTask, id: 123 };
      
      const errors = validateTask(taskWithNumericId);
      expect(errors).toContain('id missing or not a string');
    });

    test('should require title field', () => {
      const taskWithoutTitle = { ...validTask };
      delete taskWithoutTitle.title;
      
      const errors = validateTask(taskWithoutTitle);
      expect(errors).toContain('title missing or not a string');
    });

    test('should require title to be a string', () => {
      const taskWithArrayTitle = { ...validTask, title: ['Learn', 'JavaScript'] };
      
      const errors = validateTask(taskWithArrayTitle);
      expect(errors).toContain('title missing or not a string');
    });

    test('should validate branch type if provided', () => {
      const taskWithNumericBranch = { ...validTask, branch: 123 };
      
      const errors = validateTask(taskWithNumericBranch);
      expect(errors).toContain('branch must be a string if provided');
    });

    test('should allow missing branch', () => {
      const taskWithoutBranch = { ...validTask };
      delete taskWithoutBranch.branch;
      
      const errors = validateTask(taskWithoutBranch);
      expect(errors).toEqual([]);
    });

    test('should validate difficulty type if provided', () => {
      const taskWithStringDifficulty = { ...validTask, difficulty: 'hard' };
      
      const errors = validateTask(taskWithStringDifficulty);
      expect(errors).toContain('difficulty must be a number if provided');
    });

    test('should allow missing difficulty', () => {
      const taskWithoutDifficulty = { ...validTask };
      delete taskWithoutDifficulty.difficulty;
      
      const errors = validateTask(taskWithoutDifficulty);
      expect(errors).toEqual([]);
    });

    test('should detect unknown fields', () => {
      const taskWithUnknownField = { 
        ...validTask, 
        unknownField: 'should not be allowed',
        anotherUnknown: 123
      };
      
      const errors = validateTask(taskWithUnknownField);
      expect(errors).toContain('Unknown field: unknownField');
      expect(errors).toContain('Unknown field: anotherUnknown');
    });

    test('should handle null task', () => {
      const errors = validateTask(null);
      expect(errors).toEqual(['Task is not an object']);
    });

    test('should handle undefined task', () => {
      const errors = validateTask(undefined);
      expect(errors).toEqual(['Task is not an object']);
    });

    test('should handle non-object task', () => {
      const errors = validateTask('not an object');
      expect(errors).toEqual(['Task is not an object']);
    });

    test('should handle empty object', () => {
      const errors = validateTask({});
      expect(errors).toContain('id missing or not a string');
      expect(errors).toContain('title missing or not a string');
    });

    test('should handle task with empty string id', () => {
      const taskWithEmptyId = { ...validTask, id: '' };
      
      const errors = validateTask(taskWithEmptyId);
      expect(errors).toContain('id missing or not a string');
    });

    test('should handle task with empty string title', () => {
      const taskWithEmptyTitle = { ...validTask, title: '' };
      
      const errors = validateTask(taskWithEmptyTitle);
      expect(errors).toContain('title missing or not a string');
    });

    test('should validate all allowed fields without errors', () => {
      const taskWithAllFields = {
        id: 'comprehensive-task',
        title: 'Comprehensive Task',
        description: 'A task with all possible fields',
        difficulty: 4,
        duration: '45 minutes',
        branch: 'advanced',
        priority: 200,
        prerequisites: ['prereq1', 'prereq2'],
        learningOutcome: 'Master all concepts',
        generated: true,
        evolutionGenerated: false,
        blueprintSource: 'manual',
        completed: false,
        similarity: 0.95,
        context_similarity: 0.85,
        selection_method: 'vector_search',
        metadata: { source: 'test', version: '1.0' },
        created: '2023-01-01T00:00:00Z',
        lastUpdated: '2023-01-02T00:00:00Z'
      };
      
      const errors = validateTask(taskWithAllFields);
      expect(errors).toEqual([]);
    });

    test('should handle boolean fields correctly', () => {
      const taskWithBooleans = {
        ...validTask,
        generated: true,
        evolutionGenerated: false,
        completed: true
      };
      
      const errors = validateTask(taskWithBooleans);
      expect(errors).toEqual([]);
    });

    test('should handle array fields correctly', () => {
      const taskWithArrays = {
        ...validTask,
        prerequisites: ['req1', 'req2', 'req3']
      };
      
      const errors = validateTask(taskWithArrays);
      expect(errors).toEqual([]);
    });

    test('should handle numeric fields correctly', () => {
      const taskWithNumbers = {
        ...validTask,
        difficulty: 5,
        priority: 350,
        similarity: 0.923,
        context_similarity: 0.756
      };
      
      const errors = validateTask(taskWithNumbers);
      expect(errors).toEqual([]);
    });

    test('should handle object metadata field', () => {
      const taskWithMetadata = {
        ...validTask,
        metadata: {
          source: 'ai_generated',
          confidence: 0.88,
          tags: ['javascript', 'programming'],
          nested: { key: 'value' }
        }
      };
      
      const errors = validateTask(taskWithMetadata);
      expect(errors).toEqual([]);
    });

    test('should accumulate multiple errors', () => {
      const invalidTask = {
        // missing id and title
        branch: 123, // wrong type
        difficulty: 'invalid', // wrong type
        unknownField1: 'value1', // unknown field
        unknownField2: 'value2'  // unknown field
      };
      
      const errors = validateTask(invalidTask);
      expect(errors).toHaveLength(6);
      expect(errors).toContain('id missing or not a string');
      expect(errors).toContain('title missing or not a string');
      expect(errors).toContain('branch must be a string if provided');
      expect(errors).toContain('difficulty must be a number if provided');
      expect(errors).toContain('Unknown field: unknownField1');
      expect(errors).toContain('Unknown field: unknownField2');
    });
  });
});