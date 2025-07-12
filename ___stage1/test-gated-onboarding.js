/**
 * Test script to verify the gated onboarding flow works end-to-end
 */

import { Stage1CoreServer } from './core-server.js';

async function testGatedOnboarding() {
  console.log('🧪 Testing Gated Onboarding Flow...\n');
  
  // Initialize server
  const server = new Stage1CoreServer();
  await server.initialize();
  
  console.log('✅ Server initialized\n');
  
  // Test 1: Start Learning Journey
  console.log('📝 Test 1: Starting learning journey...');
  const startResult = await server.toolRouter.handler('start_learning_journey_forest', {
    goal: 'Master portrait photography and grow Instagram to 10k followers',
    user_context: {
      experience: 'beginner',
      time_available: '10 hours/week',
      background: 'hobby photographer with basic DSLR',
      constraints: ['limited budget', 'weekend-only availability']
    }
  });
  
  console.log('Start Result:', JSON.stringify(startResult, null, 2));
  
  if (startResult.success) {
    const projectId = startResult.project_id;
    console.log(`✅ Project created with ID: ${projectId}\n`);
    
    // Test 2: Check onboarding status
    console.log('📊 Test 2: Checking onboarding status...');
    const statusResult = await server.toolRouter.handler('get_onboarding_status_forest', {
      project_id: projectId
    });
    
    console.log('Status Result:', JSON.stringify(statusResult, null, 2));
    
    // Test 3: Continue onboarding - context gathering
    console.log('📝 Test 3: Continuing onboarding - context gathering...');
    const contextResult = await server.toolRouter.handler('continue_onboarding_forest', {
      stage: 'context_gathering',
      project_id: projectId,
      input_data: {
        detailed_background: 'I have a Canon EOS Rebel T7i and want to focus on portrait photography',
        available_time: '2 hours on weekends',
        budget: '$200 for courses and equipment',
        goals: 'Build a portfolio and grow Instagram following',
        constraints: ['No weekday availability', 'Limited studio space']
      }
    });
    
    console.log('Context Result:', JSON.stringify(contextResult, null, 2));
    
    // Test 4: Continue onboarding - questionnaire
    console.log('❓ Test 4: Starting questionnaire...');
    const questionnaireResult = await server.toolRouter.handler('continue_onboarding_forest', {
      stage: 'questionnaire',
      project_id: projectId,
      input_data: {
        action: 'start'
      }
    });
    
    console.log('Questionnaire Result:', JSON.stringify(questionnaireResult, null, 2));
    
    // Test 5: Final status check
    console.log('📊 Test 5: Final status check...');
    const finalStatusResult = await server.toolRouter.handler('get_onboarding_status_forest', {
      project_id: projectId
    });
    
    console.log('Final Status Result:', JSON.stringify(finalStatusResult, null, 2));
    
    console.log('\n🎉 Gated Onboarding Flow Test Complete!');
    
  } else {
    console.log('❌ Failed to start learning journey');
  }
}

// Run the test
testGatedOnboarding().catch(console.error);
