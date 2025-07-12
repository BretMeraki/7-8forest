/**
 * Comprehensive Forest Flow Debugging Script
 * Tests the entire flow from project creation to task generation
 */

import Stage1CoreServer from './core-server.js';

async function comprehensiveFlowTest() {
  console.log('🌲 Starting Comprehensive Forest Flow Test...\n');
  
  let server;
  
  try {
    // Initialize the server
    console.log('1. Initializing Forest server...');
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized successfully\n');
    
    // Test 1: Landing Page Generation
    console.log('2. Testing Landing Page Generation...');
    try {
      const landingResult = await server.generateLandingPage();
      console.log('✅ Landing page generated successfully');
      console.log('📄 Landing Page Content Preview:', landingResult.content[0].text.substring(0, 200) + '...\n');
    } catch (error) {
      console.log('❌ Landing page generation failed:', error.message);
    }
    
    // Test 2: Project Creation
    console.log('3. Testing Project Creation...');
    try {
      const projectResult = await server.toolRouter.handleToolCall('create_project_forest', {
        name: 'Test Photography Journey',
        goal: 'Learn portrait photography and build Instagram following',
        description: 'Comprehensive photography learning project'
      });
      
      if (projectResult.content && projectResult.content[0]) {
        console.log('✅ Project created successfully');
        console.log('📊 Project Text:', projectResult.content[0].text.substring(0, 200) + '...');
        
        // Test 3: Gated Onboarding Flow
        console.log('\n4. Testing Gated Onboarding Flow...');
        
        // Start learning journey
        const onboardingResult = await server.startLearningJourney({
          goal: 'Learn portrait photography and build Instagram following',
          user_context: {
            experience: 'beginner',
            time_available: '10 hours/week',
            equipment: 'basic DSLR'
          }
        });
        
        if (onboardingResult.success) {
          console.log('✅ Learning journey started successfully');
          console.log('📋 Stage:', onboardingResult.onboarding_stage);
          
          // Continue with context gathering
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
          
          if (contextResult.success) {
            console.log('✅ Context gathering completed');
            
            // Continue with questionnaire
            const questionnaireStart = await server.continueOnboarding({
              stage: 'questionnaire',
              input_data: { action: 'start' }
            });
            
            if (questionnaireStart.success) {
              console.log('✅ Dynamic questionnaire started');
              
              // Simulate questionnaire responses
              const questionnaireComplete = await server.continueOnboarding({
                stage: 'questionnaire',
                input_data: {
                  responses: {
                    learning_style: 'hands-on with guided practice',
                    focus_areas: ['portrait composition', 'natural lighting', 'post-processing'],
                    preferred_pace: 'steady progress with challenging projects',
                    success_metrics: 'portfolio quality, engagement metrics, technical skill'
                  }
                }
              });
              
              if (questionnaireComplete.success) {
                console.log('✅ Questionnaire completed successfully');
                
                // Continue with complexity analysis
                const complexityResult = await server.continueOnboarding({
                  stage: 'complexity_analysis'
                });
                
                if (complexityResult.success) {
                  console.log('✅ Complexity analysis completed');
                  
                  // Generate HTA tree
                  const htaResult = await server.continueOnboarding({
                    stage: 'hta_generation'
                  });
                  
                  if (htaResult.success) {
                    console.log('✅ HTA tree generated successfully');
                    
                    // Build strategic framework
                    const frameworkResult = await server.continueOnboarding({
                      stage: 'strategic_framework'
                    });
                    
                    if (frameworkResult.success && frameworkResult.onboarding_complete) {
                      console.log('✅ Strategic framework built - onboarding complete!');
                      
                      // Test 4: Pipeline Generation
                      console.log('\n5. Testing Next + Pipeline Generation...');
                      
                      const pipelineResult = await server.getNextPipeline({
                        energy_level: 4,
                        time_available: '45 minutes'
                      });
                      
                      if (pipelineResult.success) {
                        console.log('✅ Pipeline generated successfully');
                        console.log('📋 Pipeline tasks:', pipelineResult.pipeline_info.total_tasks);
                        
                        // Test 5: Traditional Task Selection (fallback)
                        console.log('\n6. Testing Traditional Task Selection...');
                        
                        const taskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
                          energy_level: 3,
                          time_available: '30 minutes'
                        });
                        
                        if (taskResult.content && taskResult.content[0]) {
                          console.log('✅ Task selection working');
                          console.log('📝 Task preview:', taskResult.content[0].text.substring(0, 150) + '...');
                          
                          // Test 6: Task Completion Flow
                          console.log('\n7. Testing Task Completion Flow...');
                          
                          // Simulate completing a task
                          const completionResult = await server.toolRouter.handleToolCall('complete_block_forest', {
                            block_id: 'foundation_intro_001',
                            learned: 'Basic camera operation and exposure triangle concepts. Ready to move to more advanced techniques.',
                            difficulty: 2,
                            breakthrough: false,
                            nextQuestions: 'How do I apply exposure triangle in different lighting conditions?'
                          });
                          
                          if (completionResult.content) {
                            console.log('✅ Task completion working');
                            
                            // Test 7: Strategy Evolution
                            console.log('\n8. Testing Strategy Evolution...');
                            
                            const evolutionResult = await server.toolRouter.handleToolCall('evolve_strategy_forest', {
                              feedback: 'Learning faster than expected, need more challenging tasks',
                              triggers: { rapid_progress: true }
                            });
                            
                            if (evolutionResult.content) {
                              console.log('✅ Strategy evolution working');
                              
                              // Test 8: Pipeline Evolution
                              console.log('\n9. Testing Pipeline Evolution...');
                              
                              const pipelineEvolutionResult = await server.evolvePipeline({
                                triggers: { rapid_progress: true },
                                context: { focus_shift: 'advanced_techniques' },
                                energy_level: 4
                              });
                              
                              if (pipelineEvolutionResult.success) {
                                console.log('✅ Pipeline evolution working');
                                
                                console.log('\n🎉 COMPREHENSIVE FLOW TEST COMPLETED SUCCESSFULLY!');
                                console.log('\n📊 FLOW VERIFICATION:');
                                console.log('✅ Project Creation → Working');
                                console.log('✅ Gated Onboarding (6 stages) → Working');
                                console.log('✅ Dynamic Questionnaire → Working');
                                console.log('✅ Complexity Analysis → Working');
                                console.log('✅ HTA Tree Generation → Working');
                                console.log('✅ Strategic Framework → Working');
                                console.log('✅ Next + Pipeline Presentation → Working');
                                console.log('✅ Task Selection → Working');
                                console.log('✅ Task Completion → Working');
                                console.log('✅ Strategy Evolution → Working');
                                console.log('✅ Pipeline Evolution → Working');
                                
                                return true;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (projectError) {
      console.log('❌ Project creation failed:', projectError.message);
    }
    
  } catch (error) {
    console.log('❌ Critical error in flow test:', error.message);
    console.log('🔍 Stack trace:', error.stack);
    return false;
  } finally {
    if (server) {
      await server.cleanup();
    }
  }
  
  console.log('\n❌ FLOW TEST FAILED - Some components need debugging');
  return false;
}

// Enhanced debugging function to identify specific issues
async function debugSpecificComponents() {
  console.log('\n🔧 DEBUGGING SPECIFIC COMPONENTS...\n');
  
  try {
    const server = new Stage1CoreServer();
    await server.initialize();
    
    // Debug 1: Check if all core modules are properly loaded
    console.log('1. Checking core module initialization...');
    const moduleStatus = {
      dataPersistence: !!server.dataPersistence,
      projectManagement: !!server.projectManagement,
      htaCore: !!server.htaCore,
      coreIntelligence: !!server.coreIntelligence,
      taskStrategyCore: !!server.taskStrategyCore,
      gatedOnboarding: !!server.gatedOnboarding,
      pipelinePresenter: !!server.pipelinePresenter,
      ambiguousDesiresManager: !!server.ambiguousDesiresManager
    };
    
    console.log('📊 Module Status:', moduleStatus);
    
    // Debug 2: Check vector store initialization
    console.log('\n2. Checking vector store status...');
    if (server.htaCore && server.htaCore.vectorStore) {
      try {
        await server.htaCore.vectorStore.initialize();
        console.log('✅ Vector store initialized successfully');
      } catch (vectorError) {
        console.log('⚠️ Vector store failed:', vectorError.message);
      }
    } else {
      console.log('❌ Vector store not available');
    }
    
    // Debug 3: Check data persistence functionality
    console.log('\n3. Testing data persistence...');
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      await server.dataPersistence.saveGlobalData('debug_test.json', testData);
      const retrieved = await server.dataPersistence.loadGlobalData('debug_test.json');
      console.log('✅ Data persistence working:', retrieved.test === 'data');
    } catch (persistenceError) {
      console.log('❌ Data persistence failed:', persistenceError.message);
    }
    
    // Debug 4: Check LLM/Intelligence functionality
    console.log('\n4. Testing core intelligence...');
    try {
      const deduction = await server.coreIntelligence.generateLogicalDeductions({
        context: 'Test context',
        prompt: 'Generate a simple test response'
      });
      console.log('✅ Core intelligence working:', !!deduction);
    } catch (intelligenceError) {
      console.log('⚠️ Core intelligence limited:', intelligenceError.message);
    }
    
    await server.cleanup();
    
  } catch (error) {
    console.log('❌ Component debugging failed:', error.message);
  }
}

// Run the comprehensive test
async function runFullDebugSuite() {
  console.log('🚀 FOREST FLOW COMPREHENSIVE DEBUG SUITE\n');
  console.log('=' .repeat(60));
  
  const flowSuccess = await comprehensiveFlowTest();
  
  if (!flowSuccess) {
    await debugSpecificComponents();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 DEBUG SUITE COMPLETED');
  
  if (flowSuccess) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL - FOREST IS PRODUCTION READY!');
  } else {
    console.log('🔧 ISSUES IDENTIFIED - CHECK OUTPUT ABOVE FOR SPECIFIC PROBLEMS');
  }
}

// Execute the debug suite
runFullDebugSuite().catch(error => {
  console.error('❌ Debug suite crashed:', error);
  process.exit(1);
});
