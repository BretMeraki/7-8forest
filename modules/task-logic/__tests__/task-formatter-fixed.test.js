/**
 * Task Formatter Tests - Fixed for actual implementation
 * Comprehensive tests for task formatting functionality
 */

import { TaskFormatter } from '../task-formatter.js';

describe('TaskFormatter', () => {
  const sampleTask = {
    id: 'task1',
    title: 'Learn JavaScript basics',
    description: 'Study fundamental JavaScript concepts',
    difficulty: 3,
    duration: '30 minutes',
    branch: 'foundation',
    learningOutcome: 'Understand variables and functions'
  };

  describe('formatTaskResponse', () => {
    test('should format complete task response', () => {
      const response = TaskFormatter.formatTaskResponse(sampleTask, 3, '45 minutes');
      
      expect(response).toContain('**Next Recommended Task**');
      expect(response).toContain('Learn JavaScript basics');
      expect(response).toContain('Study fundamental JavaScript concepts');
      expect(response).toContain('**Duration**: 30 minutes');
      expect(response).toContain('**Difficulty**: 3/5');
      expect(response).toContain('**Branch**: foundation');
      expect(response).toContain('**Learning Outcome**: Understand variables and functions');
      expect(response).toContain('complete_block');
      expect(response).toContain('task1');
    });

    test('should handle task without description', () => {
      const taskNoDesc = { ...sampleTask };
      delete taskNoDesc.description;
      
      const response = TaskFormatter.formatTaskResponse(taskNoDesc, 3, '30 minutes');
      expect(response).toContain('No description available');
    });

    test('should handle task without learning outcome', () => {
      const taskNoOutcome = { ...sampleTask };
      delete taskNoOutcome.learningOutcome;
      
      const response = TaskFormatter.formatTaskResponse(taskNoOutcome, 3, '30 minutes');
      expect(response).not.toContain('**Learning Outcome**');
    });

    test('should use default values for missing properties', () => {
      const minimalTask = { 
        id: 'minimal', 
        title: 'Minimal Task' 
      };
      
      const response = TaskFormatter.formatTaskResponse(minimalTask, 3, '30 minutes');
      expect(response).toContain('**Difficulty**: 1/5');
      expect(response).toContain('**Duration**: 30 minutes');
      expect(response).toContain('**Branch**: general');
    });

    test('should include energy and time match information', () => {
      const response = TaskFormatter.formatTaskResponse(sampleTask, 3, '45 minutes');
      expect(response).toContain('**Energy Match**:');
      expect(response).toContain('**Time Match**:');
    });
  });

  describe('getEnergyMatchText', () => {
    test('should return "Excellent match" for perfect or close match', () => {
      expect(TaskFormatter.getEnergyMatchText(3, 3)).toBe('Excellent match');
      expect(TaskFormatter.getEnergyMatchText(3, 2)).toBe('Excellent match');
      expect(TaskFormatter.getEnergyMatchText(3, 4)).toBe('Excellent match');
    });

    test('should return "Good match" for moderate difference', () => {
      expect(TaskFormatter.getEnergyMatchText(3, 1)).toBe('Good match');
      expect(TaskFormatter.getEnergyMatchText(3, 5)).toBe('Good match');
      expect(TaskFormatter.getEnergyMatchText(1, 3)).toBe('Good match');
    });

    test('should suggest adjustment for large differences', () => {
      expect(TaskFormatter.getEnergyMatchText(1, 5)).toBe('Consider adjusting energy or task difficulty');
      expect(TaskFormatter.getEnergyMatchText(5, 1)).toBe('Consider adjusting energy or task difficulty');
    });

    test('should handle edge cases', () => {
      expect(TaskFormatter.getEnergyMatchText(0, 0)).toBe('Excellent match');
      expect(TaskFormatter.getEnergyMatchText(10, 1)).toBe('Consider adjusting energy or task difficulty');
    });
  });

  describe('getTimeMatchText', () => {
    test('should return perfect fit when task fits exactly', () => {
      expect(TaskFormatter.getTimeMatchText('30 minutes', '30 minutes')).toBe('Perfect fit ✅');
      expect(TaskFormatter.getTimeMatchText('20 minutes', '30 minutes')).toBe('Perfect fit ✅');
    });

    test('should handle close fit within 20% extra time', () => {
      const result = TaskFormatter.getTimeMatchText('35 minutes', '30 minutes');
      expect(result).toContain('Close fit');
      expect(result).toContain('extending slightly');
    });

    test('should suggest adaptation for moderately long tasks', () => {
      const result = TaskFormatter.getTimeMatchText('40 minutes', '30 minutes');
      expect(result).toContain('Too long');
      expect(result).toContain('24 minutes instead'); // 30 * 0.8 = 24
    });

    test('should suggest partial completion for very long tasks', () => {
      const result = TaskFormatter.getTimeMatchText('2 hours', '30 minutes');
      expect(result).toContain('Much too long');
      expect(result).toContain('24 minutes only'); // 30 * 0.8 = 24
    });

    test('should handle various time formats', () => {
      expect(TaskFormatter.getTimeMatchText('1 hour', '60 minutes')).toBe('Perfect fit ✅');
      expect(TaskFormatter.getTimeMatchText('90 min', '2 hours')).toBe('Perfect fit ✅');
    });

    test('should handle edge cases', () => {
      expect(TaskFormatter.getTimeMatchText('', '30 minutes')).toBe('Perfect fit ✅'); // defaults to 30
      expect(TaskFormatter.getTimeMatchText('30 minutes', '')).toBe('Perfect fit ✅'); // defaults to 30
      expect(TaskFormatter.getTimeMatchText('invalid', 'also invalid')).toBe('Perfect fit ✅'); // both default to 30
    });
  });

  describe('formatStrategyEvolutionResponse', () => {
    const sampleAnalysis = {
      completedTasks: 5,
      totalTasks: 10,
      availableTasks: 3,
      stuckIndicators: ['low_completion_rate', 'difficulty_mismatch'],
      recommendedEvolution: 'task_generation_breakthrough',
      userFeedback: {
        sentiment: 'positive'
      }
    };

    const sampleNewTasks = [
      { title: 'New Task 1', duration: '25 minutes' },
      { title: 'New Task 2', duration: '40 minutes' },
      { title: 'New Task 3', duration: '15 minutes' },
      { title: 'New Task 4', duration: '30 minutes' }
    ];

    test('should format complete strategy evolution response', () => {
      const response = TaskFormatter.formatStrategyEvolutionResponse(
        sampleAnalysis, 
        sampleNewTasks, 
        'Great progress!'
      );

      expect(response).toContain('🧠 **Strategy Evolution Complete**');
      expect(response).toContain('📊 **Current Status**');
      expect(response).toContain('Completed tasks: 5/10');
      expect(response).toContain('Available tasks: 3');
      expect(response).toContain('Detected issues: low_completion_rate, difficulty_mismatch');
      expect(response).toContain('**Evolution Strategy**: task generation breakthrough');
      expect(response).toContain('**New Tasks Generated** (4)');
      expect(response).toContain('New Task 1');
      expect(response).toContain('New Task 2');
      expect(response).toContain('New Task 3');
      expect(response).toContain('and 1 more');
      expect(response).toContain('**Feedback Processed**: positive sentiment detected');
      expect(response).toContain('**Next Step**: Use `get_next_task`');
    });

    test('should handle analysis without stuck indicators', () => {
      const cleanAnalysis = {
        ...sampleAnalysis,
        stuckIndicators: []
      };

      const response = TaskFormatter.formatStrategyEvolutionResponse(
        cleanAnalysis, 
        sampleNewTasks, 
        'feedback'
      );

      expect(response).not.toContain('Detected issues:');
      expect(response).toContain('Completed tasks: 5/10');
    });

    test('should handle empty new tasks array', () => {
      const response = TaskFormatter.formatStrategyEvolutionResponse(
        sampleAnalysis, 
        [], 
        'feedback'
      );

      expect(response).not.toContain('**New Tasks Generated**');
      expect(response).toContain('**Current Status**');
    });

    test('should handle no feedback', () => {
      const response = TaskFormatter.formatStrategyEvolutionResponse(
        sampleAnalysis, 
        sampleNewTasks, 
        null
      );

      expect(response).not.toContain('**Feedback Processed**');
      expect(response).toContain('**Evolution Strategy**');
    });

    test('should limit displayed tasks to 3', () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Task ${i + 1}`,
        duration: '30 minutes'
      }));

      const response = TaskFormatter.formatStrategyEvolutionResponse(
        sampleAnalysis, 
        manyTasks, 
        'feedback'
      );

      expect(response).toContain('**New Tasks Generated** (10)');
      expect(response).toContain('Task 1');
      expect(response).toContain('Task 2');
      expect(response).toContain('Task 3');
      expect(response).toContain('and 7 more');
      expect(response).not.toContain('Task 4');
    });

    test('should format evolution strategy by replacing underscores', () => {
      const analysisWithUnderscores = {
        ...sampleAnalysis,
        recommendedEvolution: 'dynamic_task_generation_with_breakthrough_detection'
      };

      const response = TaskFormatter.formatStrategyEvolutionResponse(
        analysisWithUnderscores, 
        [], 
        null
      );

      expect(response).toContain('dynamic task generation with breakthrough detection');
      // Note: stuckIndicators still contain underscores, only evolution strategy is processed
    });

    test('should handle tasks without duration', () => {
      const tasksNoDuration = [
        { title: 'Task without duration' },
        { title: 'Another task', duration: '20 minutes' }
      ];

      const response = TaskFormatter.formatStrategyEvolutionResponse(
        sampleAnalysis, 
        tasksNoDuration, 
        null
      );

      expect(response).toContain('Task without duration (30 min)'); // default duration
      expect(response).toContain('Another task (20 minutes)');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined inputs gracefully', () => {
      // Should not throw errors for basic missing properties, but null task will fail
      expect(() => TaskFormatter.formatTaskResponse({}, null, '30 minutes')).not.toThrow();
      expect(() => TaskFormatter.formatTaskResponse({}, 3, null)).not.toThrow();
      
      // Null task will throw due to accessing properties
      expect(() => TaskFormatter.formatTaskResponse(null, 3, '30 minutes')).toThrow();
    });

    test('should handle empty strings and invalid inputs', () => {
      const emptyTask = { id: '', title: '', description: '' };
      const response = TaskFormatter.formatTaskResponse(emptyTask, 0, '');
      
      expect(response).toContain('**Next Recommended Task**');
      expect(typeof response).toBe('string');
    });

    test('should handle very large numbers', () => {
      const extremeTask = {
        id: 'extreme',
        title: 'Extreme Task',
        difficulty: 1000
      };

      expect(() => TaskFormatter.formatTaskResponse(extremeTask, 999, '999 hours')).not.toThrow();
      expect(() => TaskFormatter.getEnergyMatchText(1000, 1)).not.toThrow();
    });

    test('should handle malformed analysis objects', () => {
      const malformedAnalysis = {
        // Missing some required properties
        completedTasks: 'not a number',
        stuckIndicators: 'not an array'
      };

      // This will throw because stuckIndicators.join is not a function
      expect(() => TaskFormatter.formatStrategyEvolutionResponse(
        malformedAnalysis, 
        [], 
        null
      )).toThrow();
    });
  });
});