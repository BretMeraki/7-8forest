/**
 * Progressive HTA Integration
 * 
 * Integrates Progressive Task Refinement with Enhanced HTA Core
 * to provide intelligent, context-aware task generation that refines
 * as the user progresses through their learning journey.
 */

import { ProgressiveTaskRefinement } from './progressive-task-refinement.js';

export class ProgressiveHTAIntegration {
  constructor(enhancedHTACore, llmInterface, vectorStore, dataPersistence) {
    this.enhancedHTACore = enhancedHTACore;
    this.progressiveRefinement = new ProgressiveTaskRefinement(
      llmInterface, 
      vectorStore, 
      dataPersistence
    );
    
    this.dataPersistence = dataPersistence;
    this.llmInterface = llmInterface;
    this.vectorStore = vectorStore;
  }

  /**
   * Enhanced buildHTATree with progressive refinement
   */
  async buildHTATreeWithProgressiveRefinement(args) {
    // Use Enhanced HTA Core for initial tree structure
    const baseTree = await this.enhancedHTACore.buildHTATree(args);
    
    if (!baseTree.success) {
      return baseTree;
    }

    // Extract tree data and project info
    const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
    const htaData = await this.enhancedHTACore.loadPathHTA(projectId, args.path_name || 'general');
    
    if (!htaData) {
      return baseTree;
    }

    // Apply progressive refinement to the tree
    const progressiveTree = await this.applyProgressiveRefinement(
      htaData,
      projectId,
      args
    );

    // Save the progressive tree
    await this.saveProgressiveTree(projectId, args.path_name || 'general', progressiveTree);

    return this.formatProgressiveTreeResponse(progressiveTree);
  }

  /**
   * Apply progressive refinement to an existing HTA tree
   */
  async applyProgressiveRefinement(htaData, projectId, context) {
    const progressiveTree = {
      ...htaData,
      refinementStrategy: 'progressive',
      progressiveMetadata: {
        applied: new Date().toISOString(),
        refinementConfig: this.progressiveRefinement.config,
        contextSnapshot: context
      }
    };

    // Apply progressive refinement to each strategic branch
    const refinedBranches = [];
    for (const branch of htaData.strategicBranches) {
      const refinedBranch = await this.progressiveRefinement.generateBranchWithProgressiveRefinement(
        branch,
        htaData.goal,
        context
      );
      refinedBranches.push(refinedBranch);
    }

    // Update frontier nodes with progressive refinement data
    progressiveTree.strategicBranches = refinedBranches;
    progressiveTree.frontierNodes = this.collectFrontierNodes(refinedBranches);

    return progressiveTree;
  }

  /**
   * Get next task with progressive refinement
   */
  async getNextTaskWithRefinement(args) {
    const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
    const pathName = args.path_name || 'general';
    
    // Load current tree
    const htaData = await this.enhancedHTACore.loadPathHTA(projectId, pathName);
    if (!htaData) {
      return { error: 'No HTA tree found' };
    }

    // Find current task position
    const currentTaskId = args.current_task_id || this.findCurrentTaskId(htaData);
    
    // Trigger progressive refinement if needed
    if (this.shouldTriggerRefinement(htaData, currentTaskId)) {
      console.log('🔄 Triggering progressive task refinement...');
      
      const refinedNodes = await this.progressiveRefinement.refineTasksOnApproach(
        projectId,
        currentTaskId,
        htaData.frontierNodes
      );

      // Update the tree with refined tasks
      htaData.frontierNodes = refinedNodes;
      htaData.lastRefinement = new Date().toISOString();
      
      // Save updated tree
      await this.saveProgressiveTree(projectId, pathName, htaData);
    }

    // Get next task using standard logic
    const nextTask = this.selectNextTask(htaData.frontierNodes, currentTaskId);
    
    return this.formatTaskResponse(nextTask, htaData);
  }

  /**
   * Complete task and update progressive refinement context
   */
  async completeTaskWithRefinement(args) {
    const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
    const taskId = args.task_id;
    const completionData = {
      taskId,
      completedAt: new Date().toISOString(),
      actualDuration: args.actual_duration,
      estimatedDuration: args.estimated_duration,
      difficulty: args.difficulty,
      completionQuality: args.completion_quality || 1.0,
      userFeedback: args.user_feedback,
      strugglingAreas: args.struggling_areas || [],
      strengths: args.strengths || [],
      type: args.task_type
    };

    // Save completion data for refinement context
    await this.saveTaskCompletion(projectId, completionData);

    // Update vector store with completion context
    if (this.vectorStore) {
      await this.vectorStore.addTaskCompletionContext(projectId, completionData);
    }

    // Check if this completion should trigger broader refinement
    const shouldRefineTree = await this.shouldRefineTreeAfterCompletion(projectId, completionData);
    
    if (shouldRefineTree) {
      console.log('🌳 Triggering tree-wide refinement based on completion patterns...');
      await this.refineTreeBasedOnProgress(projectId, completionData);
    }

    return {
      success: true,
      message: 'Task completed and context updated for progressive refinement',
      refinementTriggered: shouldRefineTree
    };
  }

  /**
   * Check if progressive refinement should be triggered
   */
  shouldTriggerRefinement(htaData, currentTaskId) {
    const currentTaskIndex = htaData.frontierNodes.findIndex(task => task.id === currentTaskId);
    if (currentTaskIndex === -1) return false;

    // Check if there are upcoming rough estimates that need refinement
    const upcomingTasks = htaData.frontierNodes.slice(currentTaskIndex + 1, currentTaskIndex + 4);
    return upcomingTasks.some(task => task.refinementStatus === 'rough_estimate');
  }

  /**
   * Find current task ID based on completion status
   */
  findCurrentTaskId(htaData) {
    const incompleteTasks = htaData.frontierNodes.filter(task => !task.completed);
    return incompleteTasks.length > 0 ? incompleteTasks[0].id : null;
  }

  /**
   * Select next task from frontier nodes
   */
  selectNextTask(frontierNodes, currentTaskId) {
    const incompleteTasks = frontierNodes.filter(task => !task.completed);
    
    if (incompleteTasks.length === 0) {
      return null;
    }

    // Prioritize high-fidelity tasks over rough estimates
    const highFidelityTasks = incompleteTasks.filter(task => task.refinementStatus === 'high_fidelity');
    if (highFidelityTasks.length > 0) {
      return highFidelityTasks[0];
    }

    // Then prioritize context-refined tasks
    const contextRefinedTasks = incompleteTasks.filter(task => task.refinementStatus === 'context_refined');
    if (contextRefinedTasks.length > 0) {
      return contextRefinedTasks[0];
    }

    // Finally, rough estimates (should be refined by now)
    return incompleteTasks[0];
  }

  /**
   * Collect frontier nodes from refined branches
   */
  collectFrontierNodes(refinedBranches) {
    const allNodes = [];
    
    refinedBranches.forEach(branch => {
      if (branch.frontierNodes) {
        allNodes.push(...branch.frontierNodes);
      }
    });

    return allNodes;
  }

  /**
   * Save task completion data for refinement context
   */
  async saveTaskCompletion(projectId, completionData) {
    try {
      // Load existing completions
      const existingCompletions = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
      
      // Add new completion
      existingCompletions.push(completionData);
      
      // Save updated completions
      await this.dataPersistence.saveProjectData(projectId, 'completed_tasks.json', existingCompletions);
      
      console.log(`📝 Saved task completion for progressive refinement: ${completionData.taskId}`);
    } catch (error) {
      console.error('Failed to save task completion:', error.message);
    }
  }

  /**
   * Check if tree should be refined based on completion patterns
   */
  async shouldRefineTreeAfterCompletion(projectId, completionData) {
    const completedTasks = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
    
    // Refine tree every 5 completed tasks
    if (completedTasks.length % 5 === 0) {
      return true;
    }

    // Refine if user is struggling significantly
    const recentTasks = completedTasks.slice(-3);
    const strugglingTasks = recentTasks.filter(task => 
      task.actualDuration > task.estimatedDuration * 1.5 || 
      task.completionQuality < 0.7
    );
    
    if (strugglingTasks.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Refine tree based on user progress patterns
   */
  async refineTreeBasedOnProgress(projectId, completionData) {
    const pathName = 'general'; // Could be parameterized
    const htaData = await this.enhancedHTACore.loadPathHTA(projectId, pathName);
    
    if (!htaData) return;

    // Accumulate user journey context
    const userContext = await this.progressiveRefinement.accumulateUserJourneyContext(projectId);
    
    // Refine remaining rough estimates based on accumulated context
    const refinedNodes = [];
    for (const task of htaData.frontierNodes) {
      if (task.refinementStatus === 'rough_estimate' && !task.completed) {
        const refinedTask = await this.progressiveRefinement.refineTaskWithContext(
          task,
          userContext,
          projectId
        );
        refinedNodes.push(refinedTask);
      } else {
        refinedNodes.push(task);
      }
    }

    // Update tree with refined tasks
    htaData.frontierNodes = refinedNodes;
    htaData.lastTreeRefinement = new Date().toISOString();
    
    // Save updated tree
    await this.saveProgressiveTree(projectId, pathName, htaData);
  }

  /**
   * Save progressive tree with refinement metadata
   */
  async saveProgressiveTree(projectId, pathName, progressiveTree) {
    await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', progressiveTree);
  }

  /**
   * Format progressive tree response
   */
  formatProgressiveTreeResponse(progressiveTree) {
    const refinementStats = this.calculateRefinementStats(progressiveTree);
    
    return {
      success: true,
      content: [{
        type: 'text',
        text: `**Progressive HTA Tree Generated Successfully!** 🧠✨\n\n**Goal**: ${progressiveTree.goal}\n**Strategy**: Progressive Task Refinement\n**Immediate Tasks**: ${refinementStats.immediateTasks} (high-fidelity)\n**Rough Estimates**: ${refinementStats.roughEstimates} (will refine as you progress)\n**Total Tasks**: ${refinementStats.totalTasks}\n\n**Intelligence**: Tasks become more specific and personalized as you progress through your learning journey using accumulated context about your preferences and patterns.\n\n**Next Steps**: Use \`get_next_task_forest\` to begin with your first high-fidelity task!`
      }],
      refinementStrategy: 'progressive',
      refinementStats,
      tasks_count: progressiveTree.frontierNodes.length,
      progressive_intelligence: true
    };
  }

  /**
   * Format task response with refinement info
   */
  formatTaskResponse(task, htaData) {
    if (!task) {
      return {
        success: false,
        message: 'No available tasks found'
      };
    }

    const refinementInfo = task.refinementStatus === 'rough_estimate' 
      ? '\n\n*Note: This task will be refined with your personal context as you get closer to it.*'
      : task.refinementStatus === 'context_refined'
      ? '\n\n*This task has been personalized based on your learning patterns.*'
      : '';

    return {
      success: true,
      content: [{
        type: 'text',
        text: `**Next Task**: ${task.title}\n\n**Description**: ${task.description}\n**Estimated Duration**: ${task.estimatedDuration}\n**Difficulty**: ${task.difficulty}/10\n**Refinement Status**: ${task.refinementStatus}${refinementInfo}`
      }],
      task: task,
      refinement_status: task.refinementStatus,
      progressive_intelligence: true
    };
  }

  /**
   * Calculate refinement statistics
   */
  calculateRefinementStats(progressiveTree) {
    const tasks = progressiveTree.frontierNodes || [];
    
    return {
      totalTasks: tasks.length,
      immediateTasks: tasks.filter(t => t.refinementStatus === 'high_fidelity').length,
      roughEstimates: tasks.filter(t => t.refinementStatus === 'rough_estimate').length,
      contextRefined: tasks.filter(t => t.refinementStatus === 'context_refined').length,
      completedTasks: tasks.filter(t => t.completed).length
    };
  }

  /**
   * Get progressive refinement status for UI
   */
  async getProgressiveStatus(projectId) {
    const refinementStatus = this.progressiveRefinement.getRefinementStatus(projectId);
    const completedTasks = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
    
    return {
      ...refinementStatus,
      completedTasksCount: completedTasks.length,
      lastCompletedTask: completedTasks[completedTasks.length - 1]?.completedAt || null,
      progressiveIntelligence: true
    };
  }
}
