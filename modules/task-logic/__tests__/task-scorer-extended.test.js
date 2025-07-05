/**
 * Extended Task Scorer Tests
 * Comprehensive tests to achieve 100% coverage of task-scorer.js
 */

import { TaskScorer } from '../task-scorer.js';
import { SCORING } from '../../constants.js';

describe('TaskScorer Extended Coverage', () => {
  const basicTask = {
    id: 'task1',
    title: 'Learn JavaScript basics',
    description: 'Study fundamental JavaScript concepts',
    priority: 200,
    difficulty: 3,
    duration: '30 minutes'
  };

  const projectContext = {
    goal: 'Become a JavaScript developer',
    domain: 'web development programming',
    activePath: 'foundation',
    learningStyle: 'hands-on',
    focusAreas: ['programming', 'javascript']
  };

  describe('Enhanced Rich Context Scoring', () => {
    test('should boost free tasks when budget is constrained', () => {
      const freeTask = {
        ...basicTask,
        isFreeResource: true,
        cost: 'free',
        title: 'Free JavaScript course'
      };

      const fullConfig = {
        constraints: {
          financial_constraints: ['no budget', 'limited budget']
        }
      };

      const score = TaskScorer.calculateTaskScore(
        freeTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      // Should get multiple free resource boosts
      expect(score).toBeGreaterThan(basicTask.priority + 200);
    });

    test('should boost habit building tasks', () => {
      const habitTask = {
        ...basicTask,
        branch: 'habit_building',
        title: 'Daily coding practice'
      };

      const fullConfig = {
        current_habits: {
          habit_goals: ['Daily coding practice'],
          existing_habits: ['reading', 'coding']
        }
      };

      const score = TaskScorer.calculateTaskScore(
        habitTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      expect(score).toBeGreaterThan(basicTask.priority + 100);
    });

    test('should boost tasks for time-constrained users', () => {
      const shortTask = {
        ...basicTask,
        duration: '10 minutes'
      };

      const fullConfig = {
        constraints: {
          time_constraints: ['limited time'],
          location_constraints: ['home only'],
        }
      };

      const score = TaskScorer.calculateTaskScore(
        shortTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      expect(score).toBeGreaterThan(basicTask.priority + 50);
    });

    test('should boost tasks for flexible schedule users', () => {
      const longTask = {
        ...basicTask,
        duration: '2 hours'
      };

      const fullConfig = {
        constraints: {
          time_constraints: ['flexible schedule']
        }
      };

      const score = TaskScorer.calculateTaskScore(
        longTask,
        3,
        150,
        '',
        projectContext,
        fullConfig
      );

      expect(score).toBeGreaterThan(basicTask.priority + 50);
    });

    test('should boost location-appropriate tasks', () => {
      const homeTask = {
        ...basicTask,
        location: 'home',
        remote: true,
        online: true
      };

      const mobileTask = {
        ...basicTask,
        mobile: true,
        title: 'Mobile learning app'
      };

      const fullConfig = {
        constraints: {
          location_constraints: ['home only', 'mobile learner']
        }
      };

      const homeScore = TaskScorer.calculateTaskScore(
        homeTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      const mobileScore = TaskScorer.calculateTaskScore(
        mobileTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      expect(homeScore).toBeGreaterThan(basicTask.priority + 80);
      expect(mobileScore).toBeGreaterThan(basicTask.priority + 60);
    });

    test('should boost tasks matching learning style', () => {
      const visualTask = {
        ...basicTask,
        type: 'visual',
        title: 'Visual programming diagrams'
      };

      const practicalTask = {
        ...basicTask,
        type: 'practical',
        title: 'Build a practice project'
      };

      const socialTask = {
        ...basicTask,
        type: 'social',
        title: 'Collaborate on coding'
      };

      const visualConfig = { learningStyle: 'visual learner' };
      const handsOnConfig = { learningStyle: 'hands-on practical' };
      const socialConfig = { learningStyle: 'social collaborative' };

      const visualScore = TaskScorer.calculateTaskScore(
        visualTask, 3, 60, '', projectContext, visualConfig
      );
      const practicalScore = TaskScorer.calculateTaskScore(
        practicalTask, 3, 60, '', projectContext, handsOnConfig
      );
      const socialScore = TaskScorer.calculateTaskScore(
        socialTask, 3, 60, '', projectContext, socialConfig
      );

      expect(visualScore).toBeGreaterThan(basicTask.priority + 50);
      expect(practicalScore).toBeGreaterThan(basicTask.priority + 50);
      expect(socialScore).toBeGreaterThan(basicTask.priority + 50);
    });

    test('should boost tasks matching specific interests', () => {
      const interestTask = {
        ...basicTask,
        title: 'React JavaScript framework',
        description: 'Learn React for web development'
      };

      const fullConfig = {
        specific_interests: ['React', 'web development', 'frontend']
      };

      const score = TaskScorer.calculateTaskScore(
        interestTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      // Should get multiple interest matches
      expect(score).toBeGreaterThan(basicTask.priority + 80);
    });

    test('should boost tasks building on existing habits', () => {
      const habitTask = {
        ...basicTask,
        title: 'Morning coding routine',
        description: 'Daily reading practice'
      };

      const fullConfig = {
        current_habits: {
          existing_habits: ['morning routine', 'reading']
        }
      };

      const score = TaskScorer.calculateTaskScore(
        habitTask,
        3,
        60,
        '',
        projectContext,
        fullConfig
      );

      expect(score).toBeGreaterThan(basicTask.priority + 60);
    });
  });

  describe('Reasoning Engine Analysis Integration', () => {
    test('should boost easier tasks when behind schedule', () => {
      const easyTask = { ...basicTask, difficulty: 2 };
      
      const reasoningAnalysis = {
        pacingContext: {
          pacingAnalysis: { status: 'behind' }
        }
      };

      const score = TaskScorer.calculateTaskScore(
        easyTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(score).toBeGreaterThan(basicTask.priority + 70);
    });

    test('should boost challenging tasks when ahead of schedule', () => {
      const hardTask = { ...basicTask, difficulty: 4 };
      
      const reasoningAnalysis = {
        pacingContext: {
          pacingAnalysis: { status: 'ahead' }
        }
      };

      const score = TaskScorer.calculateTaskScore(
        hardTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(score).toBeGreaterThan(basicTask.priority + 60);
    });

    test('should handle difficulty pattern deductions', () => {
      const hardTask = { ...basicTask, difficulty: 4 };
      const easyTask = { ...basicTask, difficulty: 2 };
      const plateauTask = { ...basicTask, difficulty: 3 };

      const reasoningAnalysis = {
        deductions: [
          { type: 'difficulty_pattern', insight: 'Tasks are too easy for user' },
          { type: 'difficulty_pattern', insight: 'Tasks are too challenging' },
          { type: 'difficulty_pattern', insight: 'User is hitting a plateau' }
        ]
      };

      const hardScore = TaskScorer.calculateTaskScore(
        hardTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );
      const easyScore = TaskScorer.calculateTaskScore(
        easyTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );
      const plateauScore = TaskScorer.calculateTaskScore(
        plateauTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(hardScore).toBeGreaterThan(basicTask.priority + 80);
      expect(easyScore).toBeGreaterThan(basicTask.priority + 70);
      expect(plateauScore).toBeGreaterThan(basicTask.priority + 60);
    });

    test('should handle energy pattern deductions', () => {
      const shortTask = { ...basicTask, duration: '15 minutes' };
      const longTask = { ...basicTask, duration: '60 minutes' };

      const reasoningAnalysis = {
        deductions: [
          { type: 'energy_pattern', insight: 'Learning is currently draining' },
          { type: 'energy_pattern', insight: 'Learning is energizing' }
        ]
      };

      const shortScore = TaskScorer.calculateTaskScore(
        shortTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );
      const longScore = TaskScorer.calculateTaskScore(
        longTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(shortScore).toBeGreaterThan(basicTask.priority + 60);
      expect(longScore).toBeGreaterThan(basicTask.priority + 55);
    });

    test('should handle breakthrough pattern deductions', () => {
      const challengingTask = { ...basicTask, difficulty: 4 };

      const reasoningAnalysis = {
        deductions: [
          { 
            type: 'breakthrough_pattern', 
            insight: 'User has high breakthrough rate',
            evidence: ['difficulty level achieved', 'consistent progress']
          }
        ]
      };

      const score = TaskScorer.calculateTaskScore(
        challengingTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(score).toBeGreaterThan(basicTask.priority + 120);
    });

    test('should handle velocity pattern deductions', () => {
      const highPriorityTask = { ...basicTask, priority: 350 };
      const lowDifficultyTask = { ...basicTask, difficulty: 2 };

      const reasoningAnalysis = {
        deductions: [
          { type: 'velocity_pattern', insight: 'User has high velocity' },
          { type: 'velocity_pattern', insight: 'Velocity is slowing down' }
        ]
      };

      const highVelocityScore = TaskScorer.calculateTaskScore(
        highPriorityTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );
      const slowingScore = TaskScorer.calculateTaskScore(
        lowDifficultyTask, 3, 60, '', projectContext, null, reasoningAnalysis
      );

      expect(highVelocityScore).toBeGreaterThan(basicTask.priority + 40);
      expect(slowingScore).toBeGreaterThan(basicTask.priority + 45);
    });

    test('should handle recommendation alignment', () => {
      const easyTask = { ...basicTask, difficulty: 2, branch: 'alternative' };
      const hardTask = { ...basicTask, difficulty: 4, branch: 'different' };

      const reasoningAnalysis = {
        recommendations: {
          suggestion: 'Try easier tasks for now',
          variety: 'Add more challenging variety to learning'
        }
      };

      const easyScore = TaskScorer.calculateTaskScore(
        easyTask, 3, 60, '', { ...projectContext, activePath: 'main' }, null, reasoningAnalysis
      );
      const hardScore = TaskScorer.calculateTaskScore(
        hardTask, 3, 60, '', { ...projectContext, activePath: 'main' }, null, reasoningAnalysis
      );

      expect(easyScore).toBeGreaterThan(basicTask.priority + 75);
      expect(hardScore).toBeGreaterThan(basicTask.priority + 75);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null fullConfig gracefully', () => {
      const score = TaskScorer.calculateTaskScore(
        basicTask, 3, 60, '', projectContext, null
      );
      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should handle null reasoningAnalysis gracefully', () => {
      const score = TaskScorer.calculateTaskScore(
        basicTask, 3, 60, '', projectContext, {}, null
      );
      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should handle missing config properties', () => {
      const partialConfig = {
        constraints: {}
      };

      const score = TaskScorer.calculateTaskScore(
        basicTask, 3, 60, '', projectContext, partialConfig
      );
      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should handle empty arrays in config', () => {
      const configWithEmptyArrays = {
        specific_interests: [],
        current_habits: {
          existing_habits: [],
          habit_goals: []
        },
        constraints: {
          financial_constraints: [],
          time_constraints: [],
          location_constraints: []
        }
      };

      const score = TaskScorer.calculateTaskScore(
        basicTask, 3, 60, '', projectContext, configWithEmptyArrays
      );
      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });

    test('should handle malformed reasoning analysis', () => {
      const malformedAnalysis = {
        deductions: [
          { type: 'unknown_type', insight: 'some insight' },
          { type: 'difficulty_pattern' }, // missing insight
          { insight: 'insight without type' } // missing type
        ],
        recommendations: 'not an object'
      };

      const score = TaskScorer.calculateTaskScore(
        basicTask, 3, 60, '', projectContext, null, malformedAnalysis
      );
      expect(typeof score).toBe('number');
      expect(score).not.toBeNaN();
    });
  });

  describe('Constructor and Instance Methods', () => {
    test('should create TaskScorer instance with bound methods', () => {
      const scorer = new TaskScorer();
      
      expect(typeof scorer.isDomainRelevant).toBe('function');
      expect(typeof scorer.isContextRelevant).toBe('function');
      expect(typeof scorer.getBranchVariation).toBe('function');
      expect(typeof scorer.isLifeChangeContext).toBe('function');
      expect(typeof scorer.detectLifeChangeType).toBe('function');
      expect(typeof scorer.isTaskAdaptedForLifeChange).toBe('function');
      expect(typeof scorer.parseTimeToMinutes).toBe('function');
    });

    test('should have bound methods work correctly', () => {
      const scorer = new TaskScorer();
      
      const result = scorer.isDomainRelevant(basicTask, projectContext);
      expect(typeof result).toBe('boolean');
      
      const timeResult = scorer.parseTimeToMinutes('30 minutes');
      expect(timeResult).toBe(30);
    });
  });

  describe('parseTimeToMinutes edge cases', () => {
    test('should handle numeric input', () => {
      expect(TaskScorer.parseTimeToMinutes(45)).toBe(45);
      expect(TaskScorer.parseTimeToMinutes(0)).toBe(0);
    });

    test('should handle decimal values', () => {
      expect(TaskScorer.parseTimeToMinutes('1.5 hours')).toBe(90);
      expect(TaskScorer.parseTimeToMinutes('0.5 hour')).toBe(30);
    });

    test('should handle various time unit formats', () => {
      expect(TaskScorer.parseTimeToMinutes('2 hr')).toBe(120);
      expect(TaskScorer.parseTimeToMinutes('3 h')).toBe(180);
      expect(TaskScorer.parseTimeToMinutes('45 min')).toBe(45);
    });
  });
});