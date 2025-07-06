/**
 * Focused test of the onboarding flow to identify exact failure points
 */

import Stage1CoreServer from './core-server.js';

async function testOnboardingFlow() {
  console.log('🧪 Testing Onboarding Flow...\n');
  
  let server;
  
  try {
    // Initialize server
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized\n');
    
    // Step 1: Start learning journey
    console.log('1. Starting learning journey...');
    const startResult = await server.startLearningJourney({
      goal: 'Learn portrait photography and build Instagram following',
      user_context: {
        experience: 'beginner',
        time_available: '10 hours/week',
        equipment: 'basic DSLR'
      }
    });
    
    console.log('Result:', {
      success: startResult.success,
      stage: startResult.onboarding_stage,
      projectId: startResult.project_id
    });
    
    if (!startResult.success) {
      console.log('❌ Start failed:', startResult);
      return;
    }
    
    console.log('✅ Learning journey started successfully\n');
    
    // Step 2: Continue with context gathering
    console.log('2. Continuing with context gathering...');
    const contextResult = await server.continueOnboarding({
      stage: 'context_gathering',
      input_data: {
        background: 'hobby photographer with basic understanding',
        goals: 'build professional portfolio and grow Instagram',
        constraints: 'limited time on weekends',
        equipment: 'Canon DSLR with kit lens',
        budget: 'moderate - can invest in learning resources'
      }
    });
    
    console.log('Context result:', {
      success: contextResult.success,
      gateStatus: contextResult.gate_status,
      nextStage: contextResult.next_stage || contextResult.onboarding_stage
    });
    
    if (!contextResult.success) {
      console.log('❌ Context gathering failed:', contextResult);
      return;
    }
    
    console.log('✅ Context gathering completed\n');
    
    // Step 3: Check status
    console.log('3. Checking onboarding status...');
    const statusResult = await server.getOnboardingStatus({});
    console.log('Status result:', {
      success: statusResult.success,
      currentStage: statusResult.onboarding_status?.current_stage,
      progress: statusResult.onboarding_status?.progress
    });
    
    console.log('✅ Onboarding flow test completed successfully!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (server) {
      await server.cleanup();
    }
  }
}

testOnboardingFlow().catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});
