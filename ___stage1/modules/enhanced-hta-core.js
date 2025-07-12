/**
 * Enhanced HTA Core - Integrates Pure Schema-Driven Intelligence
 * 
 * Synthesizes the Pure Schema-Driven HTA System with existing HTA Core
 * to provide intelligent, context-aware, domain-agnostic tree building.
 */

import { HTACore } from './hta-core.js';
import { PureSchemaHTASystem } from './pure-schema-driven-hta.js';
import { GoalAchievementContext } from './goal-achievement-context.js';

export class EnhancedHTACore extends HTACore {
  constructor(dataPersistence, projectManagement, claudeInterface) {
    super(dataPersistence, projectManagement, claudeInterface);
    
    // Initialize Pure Schema-Driven Intelligence Engine
    this.schemaEngine = new PureSchemaHTASystem(claudeInterface);
    
    // Initialize Goal Achievement Context Engine  
    this.goalAchievementContext = new GoalAchievementContext(
      this.dataPersistence?.dataDir || '.forest-data',
      claudeInterface
    );
    
    // Track user interactions for context learning
    this.userInteractions = [];
    this.contextLearningEnabled = true;
    
    // Expose vector store from parent class vector integration
    this.vectorStore = null;
    
    // Initialize Gated Onboarding Flow
    this.gatedOnboardingFlow = null; // Will be initialized when needed
    
    // Initialize Next + Pipeline Presenter
    this.nextPipelinePresenter = null; // Will be initialized when needed
    
    console.error('✅ Enhanced HTA Core initialized with Schema-Driven Intelligence');
  }

  /**
   * Initialize vector store connection
   */
  async initializeVectorStore() {
    try {
      if (!this.vectorStore && this.vectorIntegration) {
        const status = await this.vectorIntegration.ensureVectorStore(this.dataPersistence);
        if (status.success && status.instance) {
          this.vectorStore = status.instance;
          console.error('✅ Vector store connected to Enhanced HTA Core');
          return this.vectorStore;
        }
      }
      return this.vectorStore;
    } catch (error) {
      console.error('⚠️ Vector store initialization failed:', error.message);
      return null;
    }
  }

  /**
   * Initialize gated onboarding flow (lazy initialization)
   */
  async initializeGatedOnboarding() {
    if (!this.gatedOnboardingFlow) {
      const { GatedOnboardingFlow } = await import('./gated-onboarding-flow.js');
      this.gatedOnboardingFlow = new GatedOnboardingFlow(
        this.dataPersistence,
        this.projectManagement,
        this, // Enhanced HTA Core as htaCore
        this.claudeInterface,
        this.vectorStore
      );
      console.error('✅ Gated Onboarding Flow initialized');
    }
    return this.gatedOnboardingFlow;
  }

  /**
   * Initialize Next + Pipeline Presenter (lazy initialization)
   */
  async initializeNextPipelinePresenter() {
    if (!this.nextPipelinePresenter) {
      const { NextPipelinePresenter } = await import('./next-pipeline-presenter.js');
      const { TaskStrategyCore } = await import('./task-strategy-core.js');
      
      // Initialize task strategy core if not available
      const taskStrategyCore = new TaskStrategyCore(
        this.dataPersistence,
        this.projectManagement,
        this.claudeInterface
      );
      
      this.nextPipelinePresenter = new NextPipelinePresenter(
        this.dataPersistence,
        this.vectorStore,
        taskStrategyCore,
        this // Enhanced HTA Core as htaCore
      );
      console.error('✅ Next Pipeline Presenter initialized');
    }
    return this.nextPipelinePresenter;
  }

  /**
   * Enhanced buildHTATree using Pure Schema-Driven Intelligence
   */
  async buildHTATree(args) {
    try {
      // Extract parameters
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        throw new Error('No active project found. Please create a project first.');
      }
      
      const projectId = activeProject.project_id;
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const pathName = args.path_name || args.pathName || (config && config.activePath) || 'general';
      const learningStyle = args.learning_style || args.learningStyle || 'mixed';
      const focusAreas = args.focus_areas || args.focusAreas || [];
      const goal = args.goal || config.goal;
      const context = args.context || config.context || '';

      if (!goal) {
        throw new Error('Goal must be provided either in project configuration or as a parameter.');
      }

      // Check for existing HTA
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      if (existingHTA && existingHTA.frontierNodes && existingHTA.frontierNodes.length > 0) {
        return this.formatExistingTreeResponse(existingHTA);
      }

      // Initialize Goal Achievement Context Engine
      await this.goalAchievementContext.initialize();

      // Build initial context for schema engine with accumulated context if available
      const initialContext = {
        learningStyle,
        focusAreas,
        context,
        projectId,
        pathName,
        userConstraints: config.constraints || {},
        lifePreferences: config.life_structure_preferences || {},
        urgency: this.assessUrgency(args, config),
        available_resources: this.assessAvailableResources(config),
        domain_context: await this.buildDomainContext(goal, context, config),
        // CONTEXT SNOWBALL: Include accumulated context from gated onboarding
        accumulated_context: args.accumulated_context || null,
        context_evolution: args.context_evolution || null,
        enhanced_context: args.enhanced_context || null,
        complexity_analysis: args.complexity_analysis || null
      };

      // Generate HTA tree using Pure Schema-Driven Intelligence
      const schemaHTATree = await this.schemaEngine.generateHTATree(goal, initialContext);

      // Convert schema tree to HTA format and enhance with existing systems
      let htaData = await this.convertSchemaTreeToHTAFormat(
        schemaHTATree, 
        projectId, 
        pathName, 
        config,
        initialContext
      );

      // Validate progressive generation - only check what should be generated
      if (htaData.availableDepth >= 3 && (!htaData.level3_taskDecomposition || !htaData.level3_taskDecomposition.length)) {
        console.warn('Level 3 tasks not generated as expected');
      }
      if (htaData.availableDepth >= 4 && (!htaData.level4_microParticles || !htaData.level4_microParticles.length)) {
        console.warn('Level 4 micro-particles not generated as expected');
      }
      if (htaData.availableDepth >= 5 && (!htaData.level5_nanoActions || !htaData.level5_nanoActions.length)) {
        console.warn('Level 5 nano-actions not generated as expected');
      }
      if (htaData.availableDepth >= 6 && (!htaData.level6_contextAdaptivePrimitives || !htaData.level6_contextAdaptivePrimitives.length)) {
        console.warn('Level 6 context-adaptive primitives not generated as expected');
      }

      // Ensure strategic branches and frontier nodes
      if (!htaData.strategicBranches || htaData.strategicBranches.length === 0) {
        // If schema engine failed, try again with more explicit context
        const retryResult = await this.retrySchemaGeneration(goal, initialContext);
        if (retryResult && retryResult.strategicBranches && retryResult.strategicBranches.length > 0) {
          htaData.strategicBranches = retryResult.strategicBranches;
        } else {
          // Only as absolute last resort, use goal-adaptive fallback
          htaData.strategicBranches = await this.generateGoalAdaptiveBranches(goal, initialContext);
        }
      }

      // Ensure frontier nodes are generated
      htaData = this.ensureFrontierNodes(htaData);

      // Save to persistence and vector store
      await this.saveEnhancedHTAData(projectId, pathName, htaData);

      // Track this interaction for context learning
      if (this.contextLearningEnabled) {
        await this.trackTreeGenerationInteraction(args, htaData, schemaHTATree);
      }

      return this.formatSuccessResponse(htaData);

    } catch (error) {
      console.error('Enhanced HTA Tree generation failed:', error);
      return this.formatErrorResponse(error);
    }
  }

  /**
   * Generate deeper levels on demand using schema intelligence
   */
  async generateTaskDecomposition(branchName, branchDescription, projectId, pathName) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      if (!existingHTA) {
        throw new Error('No HTA tree found for decomposition');
      }

      const currentUserContext = await this.buildCurrentUserContext(projectId);
      
      const taskDecomposition = await this.schemaEngine.generateTaskDecomposition(
        branchName,
        branchDescription,
        existingHTA.level1_goalContext,
        currentUserContext
      );

      // Track interaction for learning
      await this.trackDecompositionInteraction(branchName, taskDecomposition, currentUserContext);

      return taskDecomposition;

    } catch (error) {
      console.error('Task decomposition failed:', error);
      throw error;
    }
  }

  /**
   * Generate micro-particles for a specific task
   */
  async generateMicroParticles(taskTitle, taskDescription, projectId, pathName) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      const currentUserContext = await this.buildCurrentUserContext(projectId);

      const microParticles = await this.schemaEngine.generateMicroParticles(
        taskTitle,
        taskDescription,
        existingHTA.level1_goalContext,
        currentUserContext
      );

      // Track for context learning
      await this.trackMicroParticleInteraction(taskTitle, microParticles, currentUserContext);

      return microParticles;

    } catch (error) {
      console.error('Micro-particle generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate nano-actions for maximum granularity
   */
  async generateNanoActions(microTitle, microDescription, projectId, pathName) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      const currentUserContext = await this.buildCurrentUserContext(projectId);

      const nanoActions = await this.schemaEngine.generateNanoActions(
        microTitle,
        microDescription,
        existingHTA.level1_goalContext,
        currentUserContext
      );

      return nanoActions;

    } catch (error) {
      console.error('Nano-action generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate context-adaptive primitives for ultimate granularity
   */
  async generateContextAdaptivePrimitives(nanoTitle, nanoDescription, projectId, pathName) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      const currentUserContext = await this.buildCurrentUserContext(projectId);

      const primitives = await this.schemaEngine.generateContextAdaptivePrimitives(
        nanoTitle,
        nanoDescription,
        existingHTA.level1_goalContext,
        currentUserContext
      );

      return primitives;

    } catch (error) {
      console.error('Context-adaptive primitive generation failed:', error);
      throw error;
    }
  }

  /**
   * Learn from user interactions and evolve tree
   */
  async learnFromUserInteraction(interaction) {
    try {
      if (!this.contextLearningEnabled) return null;

      // Let schema engine learn from interaction
      const evolutionRecommendations = await this.schemaEngine.learnFromUserInteraction(interaction);

      // Store interaction for future learning
      this.userInteractions.push({
        timestamp: new Date().toISOString(),
        interaction,
        evolutionRecommendations
      });

      // Apply tree evolution if recommended
      if (evolutionRecommendations) {
        return await this.applyTreeEvolution(evolutionRecommendations, interaction);
      }

      return null;

    } catch (error) {
      console.error('Learning from user interaction failed:', error);
      return null;
    }
  }

  /**
   * Expand existing HTA tree to deeper levels on-demand
   */
  async expandHTATreeDepth(projectId, pathName, targetDepth, specificBranch = null) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      if (!existingHTA) {
        throw new Error('No HTA tree found to expand');
      }

      // Use schema engine to expand the tree
      const expandedTree = await this.schemaEngine.expandTreeDepth(
        existingHTA,
        targetDepth,
        specificBranch
      );

      // Update the HTA data format with new levels
      const updatedHTAData = await this.convertSchemaTreeToHTAFormat(
        expandedTree,
        projectId,
        pathName,
        {}, // config not needed for expansion
        { expandingExisting: true }
      );

      // Save the expanded tree
      await this.saveEnhancedHTAData(projectId, pathName, updatedHTAData);

      return {
        success: true,
        expandedToDepth: targetDepth,
        canExpandFurther: targetDepth < 6,
        newLevelsGenerated: targetDepth - (existingHTA.availableDepth || 2)
      };

    } catch (error) {
      console.error('Tree expansion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start gated onboarding flow for comprehensive context gathering
   */
  async startGatedOnboarding(initialGoal, userContext = {}) {
    try {
      const onboardingFlow = await this.initializeGatedOnboarding();
      return await onboardingFlow.startNewProject(initialGoal, userContext);
    } catch (error) {
      console.error('Gated onboarding initialization failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'initialization',
        gate_status: 'error'
      };
    }
  }

  /**
   * Continue gated onboarding flow
   */
  async continueGatedOnboarding(projectId, stage, inputData = {}) {
    try {
      const onboardingFlow = await this.initializeGatedOnboarding();
      
      switch (stage) {
        case 'context_gathering':
          return await onboardingFlow.gatherContext(projectId, inputData);
        case 'questionnaire':
          return await onboardingFlow.startDynamicQuestionnaire(projectId);
        case 'questionnaire_response':
          return await onboardingFlow.processQuestionnaireResponse(
            projectId, 
            inputData.questionId, 
            inputData.response
          );
        case 'complexity_analysis':
          return await onboardingFlow.performComplexityAnalysis(projectId);
        case 'hta_generation':
          return await onboardingFlow.generateHTATree(projectId);
        case 'strategic_framework':
          return await onboardingFlow.buildStrategicFramework(projectId);
        default:
          throw new Error(`Unknown onboarding stage: ${stage}`);
      }
    } catch (error) {
      console.error('Gated onboarding continuation failed:', error);
      return {
        success: false,
        error: error.message,
        stage,
        gate_status: 'error'
      };
    }
  }

  /**
   * Get gated onboarding status
   */
  async getGatedOnboardingStatus(projectId) {
    try {
      const onboardingFlow = await this.initializeGatedOnboarding();
      return await onboardingFlow.getOnboardingStatus(projectId);
    } catch (error) {
      console.error('Failed to get onboarding status:', error);
      return {
        success: false,
        error: error.message,
        stage: 'unknown',
        gate_status: 'error'
      };
    }
  }

  /**
   * Generate Next + Pipeline presentation
   */
  async generateNextPipeline(projectId, userContext = {}) {
    try {
      const pipelinePresenter = await this.initializeNextPipelinePresenter();
      return await pipelinePresenter.generateNextPipeline(projectId, userContext);
    } catch (error) {
      console.error('Next pipeline generation failed:', error);
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
   * Evolve pipeline based on progress and context
   */
  async evolvePipeline(projectId, triggers = {}, context = {}) {
    try {
      const pipelinePresenter = await this.initializeNextPipelinePresenter();
      return await pipelinePresenter.evolvePipeline(projectId, triggers, context);
    } catch (error) {
      console.error('Pipeline evolution failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Pipeline Evolution Error**\n\nError: ${error.message}\n\nPipeline evolution failed. Please try regenerating the pipeline.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Assess domain relevance for exploration
   */
  async assessExplorationRelevance(userTopic, projectId, pathName) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      if (!existingHTA) return null;

      const relevanceAssessment = await this.schemaEngine.assessDomainRelevance(
        userTopic,
        existingHTA.goal
      );

      return relevanceAssessment;

    } catch (error) {
      console.error('Domain relevance assessment failed:', error);
      return null;
    }
  }

  // === CONVERSION AND UTILITY METHODS ===

  async convertSchemaTreeToHTAFormat(schemaTree, projectId, pathName, config, initialContext) {
    const goalContext = schemaTree.level1_goalContext;
    const strategicBranches = schemaTree.level2_strategicBranches;

    // Use original complexity analysis as fallback, enhanced by schema analysis
    const complexityAnalysis = goalContext.goal_analysis ? {
      score: goalContext.goal_analysis.goal_complexity,
      level: this.getComplexityLevel(goalContext.goal_analysis.goal_complexity),
      factors: goalContext.goal_analysis.complexity_factors || [],
      recommended_depth: this.calculateRecommendedDepth(goalContext.goal_analysis.goal_complexity),
      analysis: goalContext.learning_approach?.recommended_strategy || 'Schema-driven approach'
    } : await this.analyzeGoalComplexityAsync(schemaTree.goal, initialContext.context);

    // Convert strategic branches to HTA format with defensive checks
    const htaBranches = (strategicBranches && Array.isArray(strategicBranches.strategic_branches)) 
      ? strategicBranches.strategic_branches.map((branch, index) => ({
      name: branch.name,
      description: branch.description,
      priority: branch.priority,
      domain_focus: branch.domain_focus,
      rationale: branch.rationale,
      expected_outcomes: branch.expected_outcomes || [],
      context_adaptations: branch.context_adaptations || [],
      pain_point_mitigations: branch.pain_point_mitigations || [],
      exploration_opportunities: branch.exploration_opportunities || [],
      tasks: [], // Will be populated on-demand
      focus: this.mapDomainFocusToHTAFocus(branch.domain_focus),
      schema_generated: true
    }))
      : []; // Fallback to empty array when strategicBranches is undefined or invalid

    // Generate initial frontier nodes from strategic branches
    const frontierNodes = await this.generateInitialFrontierNodes(htaBranches, complexityAnalysis, initialContext);

    return {
      projectId,
      pathName,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      
      // Core HTA data
      goal: schemaTree.goal,
      context: initialContext.context,
      complexity: complexityAnalysis,
      strategicBranches: htaBranches,
      frontierNodes,
      completedNodes: [],
      
      // Schema intelligence data
      level1_goalContext: goalContext,
      level2_strategicBranches: strategicBranches,
      level3_taskDecomposition: schemaTree.level3_taskDecomposition,
      level4_microParticles: schemaTree.level4_microParticles,
      level5_nanoActions: schemaTree.level5_nanoActions,
      level6_contextAdaptivePrimitives: schemaTree.level6_contextAdaptivePrimitives,
      availableDepth: schemaTree.availableDepth || 2,
      maxDepth: schemaTree.maxDepth || 6,
      canExpand: schemaTree.canExpand !== false,
      schemaGenerated: true,
      domainBoundaries: goalContext.domain_boundaries,
      learningApproach: goalContext.learning_approach,
      
      // Metadata
      hierarchyMetadata: {
        total_depth: complexityAnalysis.recommended_depth,
        total_branches: htaBranches.length,
        total_tasks: frontierNodes.length,
        schema_intelligence: true,
        context_learning_enabled: this.contextLearningEnabled,
        generation_method: 'pure_schema_driven'
      },
      
      // Generation context
      generation_context: {
        method: 'pure_schema_driven_intelligence',
        timestamp: new Date().toISOString(),
        schema_engine_version: '1.0.0',
        goal_achievement_context: true,
        awaiting_generation: false
      }
    };
  }

  async generateInitialFrontierNodes(strategicBranches, complexityAnalysis, initialContext) {
    const frontierNodes = [];
    let taskId = 1;

    for (const branch of strategicBranches) {
      // Defensive check for branch name - add fallback if undefined
      const branchName = branch.name || `Unnamed Branch ${taskId}`;
      const branchDescription = branch.description || `Branch activities for ${branchName}`;
      
      // Log warning if branch name was missing
      if (!branch.name) {
        console.warn(`[EnhancedHTA] Branch name undefined, using fallback: ${branchName}`);
      }
      
      // Generate 2-4 initial tasks per branch using schema intelligence
      const taskCount = Math.min(25, Math.max(15, complexityAnalysis.score * 3));
      
      for (let i = 0; i < taskCount; i++) {
        const task = {
          id: `${branchName.toLowerCase().replace(/\s+/g, '_')}_${taskId}`,
          title: `${this.getProgressiveTaskName(i, taskCount)} ${this.getCleanBranchName(branchName)}`,
          description: `${this.getCleanTaskDescription(branchDescription, i + 1)}`,
          difficulty: Math.min(5, Math.max(1, Math.floor(complexityAnalysis.score / 2) + (i * 0.5))),
          duration: this.calculateContextAwareDuration(complexityAnalysis.score, i, initialContext),
          branch: branchName,
          priority: (branch.priority || 0.5) * 100 + (i * 10),
          prerequisites: i > 0 ? [`${branchName.toLowerCase().replace(/\s+/g, '_')}_${taskId - 1}`] : [],
          learningOutcome: `Progress in ${branchName}`,
          generated: true,
          schema_generated: true,
          domain_focus: branch.domain_focus,
          context_adaptations: branch.context_adaptations,
          completed: false
        };
        
        frontierNodes.push(task);
        taskId++;
      }
    }

    return frontierNodes;
  }

  async buildCurrentUserContext(projectId) {
    return {
      interactions: this.userInteractions.slice(-10), // Last 10 interactions
      learningHistory: this.userInteractions.length,
      projectId,
      timestamp: new Date().toISOString(),
      contextLearningEnabled: this.contextLearningEnabled
    };
  }

  async buildDomainContext(goal, context, config) {
    return {
      goal,
      context,
      constraints: config.constraints || {},
      focusAreas: config.focusAreas || [],
      learningStyle: config.learningStyle || 'mixed',
      timeConstraints: config.constraints?.time_constraints || 'flexible',
      resourceConstraints: config.constraints?.resource_constraints || 'standard'
    };
  }

  assessUrgency(args, config) {
    // Check for urgency indicators
    if (args.urgent || config.urgent) return 'high';
    if (args.timeline === 'asap' || config.timeline === 'asap') return 'high';
    if (config.constraints?.time_constraints?.includes('urgent')) return 'high';
    return 'moderate';
  }

  assessAvailableResources(config) {
    return {
      time: config.constraints?.time_constraints || 'flexible',
      budget: config.constraints?.budget_constraints || 'moderate',
      tools: config.constraints?.tool_constraints || 'standard',
      support: config.constraints?.support_available || 'self-directed'
    };
  }

  async saveEnhancedHTAData(projectId, pathName, htaData) {
    // Save to traditional storage
    await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', htaData);
    
    // Save to vector store with enhanced metadata
    try {
      const vsStatus = await this.ensureVectorStore();
      if (vsStatus && vsStatus.success && vsStatus.instance) {
        await vsStatus.instance.storeHTATree(projectId, {
          ...htaData,
          enhanced_with_schema: true,
          domain_boundaries: htaData.domainBoundaries,
          learning_approach: htaData.learningApproach
        });
        console.error(`[EnhancedHTA] Enhanced HTA stored in vector database for project ${projectId}`);
      }
    } catch (error) {
      console.error('[EnhancedHTA] Vector storage failed:', error.message);
    }
  }

  // === TRACKING METHODS FOR CONTEXT LEARNING ===

  async trackTreeGenerationInteraction(args, htaData, schemaTree) {
    const interaction = {
      type: 'tree_generation',
      timestamp: new Date().toISOString(),
      args,
      result: {
        success: true,
        branches_generated: htaData.strategicBranches.length,
        tasks_generated: htaData.frontierNodes.length,
        complexity_score: htaData.complexity.score,
        schema_intelligence_used: true
      },
      schema_data: {
        goal_context: schemaTree.level1_goalContext,
        strategic_branches: schemaTree.level2_strategicBranches,
        domain_boundaries: schemaTree.domainBoundaries
      }
    };

    await this.learnFromUserInteraction(interaction);
  }

  async trackDecompositionInteraction(branchName, taskDecomposition, userContext) {
    const interaction = {
      type: 'task_decomposition',
      timestamp: new Date().toISOString(),
      branch: branchName,
      result: taskDecomposition,
      user_context: userContext
    };

    await this.learnFromUserInteraction(interaction);
  }

  async trackMicroParticleInteraction(taskTitle, microParticles, userContext) {
    const interaction = {
      type: 'micro_particle_generation',
      timestamp: new Date().toISOString(),
      task: taskTitle,
      result: microParticles,
      user_context: userContext
    };

    await this.learnFromUserInteraction(interaction);
  }

  // === UTILITY METHODS ===

  getComplexityLevel(score) {
    if (score <= 3) return 'simple';
    if (score <= 6) return 'moderate';
    if (score <= 8) return 'complex';
    return 'expert';
  }

  calculateRecommendedDepth(complexityScore) {
    if (complexityScore <= 3) return 2;
    if (complexityScore <= 6) return 3;
    if (complexityScore <= 8) return 4;
    return 5;
  }

  mapDomainFocusToHTAFocus(domainFocus) {
    const focusMapping = {
      'theoretical': 'theory',
      'practical': 'hands-on',
      'hands-on': 'hands-on',
      'project-based': 'project',
      'research': 'theory',
      'application': 'hands-on',
      'mixed': 'balanced'
    };
    
    const lowerFocus = (domainFocus || '').toLowerCase();
    for (const [key, value] of Object.entries(focusMapping)) {
      if (lowerFocus.includes(key)) return value;
    }
    return 'balanced';
  }

  getProgressiveTaskName(index, total) {
    const progressTerms = ['Introduction to', 'Exploring', 'Understanding', 'Mastering', 'Advanced'];
    const termIndex = Math.floor((index / total) * progressTerms.length);
    return progressTerms[Math.min(termIndex, progressTerms.length - 1)];
  }

  /**
   * Clean branch name to prevent goal text redundancy
   */
  getCleanBranchName(branchName) {
    if (!branchName || typeof branchName !== 'string') {
      return 'Learning Branch';
    }
    
    // Remove common redundant patterns
    const cleanName = branchName
      .replace(/^(Build strong foundations in|Apply|Achieve proficiency in|Master|Implement and build using|Master the methodology and process for)\s+/i, '')
      .replace(/\s+(Build strong foundations in|Apply|Achieve proficiency in|Master|Implement and build using|Master the methodology and process for)\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If the cleaned name is too short or empty, use the original
    if (cleanName.length < 3) {
      return branchName;
    }
    
    return cleanName;
  }

  /**
   * Clean task description to prevent goal text redundancy
   */
  getCleanTaskDescription(branchDescription, phaseNumber) {
    if (!branchDescription || typeof branchDescription !== 'string') {
      return `Learning activity - Phase ${phaseNumber}`;
    }
    
    // Remove common redundant patterns and goal text repetition
    const cleanDescription = branchDescription
      .replace(/^(Build strong foundations in|Apply concepts in|Achieve proficiency in|Master advanced concepts in|Implement and build using|Master the methodology and process for)\s+/i, '')
      .replace(/\s+(Build strong foundations in|Apply concepts in|Achieve proficiency in|Master advanced concepts in|Implement and build using|Master the methodology and process for)\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If the cleaned description is too short, create a meaningful one
    if (cleanDescription.length < 5) {
      return `Learning activity - Phase ${phaseNumber}`;
    }
    
    return `${cleanDescription} - Phase ${phaseNumber}`;
  }

  calculateContextAwareDuration(complexityScore, taskIndex, context) {
    const baseDuration = 25; // minutes
    const complexityMultiplier = 1 + (complexityScore - 3) * 0.2;
    const progressionMultiplier = 1 + (taskIndex * 0.3);
    
    // Adjust for user context
    let contextMultiplier = 1;
    if (context.urgency === 'high') contextMultiplier *= 0.8;
    if (context.learningStyle === 'hands-on') contextMultiplier *= 1.2;
    if (context.learningStyle === 'reading') contextMultiplier *= 0.8;
    
    const duration = Math.round(baseDuration * complexityMultiplier * progressionMultiplier * contextMultiplier);
    return `${Math.max(10, Math.min(60, duration))} minutes`;
  }

  formatExistingTreeResponse(existingHTA) {
    return {
      success: true,
      content: [{
        type: 'text',
        text: `**HTA Tree Already Exists**\n\n**Goal**: ${existingHTA.goal}\n**Complexity**: ${existingHTA.complexity?.score || 'Unknown'}/10\n**Tasks**: ${existingHTA.frontierNodes.length} generated\n**Created**: ${existingHTA.created}\n**Intelligence**: ${existingHTA.schemaGenerated ? 'Schema-Driven ✨' : 'Standard'}\n\n**Tree is ready!** Use \`get_next_task\` to continue your journey.`
      }],
      existing_tree: true,
      tasks_count: existingHTA.frontierNodes.length,
      complexity: existingHTA.complexity,
      schema_generated: existingHTA.schemaGenerated || false
    };
  }

  formatSuccessResponse(htaData) {
    const depthInfo = this.getDepthDescription(htaData.availableDepth || 2);
    const expansionInfo = htaData.canExpand ? `\n**Expansion Available**: Can expand to ${htaData.maxDepth} levels on-demand` : '';
    
    return {
      success: true,
      content: [{
        type: 'text',
        text: `**Enhanced HTA Tree Generated Successfully!** ✨\n\n**Goal**: ${htaData.goal}\n**Complexity**: ${htaData.complexity.score}/10 (${htaData.complexity.level})\n**Tasks Generated**: ${htaData.frontierNodes.length}\n**Strategic Branches**: ${htaData.strategicBranches.length}\n**Current Depth**: ${htaData.availableDepth}/${htaData.maxDepth} levels (${depthInfo})\n**Intelligence**: Pure Schema-Driven + Context Learning\n**Domain Boundaries**: ${Object.keys(htaData.domainBoundaries || {}).length} identified${expansionInfo}\n\n**Next Steps**: Use \`get_next_task\` to begin your intelligent learning journey!\n\n**Enhanced Features**:\n- Progressive depth generation (efficient yet comprehensive)\n- Context-aware task generation\n- Domain-intelligent exploration\n- Real-time learning adaptation\n- On-demand granular decomposition`
      }],
      tasks_count: htaData.frontierNodes.length,
      complexity: htaData.complexity,
      strategic_branches: htaData.strategicBranches.length,
      available_depth: htaData.availableDepth,
      max_depth: htaData.maxDepth,
      can_expand: htaData.canExpand,
      schema_enhanced: true,
      context_learning: true,
      domain_boundaries: htaData.domainBoundaries
    };
  }

  formatErrorResponse(error) {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `**Enhanced HTA Tree Generation Failed**\n\nError: ${error.message}\n\nThe system will attempt fallback to standard generation if available.`
      }],
      error: error.message,
      fallback_available: true
    };
  }

  /**
   * Retry schema generation with more explicit context
   */
  async retrySchemaGeneration(goal, context) {
    try {
      console.error('[EnhancedHTA] Retrying schema generation with enhanced context');
      
      // Build more explicit context for retry
      const enhancedContext = {
        ...context,
        explicitDomainRequest: true,
        failedAttempt: true,
        requireDomainSpecificBranches: true,
        avoidGenericTemplates: true,
        retryInstructions: {
          emphasize: 'Use domain-specific terminology that directly relates to the goal',
          avoid: 'Generic terms like Foundation, Research, Implementation',
          focus: 'Create branch names that reflect the actual subject matter and objectives',
          example_approach: 'If goal is about X, create branches like "X Theory", "X Application", "X Mastery" rather than generic phases'
        }
      };
      
      const retryResult = await this.schemaEngine.generateHTATree(goal, enhancedContext);
      
      if (retryResult && retryResult.level2_strategicBranches && 
          retryResult.level2_strategicBranches.strategic_branches && 
          retryResult.level2_strategicBranches.strategic_branches.length > 0) {
        
        return {
          strategicBranches: retryResult.level2_strategicBranches.strategic_branches.map(branch => ({
            name: branch.name,
            description: branch.description,
            priority: branch.priority,
            domain_focus: branch.domain_focus,
            rationale: branch.rationale,
            expected_outcomes: branch.expected_outcomes || [],
            context_adaptations: branch.context_adaptations || [],
            pain_point_mitigations: branch.pain_point_mitigations || [],
            exploration_opportunities: branch.exploration_opportunities || [],
            tasks: [],
            focus: this.mapDomainFocusToHTAFocus(branch.domain_focus),
            schema_generated: true,
            retry_generated: true
          }))
        };
      }
      
      return null;
    } catch (error) {
      console.error('[EnhancedHTA] Schema retry failed:', error.message);
      return null;
    }
  }

  /**
   * Generate goal-adaptive branches as absolute last resort
   */
  async generateGoalAdaptiveBranches(goal, context) {
    console.error('[EnhancedHTA] Using goal-adaptive fallback generation');
    
    // Use domain-agnostic goal characteristics analysis
    const characteristics = this.schemaEngine.analyzeGoalCharacteristics(goal);
    const branches = [];
    
    // Generate branches based on goal characteristics
    const goalWords = goal.toLowerCase().split(' ');
    const mainTopic = goalWords[goalWords.length - 1] || 'this skill';
    const capitalizedTopic = this.capitalize(mainTopic);
    
    // Base branches that work for any goal
    branches.push(
      { name: `${capitalizedTopic} Foundations`, description: `Establish foundational knowledge and core understanding`, priority: 1 },
      { name: `${capitalizedTopic} Application`, description: `Apply concepts in practical scenarios`, priority: 2 },
      { name: `${capitalizedTopic} Mastery`, description: `Achieve proficiency and expertise`, priority: 3 }
    );
    
    // Add complexity-specific branches
    if (characteristics.complexity === 'high') {
      branches.push(
        { name: `Advanced ${capitalizedTopic}`, description: `Master advanced concepts and techniques`, priority: 4 },
        { name: `${capitalizedTopic} Innovation`, description: `Innovate and extend beyond current practices`, priority: 5 }
      );
    }
    
    // Add characteristic-specific branches
    if (characteristics.characteristics.includes('technical')) {
      branches.push(
        { name: `${capitalizedTopic} Implementation`, description: `Implement and build practical solutions`, priority: branches.length + 1 }
      );
    }
    
    if (characteristics.characteristics.includes('process-oriented')) {
      branches.push(
        { name: `${capitalizedTopic} Methodology`, description: `Master the methodology and systematic approach`, priority: branches.length + 1 }
      );
    }
    
    return branches.map(branch => ({
      ...branch,
      phase: branch.name.toLowerCase().replace(/\s+/g, '_'),
      description: branch.description,
      order: branch.priority,
      estimatedDuration: '2-4 weeks',
      prerequisites: branch.priority > 1 ? [branches[branch.priority - 2].name] : [],
      deliverables: [`Progress in ${branch.name}`, 'Practical skills'],
      tasks: [],
      focus: 'balanced',
      schema_generated: false,
      domain_adaptive: true,
      fallback_generated: true
    }));
  }


  /**
   * Capitalize first letter of string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get human-readable description of current depth
   */
  getDepthDescription(depth) {
    const descriptions = {
      1: 'Goal Context Only',
      2: 'Strategic Branches',
      3: 'Task Decomposition',
      4: 'Micro-Particles',
      5: 'Nano-Actions',
      6: 'Context-Adaptive Primitives'
    };
    return descriptions[depth] || 'Unknown';
  }

  /**
   * Determine if user needs deeper decomposition based on their behavior
   */
  async shouldExpandDepth(projectId, pathName, userInteraction) {
    try {
      const existingHTA = await this.loadPathHTA(projectId, pathName);
      if (!existingHTA) return false;

      // Analyze user interaction patterns to determine if they need more granular tasks
      const indicators = {
        // User is struggling with task size
        taskTooLarge: [
          'too big', 'overwhelming', 'break down', 'smaller steps',
          'dont know where to start', 'too complex', 'simpler'
        ],
        
        // User wants more specific guidance
        needsGuidance: [
          'how exactly', 'specific steps', 'detailed instructions',
          'what should I do', 'more specific', 'step by step'
        ],
        
        // User is asking about implementation details
        needsImplementation: [
          'how to implement', 'what tools', 'which commands',
          'exact process', 'technical details', 'specific approach'
        ],
        
        // User is context-switching frequently
        contextSwitching: [
          'different approach', 'alternative method', 'another way',
          'switch to', 'try different', 'change strategy'
        ]
      };

      const interactionText = (userInteraction.message || '').toLowerCase();
      let expansionScore = 0;

      // Check for indicators
      Object.entries(indicators).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => interactionText.includes(keyword));
        if (matches.length > 0) {
          expansionScore += matches.length;
          console.log(`[DepthAnalysis] Found ${category} indicators: ${matches.join(', ')}`);
        }
      });

      // Additional factors
      const currentDepth = existingHTA.availableDepth || 2;
      const maxUsefulDepth = this.determineMaxUsefulDepth(existingHTA.goal, userInteraction);
      
      // Recommend expansion if:
      // 1. User shows signs of needing more granular tasks
      // 2. Current depth is below maximum useful depth
      // 3. User has completed several tasks successfully (ready for more detail)
      const shouldExpand = (
        expansionScore >= 2 && 
        currentDepth < maxUsefulDepth &&
        currentDepth < 6
      );

      if (shouldExpand) {
        const recommendedDepth = Math.min(currentDepth + 1, maxUsefulDepth);
        return {
          shouldExpand: true,
          recommendedDepth,
          reason: `User interaction suggests need for more granular tasks (score: ${expansionScore})`,
          indicators: Object.keys(indicators).filter(category => 
            indicators[category].some(keyword => interactionText.includes(keyword))
          )
        };
      }

      return { shouldExpand: false, currentDepth, maxUsefulDepth };

    } catch (error) {
      console.error('Depth expansion analysis failed:', error);
      return { shouldExpand: false, error: error.message };
    }
  }

  /**
   * Determine maximum useful depth based on goal characteristics and user context
   */
  determineMaxUsefulDepth(goal, userContext) {
    // Use domain-agnostic goal characteristics analysis
    const characteristics = this.analyzeGoalCharacteristics ? 
      this.analyzeGoalCharacteristics(goal) : 
      this.schemaEngine.analyzeGoalCharacteristics(goal);
    
    let maxDepth = 4; // Default reasonable maximum

    // High complexity goals benefit from deeper decomposition
    if (characteristics.complexity === 'high') {
      maxDepth = 6;
    }
    
    // Low complexity or exploratory goals may not need as much depth
    else if (characteristics.complexity === 'low' || 
             characteristics.characteristics.includes('exploratory')) {
      maxDepth = 3;
    }
    
    // Technical or mastery-focused goals benefit from micro-level decomposition
    else if (characteristics.characteristics.includes('technical') || 
             characteristics.characteristics.includes('mastery-focused')) {
      maxDepth = 5;
    }

    // Adjust based on user experience level
    if (userContext && userContext.experience === 'beginner') {
      maxDepth = Math.min(maxDepth + 1, 6); // Beginners benefit from more granular steps
    } else if (userContext && userContext.experience === 'expert') {
      maxDepth = Math.max(maxDepth - 1, 2); // Experts need less granular breakdown
    }

    return maxDepth;
  }

}

export default EnhancedHTACore;
