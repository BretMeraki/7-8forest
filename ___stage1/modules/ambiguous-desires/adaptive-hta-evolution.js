/**
 * Adaptive HTA Evolution System
 * Enhances strategy evolution to handle goal rewriting, uncertainty tracking, and adaptive tree rebuilding
 * Allows core goals to be updated as clarity emerges and manages uncertainty throughout the learning process
 */

import { FILE_NAMES, DEFAULT_PATHS } from '../memory-sync.js';
import { guard } from '../../utils/hta-guard.js';
import { HtaCore } from '../hta-core.js';

const EVOLUTION_CONSTANTS = {
  UNCERTAINTY_HIGH_THRESHOLD: 0.7,
  UNCERTAINTY_MEDIUM_THRESHOLD: 0.4,
  UNCERTAINTY_LOW_THRESHOLD: 0.2,
  GOAL_REWRITE_THRESHOLD: 0.6,
  BRANCH_PRUNE_THRESHOLD: 0.3,
  DISCOVERY_TASK_RATIO: 0.3, // 30% of tasks should be exploratory when uncertainty is high
  MIN_CONFIDENCE_FOR_SPECIALIZATION: 0.8,
  MAX_UNCERTAINTY_BRANCHES: 8,
  MIN_UNCERTAINTY_BRANCHES: 3,
  PIVOT_COOLDOWN_HOURS: 24, // Minimum time between major goal rewrites
  ADAPTIVE_DIFFICULTY_FACTOR: 0.8, // Reduce difficulty during high uncertainty
};

export class AdaptiveHTAEvolution {
  constructor(dataPersistence, projectManagement, taskStrategyCore, vectorStore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.taskStrategyCore = taskStrategyCore;
    this.vectorStore = vectorStore;
    this.uncertaintyTracking = new Map(); // Track uncertainty evolution per project

    // Apply HTA guards to mutation methods for runtime validation
    this.saveHTAData = guard('saveHTAData', this.saveHTAData.bind(this));
    this.generateAdaptiveHTA = guard('generateAdaptiveHTA', this.generateAdaptiveHTA.bind(this));
    this.generateNonRedundantDiscoveryTasks = guard('generateNonRedundantDiscoveryTasks', this.generateNonRedundantDiscoveryTasks.bind(this));
  }

  /**
   * Adaptive strategy evolution that can rewrite goals and manage uncertainty
   */
  async adaptiveEvolution(args) {
    const feedback = args.feedback || args.context || '';
    const projectId = args.project_id || args.projectId || null;
    const pathName = args.path_name || args.pathName || null;
    const allowGoalRewrite = args.allow_goal_rewrite !== false; // Default to true
    const uncertaintyLevel = args.uncertainty_level || this.assessFeedbackUncertainty(feedback);

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

      // Load current HTA and uncertainty state
      const htaData = await this.loadPathHTA(activeProjectId, activePath);
      const uncertaintyState = await this.loadUncertaintyState(activeProjectId);

      // Analyze evolution context with uncertainty awareness
      const evolutionContext = await this.analyzeAdaptiveEvolutionNeeds(
        feedback,
        htaData,
        uncertaintyState,
        uncertaintyLevel
      );

      console.error(`🧬 Adaptive evolution for project ${activeProjectId}: ${evolutionContext.evolutionType}`);

      // Handle different evolution types
      let result;
      switch (evolutionContext.evolutionType) {
        case 'goal_rewrite':
          result = await this.handleGoalRewrite(activeProjectId, activePath, evolutionContext, config);
          break;
        
        case 'uncertainty_expansion':
          result = await this.handleUncertaintyExpansion(activeProjectId, activePath, evolutionContext, htaData);
          break;
        
        case 'convergence_refinement':
          result = await this.handleConvergenceRefinement(activeProjectId, activePath, evolutionContext, htaData);
          break;
        
        case 'branch_pruning':
          result = await this.handleBranchPruning(activeProjectId, activePath, evolutionContext, htaData);
          break;
        
        case 'discovery_enhancement':
          result = await this.handleDiscoveryEnhancement(activeProjectId, activePath, evolutionContext, htaData);
          break;
        
        default:
          result = await this.handleStandardEvolution(activeProjectId, activePath, evolutionContext, htaData);
      }

      // Update uncertainty tracking
      await this.updateUncertaintyTracking(activeProjectId, evolutionContext, uncertaintyLevel);

      // Save evolution history
      await this.saveEvolutionHistory(activeProjectId, {
        timestamp: new Date().toISOString(),
        evolutionType: evolutionContext.evolutionType,
        feedback,
        uncertaintyLevel,
        result,
      });

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: this.formatEvolutionResult(result, evolutionContext),
          },
        ],
        evolution_type: evolutionContext.evolutionType,
        uncertainty_level: uncertaintyLevel,
        changes_made: result.changesMade,
        recommendations: result.recommendations,
      };
    } catch (error) {
      console.error('AdaptiveHTAEvolution.adaptiveEvolution failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Adaptive Evolution Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Analyze what type of adaptive evolution is needed
   */
  async analyzeAdaptiveEvolutionNeeds(feedback, htaData, uncertaintyState, uncertaintyLevel) {
    const feedbackLower = (feedback || '').toLowerCase();
    
    // Check for goal rewrite indicators
    const goalRewriteIndicators = [
      'actually want', 'realized', 'changed my mind', 'different goal',
      'not what I thought', 'pivot', 'new direction', 'different focus'
    ];
    
    const hasGoalRewriteSignal = goalRewriteIndicators.some(indicator => 
      feedbackLower.includes(indicator)
    );

    // Check for uncertainty indicators
    const uncertaintyIndicators = [
      'not sure', 'unclear', 'confused', 'lost', 'overwhelming',
      'don\'t know', 'uncertain', 'unsure', 'maybe', 'perhaps'
    ];
    
    const hasUncertaintySignal = uncertaintyIndicators.some(indicator => 
      feedbackLower.includes(indicator)
    );

    // Check for convergence indicators
    const convergenceIndicators = [
      'focused on', 'interested in', 'want to specialize', 'deep dive',
      'concentrate', 'narrow down', 'specific', 'particular'
    ];
    
    const hasConvergenceSignal = convergenceIndicators.some(indicator => 
      feedbackLower.includes(indicator)
    );

    // Check for discovery indicators
    const discoveryIndicators = [
      'explore', 'discover', 'find out', 'learn about', 'try different',
      'experiment', 'see what\'s out there', 'broaden'
    ];
    
    const hasDiscoverySignal = discoveryIndicators.some(indicator => 
      feedbackLower.includes(indicator)
    );

    // Determine evolution type based on signals and uncertainty
    let evolutionType = 'standard_evolution';
    let priority = 1;
    let reasoning = 'Standard strategy evolution';

    if (hasGoalRewriteSignal && uncertaintyLevel < EVOLUTION_CONSTANTS.GOAL_REWRITE_THRESHOLD) {
      evolutionType = 'goal_rewrite';
      priority = 5;
      reasoning = 'Goal rewrite signal detected with sufficient confidence';
    } else if (hasUncertaintySignal || uncertaintyLevel > EVOLUTION_CONSTANTS.UNCERTAINTY_HIGH_THRESHOLD) {
      evolutionType = 'uncertainty_expansion';
      priority = 4;
      reasoning = 'High uncertainty detected - expanding exploration';
    } else if (hasConvergenceSignal && uncertaintyLevel < EVOLUTION_CONSTANTS.UNCERTAINTY_MEDIUM_THRESHOLD) {
      evolutionType = 'convergence_refinement';
      priority = 4;
      reasoning = 'Convergence signal with low uncertainty - time to specialize';
    } else if (hasDiscoverySignal) {
      evolutionType = 'discovery_enhancement';
      priority = 3;
      reasoning = 'Discovery signal - enhancing exploratory tasks';
    } else if (uncertaintyState?.overbranchedBranches?.length > 0) {
      evolutionType = 'branch_pruning';
      priority = 2;
      reasoning = 'Detected irrelevant branches to prune';
    }

    // Analyze current HTA state
    const htaAnalysis = this.analyzeHTAUncertaintyState(htaData);

    return {
      evolutionType,
      priority,
      reasoning,
      uncertaintyLevel,
      htaAnalysis,
      signals: {
        goalRewrite: hasGoalRewriteSignal,
        uncertainty: hasUncertaintySignal,
        convergence: hasConvergenceSignal,
        discovery: hasDiscoverySignal,
      },
      feedback,
    };
  }

  /**
   * Handle goal rewriting when user's true desires become clear
   */
  async handleGoalRewrite(projectId, pathName, evolutionContext, config) {
    const { feedback } = evolutionContext;
    // Extract rich context from config
    const specificInterests = config.specific_interests || [];
    const constraints = config.constraints || {};
    const lifePrefs = config.life_structure_preferences || {};
    const workLifeBalance = config.work_life_balance || {};
    // Extract new goal from feedback, considering rich context
    const newGoal = this.extractContextualGoalFromFeedback(
      feedback, 
      config.goal, 
      specificInterests, 
      constraints,
      workLifeBalance
    );
    // Check cooldown period
    const lastRewrite = await this.getLastGoalRewrite(projectId);
    if (lastRewrite && this.isWithinCooldown(lastRewrite)) {
      return {
        changesMade: ['goal_rewrite_skipped'],
        reasoning: 'Goal rewrite in cooldown period',
        recommendations: ['Wait 24 hours between major goal changes', 'Use regular evolution for incremental changes'],
        newGoal: null,
      };
    }
    // Backup current HTA
    await this.backupCurrentHTA(projectId, pathName);
    // Load old HTA for task salvage
    const oldHTA = await this.loadPathHTA(projectId, pathName);
    // Regenerate strategic branches using htaCore logic
    const htaCore = new HtaCore(this.dataPersistence, this.projectManagement);
    const newBranches = htaCore.deriveStrategicBranches(newGoal.text);
    // Use RAG to find existing tasks that align with new direction and interests
    let existingAlignedTasks = [];
    try {
      if (this.vectorStore && await this.vectorStore.htaExists && await this.vectorStore.htaExists(projectId)) {
        await this.vectorStore.initialize();
        // Enhanced query combining new goal, feedback, and specific interests
        const enrichedQuery = `${newGoal.text} ${feedback} ${specificInterests.join(' ')}`;
        const existingTasks = await this.queryTasksForGoalAlignment(projectId, enrichedQuery, feedback);
        existingAlignedTasks = existingTasks.filter(task => !task.completed);
        // Map salvaged tasks to new branches if possible
        existingAlignedTasks.forEach(task => {
          // Simple heuristic: assign to first branch or by keyword match
          const branch = newBranches.find(b => task.title && b.name && task.title.toLowerCase().includes(b.name.toLowerCase()));
          if (branch) {
            branch.tasks = branch.tasks || [];
            branch.tasks.push(task);
          } else {
            newBranches[0].tasks.push(task); // fallback to first branch
          }
        });
        console.error(`[AdaptiveEvolution] Found ${existingAlignedTasks.length} existing tasks that align with new goal and mapped to new branches`);
      }
    } catch (vectorError) {
      console.error('[AdaptiveEvolution] Vector query for goal alignment failed:', vectorError.message);
    }
    // Update project config with new goal while preserving rich context
    const updatedConfig = {
      ...config,
      goal: newGoal.text,
      previousGoal: config.goal,
      goalRewriteHistory: [
        ...(config.goalRewriteHistory || []),
        {
          from: config.goal,
          to: newGoal.text,
          timestamp: new Date().toISOString(),
          reason: 'adaptive_evolution',
          feedback,
          contextConsidered: {
            specificInterests: specificInterests.length,
            hasConstraints: Object.keys(constraints).length > 0,
            hasLifePrefs: Object.keys(lifePrefs).length > 0
          }
        }
      ],
      lastGoalRewrite: new Date().toISOString(),
    };
    await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.CONFIG, updatedConfig);
    // Build new HTA structure
    const newHTAData = {
      ...oldHTA,
      goal: newGoal.text,
      strategicBranches: newBranches,
      frontierNodes: htaCore.extractTasksFromStrategicBranches(newBranches),
      lastGoalRewrite: new Date().toISOString(),
      previousGoal: config.goal,
      preservedTaskCount: existingAlignedTasks.length,
      contextApplied: {
        specificInterests: specificInterests.length,
        constraints: Object.keys(constraints).length,
        lifePreferences: Object.keys(lifePrefs).length
      }
    };
    // Save new HTA
    await this.saveHTAData(projectId, pathName, newHTAData);
    return {
      changesMade: ['goal_rewritten', 'strategic_branches_regenerated', 'existing_tasks_salvaged', 'context_applied'],
      reasoning: `Goal evolved from "${config.goal}" to "${newGoal.text}". Strategic branches regenerated. Preserved ${existingAlignedTasks.length} aligned tasks and mapped to new branches where possible.`,
      recommendations: [
        'Review your new learning path to ensure it aligns with your true desires and constraints',
        specificInterests.length > 0 ? `Your path now focuses on: ${specificInterests.join(', ')}` : 'Use get_next_task_forest to begin with your refined goal',
        constraints.time_constraints ? `Tasks adapted to your ${constraints.time_constraints} time availability` : 'Monitor progress and provide feedback as your understanding continues to evolve',
        'Your learning environment preferences have been maintained',
      ].filter(Boolean),
      newGoal: newGoal.text,
      previousGoal: config.goal,
      newTaskCount: newHTAData.frontierNodes?.length || 0,
      preservedTaskCount: existingAlignedTasks.length,
      contextApplied: newHTAData.contextApplied
    };
  }

  /**
   * Handle uncertainty expansion by adding exploratory tasks and discovery branches
   */
  async handleUncertaintyExpansion(projectId, pathName, evolutionContext, htaData) {
    const { uncertaintyLevel, htaAnalysis } = evolutionContext;
    
    // Load project config to access rich context
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const specificInterests = config.specific_interests || [];
    const constraints = config.constraints || {};
    const lifePrefs = config.life_structure_preferences || {};
    
    // Generate discovery tasks tailored to specific interests and preferences
    const discoveryTasks = await this.generateContextualDiscoveryTasks(
      projectId, 
      pathName, 
      uncertaintyLevel, 
      specificInterests,
      constraints,
      lifePrefs
    );
    
    // Add uncertainty metadata to existing tasks, considering time constraints
    const updatedTasks = this.addUncertaintyMetadata(htaData.frontierNodes, uncertaintyLevel, constraints);
    
    // Generate exploratory branches based on interests and learning environment
    const exploratoryBranches = this.generateContextualExploratoryBranches(
      htaData, 
      uncertaintyLevel, 
      specificInterests,
      constraints.learning_environment
    );

    // Update HTA with discovery and uncertainty awareness
    const updatedHTA = {
      ...htaData,
      frontierNodes: [...updatedTasks, ...discoveryTasks],
      strategicBranches: [...(htaData.strategicBranches || []), ...exploratoryBranches],
      uncertaintyLevel,
      uncertaintyMode: true,
      contextualExpansion: {
        specificInterests,
        learningEnvironment: constraints.learning_environment,
        timeConstraints: constraints.time_constraints,
        preferredTimes: lifePrefs.preferred_learning_times
      },
      lastUncertaintyUpdate: new Date().toISOString(),
    };

    await this.saveHTAData(projectId, pathName, updatedHTA);

    return {
      changesMade: ['contextual_discovery_tasks_added', 'uncertainty_metadata_added', 'interest_based_branches_added'],
      reasoning: `High uncertainty (${Math.round(uncertaintyLevel * 100)}%) - expanding exploration with personalized context: ${specificInterests.length > 0 ? specificInterests.join(', ') : 'general interests'}`,
      recommendations: [
        'Focus on discovery tasks tailored to your stated interests',
        specificInterests.length > 0 ? `Pay special attention to tasks exploring: ${specificInterests.join(', ')}` : 'Pay attention to what excites you during exploration',
        constraints.learning_environment ? `Tasks adapted for your ${constraints.learning_environment} learning environment` : 'Use clarification dialogue if you need help identifying preferences',
        'Expect some trial and error as you find your direction',
      ].filter(Boolean),
      discoveryTasksAdded: discoveryTasks.length,
      exploratoryBranchesAdded: exploratoryBranches.length,
      uncertaintyLevel,
      specificInterestsConsidered: specificInterests.length,
    };
  }

  /**
   * Handle convergence refinement when interests become clear
   */
  async handleConvergenceRefinement(projectId, pathName, evolutionContext, htaData) {
    const { feedback } = evolutionContext;
    
    // Extract convergent themes from feedback
    const convergentThemes = this.extractConvergentThemes(feedback);
    
    // Prune irrelevant branches
    const relevantBranches = this.identifyRelevantBranches(htaData, convergentThemes);
    const prunedBranches = (htaData.strategicBranches || []).filter(branch => 
      !relevantBranches.includes(branch.name)
    );
    
    // Focus tasks on convergent themes
    const focusedTasks = this.generateFocusedTasks(projectId, pathName, convergentThemes);
    
    // Remove or mark uncertain tasks
    const filteredTasks = htaData.frontierNodes.filter(task => 
      this.isTaskRelevantToThemes(task, convergentThemes)
    );

    const updatedHTA = {
      ...htaData,
      frontierNodes: [...filteredTasks, ...focusedTasks],
      strategicBranches: relevantBranches.map(branchName => 
        htaData.strategicBranches.find(b => b.name === branchName)
      ).filter(Boolean),
      convergentThemes,
      uncertaintyLevel: EVOLUTION_CONSTANTS.UNCERTAINTY_LOW_THRESHOLD,
      convergenceMode: true,
      lastConvergenceUpdate: new Date().toISOString(),
    };

    await this.saveHTAData(projectId, pathName, updatedHTA);

    return {
      changesMade: ['branches_pruned', 'tasks_focused', 'convergence_mode_enabled'],
      reasoning: `Converged on themes: ${convergentThemes.join(', ')}`,
      recommendations: [
        'Focus deeply on your identified interests',
        'Consider setting specialization goals',
        'Build substantial projects in your focus areas',
        'Seek advanced learning opportunities',
      ],
      convergentThemes,
      branchesPruned: prunedBranches.length,
      focusedTasksAdded: focusedTasks.length,
      irrelevantTasksRemoved: htaData.frontierNodes.length - filteredTasks.length,
    };
  }

  /**
   * Handle branch pruning when paths become irrelevant
   */
  async handleBranchPruning(projectId, pathName, evolutionContext, htaData) {
    const { feedback } = evolutionContext;
    
    // Identify branches to prune based on feedback and usage patterns
    const branchesToPrune = this.identifyBranchesToPrune(htaData, feedback);
    
    // Remove tasks from pruned branches
    const remainingTasks = htaData.frontierNodes.filter(task => 
      !branchesToPrune.some(branch => (task.branch || 'General') === branch.name)
    );
    
    // Remove pruned branches
    const remainingBranches = (htaData.strategicBranches || []).filter(branch => 
      !branchesToPrune.some(prunedBranch => branch.name === prunedBranch.name)
    );

    const updatedHTA = {
      ...htaData,
      frontierNodes: remainingTasks,
      strategicBranches: remainingBranches,
      prunedBranches: branchesToPrune.map(b => ({
        ...b,
        prunedAt: new Date().toISOString(),
        reason: 'irrelevant_to_goals',
      })),
      lastPruningUpdate: new Date().toISOString(),
    };

    await this.saveHTAData(projectId, pathName, updatedHTA);

    return {
      changesMade: ['irrelevant_branches_pruned', 'tasks_cleaned'],
      reasoning: `Pruned irrelevant branches: ${branchesToPrune.map(b => b.name).join(', ')}`,
      recommendations: [
        'Focus on your remaining relevant learning paths',
        'Consider adding new branches if needed',
        'Use evolve_strategy again if you want to explore new areas',
      ],
      branchesPruned: branchesToPrune.length,
      tasksRemoved: htaData.frontierNodes.length - remainingTasks.length,
      remainingBranches: remainingBranches.length,
    };
  }

  /**
   * Handle discovery enhancement by adding more exploratory tasks
   */
  async handleDiscoveryEnhancement(projectId, pathName, evolutionContext, htaData) {
    const { feedback } = evolutionContext;
    // Load project config for rich context
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const specificInterests = config.specific_interests || [];
    const constraints = config.constraints || {};
    const lifePrefs = config.life_structure_preferences || {};

    // Use specific_interests as primary discovery areas, fallback to feedback extraction
    const discoveryAreas = specificInterests.length > 0 ? specificInterests : this.extractDiscoveryAreas(feedback);

    // Use RAG to find existing tasks related to discovery areas
    let existingDiscoveryTasks = [];
    let redundantTasksFound = 0;
    try {
      if (this.vectorStore && await this.vectorStore.htaExists && await this.vectorStore.htaExists(projectId)) {
        await this.vectorStore.initialize();
        for (const area of discoveryAreas) {
          const areaQuery = `discover explore ${area} learning research survey investigate`;
          const relatedTasks = await this.queryExistingTasksForArea(projectId, areaQuery);
          const relevantTasks = relatedTasks.filter(task =>
            !task.completed &&
            ((task.branch || 'General') === 'Discovery' || task.discoveryTask ||
             task.description?.toLowerCase().includes(area.toLowerCase()) ||
             task.title?.toLowerCase().includes(area.toLowerCase()))
          );
          existingDiscoveryTasks.push(...relevantTasks);
        }
        const uniqueExistingTasks = existingDiscoveryTasks.filter((task, index, array) =>
          array.findIndex(t => t.id === task.id) === index
        );
        existingDiscoveryTasks = uniqueExistingTasks;
        console.error(`[AdaptiveEvolution] Found ${existingDiscoveryTasks.length} existing discovery tasks for areas: ${discoveryAreas.join(', ')}`);
      }
    } catch (vectorError) {
      console.error('[AdaptiveEvolution] Vector query for discovery tasks failed:', vectorError.message);
    }

    // Generate only non-redundant discovery tasks, passing constraints and preferences for richer context
    const newDiscoveryTasks = await this.generateNonRedundantDiscoveryTasksWithContext(
      projectId,
      pathName,
      discoveryAreas,
      existingDiscoveryTasks,
      constraints,
      lifePrefs
    );
    redundantTasksFound = discoveryAreas.length * 2 - newDiscoveryTasks.length;

    // Add exploration branches if needed (check for existing branches too)
    const existingBranchNames = (htaData.strategicBranches || []).map(b => b.name.toLowerCase());
    const explorationBranches = this.generateExplorationBranches(discoveryAreas).filter(branch =>
      !existingBranchNames.includes(branch.name.toLowerCase())
    );

    const updatedHTA = {
      ...htaData,
      frontierNodes: [...htaData.frontierNodes, ...newDiscoveryTasks],
      strategicBranches: [...(htaData.strategicBranches || []), ...explorationBranches],
      discoveryMode: true,
      discoveryAreas,
      lastDiscoveryUpdate: new Date().toISOString(),
    };

    await this.saveHTAData(projectId, pathName, updatedHTA);

    return {
      changesMade: ['discovery_tasks_added', 'exploration_branches_added', 'redundancy_prevented'],
      reasoning: `Enhanced discovery in areas: ${discoveryAreas.join(', ')}. Prevented ${redundantTasksFound} redundant tasks by leveraging existing discovery work. Used config context for richer personalization.`,
      recommendations: [
        'Explore the new discovery tasks to broaden your understanding',
        'Take note of what excites or interests you most',
        'Don\'t worry about mastery yet - focus on exploration',
        'Provide feedback on discoveries to guide future evolution',
        existingDiscoveryTasks.length > 0 ? 'Consider revisiting your existing discovery tasks before starting new ones' : null,
        specificInterests.length > 0 ? `Tasks are tailored to your interests: ${specificInterests.join(', ')}` : null,
        constraints.learning_environment ? `Tasks adapted for your ${constraints.learning_environment} learning environment` : null
      ].filter(Boolean),
      discoveryTasksAdded: newDiscoveryTasks.length,
      explorationBranchesAdded: explorationBranches.length,
      discoveryAreas,
      existingTasksFound: existingDiscoveryTasks.length,
      redundancyPrevented: redundantTasksFound,
    };
  }

  /**
   * Handle standard evolution as fallback
   */
  async handleStandardEvolution(projectId, pathName, evolutionContext, htaData) {
    // Fall back to existing task strategy evolution
    const result = await this.taskStrategyCore.evolveStrategy({
      feedback: evolutionContext.feedback,
      project_id: projectId,
      path_name: pathName,
    });

    return {
      changesMade: ['standard_evolution_applied'],
      reasoning: 'Applied standard strategy evolution',
      recommendations: result.content?.[0]?.text ? [result.content[0].text] : ['Continue with your learning journey'],
      fallbackResult: result,
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Assess feedback uncertainty level
   */
  assessFeedbackUncertainty(feedback) {
    const uncertaintyWords = [
      'maybe', 'perhaps', 'not sure', 'unclear', 'confused', 'lost',
      'don\'t know', 'uncertain', 'unsure', 'might', 'could be',
      'possibly', 'probably', 'seems like', 'I think'
    ];

    const confidenceWords = [
      'definitely', 'certainly', 'absolutely', 'sure', 'confident',
      'exactly', 'precisely', 'clearly', 'obviously', 'definitely'
    ];

    if (!feedback) return 0.5; // Default medium uncertainty

    const feedbackLower = feedback.toLowerCase();
    const uncertaintyCount = uncertaintyWords.filter(word => feedbackLower.includes(word)).length;
    const confidenceCount = confidenceWords.filter(word => feedbackLower.includes(word)).length;

    // Calculate uncertainty score
    let uncertaintyScore = 0.5; // Base uncertainty
    uncertaintyScore += uncertaintyCount * 0.15; // Increase for uncertainty words
    uncertaintyScore -= confidenceCount * 0.2; // Decrease for confidence words

    // Factor in feedback length and specificity
    if (feedback.length < 20) uncertaintyScore += 0.2; // Short feedback = more uncertain
    if (feedback.includes('because') || feedback.includes('specifically')) uncertaintyScore -= 0.1;

    return Math.max(0, Math.min(1, uncertaintyScore));
  }

  /**
   * Extract new goal from feedback
   */
  extractNewGoalFromFeedback(feedback, originalGoal) {
    // Look for goal-indicating phrases
    const goalPatterns = [
      /actually want to (.+?)[\.\!]/i,
      /really interested in (.+?)[\.\!]/i,
      /goal is (.+?)[\.\!]/i,
      /looking to (.+?)[\.\!]/i,
      /want to focus on (.+?)[\.\!]/i,
    ];

    for (const pattern of goalPatterns) {
      const match = feedback.match(pattern);
      if (match) {
        return {
          text: match[1].trim(),
          confidence: 0.8,
          source: 'feedback_extraction',
        };
      }
    }

    // Fallback: use the whole feedback as goal refinement
    return {
      text: `${originalGoal} with focus on ${feedback.substring(0, 100)}`,
      confidence: 0.6,
      source: 'feedback_refinement',
    };
  }

  /**
   * Generate discovery tasks for uncertainty exploration
   */
  async generateDiscoveryTasks(projectId, pathName, uncertaintyLevel) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const baseId = Date.now();
    const taskCount = Math.ceil(uncertaintyLevel * 6); // More tasks for higher uncertainty

    const discoveryTasks = [];
    
    for (let i = 0; i < taskCount; i++) {
      discoveryTasks.push({
        id: `discovery_${baseId}_${i}`,
        title: this.generateDiscoveryTaskTitle(config.goal, i),
        description: this.generateDiscoveryTaskDescription(config.goal, i),
        difficulty: Math.round(EVOLUTION_CONSTANTS.ADAPTIVE_DIFFICULTY_FACTOR * 3), // Easier during uncertainty
        duration: '20 minutes', // Shorter for exploration
        branch: 'Discovery',
        priority: 150 + i, // High priority for discovery
        prerequisites: [],
        learningOutcome: 'Explore and identify interests',
        generated: true,
        discoveryTask: true,
        uncertaintyLevel,
        exploratory: true,
      });
    }

    return discoveryTasks;
  }

  /**
   * Generate discovery task titles
   */
  generateDiscoveryTaskTitle(goal, index) {
    const discoveryTemplates = [
      `Explore different approaches to ${goal}`,
      `Survey the landscape of ${goal}`,
      `Investigate what's possible with ${goal}`,
      `Discover tools and technologies for ${goal}`,
      `Research successful examples of ${goal}`,
      `Find your preferred learning style for ${goal}`,
    ];

    return discoveryTemplates[index % discoveryTemplates.length];
  }

  /**
   * Generate discovery task descriptions
   */
  generateDiscoveryTaskDescription(goal, index) {
    const discoveryDescriptions = [
      `Spend time exploring different methodologies and approaches to achieving ${goal}. Focus on breadth over depth.`,
      `Survey the current landscape, trends, and opportunities related to ${goal}. Look for what excites you.`,
      `Investigate the full range of possibilities and applications for ${goal}. Pay attention to what resonates.`,
      `Discover and experiment with different tools, technologies, and resources available for ${goal}.`,
      `Research successful examples, case studies, and inspiring stories related to ${goal}.`,
      `Experiment with different learning approaches to find what works best for you with ${goal}.`,
    ];

    return discoveryDescriptions[index % discoveryDescriptions.length];
  }

  /**
   * Add uncertainty metadata to tasks
   */
  addUncertaintyMetadata(tasks, uncertaintyLevel, constraints = {}) {
    // Parse time constraints to adjust task duration during uncertainty
    const timeConstraints = constraints.time_constraints || '';
    const hasLimitedTime = timeConstraints.includes('30 minutes') || timeConstraints.includes('limited');
    
    return tasks.map(task => ({
      ...task,
      uncertaintyLevel,
      adaptiveDifficulty: Math.max(1, Math.round(task.difficulty * EVOLUTION_CONSTANTS.ADAPTIVE_DIFFICULTY_FACTOR)),
      // Adjust duration for uncertainty and time constraints
      adaptiveDuration: hasLimitedTime 
        ? this.shortenDurationForUncertainty(task.duration, uncertaintyLevel)
        : task.duration,
      uncertaintyMetadata: {
        originalDifficulty: task.difficulty,
        originalDuration: task.duration,
        adaptedAt: new Date().toISOString(),
        reason: 'uncertainty_adaptation',
        timeConstraintsConsidered: hasLimitedTime,
      },
    }));
  }
  
  /**
   * Shorten task duration during uncertainty periods
   */
  shortenDurationForUncertainty(originalDuration, uncertaintyLevel) {
    const minutes = parseInt(originalDuration.match(/(\d+)/)?.[1] || '25');
    const reductionFactor = 0.7 + (uncertaintyLevel * 0.3); // More reduction for higher uncertainty
    const newMinutes = Math.max(15, Math.round(minutes * reductionFactor));
    return `${newMinutes} minutes`;
  }

  /**
   * Generate exploratory branches for high uncertainty
   */
  generateExploratoryBranches(htaData, uncertaintyLevel) {
    const branches = [];
    const branchCount = Math.ceil(uncertaintyLevel * 4); // More branches for higher uncertainty

    const exploratoryBranchTemplates = [
      { name: 'Discovery', description: 'Explore different possibilities and approaches' },
      { name: 'Experimentation', description: 'Try different tools and methods' },
      { name: 'Research', description: 'Investigate opportunities and examples' },
      { name: 'Exploration', description: 'Broaden understanding and find interests' },
    ];

    for (let i = 0; i < Math.min(branchCount, exploratoryBranchTemplates.length); i++) {
      const template = exploratoryBranchTemplates[i];
      branches.push({
        ...template,
        priority: 100 + i,
        exploratory: true,
        uncertaintyLevel,
        tasks: [],
      });
    }

    return branches;
  }

  /**
   * Extract convergent themes from feedback
   */
  extractConvergentThemes(feedback) {
    const feedbackLower = feedback.toLowerCase();
    const themes = [];

    // Technical themes
    const techThemes = {
      'web development': ['web', 'website', 'frontend', 'backend'],
      'mobile development': ['mobile', 'app', 'ios', 'android'],
      'data science': ['data', 'analytics', 'machine learning', 'ai'],
      'cloud computing': ['cloud', 'aws', 'serverless'],
      'database': ['database', 'sql', 'data storage'],
    };

    // Extract themes
    for (const [theme, keywords] of Object.entries(techThemes)) {
      if (keywords.some(keyword => feedbackLower.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes;
  }

  /**
   * Identify relevant branches based on themes
   */
  identifyRelevantBranches(htaData, themes) {
    const relevantBranches = [];
    
    (htaData.strategicBranches || []).forEach(branch => {
      const branchLower = (branch.name + ' ' + (branch.description || '')).toLowerCase();
      
      if (themes.some(theme => branchLower.includes(theme.toLowerCase()))) {
        relevantBranches.push(branch.name);
      }
    });

    return relevantBranches;
  }

  /**
   * Check if task is relevant to convergent themes
   */
  isTaskRelevantToThemes(task, themes) {
    const taskText = (task.title + ' ' + task.description + ' ' + (task.branch || 'General')).toLowerCase();
    
    return themes.some(theme => taskText.includes(theme.toLowerCase()));
  }

  /**
   * Generate focused tasks for convergent themes
   */
  generateFocusedTasks(projectId, pathName, themes) {
    const tasks = [];
    const baseId = Date.now();

    themes.forEach((theme, index) => {
      tasks.push({
        id: `focused_${theme.replace(/\s+/g, '_')}_${baseId}`,
        title: `Deep Dive into ${theme}`,
        description: `Focus intensively on ${theme} concepts and practical applications`,
        difficulty: 4, // Higher difficulty for focused learning
        duration: '45 minutes',
        branch: 'Specialization',
        priority: 50 + index, // High priority for convergent tasks
        prerequisites: [],
        learningOutcome: `Advanced understanding of ${theme}`,
        generated: true,
        convergentTask: true,
        focusTheme: theme,
      });
    });

    return tasks;
  }

  /**
   * Analyze HTA uncertainty state
   */
  analyzeHTAUncertaintyState(htaData) {
    if (!htaData) return { uncertainty: 'no_data' };

    const tasks = htaData.frontierNodes || [];
    const branches = htaData.strategicBranches || [];

    return {
      totalTasks: tasks.length,
      totalBranches: branches.length,
      discoveryTasks: tasks.filter(t => t.discoveryTask).length,
      uncertaintyMode: htaData.uncertaintyMode || false,
      convergenceMode: htaData.convergenceMode || false,
      lastUncertaintyUpdate: htaData.lastUncertaintyUpdate,
    };
  }

  /**
   * Load uncertainty state for a project
   */
  async loadUncertaintyState(projectId) {
    try {
      const uncertaintyData = await this.dataPersistence.loadProjectData(projectId, 'uncertainty_state.json');
      return uncertaintyData || { uncertaintyLevel: 0.5, lastUpdate: null };
    } catch (error) {
      return { uncertaintyLevel: 0.5, lastUpdate: null };
    }
  }

  /**
   * Update uncertainty tracking
   */
  async updateUncertaintyTracking(projectId, evolutionContext, uncertaintyLevel) {
    const uncertaintyState = {
      uncertaintyLevel,
      lastUpdate: new Date().toISOString(),
      evolutionType: evolutionContext.evolutionType,
      history: [
        ...(await this.loadUncertaintyState(projectId)).history || [],
        {
          timestamp: new Date().toISOString(),
          uncertaintyLevel,
          evolutionType: evolutionContext.evolutionType,
          reasoning: evolutionContext.reasoning,
        }
      ].slice(-10), // Keep last 10 entries
    };

    await this.dataPersistence.saveProjectData(projectId, 'uncertainty_state.json', uncertaintyState);
    this.uncertaintyTracking.set(projectId, uncertaintyState);
  }

  /**
   * Save evolution history
   */
  async saveEvolutionHistory(projectId, evolution) {
    try {
      const historyData = await this.dataPersistence.loadProjectData(projectId, 'evolution_history.json') || { evolutions: [] };
      historyData.evolutions.push(evolution);
      
      // Keep last 20 evolutions
      if (historyData.evolutions.length > 20) {
        historyData.evolutions = historyData.evolutions.slice(-20);
      }
      
      await this.dataPersistence.saveProjectData(projectId, 'evolution_history.json', historyData);
    } catch (error) {
      console.error('Failed to save evolution history:', error.message);
    }
  }

  /**
   * Load path HTA data
   */
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

  /**
   * Save HTA data with vector store sync
   */
  async saveHTAData(projectId, pathName, htaData) {
    // Save to traditional storage
    await this.dataPersistence.savePathData(projectId, pathName, FILE_NAMES.HTA, htaData);
    
    // Sync to vector store if available
    try {
      if (this.vectorStore) {
        await this.vectorStore.storeHTATree(projectId, htaData);
        console.error(`📊 Adaptive HTA stored in vector database for project: ${projectId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync adaptive HTA to vector store:', error.message);
    }
  }

  /**
   * Format evolution result for user
   */
  formatEvolutionResult(result, evolutionContext) {
    const { evolutionType, uncertaintyLevel } = evolutionContext;
    const { changesMade, reasoning, recommendations } = result;

    let report = `**🧬 Adaptive Evolution Complete**\n\n`;
    report += `**Evolution Type**: ${evolutionType.replace(/_/g, ' ').toUpperCase()}\n`;
    report += `**Uncertainty Level**: ${Math.round(uncertaintyLevel * 100)}%\n\n`;
    report += `**Changes Made**:\n${changesMade.map(change => `• ${change.replace(/_/g, ' ')}`).join('\n')}\n\n`;
    report += `**Reasoning**: ${reasoning}\n\n`;
    report += `**Recommendations**:\n${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}\n\n`;
    report += `*Your learning path has been adapted to better match your evolving understanding!*`;

    return report;
  }

  // Additional utility methods for various helper functions
  getLastGoalRewrite(projectId) {
    // Implementation to check last goal rewrite timestamp
    return null; // Placeholder
  }

  isWithinCooldown(lastRewrite) {
    const cooldownMs = EVOLUTION_CONSTANTS.PIVOT_COOLDOWN_HOURS * 60 * 60 * 1000;
    return Date.now() - new Date(lastRewrite).getTime() < cooldownMs;
  }

  async backupCurrentHTA(projectId, pathName) {
    // Implementation to backup current HTA before major changes
    console.error(`📋 Backing up HTA for project ${projectId}, path ${pathName}`);
  }

  async generateAdaptiveHTA(projectId, pathName, newGoal, evolutionContext, existingAlignedTasks = []) {
    // Generate new HTA based on refined goal, incorporating aligned existing tasks
    const preservedTasks = existingAlignedTasks.map(task => ({
      ...task,
      preserved: true,
      preservedFrom: 'goal_rewrite',
      preservedAt: new Date().toISOString()
    }));

    return {
      goal: newGoal.text,
      frontierNodes: preservedTasks,
      strategicBranches: [],
      generated: true,
      adaptiveGeneration: true,
      source: 'adaptive_evolution',
      preservedTaskCount: preservedTasks.length
    };
  }

  identifyBranchesToPrune(htaData, feedback) {
    // Identify branches that are no longer relevant
    return [];
  }

  extractDiscoveryAreas(feedback) {
    // Extract areas of interest for discovery enhancement  
    const feedbackLower = feedback.toLowerCase();
    const areas = [];
    
    // Look for explicit area mentions
    const areaKeywords = [
      'programming', 'coding', 'development', 'design', 'art', 'music', 
      'writing', 'business', 'marketing', 'science', 'research', 'health',
      'fitness', 'cooking', 'language', 'travel', 'photography', 'gaming'
    ];
    
    for (const keyword of areaKeywords) {
      if (feedbackLower.includes(keyword)) {
        areas.push(keyword);
      }
    }
    
    // Default if no specific areas found
    if (areas.length === 0) {
      areas.push('general_exploration');
    }
    
    return areas.slice(0, 3); // Limit to 3 areas
  }

  async generateTargetedDiscoveryTasks(projectId, pathName, discoveryAreas) {
    // This method is now replaced by generateNonRedundantDiscoveryTasks
    return [];
  }

  generateExplorationBranches(discoveryAreas) {
    return discoveryAreas.map(area => ({
      name: `${area} Exploration`,
      description: `Exploratory learning path for discovering ${area}`,
      priority: 100, // High priority for exploration
      tasks: [],
      exploratory: true,
      discoveryArea: area,
    }));
  }

  /**
   * Query existing tasks for goal alignment using vector similarity
   */
  async queryTasksForGoalAlignment(projectId, newGoal, feedback) {
    try {
      // Create a query that combines new goal and feedback context
      const alignmentQuery = `${newGoal} ${feedback} goal direction focus interest`;
      
      // Use embedding service to create query vector
      const embeddingService = await import('../../utils/embedding-service.js');
      const queryVector = await embeddingService.default.embedText(alignmentQuery);
      
      // Query vector store for semantically similar tasks
      const results = await this.vectorStore.provider.queryVectors(queryVector, {
        limit: 50,
        threshold: 0.3,
        filter: {
          must: [
            { key: 'project_id', match: { value: projectId } },
            { key: 'type', match: { value: 'task' } }
          ]
        }
      });
      
      // Convert results to task format
      return results.map(result => ({
        id: result.metadata.task_id || result.id.split(':').pop(),
        title: result.metadata.title,
        description: result.metadata.description,
        branch: result.metadata.branch,
        priority: result.metadata.priority,
        difficulty: result.metadata.difficulty,
        duration: result.metadata.duration,
        prerequisites: result.metadata.prerequisites,
        learningOutcome: result.metadata.learning_outcome,
        completed: result.metadata.completed,
        generated: result.metadata.generated,
        similarity: result.similarity,
        embedding: result.vector
      }));
      
    } catch (error) {
      console.error('[AdaptiveEvolution] Goal alignment query failed:', error.message);
      return [];
    }
  }

  /**
   * Query existing tasks for a specific area using vector similarity
   */
  async queryExistingTasksForArea(projectId, areaQuery) {
    try {
      // Use embedding service to create query vector
      const embeddingService = await import('../../utils/embedding-service.js');
      const queryVector = await embeddingService.default.embedText(areaQuery);
      
      // Query vector store for semantically similar tasks
      const results = await this.vectorStore.provider.queryVectors(queryVector, {
        limit: 30,
        threshold: 0.25,
        filter: {
          must: [
            { key: 'project_id', match: { value: projectId } },
            { key: 'type', match: { value: 'task' } }
          ]
        }
      });
      
      // Convert results to task format
      return results.map(result => ({
        id: result.metadata.task_id || result.id.split(':').pop(),
        title: result.metadata.title,
        description: result.metadata.description,
        branch: result.metadata.branch,
        priority: result.metadata.priority,
        difficulty: result.metadata.difficulty,
        duration: result.metadata.duration,
        prerequisites: result.metadata.prerequisites,
        learningOutcome: result.metadata.learning_outcome,
        completed: result.metadata.completed,
        generated: result.metadata.generated,
        discoveryTask: result.metadata.discovery_task || result.metadata.discoveryTask,
        similarity: result.similarity,
        embedding: result.vector
      }));
      
    } catch (error) {
      console.error('[AdaptiveEvolution] Area query failed:', error.message);
      return [];
    }
  }

  /**
   * Generate discovery tasks that don't duplicate existing ones
   */
  async generateNonRedundantDiscoveryTasks(projectId, pathName, discoveryAreas, existingTasks) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const baseId = Date.now();
    const newTasks = [];
    
    // Create a set of existing task signatures for comparison
    const existingSignatures = new Set(
      existingTasks.map(task => 
        `${task.title?.toLowerCase() || ''}_${task.description?.toLowerCase().substring(0, 50) || ''}`
      )
    );
    
    for (let areaIndex = 0; areaIndex < discoveryAreas.length; areaIndex++) {
      const area = discoveryAreas[areaIndex];
      
      // Generate 2-3 tasks per area, checking for redundancy
      for (let i = 0; i < 2; i++) {
        const taskId = `discovery_${baseId}_${areaIndex}_${i}`;
        const title = this.generateAreaSpecificDiscoveryTitle(area, config.goal, i);
        const description = this.generateAreaSpecificDiscoveryDescription(area, config.goal, i);
        
        // Check if this task would be redundant
        const signature = `${title.toLowerCase()}_${description.toLowerCase().substring(0, 50)}`;
        
        if (!existingSignatures.has(signature)) {
          newTasks.push({
            id: taskId,
            title,
            description,
            difficulty: 2, // Easy for discovery
            duration: '25 minutes',
            branch: 'Discovery',
            priority: 120 + (areaIndex * 10) + i,
            prerequisites: [],
            learningOutcome: `Discover interests and possibilities in ${area}`,
            generated: true,
            discoveryTask: true,
            discoveryArea: area,
            exploratory: true,
          });
          
          // Add signature to prevent duplicates within this generation
          existingSignatures.add(signature);
        }
      }
    }
    
    return newTasks;
  }

  /**
   * Generate area-specific discovery task titles
   */
  generateAreaSpecificDiscoveryTitle(area, goal, index) {
    const templates = [
      `Survey the ${area} landscape for ${goal}`,
      `Explore ${area} opportunities and approaches`,
      `Investigate ${area} tools and techniques`,
      `Discover ${area} best practices and examples`,
      `Research ${area} learning paths and resources`,
    ];
    
    return templates[index % templates.length];
  }

  /**
   * Generate area-specific discovery task descriptions
   */
  generateAreaSpecificDiscoveryDescription(area, goal, index) {
    const templates = [
      `Conduct a broad survey of the ${area} field as it relates to ${goal}. Focus on understanding the scope and possibilities rather than deep learning.`,
      `Explore different approaches, methodologies, and opportunities within ${area} that could support your ${goal}. Look for what resonates with you.`,
      `Investigate the tools, technologies, and techniques commonly used in ${area}. Try a few to see what feels natural and interesting.`,
      `Discover best practices, successful examples, and inspiring case studies in ${area} related to ${goal}. Pay attention to what excites you.`,
      `Research learning paths, educational resources, and community spaces for ${area}. Find your preferred way to engage with this domain.`,
    ];
    
    return templates[index % templates.length];
  }

  /**
   * Generate contextual discovery tasks tailored to specific interests and preferences
   */
  async generateContextualDiscoveryTasks(projectId, pathName, uncertaintyLevel, specificInterests, constraints, lifePrefs) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const baseId = Date.now();
    const taskCount = Math.ceil(uncertaintyLevel * (specificInterests.length > 0 ? 4 : 6));
    
    const discoveryTasks = [];
    
    // If user has specific interests, tailor discovery tasks to those
    if (specificInterests.length > 0) {
      for (let i = 0; i < specificInterests.length && discoveryTasks.length < taskCount; i++) {
        const interest = specificInterests[i];
        discoveryTasks.push({
          id: `contextual_discovery_${baseId}_${i}`,
          title: `Explore ${interest} in context of ${config.goal}`,
          description: `Deep dive into how ${interest} connects to your goal of ${config.goal}. ${this.getInterestBasedDiscoveryDescription(interest, constraints.learning_environment)}`,
          difficulty: Math.round(EVOLUTION_CONSTANTS.ADAPTIVE_DIFFICULTY_FACTOR * 2),
          duration: this.getAdaptiveDuration(constraints, '25 minutes'),
          branch: 'Interest Discovery',
          priority: 140 + i,
          prerequisites: [],
          learningOutcome: `Clarify how ${interest} fits into your learning journey`,
          generated: true,
          discoveryTask: true,
          contextualTask: true,
          specificInterest: interest,
          uncertaintyLevel,
        });
      }
    }
    
    // Add general discovery tasks if we haven't reached the target count
    const remainingTasks = taskCount - discoveryTasks.length;
    for (let i = 0; i < remainingTasks; i++) {
      discoveryTasks.push({
        id: `contextual_discovery_general_${baseId}_${i}`,
        title: this.generateDiscoveryTaskTitle(config.goal, i),
        description: this.enhanceDiscoveryDescription(config.goal, i, constraints.learning_environment),
        difficulty: Math.round(EVOLUTION_CONSTANTS.ADAPTIVE_DIFFICULTY_FACTOR * 3),
        duration: this.getAdaptiveDuration(constraints, '20 minutes'),
        branch: 'Discovery',
        priority: 150 + i,
        prerequisites: [],
        learningOutcome: 'Explore and identify interests',
        generated: true,
        discoveryTask: true,
        contextualTask: true,
        uncertaintyLevel,
      });
    }
    
    return discoveryTasks;
  }

  /**
   * Generate contextual exploratory branches based on interests and learning environment
   */
  generateContextualExploratoryBranches(htaData, uncertaintyLevel, specificInterests, learningEnvironment) {
    const branches = [];
    
    // Create interest-specific branches if user has specific interests
    if (specificInterests.length > 0) {
      specificInterests.forEach((interest, index) => {
        branches.push({
          name: `${interest} Exploration`,
          description: `Explore how ${interest} connects to your learning goals`,
          priority: 120 + index,
          exploratory: true,
          interestBased: true,
          specificInterest: interest,
          uncertaintyLevel,
          tasks: [],
        });
      });
    }
    
    // Add environment-adapted exploratory branches
    const environmentBranches = this.getEnvironmentAdaptedBranches(learningEnvironment, uncertaintyLevel);
    branches.push(...environmentBranches);
    
    return branches;
  }

  /**
   * Extract contextual goal from feedback considering rich context
   */
  extractContextualGoalFromFeedback(feedback, originalGoal, specificInterests, constraints, workLifeBalance) {
    // First try standard goal extraction
    const standardGoal = this.extractNewGoalFromFeedback(feedback, originalGoal);
    
    // Enhance with contextual information
    let enhancedGoal = standardGoal.text;
    
    // If goal seems generic and user has specific interests, suggest focusing
    if (specificInterests.length > 0 && enhancedGoal.length < 50) {
      enhancedGoal = `${enhancedGoal} with focus on ${specificInterests.slice(0, 2).join(' and ')}`;
    }
    
    // Consider time constraints in goal formulation
    if (constraints.time_constraints && constraints.time_constraints.includes('limited')) {
      enhancedGoal = `${enhancedGoal} (adapted for limited time availability)`;
    }
    
    // Consider work-life balance
    if (workLifeBalance.current_situation === 'high_stress') {
      enhancedGoal = `${enhancedGoal} (prioritizing manageable learning pace)`;
    }
    
    return {
      text: enhancedGoal,
      confidence: standardGoal.confidence + (specificInterests.length > 0 ? 0.1 : 0),
      source: 'contextual_feedback_extraction',
      contextApplied: {
        specificInterests: specificInterests.length > 0,
        timeConstraints: !!constraints.time_constraints,
        workLifeBalance: !!workLifeBalance.current_situation
      }
    };
  }

  /**
   * Generate contextual adaptive HTA with rich context
   */
  async generateContextualAdaptiveHTA(projectId, pathName, newGoal, evolutionContext, existingAlignedTasks, config) {
    const preservedTasks = existingAlignedTasks.map(task => ({
      ...task,
      preserved: true,
      preservedFrom: 'contextual_goal_rewrite',
      preservedAt: new Date().toISOString()
    }));

    // Generate new tasks that consider the rich context
    const contextualTasks = await this.generateContextBasedTasks(
      newGoal,
      config.specific_interests || [],
      config.constraints || {},
      config.life_structure_preferences || {}
    );

    return {
      goal: newGoal.text,
      frontierNodes: [...preservedTasks, ...contextualTasks],
      strategicBranches: this.generateContextualBranches(newGoal, config),
      generated: true,
      adaptiveGeneration: true,
      contextualGeneration: true,
      source: 'contextual_adaptive_evolution',
      preservedTaskCount: preservedTasks.length,
      contextualTaskCount: contextualTasks.length,
      contextApplied: {
        specificInterests: config.specific_interests?.length || 0,
        constraints: Object.keys(config.constraints || {}).length,
        lifePreferences: Object.keys(config.life_structure_preferences || {}).length
      }
    };
  }

  // Additional helper methods
  getInterestBasedDiscoveryDescription(interest, learningEnvironment) {
    const envSuffix = learningEnvironment === 'quiet' 
      ? 'Focus on self-directed research and reflection.'
      : learningEnvironment === 'collaborative'
      ? 'Consider finding communities or discussion groups related to this interest.'
      : 'Use whatever learning approach feels most natural.';
    
    return `Look for connections, opportunities, and practical applications. ${envSuffix}`;
  }

  getAdaptiveDuration(constraints, defaultDuration) {
    if (constraints.time_constraints?.includes('30 minutes')) {
      return '20 minutes';
    } else if (constraints.time_constraints?.includes('limited')) {
      return '15 minutes';
    }
    return defaultDuration;
  }

  enhanceDiscoveryDescription(goal, index, learningEnvironment) {
    const baseDescription = this.generateDiscoveryTaskDescription(goal, index);
    
    if (learningEnvironment === 'quiet') {
      return `${baseDescription} Focus on individual research and deep thinking.`;
    } else if (learningEnvironment === 'collaborative') {
      return `${baseDescription} Consider engaging with communities and seeking diverse perspectives.`;
    }
    return baseDescription;
  }

  getEnvironmentAdaptedBranches(learningEnvironment, uncertaintyLevel) {
    const branches = [];
    
    if (learningEnvironment === 'collaborative') {
      branches.push({
        name: 'Community Discovery',
        description: 'Explore learning through community engagement and collaboration',
        priority: 110,
        exploratory: true,
        environmentAdapted: true,
        uncertaintyLevel,
        tasks: [],
      });
    } else if (learningEnvironment === 'quiet') {
      branches.push({
        name: 'Independent Research',
        description: 'Deep, focused exploration through individual study and reflection',
        priority: 110,
        exploratory: true,
        environmentAdapted: true,
        uncertaintyLevel,
        tasks: [],
      });
    }
    
    return branches;
  }

  async generateContextBasedTasks(newGoal, specificInterests, constraints, lifePrefs) {
    // Generate a few tasks that specifically leverage the user's context
    const tasks = [];
    const baseId = Date.now();
    
    specificInterests.forEach((interest, index) => {
      tasks.push({
        id: `context_task_${baseId}_${index}`,
        title: `Apply ${interest} to ${newGoal.text}`,
        description: `Explore how your interest in ${interest} can accelerate progress toward ${newGoal.text}`,
        difficulty: 3,
        duration: this.getAdaptiveDuration(constraints, '30 minutes'),
        branch: 'Interest Application',
        priority: 80 + index,
        prerequisites: [],
        learningOutcome: `Understand how ${interest} supports your learning goals`,
        generated: true,
        contextual: true,
        specificInterest: interest,
      });
    });
    
    return tasks;
  }

  generateContextualBranches(newGoal, config) {
    const branches = [];
    const specificInterests = config.specific_interests || [];
    
    // Create branches based on specific interests
    specificInterests.forEach((interest, index) => {
      branches.push({
        name: `${interest} Application`,
        description: `Apply ${interest} knowledge and skills to achieve ${newGoal.text}`,
        priority: index + 1,
        tasks: [],
        interestBased: true,
        specificInterest: interest,
      });
    });
    
    return branches;
  }

  // Add a new helper for richer discovery task generation
  async generateNonRedundantDiscoveryTasksWithContext(projectId, pathName, discoveryAreas, existingTasks, constraints, lifePrefs) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const baseId = Date.now();
    const newTasks = [];
    const existingSignatures = new Set(
      existingTasks.map(task =>
        `${task.title?.toLowerCase() || ''}_${task.description?.toLowerCase().substring(0, 50) || ''}`
      )
    );
    for (let areaIndex = 0; areaIndex < discoveryAreas.length; areaIndex++) {
      const area = discoveryAreas[areaIndex];
      for (let i = 0; i < 2; i++) {
        const taskId = `discovery_${baseId}_${areaIndex}_${i}`;
        const title = this.generateAreaSpecificDiscoveryTitle(area, config.goal, i);
        // Add context to description
        let description = this.generateAreaSpecificDiscoveryDescription(area, config.goal, i);
        if (constraints.learning_environment) {
          description += ` (Learning environment: ${constraints.learning_environment})`;
        }
        if (lifePrefs.focus_duration) {
          description += ` (Recommended focus: ${lifePrefs.focus_duration})`;
        }
        const signature = `${title.toLowerCase()}_${description.toLowerCase().substring(0, 50)}`;
        if (!existingSignatures.has(signature)) {
          newTasks.push({
            id: taskId,
            title,
            description,
            difficulty: 2,
            duration: '25 minutes',
            branch: 'Discovery',
            priority: 120 + (areaIndex * 10) + i,
            prerequisites: [],
            learningOutcome: `Discover interests and possibilities in ${area}`,
            generated: true,
            discoveryTask: true,
            discoveryArea: area,
            exploratory: true,
            contextPersonalized: true
          });
          existingSignatures.add(signature);
        }
      }
    }
    return newTasks;
  }
}