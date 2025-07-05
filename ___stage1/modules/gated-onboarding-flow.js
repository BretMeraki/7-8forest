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
      
      // Initialize onboarding state
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
      
      return {
        success: true,
        stage: 'goal_capture',
        projectId,
        gate_status: 'passed',
        message: '🎯 Goal captured successfully! Moving to context gathering...',
        next_stage: 'context_gathering',
        validated_goal: goalValidation.refinedGoal
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

      // Generate context summary using LLM
      const contextSummary = await this.generateContextSummary(
        onboardingState.capturedData.validatedGoal,
        contextData
      );

      // GATE 2: Context Completeness Check
      const contextValidation = await this.validateContextCompleteness(contextSummary);
      
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
        context_summary: contextSummary
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

      // Start intelligent onboarding session
      const sessionResult = await this.sessionManager.startOnboardingSession(
        projectId,
        onboardingState.capturedData.validatedGoal,
        onboardingState.capturedData.contextSummary
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
        
        return {
          success: true,
          stage: 'questionnaire',
          gate_status: 'passed',
          message: '✅ Questionnaire completed! Starting complexity analysis...',
          next_stage: 'complexity_analysis',
          enhanced_context: result.enhancedContext
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

      // Perform complexity analysis
      const complexityAnalysis = await this.analyzeGoalComplexity(
        onboardingState.capturedData.validatedGoal,
        onboardingState.capturedData.contextSummary,
        onboardingState.capturedData.questionnaireResults
      );

      // GATE 4: Complexity Analysis Validation
      const analysisValidation = await this.validateComplexityAnalysis(complexityAnalysis);
      
      if (!analysisValidation.isValid) {
        return {
          success: false,
          stage: 'complexity_analysis',
          gate_status: 'blocked',
          message: analysisValidation.message,
          action_required: 'refine_analysis'
        };
      }

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
        complexity_analysis: complexityAnalysis
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

      // Generate HTA tree with all collected context
      const htaArgs = {
        goal: onboardingState.capturedData.validatedGoal,
        context: onboardingState.capturedData.contextSummary,
        enhanced_context: onboardingState.capturedData.questionnaireResults,
        complexity_analysis: onboardingState.capturedData.complexityAnalysis,
        project_id: projectId
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
        hta_tree: htaResult
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

      // Build strategic framework
      const strategicFramework = await this.generateStrategicFramework(
        onboardingState.capturedData.htaTree,
        onboardingState.capturedData.complexityAnalysis,
        onboardingState.capturedData.questionnaireResults
      );

      // GATE 6: Framework Validation
      const frameworkValidation = await this.validateStrategicFramework(strategicFramework);
      
      if (!frameworkValidation.isValid) {
        return {
          success: false,
          stage: 'strategic_framework',
          gate_status: 'blocked',
          message: frameworkValidation.message,
          action_required: 'refine_framework'
        };
      }

      // Framework is valid, complete onboarding
      onboardingState.stage = 'completed';
      onboardingState.gates.framework_built = true;
      onboardingState.capturedData.strategicFramework = strategicFramework;
      onboardingState.completedAt = new Date().toISOString();
      
      return {
        success: true,
        stage: 'strategic_framework',
        gate_status: 'passed',
        message: '🏗️ Strategic framework built successfully! Onboarding complete!',
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
      const prompt = `Analyze this learning goal for clarity and actionability:

Goal: "${goal}"

Assessment criteria:
1. Is the goal specific and measurable?
2. Is it achievable with structured learning?
3. Are there clear success indicators?
4. Is the domain well-defined?

Response format:
{
  "isValid": boolean,
  "clarity_score": 1-10,
  "refinedGoal": "improved version if needed",
  "message": "explanation",
  "suggestions": ["array of suggestions if invalid"]
}`;

      const response = await this.coreIntelligence.generateLogicalDeductions({
        context: 'Goal validation for onboarding',
        prompt
      });

      return response.isValid ? response : {
        isValid: false,
        message: 'Goal needs refinement for optimal learning path generation',
        suggestions: ['Make the goal more specific', 'Add measurable outcomes', 'Define success criteria']
      };

    } catch (error) {
      console.error('Goal validation failed:', error);
      return {
        isValid: false,
        message: 'Goal validation failed - please refine your goal',
        suggestions: ['Try a more specific goal', 'Include what you want to achieve']
      };
    }
  }

  async generateContextSummary(goal, contextData) {
    try {
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

      return response.content || response;

    } catch (error) {
      console.error('Context summary generation failed:', error);
      return {
        background: 'Unknown',
        constraints: [],
        motivation: 'Personal development',
        timeline: 'Flexible',
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
}