/**
 * HTA Guard Tests
 * Comprehensive tests for HTA mutation guarding and validation
 */

import { guard } from '../hta-guard.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../blueprint-loader.js', () => ({
  getFunctionMeta: jest.fn()
}));

jest.unstable_mockModule('../hta-validator.js', () => ({
  validateTask: jest.fn()
}));

describe('HTA Guard', () => {
  let mockGetFunctionMeta;
  let mockValidateTask;

  beforeEach(async () => {
    const blueprintLoader = await import('../blueprint-loader.js');
    const htaValidator = await import('../hta-validator.js');
    
    mockGetFunctionMeta = blueprintLoader.getFunctionMeta;
    mockValidateTask = htaValidator.validateTask;
    
    jest.clearAllMocks();
    
    // Setup global HTA state
    globalThis.HTA = {
      tree: {
        frontierNodes: []
      }
    };
  });

  afterEach(() => {
    delete globalThis.HTA;
  });

  describe('guard function', () => {
    test('should allow mutations that pass validation', async () => {
      mockValidateTask.mockReturnValue([]); // no errors
      mockGetFunctionMeta.mockReturnValue({
        writes: ['title', 'description', 'difficulty']
      });

      // Create a simple mutation that adds a task
      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'new-task',
          title: 'New Task',
          description: 'A new task',
          difficulty: 3
        });
        return 'success';
      });

      const guardedFunction = guard('test-function', mockMutation);

      // Set up initial state (empty for this test)
      globalThis.HTA.tree = {
        frontierNodes: []
      };

      const result = await guardedFunction('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockMutation).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockValidateTask).toHaveBeenCalledWith({
        id: 'new-task',
        title: 'New Task',
        description: 'A new task',
        difficulty: 3
      });
    });

    test('should block mutations that fail validation', async () => {
      mockValidateTask.mockReturnValue(['title missing or not a string']);
      
      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'invalid-task'
          // missing title
        });
      });

      const guardedFunction = guard('test-function', mockMutation);

      // Set up initial state
      const initialState = {
        frontierNodes: []
      };
      globalThis.HTA.tree = JSON.parse(JSON.stringify(initialState));

      await expect(guardedFunction()).rejects.toThrow(
        'HTA guard: Invalid task structure – title missing or not a string'
      );

      // Should rollback to original state
      expect(globalThis.HTA.tree).toEqual(initialState);
    });

    test('should validate against blueprint writes', async () => {
      mockValidateTask.mockReturnValue([]); // pass validation
      mockGetFunctionMeta.mockReturnValue({
        writes: ['title', 'description'] // only allows these fields
      });

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'task-1',
          title: 'Valid Title',
          description: 'Valid Description',
          difficulty: 3 // not in writes list
        });
      });

      const guardedFunction = guard('restricted-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      await expect(guardedFunction()).rejects.toThrow(
        'HTA guard: Function restricted-function attempted to write unexpected fields: difficulty'
      );
    });

    test('should allow id and prerequisites even if not in writes', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue({
        writes: ['title'] // very restrictive
      });

      const mockMutation = jest.fn();
      const guardedFunction = guard('id-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      mockMutation.mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'task-1', // always allowed
          title: 'Task Title',
          prerequisites: ['other-task'] // always allowed
        });
      });

      const result = await guardedFunction();
      // Should not throw - id and prerequisites are always allowed
      expect(mockMutation).toHaveBeenCalled();
    });

    test('should handle missing blueprint meta gracefully', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue(null); // no meta found

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'task-1',
          title: 'Task Title',
          description: 'Valid field'
        });
        return 'success';
      });

      const guardedFunction = guard('unknown-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      const result = await guardedFunction();
      expect(result).toBe('success');
    });

    test('should handle blueprint meta without writes', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue({
        reads: ['someField'],
        // no writes property
      });

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'task-1',
          title: 'Task Title'
        });
        return 'success';
      });

      const guardedFunction = guard('read-only-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      const result = await guardedFunction();
      expect(result).toBe('success');
    });

    test('should handle empty writes array', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue({
        writes: [] // empty writes
      });

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          id: 'task-1',
          title: 'Task Title' // should be blocked
        });
      });

      const guardedFunction = guard('no-writes-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      await expect(guardedFunction()).rejects.toThrow(
        'HTA guard: Function no-writes-function attempted to write unexpected fields: title'
      );
    });

    test('should handle tasks in nested structure', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue({ writes: ['title', 'branch'] });

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.strategicBranches[0].tasks.push({
          id: 'nested-task',
          title: 'Nested Task',
          branch: 'branch1'
        });
      });

      const guardedFunction = guard('nested-function', mockMutation);

      globalThis.HTA.tree = {
        strategicBranches: [
          {
            name: 'branch1',
            tasks: []
          }
        ]
      };

      await guardedFunction();
      expect(mockValidateTask).toHaveBeenCalledWith({
        id: 'nested-task',
        title: 'Nested Task',
        branch: 'branch1'
      });
    });

    test('should handle multiple validation errors', async () => {
      mockValidateTask.mockReturnValue([
        'title missing or not a string',
        'id missing or not a string',
        'Unknown field: invalidField'
      ]);

      const mockMutation = jest.fn().mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes.push({
          invalidField: 'bad'
        });
      });

      const guardedFunction = guard('multi-error-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      await expect(guardedFunction()).rejects.toThrow(
        'HTA guard: Invalid task structure – title missing or not a string, id missing or not a string, Unknown field: invalidField'
      );
    });

    test('should handle mutations that modify existing tasks', async () => {
      mockValidateTask.mockReturnValue([]);
      mockGetFunctionMeta.mockReturnValue({ writes: ['completed'] });

      const mockMutation = jest.fn();
      const guardedFunction = guard('update-function', mockMutation);

      globalThis.HTA.tree = {
        frontierNodes: [
          { id: 'task-1', title: 'Task 1', completed: false }
        ]
      };

      // Modify existing task
      mockMutation.mockImplementation(() => {
        globalThis.HTA.tree.frontierNodes[0].completed = true;
      });

      await guardedFunction();
      // Should not validate existing tasks, only new ones
      expect(mockValidateTask).not.toHaveBeenCalled();
    });

    test('should preserve function context and arguments', async () => {
      mockValidateTask.mockReturnValue([]);
      
      const context = { value: 'test-context' };
      const mockMutation = jest.fn().mockResolvedValue('context-result');
      const guardedFunction = guard('context-function', mockMutation);

      globalThis.HTA.tree = { frontierNodes: [] };

      const result = await guardedFunction.call(context, 'arg1', 'arg2', 'arg3');

      expect(result).toBe('context-result');
      expect(mockMutation).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
      expect(mockMutation.mock.instances[0]).toBe(context);
    });

    test('should handle async mutations', async () => {
      mockValidateTask.mockReturnValue([]);
      
      const mockMutation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        globalThis.HTA.tree.frontierNodes.push({
          id: 'async-task',
          title: 'Async Task'
        });
        return 'async-result';
      });

      const guardedFunction = guard('async-function', mockMutation);
      globalThis.HTA.tree = { frontierNodes: [] };

      const result = await guardedFunction();
      expect(result).toBe('async-result');
      expect(mockValidateTask).toHaveBeenCalledWith({
        id: 'async-task',
        title: 'Async Task'
      });
    });

    test('should handle errors in task detection gracefully', async () => {
      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockMutation = jest.fn();
      const guardedFunction = guard('error-function', mockMutation);

      // Create a tree that will cause issues in traversal
      globalThis.HTA.tree = {
        frontierNodes: [
          { id: 'good-task', title: 'Good Task' }
        ]
      };

      // Mutation that creates circular reference
      mockMutation.mockImplementation(() => {
        const task = { id: 'circular-task', title: 'Circular Task' };
        task.self = task; // circular reference
        globalThis.HTA.tree.frontierNodes.push(task);
        throw new Error('Simulated task detection error');
      });

      await expect(guardedFunction()).rejects.toThrow('Simulated task detection error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined globalThis.HTA', async () => {
      delete globalThis.HTA;
      
      mockValidateTask.mockReturnValue([]);
      const mockMutation = jest.fn().mockResolvedValue('success');
      const guardedFunction = guard('no-hta-function', mockMutation);

      const result = await guardedFunction();
      expect(result).toBe('success');
    });

    test('should handle null HTA tree', async () => {
      globalThis.HTA = { tree: null };
      
      mockValidateTask.mockReturnValue([]);
      const mockMutation = jest.fn().mockResolvedValue('success');
      const guardedFunction = guard('null-tree-function', mockMutation);

      const result = await guardedFunction();
      expect(result).toBe('success');
    });

    test('should handle HTA tree without frontierNodes', async () => {
      globalThis.HTA = { tree: { goal: 'Some goal' } };
      
      mockValidateTask.mockReturnValue([]);
      const mockMutation = jest.fn().mockResolvedValue('success');
      const guardedFunction = guard('no-frontier-function', mockMutation);

      const result = await guardedFunction();
      expect(result).toBe('success');
    });
  });
});