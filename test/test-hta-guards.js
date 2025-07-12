import assert from 'assert';
import { validateHTAMutation } from '../___stage1/modules/hta-core.js';

describe('HTA Guard System', function() {
  it('should block invalid HTA mutations', function() {
    const invalidMutation = { type: 'addTask', payload: { task: null } };
    const result = validateHTAMutation(invalidMutation);
    assert.strictEqual(result.valid, false);
  });

  it('should allow valid HTA mutations', function() {
    const validMutation = { type: 'addTask', payload: { task: { id: 't1', name: 'Test Task' } } };
    const result = validateHTAMutation(validMutation);
    assert.strictEqual(result.valid, true);
  });
});
