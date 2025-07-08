/**
 * Task Scorer Final Coverage Tests
 * Tests to reach 100% coverage for remaining uncovered lines
 */

import { TaskScorer } from '../task-scorer.js';

describe('TaskScorer Final Coverage', () => {
  const projectContext = {
    goal: 'Test goal',
    domain: 'test domain',
    activePath: 'test'
  };

  describe('Uncovered Line Coverage', () => {
    test('should cover isDomainRelevant with activePath matching', () => {
      const task = {
        title: 'Test task',
        description: 'Test description',
        branch: 'test' // This should match activePath
      };

      const result = TaskScorer.isDomainRelevant(task, projectContext);
      expect(result).toBe(true);
    });

    test('should cover isDomainRelevant with domain matching', () => {
      const task = {
        title: 'Test domain task',
        description: 'Contains test domain keywords',
        branch: 'other'
      };

      const result = TaskScorer.isDomainRelevant(task, projectContext);
      expect(result).toBe(true);
    });

    test('should cover isDomainRelevant with goal keyword matching', () => {
      const task = {
        title: 'goal oriented task',
        description: 'Helps achieve the goal',
        branch: 'other'
      };

      const contextWithGoal = {
        ...projectContext,
        goal: 'Achieve goal oriented tasks'
      };

      const result = TaskScorer.isDomainRelevant(task, contextWithGoal);
      expect(result).toBe(true);
    });

    test('should cover isDomainRelevant with learningStyle matching', () => {
      const task = {
        title: 'visual learning task',
        description: 'Visual learning approach',
        branch: 'other'
      };

      const contextWithStyle = {
        ...projectContext,
        learningStyle: 'visual',
        focusAreas: ['programming']
      };

      const result = TaskScorer.isDomainRelevant(task, contextWithStyle);
      expect(result).toBe(true);
    });

    test('should cover isDomainRelevant with focusAreas matching', () => {
      const task = {
        title: 'programming task',
        description: 'Focus on programming',
        branch: 'other'
      };

      const contextWithFocus = {
        ...projectContext,
        focusAreas: ['programming', 'testing']
      };

      const result = TaskScorer.isDomainRelevant(task, contextWithFocus);
      expect(result).toBe(true);
    });

    test('should cover isDomainRelevant error handling', () => {
      const task = {
        get title() {
          throw new Error('Property access error');
        }
      };

      // Should catch error and return true (fail-open)
      const result = TaskScorer.isDomainRelevant(task, projectContext);
      expect(result).toBe(true);
    });

    test('should cover isContextRelevant with non-string context handling', () => {
      const task = {
        title: 'programming task',
        description: 'Code development'
      };

      // Test different non-string context types
      expect(TaskScorer.isContextRelevant(task, { activity: 'programming' })).toBe(true);
      expect(TaskScorer.isContextRelevant(task, ['programming', 'code'])).toBe(true);
      expect(TaskScorer.isContextRelevant(task, 123)).toBe(false);
    });

    test('should cover isContextRelevant with JSON.stringify error', () => {
      const task = {
        title: 'test task',
        description: 'test description'
      };

      const circularContext = {};
      circularContext.self = circularContext; // Creates circular reference

      // Should handle JSON.stringify error gracefully
      const result = TaskScorer.isContextRelevant(task, circularContext);
      expect(typeof result).toBe('boolean');
    });

    test('should cover parseTimeToMinutes with number input', () => {
      expect(TaskScorer.parseTimeToMinutes(45)).toBe(45);
      expect(TaskScorer.parseTimeToMinutes(0)).toBe(0);
    });

    test('should cover parseTimeToMinutes with no match', () => {
      expect(TaskScorer.parseTimeToMinutes('completely invalid time')).toBe(30);
      expect(TaskScorer.parseTimeToMinutes('xyz')).toBe(30);
    });

    test('should cover parseTimeToMinutes with hour units', () => {
      expect(TaskScorer.parseTimeToMinutes('2.5 hours')).toBe(150);
      expect(TaskScorer.parseTimeToMinutes('1 hr')).toBe(60);
      expect(TaskScorer.parseTimeToMinutes('3 h')).toBe(180);
    });

    test('should cover calculateTaskScore without any config or analysis', () => {
      const task = {
        id: 'simple',
        title: 'Simple task',
        priority: 100,
        difficulty: 2,
        duration: '20 minutes'
      };

      const score = TaskScorer.calculateTaskScore(
        task,
        2, // energyLevel
        30, // timeInMinutes
        '', // contextFromMemory
        projectContext,
        null, // fullConfig
        null  // reasoningAnalysis
      );

      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should cover empty analysis arrays and objects', () => {
      const task = {
        id: 'test',
        title: 'Test task',
        priority: 100,
        difficulty: 3,
        duration: '30 minutes'
      };

      const emptyAnalysis = {
        deductions: [],
        recommendations: {}
      };

      const score = TaskScorer.calculateTaskScore(
        task, 3, 30, '', projectContext, null, emptyAnalysis
      );

      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should cover branch variation edge cases', () => {
      // Test all defined branches
      expect(TaskScorer.getBranchVariation('response_networking')).toBe(11);
      expect(TaskScorer.getBranchVariation('content_amplification')).toBe(12);
      expect(TaskScorer.getBranchVariation('networking')).toBe(10);
      expect(TaskScorer.getBranchVariation('journalism')).toBe(16);
      expect(TaskScorer.getBranchVariation('breakthrough_scaling')).toBe(14);
      expect(TaskScorer.getBranchVariation('viral_leverage')).toBe(13);
      
      // Test unknown branch
      expect(TaskScorer.getBranchVariation('completely_unknown_branch')).toBe(5);
      expect(TaskScorer.getBranchVariation(null)).toBe(5);
      expect(TaskScorer.getBranchVariation(undefined)).toBe(5);
    });

    test('should cover life change detection edge cases', () => {
      // Test all life change types
      expect(TaskScorer.detectLifeChangeType('moved out of town')).toBe('location_change');
      expect(TaskScorer.detectLifeChangeType('relocated to new city')).toBe('location_change');
      expect(TaskScorer.detectLifeChangeType('health crisis emerged')).toBe('health_crisis');
      expect(TaskScorer.detectLifeChangeType('medical emergency')).toBe('health_crisis');
      expect(TaskScorer.detectLifeChangeType('some other change')).toBe('unknown_change');
      expect(TaskScorer.detectLifeChangeType('')).toBe('none');
      expect(TaskScorer.detectLifeChangeType(null)).toBe('none');
      expect(TaskScorer.detectLifeChangeType(undefined)).toBe('none');
    });

    test('should cover isTaskAdaptedForLifeChange all branches', () => {
      // Test all adaptation types
      const locationTask = {
        title: 'Mobile learning',
        description: 'Remote access',
        branch: 'location_independence'
      };
      expect(TaskScorer.isTaskAdaptedForLifeChange(locationTask, 'location_change')).toBe(true);

      const healthTask = {
        title: 'Gentle learning',
        description: 'Recovery focused',
        branch: 'recovery_compatible'
      };
      expect(TaskScorer.isTaskAdaptedForLifeChange(healthTask, 'health_crisis')).toBe(true);

      const defaultTask = {
        title: 'Adaptive task',
        description: 'Life adaptation',
        branch: 'life_adaptation',
        generated: true
      };
      expect(TaskScorer.isTaskAdaptedForLifeChange(defaultTask, 'unknown_change')).toBe(true);
      expect(TaskScorer.isTaskAdaptedForLifeChange(defaultTask, 'some_other_type')).toBe(true);

      const regularTask = {
        title: 'Regular task',
        description: 'Standard approach'
      };
      expect(TaskScorer.isTaskAdaptedForLifeChange(regularTask, 'financial_crisis')).toBe(false);
    });

    test('should test constructor instance method binding', () => {
      const scorer = new TaskScorer();
      
      // All methods should be properly bound
      const methods = [
        'isDomainRelevant',
        'isContextRelevant', 
        'getBranchVariation',
        'isLifeChangeContext',
        'detectLifeChangeType',
        'isTaskAdaptedForLifeChange',
        'parseTimeToMinutes'
      ];

      methods.forEach(methodName => {
        expect(typeof scorer[methodName]).toBe('function');
        expect(scorer[methodName]).toBe(TaskScorer[methodName]);
      });
    });
  });
});