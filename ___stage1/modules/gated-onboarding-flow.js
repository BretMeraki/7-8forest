/**
 * Gated Onboarding Flow - Complete multi-stage onboarding with gates
 * 
 * Implements the full onboarding pipeline:
 * 1. Landing page → Start new project
 * 2. Goal/Dream capture (gated)
 * 3. Context grabber/summary (gated)
 * 4. Dynamic questionnaire (gated)
 * 5. Complexity analysis & HTA tree generation
 * 6. Strategic framework building
 * 7. "Next + Pipeline" task presentation
 */

import { IntelligentOnboardingSystem, OnboardingSessionManager } from './intelligent-onboarding-system.js';

export class GatedOnboardingFlow {
  constructor(dataPersistence, projectManagement, htaCore, coreIntelligence, vectorStore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.htaCore = htaCore;
    this.coreIntelligence = coreIntelligence;
    this.vectorStore = vectorStore;
    
    // Initialize intelligent onboarding system
    this.onboardingSystem = new IntelligentOnboardingSystem(coreIntelligence);
    this.sessionManager = new OnboardingSessionManager(this.onboardingSystem, dataPersistence);
    
    // Track onboarding state
    this.activeOnboardingSessions = new Map();
    this.onboardingStates = new Map();
  }

  /**
   * STAGE 1: Start New Project - Goal/Dream Capture (Gated)
   */
  async startNewProject(initialGoal, userContext = {}) {
    try {
      // Create project first
      const projectResult = await this.projectManagement.createProject({
        name: this.generateProjectName(initialGoal),
        goal: initialGoal,
        description: `Learning journey: ${initialGoal}`,
        context: userContext
      });

      if (!projectResult.success) {
        throw new Error(`Project creation failed: ${projectResult.error}`);
      }

      const projectId = projectResult.project_id;
      
      // Initialize onboarding state with context snowball tracking
      const onboardingState = {
        projectId,
        stage: 'goal_capture',
        goal: initialGoal,
        userContext,
        gates: {
          goal_captured: false,
          context_gathered: false,
          questionnaire_complete: false,
          complexity_analyzed: false,
          tree_generated: false,
          framework_built: false
        },
        capturedData: {},
        contextSnowball: {
          initial: userContext,
          accumulated: { ...userContext }, // Start with initial context
          stage_insights: {}, // Context learned at each stage
          evolution_history: [] // Track how context evolved
        },
        startTime: new Date().toISOString()
      };

      this.onboardingStates.set(projectId, onboardingState);

      // GATE 1: Goal/Dream Validation
      const goalValidation = await this.validateGoalClarity(initialGoal);
      
      if (!goalValidation.isValid) {
        return {
          success: false,
          stage: 'goal_capture',
          projectId,
          gate_status: 'blocked',
          message: goalValidation.message,
          suggestions: goalValidation.suggestions,
          action_required: 'refine_goal'
        };
      }

      // Goal is valid, proceed to next stage
      onboardingState.gates.goal_captured = true;
      onboardingState.capturedData.validatedGoal = goalValidation.refinedGoal;
      
      // CONTEXT SNOWBALL: Add goal insights to accumulated context
      const goalInsights = {
        refined_goal: goalValidation.refinedGoal,
        clarity_score: goalValidation.clarity_score,
        domain_hints: this.extractDomainHints(goalValidation.refinedGoal),
        complexity_indicators: this.extractComplexityIndicators(goalValidation.refinedGoal),
        measurability: goalValidation.measurability || 'medium',
        timeline_hints: this.extractTimelineHints(goalValidation.refinedGoal)
      };
      
      onboardingState.contextSnowball.stage_insights.goal_capture = goalInsights;
      onboardingState.contextSnowball.accumulated = {
        ...onboardingState.contextSnowball.accumulated,
        goal_insights: goalInsights
      };
      
      onboardingState.contextSnowball.evolution_history.push({
        stage: 'goal_capture',
        timestamp: new Date().toISOString(),
        context_added: goalInsights,
        context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
      });
      
      return {
        success: true,
        stage: 'goal_capture',
        projectId,
        gate_status: 'passed',
        message: '🎯 Goal captured successfully! Moving to context gathering...',
        next_stage: 'context_gathering',
        validated_goal: goalValidation.refinedGoal,
        context_insights: goalInsights
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.startNewProject failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'goal_capture',
        gate_status: 'error'
      };
    }
  }

  /**
   * STAGE 2: Context Gathering/Summary (Gated)
   */
  async gatherContext(projectId, contextData = {}) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      if (!onboardingState.gates.goal_captured) {
        return {
          success: false,
          stage: 'context_gathering',
          gate_status: 'blocked',
          message: 'Goal must be captured first',
          action_required: 'complete_goal_capture'
        };
      }

      // CONTEXT SNOWBALL: Use accumulated context for enhanced summary generation
      const contextSummary = await this.generateContextSummary(
        onboardingState.capturedData.validatedGoal,
        contextData,
        onboardingState.contextSnowball.accumulated // Pass accumulated context
      );

      console.error('[DEBUG] Context summary generated:', JSON.stringify(contextSummary, null, 2));
      console.error('[DEBUG] Input context data:', JSON.stringify(contextData, null, 2));

      // GATE 2: Context Completeness Check
      const contextValidation = await this.validateContextCompleteness(contextSummary);
      console.error('[DEBUG] Context validation result:', JSON.stringify(contextValidation, null, 2));
      
      if (!contextValidation.isComplete) {
        return {
          success: false,
          stage: 'context_gathering',
          gate_status: 'blocked',
          message: contextValidation.message,
          missing_info: contextValidation.missingInfo,
          action_required: 'provide_additional_context'
        };
      }

      // CONTEXT SNOWBALL: Add context insights to accumulated context
      const contextInsights = {
        background_analysis: this.analyzeBackground(contextSummary),
        constraint_analysis: this.analyzeConstraints(contextSummary),
        resource_analysis: this.analyzeResources(contextSummary),
        motivation_analysis: this.analyzeMotivation(contextSummary),
        learning_style_hints: this.extractLearningStyleHints(contextSummary)
      };
      
      onboardingState.contextSnowball.stage_insights.context_gathering = contextInsights;
      onboardingState.contextSnowball.accumulated = {
        ...onboardingState.contextSnowball.accumulated,
        context_insights: contextInsights,
        context_summary: contextSummary
      };
      
      onboardingState.contextSnowball.evolution_history.push({
        stage: 'context_gathering',
        timestamp: new Date().toISOString(),
        context_added: contextInsights,
        context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
      });

      // Context is complete, proceed to questionnaire
      onboardingState.stage = 'questionnaire';
      onboardingState.gates.context_gathered = true;
      onboardingState.capturedData.contextSummary = contextSummary;
      
      return {
        success: true,
        stage: 'context_gathering',
        gate_status: 'passed',
        message: '📝 Context gathered successfully! Starting dynamic questionnaire...',
        next_stage: 'questionnaire',
        context_summary: contextSummary,
        context_insights: contextInsights
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.gatherContext failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'context_gathering',
        gate_status: 'error'
      };
    }
  }

  /**
   * STAGE 3: Dynamic Questionnaire (Gated)
   */
  async startDynamicQuestionnaire(projectId) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      if (!onboardingState.gates.context_gathered) {
        return {
          success: false,
          stage: 'questionnaire',
          gate_status: 'blocked',
          message: 'Context must be gathered first',
          action_required: 'complete_context_gathering'
        };
      }

      // CONTEXT SNOWBALL: Start intelligent onboarding session with accumulated context
      const sessionResult = await this.sessionManager.startOnboardingSession(
        projectId,
        onboardingState.capturedData.validatedGoal,
        onboardingState.capturedData.contextSummary,
        onboardingState.contextSnowball.accumulated // Pass accumulated context
      );

      onboardingState.onboardingSessionId = sessionResult.sessionId;
      this.activeOnboardingSessions.set(projectId, sessionResult.sessionId);

      return {
        success: true,
        stage: 'questionnaire',
        gate_status: 'in_progress',
        message: '❓ Dynamic questionnaire generated! Please answer the following questions...',
        session_id: sessionResult.sessionId,
        first_question: sessionResult.firstQuestion,
        progress: sessionResult.progress
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.startDynamicQuestionnaire failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'questionnaire',
        gate_status: 'error'
      };
    }
  }

  /**
   * Process questionnaire response and check for completion
   */
  async processQuestionnaireResponse(projectId, questionId, response) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      const sessionId = onboardingState.onboardingSessionId;
      const result = await this.sessionManager.processResponseAndGetNext(sessionId, questionId, response);

      if (result.isComplete) {
        // GATE 3: Questionnaire Completion
        onboardingState.gates.questionnaire_complete = true;
        onboardingState.capturedData.questionnaireResults = result.enhancedContext;
        
        // CONTEXT SNOWBALL: Add questionnaire insights to accumulated context
        const questionnaireInsights = {
          enhanced_context: result.enhancedContext,
          learning_preferences: this.extractLearningPreferences(result.enhancedContext),
          skill_gaps: this.identifySkillGaps(result.enhancedContext),
          motivational_factors: this.extractMotivationalFactors(result.enhancedContext),
          constraint_refinements: this.refineConstraints(result.enhancedContext),
          success_metrics: this.defineSuccessMetrics(result.enhancedContext)
        };
        
        onboardingState.contextSnowball.stage_insights.questionnaire = questionnaireInsights;
        onboardingState.contextSnowball.accumulated = {
          ...onboardingState.contextSnowball.accumulated,
          questionnaire_insights: questionnaireInsights
        };
        
        onboardingState.contextSnowball.evolution_history.push({
          stage: 'questionnaire',
          timestamp: new Date().toISOString(),
          context_added: questionnaireInsights,
          context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
        });
        
        return {
          success: true,
          stage: 'questionnaire',
          gate_status: 'passed',
          message: '✅ Questionnaire completed! Starting complexity analysis...',
          next_stage: 'complexity_analysis',
          enhanced_context: result.enhancedContext,
          questionnaire_insights: questionnaireInsights
        };
      }

      return {
        success: true,
        stage: 'questionnaire',
        gate_status: 'in_progress',
        next_question: result.nextQuestion,
        progress: result.progress
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.processQuestionnaireResponse failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'questionnaire',
        gate_status: 'error'
      };
    }
  }

  /**
   * STAGE 4: Complexity Analysis (Gated)
   */
  async performComplexityAnalysis(projectId) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      if (!onboardingState.gates.questionnaire_complete) {
        return {
          success: false,
          stage: 'complexity_analysis',
          gate_status: 'blocked',
          message: 'Questionnaire must be completed first',
          action_required: 'complete_questionnaire'
        };
      }

      // CONTEXT SNOWBALL: Perform complexity analysis with full accumulated context
      const complexityAnalysis = await this.analyzeGoalComplexity(
        onboardingState.capturedData.validatedGoal,
        onboardingState.capturedData.contextSummary,
        onboardingState.capturedData.questionnaireResults,
        onboardingState.contextSnowball.accumulated // Pass full accumulated context
      );

      console.error('[DEBUG] Complexity analysis result:', JSON.stringify(complexityAnalysis, null, 2));

      // GATE 4: Complexity Analysis Validation
      const analysisValidation = await this.validateComplexityAnalysis(complexityAnalysis);
      
      console.error('[DEBUG] Complexity analysis validation:', JSON.stringify(analysisValidation, null, 2));
      
      if (!analysisValidation.isValid) {
        return {
          success: false,
          stage: 'complexity_analysis',
          gate_status: 'blocked',
          message: analysisValidation.message,
          action_required: 'refine_analysis'
        };
      }

      // CONTEXT SNOWBALL: Add complexity insights to accumulated context
      const complexityInsights = {
        complexity_analysis: complexityAnalysis,
        optimal_depth: this.determineOptimalDepth(complexityAnalysis),
        learning_path_strategy: this.determineLearningPathStrategy(complexityAnalysis),
        risk_factors: this.identifyRiskFactors(complexityAnalysis),
        success_predictors: this.identifySuccessPredictors(complexityAnalysis),
        adaptation_triggers: this.defineAdaptationTriggers(complexityAnalysis)
      };
      
      onboardingState.contextSnowball.stage_insights.complexity_analysis = complexityInsights;
      onboardingState.contextSnowball.accumulated = {
        ...onboardingState.contextSnowball.accumulated,
        complexity_insights: complexityInsights
      };
      
      onboardingState.contextSnowball.evolution_history.push({
        stage: 'complexity_analysis',
        timestamp: new Date().toISOString(),
        context_added: complexityInsights,
        context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
      });

      // Analysis is valid, proceed to HTA generation
      onboardingState.stage = 'hta_generation';
      onboardingState.gates.complexity_analyzed = true;
      onboardingState.capturedData.complexityAnalysis = complexityAnalysis;
      
      return {
        success: true,
        stage: 'complexity_analysis',
        gate_status: 'passed',
        message: '🧠 Complexity analysis completed! Generating HTA tree...',
        next_stage: 'hta_generation',
        complexity_analysis: complexityAnalysis,
        complexity_insights: complexityInsights
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.performComplexityAnalysis failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'complexity_analysis',
        gate_status: 'error'
      };
    }
  }

  /**
   * STAGE 5: HTA Tree Generation (Gated)
   */
  async generateHTATree(projectId) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      if (!onboardingState.gates.complexity_analyzed) {
        return {
          success: false,
          stage: 'hta_generation',
          gate_status: 'blocked',
          message: 'Complexity analysis must be completed first',
          action_required: 'complete_complexity_analysis'
        };
      }

      // CONTEXT SNOWBALL: Generate HTA tree with full accumulated context
      const htaArgs = {
        goal: onboardingState.capturedData.validatedGoal,
        context: onboardingState.capturedData.contextSummary,
        enhanced_context: onboardingState.capturedData.questionnaireResults,
        complexity_analysis: onboardingState.capturedData.complexityAnalysis,
        project_id: projectId,
        accumulated_context: onboardingState.contextSnowball.accumulated, // FULL CONTEXT SNOWBALL
        context_evolution: onboardingState.contextSnowball.evolution_history
      };

      const htaResult = await this.htaCore.buildHTATree(htaArgs);

      if (!htaResult.success) {
        return {
          success: false,
          stage: 'hta_generation',
          gate_status: 'blocked',
          message: 'HTA tree generation failed',
          error: htaResult.error,
          action_required: 'retry_hta_generation'
        };
      }

      // CONTEXT SNOWBALL: Add HTA insights to accumulated context
      const htaInsights = {
        hta_tree: htaResult,
        strategic_branches: htaResult.strategicBranches,
        tree_depth: htaResult.availableDepth,
        domain_boundaries: htaResult.domainBoundaries,
        learning_approach: htaResult.learningApproach,
        task_generation_strategy: this.analyzeTaskGenerationStrategy(htaResult),
        progression_logic: this.analyzeProgressionLogic(htaResult)
      };
      
      onboardingState.contextSnowball.stage_insights.hta_generation = htaInsights;
      onboardingState.contextSnowball.accumulated = {
        ...onboardingState.contextSnowball.accumulated,
        hta_insights: htaInsights
      };
      
      onboardingState.contextSnowball.evolution_history.push({
        stage: 'hta_generation',
        timestamp: new Date().toISOString(),
        context_added: htaInsights,
        context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
      });

      // HTA generated successfully, proceed to strategic framework
      onboardingState.stage = 'strategic_framework';
      onboardingState.gates.tree_generated = true;
      onboardingState.capturedData.htaTree = htaResult;
      
      return {
        success: true,
        stage: 'hta_generation',
        gate_status: 'passed',
        message: '🌳 HTA tree generated successfully! Building strategic framework...',
        next_stage: 'strategic_framework',
        hta_tree: htaResult,
        hta_insights: htaInsights
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.generateHTATree failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'hta_generation',
        gate_status: 'error'
      };
    }
  }

  /**
   * STAGE 6: Strategic Framework Building (Gated)
   * Note: The HTA tree IS the strategic framework - no additional generation needed
   */
  async buildStrategicFramework(projectId) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        throw new Error('Onboarding state not found');
      }

      if (!onboardingState.gates.tree_generated) {
        return {
          success: false,
          stage: 'strategic_framework',
          gate_status: 'blocked',
          message: 'HTA tree must be generated first',
          action_required: 'complete_hta_generation'
        };
      }

      // The HTA tree IS the strategic framework - extract framework info from it
      const htaTree = onboardingState.capturedData.htaTree;
      const strategicFramework = {
        phases: htaTree.level2_strategicBranches || htaTree.strategic_branches || [],
        task_generation_strategy: 'hta_based_progressive',
        learning_approach: htaTree.learningApproach || 'structured_hierarchical',
        tree_depth: htaTree.availableDepth || 4,
        domain_boundaries: htaTree.domainBoundaries || {},
        goal_context: htaTree.level1_goalContext || {},
        framework_type: 'hta_integrated',
        ready_for_task_generation: true
      };

      // CONTEXT SNOWBALL: Add framework insights to accumulated context
      const frameworkInsights = {
        framework_type: 'hta_based',
        strategic_approach: 'hierarchical_task_analysis',
        learning_phases: strategicFramework.phases,
        readiness_level: 'complete',
        task_generation_ready: true
      };
      
      onboardingState.contextSnowball.stage_insights.strategic_framework = frameworkInsights;
      onboardingState.contextSnowball.accumulated = {
        ...onboardingState.contextSnowball.accumulated,
        framework_insights: frameworkInsights
      };
      
      onboardingState.contextSnowball.evolution_history.push({
        stage: 'strategic_framework',
        timestamp: new Date().toISOString(),
        context_added: frameworkInsights,
        context_size: Object.keys(onboardingState.contextSnowball.accumulated).length
      });

      // Framework is complete (HTA tree), complete onboarding
      onboardingState.stage = 'completed';
      onboardingState.gates.framework_built = true;
      onboardingState.capturedData.strategicFramework = strategicFramework;
      onboardingState.completedAt = new Date().toISOString();
      
      return {
        success: true,
        stage: 'strategic_framework',
        gate_status: 'passed',
        message: '🏗️ Strategic framework completed! The HTA tree provides the complete learning strategy. Onboarding complete!',
        next_stage: 'task_presentation',
        strategic_framework: strategicFramework,
        onboarding_complete: true
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.buildStrategicFramework failed:', error);
      return {
        success: false,
        error: error.message,
        stage: 'strategic_framework',
        gate_status: 'error'
      };
    }
  }

  /**
   * Get current onboarding status
   */
  async getOnboardingStatus(projectId) {
    try {
      const onboardingState = this.onboardingStates.get(projectId);
      if (!onboardingState) {
        return {
          success: false,
          message: 'No onboarding in progress for this project'
        };
      }

      return {
        success: true,
        projectId,
        current_stage: onboardingState.stage,
        gates: onboardingState.gates,
        progress: this.calculateOnboardingProgress(onboardingState.gates),
        started_at: onboardingState.startTime,
        completed_at: onboardingState.completedAt
      };

    } catch (error) {
      console.error('GatedOnboardingFlow.getOnboardingStatus failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper Methods
   */

  generateProjectName(goal) {
    const words = goal.split(' ').slice(0, 3);
    return words.join(' ') + ' Journey';
  }

  async validateGoalClarity(goal) {
    try {
      // CRITICAL FIX: Use local validation logic instead of broken generateLogicalDeductions
      // This prevents well-formed goals from being rejected as "too broad"
      
      if (!goal || typeof goal !== 'string') {
        return {
          isValid: false,
          message: 'Please provide a learning goal.',
          suggestions: ['Enter a specific goal like "Learn Python for data analysis"']
        };
      }
      
      const trimmedGoal = goal.trim();
      
      // Very basic validation - only reject truly problematic goals
      if (trimmedGoal.length < 10) {
        return {
          isValid: false,
          message: 'Your goal seems too short. Please provide more detail.',
          suggestions: [
            'Add more context about what you want to learn',
            'Include what you want to achieve or build'
          ]
        };
      }
      
      // Check for completely generic goals that have no learning content
      const veryGenericPatterns = [
        /^(learn|study|understand)\s*$/i,
        /^(get better|improve|become good)\s*$/i,
        /^(help|assist|support)\s*$/i,
        /^(test|testing|check)\s*$/i
      ];
      
      if (veryGenericPatterns.some(pattern => pattern.test(trimmedGoal))) {
        return {
          isValid: false,
          message: 'Please be more specific about what you want to learn.',
          suggestions: [
            'Add the subject area you want to focus on',
            'Include what you want to be able to do afterward'
          ]
        };
      }
      
      // All other goals are considered valid - let the HTA system handle complexity
      // This is much more lenient and prevents false rejections
      
      // Extract basic domain hints for context
      const domainHints = this.extractDomainHints(trimmedGoal);
      const timelineHints = this.extractTimelineHints(trimmedGoal);
      
      return {
        isValid: true,
        clarity_score: this.calculateBasicClarityScore(trimmedGoal),
        refinedGoal: trimmedGoal,
        message: '✅ Goal accepted - creating your personalized learning journey!',
        measurability: this.assessMeasurability(trimmedGoal),
        domain_hints: domainHints,
        timeline_hints: timelineHints
      };
      
    } catch (error) {
      console.error('Goal validation failed:', error);
      // Even on error, be lenient - don't block the user
      return {
        isValid: true,
        clarity_score: 6,
        refinedGoal: goal,
        message: '✅ Goal accepted (validation had issues but proceeding)',
        measurability: 'medium'
      };
    }
  }

  calculateBasicClarityScore(goal) {
    // Simple scoring based on length and presence of key indicators
    let score = 5;
    if (goal.length >= 20) score += 1;
    if (/\b(build|create|develop|master|design|analyze|optimize)\b/.test(goal.toLowerCase())) score += 1.5;
    if (/\b(finish|complete|achieve|reach|gain)\b/.test(goal.toLowerCase())) score += 1.5;
    return Math.min(score, 10);
  }

  assessMeasurability(goal) {
    // Very rudimentary measurability assessment
    if (/\b(measurable|quantifiable|metrics|kpis|goals)\b/.test(goal.toLowerCase())) {
      return 'high';
    }
    if (/\b(improve|better|more|less)\b/.test(goal.toLowerCase())) {
      return 'medium';
    }
    return 'low';
  }

  async generateContextSummary(goal, contextData) {
    try {
      console.error('[DEBUG] generateContextSummary called with:', JSON.stringify({goal, contextData}, null, 2));
      
      // If contextData already has the required fields, use them directly
      if (contextData.background && contextData.constraints && contextData.motivation && contextData.timeline) {
        const result = {
          background: contextData.background,
          constraints: contextData.constraints,
          motivation: contextData.motivation,
          timeline: contextData.timeline,
          // Include additional fields if present
          available_time: contextData.available_time,
          budget: contextData.budget,
          learning_style: contextData.learning_style,
          current_skills: contextData.current_skills
        };
        console.error('[DEBUG] Returning direct context data:', JSON.stringify(result, null, 2));
        return result;
      }

      const prompt = `Generate a comprehensive context summary for this learning goal:

Goal: "${goal}"
Context Data: ${JSON.stringify(contextData, null, 2)}

Create a summary that includes:
1. User background and experience
2. Learning environment and constraints
3. Motivation and timeline
4. Available resources
5. Success criteria and measurements

Format as a structured summary suitable for HTA generation.`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Context summary generation',
        prompt
      });

      // Ensure response has required fields
      const summary = response.content || response;
      return {
        background: summary.background || contextData.background || 'Unknown',
        constraints: summary.constraints || contextData.constraints || [],
        motivation: summary.motivation || contextData.motivation || 'Personal development',
        timeline: summary.timeline || contextData.timeline || 'Flexible',
        // Include additional context data
        ...contextData
      };

    } catch (error) {
      console.error('Context summary generation failed:', error);
      return {
        background: contextData.background || 'Unknown',
        constraints: contextData.constraints || [],
        motivation: contextData.motivation || 'Personal development',
        timeline: contextData.timeline || 'Flexible',
        resources: 'Standard'
      };
    }
  }

  async validateContextCompleteness(contextSummary) {
    // Simple validation - in production this would use LLM
    const requiredFields = ['background', 'constraints', 'motivation', 'timeline'];
    const missingFields = requiredFields.filter(field => !contextSummary[field]);

    return {
      isComplete: missingFields.length === 0,
      message: missingFields.length > 0 ? 
        `Missing context information: ${missingFields.join(', ')}` : 
        'Context is complete',
      missingInfo: missingFields
    };
  }

  async analyzeGoalComplexity(goal, contextSummary, questionnaireResults) {
    try {
      const prompt = `Analyze the complexity of this learning goal:

Goal: "${goal}"
Context: ${JSON.stringify(contextSummary, null, 2)}
Questionnaire Results: ${JSON.stringify(questionnaireResults, null, 2)}

Determine:
1. Complexity level (1-10)
2. Required depth of HTA tree
3. Optimal learning path characteristics
4. Risk factors and mitigation strategies
5. Estimated timeline for achievement

Response format:
{
  "complexity_level": 1-10,
  "tree_depth": 3-7,
  "path_characteristics": {},
  "risk_factors": [],
  "estimated_timeline": "string"
}`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Complexity analysis for HTA generation',
        prompt
      });

      return response;

    } catch (error) {
      console.error('Complexity analysis failed:', error);
      return {
        complexity_level: 5,
        tree_depth: 4,
        path_characteristics: { approach: 'balanced' },
        risk_factors: ['time_constraints'],
        estimated_timeline: '3-6 months'
      };
    }
  }

  async validateComplexityAnalysis(analysis) {
    return {
      isValid: analysis.complexity_level && analysis.tree_depth,
      message: analysis.complexity_level && analysis.tree_depth ? 
        'Complexity analysis is valid' : 
        'Complexity analysis needs refinement'
    };
  }

  async generateStrategicFramework(htaTree, complexityAnalysis, questionnaireResults) {
    try {
      const prompt = `Generate a strategic learning framework based on:

HTA Tree: ${JSON.stringify(htaTree, null, 2)}
Complexity Analysis: ${JSON.stringify(complexityAnalysis, null, 2)}
User Profile: ${JSON.stringify(questionnaireResults, null, 2)}

Create a framework that includes:
1. Learning phases and milestones
2. Task selection strategies
3. Progress tracking methods
4. Adaptation triggers
5. Success metrics

Format as a structured framework for task generation.`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Strategic framework generation',
        prompt
      });

      return response;

    } catch (error) {
      console.error('Strategic framework generation failed:', error);
      return {
        phases: ['foundation', 'building', 'mastery'],
        task_selection: 'progressive',
        tracking: 'milestone-based',
        adaptation: 'feedback-driven',
        success_metrics: ['completion_rate', 'understanding_depth']
      };
    }
  }

  async validateStrategicFramework(framework) {
    return {
      isValid: framework.phases && framework.task_selection,
      message: framework.phases && framework.task_selection ? 
        'Strategic framework is valid' : 
        'Strategic framework needs refinement'
    };
  }

  calculateOnboardingProgress(gates) {
    const totalGates = Object.keys(gates).length;
    const completedGates = Object.values(gates).filter(g => g).length;
    return Math.round((completedGates / totalGates) * 100);
  }

  // ========== CONTEXT SNOWBALL EXTRACTION METHODS ==========

  extractDomainHints(goal) {
    const goalLower = goal.toLowerCase();
    const hints = [];
    
    // Extract domain-specific keywords without hardcoding domains
    const technicalPatterns = /\b(implement|build|develop|create|design|code|program|algorithm|system|framework|model|application|software|technical|engineering|scientific|research|data|analysis|optimization|automation)\b/g;
    const creativePattterns = /\b(creative|artistic|design|visual|aesthetic|composition|style|artistic|photography|music|writing|content|media|marketing|branding)\b/g;
    const businessPatterns = /\b(business|management|strategy|leadership|marketing|sales|finance|operations|entrepreneurship|consulting|project|team|organization)\b/g;
    
    if (technicalPatterns.test(goalLower)) hints.push('technical');
    if (creativePattterns.test(goalLower)) hints.push('creative');
    if (businessPatterns.test(goalLower)) hints.push('business');
    
    return hints;
  }

  extractComplexityIndicators(goal) {
    const goalLower = goal.toLowerCase();
    const indicators = [];
    
    if (/\b(master|expert|advanced|comprehensive|professional|complete|full|thorough|deep)\b/g.test(goalLower)) {
      indicators.push('high-complexity');
    }
    if (/\b(multi|multiple|various|different|complex|integrated|combine|synthesize)\b/g.test(goalLower)) {
      indicators.push('multi-faceted');
    }
    if (/\b(beginner|basic|introduction|learn|understand|start|begin|simple)\b/g.test(goalLower)) {
      indicators.push('entry-level');
    }
    
    return indicators;
  }

  extractTimelineHints(goal) {
    const goalLower = goal.toLowerCase();
    const hints = [];
    
    if (/\b(quickly|fast|rapid|asap|urgent|immediate|soon)\b/g.test(goalLower)) {
      hints.push('urgent');
    }
    if (/\b(eventually|gradually|slowly|over time|long term|patient)\b/g.test(goalLower)) {
      hints.push('gradual');
    }
    if (/\b(daily|weekly|monthly|regularly|consistently|habit)\b/g.test(goalLower)) {
      hints.push('regular-practice');
    }
    
    return hints;
  }

  analyzeBackground(contextSummary) {
    return {
      experience_level: contextSummary.experience_level || 'unknown',
      relevant_skills: contextSummary.relevant_skills || [],
      domain_familiarity: contextSummary.domain_familiarity || 'unfamiliar',
      learning_history: contextSummary.learning_history || []
    };
  }

  analyzeConstraints(contextSummary) {
    return {
      time_constraints: contextSummary.time_constraints || [],
      resource_constraints: contextSummary.resource_constraints || [],
      environmental_constraints: contextSummary.environmental_constraints || [],
      skill_constraints: contextSummary.skill_constraints || []
    };
  }

  analyzeResources(contextSummary) {
    return {
      available_time: contextSummary.available_time || 'flexible',
      budget: contextSummary.budget || 'moderate',
      tools_access: contextSummary.tools_access || [],
      support_network: contextSummary.support_network || []
    };
  }

  analyzeMotivation(contextSummary) {
    return {
      primary_drivers: contextSummary.motivation_drivers || [],
      success_definition: contextSummary.success_definition || '',
      urgency_level: contextSummary.urgency_level || 'moderate',
      commitment_level: contextSummary.commitment_level || 'high'
    };
  }

  extractLearningStyleHints(contextSummary) {
    return {
      preferred_methods: contextSummary.preferred_learning_methods || [],
      pace_preference: contextSummary.pace_preference || 'moderate',
      interaction_style: contextSummary.interaction_style || 'mixed',
      feedback_preference: contextSummary.feedback_preference || 'regular'
    };
  }

  extractLearningPreferences(enhancedContext) {
    return {
      hands_on_vs_theory: enhancedContext.hands_on_vs_theory || 'balanced',
      individual_vs_group: enhancedContext.individual_vs_group || 'individual',
      structured_vs_flexible: enhancedContext.structured_vs_flexible || 'structured',
      depth_vs_breadth: enhancedContext.depth_vs_breadth || 'depth'
    };
  }

  identifySkillGaps(enhancedContext) {
    return {
      current_skills: enhancedContext.current_skills || [],
      required_skills: enhancedContext.required_skills || [],
      skill_gaps: enhancedContext.skill_gaps || [],
      priority_gaps: enhancedContext.priority_gaps || []
    };
  }

  extractMotivationalFactors(enhancedContext) {
    return {
      intrinsic_motivation: enhancedContext.intrinsic_motivation || [],
      extrinsic_motivation: enhancedContext.extrinsic_motivation || [],
      success_rewards: enhancedContext.success_rewards || [],
      failure_concerns: enhancedContext.failure_concerns || []
    };
  }

  refineConstraints(enhancedContext) {
    return {
      refined_time_constraints: enhancedContext.refined_time_constraints || [],
      refined_resource_constraints: enhancedContext.refined_resource_constraints || [],
      new_constraints_discovered: enhancedContext.new_constraints_discovered || [],
      constraint_priorities: enhancedContext.constraint_priorities || []
    };
  }

  defineSuccessMetrics(enhancedContext) {
    return {
      measurable_outcomes: enhancedContext.measurable_outcomes || [],
      milestone_definitions: enhancedContext.milestone_definitions || [],
      progress_indicators: enhancedContext.progress_indicators || [],
      success_criteria: enhancedContext.success_criteria || []
    };
  }

  determineOptimalDepth(complexityAnalysis) {
    const complexity = complexityAnalysis.complexity_score || 5;
    if (complexity >= 8) return 6;
    if (complexity >= 6) return 5;
    if (complexity >= 4) return 4;
    return 3;
  }

  determineLearningPathStrategy(complexityAnalysis) {
    return {
      approach: complexityAnalysis.recommended_approach || 'progressive',
      pacing: complexityAnalysis.recommended_pacing || 'moderate',
      emphasis: complexityAnalysis.recommended_emphasis || 'balanced',
      sequencing: complexityAnalysis.recommended_sequencing || 'logical'
    };
  }

  identifyRiskFactors(complexityAnalysis) {
    return complexityAnalysis.risk_factors || [
      'time_management',
      'complexity_overwhelm',
      'motivation_decline',
      'skill_gaps'
    ];
  }

  identifySuccessPredictors(complexityAnalysis) {
    return complexityAnalysis.success_predictors || [
      'consistent_practice',
      'clear_milestones',
      'adequate_resources',
      'support_network'
    ];
  }

  defineAdaptationTriggers(complexityAnalysis) {
    return {
      difficulty_triggers: ['task_failure_rate_high', 'time_overrun_consistent'],
      engagement_triggers: ['completion_rate_low', 'feedback_negative'],
      progression_triggers: ['milestone_missed', 'skill_gap_identified'],
      context_triggers: ['constraint_change', 'resource_availability_change']
    };
  }

  analyzeTaskGenerationStrategy(htaResult) {
    return {
      depth_strategy: htaResult.availableDepth ? 'progressive' : 'fixed',
      branch_strategy: htaResult.strategicBranches ? 'domain-adaptive' : 'generic',
      task_complexity: htaResult.complexity?.level || 'moderate',
      adaptation_capability: htaResult.canExpand ? 'expandable' : 'static'
    };
  }

  analyzeProgressionLogic(htaResult) {
    return {
      logical_sequence: htaResult.strategicBranches ? 'branch-based' : 'linear',
      dependency_handling: 'prerequisite-aware',
      difficulty_progression: 'gradual-increase',
      context_adaptation: 'user-responsive'
    };
  }

  async generateContextSummary(goal, contextData, accumulatedContext) {
    try {
      console.error('[DEBUG] generateContextSummary (with accumulated context) called with:', JSON.stringify({goal, contextData, accumulatedContext}, null, 2));
      
      // If contextData already has the required fields, use them directly
      if (contextData && contextData.background && contextData.constraints && contextData.motivation && contextData.timeline) {
        const result = {
          background: contextData.background,
          constraints: contextData.constraints,
          motivation: contextData.motivation,
          timeline: contextData.timeline,
          // Include additional fields if present
          available_time: contextData.available_time,
          budget: contextData.budget,
          learning_style: contextData.learning_style,
          current_skills: contextData.current_skills,
          // Include accumulated context insights
          accumulated_context: accumulatedContext
        };
        console.error('[DEBUG] Returning direct context data with accumulated context:', JSON.stringify(result, null, 2));
        return result;
      }

      const prompt = `Generate a comprehensive context summary for this learning goal using accumulated context:

Goal: "${goal}"
New Context Data: ${JSON.stringify(contextData, null, 2)}
Accumulated Context: ${JSON.stringify(accumulatedContext, null, 2)}

Create a summary that builds upon the accumulated context and includes:
1. Enhanced user background and experience
2. Refined learning environment and constraints
3. Deeper motivation and timeline understanding
4. Comprehensive available resources
5. Evolved success criteria and measurements
6. Context insights from previous stages

Format as a structured JSON object with required fields: background, constraints, motivation, timeline.`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Context summary generation with accumulated context',
        prompt
      });

      // Ensure response has required fields as structured object
      const summary = response.content || response;
      const result = {
        background: summary.background || contextData?.background || 'Unknown',
        constraints: summary.constraints || contextData?.constraints || [],
        motivation: summary.motivation || contextData?.motivation || 'Personal development',
        timeline: summary.timeline || contextData?.timeline || 'Flexible',
        // Include additional context data
        ...(contextData || {}),
        accumulated_context: accumulatedContext
      };
      
      console.error('[DEBUG] Generated context summary with accumulated context:', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.error('Context summary generation failed:', error);
      return {
        background: contextData?.background || 'Unknown',
        constraints: contextData?.constraints || [],
        motivation: contextData?.motivation || 'Personal development',
        timeline: contextData?.timeline || 'Flexible',
        resources: 'Standard',
        accumulated_context: accumulatedContext
      };
    }
  }

  async analyzeGoalComplexity(goal, contextSummary, questionnaireResults, accumulatedContext) {
    try {
      const prompt = `Analyze the complexity of this learning goal using comprehensive accumulated context:

Goal: "${goal}"
Context: ${JSON.stringify(contextSummary, null, 2)}
Questionnaire Results: ${JSON.stringify(questionnaireResults, null, 2)}
Accumulated Context: ${JSON.stringify(accumulatedContext, null, 2)}

Provide complexity analysis that builds upon all gathered context including:
1. Overall complexity score (1-10) based on accumulated insights
2. Key complexity factors identified through the journey
3. Recommended learning depth informed by user profile
4. Timeline estimates based on constraints and preferences
5. Risk factors considering accumulated context
6. Success predictors based on user characteristics
7. Adaptation strategies based on learning preferences

Format as structured JSON that incorporates the context snowball.`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Goal complexity analysis with accumulated context',
        prompt
      });

      return response.content || response || {
        complexity_score: 5,
        factors: ['Standard learning complexity'],
        recommended_depth: 3,
        timeline: '3-6 months',
        risks: ['Time management'],
        accumulated_context_used: true
      };

    } catch (error) {
      console.error('Complexity analysis failed:', error);
      return {
        complexity_score: 5,
        factors: ['Analysis failed - using defaults'],
        recommended_depth: 3,
        timeline: '3-6 months',
        risks: ['Unknown complexity'],
        accumulated_context_used: false
      };
    }
  }
}
