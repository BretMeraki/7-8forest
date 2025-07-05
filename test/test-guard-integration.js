import assert from 'assert';
import { addTasksToHTA } from '../___stage1/modules/hta-core.js';

describe('HTA Guard Integration', function() {
  it('should not mutate HTA with invalid tasks', function() {
    const hta = { tasks: [] };
    const invalidTasks = [null, undefined, {}];
    const result = addTasksToHTA(hta, invalidTasks);
    assert.deepStrictEqual(result.tasks, []);
  });
});
