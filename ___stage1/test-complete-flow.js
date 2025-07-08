/**
 * Complete End-to-End Test: Onboarding + Task Flow
 * Tests the entire journey from onboarding through task evolution
 */

import Stage1CoreServer from './core-server.js';

async function testCompleteFlow() {
  console.log('🌲 TESTING COMPLETE FOREST FLOW: ONBOARDING → TASKS → EVOLUTION\n');
  console.log('=' .repeat(60));
  
  let server;
  
  try {
    // Initialize the server
    console.log('\n1. Initializing Forest server...');
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized successfully\n');
    
    // PART 1: GATED ONBOARDING FLOW
    console.log('=' .repeat(60));
    console.log('PART 1: GATED ONBOARDING FLOW');
    console.log('=' .repeat(60));
    
    // Stage 1: Start Learning Journey
    console.log('\nSTAGE 1: START LEARNING JOURNEY');
    const goalInput = "Learn photography and build an Instagram following";
    
    const startResult = await server.startLearningJourney({
      goal: goalInput,
      user_context: {
        experience: 'beginner',
        available_time: '10 hours per week'
      }
    });
    
    if (!startResult.success || !startResult.project_id) {
      throw new Error(`Failed to start learning journey: ${startResult.error || 'No project ID returned'}`);
    }
    
    const projectId = startResult.project_id;
    console.log(`✅ Goal captured! Project ID: ${projectId}`);
    
    // Stage 2: Context Gathering
    console.log('\nSTAGE 2: CONTEXT GATHERING');
    const contextData = {
      background: 'Hobby photographer with basic camera knowledge',
      constraints: 'Limited time on weekends, small budget',
      motivation: 'Build professional portfolio and grow Instagram presence',
      timeline: '6 months to see significant progress',
      equipment: 'Canon DSLR with kit lens, basic editing software'
    };
    
    const contextResult = await server.continueOnboarding({
      stage: 'context_gathering',
      input_data: contextData
    });
    
    if (!contextResult.success) {
      throw new Error(`Context gathering failed: ${contextResult.error || contextResult.message}`);
    }
    console.log('✅ Context gathered successfully');
    
    // Stage 3: Dynamic Questionnaire
    console.log('\nSTAGE 3: DYNAMIC QUESTIONNAIRE');
    const questionnaireStart = await server.continueOnboarding({
      stage: 'questionnaire',
      input_data: { action: 'start' }
    });
    
    if (!questionnaireStart.success && questionnaireStart.gate_status !== 'in_progress') {
      throw new Error(`Failed to start questionnaire: ${questionnaireStart.error || questionnaireStart.message}`);
    }
    
    const questionnaireResponses = {
      experience_level: 'Beginner with basic camera knowledge',
      timeline: '6 months',
      daily_time: '2-3 hours on weekends',
      motivation: 'Build professional portfolio and grow Instagram presence'
    };
    
    const questionnaireComplete = await server.continueOnboarding({
      stage: 'questionnaire',
      input_data: { responses: questionnaireResponses }
    });
    
    if (!questionnaireComplete.success) {
      throw new Error(`Questionnaire completion failed: ${questionnaireComplete.error || questionnaireComplete.message}`);
    }
    console.log('✅ Questionnaire completed');
    
    // Stage 4: Complexity Analysis
    console.log('\nSTAGE 4: COMPLEXITY ANALYSIS');
    const complexityResult = await server.continueOnboarding({
      stage: 'complexity_analysis'
    });
    
    if (!complexityResult.success) {
      throw new Error(`Complexity analysis failed: ${complexityResult.error || complexityResult.message}`);
    }
    console.log('✅ Complexity analyzed');
    
    // Stage 5: HTA Tree Generation
    console.log('\nSTAGE 5: HTA TREE GENERATION');
    const htaResult = await server.continueOnboarding({
      stage: 'hta_generation'
    });
    
    if (!htaResult.success) {
      throw new Error(`HTA generation failed: ${htaResult.error || htaResult.message}`);
    }
    console.log('✅ HTA tree generated - Onboarding complete!\n');
    
    // PART 2: TASK GENERATION, COMPLETION & EVOLUTION
    console.log('=' .repeat(60));
    console.log('PART 2: TASK FLOW');
    console.log('=' .repeat(60));
    
    // Task Generation
    console.log('\nTASK GENERATION');
    const nextTaskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
      energy_level: 4,
      time_available: '45 minutes'
    });
    
    if (!nextTaskResult.content || !nextTaskResult.content[0]) {
      throw new Error('Failed to generate next task!');
    }
    
    console.log('✅ Task generated successfully!');
    
    // Extract task details from the content
    const taskContent = nextTaskResult.content[0].text;
    console.log('Task Preview:', taskContent.substring(0, 300) + '...\n');
    
    // Extract block ID from task content using regex
    let blockId = 'foundation_intro_001'; // Default
    const blockIdMatch = taskContent.match(/Block ID[:\s]+([^\s\n]+)/);
    if (blockIdMatch) {
      blockId = blockIdMatch[1];
      console.log(`Extracted Block ID: ${blockId}`);
    } else {
      console.log(`Using default Block ID: ${blockId}`);
    }
    
    // Task Completion
    console.log('\nTASK COMPLETION');
    const completeResult = await server.toolRouter.handleToolCall('complete_block_forest', {
      block_id: blockId,
      outcome: 'Successfully learned basic camera operation and exposure triangle',
      energy_level: 4,
      learned: 'ISO affects sensor sensitivity, aperture controls depth of field, shutter speed controls motion blur. They work together to create proper exposure.',
      next_questions: 'How do I apply exposure triangle in different lighting conditions? What are the best settings for portraits?',
      difficulty_rating: 2,
      breakthrough: false
    });
    
    if (!completeResult.content || !completeResult.content[0]) {
      console.error('Complete result:', JSON.stringify(completeResult, null, 2));
      throw new Error('Task completion failed!');
    }
    
    console.log('✅ Task completed successfully!');
    console.log('Completion feedback:', completeResult.content[0].text.substring(0, 200) + '...\n');
    
    // Strategy Evolution
    console.log('STRATEGY EVOLUTION');
    const evolutionResult = await server.toolRouter.handleToolCall('evolve_strategy_forest', {
      feedback: 'Learning well, ready for more advanced techniques. Particularly interested in portrait photography.'
    });
    
    if (!evolutionResult.content || !evolutionResult.content[0]) {
      throw new Error('Evolution processing failed!');
    }
    
    console.log('✅ Strategy evolved successfully!');
    console.log('Evolution result:', evolutionResult.content[0].text.substring(0, 200) + '...\n');
    
    // Get Next Task After Evolution
    console.log('NEXT TASK AFTER EVOLUTION');
    const nextTaskAfterEvolution = await server.toolRouter.handleToolCall('get_next_task_forest', {
      energy_level: 4,
      time_available: '60 minutes'
    });
    
    if (!nextTaskAfterEvolution.content || !nextTaskAfterEvolution.content[0]) {
      throw new Error('Failed to generate next task after evolution!');
    }
    
    console.log('✅ New task generated post-evolution!');
    console.log('New task preview:', nextTaskAfterEvolution.content[0].text.substring(0, 200) + '...\n');
    
    // FINAL SUCCESS
    console.log('=' .repeat(60));
    console.log('🎉 COMPLETE FOREST FLOW TEST SUCCESSFUL!');
    console.log('=' .repeat(60));
    
    console.log('\n✅ All stages passed:');
    console.log('ONBOARDING:');
    console.log('  1. Goal/Dream Capture ✓');
    console.log('  2. Context Gathering ✓');
    console.log('  3. Dynamic Questionnaire ✓');
    console.log('  4. Complexity Analysis ✓');
    console.log('  5. HTA Tree Generation ✓');
    console.log('\nTASK FLOW:');
    console.log('  6. Task Generation ✓');
    console.log('  7. Task Completion ✓');
    console.log('  8. Strategy Evolution ✓');
    console.log('  9. Post-Evolution Task ✓');
    console.log('\n🌳 The complete flow works end-to-end without a hitch!\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ COMPLETE FLOW TEST FAILED!');
    console.error('=' .repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    
    // Try to get more debugging info
    if (server) {
      console.error('\nDEBUGGING INFO:');
      try {
        const activeProject = await server.projectManagement.getActiveProject();
        console.error('Active project:', JSON.stringify(activeProject, null, 2));
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
console.log('🚀 Starting Complete Forest Flow Test...\n');

testCompleteFlow()
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
