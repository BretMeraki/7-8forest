/**
 * End-to-End Test for Task Generation, Completion and Evolution
 * Tests the complete process from HTA tree to task execution and evolution
 */

import Stage1CoreServer from './core-server.js';

async function testTaskFlow() {
  console.log('🌲 TESTING TASK GENERATION, COMPLETION AND EVOLUTION\n');
  console.log('=' .repeat(60));
  
  let server;
  
  try {
    // Initialize the server
    console.log('\n1. Initializing Forest server...');
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized successfully\n');
    
    // Get the gated onboarding instance
    const gatedOnboarding = server.gatedOnboarding;
    if (!gatedOnboarding) {
      throw new Error('Gated onboarding module not initialized!');
    }
    console.log('✅ Gated onboarding module found\n');
    
    // STAGE 1: Complete Onboarding (Assumes onboarding completed previously)
    console.log('=' .repeat(60));
    console.log('STAGE 1: CHECK ONBOARDING COMPLETION');
    console.log('=' .repeat(60));
    
    // Verify onboarding completion
    const statusResult = await server.getOnboardingStatus({});
    console.log('\nOnboarding Status:', JSON.stringify(statusResult, null, 2));
    if (!statusResult.success || statusResult.onboarding_status.current_stage !== 'completed') {
      throw new Error('Onboarding is not completed! Ensure HTA tree is generated.');
    }
    console.log('✅ Onboarding complete. Proceeding to task generation...\n');

    // STAGE 2: Next Task Generation
    console.log('=' .repeat(60));
    console.log('STAGE 2: TASK GENERATION');
    console.log('=' .repeat(60));

    const nextTaskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
      energy_level: 4,
      time_available: '45 minutes'
    });
    
    if (!nextTaskResult.content || !nextTaskResult.content[0]) {
      throw new Error('Failed to generate next task!');
    }

    console.log('✅ Task generated successfully!');
    console.log('Task:', nextTaskResult.content[0].text.substring(0, 200) + '...');

    // STAGE 3: Task Completion
    console.log('=' .repeat(60));
    console.log('STAGE 3: COMPLETE TASK');
    console.log('=' .repeat(60));
  
    const completeResult = await server.toolRouter.handleToolCall('complete_block_forest', {
      block_id: 'foundation_intro_001', // Example block ID
      learned: 'Basic camera operation and exposure triangle concepts.',
      difficulty: 2,
      breakthrough: false,
      nextQuestions: 'How do I apply exposure triangle in different lighting conditions?'
    });

    if (!completeResult || !completeResult.content || !completeResult.content[0]) {
      throw new Error('Task completion failed!');
    }

    console.log('✅ Task completed successfully!\n');

    // STAGE 4: Verify Evolution
    console.log('=' .repeat(60));
    console.log('STAGE 4: VERIFY EVOLUTION');
    console.log('=' .repeat(60));

    const evolutionResult = await server.toolRouter.handleToolCall('evolve_strategy_forest', {
      feedback: 'Learning faster than expected, need more challenging tasks',
      triggers: { rapid_progress: true }
    });

    if (!evolutionResult || !evolutionResult.content || !evolutionResult.content[0]) {
      throw new Error('Evolution processing failed!');
    }

    console.log('✅ Evolution complete: Strategy evolved successfully based on progress!\n');

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 TASK FLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
    console.log('\n✅ All stages passed:\n  1. Onboarding Completion ✓\n  2. Task Generation ✓\n  3. Task Completion ✓\n  4. Evolution Verification ✓\n');

    return true;

  } catch (error) {
    console.error('\n❌ TASK FLOW TEST FAILED!');
    console.error('=' .repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    return false;

  } finally {
    if (server) {
      await server.cleanup();
    }
  }
}

// Run the test
console.log('🚀 Starting Task Flow Test...\n');

testTaskFlow()
  .then(success => {
    if (success) {
      console.log('✅ Test completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test crashed:', error);
    process.exit(1);
  });
