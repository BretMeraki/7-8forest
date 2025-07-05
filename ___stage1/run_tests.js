import { ConsolidationTests } from './consolidation_tests.js';

async function runTests() {
  try {
    const tests = new ConsolidationTests({ verbose: true });
    const results = await tests.runAllTests();
    console.log('Test Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Test execution failed:', error.message);
    console.error(error.stack);
  }
}

runTests();
