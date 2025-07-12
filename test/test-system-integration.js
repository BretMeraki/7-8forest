import assert from 'assert';
import { addTasksToHTA } from '../___stage1/modules/hta-core.js';

describe('System Integration', function() {
  it('should allow valid and block invalid mutations', function() {
    const hta = { tasks: [] };
    const validTasks = [{ id: 't1', name: 'Valid Task' }];
    const invalidTasks = [null];
    let result = addTasksToHTA(hta, validTasks);
    assert.strictEqual(result.tasks.length, 1);
    result = addTasksToHTA(result, invalidTasks);
    assert.strictEqual(result.tasks.length, 1);
  });
});
