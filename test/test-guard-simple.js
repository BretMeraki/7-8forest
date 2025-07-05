import assert from 'assert';
import { validateHTAMutation } from '../___stage1/modules/hta-core.js';

describe('Simple Guard Test', function() {
  it('should reject empty mutation', function() {
    const result = validateHTAMutation({});
    assert.strictEqual(result.valid, false);
  });
});
