/**
 * Extended Context Guard Tests
 * Comprehensive tests to achieve 100% coverage of context-guard.js
 */

import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { jest } from '@jest/globals';
import { ContextGuard } from '../context-guard.js';

describe('ContextGuard Extended Coverage', () => {
  const tmpMemoryFile = path.join(process.cwd(), 'memory.test.extended.json');

  beforeEach(() => {
    if (fs.existsSync(tmpMemoryFile)) fs.unlinkSync(tmpMemoryFile);
  });

  afterAll(() => {
    if (fs.existsSync(tmpMemoryFile)) fs.unlinkSync(tmpMemoryFile);
  });

  describe('Constructor and Initialization', () => {
    test('should create ContextGuard with default options', () => {
      const guard = new ContextGuard();
      expect(guard).toBeInstanceOf(EventEmitter);
      expect(guard.memoryFile).toBe('memory.json');
    });

    test('should create ContextGuard with custom options', () => {
      const options = {
        memoryFilePath: tmpMemoryFile,
        logger: console,
        maxRetries: 5
      };
      
      const guard = new ContextGuard(options);
      expect(guard.memoryFilePath).toBe(tmpMemoryFile);
      expect(guard.maxRetries).toBe(5);
    });

    test('should handle missing logger option', () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      expect(guard.logger).toBeDefined();
    });
  });

  describe('loadMemoryFile', () => {
    test('should load existing memory file', async () => {
      const testData = {
        componentStatus: {
          test: { health: 'good', timestamp: Date.now() }
        }
      };
      fs.writeFileSync(tmpMemoryFile, JSON.stringify(testData));

      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      await guard.loadMemoryFile();

      expect(guard.componentStatus.get('test')).toEqual(testData.componentStatus.test);
    });

    test('should handle non-existent memory file', async () => {
      const guard = new ContextGuard({ memoryFilePath: 'non-existent.json' });
      await guard.loadMemoryFile();

      expect(guard.componentStatus.size).toBe(0);
    });

    test('should handle corrupted JSON file', async () => {
      fs.writeFileSync(tmpMemoryFile, 'invalid json {');

      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      await guard.loadMemoryFile();

      expect(guard.componentStatus.size).toBe(0);
    });

    test('should handle file with invalid structure', async () => {
      fs.writeFileSync(tmpMemoryFile, JSON.stringify({ invalid: 'structure' }));

      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      await guard.loadMemoryFile();

      expect(guard.componentStatus.size).toBe(0);
    });
  });

  describe('saveMemoryFile', () => {
    test('should save memory file successfully', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      guard.componentStatus.set('test', { health: 'good', timestamp: Date.now() });

      await guard.saveMemoryFile();

      expect(fs.existsSync(tmpMemoryFile)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(tmpMemoryFile, 'utf8'));
      expect(saved.componentStatus.test).toBeDefined();
    });

    test('should handle save errors gracefully', async () => {
      const guard = new ContextGuard({ memoryFilePath: '/invalid/path/file.json' });
      guard.componentStatus.set('test', { health: 'good' });

      // Should not throw
      await expect(guard.saveMemoryFile()).resolves.not.toThrow();
    });
  });

  describe('validateComponentHealth - Input Validation', () => {
    test('should throw error for invalid component name', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });

      await expect(guard.validateComponentHealth(null, { health: 'good' }))
        .rejects.toThrow('Component name is required and must be a string');
      await expect(guard.validateComponentHealth('', { health: 'good' }))
        .rejects.toThrow('Component name is required and must be a string');
      await expect(guard.validateComponentHealth(123, { health: 'good' }))
        .rejects.toThrow('Component name is required and must be a string');
    });

    test('should handle string status input', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      const result = await guard.validateComponentHealth('test', 'healthy');

      expect(typeof result).toBe('boolean');
    });

    test('should handle invalid status with warning', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await guard.validateComponentHealth('test', null);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ContextGuard] Invalid status provided, using default'
      );
      expect(typeof result).toBe('boolean');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('validateComponentHealth - Contradiction Detection', () => {
    test('should detect and emit contradictions', (done) => {
      const testData = {
        componentStatus: {
          demo: { health: 'fail', timestamp: Date.now() }
        }
      };
      fs.writeFileSync(tmpMemoryFile, JSON.stringify(testData));

      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      
      guard.on('context_contradiction', (payload) => {
        expect(payload.componentName).toBe('demo');
        expect(payload.contradiction).toBeDefined();
        expect(payload.storedStatus).toBeDefined();
        expect(payload.providedStatus).toBeDefined();
        expect(payload.timestamp).toBeDefined();
        done();
      });

      guard.loadMemoryFile().then(async () => {
        const result = await guard.validateComponentHealth('demo', 'healthy');
        expect(result).toBe(false);
      });
    });

    test('should handle no stored status', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      const result = await guard.validateComponentHealth('new-component', 'healthy');

      expect(result).toBe(true);
    });

    test('should handle no contradiction', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      guard.componentStatus.set('test', { health: 'good', timestamp: Date.now() });

      const result = await guard.validateComponentHealth('test', 'good');
      expect(result).toBe(true);
    });
  });

  describe('detectContradiction', () => {
    let guard;

    beforeEach(() => {
      guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });
    });

    test('should detect health status contradictions', () => {
      const storedStatus = { health: 'fail', timestamp: Date.now() };
      const providedStatus = { health: 'healthy', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should detect status field contradictions', () => {
      const storedStatus = { status: 'fail', timestamp: Date.now() };
      const providedStatus = { status: 'pass', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should detect state contradictions', () => {
      const storedStatus = { state: 'running', timestamp: Date.now() };
      const providedStatus = { state: 'stopped', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should detect performance contradictions', () => {
      const storedStatus = { performance: 'slow', timestamp: Date.now() };
      const providedStatus = { performance: 'fast', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should detect timestamp contradictions (time travel)', () => {
      const futureTime = Date.now() + 3600000; // 1 hour in future
      const storedStatus = { timestamp: futureTime };
      const providedStatus = { timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should handle rapid status changes', () => {
      const recentTime = Date.now() - 100; // 100ms ago
      const storedStatus = { health: 'good', timestamp: recentTime };
      const providedStatus = { health: 'fail', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
      expect(contradiction.length).toBeGreaterThan(0);
    });

    test('should return null for no contradictions', () => {
      const storedStatus = { health: 'good', timestamp: Date.now() - 1000 };
      const providedStatus = { health: 'good', timestamp: Date.now() };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeNull();
    });

    test('should handle missing timestamps', () => {
      const storedStatus = { health: 'good' };
      const providedStatus = { health: 'fail' };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeDefined();
    });

    test('should handle undefined values', () => {
      const storedStatus = { health: undefined };
      const providedStatus = { health: 'good' };

      const contradiction = guard.detectContradiction(storedStatus, providedStatus);
      expect(contradiction).toBeNull();
    });
  });

  describe('Error Handling and Robustness', () => {
    test('should handle validation errors gracefully', async () => {
      const guard = new ContextGuard({ memoryFilePath: '/invalid/path' });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error by making saveMemoryFile fail
      const result = await guard.validateComponentHealth('test', 'healthy');

      expect(result).toBe(true); // Should fail-open
      consoleErrorSpy.mockRestore();
    });

    test('should handle memory file read errors', async () => {
      // Create a file that will cause read error (directory instead of file)
      const dirPath = path.join(process.cwd(), 'test-dir');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }

      const guard = new ContextGuard({ memoryFilePath: dirPath });
      
      // Should handle the error gracefully and not throw
      await expect(guard.loadMemoryFile()).rejects.toThrow();

      // Clean up
      fs.rmSync(dirPath, { recursive: true });
    });

    test('should handle concurrent access gracefully', async () => {
      const guard1 = new ContextGuard({ memoryFilePath: tmpMemoryFile });
      const guard2 = new ContextGuard({ memoryFilePath: tmpMemoryFile });

      // Simulate concurrent operations
      const promises = [
        guard1.validateComponentHealth('test1', 'good'),
        guard2.validateComponentHealth('test2', 'good'),
        guard1.validateComponentHealth('test3', 'fail'),
        guard2.validateComponentHealth('test4', 'pass')
      ];

      const results = await Promise.all(promises);
      expect(results.every(result => typeof result === 'boolean')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should handle large component status maps', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });

      // Add many components
      for (let i = 0; i < 1000; i++) {
        guard.componentStatus.set(`component_${i}`, {
          health: i % 2 === 0 ? 'good' : 'fail',
          timestamp: Date.now()
        });
      }

      const result = await guard.validateComponentHealth('new_component', 'good');
      expect(result).toBe(true);
      expect(guard.componentStatus.size).toBe(1001);
    });

    test('should preserve component status across validations', async () => {
      const guard = new ContextGuard({ memoryFilePath: tmpMemoryFile });

      await guard.validateComponentHealth('persistent', 'good');
      const firstSize = guard.componentStatus.size;

      await guard.validateComponentHealth('another', 'good');
      expect(guard.componentStatus.size).toBe(firstSize + 1);
      expect(guard.componentStatus.has('persistent')).toBe(true);
    });
  });
});