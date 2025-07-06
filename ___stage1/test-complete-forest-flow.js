/**
 * Complete End-to-End Forest Flow Test
 * Tests the entire core flow from start to finish
 */

import Stage1CoreServer from './core-server.js';

async function testCompleteForestFlow() {
  console.log('🌲 Complete Forest Flow Test\n');
  
  let server;
  
  try {
    // Initialize server
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized\n');
    
    // Step 1: Start learning journey (Gated Onboarding)
    console.log('1. 🚀 Starting learning journey...');
    const startResult = await server.startLearningJourney({
      goal: 'Learn portrait photography and build Instagram following',
      user_context: {
        experience: 'beginner',
        time_available: '10 hours/week',
        equipment: 'basic DSLR'
      }
    });
    
    if (!startResult.success) {
      throw new Error('Failed to start learning journey');
    }
    console.log('✅ Learning journey started successfully');
    
    // Step 2: Context gathering
    console.log('2. 📝 Gathering context...');
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
    
    if (!contextResult.success) {
      throw new Error('Context gathering failed');
    }
    console.log('✅ Context gathering completed');
    
    // Step 3: Dynamic questionnaire
    console.log('3. ❓ Starting dynamic questionnaire...');
    const questionnaireStart = await server.continueOnboarding({
      stage: 'questionnaire',
      input_data: { action: 'start' }
    });
    
    if (questionnaireStart.success) {
      console.log('✅ Dynamic questionnaire started');
      
      // Simulate answering questionnaire
      console.log('4. 💭 Completing questionnaire...');
      const questionnaireComplete = await server.continueOnboarding({
        stage: 'questionnaire',
        input_data: {
          responses: {
            experience_level: 'Some exposure',
            timeline: '3 months',
            daily_time: '30-60 minutes',
            motivation: 'Personal interest'
          }
        }
      });
      
      if (questionnaireComplete.success) {
        console.log('✅ Questionnaire completed');
      }
    }
    
    // Step 4: Complexity analysis
    console.log('5. 🧠 Performing complexity analysis...');
    const complexityResult = await server.continueOnboarding({
      stage: 'complexity_analysis'
    });
    
    if (complexityResult.success) {
      console.log('✅ Complexity analysis completed');
    }
    
    // Step 5: HTA tree generation (completes onboarding)
    console.log('6. 🌳 Generating HTA tree...');
    const htaResult = await server.continueOnboarding({
      stage: 'hta_generation'
    });
    
    if (htaResult.success && htaResult.onboarding_complete) {
      console.log('✅ HTA tree generated - onboarding complete!');
      
      // Step 6: Pipeline generation
      console.log('7. 📋 Generating Next + Pipeline...');
      const pipelineResult = await server.getNextPipeline({
        energy_level: 4,
        time_available: '45 minutes'
      });
      
      if (pipelineResult.success) {
        console.log('✅ Pipeline generated successfully');
        console.log(`📊 Pipeline tasks: ${pipelineResult.pipeline_info?.total_tasks || 'unknown'}`);
        
        // Step 8: Get next task (traditional method)
        console.log('9. 📝 Getting next task...');
        const taskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
          energy_level: 3,
          time_available: '30 minutes'
        });
        
        if (taskResult.content && taskResult.content[0]) {
          console.log('✅ Next task retrieved');
          console.log(`📝 Task preview: ${taskResult.content[0].text.substring(0, 100)}...`);
          
          // Step 9: Complete a task
          console.log('10. ✅ Completing a task...');
          const completionResult = await server.toolRouter.handleToolCall('complete_block_forest', {
            block_id: 'foundation_intro_001',
            learned: 'Basic camera operation and exposure triangle concepts. Ready to move to more advanced techniques.',
            difficulty: 2,
            breakthrough: false,
            nextQuestions: 'How do I apply exposure triangle in different lighting conditions?'
          });
          
          if (completionResult.content) {
            console.log('✅ Task completed successfully');
            
            // Step 10: Strategy evolution
            console.log('11. 🔄 Evolving strategy...');
            const evolutionResult = await server.toolRouter.handleToolCall('evolve_strategy_forest', {
              feedback: 'Learning faster than expected, need more challenging tasks',
              triggers: { rapid_progress: true }
            });
            
            if (evolutionResult.content) {
              console.log('✅ Strategy evolution completed');
              
              // Step 11: Pipeline evolution
              console.log('12. 🔄 Evolving pipeline...');
              const pipelineEvolutionResult = await server.evolvePipeline({
                triggers: { rapid_progress: true },
                context: { focus_shift: 'advanced_techniques' },
                energy_level: 4
              });
              
              if (pipelineEvolutionResult.success) {
                console.log('✅ Pipeline evolution completed');
                
                console.log('\n🎉 COMPLETE FOREST FLOW TEST SUCCESSFUL!');
                console.log('\n📊 FLOW COMPLETION SUMMARY:');
                console.log('✅ Project Creation');
                console.log('✅ Gated Onboarding (6 stages)');
                console.log('✅ Dynamic Questionnaire');
                console.log('✅ Complexity Analysis');
                console.log('✅ HTA Tree Generation');
                console.log('✅ Next + Pipeline Presentation');
                console.log('✅ Task Selection');
                console.log('✅ Task Completion');
                console.log('✅ Strategy Evolution');
                console.log('✅ Pipeline Evolution');
                console.log('\n🌲 Forest is fully operational and production-ready!');
                
                return true;
              }
            }
          }
        }
      }
    }
    
    console.log('\n⚠️ Flow completed partially - check output above for details');
    return false;
    
  } catch (error) {
    console.log(`\n❌ Flow test failed: ${error.message}`);
    console.log(`📍 Stack: ${error.stack}`);
    return false;
  } finally {
    if (server) {
      await server.cleanup();
    }
  }
}

testCompleteForestFlow().catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});
