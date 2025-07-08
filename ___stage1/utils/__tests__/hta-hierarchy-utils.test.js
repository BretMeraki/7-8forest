import {
  buildParentChildMap,
  getChildren,
  getLeafTasks,
  validateHierarchy,
  flattenToActions,
  buildDependencyGraph,
  getAncestors,
  getDescendants,
  getNodeDepth,
  HTA_LEVELS
} from '../hta-hierarchy-utils.js';

describe('HTA Hierarchy Utils', () => {
  // Test fixtures
  const validHTA = {
    goal: 'Learn JavaScript',
    strategicBranches: [
      {
        name: 'fundamentals',
        description: 'JavaScript fundamentals',
        tasks: [
          {
            id: 'task1',
            title: 'Learn Variables',
            description: 'Understand variable declaration',
            prerequisites: []
          },
          {
            id: 'task2',
            title: 'Learn Functions',
            description: 'Understand function declaration',
            prerequisites: ['task1']
          }
        ]
      },
      {
        name: 'advanced',
        description: 'Advanced JavaScript concepts',
        tasks: [
          {
            id: 'task3',
            title: 'Learn Closures',
            description: 'Understand closures',
            prerequisites: ['task2']
          },
          {
            id: 'task4',
            title: 'Learn Async/Await',
            description: 'Understand async programming',
            prerequisites: ['task1']
          }
        ]
      }
    ],
    frontierNodes: [
      {
        id: 'task1',
        title: 'Learn Variables',
        description: 'Understand variable declaration',
        prerequisites: []
      },
      {
        id: 'task2',
        title: 'Learn Functions',
        description: 'Understand function declaration',
        prerequisites: ['task1']
      },
      {
        id: 'task3',
        title: 'Learn Closures',
        description: 'Understand closures',
        prerequisites: ['task2']
      },
      {
        id: 'task4',
        title: 'Learn Async/Await',
        description: 'Understand async programming',
        prerequisites: ['task1']
      }
    ]
  };

  const cyclicHTA = {
    goal: 'Test Cyclic',
    frontierNodes: [
      {
        id: 'task1',
        title: 'Task 1',
        prerequisites: ['task2']
      },
      {
        id: 'task2',
        title: 'Task 2',
        prerequisites: ['task1']
      }
    ]
  };

  const orphanHTA = {
    goal: 'Test Orphan',
    frontierNodes: [
      {
        id: 'task1',
        title: 'Task 1',
        prerequisites: []
      },
      {
        id: 'task2',
        title: 'Task 2',
        prerequisites: ['nonexistent']
      }
    ]
  };

  const hierarchicalHTA = {
    goal: 'Multi-level HTA',
    strategicBranches: [
      {
        name: 'branch1',
        description: 'First branch',
        tasks: [
          {
            id: 'task1',
            title: 'Parent Task',
            prerequisites: [],
            subtasks: [
              {
                id: 'subtask1',
                title: 'Subtask 1',
                prerequisites: []
              },
              {
                id: 'subtask2',
                title: 'Subtask 2',
                prerequisites: ['subtask1']
              }
            ]
          }
        ]
      }
    ],
    frontierNodes: [
      {
        id: 'task1',
        title: 'Parent Task',
        prerequisites: [],
        subtasks: [
          {
            id: 'subtask1',
            title: 'Subtask 1',
            prerequisites: []
          },
          {
            id: 'subtask2',
            title: 'Subtask 2',
            prerequisites: ['subtask1']
          }
        ]
      }
    ]
  };

  const strategicBranchesHTA = {
    goal: 'Learn Full-Stack Development',
    strategicBranches: [
      {
        name: 'Foundation',
        description: 'Foundational programming concepts',
        phase: 'Foundation',
        tasks: [
          {
            id: 'foundation-1',
            title: 'HTML Basics',
            prerequisites: []
          },
          {
            id: 'foundation-2', 
            title: 'CSS Fundamentals',
            prerequisites: ['foundation-1']
          }
        ]
      },
      {
        name: 'Research',
        description: 'Research modern frameworks',
        phase: 'Research',
        tasks: [
          {
            id: 'research-1',
            title: 'Compare React vs Vue',
            prerequisites: ['foundation-2']
          }
        ]
      },
      {
        name: 'Capability',
        description: 'Build practical skills',
        phase: 'Capability',
        tasks: [
          {
            id: 'capability-1',
            title: 'Build Todo App',
            prerequisites: ['research-1']
          }
        ]
      },
      {
        name: 'Implementation',
        description: 'Real-world projects',
        phase: 'Implementation',
        tasks: [
          {
            id: 'implementation-1',
            title: 'Deploy Portfolio Site',
            prerequisites: ['capability-1']
          }
        ]
      },
      {
        name: 'Mastery',
        description: 'Advanced optimization',
        phase: 'Mastery',
        tasks: [
          {
            id: 'mastery-1',
            title: 'Performance Optimization',
            prerequisites: ['implementation-1']
          }
        ]
      }
    ],
    frontierNodes: [
      { id: 'foundation-1', title: 'HTML Basics', prerequisites: [] },
      { id: 'foundation-2', title: 'CSS Fundamentals', prerequisites: ['foundation-1'] },
      { id: 'research-1', title: 'Compare React vs Vue', prerequisites: ['foundation-2'] },
      { id: 'capability-1', title: 'Build Todo App', prerequisites: ['research-1'] },
      { id: 'implementation-1', title: 'Deploy Portfolio Site', prerequisites: ['capability-1'] },
      { id: 'mastery-1', title: 'Performance Optimization', prerequisites: ['implementation-1'] }
    ]
  };

  const complexMultiLevelHTA = {
    goal: 'Master Data Science',
    strategicBranches: [
      {
        name: 'Mathematics',
        description: 'Mathematical foundations',
        tasks: [
          {
            id: 'math-1',
            title: 'Linear Algebra',
            prerequisites: [],
            level: HTA_LEVELS.TASK,
            subtasks: [
              {
                id: 'math-1-1',
                title: 'Vectors and Matrices',
                prerequisites: [],
                level: HTA_LEVELS.ACTION
              },
              {
                id: 'math-1-2', 
                title: 'Eigenvalues and Eigenvectors',
                prerequisites: ['math-1-1'],
                level: HTA_LEVELS.ACTION
              }
            ]
          },
          {
            id: 'math-2',
            title: 'Statistics',
            prerequisites: ['math-1'],
            level: HTA_LEVELS.TASK,
            subtasks: [
              {
                id: 'math-2-1',
                title: 'Descriptive Statistics',
                prerequisites: [],
                level: HTA_LEVELS.ACTION
              },
              {
                id: 'math-2-2',
                title: 'Inferential Statistics', 
                prerequisites: ['math-2-1'],
                level: HTA_LEVELS.ACTION
              }
            ]
          }
        ]
      },
      {
        name: 'Programming',
        description: 'Programming skills',
        tasks: [
          {
            id: 'prog-1',
            title: 'Python Basics',
            prerequisites: [],
            level: HTA_LEVELS.TASK
          },
          {
            id: 'prog-2',
            title: 'Data Manipulation',
            prerequisites: ['prog-1', 'math-2'],
            level: HTA_LEVELS.TASK
          }
        ]
      }
    ],
    frontierNodes: [
      { id: 'math-1', title: 'Linear Algebra', prerequisites: [], level: HTA_LEVELS.TASK,
        subtasks: [
          { id: 'math-1-1', title: 'Vectors and Matrices', prerequisites: [], level: HTA_LEVELS.ACTION },
          { id: 'math-1-2', title: 'Eigenvalues and Eigenvectors', prerequisites: ['math-1-1'], level: HTA_LEVELS.ACTION }
        ]
      },
      { id: 'math-2', title: 'Statistics', prerequisites: ['math-1'], level: HTA_LEVELS.TASK,
        subtasks: [
          { id: 'math-2-1', title: 'Descriptive Statistics', prerequisites: [], level: HTA_LEVELS.ACTION },
          { id: 'math-2-2', title: 'Inferential Statistics', prerequisites: ['math-2-1'], level: HTA_LEVELS.ACTION }
        ]
      },
      { id: 'prog-1', title: 'Python Basics', prerequisites: [], level: HTA_LEVELS.TASK },
      { id: 'prog-2', title: 'Data Manipulation', prerequisites: ['prog-1', 'math-2'], level: HTA_LEVELS.TASK }
    ]
  };

  describe('HTA_LEVELS constants', () => {
    test('should export correct HTA level constants', () => {
      expect(HTA_LEVELS.GOAL).toBe('goal');
      expect(HTA_LEVELS.STRATEGY).toBe('strategy');
      expect(HTA_LEVELS.BRANCH).toBe('branch');
      expect(HTA_LEVELS.TASK).toBe('task');
      expect(HTA_LEVELS.ACTION).toBe('action');
    });
  });

  describe('buildParentChildMap', () => {
    test('should build correct parent-child map from valid HTA', () => {
      const map = buildParentChildMap(validHTA);
      
      // Check that all tasks are mapped correctly
      expect(map['task2']).toContain('task1');
      expect(map['task3']).toContain('task2');
      expect(map['task4']).toContain('task1');
      expect(map['task1']).toEqual([]);
    });

    test('should handle HTA without frontierNodes', () => {
      const htaWithoutFrontier = {
        goal: 'Test Goal',
        strategicBranches: []
      };
      
      const map = buildParentChildMap(htaWithoutFrontier);
      expect(map).toEqual({});
    });

    test('should handle empty HTA', () => {
      const map = buildParentChildMap({});
      expect(map).toEqual({});
    });

    test('should handle null/undefined HTA', () => {
      expect(buildParentChildMap(null)).toEqual({});
      expect(buildParentChildMap(undefined)).toEqual({});
    });

    test('should handle tasks without prerequisites', () => {
      const htaWithoutPrereqs = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1'
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: null
          }
        ]
      };
      
      const map = buildParentChildMap(htaWithoutPrereqs);
      expect(map['task1']).toEqual([]);
      expect(map['task2']).toEqual([]);
    });

    test('should handle hierarchical tasks with subtasks', () => {
      const map = buildParentChildMap(hierarchicalHTA);
      
      expect(map['task1']).toEqual([]);
      expect(map['subtask1']).toEqual([]);
      expect(map['subtask2']).toContain('subtask1');
    });

    test('should handle duplicate task IDs gracefully', () => {
      const htaWithDuplicates = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1',
            prerequisites: []
          },
          {
            id: 'task1',
            title: 'Duplicate Task',
            prerequisites: ['task2']
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: []
          }
        ]
      };
      
      const map = buildParentChildMap(htaWithDuplicates);
      expect(map['task1']).toContain('task2');
      expect(map['task2']).toEqual([]);
    });
  });

  describe('getChildren', () => {
    test('should return children for a given node', () => {
      const map = buildParentChildMap(validHTA);
      
      expect(getChildren('task1', map)).toEqual([]);
      expect(getChildren('task2', map)).toContain('task1');
      expect(getChildren('task3', map)).toContain('task2');
      expect(getChildren('task4', map)).toContain('task1');
    });

    test('should return empty array for non-existent node', () => {
      const map = buildParentChildMap(validHTA);
      
      expect(getChildren('nonexistent', map)).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(getChildren(null, {})).toEqual([]);
      expect(getChildren('task1', null)).toEqual([]);
      expect(getChildren(undefined, undefined)).toEqual([]);
    });

    test('should handle empty map', () => {
      expect(getChildren('task1', {})).toEqual([]);
    });
  });

  describe('getLeafTasks', () => {
    test('should return leaf tasks from valid HTA', () => {
      const leafTasks = getLeafTasks(validHTA);
      
      expect(leafTasks).toHaveLength(4);
      expect(leafTasks.map(t => t.id)).toContain('task1');
      expect(leafTasks.map(t => t.id)).toContain('task2');
      expect(leafTasks.map(t => t.id)).toContain('task3');
      expect(leafTasks.map(t => t.id)).toContain('task4');
    });

    test('should return empty array for HTA without frontierNodes', () => {
      const htaWithoutFrontier = {
        goal: 'Test Goal',
        strategicBranches: []
      };
      
      const leafTasks = getLeafTasks(htaWithoutFrontier);
      expect(leafTasks).toEqual([]);
    });

    test('should handle null/undefined HTA', () => {
      expect(getLeafTasks(null)).toEqual([]);
      expect(getLeafTasks(undefined)).toEqual([]);
    });

    test('should handle empty HTA', () => {
      const leafTasks = getLeafTasks({});
      expect(leafTasks).toEqual([]);
    });

    test('should handle hierarchical tasks with subtasks', () => {
      const leafTasks = getLeafTasks(hierarchicalHTA);
      
      // Should include both main tasks and subtasks
      expect(leafTasks).toHaveLength(3);
      expect(leafTasks.map(t => t.id)).toContain('task1');
      expect(leafTasks.map(t => t.id)).toContain('subtask1');
      expect(leafTasks.map(t => t.id)).toContain('subtask2');
    });

    test('should handle tasks without proper structure', () => {
      const malformedHTA = {
        frontierNodes: [
          'not an object',
          { title: 'Missing ID' },
          { id: 'task1', title: 'Valid Task' }
        ]
      };
      
      const leafTasks = getLeafTasks(malformedHTA);
      expect(leafTasks).toHaveLength(1);
      expect(leafTasks[0].id).toBe('task1');
    });
  });

  describe('validateHierarchy', () => {
    test('should validate correct hierarchy without errors', () => {
      const result = validateHierarchy(validHTA);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.orphans).toEqual([]);
      expect(result.cycles).toEqual([]);
    });

    test('should detect cycles in hierarchy', () => {
      const result = validateHierarchy(cyclicHTA);
      
      expect(result.valid).toBe(false);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain('task1');
      expect(result.cycles[0]).toContain('task2');
    });

    test('should detect orphan tasks', () => {
      const result = validateHierarchy(orphanHTA);
      
      expect(result.valid).toBe(false);
      expect(result.orphans).toContain('task2');
    });

    test('should handle empty HTA', () => {
      const result = validateHierarchy({});
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.orphans).toEqual([]);
      expect(result.cycles).toEqual([]);
    });

    test('should handle null/undefined HTA', () => {
      expect(validateHierarchy(null).valid).toBe(true);
      expect(validateHierarchy(undefined).valid).toBe(true);
    });

    test('should detect multiple cycles', () => {
      const multipleCyclesHTA = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1',
            prerequisites: ['task2']
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: ['task1']
          },
          {
            id: 'task3',
            title: 'Task 3',
            prerequisites: ['task4']
          },
          {
            id: 'task4',
            title: 'Task 4',
            prerequisites: ['task3']
          }
        ]
      };
      
      const result = validateHierarchy(multipleCyclesHTA);
      
      expect(result.valid).toBe(false);
      expect(result.cycles).toHaveLength(2);
    });

    test('should handle complex hierarchies with subtasks', () => {
      const result = validateHierarchy(hierarchicalHTA);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should handle self-referencing tasks', () => {
      const selfRefHTA = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Self-referencing Task',
            prerequisites: ['task1']
          }
        ]
      };
      
      const result = validateHierarchy(selfRefHTA);
      
      expect(result.valid).toBe(false);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain('task1');
    });
  });

  describe('flattenToActions', () => {
    test('should flatten HTA to actionable tasks', () => {
      const actions = flattenToActions(validHTA);
      
      expect(actions).toHaveLength(4);
      expect(actions.map(a => a.id)).toContain('task1');
      expect(actions.map(a => a.id)).toContain('task2');
      expect(actions.map(a => a.id)).toContain('task3');
      expect(actions.map(a => a.id)).toContain('task4');
    });

    test('should handle empty HTA', () => {
      const actions = flattenToActions({});
      expect(actions).toEqual([]);
    });

    test('should handle null/undefined HTA', () => {
      expect(flattenToActions(null)).toEqual([]);
      expect(flattenToActions(undefined)).toEqual([]);
    });

    test('should preserve task properties', () => {
      const actions = flattenToActions(validHTA);
      
      const task1 = actions.find(a => a.id === 'task1');
      expect(task1.title).toBe('Learn Variables');
      expect(task1.description).toBe('Understand variable declaration');
      expect(task1.prerequisites).toEqual([]);
    });

    test('should handle hierarchical tasks with subtasks', () => {
      const actions = flattenToActions(hierarchicalHTA);
      
      expect(actions).toHaveLength(3);
      expect(actions.map(a => a.id)).toContain('task1');
      expect(actions.map(a => a.id)).toContain('subtask1');
      expect(actions.map(a => a.id)).toContain('subtask2');
    });

    test('should handle tasks without frontierNodes', () => {
      const htaWithoutFrontier = {
        goal: 'Test Goal',
        strategicBranches: [
          {
            name: 'branch1',
            tasks: [
              {
                id: 'task1',
                title: 'Task 1'
              }
            ]
          }
        ]
      };
      
      const actions = flattenToActions(htaWithoutFrontier);
      expect(actions).toEqual([]);
    });

    test('should handle malformed tasks', () => {
      const malformedHTA = {
        frontierNodes: [
          null,
          undefined,
          { id: 'task1', title: 'Valid Task' },
          'not an object'
        ]
      };
      
      const actions = flattenToActions(malformedHTA);
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('task1');
    });
  });

  describe('buildDependencyGraph', () => {
    test('should build correct dependency graph', () => {
      const graph = buildDependencyGraph(validHTA);
      
      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges).toHaveLength(3);
      
      // Check specific dependencies
      const task2Edge = graph.edges.find(e => e.to === 'task2');
      expect(task2Edge.from).toBe('task1');
      
      const task3Edge = graph.edges.find(e => e.to === 'task3');
      expect(task3Edge.from).toBe('task2');
      
      const task4Edge = graph.edges.find(e => e.to === 'task4');
      expect(task4Edge.from).toBe('task1');
    });

    test('should handle empty HTA', () => {
      const graph = buildDependencyGraph({});
      
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    test('should handle null/undefined HTA', () => {
      expect(buildDependencyGraph(null)).toEqual({ nodes: [], edges: [] });
      expect(buildDependencyGraph(undefined)).toEqual({ nodes: [], edges: [] });
    });

    test('should handle tasks without prerequisites', () => {
      const htaWithoutPrereqs = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1'
          },
          {
            id: 'task2',
            title: 'Task 2'
          }
        ]
      };
      
      const graph = buildDependencyGraph(htaWithoutPrereqs);
      
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(0);
    });

    test('should handle multiple prerequisites', () => {
      const multiPrereqHTA = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1',
            prerequisites: []
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: []
          },
          {
            id: 'task3',
            title: 'Task 3',
            prerequisites: ['task1', 'task2']
          }
        ]
      };
      
      const graph = buildDependencyGraph(multiPrereqHTA);
      
      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(2);
      
      const task3Edges = graph.edges.filter(e => e.to === 'task3');
      expect(task3Edges).toHaveLength(2);
      expect(task3Edges.map(e => e.from)).toContain('task1');
      expect(task3Edges.map(e => e.from)).toContain('task2');
    });

    test('should handle hierarchical tasks with subtasks', () => {
      const graph = buildDependencyGraph(hierarchicalHTA);
      
      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(1);
      
      const subtask2Edge = graph.edges.find(e => e.to === 'subtask2');
      expect(subtask2Edge.from).toBe('subtask1');
    });

    test('should include node metadata', () => {
      const graph = buildDependencyGraph(validHTA);
      
      const task1Node = graph.nodes.find(n => n.id === 'task1');
      expect(task1Node.title).toBe('Learn Variables');
      expect(task1Node.description).toBe('Understand variable declaration');
    });
  });

  describe('getAncestors', () => {
    test('should return ancestors for a node', () => {
      const map = buildParentChildMap(validHTA);
      
      const ancestors = getAncestors('task3', map);
      expect(ancestors).toContain('task2');
      expect(ancestors).toContain('task1');
    });

    test('should return empty array for root nodes', () => {
      const map = buildParentChildMap(validHTA);
      
      const ancestors = getAncestors('task1', map);
      expect(ancestors).toEqual([]);
    });

    test('should handle non-existent nodes', () => {
      const map = buildParentChildMap(validHTA);
      
      const ancestors = getAncestors('nonexistent', map);
      expect(ancestors).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(getAncestors(null, {})).toEqual([]);
      expect(getAncestors('task1', null)).toEqual([]);
      expect(getAncestors(undefined, undefined)).toEqual([]);
    });

    test('should handle cyclic dependencies gracefully', () => {
      const cyclicMap = buildParentChildMap(cyclicHTA);
      
      // Should not infinite loop
      const ancestors = getAncestors('task1', cyclicMap);
      expect(ancestors).toHaveLength(1);
      expect(ancestors).toContain('task2');
    });

    test('should handle deep hierarchies', () => {
      const deepHTA = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1',
            prerequisites: []
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: ['task1']
          },
          {
            id: 'task3',
            title: 'Task 3',
            prerequisites: ['task2']
          },
          {
            id: 'task4',
            title: 'Task 4',
            prerequisites: ['task3']
          }
        ]
      };
      
      const map = buildParentChildMap(deepHTA);
      const ancestors = getAncestors('task4', map);
      
      expect(ancestors).toHaveLength(3);
      expect(ancestors).toContain('task3');
      expect(ancestors).toContain('task2');
      expect(ancestors).toContain('task1');
    });
  });

  describe('getDescendants', () => {
    test('should return descendants for a node', () => {
      const map = buildParentChildMap(validHTA);
      
      // Create reverse map for descendants
      const reverseMap = {};
      Object.keys(map).forEach(nodeId => {
        map[nodeId].forEach(parent => {
          if (!reverseMap[parent]) {
            reverseMap[parent] = [];
          }
          reverseMap[parent].push(nodeId);
        });
      });
      
      const descendants = getDescendants('task1', reverseMap);
      expect(descendants).toContain('task2');
      expect(descendants).toContain('task4');
    });

    test('should return empty array for leaf nodes', () => {
      const map = buildParentChildMap(validHTA);
      const reverseMap = {};
      Object.keys(map).forEach(nodeId => {
        map[nodeId].forEach(parent => {
          if (!reverseMap[parent]) {
            reverseMap[parent] = [];
          }
          reverseMap[parent].push(nodeId);
        });
      });
      
      const descendants = getDescendants('task3', reverseMap);
      expect(descendants).toEqual([]);
    });

    test('should handle non-existent nodes', () => {
      const descendants = getDescendants('nonexistent', {});
      expect(descendants).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(getDescendants(null, {})).toEqual([]);
      expect(getDescendants('task1', null)).toEqual([]);
      expect(getDescendants(undefined, undefined)).toEqual([]);
    });

    test('should handle cyclic dependencies gracefully', () => {
      const cyclicMap = buildParentChildMap(cyclicHTA);
      const reverseMap = {};
      Object.keys(cyclicMap).forEach(nodeId => {
        cyclicMap[nodeId].forEach(parent => {
          if (!reverseMap[parent]) {
            reverseMap[parent] = [];
          }
          reverseMap[parent].push(nodeId);
        });
      });
      
      // Should not infinite loop
      const descendants = getDescendants('task1', reverseMap);
      expect(descendants).toHaveLength(1);
      expect(descendants).toContain('task2');
    });
  });

  describe('getNodeDepth', () => {
    test('should return correct depth for nodes', () => {
      const map = buildParentChildMap(validHTA);
      
      expect(getNodeDepth('task1', map)).toBe(0);
      expect(getNodeDepth('task2', map)).toBe(1);
      expect(getNodeDepth('task3', map)).toBe(2);
      expect(getNodeDepth('task4', map)).toBe(1);
    });

    test('should return 0 for root nodes', () => {
      const map = buildParentChildMap(validHTA);
      
      expect(getNodeDepth('task1', map)).toBe(0);
    });

    test('should return -1 for non-existent nodes', () => {
      const map = buildParentChildMap(validHTA);
      
      expect(getNodeDepth('nonexistent', map)).toBe(-1);
    });

    test('should handle null/undefined inputs', () => {
      expect(getNodeDepth(null, {})).toBe(-1);
      expect(getNodeDepth('task1', null)).toBe(-1);
      expect(getNodeDepth(undefined, undefined)).toBe(-1);
    });

    test('should handle cyclic dependencies gracefully', () => {
      const cyclicMap = buildParentChildMap(cyclicHTA);
      
      // Should not infinite loop and return reasonable depth
      const depth = getNodeDepth('task1', cyclicMap);
      expect(depth).toBeGreaterThanOrEqual(0);
    });

    test('should handle deep hierarchies', () => {
      const deepHTA = {
        frontierNodes: [
          {
            id: 'task1',
            title: 'Task 1',
            prerequisites: []
          },
          {
            id: 'task2',
            title: 'Task 2',
            prerequisites: ['task1']
          },
          {
            id: 'task3',
            title: 'Task 3',
            prerequisites: ['task2']
          },
          {
            id: 'task4',
            title: 'Task 4',
            prerequisites: ['task3']
          }
        ]
      };
      
      const map = buildParentChildMap(deepHTA);
      
      expect(getNodeDepth('task1', map)).toBe(0);
      expect(getNodeDepth('task2', map)).toBe(1);
      expect(getNodeDepth('task3', map)).toBe(2);
      expect(getNodeDepth('task4', map)).toBe(3);
    });
  });

  describe('Strategic Branches Tests', () => {
    test('should handle strategic branches structure correctly', () => {
      const map = buildParentChildMap(strategicBranchesHTA);
      
      // Should have all tasks from strategic branches
      expect(Object.keys(map)).toHaveLength(6);
      
      // Check dependency chain
      expect(map['foundation-1']).toEqual([]);
      expect(map['foundation-2']).toContain('foundation-1');
      expect(map['research-1']).toContain('foundation-2');
      expect(map['capability-1']).toContain('research-1');
      expect(map['implementation-1']).toContain('capability-1');
      expect(map['mastery-1']).toContain('implementation-1');
    });

    test('should validate strategic branches hierarchy', () => {
      const validation = validateHierarchy(strategicBranchesHTA);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.orphans).toEqual([]);
      expect(validation.cycles).toEqual([]);
    });

    test('should build dependency graph for strategic branches', () => {
      const graph = buildDependencyGraph(strategicBranchesHTA);
      
      expect(graph.nodes).toHaveLength(6);
      expect(graph.edges).toHaveLength(5);
      
      // Check specific edges exist
      const edgeTargets = graph.edges.map(e => e.to);
      expect(edgeTargets).toContain('foundation-2');
      expect(edgeTargets).toContain('research-1');
      expect(edgeTargets).toContain('capability-1');
      expect(edgeTargets).toContain('implementation-1');
      expect(edgeTargets).toContain('mastery-1');
    });

    test('should calculate correct depths for strategic progression', () => {
      const map = buildParentChildMap(strategicBranchesHTA);
      
      expect(getNodeDepth('foundation-1', map)).toBe(0);
      expect(getNodeDepth('foundation-2', map)).toBe(1);
      expect(getNodeDepth('research-1', map)).toBe(2);
      expect(getNodeDepth('capability-1', map)).toBe(3);
      expect(getNodeDepth('implementation-1', map)).toBe(4);
      expect(getNodeDepth('mastery-1', map)).toBe(5);
    });

    test('should handle strategic branches with goal-level structure', () => {
      expect(strategicBranchesHTA.goal).toBe('Learn Full-Stack Development');
      expect(strategicBranchesHTA.strategicBranches).toHaveLength(5);
      
      const phases = strategicBranchesHTA.strategicBranches.map(b => b.phase);
      expect(phases).toEqual(['Foundation', 'Research', 'Capability', 'Implementation', 'Mastery']);
    });
  });

  describe('Complex Multi-Level HTA Tests', () => {
    test('should handle complex multi-level HTA structures', () => {
      const leafTasks = getLeafTasks(complexMultiLevelHTA);
      
      // Should include all main tasks and subtasks (including parent tasks with subtasks)
      expect(leafTasks).toHaveLength(8); // 4 main tasks + 4 subtasks
      
      const taskIds = leafTasks.map(t => t.id);
      expect(taskIds).toContain('math-1');
      expect(taskIds).toContain('math-2'); 
      expect(taskIds).toContain('prog-1');
      expect(taskIds).toContain('prog-2');
      expect(taskIds).toContain('math-1-1');
      expect(taskIds).toContain('math-1-2');
      expect(taskIds).toContain('math-2-1');
      expect(taskIds).toContain('math-2-2');
    });

    test('should validate complex multi-level dependencies', () => {
      const validation = validateHierarchy(complexMultiLevelHTA);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.orphans).toEqual([]);
      expect(validation.cycles).toEqual([]);
    });

    test('should handle cross-branch dependencies', () => {
      const map = buildParentChildMap(complexMultiLevelHTA);
      
      // prog-2 depends on both prog-1 and math-2 (cross-branch dependency)
      expect(map['prog-2']).toContain('prog-1');
      expect(map['prog-2']).toContain('math-2');
      expect(map['prog-2']).toHaveLength(2);
    });

    test('should handle subtask dependencies within tasks', () => {
      const map = buildParentChildMap(complexMultiLevelHTA);
      
      // Subtask dependencies
      expect(map['math-1-1']).toEqual([]);
      expect(map['math-1-2']).toContain('math-1-1');
      expect(map['math-2-1']).toEqual([]);
      expect(map['math-2-2']).toContain('math-2-1');
    });

    test('should calculate depths for complex hierarchies', () => {
      const map = buildParentChildMap(complexMultiLevelHTA);
      
      // Root level tasks
      expect(getNodeDepth('math-1', map)).toBe(0);
      expect(getNodeDepth('prog-1', map)).toBe(0);
      
      // Second level
      expect(getNodeDepth('math-2', map)).toBe(1);
      
      // Cross-branch dependency should have max depth
      expect(getNodeDepth('prog-2', map)).toBe(2); // max(prog-1 depth + 1, math-2 depth + 1)
      
      // Subtasks
      expect(getNodeDepth('math-1-1', map)).toBe(0);
      expect(getNodeDepth('math-1-2', map)).toBe(1);
    });
  });

  describe('HTA Tree Structure Tests', () => {
    test('should handle HTA trees with multiple strategic branches', () => {
      const branches = strategicBranchesHTA.strategicBranches;
      
      expect(branches).toHaveLength(5);
      expect(branches[0].name).toBe('Foundation');
      expect(branches[1].name).toBe('Research');
      expect(branches[2].name).toBe('Capability');
      expect(branches[3].name).toBe('Implementation');
      expect(branches[4].name).toBe('Mastery');
    });

    test('should preserve HTA tree metadata in dependency graph', () => {
      const graph = buildDependencyGraph(complexMultiLevelHTA);
      
      const mathNode = graph.nodes.find(n => n.id === 'math-1');
      expect(mathNode.title).toBe('Linear Algebra');
      
      const progNode = graph.nodes.find(n => n.id === 'prog-1');
      expect(progNode.title).toBe('Python Basics');
    });

    test('should handle mixed level types in HTA tree', () => {
      const leafTasks = getLeafTasks(complexMultiLevelHTA);
      
      const taskLevelTasks = leafTasks.filter(t => t.level === HTA_LEVELS.TASK);
      const actionLevelTasks = leafTasks.filter(t => t.level === HTA_LEVELS.ACTION);
      
      expect(taskLevelTasks.length).toBeGreaterThan(0);
      expect(actionLevelTasks.length).toBeGreaterThan(0);
    });

    test('should handle HTA tree serialization structure', () => {
      // Test that HTA maintains structure for serialization
      expect(strategicBranchesHTA).toHaveProperty('goal');
      expect(strategicBranchesHTA).toHaveProperty('strategicBranches');
      expect(strategicBranchesHTA).toHaveProperty('frontierNodes');
      
      expect(Array.isArray(strategicBranchesHTA.strategicBranches)).toBe(true);
      expect(Array.isArray(strategicBranchesHTA.frontierNodes)).toBe(true);
    });

    test('should handle deep nested subtask hierarchies', () => {
      const deepNestedHTA = {
        frontierNodes: [
          {
            id: 'parent',
            title: 'Parent Task',
            prerequisites: [],
            subtasks: [
              {
                id: 'child1',
                title: 'Child 1',
                prerequisites: [],
                subtasks: [
                  {
                    id: 'grandchild1',
                    title: 'Grandchild 1',
                    prerequisites: []
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const leafTasks = getLeafTasks(deepNestedHTA);
      expect(leafTasks).toHaveLength(3); // parent, child1, grandchild1
      
      const taskIds = leafTasks.map(t => t.id);
      expect(taskIds).toContain('parent');
      expect(taskIds).toContain('child1');
      expect(taskIds).toContain('grandchild1');
    });
  });

  describe('Integration Tests', () => {
    test('should work together to analyze complex HTA', () => {
      // Build parent-child map
      const map = buildParentChildMap(validHTA);
      
      // Validate hierarchy
      const validation = validateHierarchy(validHTA);
      expect(validation.valid).toBe(true);
      
      // Get leaf tasks
      const leafTasks = getLeafTasks(validHTA);
      expect(leafTasks).toHaveLength(4);
      
      // Build dependency graph
      const graph = buildDependencyGraph(validHTA);
      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges).toHaveLength(3);
      
      // Flatten to actions
      const actions = flattenToActions(validHTA);
      expect(actions).toHaveLength(4);
      
      // Test depth calculation for all nodes
      leafTasks.forEach(task => {
        const depth = getNodeDepth(task.id, map);
        expect(depth).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle strategic branches with full workflow integration', () => {
      // Test complete strategic workflow
      const map = buildParentChildMap(strategicBranchesHTA);
      const validation = validateHierarchy(strategicBranchesHTA);
      const leafTasks = getLeafTasks(strategicBranchesHTA);
      const graph = buildDependencyGraph(strategicBranchesHTA);
      const actions = flattenToActions(strategicBranchesHTA);
      
      // Validate strategic workflow
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(6);
      expect(graph.nodes).toHaveLength(6);
      expect(graph.edges).toHaveLength(5);
      expect(actions).toHaveLength(6);
      
      // Test ancestor chains for strategic progression
      const masteryAncestors = getAncestors('mastery-1', map);
      expect(masteryAncestors).toHaveLength(5);
      expect(masteryAncestors).toContain('implementation-1');
      expect(masteryAncestors).toContain('capability-1');
      expect(masteryAncestors).toContain('research-1');
      expect(masteryAncestors).toContain('foundation-2');
      expect(masteryAncestors).toContain('foundation-1');
    });

    test('should handle complex multi-level workflow integration', () => {
      // Test complete complex workflow
      const map = buildParentChildMap(complexMultiLevelHTA);
      const validation = validateHierarchy(complexMultiLevelHTA);
      const leafTasks = getLeafTasks(complexMultiLevelHTA);
      const graph = buildDependencyGraph(complexMultiLevelHTA);
      
      // Validate complex workflow
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(8); // 4 main tasks + 4 subtasks
      expect(graph.nodes).toHaveLength(8);
      
      // Test cross-branch ancestor relationships
      const prog2Ancestors = getAncestors('prog-2', map);
      expect(prog2Ancestors).toContain('prog-1');
      expect(prog2Ancestors).toContain('math-2');
      expect(prog2Ancestors).toContain('math-1');
    });

    test('should handle large HTA structures efficiently', () => {
      // Generate a large HTA structure
      const largeHTA = {
        frontierNodes: []
      };
      
      // Create 100 tasks with dependencies
      for (let i = 0; i < 100; i++) {
        const task = {
          id: `task${i}`,
          title: `Task ${i}`,
          prerequisites: i > 0 ? [`task${i - 1}`] : []
        };
        largeHTA.frontierNodes.push(task);
      }
      
      const startTime = Date.now();
      
      // Test all major functions
      const map = buildParentChildMap(largeHTA);
      const validation = validateHierarchy(largeHTA);
      const leafTasks = getLeafTasks(largeHTA);
      const graph = buildDependencyGraph(largeHTA);
      const actions = flattenToActions(largeHTA);
      
      const endTime = Date.now();
      
      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Verify results
      expect(Object.keys(map)).toHaveLength(100);
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(100);
      expect(graph.nodes).toHaveLength(100);
      expect(graph.edges).toHaveLength(99);
      expect(actions).toHaveLength(100);
    });

    test('should handle large strategic branches efficiently', () => {
      // Generate large strategic branches structure
      const largeBranchesHTA = {
        goal: 'Master Large Domain',
        strategicBranches: [],
        frontierNodes: []
      };
      
      // Create 5 strategic branches with 20 tasks each
      const phases = ['Foundation', 'Research', 'Capability', 'Implementation', 'Mastery'];
      for (let phase = 0; phase < 5; phase++) {
        const branch = {
          name: phases[phase],
          description: `${phases[phase]} phase`,
          phase: phases[phase],
          tasks: []
        };
        
        for (let task = 0; task < 20; task++) {
          const taskId = `${phases[phase].toLowerCase()}-${task}`;
          const prerequisites = task === 0 && phase === 0 ? [] : 
                             task === 0 ? [`${phases[phase-1].toLowerCase()}-19`] :
                             [`${phases[phase].toLowerCase()}-${task-1}`];
          
          const taskObj = { id: taskId, title: `${phases[phase]} Task ${task}`, prerequisites };
          branch.tasks.push(taskObj);
          largeBranchesHTA.frontierNodes.push(taskObj);
        }
        
        largeBranchesHTA.strategicBranches.push(branch);
      }
      
      const startTime = Date.now();
      
      // Test performance with large strategic structure
      const map = buildParentChildMap(largeBranchesHTA);
      const validation = validateHierarchy(largeBranchesHTA);
      const leafTasks = getLeafTasks(largeBranchesHTA);
      const graph = buildDependencyGraph(largeBranchesHTA);
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Verify strategic structure handling
      expect(Object.keys(map)).toHaveLength(100);
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(100);
      expect(graph.nodes).toHaveLength(100);
      expect(largeBranchesHTA.strategicBranches).toHaveLength(5);
    });

    test('should handle edge cases consistently', () => {
      const edgeCases = [
        null,
        undefined,
        {},
        { goal: 'Empty Goal' },
        { frontierNodes: [] },
        { frontierNodes: [null, undefined] },
        { frontierNodes: [{ id: 'task1' }] }
      ];
      
      edgeCases.forEach(hta => {
        expect(() => {
          buildParentChildMap(hta);
          validateHierarchy(hta);
          getLeafTasks(hta);
          buildDependencyGraph(hta);
          flattenToActions(hta);
        }).not.toThrow();
      });
    });
  });

  describe('HTA Tree Edge Cases', () => {
    test('should handle HTA with missing strategic branches', () => {
      const htaWithoutBranches = {
        goal: 'Test Goal',
        frontierNodes: [
          { id: 'task1', title: 'Task 1', prerequisites: [] },
          { id: 'task2', title: 'Task 2', prerequisites: ['task1'] }
        ]
      };
      
      const map = buildParentChildMap(htaWithoutBranches);
      const validation = validateHierarchy(htaWithoutBranches);
      const leafTasks = getLeafTasks(htaWithoutBranches);
      
      expect(Object.keys(map)).toHaveLength(2);
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(2);
    });

    test('should handle HTA with empty strategic branches', () => {
      const htaWithEmptyBranches = {
        goal: 'Test Goal',
        strategicBranches: [],
        frontierNodes: [
          { id: 'task1', title: 'Task 1', prerequisites: [] }
        ]
      };
      
      const validation = validateHierarchy(htaWithEmptyBranches);
      const leafTasks = getLeafTasks(htaWithEmptyBranches);
      
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(1);
    });

    test('should handle HTA with malformed strategic branches', () => {
      const htaWithMalformedBranches = {
        goal: 'Test Goal',
        strategicBranches: [
          null,
          undefined,
          { name: 'ValidBranch', tasks: [] },
          { name: 'MissingTasks' },
          'not an object'
        ],
        frontierNodes: [
          { id: 'task1', title: 'Task 1', prerequisites: [] }
        ]
      };
      
      expect(() => {
        buildParentChildMap(htaWithMalformedBranches);
        validateHierarchy(htaWithMalformedBranches);
        getLeafTasks(htaWithMalformedBranches);
      }).not.toThrow();
    });

    test('should handle HTA with mixed valid/invalid tasks', () => {
      const htaWithMixedTasks = {
        frontierNodes: [
          { id: 'task1', title: 'Valid Task', prerequisites: [] },
          null,
          undefined,
          { title: 'Missing ID' },
          { id: 'task2', prerequisites: ['task1'] },
          'not an object',
          { id: '', title: 'Empty ID' },
          { id: 'task3', title: 'Valid Task 2', prerequisites: ['task1'] }
        ]
      };
      
      const leafTasks = getLeafTasks(htaWithMixedTasks);
      const map = buildParentChildMap(htaWithMixedTasks);
      const validation = validateHierarchy(htaWithMixedTasks);
      
      // Should only include valid tasks
      expect(leafTasks.length).toBeGreaterThan(0);
      expect(leafTasks.every(task => task && task.id)).toBe(true);
      
      // Should handle gracefully without throwing
      expect(() => validation).not.toThrow();
    });

    test('should handle deeply nested subtask hierarchies', () => {
      const deepNestingHTA = {
        frontierNodes: [
          {
            id: 'root',
            title: 'Root Task',
            prerequisites: [],
            subtasks: [
              {
                id: 'level1',
                title: 'Level 1',
                prerequisites: [],
                subtasks: [
                  {
                    id: 'level2',
                    title: 'Level 2', 
                    prerequisites: [],
                    subtasks: [
                      {
                        id: 'level3',
                        title: 'Level 3',
                        prerequisites: [],
                        subtasks: [
                          {
                            id: 'level4',
                            title: 'Level 4',
                            prerequisites: []
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const leafTasks = getLeafTasks(deepNestingHTA);
      const map = buildParentChildMap(deepNestingHTA);
      
      expect(leafTasks).toHaveLength(5); // root + 4 nested levels
      expect(Object.keys(map)).toHaveLength(5);
      
      const taskIds = leafTasks.map(t => t.id);
      expect(taskIds).toContain('root');
      expect(taskIds).toContain('level1');
      expect(taskIds).toContain('level2');
      expect(taskIds).toContain('level3');
      expect(taskIds).toContain('level4');
    });

    test('should handle circular references in subtasks', () => {
      const circularSubtasksHTA = {
        frontierNodes: [
          {
            id: 'parent',
            title: 'Parent',
            prerequisites: [],
            subtasks: [
              {
                id: 'child1',
                title: 'Child 1',
                prerequisites: ['child2']
              },
              {
                id: 'child2', 
                title: 'Child 2',
                prerequisites: ['child1']
              }
            ]
          }
        ]
      };
      
      const validation = validateHierarchy(circularSubtasksHTA);
      
      expect(validation.valid).toBe(false);
      expect(validation.cycles.length).toBeGreaterThan(0);
    });

    test('should handle HTA with metadata preservation', () => {
      const metadataHTA = {
        goal: 'Learn Programming',
        metadata: {
          version: '1.0',
          created: '2024-01-01',
          author: 'Test User'
        },
        strategicBranches: [
          {
            name: 'Foundation',
            description: 'Programming fundamentals',
            metadata: { priority: 'high', estimatedHours: 40 },
            tasks: [
              {
                id: 'task1',
                title: 'Variables',
                prerequisites: [],
                metadata: { difficulty: 'easy', skills: ['syntax'] }
              }
            ]
          }
        ],
        frontierNodes: [
          {
            id: 'task1',
            title: 'Variables',
            prerequisites: [],
            metadata: { difficulty: 'easy', skills: ['syntax'] }
          }
        ]
      };
      
      const leafTasks = getLeafTasks(metadataHTA);
      const graph = buildDependencyGraph(metadataHTA);
      
      expect(metadataHTA.goal).toBe('Learn Programming');
      expect(metadataHTA.metadata).toBeDefined();
      expect(leafTasks).toHaveLength(1);
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].title).toBe('Variables');
    });
  });

  describe('HTA Tree Serialization/Deserialization', () => {
    test('should handle JSON serialization of HTA structures', () => {
      const serialized = JSON.stringify(strategicBranchesHTA);
      const deserialized = JSON.parse(serialized);
      
      // Test that deserialized structure works with all functions
      const map = buildParentChildMap(deserialized);
      const validation = validateHierarchy(deserialized);
      const leafTasks = getLeafTasks(deserialized);
      const graph = buildDependencyGraph(deserialized);
      
      expect(Object.keys(map)).toHaveLength(6);
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(6);
      expect(graph.nodes).toHaveLength(6);
      
      // Verify structure integrity
      expect(deserialized.goal).toBe('Learn Full-Stack Development');
      expect(deserialized.strategicBranches).toHaveLength(5);
      expect(deserialized.frontierNodes).toHaveLength(6);
    });

    test('should handle partial HTA structure serialization', () => {
      const partialHTA = {
        frontierNodes: [
          { id: 'task1', title: 'Task 1', prerequisites: [] },
          { id: 'task2', title: 'Task 2', prerequisites: ['task1'] }
        ]
      };
      
      const serialized = JSON.stringify(partialHTA);
      const deserialized = JSON.parse(serialized);
      
      const validation = validateHierarchy(deserialized);
      const leafTasks = getLeafTasks(deserialized);
      
      expect(validation.valid).toBe(true);
      expect(leafTasks).toHaveLength(2);
    });

    test('should handle HTA structure with complex data types', () => {
      const complexHTA = {
        goal: 'Complex Learning Path',
        frontierNodes: [
          {
            id: 'task1',
            title: 'Complex Task',
            prerequisites: [],
            metadata: {
              tags: ['important', 'fundamental'],
              estimatedTime: { value: 2, unit: 'hours' },
              resources: [
                { type: 'video', url: 'https://example.com/video' },
                { type: 'article', url: 'https://example.com/article' }
              ]
            }
          }
        ]
      };
      
      const serialized = JSON.stringify(complexHTA);
      const deserialized = JSON.parse(serialized);
      
      const leafTasks = getLeafTasks(deserialized);
      const graph = buildDependencyGraph(deserialized);
      
      expect(leafTasks).toHaveLength(1);
      expect(graph.nodes).toHaveLength(1);
      expect(deserialized.frontierNodes[0].metadata.tags).toEqual(['important', 'fundamental']);
    });

    test('should handle HTA structure reconstruction after serialization', () => {
      // Test complete round-trip with complex structure
      const originalValidation = validateHierarchy(complexMultiLevelHTA);
      const originalMap = buildParentChildMap(complexMultiLevelHTA);
      const originalGraph = buildDependencyGraph(complexMultiLevelHTA);
      
      const serialized = JSON.stringify(complexMultiLevelHTA);
      const deserialized = JSON.parse(serialized);
      
      const deserializedValidation = validateHierarchy(deserialized);
      const deserializedMap = buildParentChildMap(deserialized);
      const deserializedGraph = buildDependencyGraph(deserialized);
      
      // Compare results
      expect(deserializedValidation.valid).toBe(originalValidation.valid);
      expect(Object.keys(deserializedMap)).toEqual(Object.keys(originalMap));
      expect(deserializedGraph.nodes).toHaveLength(originalGraph.nodes.length);
      expect(deserializedGraph.edges).toHaveLength(originalGraph.edges.length);
    });
  });
});
