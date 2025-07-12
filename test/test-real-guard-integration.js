import assert from 'assert';
import { addTasksToHTA } from '../___stage1/modules/hta-core.js';

describe('Real Guard Integration', function() {
  it('should block and rollback on invalid mutation', function() {
    const hta = { tasks: [{ id: 't1', name: 'Valid Task' }] };
    const invalidTasks = [{ id: null }];
    const result = addTasksToHTA(hta, invalidTasks);
    assert.deepStrictEqual(result.tasks, [{ id: 't1', name: 'Valid Task' }]);
  });
});
