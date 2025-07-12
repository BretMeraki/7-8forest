/**
 * Forest Flow Debugging Script
 * Tests the complete flow from project creation through task generation
 */

import { Stage1CoreServer } from './core-server.js';
import { DataPersistence } from './modules/data-persistence.js';
import fs from 'fs/promises';
import path from 'path';

const logger = {
  info: (...args) => console.error('[DEBUG-INFO]', ...args),
  error: (...args) => console.error('[DEBUG-ERROR]', ...args),
  success: (...args) => console.error('[DEBUG-SUCCESS] ✅', ...args),
  warn: (...args) => console.error('[DEBUG-WARN] ⚠️', ...args),
  step: (step) => console.error(`\n${'='.repeat(60)}\n[DEBUG-STEP] ${step}\n${'='.repeat(60)}`)
};

async function testCompleteFlow() {
  logger.info('Starting Forest Flow Debug...');
  
  const server = new Stage1CoreServer();
  
  try {
    // Initialize server
    logger.step('1. INITIALIZING SERVER');
    await server.initialize();
    logger.success('Server initialized');
    
    // Mark landing page as shown to bypass it
    server.hasShownLandingPage = true;

    // Test project creation
    logger.step('2. TESTING PROJECT CREATION');
    const projectName = `debug_project_${Date.now()}`;
    const createResult = await server.toolRouter.handleToolCall('create_project_forest', {
      project_id: projectName,
      goal: 'Learn advanced React development and build production apps',
      context: 'Experienced developer wanting to master React ecosystem',
      life_structure_preferences: {
        wake_time: '7:00 AM',
        sleep_time: '11:00 PM',
        focus_duration: '90 minutes',
        break_preferences: 'Short breaks every 90 minutes'
      }
    });
    logger.info('Project creation result:', createResult);
    
    if (!createResult.success && !createResult.content?.[0]?.text?.includes('Successfully')) {
      throw new Error('Project creation failed');
    }
    logger.success('Project created successfully');

    // Test gated onboarding flow
    logger.step('3. TESTING GATED ONBOARDING');
    
    // Start learning journey
    logger.info('Starting learning journey...');
    const journeyResult = await server.toolRouter.handleToolCall('start_learning_journey_forest', {
      initial_goal: 'Learn advanced React development and build production apps'
    });
    logger.info('Journey start result:', journeyResult);

    // Continue through onboarding stages
    if (journeyResult.projectId) {
      // Stage 2: Context gathering
      logger.info('Gathering context...');
      const contextResult = await server.toolRouter.handleToolCall('continue_onboarding_forest', {
        session_id: journeyResult.projectId,
        stage_data: {
          stage: 'context_gathering',
          context: {
            background: 'Experienced with JavaScript, some React basics',
            constraints: {
              time_constraints: '10 hours per week',
              energy_patterns: 'High energy mornings, low afternoons',
              financial_constraints: 'Can invest in courses and tools'
            },
            existing_credentials: [
              {
                credential_type: 'experience',
                subject_area: 'JavaScript',
                level: 'intermediate',
                relevance_to_goal: 'Foundation for React'
              }
            ]
          }
        }
      });
      logger.info('Context result:', contextResult);

      // Stage 3: Dynamic questionnaire
      logger.info('Starting questionnaire...');
      const questionnaireResult = await server.toolRouter.handleToolCall('continue_onboarding_forest', {
        session_id: journeyResult.projectId,
        stage_data: {
          stage: 'questionnaire',
          responses: {
            'preferred_learning_approach': 'Build real projects',
            'specific_interests': 'State management, performance optimization',
            'success_metrics': 'Build and deploy 3 production apps'
          }
        }
      });
      logger.info('Questionnaire result:', questionnaireResult);
    }

    // Check onboarding status
    logger.info('Checking onboarding status...');
    const statusResult = await server.toolRouter.handleToolCall('get_onboarding_status_forest', {
      session_id: journeyResult.projectId
    });
    logger.info('Onboarding status:', statusResult);

    // Test HTA tree building
    logger.step('4. TESTING HTA TREE BUILDING');
    const htaResult = await server.toolRouter.handleToolCall('build_hta_tree_forest', {
      goal: 'Learn advanced React development and build production apps',
      learning_style: 'hands-on',
      focus_areas: ['hooks', 'state management', 'performance', 'testing']
    });
    logger.info('HTA result:', htaResult);
    
    if (!htaResult.content?.[0]?.text?.includes('successfully')) {
      logger.warn('HTA tree building may have issues');
    } else {
      logger.success('HTA tree built successfully');
    }

    // Test HTA status
    logger.step('5. TESTING HTA STATUS');
    const htaStatus = await server.toolRouter.handleToolCall('get_hta_status_forest', {});
    logger.info('HTA status:', htaStatus);

    // Test Next + Pipeline presentation
    logger.step('6. TESTING NEXT + PIPELINE');
    const pipelineResult = await server.toolRouter.handleToolCall('get_next_pipeline_forest', {
      energy_level: 4,
      time_available: '90 minutes'
    });
    logger.info('Pipeline result:', pipelineResult);

    // Test single task retrieval
    logger.step('7. TESTING SINGLE TASK RETRIEVAL');
    const taskResult = await server.toolRouter.handleToolCall('get_next_task_forest', {
      energy_level: 4,
      time_available: '45 minutes'
    });
    logger.info('Task result:', taskResult);

    // Test task completion
    logger.step('8. TESTING TASK COMPLETION');
    if (taskResult.content && taskResult.content[0]?.text?.includes('task_id')) {
      // Extract task ID from the result
      const taskText = taskResult.content[0].text;
      const taskIdMatch = taskText.match(/task_id[:\s]+(\w+)/);
      if (taskIdMatch) {
        const taskId = taskIdMatch[1];
        const completionResult = await server.toolRouter.handleToolCall('complete_block_forest', {
          block_id: taskId,
          outcome: 'Successfully learned React hooks basics',
          energy_level: 3,
          learned: 'useState and useEffect patterns'
        });
        logger.info('Completion result:', completionResult);
      }
    }

    // Test strategy evolution
    logger.step('9. TESTING STRATEGY EVOLUTION');
    const evolveResult = await server.toolRouter.handleToolCall('evolve_strategy_forest', {
      feedback: 'Learning faster than expected, ready for more advanced topics'
    });
    logger.info('Evolution result:', evolveResult);

    // Test pipeline evolution
    logger.step('10. TESTING PIPELINE EVOLUTION');
    const pipelineEvolveResult = await server.toolRouter.handleToolCall('evolve_pipeline_forest', {
      feedback: 'Current tasks too easy, need more challenge'
    });
    logger.info('Pipeline evolution result:', pipelineEvolveResult);

    // Verify data persistence
    logger.step('11. VERIFYING DATA PERSISTENCE');
    const dataDir = path.join(process.cwd(), '.forest-data', projectName);
    try {
      const files = await fs.readdir(dataDir);
      logger.info('Project files:', files);
      
      // Check key files
      const expectedFiles = ['config.json', 'hta.json', 'progress.json'];
      for (const file of expectedFiles) {
        const filePath = path.join(dataDir, file);
        try {
          await fs.access(filePath);
          logger.success(`${file} exists`);
        } catch {
          logger.warn(`${file} missing`);
        }
      }
    } catch (error) {
      logger.error('Failed to read project directory:', error.message);
    }

    // Test current status
    logger.step('12. TESTING CURRENT STATUS');
    const currentStatus = await server.toolRouter.handleToolCall('current_status_forest', {});
    logger.info('Current status:', currentStatus);

    // Test memory sync
    logger.step('13. TESTING MEMORY SYNC');
    const syncResult = await server.toolRouter.handleToolCall('sync_forest_memory_forest', {});
    logger.info('Memory sync result:', syncResult);

    logger.step('DEBUGGING COMPLETE');
    logger.success('All basic flow tests completed');

    // Summary of findings
    logger.step('SUMMARY OF FINDINGS');
    logger.info('1. Server initialization: ✅');
    logger.info('2. Project creation: ✅');
    logger.info('3. Gated onboarding: Check results above');
    logger.info('4. HTA tree building: Check results above');
    logger.info('5. Task generation: Check results above');
    logger.info('6. Pipeline presentation: Check results above');
    logger.info('7. Task completion: Check results above');
    logger.info('8. Evolution systems: Check results above');
    logger.info('9. Data persistence: Check results above');

  } catch (error) {
    logger.error('Debug flow failed:', error);
    logger.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    if (server.backgroundProcessor) {
      server.backgroundProcessor.stop();
    }
    if (server.htaExpansionAgent) {
      server.htaExpansionAgent.stop();
    }
  }
}

// Run the debug
testCompleteFlow().then(() => {
  logger.info('Debug script completed');
  process.exit(0);
}).catch(error => {
  logger.error('Debug script failed:', error);
  process.exit(1);
});
