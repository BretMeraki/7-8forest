/**
 * HTA Graph Enricher Tests
 * Comprehensive tests for HTA graph enrichment and prompt building
 */

import { enrichHTA, buildPrompt } from '../hta-graph-enricher.js';

describe('HTA Graph Enricher', () => {
  describe('enrichHTA', () => {
    const sampleHTA = {
      goal: 'Learn JavaScript programming',
      strategicBranches: [
        {
          name: 'foundations',
          description: 'Basic JavaScript concepts',
          tasks: [
            { id: 'task1', title: 'Variables' },
            { id: 'task2', title: 'Functions' }
          ]
        },
        {
          name: 'advanced',
          description: 'Advanced JavaScript topics',
          tasks: [
            { id: 'task3', title: 'Closures' }
          ]
        }
      ],
      frontierNodes: [
        {
          id: 'task1',
          title: 'Learn Variables',
          description: 'Understand variable declarations',
          branch: 'foundations',
          prerequisites: []
        },
        {
          id: 'task2',
          title: 'Master Functions',
          description: 'Learn function syntax and usage',
          branch: 'foundations',
          prerequisites: ['task1']
        },
        {
          id: 'task3',
          title: 'Understand Closures',
          description: 'Deep dive into JavaScript closures',
          branch: 'advanced',
          prerequisites: ['task1', 'task2']
        }
      ]
    };

    test('should enrich HTA with graph features', () => {
      const projectId = 'test-project';
      const enriched = enrichHTA(projectId, sampleHTA);

      expect(enriched).toHaveLength(6); // 1 goal + 2 branches + 3 tasks
      expect(Array.isArray(enriched)).toBe(true);
    });

    test('should create goal node correctly', () => {
      const projectId = 'test-project';
      const enriched = enrichHTA(projectId, sampleHTA);
      
      const goalNode = enriched.find(node => node.type === 'goal');
      expect(goalNode).toBeDefined();
      expect(goalNode.id).toBe('test-project:goal');
      expect(goalNode.type).toBe('goal');
      expect(goalNode.depth).toBe(0);
      expect(goalNode.sibling_index).toBe(0);
      expect(goalNode.prereq_count).toBe(0);
      expect(goalNode.child_count).toBe(2); // 2 strategic branches
      expect(goalNode.raw).toBe('Learn JavaScript programming');
    });

    test('should create branch nodes correctly', () => {
      const projectId = 'test-project';
      const enriched = enrichHTA(projectId, sampleHTA);
      
      const branchNodes = enriched.filter(node => node.type === 'branch');
      expect(branchNodes).toHaveLength(2);

      const foundationsBranch = branchNodes[0];
      expect(foundationsBranch.id).toBe('test-project:branch:foundations');
      expect(foundationsBranch.type).toBe('branch');
      expect(foundationsBranch.depth).toBe(1);
      expect(foundationsBranch.sibling_index).toBe(0);
      expect(foundationsBranch.prereq_count).toBe(0);
      expect(foundationsBranch.child_count).toBe(2); // 2 tasks in this branch
      expect(foundationsBranch.raw).toBe('Basic JavaScript concepts');
      expect(foundationsBranch.branch).toBe('foundations');

      const advancedBranch = branchNodes[1];
      expect(advancedBranch.id).toBe('test-project:branch:advanced');
      expect(advancedBranch.sibling_index).toBe(1);
      expect(advancedBranch.child_count).toBe(1); // 1 task in this branch
    });

    test('should create task nodes correctly', () => {
      const projectId = 'test-project';
      const enriched = enrichHTA(projectId, sampleHTA);
      
      const taskNodes = enriched.filter(node => node.type === 'task');
      expect(taskNodes).toHaveLength(3);

      const task1 = taskNodes[0];
      expect(task1.id).toBe('test-project:task:task1');
      expect(task1.type).toBe('task');
      expect(task1.depth).toBe(2);
      expect(task1.sibling_index).toBe(0);
      expect(task1.prereq_count).toBe(0); // no prerequisites
      expect(task1.child_count).toBe(0); // tasks have no children
      expect(task1.raw).toBe('Understand variable declarations');
      expect(task1.branch).toBe('foundations');

      const task3 = taskNodes[2];
      expect(task3.prereq_count).toBe(2); // has 2 prerequisites
      expect(task3.sibling_index).toBe(2);
    });

    test('should handle missing strategic branches', () => {
      const htaWithoutBranches = {
        goal: 'Simple goal',
        frontierNodes: [
          { id: 'task1', title: 'Task 1', description: 'First task' }
        ]
      };

      const enriched = enrichHTA('test', htaWithoutBranches);
      
      const goalNode = enriched.find(node => node.type === 'goal');
      expect(goalNode.child_count).toBe(1); // fallback to frontierNodes length
      
      const branchNodes = enriched.filter(node => node.type === 'branch');
      expect(branchNodes).toHaveLength(0);
    });

    test('should handle missing frontier nodes', () => {
      const htaWithoutTasks = {
        goal: 'Goal without tasks',
        strategicBranches: [
          { name: 'branch1', description: 'First branch' }
        ]
      };

      const enriched = enrichHTA('test', htaWithoutTasks);
      
      const taskNodes = enriched.filter(node => node.type === 'task');
      expect(taskNodes).toHaveLength(0);
      
      const branchNode = enriched.find(node => node.type === 'branch');
      expect(branchNode.child_count).toBe(0); // no tasks in branch
    });

    test('should handle empty HTA', () => {
      const emptyHTA = {};

      const enriched = enrichHTA('test', emptyHTA);
      
      const goalNode = enriched.find(node => node.type === 'goal');
      expect(goalNode.raw).toBe(''); // empty goal
      expect(goalNode.child_count).toBe(0);
      
      expect(enriched).toHaveLength(1); // only goal node
    });

    test('should handle tasks without prerequisites', () => {
      const htaWithoutPrereqs = {
        goal: 'Test goal',
        frontierNodes: [
          { id: 'task1', title: 'Task 1', description: 'No prereqs' },
          { id: 'task2', title: 'Task 2', description: 'Also no prereqs', prerequisites: null }
        ]
      };

      const enriched = enrichHTA('test', htaWithoutPrereqs);
      
      const taskNodes = enriched.filter(node => node.type === 'task');
      expect(taskNodes[0].prereq_count).toBe(0);
      expect(taskNodes[1].prereq_count).toBe(0); // null prerequisites
    });

    test('should handle tasks with missing descriptions', () => {
      const htaWithMissingDescs = {
        goal: 'Test goal',
        frontierNodes: [
          { id: 'task1', title: 'Task with title only' },
          { id: 'task2', description: 'Task with description only' }
        ]
      };

      const enriched = enrichHTA('test', htaWithMissingDescs);
      
      const taskNodes = enriched.filter(node => node.type === 'task');
      expect(taskNodes[0].raw).toBe('Task with title only'); // fallback to title
      expect(taskNodes[1].raw).toBe('Task with description only');
    });

    test('should throw error for invalid HTA', () => {
      expect(() => enrichHTA('test', null)).toThrow('enrichHTA: invalid HTA object');
      expect(() => enrichHTA('test', undefined)).toThrow('enrichHTA: invalid HTA object');
      expect(() => enrichHTA('test', 'not an object')).toThrow('enrichHTA: invalid HTA object');
    });

    test('should handle branches without tasks', () => {
      const htaWithEmptyBranches = {
        goal: 'Test goal',
        strategicBranches: [
          { name: 'empty-branch', description: 'No tasks here' },
          { name: 'also-empty', description: 'Also no tasks', tasks: [] }
        ],
        frontierNodes: []
      };

      const enriched = enrichHTA('test', htaWithEmptyBranches);
      
      const branchNodes = enriched.filter(node => node.type === 'branch');
      expect(branchNodes[0].child_count).toBe(0);
      expect(branchNodes[1].child_count).toBe(0);
    });
  });

  describe('buildPrompt', () => {
    test('should build prompt for goal node', () => {
      const goalNode = {
        type: 'goal',
        depth: 0,
        sibling_index: 0,
        prereq_count: 0,
        child_count: 3,
        raw: 'Learn JavaScript programming'
      };

      const prompt = buildPrompt(goalNode);
      expect(prompt).toContain('type:goal');
      expect(prompt).toContain('depth:0');
      expect(prompt).toContain('sibling:0');
      expect(prompt).toContain('prereqs:0');
      expect(prompt).toContain('children:3');
      expect(prompt).toContain('Learn JavaScript programming');
      expect(prompt).not.toContain('branch:'); // goals don't have branch in meta
    });

    test('should build prompt for branch node', () => {
      const branchNode = {
        type: 'branch',
        depth: 1,
        sibling_index: 1,
        prereq_count: 0,
        child_count: 5,
        raw: 'Advanced JavaScript concepts',
        branch: 'advanced'
      };

      const prompt = buildPrompt(branchNode);
      expect(prompt).toContain('type:branch');
      expect(prompt).toContain('depth:1');
      expect(prompt).toContain('sibling:1');
      expect(prompt).toContain('prereqs:0');
      expect(prompt).toContain('children:5');
      expect(prompt).toContain('Advanced JavaScript concepts');
      expect(prompt).not.toContain('branch:advanced'); // branches don't include their own name
    });

    test('should build prompt for task node', () => {
      const taskNode = {
        type: 'task',
        depth: 2,
        sibling_index: 3,
        prereq_count: 2,
        child_count: 0,
        raw: 'Understand closures and scope',
        branch: 'advanced'
      };

      const prompt = buildPrompt(taskNode);
      expect(prompt).toContain('type:task');
      expect(prompt).toContain('depth:2');
      expect(prompt).toContain('sibling:3');
      expect(prompt).toContain('prereqs:2');
      expect(prompt).toContain('children:0');
      expect(prompt).toContain('branch:advanced'); // tasks include branch info
      expect(prompt).toContain('Understand closures and scope');
    });

    test('should handle node without branch', () => {
      const nodeWithoutBranch = {
        type: 'task',
        depth: 2,
        sibling_index: 0,
        prereq_count: 1,
        child_count: 0,
        raw: 'Generic task without branch'
      };

      const prompt = buildPrompt(nodeWithoutBranch);
      expect(prompt).toContain('type:task');
      expect(prompt).toContain('Generic task without branch');
      expect(prompt).not.toContain('branch:');
    });

    test('should handle empty raw content', () => {
      const nodeWithEmptyRaw = {
        type: 'goal',
        depth: 0,
        sibling_index: 0,
        prereq_count: 0,
        child_count: 0,
        raw: ''
      };

      const prompt = buildPrompt(nodeWithEmptyRaw);
      expect(prompt).toContain('type:goal');
      expect(prompt.trim()).not.toBe(''); // should still have metadata
    });

    test('should format metadata correctly', () => {
      const node = {
        type: 'task',
        depth: 1,
        sibling_index: 2,
        prereq_count: 3,
        child_count: 4,
        raw: 'Test content',
        branch: 'test-branch'
      };

      const prompt = buildPrompt(node);
      const lines = prompt.split('\n');
      expect(lines[0].trim()).toBe('type:task | depth:1 | sibling:2 | prereqs:3 | children:4 | branch:test-branch');
      expect(lines[1].trim()).toBe('Test content');
    });

    test('should handle large numbers in metadata', () => {
      const nodeWithLargeNumbers = {
        type: 'task',
        depth: 10,
        sibling_index: 999,
        prereq_count: 50,
        child_count: 100,
        raw: 'Complex task with many connections'
      };

      const prompt = buildPrompt(nodeWithLargeNumbers);
      expect(prompt).toContain('depth:10');
      expect(prompt).toContain('sibling:999');
      expect(prompt).toContain('prereqs:50');
      expect(prompt).toContain('children:100');
    });

    test('should handle zero values correctly', () => {
      const nodeWithZeros = {
        type: 'goal',
        depth: 0,
        sibling_index: 0,
        prereq_count: 0,
        child_count: 0,
        raw: 'Minimal goal'
      };

      const prompt = buildPrompt(nodeWithZeros);
      expect(prompt).toContain('depth:0');
      expect(prompt).toContain('sibling:0');
      expect(prompt).toContain('prereqs:0');
      expect(prompt).toContain('children:0');
    });
  });

  describe('Integration Tests', () => {
    test('should work together - enrich then build prompts', () => {
      const hta = {
        goal: 'Master React development',
        strategicBranches: [
          {
            name: 'basics',
            description: 'React fundamentals',
            tasks: [{ id: 'task1' }, { id: 'task2' }]
          }
        ],
        frontierNodes: [
          {
            id: 'task1',
            title: 'Learn JSX',
            description: 'Understand JSX syntax',
            branch: 'basics',
            prerequisites: []
          }
        ]
      };

      const enriched = enrichHTA('react-project', hta);
      const prompts = enriched.map(node => buildPrompt(node));

      expect(prompts).toHaveLength(3); // goal + branch + task
      
      prompts.forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
        expect(prompt).toContain('type:');
        expect(prompt).toContain('depth:');
      });

      // Check specific prompt structure
      const goalPrompt = prompts.find(p => p.includes('type:goal'));
      expect(goalPrompt).toContain('Master React development');
      
      const taskPrompt = prompts.find(p => p.includes('type:task'));
      expect(taskPrompt).toContain('branch:basics');
      expect(taskPrompt).toContain('Understand JSX syntax');
    });
  });
});