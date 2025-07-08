import { jest } from '@jest/globals';
import { TaskSelector } from '../task-selector.js';
import { TaskScorer } from '../task-scorer.js';

// Ensure deterministic randomness for tests that involve Math.random()
beforeAll(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0.1); // Always below RANDOM_TIE_BREAK_EPSILON (0.5)
});

afterAll(() => {
  Math.random.mockRestore();
});

describe('TaskSelector.selectOptimalTask', () => {
  const projectContext = {
    goal: 'Master JavaScript',
    domain: 'programming web development'
  };

  const baseTaskProps = {
    completed: false,
    prerequisites: [],
    difficulty: 3,
    duration: '30 minutes',
    priority: 200
  };

  test('returns null when no available tasks', () => {
    const htaData = { frontierNodes: [] };
    const selected = TaskSelector.selectOptimalTask(
      htaData,
      3,
      '30 minutes',
      '',
      projectContext
    );
    expect(selected).toBeNull();
  });

  test('selects highest-scoring momentum task', () => {
    const normalTask = {
      id: 't1',
      title: 'Read MDN docs',
      description: 'Basics of JS',
      ...baseTaskProps
    };

    const momentumTask = {
      id: 't2',
      title: 'Build small project',
      description: 'Create a to-do app',
      branch: 'networking',
      momentumBuilding: true,
      priority: 100,
      ...baseTaskProps
    };

    const htaData = { frontierNodes: [normalTask, momentumTask] };

    const selected = TaskSelector.selectOptimalTask(
      htaData,
      3,
      '60 minutes',
      '',
      projectContext
    );

    expect(selected).toBeDefined();
    expect(selected.id).toBe('t2'); // momentum task should win due to massive boost
  });

  test('returns null when all tasks completed or ineligible', () => {
    const completedTask = {
      id: 't3',
      title: 'Done task',
      description: 'Already finished',
      completed: true,
      difficulty: 2,
      duration: '15 minutes',
      priority: 50
    };

    const htaData = { frontierNodes: [completedTask] };
    const selected = TaskSelector.selectOptimalTask(
      htaData,
      3,
      '30 minutes',
      '',
      projectContext
    );
    expect(selected).toBeNull();
  });

  test('diversity selection prefers rarer branch when scores tie', () => {
    const taskGeneralA = {
      id: 'g1',
      title: 'Task G1',
      description: 'General branch task',
      branch: 'general',
      momentumBuilding: false,
      priority: 300,
      ...baseTaskProps
    };

    const taskGeneralB = {
      id: 'g2',
      title: 'Task G2',
      description: 'General branch task',
      branch: 'general',
      momentumBuilding: false,
      priority: 300,
      ...baseTaskProps
    };

    const taskRare = {
      id: 'r1',
      title: 'Rare branch task',
      description: 'Research branch',
      branch: 'research',
      momentumBuilding: false,
      priority: 300, // same priority so base score equal
      ...baseTaskProps
    };

    const htaData = { frontierNodes: [taskGeneralA, taskGeneralB, taskRare] };

    // Force TaskScorer.calculateTaskScore to deterministic same value by mocking
    jest.spyOn(TaskScorer, 'calculateTaskScore').mockImplementation(() => 400);

    const selected = TaskSelector.selectOptimalTask(
      htaData,
      3,
      '45 minutes',
      '',
      projectContext
    );

    expect(selected).toBeDefined();
    expect(selected.branch).toBe('research'); // rarer branch should be chosen

    // Restore original
    TaskScorer.calculateTaskScore.mockRestore();
  });
});
