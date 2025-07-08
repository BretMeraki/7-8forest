/**
 * Task Generator Evolution - Handles task generation and strategy evolution
 * Manages follow-up tasks, breakthrough handling, and evolution strategies
 */

import { FILE_NAMES, DEFAULT_PATHS, TASK_STRATEGY_CONSTANTS } from './memory-sync.js';
import { guard } from '../utils/hta-guard.js';

export class TaskGeneratorEvolution {
  constructor(dataPersistence, projectManagement = null, llmInterface = null, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.llmInterface = llmInterface;
    this.eventBus = eventBus;
    
    // Apply HTA guards for validation
    this.addTasksToHTA = guard('addTasksToHTA', this.addTasksToHTA.bind(this));
  }

  // ===== STRATEGY EVOLUTION FUNCTIONALITY =====

  async evolveStrategy(args) {
    // Handle both object format (from MCP) and individual parameters
    const feedback = args.feedback || args || '';
    const projectId = args.project_id || args.projectId || null;
    const pathName = args.path_name || args.pathName || null;
    try {
      let activeProjectId = projectId;
      if (!activeProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (!activeProject || !activeProject.project_id) {
          throw new Error('No active project found. Please create or switch to a project first.');
        }
        activeProjectId = activeProject.project_id;
      }
      const config = await this.dataPersistence.loadProjectData(activeProjectId, FILE_NAMES.CONFIG);
      const activePath = config?.activePath || pathName || 'general';

      console.error(`🧬 Evolving strategy for project ${activeProjectId}, path: ${activePath}`);

      // Load current HTA data
      let htaData = await this.loadPathHTA(activeProjectId, activePath);
      
      // If path-specific data doesn't exist, try loading from project level
      if (!htaData && activePath !== 'general') {
        htaData = await this.dataPersistence.loadPathData(activeProjectId, 'general', FILE_NAMES.HTA);
      }
      
      // Consider empty or structurally invalid HTA as missing
      if (!htaData || Object.keys(htaData).length === 0 ||
          !Array.isArray(htaData.frontierNodes) || htaData.frontierNodes.length === 0) {
        throw new Error('No HTA data found to evolve');
      }

      // Analyze feedback and current progress
      const evolutionContext = this.analyzeEvolutionNeeds(feedback, htaData);

      // Generate new tasks based on evolution context
      const newTasks = await this.generateEvolutionTasks(
        activeProjectId,
        activePath,
        evolutionContext,
        config
      );

      if (newTasks && newTasks.length > 0) {
        await this.addTasksToHTA(activeProjectId, activePath, newTasks);
        console.error(`✅ Strategy evolved: Added ${newTasks.length} new tasks`);

        return {
          success: true,
          content: [
            {
              type: 'text',
              text: `**Strategy Evolution Complete**\n\n🧬 **Analysis**: ${evolutionContext.summary}\n\n📋 **New Tasks Added**: ${newTasks.length}\n\n🎯 **Focus**: ${evolutionContext.focus}\n\nUse \`get_next_task\` to continue with your evolved strategy!`,
            },
          ],
          tasks_added: newTasks.length,
          evolution_context: evolutionContext,
        };
      } else {
        return {
          success: true,
          content: [
            {
              type: 'text',
              text: `**Strategy Analysis Complete**\n\n🧬 **Analysis**: ${evolutionContext.summary}\n\n📋 **Current tasks are well-aligned with your progress. Continue with \`get_next_task\`!**`,
            },
          ],
          tasks_added: 0,
          evolution_context: evolutionContext,
        };
      }
    } catch (error) {
      console.error('TaskGeneratorEvolution.evolveStrategy failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Strategy Evolution Failed**\n\nError: ${error.message}\n\nPlease try again or check your project configuration.`,
          },
        ],
        error: error.message,
      };
    }
  }

  // ===== CORE EVOLUTION METHODS =====

  async evolveHTABasedOnLearning(projectId, pathName, block) {
    try {
      const htaData = await this.loadPathHTA(projectId, pathName);
      if (!htaData) {
        console.warn('No HTA data found for evolution');
        return;
      }

      // Analyze learning content for evolution opportunities
      const learningAnalysis = this.analyzeLearningContent(block);

      if (learningAnalysis.shouldEvolve) {
        const newTasks = await this.generateFollowUpTasks(
          projectId,
          pathName,
          block.learned,
          learningAnalysis.evolutionType
        );

        if (newTasks && newTasks.length > 0) {
          await this.addTasksToHTA(projectId, pathName, newTasks);
          console.error(`✅ HTA evolved: Added ${newTasks.length} tasks based on learning`);
        }
      }
    } catch (error) {
      console.error('Failed to evolve HTA based on learning:', error.message);
    }
  }

  analyzeLearningContent(block) {
    const learned = block.learned || '';
    const questions = block.nextQuestions || '';
    const breakthrough = block.breakthrough || false;

    let evolutionType = 'standard';
    let shouldEvolve = false;

    if (breakthrough) {
      evolutionType = 'breakthrough';
      shouldEvolve = true;
    } else if (questions.length > TASK_STRATEGY_CONSTANTS.STAGNATION_THRESHOLD) {
      // Substantial questions indicate deep engagement
      evolutionType = 'deep_dive';
      shouldEvolve = true;
    } else {
      // Detect progressive accumulation by length or additive markers
      const additiveSignals = learned.includes('→') || learned.includes('+');
      if (learned.length >= TASK_STRATEGY_CONSTANTS.EFFICIENCY_THRESHOLD || learned.length >= 100 || additiveSignals) {
        evolutionType = 'progressive';
        shouldEvolve = true;
      }
    }

    return {
      shouldEvolve,
      evolutionType,
      learningDepth: learned.length,
      questionDepth: questions.length,
      hasBreakthrough: breakthrough,
    };
  }

  analyzeEvolutionNeeds(feedback, htaData) {
    // Preserve the original feedback for context, but also generate a normalized string
    const feedbackOriginal = typeof feedback === 'string' ? feedback : JSON.stringify(feedback ?? '');
    const feedbackStr = typeof feedback === 'string' ? feedback : String(feedback ?? '');
    const feedbackLower = feedbackStr.toLowerCase();
    let focus = 'general';
    let summary = 'Analyzing current progress and identifying growth opportunities';

    if (feedbackLower.includes('breakthrough') || feedbackLower.includes('major insight')) {
      focus = 'breakthrough_expansion';
      summary = 'Breakthrough detected - expanding learning path to capitalize on new insights';
    } else if (feedbackLower.includes('stuck') || feedbackLower.includes('difficult')) {
      focus = 'difficulty_support';
      summary = 'Challenges identified - generating supportive tasks and alternative approaches';
    } else if (feedbackLower.includes('fast') || feedbackLower.includes('easy')) {
      focus = 'acceleration';
      summary = 'Rapid progress detected - escalating complexity and introducing advanced concepts';
    } else if (feedbackLower.includes('interest') || feedbackLower.includes('curious')) {
      focus = 'interest_expansion';
      summary = 'New interests identified - expanding scope to explore related areas';
    }

    // Only consider tasks that explicitly have a completion state so that newly generated
    // tasks that have not yet been started do not skew the statistics.
    const tasksWithStatus = htaData?.frontierNodes?.filter(task => task.completed !== undefined) || [];
    const completedTasks = tasksWithStatus.filter(task => task.completed) || [];
    const completionRate = tasksWithStatus.length > 0 ? completedTasks.length / tasksWithStatus.length : 0;

    if (completionRate > TASK_STRATEGY_CONSTANTS.DIFFICULTY_ADJUSTMENT_FACTOR) {
      focus = 'advanced_progression';
      summary = 'High completion rate - generating advanced tasks for continued growth';
    }

    return {
      focus,
      summary,
      completionRate,
      feedback: feedbackOriginal,
      needsNewTasks:
        completionRate > TASK_STRATEGY_CONSTANTS.STRATEGY_IMPROVEMENT_FACTOR || focus !== 'general',
    };
  }

  async generateEvolutionTasks(projectId, pathName, evolutionContext, config) {
    const tasks = [];
    const { focus, completionRate } = evolutionContext;

    // Generate tasks based on evolution focus
    switch (focus) {
      case 'breakthrough_expansion':
        tasks.push(...this.generateBreakthroughTasks(config, pathName));
        break;
      case 'difficulty_support':
        tasks.push(...this.generateSupportTasks(config, pathName));
        break;
      case 'acceleration':
        tasks.push(...this.generateAdvancedTasks(config, pathName));
        break;
      case 'interest_expansion':
        tasks.push(...this.generateExplorationTasks(config, pathName));
        break;
      case 'advanced_progression':
        tasks.push(...this.generateProgressionTasks(config, pathName));
        break;
      default:
        if (completionRate > TASK_STRATEGY_CONSTANTS.STRATEGY_IMPROVEMENT_FACTOR) {
          tasks.push(...this.generateStandardEvolutionTasks(config, pathName));
        }
    }

    return tasks;
  }

  async generateFollowUpTasks(projectId, pathName, content, type) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    if (!config) return [];

    const tasks = [];
    const baseId = Date.now();

    switch (type) {
      case 'breakthrough':
        tasks.push({
          id: `breakthrough_${baseId}`,
          title: `Capitalize on Recent Breakthrough`,
          description: `Build upon your recent breakthrough: ${content.substring(0, 100)}...`,
          difficulty: 4,
          duration: '45 minutes',
          branch: 'Breakthrough Expansion',
          priority: 50, // High priority
          prerequisites: [],
          learningOutcome: 'Maximize breakthrough potential',
          generated: true,
          evolutionGenerated: true,
          blueprintSource: 'generateFollowUpTasks',
        });
        break;
      case 'opportunity':
        tasks.push({
          id: `opportunity_${baseId}`,
          title: `Explore New Opportunity`,
          description: `Investigate opportunity: ${content.substring(0, 100)}...`,
          difficulty: 3,
          duration: '30 minutes',
          branch: 'Opportunity Exploration',
          priority: 75,
          prerequisites: [],
          learningOutcome: 'Opportunity assessment and planning',
          generated: true,
          evolutionGenerated: true,
          blueprintSource: 'generateFollowUpTasks',
        });
        break;
      default:
        tasks.push({
          id: `followup_${baseId}`,
          title: `Follow Up on Learning`,
          description: `Continue exploring: ${content.substring(0, 100)}...`,
          difficulty: 2,
          duration: '25 minutes',
          branch: 'Learning Continuation',
          priority: 100,
          prerequisites: [],
          learningOutcome: 'Deepen understanding',
          generated: true,
          evolutionGenerated: true,
          blueprintSource: 'generateFollowUpTasks',
        });
    }

    return tasks;
  }

  generateBreakthroughTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `breakthrough_advanced_${baseId}`,
        title: `Advanced ${config.goal} Concepts`,
        description: `Explore advanced concepts building on your breakthrough insights`,
        difficulty: 5,
        duration: '60 minutes',
        branch: 'Advanced Mastery',
        priority: 25,
        prerequisites: [],
        learningOutcome: 'Master advanced concepts',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  generateSupportTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `support_${baseId}`,
        title: `Alternative Approach to ${config.goal}`,
        description: `Try a different approach to overcome current challenges`,
        difficulty: 2,
        duration: '30 minutes',
        branch: 'Alternative Methods',
        priority: 60,
        prerequisites: [],
        learningOutcome: 'Find effective learning strategies',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  generateAdvancedTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `advanced_${baseId}`,
        title: `Accelerated ${config.goal} Challenge`,
        description: `Take on an advanced challenge to match your rapid progress`,
        difficulty: 4,
        duration: '45 minutes',
        branch: 'Accelerated Learning',
        priority: 40,
        prerequisites: [],
        learningOutcome: 'Push learning boundaries',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  generateExplorationTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `explore_${baseId}`,
        title: `Explore Related Areas of ${config.goal}`,
        description: `Investigate interesting connections and related topics`,
        difficulty: 3,
        duration: '35 minutes',
        branch: 'Interest Exploration',
        priority: 80,
        prerequisites: [],
        learningOutcome: 'Broaden knowledge base',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  generateProgressionTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `progression_${baseId}`,
        title: `Next Level ${config.goal} Skills`,
        description: `Progress to the next level of expertise`,
        difficulty: 4,
        duration: '50 minutes',
        branch: 'Skill Progression',
        priority: 30,
        prerequisites: [],
        learningOutcome: 'Advance skill level',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  generateStandardEvolutionTasks(config, pathName) {
    const baseId = Date.now();
    return [
      {
        id: `evolution_${baseId}`,
        title: `Continue ${config.goal} Journey`,
        description: `Build upon your progress with the next logical steps`,
        difficulty: 3,
        duration: '30 minutes',
        branch: 'Continued Growth',
        priority: 90,
        prerequisites: [],
        learningOutcome: 'Maintain learning momentum',
        generated: true,
        evolutionGenerated: true,
      },
    ];
  }

  async addTasksToHTA(projectId, pathName, newTasks) {
    // Always use activePath from config if not provided
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const canonicalPath = pathName || (config && config.activePath) || 'general';
    try {
      const htaData = await this.loadPathHTA(projectId, canonicalPath);
      if (!htaData) {
        throw new Error('No HTA data found to update');
      }

      // Add new tasks to frontier nodes
      htaData.frontierNodes = htaData.frontierNodes || [];

      // ===== HTA VALIDATION LAYER (Stage-1) =====
      try {
        const { validateTask } = await import('../utils/hta-validator.js');
        for (const task of newTasks) {
          const errors = validateTask(task);
          if (errors.length) {
            throw new Error(`HTA validation failed for task ${task.id || '[unknown]'}: ${errors.join(', ')}`);
          }
        }
      } catch (validationErr) {
        console.warn('[TaskGeneratorEvolution] Validation failed – aborting addTasksToHTA:', validationErr.message);
        throw validationErr;
      }

      // Push only if validation passes
      htaData.frontierNodes.push(...newTasks);

      // Update metadata
      htaData.hierarchyMetadata = htaData.hierarchyMetadata || {};
      htaData.hierarchyMetadata.total_tasks = htaData.frontierNodes.length;
      htaData.hierarchyMetadata.last_updated = new Date().toISOString();
      htaData.lastUpdated = new Date().toISOString();

      // Save updated HTA data
      if (canonicalPath === DEFAULT_PATHS.GENERAL) {
        await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.HTA, htaData);
      } else {
        await this.dataPersistence.savePathData(projectId, canonicalPath, FILE_NAMES.HTA, htaData);
      }

      console.error(`✅ Added ${newTasks.length} tasks to HTA for path: ${canonicalPath}`);

      // Queue memory sync so Claude retains up-to-date frontier context
      try {
        if (!this._memorySync) {
          const { MemorySync } = await import('./memory-sync.js');
          this._memorySync = new MemorySync(this.dataPersistence);
        }
        await this._memorySync.queueSync(projectId, canonicalPath, 'high');
      } catch (memErr) {
        console.warn('[TaskGeneratorEvolution] Memory sync skipped:', memErr.message);
      }
    } catch (error) {
      console.error('Failed to add tasks to HTA:', error.message);
      throw error;
    }
  }

  async loadPathHTA(projectId, pathName) {
    // Always use activePath from config if not provided
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const canonicalPath = pathName || (config && config.activePath) || 'general';
    try {
      return await this.dataPersistence.loadPathData(projectId, canonicalPath, FILE_NAMES.HTA);
    } catch (error) {
      return null;
    }
  }
}
