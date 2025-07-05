/**
 * Task Selection Engine - Intelligent task selection and recommendation
 * Handles next task selection, goal-focused batching, and context-aware recommendations
 */

import { WebContext } from './stubs/web-context.js';
import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG, SCORING, THRESHOLDS } from './memory-sync.js';
import { TaskScorer, TaskSelector as TaskLogicSelector, TaskFormatter } from '../../modules/task-logic/index.js';
import { AmbiguousDesiresManager } from './ambiguous-desires/index.js';

export class TaskSelector {
  constructor(dataPersistence, projectManagement = null, llmInterface = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.webContext = new WebContext(dataPersistence, llmInterface);
    this.logger = console;
    this.ambiguousDesiresManager = new AmbiguousDesiresManager(dataPersistence, llmInterface);
  }

  async getNextTask(args, dependencies = {}) {
    const contextFromMemory = args.context_from_memory || args.contextFromMemory || '';
    const energyLevel = args.energy_level || args.energyLevel || 3;
    const timeAvailable = args.time_available || args.timeAvailable || '30 minutes';
    
    const { vectorStore, goalContext, vectorStoreInitialized, goalContextInitialized } = dependencies;

    try {
      if (!this.projectManagement) {
        throw new Error('ProjectManagement not available in TaskSelector');
      }

      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        throw new Error('No active project found. Please create or switch to a project first.');
      }

      const projectId = activeProject.project_id;
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
      
      if (!config) {
        const { ProjectConfigurationError } = await import('../errors.js');
        throw new ProjectConfigurationError(projectId, FILE_NAMES.CONFIG, null, {
          operation: 'getNextTask',
        });
      }

      // Build goal-focused context for intelligent task selection
      let goalAchievementContext = null;
      if (goalContextInitialized) {
        try {
          goalAchievementContext = await goalContext.buildGoalAchievementContext({
            project_id: projectId,
            context_from_memory: contextFromMemory,
            energy_level: energyLevel,
            time_available: timeAvailable,
            ...args
          });
          console.error('[TaskSelector] Generated goal achievement context');
        } catch (error) {
          console.warn('[TaskSelector] Goal context generation failed:', error.message);
        }
      }

      // Check for ambiguous desires before task selection
      if (this.ambiguousDesiresManager) {
        const ambiguousCheck = await this.checkAmbiguousDesires(config, contextFromMemory, projectId);
        if (ambiguousCheck) return ambiguousCheck;
      }

      const activePath = config?.activePath || 'general';

      // Try vector-based HTA loading first, then fallback to traditional
      let htaData = null;
      try {
        if (vectorStoreInitialized) {
          // Check if vector store has the HTA
          if (await vectorStore.htaExists(projectId)) {
            htaData = await vectorStore.retrieveHTATree(projectId);
            console.error(`[TaskSelector] Retrieved HTA from vector store for project ${projectId}`);
          }
          
          // If vector store available and goal context exists, use goal-focused task batch selection
          if (htaData && goalAchievementContext) {
            const goalFocusedTaskBatch = await this.selectGoalFocusedTaskBatch(
              projectId, 
              htaData, 
              goalAchievementContext, 
              config,
              vectorStore
            );
            
            if (goalFocusedTaskBatch && goalFocusedTaskBatch.tasks?.length > 0) {
              return goalFocusedTaskBatch;
            }
          }
        }
      } catch (vectorError) {
        console.error('[TaskSelector] Vector store retrieval failed:', vectorError.message);
      }
      
      // Fallback to traditional storage if vector store fails
      if (!htaData) {
        htaData = await this.loadPathHTA(projectId, activePath);
        if (htaData) {
          console.error(`[TaskSelector] Retrieved HTA from traditional storage for project ${projectId}`);
        }
      }

      if (!htaData || !htaData.frontierNodes || htaData.frontierNodes.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '**No Tasks Available** 🌱\n\nUse `build_hta_tree_forest` to create your strategic learning framework first.',
            },
          ],
        };
      }

      // Apply intelligent task filtering and scoring
      const availableTasks = htaData.frontierNodes.filter(task => !task.completed);
      
      if (availableTasks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '**All Tasks Completed!** 🎉\n\nCongratulations! You\'ve completed all available tasks. Use `evolve_strategy_forest` to expand your learning journey.',
            },
          ],
        };
      }

      // Score and select the best task
      const selectedTask = await this.selectBestTask(availableTasks, {
        energyLevel,
        timeAvailable,
        contextFromMemory,
        goalAchievementContext,
        config
      });

      return this.formatTaskResponse(selectedTask, availableTasks.length);

    } catch (error) {
      console.error('TaskSelector.getNextTask failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `**Task Selection Failed**\n\nError: ${error.message}\n\nPlease check your project configuration and try again.`,
          },
        ],
        error: error.message,
      };
    }
  }

  async checkAmbiguousDesires(config, contextFromMemory, projectId) {
    const goal = config.goal;
    const context = contextFromMemory || config.context || '';
    
    // Lightweight check for uncertainty and pivots
    const goalClarity = await this.ambiguousDesiresManager.assessGoalClarity(goal, context);
    const evolution = await this.ambiguousDesiresManager.analyzeGoalEvolution(projectId);
    
    // If high uncertainty or recent pivots, suggest clarification or evolution
    if (goalClarity.uncertaintyLevel > 0.7) {
      return {
        content: [
          {
            type: 'suggestion',
            text: "Your recent feedback suggests your goals may be unclear. Would you like to start a clarification dialogue to refine your learning path?",
            action: 'start_clarification_dialogue_forest',
            details: goalClarity.summary,
            recommendation: goalClarity.recommendation
          }
        ],
        proactive: true
      };
    }
    
    if (evolution.pivotAnalysis?.recentPivots?.length > 0) {
      return {
        content: [
          {
            type: 'suggestion',
            text: "I've noticed you're exploring several new topics. To help focus your efforts, I recommend we evolve your strategy. Shall I proceed?",
            action: 'evolve_strategy_forest',
            details: evolution.pivotAnalysis,
            recommendation: evolution.recommendations?.[0] || ''
          }
        ],
        proactive: true
      };
    }

    return null;
  }

  async selectGoalFocusedTaskBatch(projectId, htaData, goalAchievementContext, config, vectorStore) {
    try {
      // Use vector store for similarity-based task selection
      const contextQuery = goalAchievementContext.narrative || config.goal;
      const similarTasks = await vectorStore.findSimilarTasks(contextQuery, 5);
      
      if (similarTasks && similarTasks.length > 0) {
        const availableTasks = htaData.frontierNodes.filter(task => !task.completed);
        const goalFocusedTasks = availableTasks.filter(task => 
          similarTasks.some(similar => similar.id === task.id)
        );

        if (goalFocusedTasks.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `**Goal-Focused Tasks** 🎯\n\nBased on your current goal context, here are the most relevant tasks:`,
              },
            ],
            tasks: goalFocusedTasks.slice(0, 3), // Top 3 most relevant
            goal_focused: true,
            context_used: goalAchievementContext.narrative
          };
        }
      }
    } catch (error) {
      console.warn('[TaskSelector] Goal-focused task selection failed:', error.message);
    }
    
    return null;
  }

  async selectBestTask(availableTasks, criteria) {
    const { energyLevel, timeAvailable, contextFromMemory, goalAchievementContext, config } = criteria;
    
    // Simple scoring algorithm - can be enhanced
    let bestTask = availableTasks[0];
    let bestScore = 0;

    for (const task of availableTasks) {
      let score = 0;
      
      // Energy level matching
      const taskDifficulty = task.difficulty || 3;
      if (Math.abs(taskDifficulty - energyLevel) <= 1) {
        score += 30;
      }
      
      // Time availability matching
      const estimatedDuration = this.parseTimeToMinutes(task.estimated_duration || '30 minutes');
      const availableMinutes = this.parseTimeToMinutes(timeAvailable);
      if (estimatedDuration <= availableMinutes) {
        score += 25;
      }
      
      // Priority scoring
      if (task.priority === 'high') score += 20;
      else if (task.priority === 'medium') score += 10;
      
      // Context relevance (simple keyword matching)
      if (contextFromMemory && task.description) {
        const contextWords = contextFromMemory.toLowerCase().split(/\s+/);
        const taskWords = task.description.toLowerCase().split(/\s+/);
        const matches = contextWords.filter(word => taskWords.includes(word));
        score += matches.length * 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestTask;
  }

  parseTimeToMinutes(timeString) {
    const match = timeString.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    if (!match) return 30; // Default 30 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return value * 60;
    }
    return value;
  }

  formatTaskResponse(task, totalAvailable) {
    return {
      content: [
        {
          type: 'text',
          text: `**Next Task** 🎯\n\n**${task.title}**\n\n${task.description}\n\n**Difficulty**: ${task.difficulty || 3}/5\n**Estimated Time**: ${task.estimated_duration || '30 minutes'}\n**Priority**: ${task.priority || 'medium'}\n\n**Progress**: ${totalAvailable} tasks remaining`,
        },
      ],
      task,
      remaining_tasks: totalAvailable,
    };
  }

  async loadPathHTA(projectId, pathName) {
    try {
      return await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);
    } catch (error) {
      console.warn(`[TaskSelector] Could not load HTA for path ${pathName}:`, error.message);
      return null;
    }
  }

  async handleBlockCompletion(data) {
    // Task-specific block completion logic
    console.log('[TaskSelector] Processing block completion:', data.blockId);
    
    // Update task status, learning patterns, etc.
    // This would contain task-focused completion logic
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      taskUpdated: true
    };
  }
}
