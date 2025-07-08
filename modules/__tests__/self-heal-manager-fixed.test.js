/**
 * Self Heal Manager Tests - Fixed for actual implementation
 * Comprehensive tests to achieve 100% coverage of self-heal-manager.js
 */

import { jest } from '@jest/globals';

// Mock child_process for all tests
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

// Import the mocked module and the SelfHealManager
const { execSync } = await import('child_process');
const { SelfHealManager } = await import('../self-heal-manager.js');

describe('SelfHealManager Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create SelfHealManager with default options', () => {
      const manager = new SelfHealManager();
      expect(manager.options.timeout).toBe(30000);
      expect(manager.options.maxRetries).toBe(3);
      expect(manager.options.dryRun).toBe(false);
      expect(manager.healingHistory).toBeInstanceOf(Map);
      expect(manager.healingInProgress).toBeInstanceOf(Set);
    });

    test('should create SelfHealManager with custom options', () => {
      const options = {
        timeout: 60000,
        maxRetries: 5,
        dryRun: true,
        customOption: 'test'
      };

      const manager = new SelfHealManager(options);
      expect(manager.options.timeout).toBe(60000);
      expect(manager.options.maxRetries).toBe(5);
      expect(manager.options.dryRun).toBe(true);
      expect(manager.options.customOption).toBe('test');
    });
  });

  describe('triggerSelfHealing', () => {
    test('should throw error for invalid component name', async () => {
      const manager = new SelfHealManager();

      await expect(manager.triggerSelfHealing(null))
        .rejects.toThrow('Component name is required and must be a string');
      
      await expect(manager.triggerSelfHealing(''))
        .rejects.toThrow('Component name is required and must be a string');
      
      await expect(manager.triggerSelfHealing(123))
        .rejects.toThrow('Component name is required and must be a string');
    });

    test('should prevent concurrent healing of same component', async () => {
      const cp = await import('child_process');
      cp.execSync.mockImplementation(() => {
        // Simulate slow command
        return new Promise(resolve => setTimeout(() => resolve('success'), 100));
      });

      const manager = new SelfHealManager();

      // Start first healing
      const promise1 = manager.triggerSelfHealing('test-component');
      
      // Try to start second healing while first is in progress
      await expect(manager.triggerSelfHealing('test-component'))
        .rejects.toThrow('Self-healing already in progress for component: test-component');

      // Wait for first to complete
      await promise1.catch(() => {}); // Ignore potential errors
    });

    test('should execute healing successfully', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('healing successful');

      const manager = new SelfHealManager();
      
      const result = await manager.triggerSelfHealing('task-scorer');

      expect(result.success).toBe(true);
      expect(result.componentName).toBe('task-scorer');
      expect(result.healingId).toBeDefined();
      expect(result.message).toContain('Self-healing completed successfully');
      expect(cp.execSync).toHaveBeenCalled();
    });

    test('should emit healing events', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('success');

      const manager = new SelfHealManager();
      
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();
      
      manager.on('healing_started', startedSpy);
      manager.on('healing_completed', completedSpy);

      await manager.triggerSelfHealing('test-component');

      expect(startedSpy).toHaveBeenCalledWith(expect.objectContaining({
        componentName: 'test-component',
        healingId: expect.any(String),
        timestamp: expect.any(String)
      }));

      expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
        componentName: 'test-component',
        healingId: expect.any(String),
        timestamp: expect.any(String)
      }));
    });

    test('should handle healing failures', async () => {
      const cp = await import('child_process');
      cp.execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const manager = new SelfHealManager();
      
      const failedSpy = jest.fn();
      manager.on('healing_failed', failedSpy);

      await expect(manager.triggerSelfHealing('failing-component'))
        .rejects.toThrow('Self-healing failed for failing-component');

      expect(failedSpy).toHaveBeenCalledWith(expect.objectContaining({
        componentName: 'failing-component',
        error: expect.any(String),
        timestamp: expect.any(String)
      }));
    });

    test('should record healing history', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('success');

      const manager = new SelfHealManager();
      
      await manager.triggerSelfHealing('test-component');

      expect(manager.healingHistory.size).toBe(1);
      const historyEntry = Array.from(manager.healingHistory.values())[0];
      expect(historyEntry.componentName).toBe('test-component');
      expect(historyEntry.success).toBe(true);
    });

    test('should record failed healing attempts', async () => {
      const cp = await import('child_process');
      cp.execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const manager = new SelfHealManager();
      
      try {
        await manager.triggerSelfHealing('failing-component');
      } catch (error) {
        // Expected to fail
      }

      expect(manager.healingHistory.size).toBe(1);
      const historyEntry = Array.from(manager.healingHistory.values())[0];
      expect(historyEntry.componentName).toBe('failing-component');
      expect(historyEntry.success).toBe(false);
      expect(historyEntry.error).toBeDefined();
    });

    test('should clean up healing progress on completion', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('success');

      const manager = new SelfHealManager();
      
      await manager.triggerSelfHealing('test-component');

      expect(manager.healingInProgress.has('test-component')).toBe(false);
    });

    test('should clean up healing progress on failure', async () => {
      const cp = await import('child_process');
      cp.execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const manager = new SelfHealManager();
      
      try {
        await manager.triggerSelfHealing('failing-component');
      } catch (error) {
        // Expected to fail
      }

      expect(manager.healingInProgress.has('failing-component')).toBe(false);
    });
  });

  describe('executeHealing', () => {
    test('should execute healing commands in dry run mode', async () => {
      const cp = await import('child_process');
      const manager = new SelfHealManager();
      
      const result = await manager.executeHealing('task-scorer', { 
        maxRetries: 1, 
        dryRun: true 
      });

      expect(result.commands).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.every(r => r.output.includes('[DRY RUN]'))).toBe(true);
      expect(cp.execSync).not.toHaveBeenCalled();
    });

    test('should execute healing commands normally', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('command output');

      const manager = new SelfHealManager();
      
      const result = await manager.executeHealing('task-scorer', { 
        maxRetries: 1, 
        timeout: 30000 
      });

      expect(result.commands).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.healedAt).toBeDefined();
      expect(cp.execSync).toHaveBeenCalled();
    });

    test('should retry on failure with exponential backoff', async () => {
      const cp = await import('child_process');
      let callCount = 0;
      cp.execSync.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Command failed');
        }
        return 'success on third try';
      });

      const manager = new SelfHealManager();
      
      const result = await manager.executeHealing('test-component', { 
        maxRetries: 3, 
        timeout: 30000 
      });

      expect(result.attempts).toBe(3);
      expect(cp.execSync).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const cp = await import('child_process');
      cp.execSync.mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      const manager = new SelfHealManager();
      
      await expect(manager.executeHealing('failing-component', { 
        maxRetries: 2, 
        timeout: 30000 
      })).rejects.toThrow('All 2 healing attempts failed');

      expect(cp.execSync).toHaveBeenCalledTimes(2);
    });

    test('should handle empty command output', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('');

      const manager = new SelfHealManager();
      
      const result = await manager.executeHealing('task-scorer', { 
        maxRetries: 1, 
        timeout: 30000 
      });

      expect(result.results.every(r => r.output === '')).toBe(true);
    });

    test('should handle null command output', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue(null);

      const manager = new SelfHealManager();
      
      const result = await manager.executeHealing('task-scorer', { 
        maxRetries: 1, 
        timeout: 30000 
      });

      expect(result.results.every(r => r.output === '')).toBe(true);
    });
  });

  describe('getHealingCommands', () => {
    let manager;

    beforeEach(() => {
      manager = new SelfHealManager();
    });

    test('should return commands for task-scorer', () => {
      const commands = manager.getHealingCommands('task-scorer');
      expect(commands).toContain('npm test -- --testNamePattern="TaskScorer"');
      expect(commands.length).toBeGreaterThan(0);
    });

    test('should return commands for vector-store', () => {
      const commands = manager.getHealingCommands('vector-store');
      expect(commands.some(cmd => cmd.includes('Vector store'))).toBe(true);
    });

    test('should return commands for hta-core', () => {
      const commands = manager.getHealingCommands('hta-core');
      expect(commands.some(cmd => cmd.includes('HTA'))).toBe(true);
    });

    test('should return commands for memory-sync', () => {
      const commands = manager.getHealingCommands('memory-sync');
      expect(commands.some(cmd => cmd.includes('Memory sync'))).toBe(true);
    });

    test('should return default commands for unknown component', () => {
      const commands = manager.getHealingCommands('unknown-component');
      expect(commands).toContain('node -e "console.log(\'Generic self-healing completed\')"');
    });

    test('should include custom commands when provided', () => {
      const options = {
        customCommands: ['custom command 1', 'custom command 2']
      };
      
      const commands = manager.getHealingCommands('task-scorer', options);
      expect(commands).toContain('custom command 1');
      expect(commands).toContain('custom command 2');
    });

    test('should handle empty custom commands array', () => {
      const options = { customCommands: [] };
      const commands = manager.getHealingCommands('task-scorer', options);
      expect(Array.isArray(commands)).toBe(true);
    });

    test('should handle null/undefined component names', () => {
      expect(manager.getHealingCommands(null)).toContain('node -e "console.log(\'Generic self-healing completed\')"');
      expect(manager.getHealingCommands(undefined)).toContain('node -e "console.log(\'Generic self-healing completed\')"');
    });
  });

  describe('getHealingHistory', () => {
    let manager;

    beforeEach(async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('success');
      
      manager = new SelfHealManager();
      
      // Add some history
      await manager.triggerSelfHealing('component1');
      await manager.triggerSelfHealing('component2');
    });

    test('should return history for specific component', () => {
      const history = manager.getHealingHistory('component1');
      expect(history.length).toBe(1);
      expect(history[0].componentName).toBe('component1');
    });

    test('should return all history when no component specified', () => {
      const history = manager.getHealingHistory();
      expect(history.length).toBe(2);
    });

    test('should return empty array for non-existent component', () => {
      const history = manager.getHealingHistory('non-existent');
      expect(history).toEqual([]);
    });

    test('should include healing ID in history entries', () => {
      const history = manager.getHealingHistory('component1');
      expect(history[0].healingId).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle execSync timeout errors', async () => {
      const timeoutError = new Error('Command timed out');
      timeoutError.cmd = 'npm test';
      execSync.mockImplementation(() => {
        throw timeoutError;
      });

      const manager = new SelfHealManager();
      
      await expect(manager.triggerSelfHealing('timeout-component'))
        .rejects.toThrow('All 3 healing attempts failed');
    });

    test('should handle execSync without cmd property', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('Generic error');
        // No cmd property
        throw error;
      });

      const manager = new SelfHealManager();
      
      await expect(manager.triggerSelfHealing('error-component'))
        .rejects.toThrow('All 3 healing attempts failed');
    });

    test('should cap exponential backoff wait time', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Always fails');
      });

      const manager = new SelfHealManager();
      
      const startTime = Date.now();
      
      try {
        await manager.executeHealing('failing-component', { 
          maxRetries: 3, 
          timeout: 1000 
        });
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should not take more than reasonable time due to capped backoff
      expect(totalTime).toBeLessThan(15000); // 15 seconds max
    }, 20000); // 20 second timeout for the test

    test('should handle concurrent healing of different components', async () => {
      const cp = await import('child_process');
      cp.execSync.mockReturnValue('success');

      const manager = new SelfHealManager();
      
      const promises = [
        manager.triggerSelfHealing('component1'),
        manager.triggerSelfHealing('component2'),
        manager.triggerSelfHealing('component3')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(manager.healingHistory.size).toBe(3);
    });
  });
});