/**
 * Debug script to test dialogue persistence
 */

console.log('🔍 Starting debug test...');

try {
  console.log('📦 Importing modules...');
  const { DialoguePersistence } = await import('./dialogue-persistence.js');
  console.log('✅ DialoguePersistence imported successfully');

  console.log('🗄️ Creating DialoguePersistence instance...');
  const persistence = new DialoguePersistence();
  console.log('✅ DialoguePersistence instance created');

  console.log('⚡ Initializing database...');
  await persistence.initializeDatabase();
  console.log('✅ Database initialized');

  console.log('💾 Testing basic save/load...');
  const testSession = {
    id: 'debug_test_123',
    projectId: 'debug_project',
    originalGoal: 'test goal',
    context: 'test context',
    status: 'active',
    startedAt: new Date().toISOString(),
    currentRound: 1,
    responses: [],
    uncertaintyMap: {},
    confidenceLevels: {},
    goalEvolution: ['test goal']
  };

  await persistence.saveDialogueSession(testSession);
  console.log('✅ Session saved');

  const loadedSession = await persistence.loadDialogueSession('debug_test_123');
  console.log('✅ Session loaded:', loadedSession ? 'SUCCESS' : 'FAILED');

  await persistence.deleteDialogueSession('debug_test_123');
  console.log('✅ Session deleted');

  await persistence.close();
  console.log('✅ Database closed');

  console.log('🎉 Debug test completed successfully!');

} catch (error) {
  console.error('❌ Debug test failed:', error);
  console.error('Stack:', error.stack);
}
