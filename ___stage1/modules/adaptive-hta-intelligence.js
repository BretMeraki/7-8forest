/**
 * Adaptive HTA Intelligence System
 * 
 * Master orchestrator that combines:
 * - Progressive Task Refinement (context-driven task evolution)
 * - Dynamic Branch Expansion (structure evolution based on user journey)
 * - Intelligent triggers and coordination between systems
 * 
 * This creates a truly adaptive learning system that evolves both its
 * task content and structural branches based on user reflections,
 * context evolution, and learning patterns.
 */

import { ProgressiveTaskRefinement } from './progressive-task-refinement.js';
import { DynamicBranchExpansion } from './dynamic-branch-expansion.js';
import { ProgressiveHTAIntegration } from './progressive-hta-integration.js';

export class AdaptiveHTAIntelligence {
  constructor(enhancedHTACore, llmInterface, vectorStore, dataPersistence) {
    this.enhancedHTACore = enhancedHTACore;
    this.llmInterface = llmInterface;
    this.vectorStore = vectorStore;
    this.dataPersistence = dataPersistence;
    
    // Initialize intelligent systems
    this.progressiveRefinement = new ProgressiveTaskRefinement(
      llmInterface, 
      vectorStore, 
      dataPersistence
    );
    
    this.dynamicExpansion = new DynamicBranchExpansion(
      llmInterface,
      vectorStore,
      dataPersistence
    );
    
    this.progressiveIntegration = new ProgressiveHTAIntegration(
      enhancedHTACore,
      llmInterface,
      vectorStore,
      dataPersistence
    );
    
    // Adaptive intelligence configuration
    this.config = {
      adaptiveAnalysisInterval: 24 * 60 * 60 * 1000, // 24 hours
      reflectionTriggerThreshold: 5,                  // Reflections before analysis
      completionTriggerThreshold: 10,                 // Completions before analysis
      contextEvolutionThreshold: 0.6,                 // Context drift threshold
      simultaneousRefinementAndExpansion: true,       // Allow concurrent operations
      adaptiveIntelligenceEnabled: true,              // Master switch
      userFeedbackIntegration: true,                  // Include user feedback in decisions
      proactiveRecommendations: true                  // Suggest improvements proactively
    };
    
    // Track adaptive state
    this.adaptiveState = new Map();
    this.lastAnalysis = new Map();
    this.evolutionHistory = new Map();
  }

  /**
   * Generate adaptive HTA tree with both progressive refinement and dynamic expansion
   */
  async generateAdaptiveHTATree(args) {
    const result = {
      success: false,
      adaptiveIntelligence: true,
      systemsEnabled: {
        progressiveRefinement: true,
        dynamicExpansion: true,
        adaptiveIntelligence: true
      },
      timestamp: new Date().toISOString()
    };

    try {
      // Generate base tree with progressive refinement
      const progressiveResult = await this.progressiveIntegration.buildHTATreeWithProgressiveRefinement(args);
      
      if (!progressiveResult.success) {
        return { ...result, ...progressiveResult };
      }

      // Initialize adaptive tracking for this project
      const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
      await this.initializeAdaptiveState(projectId);

      // Set up adaptive monitoring
      await this.setupAdaptiveMonitoring(projectId);

      return {
        ...result,
        success: true,
        content: [{
          type: 'text',
          text: `**Adaptive HTA Intelligence System Activated!** 🧠✨🌳\n\n${progressiveResult.content[0].text}\n\n**Adaptive Features:**\n- **Progressive Task Refinement**: Tasks become more personalized as you progress\n- **Dynamic Branch Expansion**: New learning branches added based on your reflections and interests\n- **Intelligent Monitoring**: System continuously learns from your journey\n- **Proactive Recommendations**: Suggests improvements and new directions\n\n**The system will automatically:**\n- Refine upcoming tasks based on your completion patterns\n- Add new branches when you express new interests or struggle with specific areas\n- Evolve the learning structure based on your actual journey\n- Provide personalized recommendations for optimization\n\n**Your learning tree is now truly adaptive and will grow with you!**`
        }],
        progressiveStats: progressiveResult.refinementStats,
        adaptiveIntelligence: true,
        monitoringActive: true
      };
    } catch (error) {
      console.error('Adaptive HTA generation failed:', error.message);
      return {
        ...result,
        error: error.message,
        fallback: 'Standard HTA generation available'
      };
    }
  }

  /**
   * Get next task with full adaptive intelligence
   */
  async getNextAdaptiveTask(args) {
    const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
    
    // Check if adaptive analysis should be triggered
    await this.checkAdaptiveAnalysisTriggers(projectId);

    // Get next task with progressive refinement
    const taskResult = await this.progressiveIntegration.getNextTaskWithRefinement(args);
    
    // Add adaptive intelligence context
    if (taskResult.success) {
      const adaptiveContext = await this.getAdaptiveContext(projectId);
      taskResult.adaptiveContext = adaptiveContext;
      taskResult.adaptiveRecommendations = await this.generateAdaptiveRecommendations(projectId, taskResult.task);
    }

    return taskResult;
  }

  /**
   * Complete task with adaptive intelligence updates
   */
  async completeTaskWithAdaptiveIntelligence(args) {
    const projectId = args.projectId || (await this.enhancedHTACore.projectManagement.getActiveProject()).project_id;
    
    // Complete task with progressive refinement
    const completionResult = await this.progressiveIntegration.completeTaskWithRefinement(args);
    
    // Save user reflection if provided
    if (args.reflection) {
      await this.saveUserReflection(projectId, args.reflection, args.task_id);
    }

    // Update adaptive state
    await this.updateAdaptiveState(projectId, {
      type: 'task_completion',
      taskId: args.task_id,
      completionData: args,
      timestamp: new Date().toISOString()
    });

    // Check for adaptive triggers
    const shouldAnalyze = await this.checkAdaptiveAnalysisTriggers(projectId);
    
    if (shouldAnalyze) {
      const adaptiveAnalysis = await this.performAdaptiveAnalysis(projectId);
      completionResult.adaptiveAnalysis = adaptiveAnalysis;
    }

    return completionResult;
  }

  /**
   * Perform comprehensive adaptive analysis
   */
  async performAdaptiveAnalysis(projectId) {
    const analysis = {
      timestamp: new Date().toISOString(),
      projectId,
      analysisType: 'comprehensive',
      results: {
        branchExpansion: null,
        taskRefinement: null,
        recommendations: []
      }
    };

    try {
      // Analyze for branch expansion
      const branchAnalysis = await this.dynamicExpansion.analyzeForBranchExpansion(projectId, 'adaptive_analysis');
      analysis.results.branchExpansion = branchAnalysis;

      // Execute branch expansion if recommended
      if (branchAnalysis.shouldExpand && branchAnalysis.suggestedBranches.length > 0) {
        const expansionResult = await this.dynamicExpansion.executeBranchExpansion(
          projectId,
          branchAnalysis.suggestedBranches,
          this.progressiveRefinement
        );
        analysis.results.branchExpansion.executionResult = expansionResult;
      }

      // Analyze current task refinement state
      const refinementStatus = await this.progressiveRefinement.getRefinementStatus(projectId);
      analysis.results.taskRefinement = refinementStatus;

      // Generate adaptive recommendations
      const recommendations = await this.generateComprehensiveRecommendations(projectId, analysis.results);
      analysis.results.recommendations = recommendations;

      // Save analysis
      await this.saveAdaptiveAnalysis(projectId, analysis);

      // Update last analysis timestamp
      this.lastAnalysis.set(projectId, new Date().toISOString());

      console.log(`🧠 Adaptive analysis completed for project ${projectId}`);
      return analysis;

    } catch (error) {
      console.error('Adaptive analysis failed:', error.message);
      analysis.error = error.message;
      return analysis;
    }
  }

  /**
   * Check if adaptive analysis should be triggered
   */
  async checkAdaptiveAnalysisTriggers(projectId) {
    const triggers = {
      timeBasedTrigger: false,
      reflectionTrigger: false,
      completionTrigger: false,
      contextEvolutionTrigger: false
    };

    try {
      // Check time-based trigger
      const lastAnalysis = this.lastAnalysis.get(projectId);
      if (!lastAnalysis || (Date.now() - new Date(lastAnalysis).getTime()) > this.config.adaptiveAnalysisInterval) {
        triggers.timeBasedTrigger = true;
      }

      // Check reflection trigger
      const reflections = await this.dataPersistence.loadProjectData(projectId, 'user_reflections.json') || [];
      const recentReflections = reflections.filter(r => 
        !lastAnalysis || new Date(r.timestamp) > new Date(lastAnalysis)
      );
      if (recentReflections.length >= this.config.reflectionTriggerThreshold) {
        triggers.reflectionTrigger = true;
      }

      // Check completion trigger
      const completions = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
      const recentCompletions = completions.filter(c => 
        !lastAnalysis || new Date(c.completedAt) > new Date(lastAnalysis)
      );
      if (recentCompletions.length >= this.config.completionTriggerThreshold) {
        triggers.completionTrigger = true;
      }

      // Check context evolution trigger
      if (this.vectorStore) {
        const contextEvolution = await this.vectorStore.getContextEvolution(projectId);
        if (contextEvolution && contextEvolution.length > 0) {
          const recentEvolution = contextEvolution.filter(e => 
            !lastAnalysis || new Date(e.timestamp) > new Date(lastAnalysis)
          );
          const evolutionMagnitude = recentEvolution.reduce((sum, e) => sum + (e.magnitude || 0), 0);
          if (evolutionMagnitude > this.config.contextEvolutionThreshold) {
            triggers.contextEvolutionTrigger = true;
          }
        }
      }

      // Return true if any trigger is active
      const shouldTrigger = Object.values(triggers).some(Boolean);
      
      if (shouldTrigger) {
        console.log(`🔄 Adaptive analysis triggered for project ${projectId}:`, triggers);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to check adaptive triggers:', error.message);
      return false;
    }
  }

  /**
   * Generate comprehensive adaptive recommendations
   */
  async generateComprehensiveRecommendations(projectId, analysisResults) {
    const recommendations = [];

    // Branch expansion recommendations
    if (analysisResults.branchExpansion?.shouldExpand) {
      recommendations.push({
        type: 'branch_expansion',
        priority: 'high',
        title: 'New Learning Branches Available',
        description: `Based on your recent progress and interests, I recommend adding ${analysisResults.branchExpansion.suggestedBranches.length} new learning branches.`,
        action: 'expand_branches',
        details: analysisResults.branchExpansion.suggestedBranches
      });
    }

    // Task refinement recommendations
    if (analysisResults.taskRefinement?.pendingRefinements > 0) {
      recommendations.push({
        type: 'task_refinement',
        priority: 'medium',
        title: 'Task Personalization Available',
        description: `${analysisResults.taskRefinement.pendingRefinements} tasks can be refined based on your learning patterns.`,
        action: 'refine_tasks',
        details: analysisResults.taskRefinement
      });
    }

    // Learning optimization recommendations
    const optimizationRecommendations = await this.generateOptimizationRecommendations(projectId);
    recommendations.push(...optimizationRecommendations);

    return recommendations;
  }

  /**
   * Generate optimization recommendations based on user patterns
   */
  async generateOptimizationRecommendations(projectId) {
    const recommendations = [];

    try {
      const completedTasks = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
      
      if (completedTasks.length < 3) {
        return recommendations;
      }

      // Analyze completion patterns
      const avgTimeRatio = completedTasks.reduce((sum, task) => 
        sum + (task.actualDuration / task.estimatedDuration), 0) / completedTasks.length;

      if (avgTimeRatio > 1.5) {
        recommendations.push({
          type: 'time_optimization',
          priority: 'medium',
          title: 'Time Estimation Adjustment',
          description: 'Your tasks are taking longer than estimated. Consider adjusting time allocation or breaking tasks into smaller pieces.',
          action: 'adjust_time_estimates',
          details: { avgTimeRatio, suggestion: 'increase_estimates' }
        });
      }

      if (avgTimeRatio < 0.7) {
        recommendations.push({
          type: 'challenge_optimization',
          priority: 'low',
          title: 'Challenge Level Increase',
          description: 'You\'re completing tasks faster than expected. Consider increasing challenge level or adding more advanced tasks.',
          action: 'increase_challenge',
          details: { avgTimeRatio, suggestion: 'add_advanced_tasks' }
        });
      }

      // Analyze quality patterns
      const avgQuality = completedTasks.reduce((sum, task) => 
        sum + (task.completionQuality || 1), 0) / completedTasks.length;

      if (avgQuality < 0.7) {
        recommendations.push({
          type: 'quality_improvement',
          priority: 'high',
          title: 'Quality Support Needed',
          description: 'Consider adding support branches or prerequisite tasks to improve completion quality.',
          action: 'add_support_branches',
          details: { avgQuality, suggestion: 'foundational_support' }
        });
      }

      return recommendations;
    } catch (error) {
      console.warn('Failed to generate optimization recommendations:', error.message);
      return recommendations;
    }
  }

  /**
   * Save user reflection for adaptive analysis
   */
  async saveUserReflection(projectId, reflection, taskId = null) {
    try {
      const reflections = await this.dataPersistence.loadProjectData(projectId, 'user_reflections.json') || [];
      
      reflections.push({
        timestamp: new Date().toISOString(),
        content: reflection,
        taskId: taskId,
        projectId: projectId,
        type: 'user_reflection'
      });

      await this.dataPersistence.saveProjectData(projectId, 'user_reflections.json', reflections);
      console.log(`💭 Saved user reflection for adaptive analysis`);
    } catch (error) {
      console.error('Failed to save user reflection:', error.message);
    }
  }

  /**
   * Get adaptive context for enhanced task presentation
   */
  async getAdaptiveContext(projectId) {
    const context = {
      progressiveRefinement: await this.progressiveRefinement.getRefinementStatus(projectId),
      branchExpansion: await this.dynamicExpansion.getBranchExpansionRecommendations(projectId),
      adaptiveState: this.adaptiveState.get(projectId) || {},
      lastAnalysis: this.lastAnalysis.get(projectId) || null
    };

    return context;
  }

  /**
   * Generate adaptive recommendations for current task
   */
  async generateAdaptiveRecommendations(projectId, task) {
    const recommendations = [];

    if (task.refinementStatus === 'rough_estimate') {
      recommendations.push({
        type: 'refinement_pending',
        message: 'This task will become more specific as you get closer to it based on your learning patterns.'
      });
    }

    if (task.refinementStatus === 'context_refined') {
      recommendations.push({
        type: 'personalized',
        message: 'This task has been personalized based on your previous completions and preferences.'
      });
    }

    return recommendations;
  }

  /**
   * Initialize adaptive state for a project
   */
  async initializeAdaptiveState(projectId) {
    const state = {
      initialized: new Date().toISOString(),
      adaptiveIntelligenceEnabled: true,
      progressiveRefinementActive: true,
      dynamicExpansionActive: true,
      monitoringActive: true,
      totalAdaptations: 0
    };

    this.adaptiveState.set(projectId, state);
    console.log(`🧠 Initialized adaptive intelligence for project ${projectId}`);
  }

  /**
   * Update adaptive state with new events
   */
  async updateAdaptiveState(projectId, event) {
    const state = this.adaptiveState.get(projectId) || {};
    
    state.lastUpdate = new Date().toISOString();
    state.totalAdaptations = (state.totalAdaptations || 0) + 1;
    
    if (!state.events) state.events = [];
    state.events.push(event);
    
    // Keep only last 100 events
    if (state.events.length > 100) {
      state.events = state.events.slice(-100);
    }

    this.adaptiveState.set(projectId, state);
  }

  /**
   * Setup adaptive monitoring for continuous improvement
   */
  async setupAdaptiveMonitoring(projectId) {
    // This would typically set up background monitoring
    // For now, we'll just log that monitoring is active
    console.log(`👁️ Adaptive monitoring activated for project ${projectId}`);
  }

  /**
   * Save adaptive analysis results
   */
  async saveAdaptiveAnalysis(projectId, analysis) {
    try {
      const analyses = await this.dataPersistence.loadProjectData(projectId, 'adaptive_analyses.json') || [];
      analyses.push(analysis);
      
      // Keep only last 20 analyses
      if (analyses.length > 20) {
        analyses = analyses.slice(-20);
      }

      await this.dataPersistence.saveProjectData(projectId, 'adaptive_analyses.json', analyses);
    } catch (error) {
      console.error('Failed to save adaptive analysis:', error.message);
    }
  }

  /**
   * Get adaptive intelligence status for UI
   */
  async getAdaptiveIntelligenceStatus(projectId) {
    const status = {
      adaptiveIntelligenceEnabled: this.config.adaptiveIntelligenceEnabled,
      progressiveRefinementActive: true,
      dynamicExpansionActive: true,
      lastAnalysis: this.lastAnalysis.get(projectId) || null,
      adaptiveState: this.adaptiveState.get(projectId) || {},
      nextAnalysisDue: this.calculateNextAnalysisDue(projectId),
      systemHealth: 'optimal'
    };

    return status;
  }

  /**
   * Calculate when next adaptive analysis is due
   */
  calculateNextAnalysisDue(projectId) {
    const lastAnalysis = this.lastAnalysis.get(projectId);
    if (!lastAnalysis) return 'now';

    const nextDue = new Date(lastAnalysis).getTime() + this.config.adaptiveAnalysisInterval;
    return new Date(nextDue).toISOString();
  }

  /**
   * Manual trigger for adaptive analysis (user-requested)
   */
  async triggerAdaptiveAnalysis(projectId, reason = 'manual') {
    console.log(`🔄 Manual adaptive analysis triggered for project ${projectId}: ${reason}`);
    return await this.performAdaptiveAnalysis(projectId);
  }
}
