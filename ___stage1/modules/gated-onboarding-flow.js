/**
 * Gated Onboarding Flow - Manages the complete user journey through validation gates
 * Implements the comprehensive onboarding system with progressive validation
 */

export class GatedOnboardingFlow {
  constructor(dataPersistence, projectManagement, htaCore, coreIntelligence, vectorStore = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.htaCore = htaCore; // Was llmInterface, now using htaCore for LLM operations
    this.coreIntelligence = coreIntelligence; // Was eventBus, now using coreIntelligence
    this.vectorStore = vectorStore;
    
    // Track current gate data and session state
    this.currentGateData = {};
    this.sessionStates = new Map();
    
    // Define gate progression order
    this.gateOrder = [
      'landing_page',
      'goal_collection', 
      'context_gathering',
      'schema_analysis',
      'questionnaire_generation',
      'complexity_analysis',
      'hta_tree_building',
      'task_generation',
      'first_task_recommendation'
    ];
  }

  /**
   * Deep merge helper that unions arrays and recursively merges objects.
   * Combines aggregate context patches without losing prior data.
   */
  mergeAggregate(target = {}, patch = {}) {
    if (!patch || typeof patch !== 'object') return target;
    for (const key of Object.keys(patch)) {
      const srcVal = patch[key];
      const dstVal = target[key];
      if (Array.isArray(srcVal)) {
        target[key] = Array.isArray(dstVal)
          ? Array.from(new Set([...dstVal, ...srcVal]))
          : [...srcVal];
      } else if (srcVal && typeof srcVal === 'object') {
        target[key] = this.mergeAggregate(
          dstVal && typeof dstVal === 'object' ? dstVal : {},
          srcVal
        );
      } else {
        target[key] = srcVal;
      }
    }
    return target;
  }

  /**
   * Retrieve aggregate_context for a project (empty object if none yet).
   */
  async getAggregate(projectId) {
    const state = await this.dataPersistence.loadProjectData(projectId, 'onboarding_state.json');
    return state?.aggregate_context || {};
  }

  /**
   * Persist a patch into a project's aggregate_context using deep merge.
   */
  async updateAggregate(projectId, patch = {}) {
    const state = await this.dataPersistence.loadProjectData(projectId, 'onboarding_state.json');
    if (!state) return null;
    state.aggregate_context = this.mergeAggregate(state.aggregate_context || {}, patch);
    await this.dataPersistence.saveProjectData(projectId, 'onboarding_state.json', state);
    return state.aggregate_context;
  }

  // ===== MAIN ENTRY POINT =====
  
  async startNewProject(goal, userContext = {}) {
    try {
      // Reset current gate data for new project
      this.currentGateData = {};
      
      // Start with goal validation
      const goalValidation = await this.validateGoal(goal);
      if (!goalValidation.valid) {
        return {
          success: false,
          message: 'Goal validation failed',
          suggestions: goalValidation.suggestions || ['Please provide a clearer, more specific goal'],
          stage: 'goal_collection'
        };
      }
      
      // Create project using project management
      const projectData = await this.projectManagement.createProject({
        name: `${goal} - Learning Journey`,
        goal: goal,
        context: userContext.context || '',
        description: `AI-guided learning journey for: ${goal}`
      });
      
      if (!projectData.success) {
        return {
          success: false,
          message: 'Failed to create project',
          error: projectData.error
        };
      }
      
      // Set up initial onboarding state
      const onboardingState = {
        project_id: projectData.project_id,
        goal: goal,
        user_context: userContext,
        current_stage: 'context_gathering',
        started_at: new Date().toISOString(),
        gates_completed: ['goal_collection'],
      aggregate_context: { goal, context: userContext.context || '' }
      };
      
      // Save onboarding state
      await this.dataPersistence.saveProjectData(projectData.project_id, 'onboarding_state.json', onboardingState);
      
      return {
        success: true,
        projectId: projectData.project_id,
        message: `Learning journey started for: ${goal}`,
        stage: 'context_gathering',
        next_action: {
          description: 'Provide context about your current situation and experience level',
          command: 'continue_onboarding_forest'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start new project',
        error: error.message
      };
    }
  }

  // ===== ONBOARDING FLOW CONTROL =====
  
  async continueOnboarding(projectId, stage, inputData = {}) {
    try {
      // Load current onboarding state
      const onboardingState = await this.dataPersistence.loadProjectData(projectId, 'onboarding_state.json');
      if (!onboardingState) {
        return {
          success: false,
          message: 'No onboarding process found for this project',
          stage: 'not_started'
        };
      }
      
      // Determine current stage if not provided, with fallbacks
      let currentStage = stage || onboardingState.current_stage;
      
      // Handle undefined or invalid stages
      if (!currentStage) {
        // Default to context gathering if no stage specified and goal collection is completed
        if (onboardingState.gates_completed && onboardingState.gates_completed.includes('goal_collection')) {
          currentStage = 'context_gathering';
        } else {
          currentStage = 'context_gathering'; // Safe default
        }
      }
      
      // Validate stage against known stages
      const validStages = ['context_gathering', 'complexity_analysis', 'hta_tree_building', 'task_generation'];
      if (!validStages.includes(currentStage)) {
        // If invalid stage, determine the correct next stage based on completed gates
        currentStage = this.determineCorrectStage(onboardingState);
      }
      
      // Process based on stage
      switch (currentStage) {
        case 'context_gathering':
          return await this.processContextGathering(projectId, inputData, onboardingState);
        
        case 'complexity_analysis':
          return await this.processComplexityAnalysis(projectId, inputData, onboardingState);
        
        case 'hta_tree_building':
          return await this.processHtaTreeBuilding(projectId, inputData, onboardingState);
        
        case 'task_generation':
          return await this.processTaskGeneration(projectId, inputData, onboardingState);
        
        default:
          // Final fallback - should not reach here with the validation above
          return {
            success: false,
            message: `Cannot process stage: ${currentStage}. Please check onboarding status and try again.`,
            stage: currentStage,
            next_action: {
              description: 'Check your current onboarding status',
              command: 'get_onboarding_status_forest'
            }
          };
      }
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to continue onboarding',
        stage: 'error',
        error: error.message,
        next_action: {
          description: 'Check your current onboarding status',
          command: 'get_onboarding_status_forest'
        }
      };
    }
  }
  
  async getOnboardingStatus(projectId) {
    try {
      const onboardingState = await this.dataPersistence.loadProjectData(projectId, 'onboarding_state.json');
      if (!onboardingState) {
        return {
          success: false,
          message: 'No onboarding process found for this project'
        };
      }
      
      const progress = Math.round((onboardingState.gates_completed.length / this.gateOrder.length) * 100);
      
      return {
        success: true,
        onboarding_status: {
          project_id: projectId,
          current_stage: onboardingState.current_stage,
          progress: progress,
          started_at: onboardingState.started_at,
          gates_completed: onboardingState.gates_completed
        },
        gates_progress: this.gateOrder.map(gate => ({
          name: gate,
          status: onboardingState.gates_completed.includes(gate) ? '✅' : '⏳'
        })),
        next_action: {
          description: `Continue with ${onboardingState.current_stage} stage`,
          command: 'continue_onboarding_forest'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get onboarding status',
        error: error.message
      };
    }
  }
  
  // ===== STAGE DETERMINATION =====
  
  determineCorrectStage(onboardingState) {
    // Determine the correct stage based on completed gates
    const completedGates = onboardingState.gates_completed || [];
    
    // Define stage progression order
    const stageProgression = [
      { stage: 'context_gathering', requiredGates: ['goal_collection'] },
      { stage: 'complexity_analysis', requiredGates: ['goal_collection', 'context_gathering'] },
      { stage: 'hta_tree_building', requiredGates: ['goal_collection', 'context_gathering', 'complexity_analysis'] },
      { stage: 'task_generation', requiredGates: ['goal_collection', 'context_gathering', 'complexity_analysis', 'hta_tree_building'] }
    ];
    
    // Find the correct stage by checking which gates are completed
    for (let i = stageProgression.length - 1; i >= 0; i--) {
      const stageInfo = stageProgression[i];
      const hasAllRequiredGates = stageInfo.requiredGates.every(gate => 
        completedGates.includes(gate)
      );
      
      if (hasAllRequiredGates) {
        // If all gates for this stage are completed, move to next stage
        if (i < stageProgression.length - 1) {
          return stageProgression[i + 1].stage;
        } else {
          // All stages completed
          return 'completed';
        }
      }
    }
    
    // Default to context gathering if no gates completed yet
    return 'context_gathering';
  }

  // ===== STAGE PROCESSORS =====
  
  async processContextGathering(projectId, inputData, onboardingState) {
    const context = inputData.context || '';
    const goal = onboardingState.goal;
    
    // If no context provided, request it
    if (!context || context.trim().length === 0) {
      return {
        success: false,
        message: 'Context gathering stage - please provide your current situation and experience',
        stage: 'context_gathering',
        gate_status: 'blocked',
        suggestions: [
          'Describe your current experience level with this topic',
          'Mention how much time you can dedicate to learning',
          'Include any constraints or challenges you face',
          'Provide background about your current situation'
        ],
        next_action: {
          description: 'Provide context about your current situation and experience level',
          command: 'continue_onboarding_forest with context data'
        }
      };
    }
    
    const contextValidation = await this.validateContext(context, goal);
    if (!contextValidation.sufficient) {
      return {
        success: false,
        message: `Context validation failed: ${contextValidation.reason}`,
        suggestions: contextValidation.suggestions,
        stage: 'context_gathering',
        gate_status: 'blocked',
        provided_context: context,
        analysis: contextValidation.analysis,
        next_action: {
          description: 'Provide more detailed context about your situation',
          command: 'continue_onboarding_forest with enhanced context'
        }
      };
    }
    
    // Update onboarding state
    onboardingState.current_stage = 'complexity_analysis';
    onboardingState.gates_completed = onboardingState.gates_completed || [];
    if (!onboardingState.gates_completed.includes('context_gathering')) {
      onboardingState.gates_completed.push('context_gathering');
    }
    onboardingState.context = context;
  // Update aggregate context
  await this.updateAggregate(projectId, { context });
    
    await this.dataPersistence.saveProjectData(projectId, 'onboarding_state.json', onboardingState);
    
    return {
      success: true,
      message: 'Context gathered successfully! Moving to complexity analysis.',
      stage: 'complexity_analysis',
      gate_status: 'passed',
      context_provided: context,
      next_action: {
        description: 'Analyze goal complexity and generate learning strategy',
        command: 'continue_onboarding_forest'
      }
    };
  }
  
  async processComplexityAnalysis(projectId, inputData, onboardingState) {
    const completeUserData = {
      goal: onboardingState.goal,
      context: onboardingState.context,
      responses: inputData.responses || {}
    };
    
    const analysis = await this.analyzeComplexity(completeUserData);
    
    // Update onboarding state
    onboardingState.current_stage = 'hta_tree_building';
    onboardingState.gates_completed.push('complexity_analysis');
    onboardingState.complexity_analysis = analysis;
  // Update aggregate context
  await this.updateAggregate(projectId, { complexity: analysis });
    
    await this.dataPersistence.saveProjectData(projectId, 'onboarding_state.json', onboardingState);
    
    return {
      success: true,
      message: 'Complexity analysis completed',
      stage: 'hta_tree_building',
      gate_status: 'passed',
      analysis: analysis,
      next_action: {
        description: 'Build HTA tree structure',
        command: 'continue_onboarding_forest'
      }
    };
  }
  
  async processHtaTreeBuilding(projectId, inputData, onboardingState) {
    const analyzedData = {
      goal: onboardingState.goal,
      context: onboardingState.context,
      complexity: onboardingState.complexity_analysis?.complexity || 'moderate',
      difficulty: onboardingState.complexity_analysis?.difficulty || 5
    };
    
    const htaResult = await this.htaCore.buildHTATree({ 
    projectId: projectId,
    goal: analyzedData.goal,
    context: analyzedData.context
  });
    if (!htaResult.built_successfully) {
      return {
        success: false,
        message: 'HTA tree building failed',
        error: htaResult.error,
        stage: 'hta_tree_building',
        gate_status: 'blocked'
      };
    }
    
    // Update onboarding state
    onboardingState.current_stage = 'task_generation';
    onboardingState.gates_completed.push('hta_tree_building');
    onboardingState.hta_tree = htaResult;
  // Update aggregate context
  await this.updateAggregate(projectId, { hta_tree: htaResult });
    
    await this.dataPersistence.saveProjectData(projectId, 'onboarding_state.json', onboardingState);
    
    return {
      success: true,
      message: 'HTA tree built successfully',
      stage: 'task_generation',
      gate_status: 'passed',
      hta_tree: htaResult,
      next_action: {
        description: 'Generate initial task batch',
        command: 'continue_onboarding_forest'
      }
    };
  }
  
  async processTaskGeneration(projectId, inputData, onboardingState) {
    const taskBatch = await this.generateInitialTaskBatch(
      onboardingState.hta_tree,
      onboardingState.goal,
      onboardingState.context
    );
    
    if (!taskBatch.tasks || taskBatch.tasks.length === 0) {
      return {
        success: false,
        message: 'Task generation failed',
        stage: 'task_generation',
        gate_status: 'blocked'
      };
    }
    
    // Update onboarding state
    onboardingState.current_stage = 'completed';
    onboardingState.gates_completed.push('task_generation');
    onboardingState.task_batch = taskBatch;
  // Update aggregate context
  await this.updateAggregate(projectId, { tasks: taskBatch });
    onboardingState.completed_at = new Date().toISOString();
    
    await this.dataPersistence.saveProjectData(projectId, 'onboarding_state.json', onboardingState);
    
    return {
      success: true,
      message: 'Task generation completed',
      stage: 'completed',
      gate_status: 'passed',
      task_batch: taskBatch,
      onboarding_complete: true,
      next_action: {
        description: 'Start learning with first task',
        command: 'get_next_task_forest'
      }
    };
  }

  // ===== GATE 1: LANDING PAGE AND USER SELECTION =====

  async presentLandingPage() {
    return {
      gated: true,
      gate: 'landing_page',
      message: 'Welcome to Forest AI Learning System',
      options: ['start_new_project', 'list_existing_projects', 'resume_existing'],
      requiresSelection: true
    };
  }

  async validateUserSelection(selection) {
    const validSelections = ['start_new_project', 'list_existing_projects', 'resume_existing'];
    
    if (!validSelections.includes(selection)) {
      return {
        valid: false,
        error: 'Invalid selection. Please choose from available options.',
        gate: 'landing_page'
      };
    }

    this.currentGateData.user_selection = { selection, valid: true };

    if (selection === 'list_existing_projects') {
      const projects = await this.projectManagement.listProjects();
      return {
        valid: true,
        selection,
        projects,
        nextGate: 'project_selection'
      };
    }

    return {
      valid: true,
      selection,
      nextGate: 'goal_collection'
    };
  }

  // ===== GATE 2: GOAL COLLECTION AND VALIDATION =====

  async presentGoalCollectionGate() {
    return {
      gate: 'goal_collection',
      prompt: 'Please describe your goal, dream, or the path you wish to embark on. Be as specific as possible about what you want to achieve.',
      validation_required: true,
      examples: [
        'Learn advanced JavaScript programming with React and Node.js',
        'Master portrait photography including lighting and post-processing',
        'Build a career in data science with Python and machine learning'
      ]
    };
  }

  async validateGoal(goal, sessionId = null) {
    try {
      let analysis;

      // Prefer delegated goal analysis if available (e.g., LLM/Core intelligence)
      if (this.htaCore && typeof this.htaCore.analyzeGoal === 'function') {
        try {
          analysis = await this.htaCore.analyzeGoal(goal);
        } catch (delegationError) {
          // Surface to outer catch for fallback handling
          throw delegationError;
        }
      }

      // If external analysis did not run or returned unusable result, run heuristic fallback
      if (!analysis || typeof analysis !== 'object' || analysis.isValid === undefined) {
        analysis = {
          isValid: goal && goal.length >= 10,
          clarity: goal && goal.length >= 20 ? 0.8 : 0.5,
          specificity: goal && /\b(learn|master|build|create|develop)\b/i.test(goal) ? 0.8 : 0.6,
          achievability: 0.7
        };
      }

      // If goal is not sufficiently clear, provide suggestions but do not throw
      if (!analysis.isValid || analysis.clarity < 0.6) {
        return {
          valid: false,
          reason: 'Goal lacks sufficient clarity or specificity',
          clarity_score: analysis.clarity,
          suggestions: [
            'Be more specific about the technology or skill',
            'Define your desired outcome or level of mastery',
            'Include context about your current situation',
            'Make your goal at least 20 characters long'
          ]
        };
      }

      // Persist valid goal data in gate state
      const gateData = sessionId ? this.sessionStates.get(sessionId)?.gateData || {} : this.currentGateData;
      gateData.goal_validation = {
        valid: true,
        goal,
        clarity: analysis.clarity,
        specificity: analysis.specificity,
        achievability: analysis.achievability
      };

      if (sessionId) {
        this.sessionStates.get(sessionId).gateData = gateData;
      } else {
        this.currentGateData = gateData;
      }

      return {
        valid: true,
        goal,
        analysis,
        nextGate: 'context_gathering'
      };
    } catch (error) {
      // Gracefully degrade to heuristic fallback validation
      return {
        error: error.message ?? String(error),
        fallback_validation: true,
        // Basic heuristic: consider valid if goal length > 20 characters
        valid: goal && goal.length > 20,
        goal
      };
    }
  }

  // ===== GATE 3: CONTEXT GATHERING =====

  async presentContextGatheringGate() {
    const goal = this.currentGateData.goal_validation?.goal;
    return {
      gate: 'context_gathering',
      prompt: `Now please elaborate on exactly where you stand with your goal: "${goal}". Include your current knowledge, experience, available time, and any constraints.`,
      goal_reference: goal,
      validation_required: true
    };
  }

  async validateContext(context, goal) {
    const minLength = 50;
    const contextAnalysis = {
      length: context.length,
      mentions_experience: /experience|knowledge|familiar|background/i.test(context),
      mentions_time: /time|hours|schedule|available|week/i.test(context),
      mentions_constraints: /constraint|limitation|challenge|difficulty/i.test(context)
    };

    const sufficient = context.length >= minLength && 
                      (contextAnalysis.mentions_experience || contextAnalysis.mentions_time);

    if (!sufficient) {
      return {
        sufficient: false,
        reason: 'Context needs more detail about your current situation',
        analysis: contextAnalysis,
        suggestions: [
          'Describe your current experience level',
          'Mention how much time you can dedicate',
          'Include any constraints or challenges you face'
        ]
      };
    }

    this.currentGateData.context_validation = {
      sufficient: true,
      context,
      analysis: contextAnalysis
    };

    return {
      sufficient: true,
      context,
      nextGate: 'schema_analysis'
    };
  }

  combineGoalAndContext() {
    const goal = this.currentGateData.goal_validation?.goal;
    const context = this.currentGateData.context_validation?.context;
    
    return {
      goal,
      context,
      ready_for_analysis: !!(goal && context)
    };
  }

  // ===== GATE 4: DYNAMIC HTA SCHEMA ANALYSIS =====

  async analyzeHtaSchemaGaps(goalContextData) {
    try {
      // Build prompt for external analysis (if available)
      const prompt = `Analyze this goal and context against HTA schema requirements and reply ONLY with valid compact JSON.\nGoal: ${goalContextData.goal}\nContext: ${goalContextData.context}\n\nReturn object properties:\n- missing_fields: array (string) of required fields still needed\n- schema_completion: number (0-1) of schema completeness\n- needs_questionnaire: boolean`;

      let analysis;

      // Delegate to external intelligence if available
      if (this.htaCore && typeof this.htaCore.chat === 'function') {
        try {
          const response = await this.htaCore.chat(prompt);
          // Attempt to parse JSON from response.text or response
          const raw = response?.text ?? response;
          if (raw) {
            analysis = JSON.parse(raw);
          }
        } catch (delegationError) {
          // bubble up to trigger fallback handling below
          throw delegationError;
        }
      }

      // Validate and/or fall back to heuristic if necessary
      if (!analysis || !Array.isArray(analysis.missing_fields)) {
        analysis = {
          missing_fields: ['time_commitment', 'experience_level'],
          schema_completion: 0.6,
          needs_questionnaire: true,
        };
      }

      // Persist in gate data
      this.currentGateData.schema_analysis = {
        ...analysis,
        valid: true,
      };

      return {
        ...analysis,
        goal: goalContextData.goal,
        context: goalContextData.context,
        nextGate: analysis.needs_questionnaire ? 'questionnaire_generation' : 'complexity_analysis',
      };
    } catch (error) {
      // Graceful degradation
      const fallback = {
        error: error.message ?? String(error),
        goal: goalContextData.goal,
        context: goalContextData.context,
        missing_fields: ['time_commitment', 'experience_level'],
        needs_questionnaire: true,
        schema_completion: 0.5,
        nextGate: 'questionnaire_generation',
      };

      this.currentGateData.schema_analysis = {
        ...fallback,
        valid: false,
      };

      return fallback;
    }
  }

  async generateTargetedQuestionnaire(schemaGaps) {
    const questions = [];
    
    schemaGaps.missing_fields.forEach(field => {
      switch (field) {
        case 'time_commitment':
          questions.push({
            id: 'timeCommitment',
            text: 'How many hours per week can you dedicate to learning?',
            type: 'number',
            required: true
          });
          break;
        case 'experience_level':
          questions.push({
            id: 'experienceLevel',
            text: 'What is your current experience level?',
            type: 'select',
            options: ['beginner', 'intermediate', 'advanced'],
            required: true
          });
          break;
        case 'learning_style':
          questions.push({
            id: 'learningStyle',
            text: 'What learning approach do you prefer?',
            type: 'select',
            options: ['hands-on projects', 'theoretical study', 'mixed approach'],
            required: true
          });
          break;
      }
    });

    return {
      questions,
      addresses_gaps: true,
      gap_fields: schemaGaps.missing_fields
    };
  }


  async generateQuestionnaire(schemaGaps) {
    try {
      // Use the targeted questionnaire generator as the main method
      const questionnaireResolved = await Promise.resolve(this.generateTargetedQuestionnaire(schemaGaps));
      const questionnaire = questionnaireResolved;
      
      this.currentGateData.questionnaire_generation = {
        generated: true,
        questionnaire,
        addresses_gaps: true
      };
      
      return {
        ...questionnaire,
        addresses_gaps: true,
        gate: 'questionnaire_generation'
      };
    } catch (error) {
      // Fallback questionnaire
      const fallbackQuestionnaire = this.generateTargetedQuestionnaire(schemaGaps);
      
      this.currentGateData.questionnaire_generation = {
        generated: true,
        questionnaire: fallbackQuestionnaire,
        addresses_gaps: true
      };
      
      return fallbackQuestionnaire;
    }
  }

  async validateQuestionnaireCompletion(questionnaire, answers) {
    const requiredQuestions = questionnaire.questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => answers[q.id]);

    const complete = answeredRequired.length === requiredQuestions.length;

    if (!complete) {
      return {
        complete: false,
        missing: requiredQuestions
          .filter(q => !answers[q.id])
          .map(q => q.id),
        progress: answeredRequired.length / requiredQuestions.length
      };
    }

    this.currentGateData.questionnaire_completion = {
      complete: true,
      answers,
      questionnaire
    };

    return {
      complete: true,
      answers,
      nextGate: 'complexity_analysis'
    };
  }

  mergeUserData() {
    const goal = this.currentGateData.goal_validation?.goal;
    const context = this.currentGateData.context_validation?.context;
    const responses = this.currentGateData.questionnaire_completion?.answers;

    return {
      goal,
      context,
      responses,
      ready_for_complexity_analysis: !!(goal && context && responses)
    };
  }

  // ===== GATE 6: COMPLEXITY ANALYSIS =====

  async analyzeComplexity(completeUserData) {
    try {
      let analysis;

      // Prefer delegated complexity analysis if available (e.g., LLM/Core Intelligence)
      if (this.htaCore && typeof this.htaCore.analyzeComplexity === 'function') {
        try {
          /*
           * Delegate to external intelligence. This may throw (e.g., service unavailable).
           * We purposefully isolate this call so that any thrown error is caught and we
           * can gracefully fall back to the heuristic analysis below.
           */
          analysis = await this.htaCore.analyzeComplexity(completeUserData);
        } catch (delegationError) {
          // Re-throw so it can be handled uniformly in the outer catch block.
          throw delegationError;
        }
      }

      // If delegation did not yield a usable result, run internal heuristic.
      if (!analysis || !analysis.complexity) {
        const goal = completeUserData.goal || '';
        const context = completeUserData.context || '';

        // Default values
        let complexity = 'moderate';
        let difficulty = 5;
        let estimatedDuration = '2-3 months';

        // Heuristic keyword buckets
        const complexKeywords = ['advanced', 'master', 'expert', 'comprehensive', 'complete', 'professional'];
        const beginnerKeywords = ['basic', 'introduction', 'beginner', 'simple', 'start'];

        if (complexKeywords.some(k => goal.toLowerCase().includes(k))) {
          complexity = 'complex';
          difficulty = 7;
          estimatedDuration = '4-6 months';
        } else if (beginnerKeywords.some(k => goal.toLowerCase().includes(k))) {
          complexity = 'simple';
          difficulty = 3;
          estimatedDuration = '1-2 months';
        }

        // Adjust difficulty if the context is particularly rich
        if (context.length > 100) {
          difficulty = Math.min(difficulty + 1, 10);
        }

        analysis = {
          complexity,
          difficulty,
          estimatedDuration,
          confidence: 0.7,
          goal,
          context
        };
      }

      // Ensure goal and context are always included in the analysis result
      if (!analysis.goal) analysis.goal = completeUserData.goal || goal;
      if (!analysis.context) analysis.context = completeUserData.context || context;

      // Persist analysis in gate data
      this.currentGateData.complexity_analysis = {
        ...analysis,
        valid: true
      };

      return {
        ...analysis,
        nextGate: 'hta_tree_building'
      };
    } catch (error) {
      const fallback = {
        error: error.message ?? String(error),
        fallback_complexity: 'moderate',
        difficulty: 5,
        estimatedDuration: '2-3 months'
      };

      // Persist failed analysis attempt for transparency
      this.currentGateData.complexity_analysis = {
        ...fallback,
        valid: false
      };

      return fallback;
    }
  }

  async validateComplexityAnalysis(analysis) {
    const valid = analysis.complexity && analysis.difficulty > 0;
    
    return {
      valid,
      ready_for_hta_building: valid,
      analysis
    };
  }

  // ===== GATE 7: HTA TREE BUILDING AND VECTORIZATION =====

  async buildHtaTree(analyzedData) {
    try {
      // Create project if not exists
      const project = await this.projectManagement.createProject({
        name: `${analyzedData.goal} - Learning Journey`,
        goal: analyzedData.goal,
        context: analyzedData.context,
        complexity: analyzedData.complexity
      });

      // Build HTA structure
      const htaTree = {
        goal: analyzedData.goal,
        strategicBranches: await this.generateStrategicBranches(analyzedData),
        frontierNodes: [],
        hierarchyMetadata: {
          total_tasks: 0,
          complexity: analyzedData.complexity,
          difficulty: analyzedData.difficulty,
          created: new Date().toISOString()
        }
      };

      // Save HTA tree
      await this.dataPersistence.saveProjectData(project.project_id, 'hta.json', htaTree);
      
      this.currentGateData.hta_building = {
        built_successfully: true,
        project_id: project.project_id,
        hta_tree: htaTree
      };

      return {
        ...htaTree,
        built_successfully: true,
        project_id: project.project_id
      };
    } catch (error) {
      return {
        error: error.message,
        built_successfully: false,
        retry_available: true
      };
    }
  }

  async generateStrategicBranches(analyzedData) {
    // Pure schema-driven branch generation via HTACore (LLM-powered, domain-agnostic)
    try {
      const branches = await this.htaCore.generateStrategicBranches(
        analyzedData.goal,
        { complexity: analyzedData.complexity, difficulty: analyzedData.difficulty },
        analyzedData.focus_areas || []
      );
      return branches;
    } catch (err) {
      console.warn('[GatedOnboardingFlow] Schema-driven branch generation failed, falling back:', err.message);
      return this.generateDomainSpecificBranches(analyzedData);
    }
  }
  
  // Legacy fallback – will be used only if LLM branch generation fails
  generateDomainSpecificBranches(analyzedData) {
    const goal = analyzedData.goal.toLowerCase();
    const branches = [];
    
    // Domain-specific branch generation based on goal analysis
    if (this.isAIorMLGoal(goal)) {
      branches.push(
        { name: 'Mathematical Foundations', phase: 'foundations', description: `Master mathematical concepts for ${analyzedData.goal}` },
        { name: 'Algorithm Understanding', phase: 'algorithms', description: `Learn key algorithms for ${analyzedData.goal}` },
        { name: 'Model Implementation', phase: 'implementation', description: `Build and train models for ${analyzedData.goal}` },
        { name: 'Advanced Applications', phase: 'applications', description: `Apply ${analyzedData.goal} to real problems` }
      );
    } else if (this.isCybersecurityGoal(goal)) {
      branches.push(
        { name: 'Security Fundamentals', phase: 'fundamentals', description: `Learn core security principles for ${analyzedData.goal}` },
        { name: 'Threat Analysis', phase: 'analysis', description: `Understand threats in ${analyzedData.goal}` },
        { name: 'Defense Implementation', phase: 'defense', description: `Implement security measures for ${analyzedData.goal}` },
        { name: 'Advanced Techniques', phase: 'advanced', description: `Master advanced techniques in ${analyzedData.goal}` }
      );
    } else if (this.isProgrammingGoal(goal)) {
      branches.push(
        { name: 'Language Mastery', phase: 'language', description: `Master the programming language for ${analyzedData.goal}` },
        { name: 'Problem-Solving Patterns', phase: 'patterns', description: `Learn patterns and practices for ${analyzedData.goal}` },
        { name: 'Project Development', phase: 'projects', description: `Build complete projects using ${analyzedData.goal}` },
        { name: 'Production Deployment', phase: 'deployment', description: `Deploy and scale ${analyzedData.goal} applications` }
      );
    } else if (this.isPhotographyGoal(goal)) {
      branches.push(
        { name: 'Camera Fundamentals', phase: 'camera', description: `Master camera basics for ${analyzedData.goal}` },
        { name: 'Composition Techniques', phase: 'composition', description: `Learn composition for ${analyzedData.goal}` },
        { name: 'Lighting Mastery', phase: 'lighting', description: `Master lighting techniques for ${analyzedData.goal}` },
        { name: 'Post-Processing', phase: 'processing', description: `Learn editing and processing for ${analyzedData.goal}` }
      );
    } else {
      // Domain-adaptive generic approach
      const mainTopic = this.extractMainTopic(analyzedData.goal);
      branches.push(
        { name: `${mainTopic} Foundations`, phase: 'foundations', description: `Build strong foundations in ${analyzedData.goal}` },
        { name: `${mainTopic} Skills`, phase: 'skills', description: `Develop practical skills in ${analyzedData.goal}` },
        { name: `${mainTopic} Application`, phase: 'application', description: `Apply ${analyzedData.goal} in real scenarios` },
        { name: `${mainTopic} Mastery`, phase: 'mastery', description: `Achieve mastery in ${analyzedData.goal}` }
      );
    }
    
    // Add mastery phase for high difficulty
    if (analyzedData.difficulty >= 7 && branches.length === 4) {
      const mainTopic = this.extractMainTopic(analyzedData.goal);
      branches.push({
        name: `${mainTopic} Innovation`,
        phase: 'innovation',
        description: `Innovate and contribute to ${analyzedData.goal}`
      });
    }
    
    return branches.map((branch, index) => ({
      id: `${branch.phase}-branch`,
      name: branch.name,
      phase: branch.phase,
      description: branch.description,
      estimatedDuration: this.calculatePhaseDuration(branch.phase, analyzedData.complexity),
      order: index,
      domain_specific: true
    }));
  }

  isAIorMLGoal(goal) {
    return /artificial intelligence|machine learning|neural network|deep learning|ai|ml|cnn|rnn|transformer|data science/i.test(goal);
  }

  isCybersecurityGoal(goal) {
    return /cybersecurity|security|penetration|vulnerability|hacking|encryption|firewall|infosec/i.test(goal);
  }

  isProgrammingGoal(goal) {
    return /programming|coding|development|software|javascript|python|java|react|node|web development/i.test(goal);
  }

  isPhotographyGoal(goal) {
    return /photography|photo|camera|lens|composition|lighting|portrait|landscape/i.test(goal);
  }

  extractMainTopic(goal) {
    // Extract the main topic from the goal
    const words = goal.split(' ');
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !['learn', 'master', 'understand', 'study', 'with', 'using', 'through'].includes(word.toLowerCase())
    );
    
    if (importantWords.length > 0) {
      return importantWords[0].charAt(0).toUpperCase() + importantWords[0].slice(1);
    }
    
    return 'Skill';
  }

  calculatePhaseDuration(phase, complexity) {
    const baseDurations = {
      foundation: 0.2,
      research: 0.25,
      capability: 0.3,
      implementation: 0.25,
      mastery: 0.15
    };

    const complexityMultiplier = {
      simple: 0.7,
      moderate: 1.0,
      complex: 1.4,
      advanced: 1.8
    };

    return baseDurations[phase] * (complexityMultiplier[complexity] || 1.0);
  }

  async vectorizeHtaTree(htaTree, projectId) {
    try {
      // Simulate vectorization process
      return {
        vectorized: true,
        project_id: projectId,
        nextGate: 'task_generation'
      };
    } catch (error) {
      return {
        vectorized: false,
        error: error.message
      };
    }
  }

  async validateHtaTreeCompletion(htaTree) {
    const complete = !!(htaTree.strategicBranches && 
                       htaTree.strategicBranches.length > 0 &&
                       htaTree.hierarchyMetadata);

    return {
      complete,
      branches_count: htaTree.strategicBranches?.length || 0,
      ready_for_tasks: complete
    };
  }

  // ===== GATE 8: TASK GENERATION AND DEPENDENCY ORDERING =====

  async generateInitialTaskBatch(htaTree, goal, userResponses) {
    const tasks = [];
    
    // Generate tasks for each strategic branch
    for (const branch of htaTree.strategicBranches) {
      const branchTasks = this.generateTasksForBranch(branch, goal, userResponses);
      tasks.push(...branchTasks);
    }

    // Order by dependencies
    const orderedTasks = await this.orderTasksByDependency(tasks);

    this.currentGateData.task_generation = {
      tasks: orderedTasks,
      ordered_by_dependency: true,
      total_generated: orderedTasks.length
    };

    return {
      tasks: orderedTasks,
      ordered_by_dependency: true,
      total_generated: orderedTasks.length
    };
  }

  generateTasksForBranch(branch, goal, userResponses) {
    const taskCount = this.calculateTaskCountForBranch(branch.phase);
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      const taskTitle = this.generateDomainSpecificTaskTitle(branch, i, goal);
      const taskDescription = this.generateDomainSpecificTaskDescription(branch, i, goal);
      
      tasks.push({
        id: `${branch.phase}_task_${i + 1}`,
        title: taskTitle,
        description: taskDescription,
        difficulty: this.calculateTaskDifficulty(branch.phase, i),
        dependencies: i > 0 ? [`${branch.phase}_task_${i}`] : [],
        branch_id: branch.id,
        phase: branch.phase,
        estimated_duration: 30 + (i * 15),
        priority: i === 0 ? 'high' : 'medium',
        domain_specific: true
      });
    }

    return tasks;
  }

  calculateTaskCountForBranch(phase) {
    const taskCounts = {
      'foundations': 3,
      'fundamentals': 3,
      'camera': 2,
      'language': 3,
      'algorithms': 2,
      'analysis': 2,
      'composition': 2,
      'patterns': 2,
      'skills': 2,
      'implementation': 2,
      'application': 2,
      'advanced': 2,
      'mastery': 1,
      'innovation': 1
    };
    
    return taskCounts[phase] || 2;
  }

  generateDomainSpecificTaskTitle(branch, taskIndex, goal) {
    const progressiveTerms = ['Introduction to', 'Understanding', 'Mastering', 'Advanced'];
    const termIndex = Math.min(taskIndex, progressiveTerms.length - 1);
    const progressiveTerm = progressiveTerms[termIndex];
    
    // Extract key domain terms from branch name and goal
    const branchTopic = branch.name.replace(/^(Mathematical|Algorithm|Model|Security|Threat|Defense|Language|Problem-Solving|Project|Camera|Composition|Lighting|Post-Processing)/, '');
    
    return `${progressiveTerm} ${branchTopic || branch.name}`;
  }

  generateDomainSpecificTaskDescription(branch, taskIndex, goal) {
    const goal_lower = goal.toLowerCase();
    
    // Generate contextual descriptions based on branch and domain
    if (branch.phase === 'foundations' || branch.phase === 'fundamentals') {
      return `Build essential knowledge and skills in ${branch.name.toLowerCase()} for ${goal}`;
    } else if (branch.phase === 'algorithms' || branch.phase === 'patterns') {
      return `Learn and practice key ${branch.name.toLowerCase()} relevant to ${goal}`;
    } else if (branch.phase === 'implementation' || branch.phase === 'projects') {
      return `Build practical projects using ${branch.name.toLowerCase()} for ${goal}`;
    } else if (branch.phase === 'application') {
      return `Apply ${branch.name.toLowerCase()} to real-world scenarios in ${goal}`;
    } else if (branch.phase === 'advanced' || branch.phase === 'mastery') {
      return `Master advanced techniques in ${branch.name.toLowerCase()} for ${goal}`;
    } else {
      return `Develop skills in ${branch.name.toLowerCase()} as part of ${goal}`;
    }
  }

  calculateTaskDifficulty(phase, taskIndex) {
    const baseDifficulties = {
      foundations: 2,
      fundamentals: 2,
      camera: 2,
      language: 3,
      algorithms: 4,
      analysis: 3,
      composition: 3,
      patterns: 4,
      skills: 3,
      implementation: 4,
      projects: 4,
      application: 4,
      defense: 5,
      advanced: 6,
      mastery: 7,
      innovation: 8,
      deployment: 5,
      processing: 3,
      lighting: 3
    };

    return (baseDifficulties[phase] || 3) + taskIndex;
  }

  async orderTasksByDependency(tasks) {
    // Simple topological sort
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (task) => {
      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected involving task ${task.id}`);
      }
      if (visited.has(task.id)) {
        return;
      }

      visiting.add(task.id);
      
      // Visit dependencies first
      for (const depId of task.dependencies || []) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) {
          visit(depTask);
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    try {
      for (const task of tasks) {
        visit(task);
      }
      return sorted;
    } catch (error) {
      return { error: error.message };
    }
  }

  async validateTaskGeneration(taskBatch) {
    const valid = taskBatch.tasks && 
                 taskBatch.tasks.length > 0 &&
                 taskBatch.ordered_by_dependency;

    return {
      valid,
      task_count: taskBatch.tasks?.length || 0,
      nextGate: valid ? 'first_task_recommendation' : 'task_generation'
    };
  }

  // ===== GATE 9: FIRST TASK RECOMMENDATION =====

  async recommendFirstTask(taskBatch, userProfile) {
    // Find optimal first task
    const availableTasks = taskBatch.tasks.filter(task => 
      !task.dependencies || task.dependencies.length === 0
    );

    let recommendedTask = availableTasks[0];
    let bestScore = 0;

    for (const task of availableTasks) {
      let score = 0;
      
      // Priority scoring
      if (task.priority === 'high') score += 30;
      else if (task.priority === 'medium') score += 20;
      
      // Difficulty matching
      const userLevel = userProfile.experience_level;
      if (userLevel === 'beginner' && task.difficulty <= 3) score += 25;
      else if (userLevel === 'intermediate' && task.difficulty >= 3 && task.difficulty <= 5) score += 25;
      else if (userLevel === 'advanced' && task.difficulty >= 4) score += 25;

      if (score > bestScore) {
        bestScore = score;
        recommendedTask = task;
      }
    }

    this.currentGateData.first_recommendation = {
      recommended_task: recommendedTask,
      reasoning: `Selected based on ${userProfile.experience_level} level and task priority`,
      onboarding_complete: true
    };

    return {
      recommended_task: recommendedTask,
      reasoning: `Optimal first task for ${userProfile.experience_level} level`,
      available_alternatives: availableTasks.length - 1,
      onboarding_complete: true
    };
  }

  async completeOnboarding(projectId, firstTaskId) {
    this.currentGateData.onboarding_status = {
      complete: true,
      project_id: projectId,
      first_task_recommended: firstTaskId,
      completed_at: new Date().toISOString()
    };

    return {
      onboarding_complete: true,
      first_task_recommended: firstTaskId,
      next_action: 'begin_task_execution',
      project_id: projectId
    };
  }

  async generateOnboardingSummary() {
    const intermediaryKeys = ['questionnaire_generation'];
    const completedGates = Object.keys(this.currentGateData).filter(k => !intermediaryKeys.includes(k)).length;
    
    return {
      gates_completed: completedGates,
      goal: this.currentGateData.goal_validation?.goal,
      context_provided: !!this.currentGateData.context_validation,
      tasks_generated: this.currentGateData.task_generation?.total_generated || 0,
      ready_to_start: this.currentGateData.first_recommendation?.onboarding_complete || false,
      summary_generated_at: new Date().toISOString()
    };
  }

  // ===== POST-ONBOARDING: TASK COMPLETION AND CONTEXT FOLDING =====

  async handleTaskCompletion(taskCompletion, projectId) {
    const contextData = {
      learned: taskCompletion.learned,
      questions: taskCompletion.next_questions,
      outcome: taskCompletion.outcome,
      difficulty_experienced: taskCompletion.difficulty_rating,
      time_spent: taskCompletion.time_spent,
      insights: this.extractInsights(taskCompletion.learned)
    };

    // Check for breakthrough
    const breakthrough = await this.detectBreakthrough({
      learned: taskCompletion.learned,
      breakthrough: taskCompletion.breakthrough
    });

    return {
      context_collected: true,
      collected_context: contextData,
      breakthrough_detected: breakthrough.breakthrough_detected,
      next_task_available: true,
      evolution_triggered: breakthrough.should_evolve_strategy
    };
  }

  extractInsights(learnedContent) {
    if (!learnedContent) return [];
    
    const insights = [];
    const insightKeywords = ['understand', 'realize', 'insight', 'breakthrough', 'clear', 'clicked'];
    
    insightKeywords.forEach(keyword => {
      if (learnedContent.toLowerCase().includes(keyword)) {
        insights.push(`Learning breakthrough: ${keyword}`);
      }
    });

    return insights;
  }

  async foldContextIntoNextTask(completedTaskContext, nextTask) {
    const enhancedTask = {
      ...nextTask,
      contextual_background: this.buildContextualBackground(completedTaskContext),
      relevant_insights: completedTaskContext.insights,
      builds_upon: completedTaskContext.learned,
      rich_background: completedTaskContext.learned?.length > 50
    };

    return {
      enhanced_task: enhancedTask,
      context_applied: true,
      background_rich: completedTaskContext.learned?.length > 50
    };
  }

  buildContextualBackground(context) {
    return `Building on your previous learning: ${context.learned || 'Previous task completed'}. ${
      context.questions ? `You're curious about: ${context.questions}` : ''
    }`;
  }

  async accumulateTaskContext(taskHistory) {
    /*
     * Build additive learning progression such that after each task
     * the cumulative knowledge includes all previous learning, e.g.
     * Task1 → Task1+Task2 → Task1+Task2+Task3
     */
    const progressiveSegments = [];
    const cumulativeStack = [];

    for (const task of taskHistory) {
      if (task && task.learned) {
        cumulativeStack.push(task.learned);
        progressiveSegments.push(cumulativeStack.join(' + '));
      }
    }

    const cumulativeLearning = progressiveSegments.join(' → ');

    const progressiveQuestions = taskHistory
      .map(t => t?.questions)
      .filter(Boolean);

    return {
      cumulative_learning: cumulativeLearning,
      progressive_questions: progressiveQuestions,
      learning_trajectory: taskHistory.length
    };
  }

  async combineTaskContexts(contexts) {
    // Collate learning across multiple completed tasks and build additive sequence
    const allLearning = contexts.map(c => c.learned).filter(Boolean);
    const allQuestions = contexts.map(c => c.questions).filter(Boolean);
    const allInsights = contexts.flatMap(c => c.insights || []);

    // Build additive progression: A → A+B → A+B+C
    const progressiveSegments = [];
    const cumulativeStack = [];
    for (const l of allLearning) {
      cumulativeStack.push(l);
      progressiveSegments.push(cumulativeStack.join(' + '));
    }
    const combinedLearned = progressiveSegments.join(' → ');

    return {
      learned: combinedLearned,
      questions: allQuestions.join(' + '),
      insights: allInsights,
      all_learning: allLearning,
      all_questions: allQuestions,
      all_insights: allInsights,
      rich_background: cumulativeStack.length >= 2
    };
  }

  // ===== BREAKTHROUGH DETECTION AND EVOLUTION =====

  async detectBreakthrough(completionData) {
    const breakthrough = completionData.breakthrough ||
      /breakthrough|major insight|everything clicked|significant progress/i.test(completionData.learned || '');

    return {
      breakthrough_detected: breakthrough,
      should_evolve_strategy: breakthrough,
      insight_level: breakthrough ? 'high' : 'normal'
    };
  }

  async triggerTreeEvolution(breakthroughData) {
    // Simulate tree evolution
    const newTasksGenerated = Math.floor(Math.random() * 3) + 2;
    
    return {
      evolution_triggered: true,
      new_tasks_generated: newTasksGenerated,
      evolution_type: 'breakthrough_expansion'
    };
  }

  async triggerBatchEvolution(pattern, projectId) {
    return {
      batch_evolved: true,
      pattern_addressed: pattern.pattern_type,
      difficulty_increased: pattern.pattern_type === 'rapid_progress',
      support_added: pattern.pattern_type === 'consistent_struggle'
    };
  }

  // ===== UTILITY METHODS =====

  async attemptGateProgression(targetGate, data) {
    const currentGateIndex = this.gateOrder.indexOf(targetGate);
    
    // Map gate names to their data keys
    const gateKeyMapping = {
      'landing_page': 'user_selection',
      'goal_collection': 'goal_validation', 
      'context_gathering': 'context_validation',
      'schema_analysis': 'schema_analysis',
      'questionnaire_generation': 'questionnaire_generation',
      'complexity_analysis': 'complexity_analysis',
      'hta_tree_building': 'hta_building',
      'task_generation': 'task_generation',
      'first_task_recommendation': 'first_recommendation'
    };
    
    // Check if all previous gates are complete
    for (let i = 0; i < currentGateIndex; i++) {
      const gateName = this.gateOrder[i];
      const gateKey = gateKeyMapping[gateName];
      if (!this.currentGateData[gateKey]) {
        return {
          blocked: true,
          reason: `Gate ${gateName} not completed`,
          missing_prerequisites: this.gateOrder.slice(0, currentGateIndex)
        };
      }
    }

    return {
      blocked: false,
      can_proceed: true,
      target_gate: targetGate
    };
  }

  getCurrentGateData() {
    return {
      ...this.currentGateData,
      goal: this.currentGateData.goal_validation?.goal,
      context: this.currentGateData.context_validation?.context,
      ready_for_schema_analysis: !!(
        this.currentGateData.goal_validation && 
        this.currentGateData.context_validation
      )
    };
  }

  async startSession(sessionId) {
    this.sessionStates.set(sessionId, {
      gateData: {},
      startedAt: new Date().toISOString()
    });
  }

  getSessionData(sessionId) {
    return this.sessionStates.get(sessionId)?.gateData || {};
  }
}