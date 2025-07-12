/**
 * Simple test to diagnose the issue
 */

console.log('Starting simple test...');

try {
  console.log('About to import modules...');
  const { testDialoguePersistence } = await import('./test-dialogue-persistence.js');
  console.log('Modules imported successfully');
  
  console.log('About to run test...');
  const result = await testDialoguePersistence();
  console.log('Test completed with result:', result);
  
} catch (error) {
  console.error('Error in simple test:', error);
  console.error('Stack:', error.stack);
}
