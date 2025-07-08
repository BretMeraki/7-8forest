/**
 * End-to-End Test for Gated Onboarding Flow
 * Tests the complete flow from start to finish to identify any breaks
 */

import Stage1CoreServer from './core-server.js';

async function testGatedOnboardingFlow() {
  console.log('🌲 TESTING GATED ONBOARDING FLOW END-TO-END\n');
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
    
    // STAGE 1: Start Learning Journey
    console.log('=' .repeat(60));
    console.log('STAGE 1: START LEARNING JOURNEY');
    console.log('=' .repeat(60));
    
    const goalInput = "Learn photography and build an Instagram following";
    console.log(`Goal: "${goalInput}"`);
    
    const startResult = await server.startLearningJourney({
      goal: goalInput,
      user_context: {
        experience: 'beginner',
        available_time: '10 hours per week'
      }
    });
    
    console.log('\nResult:', JSON.stringify(startResult, null, 2));
    
    if (!startResult.success || !startResult.project_id) {
      throw new Error(`Failed to start learning journey: ${startResult.error || 'No project ID returned'}`);
    }
    
    const projectId = startResult.project_id;
    console.log(`✅ Stage 1 complete! Project ID: ${projectId}\n`);
    
    // STAGE 2: Context Gathering
    console.log('=' .repeat(60));
    console.log('STAGE 2: CONTEXT GATHERING');
    console.log('=' .repeat(60));
    
    const contextData = {
      background: 'Hobby photographer with basic camera knowledge',
      constraints: 'Limited time on weekends, small budget',
      motivation: 'Build professional portfolio and grow Instagram presence',
      timeline: '6 months to see significant progress',
      equipment: 'Canon DSLR with kit lens, basic editing software'
    };
    
    console.log('Context data:', JSON.stringify(contextData, null, 2));
    
    const contextResult = await server.continueOnboarding({
      stage: 'context_gathering',
      input_data: contextData
    });
    
    console.log('\nResult:', JSON.stringify(contextResult, null, 2));
    
    if (!contextResult.success) {
      throw new Error(`Context gathering failed: ${contextResult.error || contextResult.message}`);
    }
    
    console.log('✅ Stage 2 complete! Context gathered successfully\n');
    
    // STAGE 3: Dynamic Questionnaire
    console.log('=' .repeat(60));
    console.log('STAGE 3: DYNAMIC QUESTIONNAIRE');
    console.log('=' .repeat(60));
    
    // Start questionnaire
    console.log('Starting questionnaire...');
    const questionnaireStart = await server.continueOnboarding({
      stage: 'questionnaire',
      input_data: { action: 'start' }
    });
    
    console.log('\nResult:', JSON.stringify(questionnaireStart, null, 2));
    
    if (!questionnaireStart.success && questionnaireStart.gate_status !== 'in_progress') {
      throw new Error(`Failed to start questionnaire: ${questionnaireStart.error || questionnaireStart.message}`);
    }
    
    // Submit questionnaire responses
    console.log('\nSubmitting questionnaire responses...');
    const questionnaireResponses = {
      experience_level: 'Beginner with basic camera knowledge',
      timeline: '6 months',
      daily_time: '2-3 hours on weekends',
      motivation: 'Build professional portfolio and grow Instagram presence',
      learning_style: 'Visual learner, hands-on practice',
      focus_areas: ['Portrait photography', 'Natural lighting', 'Instagram content strategy'],
      preferred_pace: 'Steady progress with weekend practice sessions',
      success_metrics: 'Instagram follower growth, portfolio quality, client inquiries',
      challenges: 'Technical camera settings, post-processing workflow',
      resources: 'Online tutorials, local photography groups'
    };
    
    const questionnaireComplete = await server.continueOnboarding({
      stage: 'questionnaire',
      input_data: { responses: questionnaireResponses }
    });
    
    console.log('\nResult:', JSON.stringify(questionnaireComplete, null, 2));
    
    if (!questionnaireComplete.success) {
      throw new Error(`Questionnaire completion failed: ${questionnaireComplete.error || questionnaireComplete.message}`);
    }
    
    console.log('✅ Stage 3 complete! Questionnaire submitted successfully\n');
    
    // STAGE 4: Complexity Analysis
    console.log('=' .repeat(60));
    console.log('STAGE 4: COMPLEXITY ANALYSIS');
    console.log('=' .repeat(60));
    
    const complexityResult = await server.continueOnboarding({
      stage: 'complexity_analysis'
    });
    
    console.log('\nResult:', JSON.stringify(complexityResult, null, 2));
    
    if (!complexityResult.success) {
      throw new Error(`Complexity analysis failed: ${complexityResult.error || complexityResult.message}`);
    }
    
    console.log('✅ Stage 4 complete! Complexity analyzed successfully\n');
    
    // STAGE 5: HTA Tree Generation
    console.log('=' .repeat(60));
    console.log('STAGE 5: HTA TREE GENERATION');
    console.log('=' .repeat(60));
    
    const htaResult = await server.continueOnboarding({
      stage: 'hta_generation'
    });
    
    console.log('\nResult:', JSON.stringify(htaResult, null, 2));
    
    if (!htaResult.success) {
      throw new Error(`HTA generation failed: ${htaResult.error || htaResult.message}`);
    }
    
    console.log('✅ Stage 5 complete! HTA tree generated successfully\n');
    
    // VERIFY COMPLETION
    console.log('=' .repeat(60));
    console.log('VERIFYING ONBOARDING COMPLETION');
    console.log('=' .repeat(60));
    
    // Check onboarding status
    const statusResult = await server.getOnboardingStatus({});
    console.log('\nOnboarding Status:', JSON.stringify(statusResult, null, 2));
    
    // Try to get next task to verify everything is working
    console.log('\nTrying to get next task...');
    const nextTaskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
      energy_level: 4,
      time_available: '45 minutes'
    });
    
    if (nextTaskResult.content && nextTaskResult.content[0]) {
      console.log('✅ Next task retrieved successfully!');
      console.log('Task preview:', nextTaskResult.content[0].text.substring(0, 200) + '...');
    } else {
      console.log('⚠️  Could not retrieve next task');
    }
    
    // FINAL SUCCESS
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 GATED ONBOARDING FLOW COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
    console.log('\n✅ All stages passed:');
    console.log('  1. Goal/Dream Capture ✓');
    console.log('  2. Context Gathering ✓');
    console.log('  3. Dynamic Questionnaire ✓');
    console.log('  4. Complexity Analysis ✓');
    console.log('  5. HTA Tree Generation ✓');
    console.log('\n🌳 The baton was passed cleanly through every stage!\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ GATED ONBOARDING FLOW FAILED!');
    console.error('=' .repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    
    // Try to get more debugging info
    if (server && server.gatedOnboarding) {
      console.error('\nDEBUGGING INFO:');
      try {
        const activeProject = await server.projectManagement.getActiveProject();
        console.error('Active project:', activeProject);
        
        const projects = await server.projectManagement.listProjects();
        console.error('All projects:', projects);
      } catch (debugError) {
        console.error('Could not get debugging info:', debugError.message);
      }
    }
    
    return false;
    
  } finally {
    if (server) {
      await server.cleanup();
    }
  }
}

// Run the test
console.log('🚀 Starting Gated Onboarding Flow Test...\n');

testGatedOnboardingFlow()
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
