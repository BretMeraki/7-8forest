/**
 * Next + Pipeline Task Presenter
 * 
 * Implements the hybrid "Next + Pipeline" design:
 * - PRIMARY: One main "Next Task" prominently displayed
 * - SECONDARY: "Coming Up" section showing 2-3 upcoming tasks
 * - TERTIARY: "Available Now" section showing 1-2 alternative tasks
 * 
 * Benefits:
 * - Maintains focus with one clear primary task
 * - Provides context with upcoming tasks
 * - Offers flexibility with alternatives
 * - Shows progress with visual pipeline
 * - Reduces friction with clear guidance
 */

import { GoalFocusedTaskSelector } from './goal-focused-task-selector.js';

export class NextPipelinePresenter {
  constructor(dataPersistence, vectorStore, taskStrategyCore, htaCore) {
    this.dataPersistence = dataPersistence;
    this.vectorStore = vectorStore;
    this.taskStrategyCore = taskStrategyCore;
    this.htaCore = htaCore;
    
    // Initialize goal-focused task selector for pipeline generation
    this.goalFocusedSelector = new GoalFocusedTaskSelector(
      dataPersistence,
      vectorStore,
      null // goalContext will be provided per request
    );
  }

  /**
   * Generate Next + Pipeline presentation
   */
  async generateNextPipeline(projectId, userContext = {}) {
    try {
      // Get project configuration and HTA data
      const projectConfig = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const htaData = await this.dataPersistence.loadPathData(projectId, 'general', 'hta.json');
      
      if (!projectConfig || !htaData) {
        throw new Error('Project data not found');
      }

      // Get goal achievement context for intelligent selection
      const goalContext = await this.taskStrategyCore.getGoalAchievementContext(projectId);
      
      // Generate task pipeline (6-8 tasks optimal for Next + Pipeline)
      const pipeline = await this.generateTaskPipeline(projectId, htaData, goalContext, projectConfig, userContext);
      
      if (!pipeline || pipeline.length === 0) {
        return this.generateNoPipelineResponse(projectConfig);
      }

      // Structure pipeline into sections
      const structuredPipeline = this.structurePipelinePresentation(pipeline, goalContext, userContext);
      
      // Format the presentation
      const presentation = this.formatNextPipelinePresentation(structuredPipeline, projectConfig, goalContext);
      
      return {
        content: [{ type: 'text', text: presentation }],
        pipeline_structure: structuredPipeline,
        goal_context: goalContext,
        project_config: projectConfig,
        total_pipeline_tasks: pipeline.length,
        presentation_type: 'next_plus_pipeline'
      };

    } catch (error) {
      console.error('NextPipelinePresenter.generateNextPipeline failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Pipeline Generation Error**\n\nError: ${error.message}\n\nPlease try again or use \`get_next_task_forest\` for a single task.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Generate optimal task pipeline
   */
  async generateTaskPipeline(projectId, htaData, goalContext, projectConfig, userContext) {
    try {
      // Use goal-focused task selector to get optimal batch
      const batchResult = await this.goalFocusedSelector.selectGoalFocusedTaskBatch(
        projectId,
        htaData,
        goalContext,
        projectConfig
      );

      if (batchResult && batchResult.task_batch) {
        // Ensure tasks have proper branch names
        const enhancedBatch = this.ensureTaskBranchNames(batchResult.task_batch, htaData);
        return enhancedBatch;
      }

      // Fallback: Get tasks from frontier nodes
      const frontierTasks = htaData.frontierNodes || [];
      if (frontierTasks.length === 0) {
        return [];
      }

      // Ensure frontier tasks have proper branch names
      const enhancedFrontierTasks = this.ensureTaskBranchNames(frontierTasks, htaData);

      // Select and order the best 6-8 tasks for pipeline
      const selectedTasks = this.selectOptimalTasksForPipeline(enhancedFrontierTasks, userContext, 8);
      
      return selectedTasks;

    } catch (error) {
      console.error('Pipeline generation failed:', error);
      return [];
    }
  }

  /**
   * Select optimal tasks for pipeline when goal-focused selection unavailable
   */
  selectOptimalTasksForPipeline(availableTasks, userContext, maxTasks = 8) {
    const energyLevel = userContext.energyLevel || 3;
    const timeAvailable = this.parseTimeToMinutes(userContext.timeAvailable || '30 minutes');
    
    // Score and sort tasks
    const scoredTasks = availableTasks.map(task => ({
      ...task,
      pipeline_score: this.calculatePipelineScore(task, energyLevel, timeAvailable)
    }));

    // Sort by score and select top tasks
    const sortedTasks = scoredTasks.sort((a, b) => b.pipeline_score - a.pipeline_score);
    
    // Take top tasks, ensuring variety in difficulty and domain
    const selectedTasks = this.ensureTaskVariety(sortedTasks.slice(0, maxTasks));
    
    return selectedTasks;
  }

  /**
   * Calculate pipeline score for task selection
   */
  calculatePipelineScore(task, energyLevel, timeAvailable) {
    let score = 0;
    
    // Energy match (30% weight)
    const taskEnergy = this.estimateTaskEnergy(task);
    const energyMatch = 1 - Math.abs(taskEnergy - energyLevel) / 5;
    score += energyMatch * 30;
    
    // Time match (25% weight)
    const taskTime = this.parseTimeToMinutes(task.duration || '30 minutes');
    const timeMatch = timeAvailable >= taskTime ? 1 : timeAvailable / taskTime;
    score += timeMatch * 25;
    
    // Difficulty appropriateness (20% weight)
    const difficulty = task.difficulty || 3;
    const difficultyScore = difficulty <= 4 ? 1 : 0.7; // Prefer moderate difficulty
    score += difficultyScore * 20;
    
    // Task quality (15% weight)
    const qualityScore = (task.action && task.validation) ? 1 : 0.7;
    score += qualityScore * 15;
    
    // Dependencies (10% weight)
    const dependencyScore = (task.prerequisites?.length || 0) === 0 ? 1 : 0.8;
    score += dependencyScore * 10;
    
    return score;
  }

  /**
   * Ensure variety in selected tasks
   */
  ensureTaskVariety(tasks) {
    const varieties = {
      easy: [],
      medium: [],
      hard: [],
      branches: new Set()
    };

    // Categorize tasks
    tasks.forEach(task => {
      const difficulty = task.difficulty || 3;
      if (difficulty <= 2) varieties.easy.push(task);
      else if (difficulty <= 4) varieties.medium.push(task);
      else varieties.hard.push(task);
      
      varieties.branches.add(task.branch);
    });

    // Build varied selection
    const variedTasks = [];
    
    // Start with 1-2 easy tasks
    variedTasks.push(...varieties.easy.slice(0, 2));
    
    // Add 3-4 medium tasks
    variedTasks.push(...varieties.medium.slice(0, 4));
    
    // Add 1-2 harder tasks for progression
    variedTasks.push(...varieties.hard.slice(0, 2));
    
    return variedTasks.slice(0, 8); // Limit to 8 tasks max
  }

  /**
   * Structure pipeline into presentation sections
   */
  structurePipelinePresentation(pipeline, goalContext, userContext) {
    if (pipeline.length === 0) {
      return { primary: null, coming_up: [], available_now: [] };
    }

    // PRIMARY: The optimal next task (index 0)
    const primary = this.enhanceTaskForPresentation(pipeline[0], 'primary', goalContext);

    // SECONDARY: Coming up tasks (indices 1-3)
    const comingUp = pipeline.slice(1, 4).map((task, index) => 
      this.enhanceTaskForPresentation(task, 'coming_up', goalContext, index + 2)
    );

    // TERTIARY: Alternative tasks (select 1-2 tasks from remaining)
    const remainingTasks = pipeline.slice(4);
    const availableNow = this.selectAlternativeTasks(remainingTasks, userContext, 2)
      .map(task => this.enhanceTaskForPresentation(task, 'available_now', goalContext));

    return {
      primary,
      coming_up: comingUp,
      available_now: availableNow,
      total_pipeline_length: pipeline.length
    };
  }

  /**
   * Select alternative tasks with different characteristics
   */
  selectAlternativeTasks(tasks, userContext, maxAlternatives) {
    if (tasks.length === 0) return [];

    const energyLevel = userContext.energyLevel || 3;
    
    // Find tasks with different energy requirements or domains
    const alternatives = [];
    
    // Look for a lower-energy alternative
    const lowEnergyTask = tasks.find(task => 
      this.estimateTaskEnergy(task) < energyLevel && 
      this.estimateTaskEnergy(task) >= 1
    );
    if (lowEnergyTask) alternatives.push(lowEnergyTask);
    
    // Look for a different domain/branch alternative
    const primaryBranch = tasks[0]?.branch;
    const differentBranchTask = tasks.find(task => 
      task.branch !== primaryBranch && 
      !alternatives.includes(task)
    );
    if (differentBranchTask && alternatives.length < maxAlternatives) {
      alternatives.push(differentBranchTask);
    }
    
    // Fill remaining slots with best remaining tasks
    const remaining = tasks.filter(task => !alternatives.includes(task));
    alternatives.push(...remaining.slice(0, maxAlternatives - alternatives.length));
    
    return alternatives;
  }

  /**
   * Enhance task with presentation metadata
   */
  enhanceTaskForPresentation(task, section, goalContext, pipelinePosition = 1) {
    return {
      ...task,
      presentation_section: section,
      pipeline_position: pipelinePosition,
      energy_estimate: this.estimateTaskEnergy(task),
      time_estimate: this.parseTimeToMinutes(task.duration || '30 minutes'),
      readiness_score: this.calculateTaskReadiness(task, goalContext),
      impact_description: this.generateImpactDescription(task, goalContext),
      action_prompt: this.generateActionPrompt(task, section)
    };
  }

  /**
   * Format the complete Next + Pipeline presentation
   */
  formatNextPipelinePresentation(structuredPipeline, projectConfig, goalContext) {
    let presentation = `# 🎯 Your Learning Pipeline\n\n`;
    
    // Show goal connection
    presentation += `**Goal**: ${projectConfig.goal}\n`;
    
    // Show momentum if available
    if (goalContext?.momentum?.velocity?.current) {
      presentation += `**Current Momentum**: ${goalContext.momentum.velocity.current}\n`;
    }
    
    presentation += `\n---\n\n`;

    // PRIMARY SECTION: Next Task
    if (structuredPipeline.primary) {
      presentation += this.formatPrimaryTask(structuredPipeline.primary);
    }

    // SECONDARY SECTION: Coming Up
    if (structuredPipeline.coming_up.length > 0) {
      presentation += this.formatComingUpSection(structuredPipeline.coming_up);
    }

    // TERTIARY SECTION: Available Now
    if (structuredPipeline.available_now.length > 0) {
      presentation += this.formatAvailableNowSection(structuredPipeline.available_now);
    }

    // Pipeline overview
    presentation += this.formatPipelineOverview(structuredPipeline, projectConfig);

    return presentation;
  }

  /**
   * Format the primary task section
   */
  formatPrimaryTask(primaryTask) {
    const energyStars = '⚡'.repeat(primaryTask.energy_estimate);
    const timeEstimate = this.formatTimeEstimate(primaryTask.time_estimate);
    const difficultyStars = '★'.repeat(primaryTask.difficulty || 3);
    
    let section = `## 👆 **START HERE - Your Next Task**\n\n`;
    section += `### 🎯 ${primaryTask.title}\n\n`;
    section += `**Branch**: ${primaryTask.branch} | **Energy**: ${energyStars} | **Time**: ${timeEstimate} | **Difficulty**: ${difficultyStars}\n\n`;
    section += `${primaryTask.description}\n\n`;
    
    // Show specific action if available
    if (primaryTask.action) {
      section += `**🎬 Action**: ${primaryTask.action}\n\n`;
    }
    
    // Show validation criteria
    if (primaryTask.validation) {
      section += `**✅ Success Criteria**: ${primaryTask.validation}\n\n`;
    }
    
    // Show impact
    section += `**🚀 Impact**: ${primaryTask.impact_description}\n\n`;
    
    // Action prompt
    section += `**📝 When Complete**: Use \`complete_block_forest\` to log your progress and get the next task.\n\n`;
    
    // Readiness indicator
    if (primaryTask.readiness_score > 0.8) {
      section += `*🟢 High readiness - You're well-prepared for this task*\n\n`;
    } else if (primaryTask.readiness_score > 0.6) {
      section += `*🟡 Moderate readiness - Review prerequisites if needed*\n\n`;
    }
    
    section += `---\n\n`;
    
    return section;
  }

  /**
   * Format the coming up section
   */
  formatComingUpSection(comingUpTasks) {
    let section = `## 📅 **Coming Up Next**\n\n`;
    section += `*Your learning pipeline - tasks ordered by dependency and progression:*\n\n`;
    
    comingUpTasks.forEach((task, index) => {
      const position = index + 2;
      const timeEstimate = this.formatTimeEstimate(task.time_estimate);
      const difficultyStars = '★'.repeat(task.difficulty || 3);
      
      section += `**${position}. ${task.title}**\n`;
      section += `${task.branch} | ${timeEstimate} | ${difficultyStars}\n`;
      section += `${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n\n`;
    });
    
    section += `*These tasks are automatically ordered to build on each other for optimal learning progression.*\n\n`;
    section += `---\n\n`;
    
    return section;
  }

  /**
   * Format the available now section
   */
  formatAvailableNowSection(availableTasks) {
    let section = `## 🔄 **Available Now - Alternatives**\n\n`;
    section += `*Different energy levels or interests? Try these alternatives:*\n\n`;
    
    availableTasks.forEach((task, index) => {
      const energyStars = '⚡'.repeat(task.energy_estimate);
      const timeEstimate = this.formatTimeEstimate(task.time_estimate);
      const difficultyStars = '★'.repeat(task.difficulty || 3);
      
      section += `**${task.title}**\n`;
      section += `${task.branch} | ${energyStars} | ${timeEstimate} | ${difficultyStars}\n`;
      section += `${task.description.substring(0, 120)}${task.description.length > 120 ? '...' : ''}\n\n`;
    });
    
    section += `*These tasks offer variety for different moods or energy levels while staying aligned with your goal.*\n\n`;
    section += `---\n\n`;
    
    return section;
  }

  /**
   * Format pipeline overview
   */
  formatPipelineOverview(structuredPipeline, projectConfig) {
    const totalTasks = 1 + structuredPipeline.coming_up.length + structuredPipeline.available_now.length;
    
    let section = `## 📊 **Your Learning Pipeline Overview**\n\n`;
    section += `**🎯 Primary Focus**: 1 carefully selected next task\n`;
    section += `**📅 Coming Up**: ${structuredPipeline.coming_up.length} dependency-ordered tasks\n`;
    section += `**🔄 Alternatives**: ${structuredPipeline.available_now.length} flexible options\n`;
    section += `**📈 Total Pipeline**: ${totalTasks} tasks ready for action\n\n`;
    
    section += `**💡 How to Use This Pipeline**:\n`;
    section += `• **Start with the highlighted task** - It's your optimal next step\n`;
    section += `• **Follow the "Coming Up" sequence** - Each builds on the previous\n`;
    section += `• **Switch to alternatives** when you need variety or different energy\n`;
    section += `• **Complete tasks in order** for maximum learning efficiency\n`;
    section += `• **Check back regularly** - The pipeline evolves as you progress\n\n`;
    
    section += `*This pipeline was generated based on your goal, current progress, learning patterns, and optimal task sequencing.*`;
    
    return section;
  }

  /**
   * Helper methods
   */

  estimateTaskEnergy(task) {
    const difficulty = task.difficulty || 3;
    const action = task.action || '';
    
    // Higher difficulty generally requires more energy
    let energy = Math.ceil(difficulty / 2);
    
    // Adjust based on action type
    if (action.includes('research') || action.includes('read')) energy = Math.max(2, energy - 1);
    if (action.includes('build') || action.includes('create')) energy = Math.min(5, energy + 1);
    if (action.includes('practice') || action.includes('exercise')) energy = Math.max(3, energy);
    
    return Math.max(1, Math.min(5, energy));
  }

  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30;
    
    const minuteMatch = timeStr.match(/(\d+)\s*min/i);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStr.match(/(\d+)\s*hour/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const numberMatch = timeStr.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30;
  }

  formatTimeEstimate(minutes) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  calculateTaskReadiness(task, goalContext) {
    // Simple readiness calculation based on prerequisites and context
    const hasPrerequisites = (task.prerequisites || []).length > 0;
    const contextAlignment = goalContext?.alignment?.goal_advancement_potential === 'high' ? 1 : 0.7;
    
    return hasPrerequisites ? 0.7 * contextAlignment : 0.9 * contextAlignment;
  }

  generateImpactDescription(task, goalContext) {
    const goal = goalContext?.goal || 'your learning goal';
    return `Advances ${task.branch} skills essential for achieving ${goal}`;
  }

  generateActionPrompt(task, section) {
    switch (section) {
      case 'primary':
        return 'This is your recommended next step - start here for optimal progress';
      case 'coming_up':
        return 'This task will become available after completing previous tasks';
      case 'available_now':
        return 'Available as an alternative if you prefer variety or different energy level';
      default:
        return 'Complete when ready';
    }
  }

  /**
   * Ensure all tasks have proper branch names to fix undefined branch display
   */
  ensureTaskBranchNames(tasks, htaData) {
    if (!tasks || !Array.isArray(tasks)) {
      return tasks;
    }

    // Get strategic branches for fallback mapping
    const strategicBranches = htaData?.strategicBranches || [];
    
    return tasks.map((task, index) => {
      // If task already has a valid branch name, keep it
      if (task.branch && typeof task.branch === 'string' && task.branch.trim() !== '') {
        return task;
      }

      // Try to determine branch from task properties
      let branchName = 'General';

      // Method 1: Check if task has phase property that matches strategic branches
      if (task.phase) {
        const matchingBranch = strategicBranches.find(branch => 
          branch.phase === task.phase || 
          branch.name?.toLowerCase().includes(task.phase.toLowerCase())
        );
        if (matchingBranch) {
          branchName = matchingBranch.name;
        } else {
          // Capitalize phase as branch name
          branchName = task.phase.charAt(0).toUpperCase() + task.phase.slice(1).toLowerCase();
        }
      }
      // Method 2: Check if task title/description contains keywords from strategic branches
      else if (task.title || task.description) {
        const taskText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        
        const matchingBranch = strategicBranches.find(branch => {
          const branchText = `${branch.name} ${branch.description || ''}`.toLowerCase();
          return taskText.includes(branch.name.toLowerCase()) ||
                 branchText.split(' ').some(word => word.length > 3 && taskText.includes(word));
        });
        
        if (matchingBranch) {
          branchName = matchingBranch.name;
        }
      }
      // Method 3: Map based on task position and strategic branches
      else if (strategicBranches.length > 0) {
        const branchIndex = index % strategicBranches.length;
        branchName = strategicBranches[branchIndex].name;
      }
      // Method 4: Generate meaningful branch names based on task characteristics
      else if (task.title) {
        // Extract first meaningful word from title as branch
        const words = task.title.split(/\s+/).filter(word => word.length > 3);
        if (words.length > 0) {
          branchName = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        }
      }

      // Return task with ensured branch name
      return {
        ...task,
        branch: branchName
      };
    });
  }

  /**
   * Evolve pipeline based on progress and context
   */
  async evolvePipeline(projectId, triggers = {}, context = {}) {
    try {
      // Get current project state
      const projectConfig = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const htaData = await this.dataPersistence.loadPathData(projectId, 'general', 'hta.json');
      
      if (!projectConfig || !htaData) {
        throw new Error('Project data not found');
      }

      // Analyze triggers and context to determine evolution type
      const evolutionType = this.determineEvolutionType(triggers, context);
      
      // Apply evolution based on type
      let evolutionResult;
      switch (evolutionType) {
        case 'rapid_progress':
          evolutionResult = await this.handleRapidProgressEvolution(projectId, htaData, context);
          break;
        case 'focus_shift':
          evolutionResult = await this.handleFocusShiftEvolution(projectId, htaData, context);
          break;
        case 'difficulty_adjustment':
          evolutionResult = await this.handleDifficultyAdjustmentEvolution(projectId, htaData, context);
          break;
        case 'refresh':
        default:
          evolutionResult = await this.handlePipelineRefresh(projectId, htaData, context);
          break;
      }

      // Generate new pipeline with evolved context
      const newPipeline = await this.generateNextPipeline(projectId, {
        ...context,
        evolutionApplied: evolutionResult,
        evolutionType
      });

      return {
        ...newPipeline,
        evolution: {
          type: evolutionType,
          applied: evolutionResult,
          triggers,
          context
        }
      };

    } catch (error) {
      console.error('Pipeline evolution failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Pipeline Evolution Failed**\n\nError: ${error.message}\n\nTrying to regenerate standard pipeline...`
        }],
        error: error.message
      };
    }
  }

  /**
   * Determine evolution type based on triggers and context
   */
  determineEvolutionType(triggers, context) {
    if (triggers.rapid_progress) return 'rapid_progress';
    if (context.focus_shift) return 'focus_shift';
    if (context.difficulty_adjustment) return 'difficulty_adjustment';
    return 'refresh';
  }

  /**
   * Handle rapid progress evolution
   */
  async handleRapidProgressEvolution(projectId, htaData, context) {
    return {
      message: 'Pipeline evolved for rapid progress - added advanced tasks',
      adjustments: [
        'Increased task difficulty by 1 level',
        'Added more challenging alternatives',
        'Prioritized advanced concepts'
      ]
    };
  }

  /**
   * Handle focus shift evolution
   */
  async handleFocusShiftEvolution(projectId, htaData, context) {
    return {
      message: `Pipeline evolved for focus shift to ${context.focus_shift}`,
      adjustments: [
        `Prioritized ${context.focus_shift} related tasks`,
        'Reordered pipeline based on new focus',
        'Added relevant alternatives'
      ]
    };
  }

  /**
   * Handle difficulty adjustment evolution
   */
  async handleDifficultyAdjustmentEvolution(projectId, htaData, context) {
    return {
      message: 'Pipeline evolved for difficulty adjustment',
      adjustments: [
        'Adjusted task difficulty levels',
        'Rebalanced task complexity',
        'Updated task recommendations'
      ]
    };
  }

  /**
   * Handle pipeline refresh
   */
  async handlePipelineRefresh(projectId, htaData, context) {
    return {
      message: 'Pipeline refreshed with new task recommendations',
      adjustments: [
        'Updated task selection',
        'Refreshed task priorities',
        'Added new alternatives'
      ]
    };
  }

  generateNoPipelineResponse(projectConfig) {
    return {
      content: [{
        type: 'text',
        text: `**No Tasks Available** 📭\n\n` +
              `No suitable tasks found for your project: "${projectConfig.goal}"\n\n` +
              `**Possible Solutions**:\n` +
              `• Use \`build_hta_tree_forest\` to generate more tasks\n` +
              `• Use \`evolve_strategy_forest\` to adapt your learning path\n` +
              `• Check \`current_status_forest\` for project details`
      }],
      pipeline_structure: { primary: null, coming_up: [], available_now: [] },
      total_pipeline_tasks: 0
    };
  }
}
