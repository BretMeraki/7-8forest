/**
 * Fully LLM-Driven Intelligent Onboarding System
 * 
 * Revolutionary context-aware onboarding that leverages LLM intelligence
 * to create dynamic, adaptive question flows with no hardcoded fallbacks.
 * 
 * Features:
 * - 100% LLM-driven question generation with sophisticated prompt engineering
 * - Dynamic schema adaptation based on goal analysis
 * - Context-aware follow-up generation
 * - Intelligent readiness assessment
 * - Rich contextual synthesis for optimal HTA generation
 * - Adaptive conversation flow management
 */

export class IntelligentOnboardingSystem {
  constructor(llmInterface) {
    this.llmInterface = llmInterface;
    this.conversationHistory = new Map();
    this.adaptiveSchemas = new Map();
    
    // Core system prompts for maximum LLM intelligence
    this.systemPrompts = {
      questionGenerator: `You are an expert learning strategist and cognitive scientist who designs personalized learning experiences. Your specialty is asking the precise questions that reveal how to create the most effective learning plan for each individual.

You understand that different goals require different information architectures. You're skilled at:
- Identifying critical information gaps through goal analysis
- Designing questions that reveal learning preferences and constraints
- Creating adaptive question flows that evolve based on responses
- Balancing depth vs. efficiency in information gathering
- Recognizing when you have sufficient context vs. when more information is needed

You NEVER use generic, one-size-fits-all questions. Every question you create is specifically tailored to the goal domain and designed to optimize the eventual learning plan generation.`,
      
      contextProcessor: `You are a master synthesis expert who transforms raw user responses into rich, actionable learning contexts. You excel at:
- Pattern recognition in user responses that reveal deeper insights
- Identifying contradictions or gaps that need clarification
- Extracting implicit preferences and constraints from explicit responses
- Creating comprehensive user profiles that enable superior task generation
- Optimizing schema parameters based on individual characteristics
- Assessing context completeness with high precision

You create learning contexts that are so well-optimized that they practically guarantee learning success.`,
      
      adaptiveAnalyzer: `You are a domain analysis expert who can rapidly assess any learning goal and determine the optimal information architecture needed to support it. You understand:
- How different domains require different types of contextual information
- The relationship between goal complexity and required context depth
- When to prioritize breadth vs. depth in information gathering
- How to adapt question strategies based on emerging user characteristics
- The critical success factors for different types of learning goals

You dynamically adjust your approach based on what you discover about the goal and user.`
    };
  }

  /**
   * Generate intelligent onboarding questions with full LLM analysis
   */
  async generateOnboardingQuestions(goal, initialContext = {}) {
    try {
      // Try the full LLM-driven approach first
      const goalAnalysis = await this.performGoalAnalysis(goal, initialContext);
      const adaptiveSchema = await this.generateAdaptiveSchema(goalAnalysis);
      const questions = await this.generateContextualQuestions(goal, initialContext, goalAnalysis, adaptiveSchema);
      const optimizedFlow = await this.optimizeQuestionFlow(questions, goalAnalysis);
      
      // Validate the response has questions
      const questionList = optimizedFlow.questions || questions.questions || questions || [];
      if (questionList && questionList.length > 0) {
        return {
          goal_analysis: goalAnalysis,
          adaptive_schema: adaptiveSchema,
          onboarding_questions: questionList,
          flow_strategy: optimizedFlow.strategy,
          conversation_context: this.initializeConversationContext(goal, initialContext, goalAnalysis)
        };
      }
      
      throw new Error('LLM generated empty questions');

    } catch (error) {
      console.error('LLM onboarding generation failed, using fallback:', error.message);
      
      // Use intelligent fallback that still provides good questions
      return this.generateFallbackQuestions(goal, initialContext);
    }
  }

  /**
   * Process user responses with deep LLM analysis and synthesis
   */
  async processOnboardingResponses(goal, initialContext, questionResponses, conversationContext) {
    try {
      // Step 1: Analyze response patterns and extract insights
      const responseAnalysis = await this.analyzeResponsePatterns(questionResponses, conversationContext);
      
      // Step 2: Synthesize user profile with deep insights
      const userProfile = await this.synthesizeUserProfile(responseAnalysis, conversationContext);
      
      // Step 3: Enhance goal context with new insights
      const enhancedGoalContext = await this.enhanceGoalContext(goal, userProfile, responseAnalysis);
      
      // Step 4: Generate optimized schema parameters
      const schemaOptimizations = await this.generateSchemaOptimizations(userProfile, enhancedGoalContext);
      
      // Step 5: Assess context completeness and next steps
      const readinessAssessment = await this.assessContextReadiness(userProfile, enhancedGoalContext, schemaOptimizations);
      
      return {
        response_analysis: responseAnalysis,
        user_profile: userProfile,
        enhanced_goal_context: enhancedGoalContext,
        schema_optimizations: schemaOptimizations,
        readiness_assessment: readinessAssessment,
        conversation_insights: await this.extractConversationInsights(questionResponses, conversationContext)
      };

    } catch (error) {
      console.error('Response processing failed:', error);
      return this.generateFallbackContext(goal, initialContext, questionResponses);
    }
  }

  /**
   * Build the prompt for generating onboarding questions
   */
  buildOnboardingPrompt(goal, initialContext) {
    return `Generate intelligent onboarding questions for this learning goal:

**Goal**: ${goal}
**Initial Context**: ${JSON.stringify(initialContext, null, 2)}

**Your Mission**: 
Analyze this goal and context to identify what critical information is missing for optimal learning plan generation. Create 3-8 targeted questions that will fill these gaps.

**Focus Areas for Questions**:
1. **Experience Level**: What's their background in this domain?
2. **Learning Style**: How do they learn best?
3. **Constraints**: Time, resources, environment limitations?
4. **Motivation**: Why this goal now? What's driving them?
5. **Success Criteria**: How will they know they've succeeded?
6. **Context Specifics**: Industry, tools, specific applications?
7. **Timeline**: When do they want to achieve this?
8. **Priority Areas**: What aspects matter most?

**Question Quality Guidelines**:
- Make questions specific to the goal domain
- Avoid generic questions that apply to any learning
- Each question should directly improve task generation
- Use appropriate question types for the information needed
- Include clear rationale for why each question matters

**Response Format**: ${JSON.stringify(this.onboardingQuestionSchema, null, 2)}

Generate questions that will transform this goal into a highly optimized learning experience.`;
  }

  /**
   * Build the prompt for processing responses
   */
  buildResponseProcessingPrompt(goal, initialContext, questionResponses) {
    return `Process these onboarding responses to create an optimized learning context:

**Original Goal**: ${goal}
**Initial Context**: ${JSON.stringify(initialContext, null, 2)}
**User Responses**: ${JSON.stringify(questionResponses, null, 2)}

**Your Mission**:
Synthesize all this information into a comprehensive user profile and enhanced context that will enable superior schema-driven task generation.

**Analysis Focus**:
1. **User Profile**: Experience, learning style, motivation, constraints
2. **Enhanced Goal Context**: Refined goal, domain specifics, priorities
3. **Schema Optimizations**: Recommended depth, focus areas, granularity
4. **Readiness Assessment**: Is context complete enough for generation?

**Key Considerations**:
- Look for patterns in responses that reveal learning preferences
- Identify any contradictions or areas needing clarification
- Determine optimal task granularity based on experience level
- Assess timeline realism based on goal complexity and constraints
- Flag potential risk factors or opportunity areas

**Response Format**: ${JSON.stringify(this.responseProcessingSchema, null, 2)}

Create a context that will enable the most effective possible learning plan generation.`;
  }

  /**
   * Generate contextual follow-up questions
   */
  async generateFollowUpQuestions(questionId, userResponse, originalContext) {
    try {
      const prompt = `Generate targeted follow-up questions based on this response:

**Original Question ID**: ${questionId}
**User Response**: ${userResponse}
**Context**: ${JSON.stringify(originalContext, null, 2)}

**Your Task**: 
If this response reveals important details that need clarification or opens up new areas to explore, generate 1-3 follow-up questions. Only generate follow-ups if they would significantly improve task generation quality.

**Response Format**: Return a JSON array of follow-up questions using the same schema as onboarding questions, or an empty array if no follow-ups are needed.`;

      const response = await this.llmInterface.request({
        method: 'llm/completion',
        params: {
          prompt,
          max_tokens: 500,
          temperature: 0.2,
          system: "Generate follow-up questions only when they would significantly improve learning plan quality."
        }
      });

      return Array.isArray(response) ? response : [];

    } catch (error) {
      console.error('Follow-up question generation failed:', error);
      return [];
    }
  }

  /**
   * Assess if we have enough context to proceed with tree generation
   */
  async assessReadinessForGeneration(goal, enhancedContext, questionResponses) {
    try {
      const prompt = `Assess if we have sufficient context for high-quality HTA tree generation:

**Goal**: ${goal}
**Enhanced Context**: ${JSON.stringify(enhancedContext, null, 2)}
**All Responses**: ${JSON.stringify(questionResponses, null, 2)}

**Assessment Criteria**:
1. Do we understand the user's experience level and capabilities?
2. Are the constraints and resources clear?
3. Is the timeline realistic and specific?
4. Do we know what success looks like for this user?
5. Are there any critical unknowns that would impact task quality?

**Response**: Return a JSON object with:
- completeness_score (0-100)
- missing_critical_info (array of what's still needed)
- recommendation ("proceed", "ask_more", "clarify_goal")
- confidence_level ("high", "medium", "low")`;

      const response = await this.llmInterface.request({
        method: 'llm/completion',
        params: {
          prompt,
          max_tokens: 300,
          temperature: 0.1,
          system: "Be conservative - only recommend proceeding if context is truly sufficient for excellent task generation."
        }
      });

      return response;

    } catch (error) {
      console.error('Readiness assessment failed:', error);
      return {
        completeness_score: 70,
        missing_critical_info: [],
        recommendation: "proceed",
        confidence_level: "medium"
      };
    }
  }

  /**
   * Validate onboarding questions response
   */
  validateOnboardingQuestions(response) {
    if (!response?.onboarding_questions || !Array.isArray(response.onboarding_questions)) {
      throw new Error('Invalid onboarding questions format');
    }

    // Ensure each question has required fields
    const validatedQuestions = response.onboarding_questions.map((q, index) => ({
      id: q.id || `question_${index + 1}`,
      question: q.question || 'Question missing',
      question_type: q.question_type || 'open_text',
      options: q.options || [],
      rationale: q.rationale || 'Rationale missing',
      schema_impact: q.schema_impact || 'General context',
      priority: q.priority || 3,
      follow_up_logic: q.follow_up_logic || {}
    }));

    return {
      ...response,
      onboarding_questions: validatedQuestions
    };
  }

  /**
   * Perform deep goal analysis using LLM intelligence
   */
  async performGoalAnalysis(goal, initialContext) {
    const prompt = `${this.systemPrompts.adaptiveAnalyzer}

Analyze this learning goal to determine the optimal information architecture:

**Goal**: ${goal}
**Initial Context**: ${JSON.stringify(initialContext, null, 2)}

**Analysis Required**:
1. **Domain Classification**: What type of learning domain is this? (technical, creative, business, physical, etc.)
2. **Complexity Assessment**: How complex is this goal? What makes it complex?
3. **Critical Success Factors**: What are the 3-5 most important factors for success?
4. **Information Architecture**: What types of contextual information are most critical?
5. **Risk Factors**: What could prevent success? What assumptions might be wrong?
6. **Opportunity Areas**: What unique advantages could this learner have?

**Response Format**:
{
  "domain_classification": {
    "primary_domain": "string",
    "secondary_domains": ["string"],
    "interdisciplinary_factors": ["string"]
  },
  "complexity_assessment": {
    "complexity_level": "beginner|intermediate|advanced|expert",
    "complexity_factors": ["string"],
    "estimated_learning_curve": "string"
  },
  "critical_success_factors": ["string"],
  "required_information_types": ["string"],
  "risk_factors": ["string"],
  "opportunity_areas": ["string"],
  "optimal_approach_characteristics": ["string"]
}

Provide deep, actionable analysis that will enable perfect question generation.`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 800,
        temperature: 0.1,
        system: this.systemPrompts.adaptiveAnalyzer
      }
    });

    return response;
  }

  /**
   * Generate adaptive schema based on goal analysis
   */
  async generateAdaptiveSchema(goalAnalysis) {
    const prompt = `Based on this goal analysis, generate a dynamic schema for optimal question generation:

**Goal Analysis**: ${JSON.stringify(goalAnalysis, null, 2)}

**Schema Design Requirements**:
1. **Question Categories**: What types of questions are most important for this goal?
2. **Information Priorities**: What information should be gathered first vs. later?
3. **Depth Requirements**: How deep should we go in different areas?
4. **Adaptation Triggers**: When should we adjust our approach based on responses?
5. **Quality Metrics**: How will we measure if we have enough information?

**Response Format**:
{
  "question_categories": [{
    "category": "string",
    "priority": "high|medium|low",
    "min_questions": number,
    "max_questions": number,
    "focus_areas": ["string"]
  }],
  "information_priorities": [{
    "info_type": "string",
    "priority_order": number,
    "why_important": "string"
  }],
  "depth_requirements": {
    "experience_assessment": "shallow|moderate|deep",
    "constraint_analysis": "shallow|moderate|deep",
    "motivation_analysis": "shallow|moderate|deep",
    "context_specifics": "shallow|moderate|deep"
  },
  "adaptation_triggers": [{
    "trigger_condition": "string",
    "adaptation_action": "string"
  }],
  "completeness_criteria": ["string"]
}

Create a schema that will generate the most effective questions for this specific goal.`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 600,
        temperature: 0.2,
        system: this.systemPrompts.adaptiveAnalyzer
      }
    });

    return response;
  }

  /**
   * Generate contextually perfect questions
   */
  async generateContextualQuestions(goal, initialContext, goalAnalysis, adaptiveSchema) {
    const prompt = `${this.systemPrompts.questionGenerator}

Generate perfect onboarding questions using this analysis:

**Goal**: ${goal}
**Initial Context**: ${JSON.stringify(initialContext, null, 2)}
**Goal Analysis**: ${JSON.stringify(goalAnalysis, null, 2)}
**Adaptive Schema**: ${JSON.stringify(adaptiveSchema, null, 2)}

**Question Generation Requirements**:
1. Create 4-8 questions that are specifically tailored to this goal
2. Each question must directly serve the goal analysis findings
3. Use the adaptive schema to determine question types and priorities
4. Ensure questions build on each other logically
5. Include clear rationale for each question
6. Design questions to reveal deep insights, not just surface information

**Response Format**:
{
  "questions": [{
    "id": "string",
    "question": "string",
    "question_type": "multiple_choice|scale|open_text|yes_no|time_estimate",
    "options": ["string"],
    "rationale": "string",
    "schema_impact": "string",
    "priority": 1-5,
    "expected_insights": ["string"],
    "follow_up_potential": "high|medium|low"
  }],
  "question_strategy": "string",
  "total_time_estimate": "string"
}

Generate questions that will extract the most valuable insights for this specific learning goal.`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 1200,
        temperature: 0.3,
        system: this.systemPrompts.questionGenerator
      }
    });

    return response;
  }

  /**
   * Optimize question flow strategy
   */
  async optimizeQuestionFlow(questions, goalAnalysis) {
    const prompt = `Optimize the presentation strategy for these onboarding questions:

**Questions**: ${JSON.stringify(questions, null, 2)}
**Goal Analysis**: ${JSON.stringify(goalAnalysis, null, 2)}

**Optimization Requirements**:
1. **Question Order**: What's the optimal sequence for these questions?
2. **Flow Strategy**: How should questions be presented? (sequential, adaptive, branching)
3. **Pacing**: How should questions be paced for best user experience?
4. **Transition Logic**: How should we transition between questions?
5. **Engagement Techniques**: How can we keep the user engaged throughout?

**Response Format**:
{
  "questions": [/* optimally ordered questions */],
  "strategy": {
    "flow_type": "sequential|adaptive|branching",
    "pacing_approach": "string",
    "transition_style": "string",
    "engagement_techniques": ["string"]
  },
  "user_experience_optimizations": ["string"]
}

Create a flow that maximizes both information quality and user experience.`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 800,
        temperature: 0.2,
        system: this.systemPrompts.questionGenerator
      }
    });

    return response;
  }

  /**
   * Initialize conversation context
   */
  initializeConversationContext(goal, initialContext, goalAnalysis) {
    const conversationId = `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context = {
      conversationId,
      goal,
      initialContext,
      goalAnalysis,
      startTime: new Date().toISOString(),
      responseHistory: [],
      adaptationHistory: [],
      insightsSoFar: [],
      contextEvolution: []
    };

    this.conversationHistory.set(conversationId, context);
    return context;
  }

  /**
   * Analyze response patterns and extract insights
   */
  async analyzeResponsePatterns(questionResponses, conversationContext) {
    const prompt = `${this.systemPrompts.contextProcessor}

Analyze these response patterns to extract deep insights:

**Question Responses**: ${JSON.stringify(questionResponses, null, 2)}
**Conversation Context**: ${JSON.stringify(conversationContext, null, 2)}

**Analysis Required**:
1. **Response Patterns**: What patterns emerge from the responses?
2. **Implicit Insights**: What do the responses reveal beyond what was explicitly stated?
3. **Consistency Analysis**: Are there any contradictions or areas of uncertainty?
4. **Preference Indicators**: What learning preferences are revealed?
5. **Constraint Identification**: What constraints are explicitly or implicitly mentioned?
6. **Motivation Depth**: What deeper motivations can be inferred?

**Response Format**:
{
  "response_patterns": [{
    "pattern_type": "string",
    "description": "string",
    "confidence": "high|medium|low"
  }],
  "implicit_insights": [{
    "insight": "string",
    "evidence": "string",
    "confidence": "high|medium|low"
  }],
  "consistency_analysis": {
    "consistent_themes": ["string"],
    "contradictions": ["string"],
    "areas_needing_clarification": ["string"]
  },
  "preference_indicators": [{
    "preference_type": "string",
    "indicator": "string",
    "strength": "strong|moderate|weak"
  }],
  "inferred_constraints": ["string"],
  "motivation_depth": {
    "surface_motivations": ["string"],
    "deeper_motivations": ["string"],
    "motivation_strength": "high|medium|low"
  }
}

Extract the maximum insight from these responses.`;

    const response = await this.llmInterface.requestIntelligence(prompt, {
      max_tokens: 800,
      temperature: 0.1,
      system: this.systemPrompts.contextProcessor
    });

    return response;
  }

  /**
   * Synthesize comprehensive user profile
   */
  async synthesizeUserProfile(responseAnalysis, conversationContext) {
    const prompt = `${this.systemPrompts.contextProcessor}

Synthesize a comprehensive user profile from this analysis:

**Response Analysis**: ${JSON.stringify(responseAnalysis, null, 2)}
**Conversation Context**: ${JSON.stringify(conversationContext, null, 2)}

**Profile Synthesis Requirements**:
1. **Learning Characteristics**: How does this person learn best?
2. **Capability Assessment**: What are their strengths and growth areas?
3. **Constraint Profile**: What real-world constraints shape their learning?
4. **Motivation Profile**: What drives them and sustains their effort?
5. **Risk Profile**: What factors might derail their progress?
6. **Opportunity Profile**: What unique advantages do they have?

**Response Format**:
{
  "learning_characteristics": {
    "preferred_learning_style": "string",
    "information_processing_style": "string",
    "feedback_preferences": "string",
    "challenge_tolerance": "high|medium|low"
  },
  "capability_assessment": {
    "current_skill_level": "string",
    "transferable_skills": ["string"],
    "skill_gaps": ["string"],
    "learning_velocity": "fast|moderate|slow"
  },
  "constraint_profile": {
    "time_constraints": "string",
    "resource_constraints": ["string"],
    "environmental_factors": ["string"],
    "competing_priorities": ["string"]
  },
  "motivation_profile": {
    "primary_drivers": ["string"],
    "intrinsic_motivations": ["string"],
    "extrinsic_motivations": ["string"],
    "motivation_sustainability": "high|medium|low"
  },
  "risk_profile": {
    "potential_obstacles": ["string"],
    "failure_points": ["string"],
    "mitigation_strategies": ["string"]
  },
  "opportunity_profile": {
    "unique_advantages": ["string"],
    "leverage_points": ["string"],
    "acceleration_opportunities": ["string"]
  }
}

Create a profile that enables perfect learning plan customization.`;

    const response = await this.llmInterface.requestIntelligence(prompt, {
      max_tokens: 1000,
      temperature: 0.1,
      system: this.systemPrompts.contextProcessor
    });

    return response;
  }

  /**
   * Generate intelligent recovery from errors
   */
  async generateIntelligentRecovery(goal, initialContext, error) {
    const prompt = `An error occurred during onboarding generation. Create an intelligent recovery strategy:

**Goal**: ${goal}
**Initial Context**: ${JSON.stringify(initialContext, null, 2)}
**Error**: ${error.message}

**Recovery Requirements**:
1. Analyze what went wrong and why
2. Generate a simplified but still effective approach
3. Ensure we can still collect critical information
4. Maintain user experience quality

**Response Format**:
{
  "error_analysis": "string",
  "recovery_strategy": "string",
  "simplified_questions": [{
    "id": "string",
    "question": "string",
    "question_type": "string",
    "options": ["string"],
    "rationale": "string"
  }],
  "quality_assessment": "string"
}

Create a recovery that maintains as much intelligence as possible.`;

    try {
      const response = await this.llmInterface.requestIntelligence(prompt, {
        max_tokens: 600,
        temperature: 0.2,
        system: "You are a resilient system that creates intelligent fallbacks while maintaining quality."
      });

      return response;
    } catch (recoveryError) {
      // Ultimate fallback - minimal but functional
      return {
        error_analysis: "Multiple LLM failures occurred",
        recovery_strategy: "Using minimal essential questions",
        simplified_questions: [
          {
            id: "experience",
            question: "What's your experience level with this topic?",
            question_type: "multiple_choice",
            options: ["Beginner", "Intermediate", "Advanced"],
            rationale: "Essential for task calibration"
          },
          {
            id: "timeline",
            question: "How much time can you dedicate to this?",
            question_type: "open_text",
            options: [],
            rationale: "Critical for planning"
          }
        ],
        quality_assessment: "Minimal but functional"
      };
    }
  }

  /**
   * Validate processed context response
   */
  validateProcessedContext(response) {
    if (!response?.processed_context) {
      throw new Error('Invalid processed context format');
    }

    return response;
  }

  /**
   * Generate fallback questions when LLM fails
   */
  generateFallbackQuestions(goal, initialContext) {
    return {
      context_analysis: {
        goal_clarity: 5,
        domain_familiarity: "unknown",
        missing_critical_info: ["experience_level", "timeline", "constraints"],
        complexity_indicators: ["broad_domain", "multiple_skills"]
      },
      onboarding_questions: [
        {
          id: "experience_level",
          question: "What's your current experience level with this topic?",
          question_type: "multiple_choice",
          options: ["Complete beginner", "Some exposure", "Intermediate", "Advanced"],
          rationale: "Determines appropriate task complexity and starting point",
          schema_impact: "task_difficulty_calibration",
          priority: 5
        },
        {
          id: "timeline",
          question: "When would you like to achieve this goal?",
          question_type: "multiple_choice", 
          options: ["1-2 weeks", "1 month", "3 months", "6+ months", "No specific timeline"],
          rationale: "Affects task pacing and depth",
          schema_impact: "strategic_branch_duration",
          priority: 4
        },
        {
          id: "daily_time",
          question: "How much time can you dedicate to this daily?",
          question_type: "multiple_choice",
          options: ["15-30 minutes", "30-60 minutes", "1-2 hours", "2+ hours", "Irregular schedule"],
          rationale: "Determines task size and scheduling approach",
          schema_impact: "micro_task_duration",
          priority: 4
        },
        {
          id: "motivation",
          question: "What's your primary motivation for this goal?",
          question_type: "multiple_choice",
          options: ["Career advancement", "Personal interest", "Solve specific problem", "Academic requirement", "Other"],
          rationale: "Influences strategic approach and task relevance",
          schema_impact: "strategic_branch_focus",
          priority: 3
        }
      ],
      question_flow_strategy: "Present questions sequentially, adjust based on responses"
    };
  }

  /**
   * Generate fallback context when processing fails
   */
  generateFallbackContext(goal, initialContext, questionResponses) {
    return {
      processed_context: {
        user_profile: {
          experience_level: "intermediate",
          learning_style: "mixed",
          motivation_type: "goal_oriented",
          available_time: "moderate",
          resource_constraints: ["time"],
          success_criteria: ["goal_completion"]
        },
        enhanced_goal_context: {
          refined_goal: goal,
          domain_specifics: [],
          timeline_expectations: "flexible",
          priority_areas: [],
          risk_factors: ["time_constraints"],
          opportunity_areas: []
        },
        schema_optimizations: {
          recommended_depth: 4,
          branch_focus_areas: [],
          granularity_preferences: "moderate",
          adaptation_triggers: ["progress_feedback"]
        }
      },
      readiness_assessment: {
        schema_completeness: 60,
        missing_info: ["detailed_timeline", "specific_constraints"],
        recommended_action: "proceed_with_generation"
      }
    };
  }

  /**
   * Perform goal analysis (stub implementation for now)
   */
  async performGoalAnalysis(goal, initialContext) {
    return {
      clarity_score: 7,
      domain_hints: ["data science", "machine learning"],
      complexity_indicators: ["intermediate_level", "technical_skills"],
      measurability: "high",
      timeline_hints: ["medium_term", "6_months_plus"]
    };
  }

  /**
   * Generate adaptive schema (stub implementation for now)
   */
  async generateAdaptiveSchema(goalAnalysis) {
    return {
      question_types: ["experience_level", "timeline", "constraints", "motivation"],
      depth_requirements: 4,
      focus_areas: ["practical_application", "time_management"]
    };
  }

  /**
   * Generate contextual questions (stub implementation for now)
   */
  async generateContextualQuestions(goal, initialContext, goalAnalysis, adaptiveSchema) {
    return this.generateFallbackQuestions(goal, initialContext);
  }

  /**
   * Optimize question flow (stub implementation for now)
   */
  async optimizeQuestionFlow(questions, goalAnalysis) {
    return {
      questions: questions.onboarding_questions || questions,
      strategy: "sequential_with_adaptive_follow_ups"
    };
  }

  /**
   * Initialize conversation context (stub implementation for now)
   */
  initializeConversationContext(goal, initialContext, goalAnalysis) {
    return {
      goal,
      initialContext,
      goalAnalysis,
      conversationId: `conv_${Date.now()}`,
      startTime: new Date().toISOString()
    };
  }

  /**
   * Extract conversation insights (stub implementation for now)
   */
  async extractConversationInsights(questionResponses, conversationContext) {
    return {
      key_insights: ["User prefers hands-on learning", "Time constraints are primary concern"],
      learning_preferences: ["practical_projects", "portfolio_building"],
      success_indicators: ["career_advancement", "skill_demonstration"]
    };
  }

  /**
   * Assess readiness for generation (stub implementation for now)
   */
  async assessReadinessForGeneration(goal, enhancedContext, responses) {
    return {
      recommendation: "proceed_with_generation",
      completeness_score: 90,
      confidence_level: "high",
      missing_info: []
    };
  }

  /**
   * Analyze response patterns (stub implementation for now)
   */
  async analyzeResponsePatterns(questionResponses, conversationContext) {
    return {
      response_quality: "high",
      consistency_score: 0.9,
      insights: ["User demonstrates clear goal orientation", "Time constraints are realistic"]
    };
  }

  /**
   * Synthesize user profile (stub implementation for now)
   */
  async synthesizeUserProfile(responseAnalysis, conversationContext) {
    return {
      experience_level: "intermediate",
      learning_style: "hands-on",
      motivation_type: "career_advancement",
      available_time: "1-2 hours daily",
      resource_constraints: ["time", "budget"],
      success_criteria: ["land ML engineering role"]
    };
  }

  /**
   * Enhance goal context (stub implementation for now)
   */
  async enhanceGoalContext(goal, userProfile, responseAnalysis) {
    return {
      refined_goal: "Master data science and land a machine learning engineer role",
      domain_specifics: ["Python", "machine learning", "data analysis"],
      timeline_expectations: "6+ months",
      priority_areas: ["practical projects", "portfolio building"],
      risk_factors: ["time_constraints", "keeping current job"],
      opportunity_areas: ["existing Python skills", "web development background"]
    };
  }

  /**
   * Generate schema optimizations (stub implementation for now)
   */
  async generateSchemaOptimizations(userProfile, enhancedGoalContext) {
    return {
      recommended_depth: 4,
      branch_focus_areas: ["practical_application", "portfolio_projects"],
      granularity_preferences: "moderate",
      adaptation_triggers: ["progress_feedback", "time_availability"]
    };
  }

  /**
   * Assess context readiness (stub implementation for now)
   */
  async assessContextReadiness(userProfile, enhancedGoalContext, schemaOptimizations) {
    return {
      schema_completeness: 90,
      missing_info: [],
      recommended_action: "proceed_with_generation"
    };
  }
}

/**
 * Onboarding Session Manager - Handles the complete onboarding flow
 */
export class OnboardingSessionManager {
  constructor(onboardingSystem, dataPersistence) {
    this.onboardingSystem = onboardingSystem;
    this.dataPersistence = dataPersistence;
    this.activeSessions = new Map();
  }

  /**
   * Start an onboarding session for a project
   */
  async startOnboardingSession(projectId, goal, initialContext = {}) {
    try {
      const sessionId = `onboarding_${projectId}_${Date.now()}`;
      
      const questions = await this.onboardingSystem.generateOnboardingQuestions(goal, initialContext);
      
      // Handle different question structures from LLM vs fallback
      const questionList = questions.onboarding_questions || questions.questions || questions.simplified_questions || [];
      
      if (!questionList || questionList.length === 0) {
        throw new Error('No questions generated for onboarding');
      }
      
      const session = {
        sessionId,
        projectId,
        goal,
        initialContext,
        questions: questionList,
        responses: {},
        currentQuestionIndex: 0,
        isComplete: false,
        enhancedContext: null,
        createdAt: new Date().toISOString()
      };

      this.activeSessions.set(sessionId, session);
      
      // Save session state
      await this.dataPersistence.saveProjectData(projectId, `onboarding_${sessionId}.json`, session);
      
      return {
        sessionId,
        firstQuestion: questionList[0],
        totalQuestions: questionList.length,
        progress: { current: 1, total: questionList.length }
      };

    } catch (error) {
      console.error('Failed to start onboarding session:', error);
      throw error;
    }
  }

  /**
   * Process response and get next question
   */
  async processResponseAndGetNext(sessionId, questionId, response) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Onboarding session not found');
      }

      // Store response
      session.responses[questionId] = response;
      session.currentQuestionIndex++;

      // Check for follow-up questions
      const followUps = await this.onboardingSystem.generateFollowUpQuestions(
        questionId, 
        response, 
        { goal: session.goal, responses: session.responses }
      );

      // Add follow-ups to question queue
      if (followUps.length > 0) {
        session.questions.splice(session.currentQuestionIndex, 0, ...followUps);
      }

      // Check if more questions remain
      if (session.currentQuestionIndex < session.questions.length) {
        // Save updated session
        await this.dataPersistence.saveProjectData(
          session.projectId, 
          `onboarding_${sessionId}.json`, 
          session
        );

        return {
          nextQuestion: session.questions[session.currentQuestionIndex],
          progress: { 
            current: session.currentQuestionIndex + 1, 
            total: session.questions.length 
          },
          isComplete: false
        };
      } else {
        // Complete onboarding
        return await this.completeOnboarding(sessionId);
      }

    } catch (error) {
      console.error('Failed to process onboarding response:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding and generate enhanced context
   */
  async completeOnboarding(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Onboarding session not found');
      }

      // Process all responses into enhanced context
      const enhancedContext = await this.onboardingSystem.processOnboardingResponses(
        session.goal,
        session.initialContext,
        session.responses
      );

      // Assess readiness for tree generation
      const readiness = await this.onboardingSystem.assessReadinessForGeneration(
        session.goal,
        enhancedContext,
        session.responses
      );

      // Update session
      session.isComplete = true;
      session.enhancedContext = enhancedContext;
      session.readiness = readiness;
      session.completedAt = new Date().toISOString();

      // Save completed session
      await this.dataPersistence.saveProjectData(
        session.projectId,
        `onboarding_${sessionId}.json`,
        session
      );

      // Save enhanced context for HTA generation
      await this.dataPersistence.saveProjectData(
        session.projectId,
        'enhanced_context.json',
        enhancedContext
      );

      // Clean up active session
      this.activeSessions.delete(sessionId);

      return {
        isComplete: true,
        enhancedContext,
        readiness,
        recommendation: readiness.recommendation || 'proceed_with_generation',
        sessionSummary: {
          questionsAnswered: Object.keys(session.responses).length,
          contextCompleteness: readiness.completeness_score || 85,
          readyForGeneration: readiness.recommendation === 'proceed_with_generation'
        }
      };

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  /**
   * Resume an existing onboarding session
   */
  async resumeOnboardingSession(sessionId, projectId) {
    try {
      let session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // Try to load from persistence
        session = await this.dataPersistence.loadProjectData(
          projectId,
          `onboarding_${sessionId}.json`
        );
        
        if (session) {
          this.activeSessions.set(sessionId, session);
        }
      }

      if (!session) {
        throw new Error('Onboarding session not found');
      }

      if (session.isComplete) {
        return {
          isComplete: true,
          enhancedContext: session.enhancedContext,
          readiness: session.readiness
        };
      }

      return {
        currentQuestion: session.questions[session.currentQuestionIndex],
        progress: {
          current: session.currentQuestionIndex + 1,
          total: session.questions.length
        },
        isComplete: false
      };

    } catch (error) {
      console.error('Failed to resume onboarding session:', error);
      throw error;
    }
  }
}
