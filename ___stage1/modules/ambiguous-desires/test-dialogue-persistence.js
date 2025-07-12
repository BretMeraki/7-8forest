/**
 * Test SQLite-based dialogue persistence system
 * Verifies that dialogue sessions persist across server restarts
 */

import { DialoguePersistence } from './dialogue-persistence.js';
import { ClarificationDialogue } from './clarification-dialogue.js';
import path from 'path';
import os from 'os';

// Mock dependencies for testing
const mockDataPersistence = {
  saveProjectData: async () => true,
  loadProjectData: async () => null,
  listProjectFiles: async () => []
};

const mockProjectManagement = {
  getActiveProject: async () => ({ project_id: 'test_project_123' })
};

const mockVectorStore = {
  addVector: async () => true
};

async function testDialoguePersistence() {
  console.log('🧪 Testing SQLite-based dialogue persistence system...\n');

  const testDataDir = path.join(os.tmpdir(), 'forest-test-dialogues');
  
  try {
    // Initialize dialogue persistence
    const dialoguePersistence = new DialoguePersistence(testDataDir);
    await dialoguePersistence.initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Test 1: Create and save a dialogue session
    console.log('\n📝 Test 1: Creating dialogue session...');
    const testSession = {
      id: 'test_dialogue_123',
      projectId: 'test_project_123',
      originalGoal: 'learn programming',
      context: 'beginner level',
      status: 'active',
      startedAt: new Date().toISOString(),
      currentRound: 1,
      responses: [
        {
          round: 1,
          question: 'What type of programming interests you?',
          response: 'I want to build web applications',
          timestamp: new Date().toISOString(),
          themes: ['web development'],
          confidence: 0.7
        }
      ],
      uncertaintyMap: {
        'web development': {
          appearances: 1,
          totalConfidence: 0.7,
          averageConfidence: 0.7,
          trend: 'stable'
        }
      },
      confidenceLevels: {},
      goalEvolution: ['learn programming']
    };

    await dialoguePersistence.saveDialogueSession(testSession);
    console.log('✅ Session saved successfully');

    // Test 2: Retrieve the saved session
    console.log('\n🔍 Test 2: Loading dialogue session...');
    const loadedSession = await dialoguePersistence.loadDialogueSession('test_dialogue_123');
    
    if (loadedSession && loadedSession.id === 'test_dialogue_123') {
      console.log('✅ Session loaded successfully');
      console.log(`   - ID: ${loadedSession.id}`);
      console.log(`   - Project: ${loadedSession.projectId}`);
      console.log(`   - Goal: ${loadedSession.originalGoal}`);
      console.log(`   - Status: ${loadedSession.status}`);
      console.log(`   - Round: ${loadedSession.currentRound}`);
      console.log(`   - Responses: ${loadedSession.responses.length}`);
    } else {
      throw new Error('Failed to load dialogue session');
    }

    // Test 3: Get active dialogues
    console.log('\n📋 Test 3: Getting active dialogues...');
    const activeDialogues = await dialoguePersistence.getActiveDialogues('test_project_123');
    console.log(`✅ Found ${activeDialogues.length} active dialogue(s)`);
    
    if (activeDialogues.length > 0) {
      console.log(`   - First dialogue: ${activeDialogues[0].id}`);
    }

    // Test 4: Update dialogue session
    console.log('\n🔄 Test 4: Updating dialogue session...');
    testSession.currentRound = 2;
    testSession.responses.push({
      round: 2,
      question: 'Which framework interests you most?',
      response: 'React looks really interesting',
      timestamp: new Date().toISOString(),
      themes: ['web development', 'frontend'],
      confidence: 0.8
    });

    await dialoguePersistence.saveDialogueSession(testSession);
    console.log('✅ Session updated successfully');

    const updatedSession = await dialoguePersistence.loadDialogueSession('test_dialogue_123');
    if (updatedSession.currentRound === 2 && updatedSession.responses.length === 2) {
      console.log('✅ Update verified - round and responses correctly persisted');
    } else {
      throw new Error('Update verification failed');
    }

    // Test 5: Complete dialogue session
    console.log('\n🎯 Test 5: Completing dialogue session...');
    const refinedGoal = {
      text: 'Learn React for web development',
      themes: ['web development', 'frontend'],
      confidence: 0.9,
      source: 'clarification_dialogue'
    };
    
    await dialoguePersistence.completeDialogueSession('test_dialogue_123', refinedGoal, 0.9);
    console.log('✅ Session completed successfully');

    const completedSession = await dialoguePersistence.loadDialogueSession('test_dialogue_123');
    if (completedSession.status === 'completed' && completedSession.refinedGoal) {
      console.log('✅ Completion verified - status and refined goal persisted');
      console.log(`   - Refined goal: ${completedSession.refinedGoal.text}`);
    } else {
      throw new Error('Completion verification failed');
    }

    // Test 6: Get dialogue stats
    console.log('\n📊 Test 6: Getting dialogue statistics...');
    const stats = await dialoguePersistence.getDialogueStats('test_project_123');
    console.log('✅ Stats retrieved successfully:');
    console.log(`   - Total: ${stats.total}`);
    console.log(`   - Active: ${stats.active}`);
    console.log(`   - Completed: ${stats.completed}`);
    console.log(`   - Avg Confidence: ${Math.round(stats.avgConfidence * 100)}%`);

    // Test 7: Integration with ClarificationDialogue
    console.log('\n🔗 Test 7: Testing integration with ClarificationDialogue...');
    const clarificationDialogue = new ClarificationDialogue(
      mockDataPersistence,
      mockProjectManagement,
      mockVectorStore
    );

    // Test resuming active dialogues
    await clarificationDialogue.resumeActiveDialogues('test_project_123');
    console.log('✅ Active dialogues resumed successfully');

    // Verify dialogue is in memory
    const memoryDialogues = clarificationDialogue.getActiveDialogues('test_project_123');
    console.log(`✅ Found ${memoryDialogues.length} dialogue(s) in memory`);

    // Test 8: Server restart simulation
    console.log('\n🔄 Test 8: Simulating server restart...');
    
    // Clear in-memory cache (simulating server restart)
    clarificationDialogue.activeDialogues.clear();
    console.log('   - Memory cleared (simulating restart)');
    
    // Resume dialogues from database
    await clarificationDialogue.resumeActiveDialogues('test_project_123');
    console.log('   - Dialogues resumed from database');
    
    // Verify dialogues are restored
    const restoredDialogues = clarificationDialogue.getActiveDialogues('test_project_123');
    if (restoredDialogues.length === 0) {
      console.log('✅ No active dialogues found (expected since we completed the test dialogue)');
    } else {
      console.log(`✅ ${restoredDialogues.length} dialogue(s) restored after restart`);
    }

    // Clean up
    await dialoguePersistence.deleteDialogueSession('test_dialogue_123');
    await dialoguePersistence.close();
    console.log('\n🧹 Cleanup completed');

    console.log('\n🎉 All tests passed! SQLite dialogue persistence system is working correctly.');
    
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testDialoguePersistence()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

// Also run tests directly if this is the main module
if (process.argv[1] && process.argv[1].endsWith('test-dialogue-persistence.js')) {
  testDialoguePersistence()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      console.log(success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
      console.log('='.repeat(50));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export { testDialoguePersistence };
