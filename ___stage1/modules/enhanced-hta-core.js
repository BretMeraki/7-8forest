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

      // Build initial context for schema engine
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
        domain_context: await this.buildDomainContext(goal, context, config)
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
      
      // Ensure we have strategic branches and frontier nodes
      if (!htaData.strategicBranches || htaData.strategicBranches.length === 0) {
        // If schema engine failed, try again with more explicit context
        const retryResult = await this.retrySchemaGeneration(goal, initialContext);
        if (retryResult && retryResult.strategicBranches && retryResult.strategicBranches.length > 0) {
          htaData.strategicBranches = retryResult.strategicBranches;
        } else {
          // Only as absolute last resort, use domain-adaptive fallback
          htaData.strategicBranches = await this.generateDomainAdaptiveBranches(goal, initialContext);
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
    } : this.analyzeGoalComplexity(schemaTree.goal, initialContext.context);

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
      const taskCount = Math.min(4, Math.max(2, Math.floor(complexityAnalysis.score / 2)));
      
      for (let i = 0; i < taskCount; i++) {
        const task = {
          id: `${branchName.toLowerCase().replace(/\s+/g, '_')}_${taskId}`,
          title: `${this.getProgressiveTaskName(i, taskCount)} ${branchName}`,
          description: `${branchDescription} - Phase ${i + 1}`,
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
    return {
      success: true,
      content: [{
        type: 'text',
        text: `**Enhanced HTA Tree Generated Successfully!** ✨\n\n**Goal**: ${htaData.goal}\n**Complexity**: ${htaData.complexity.score}/10 (${htaData.complexity.level})\n**Tasks Generated**: ${htaData.frontierNodes.length}\n**Strategic Branches**: ${htaData.strategicBranches.length}\n**Intelligence**: Pure Schema-Driven + Context Learning\n**Domain Boundaries**: ${Object.keys(htaData.domainBoundaries || {}).length} identified\n\n**Next Steps**: Use \`get_next_task\` to begin your intelligent learning journey!\n\n**Enhanced Features**:\n- Context-aware task generation\n- Domain-intelligent exploration\n- Real-time learning adaptation\n- 6-level granular decomposition available`
      }],
      tasks_count: htaData.frontierNodes.length,
      complexity: htaData.complexity,
      strategic_branches: htaData.strategicBranches.length,
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
        examples: {
          AI: ['Mathematical Foundations', 'Neural Network Architecture', 'Model Training & Validation'],
          cybersecurity: ['Security Fundamentals', 'Threat Analysis', 'Penetration Testing'],
          photography: ['Camera Fundamentals', 'Composition Techniques', 'Post-Processing Mastery'],
          programming: ['Language Syntax', 'Problem-Solving Patterns', 'Real-World Applications']
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
   * Generate domain-adaptive branches as absolute last resort
   */
  async generateDomainAdaptiveBranches(goal, context) {
    console.error('[EnhancedHTA] Using domain-adaptive fallback generation');
    
    // Extract domain hints from goal
    const domainHints = this.extractDomainHints(goal);
    const branches = [];
    
    // Generate domain-specific branches based on goal analysis
    if (domainHints.isAI || domainHints.isMachineLearning) {
      branches.push(
        { name: 'Mathematical Foundations', description: `Master the mathematical concepts underlying ${goal}`, priority: 1 },
        { name: 'Algorithmic Understanding', description: `Understand key algorithms and techniques for ${goal}`, priority: 2 },
        { name: 'Practical Implementation', description: `Build and train models for ${goal}`, priority: 3 },
        { name: 'Advanced Applications', description: `Apply ${goal} to real-world problems`, priority: 4 }
      );
    } else if (domainHints.isCybersecurity) {
      branches.push(
        { name: 'Security Fundamentals', description: `Learn core security principles for ${goal}`, priority: 1 },
        { name: 'Threat Analysis', description: `Understand threats and vulnerabilities in ${goal}`, priority: 2 },
        { name: 'Defense Strategies', description: `Implement security measures for ${goal}`, priority: 3 },
        { name: 'Advanced Techniques', description: `Master advanced security techniques for ${goal}`, priority: 4 }
      );
    } else if (domainHints.isProgramming) {
      branches.push(
        { name: 'Language Mastery', description: `Master the programming language for ${goal}`, priority: 1 },
        { name: 'Problem-Solving Patterns', description: `Learn common patterns and best practices for ${goal}`, priority: 2 },
        { name: 'Project Development', description: `Build complete projects using ${goal}`, priority: 3 },
        { name: 'Advanced Optimization', description: `Optimize and scale ${goal} applications`, priority: 4 }
      );
    } else {
      // Generic domain-adaptive approach
      const goalWords = goal.toLowerCase().split(' ');
      const mainTopic = goalWords[goalWords.length - 1] || 'this skill';
      
      branches.push(
        { name: `${this.capitalize(mainTopic)} Foundations`, description: `Build strong foundations in ${goal}`, priority: 1 },
        { name: `${this.capitalize(mainTopic)} Application`, description: `Apply ${goal} in practical scenarios`, priority: 2 },
        { name: `${this.capitalize(mainTopic)} Mastery`, description: `Achieve proficiency in ${goal}`, priority: 3 },
        { name: `${this.capitalize(mainTopic)} Innovation`, description: `Innovate and extend ${goal}`, priority: 4 }
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
   * Extract domain hints from goal text
   */
  extractDomainHints(goal) {
    const lowerGoal = goal.toLowerCase();
    return {
      isAI: /artificial intelligence|machine learning|neural network|deep learning|ai|ml|cnn|rnn|transformer/i.test(lowerGoal),
      isMachineLearning: /machine learning|ml|data science|predictive|classification|regression|clustering/i.test(lowerGoal),
      isCybersecurity: /cybersecurity|security|penetration|vulnerability|hacking|encryption|firewall/i.test(lowerGoal),
      isProgramming: /programming|coding|development|software|javascript|python|java|react|node/i.test(lowerGoal),
      isPhotography: /photography|photo|camera|lens|composition|lighting/i.test(lowerGoal),
      isDesign: /design|ui|ux|graphic|visual|interface/i.test(lowerGoal)
    };
  }

  /**
   * Capitalize first letter of string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

}

export default EnhancedHTACore;
