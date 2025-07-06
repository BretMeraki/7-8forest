/**
 * Pure Schema-Driven HTA System
 * 
 * ZERO hardcoded domain patterns, examples, or content.
 * Pure schemas define structure, LLM provides ALL intelligence.
 * Implements complete 6-level architecture with context learning.
 */

export class PureSchemaHTASystem {
  constructor(llmInterface) {
    this.llmInterface = llmInterface;
    this.userContext = new Map();
    this.domainBoundaries = new Map();
    
    // Pure schemas - no hardcoded content, just structure definitions
    this.schemas = {
      goalContext: this.defineGoalContextSchema(),
      strategicBranches: this.defineStrategicBranchSchema(),
      taskDecomposition: this.defineTaskDecompositionSchema(),
      microParticles: this.defineMicroParticleSchema(),
      nanoActions: this.defineNanoActionSchema(),
      contextAdaptivePrimitives: this.defineContextAdaptivePrimitiveSchema(),
      contextMining: this.defineContextMiningSchema(),
      domainRelevance: this.defineDomainRelevanceSchema(),
      painPointValidation: this.definePainPointValidationSchema(),
      treeEvolution: this.defineTreeEvolutionSchema()
    };
  }

  /**
   * Generate complete 6-level HTA tree - pure LLM intelligence
   */
  async generateHTATree(goal, initialContext = {}) {
    // Level 1: Goal Achievement Context Analysis
    const goalContext = await this.generateLevelContent(
      'goalContext',
      { goal, initialContext },
      "Analyze this goal to understand domain, context, constraints, and success criteria."
    );

    // Level 2: Strategic Branches
    const strategicBranches = await this.generateLevelContent(
      'strategicBranches',
      { goal, goalContext },
      "Generate contextually appropriate strategic learning phases for this specific goal and user context."
    );

    // Initialize context tracking
    this.initializeContextTracking(goal, goalContext);

    return {
      goal,
      level1_goalContext: goalContext,
      level2_strategicBranches: strategicBranches,
      userContext: this.getContextSnapshot(),
      domainBoundaries: this.getDomainBoundaries(),
      generated: new Date().toISOString()
    };
  }

  /**
   * Generate Level 3: Task Decomposition for any strategic branch
   */
  async generateTaskDecomposition(branchName, branchDescription, goalContext, currentUserContext) {
    const refinedContext = await this.refineContextBasedOnLearning(currentUserContext);
    
    return await this.generateLevelContent(
      'taskDecomposition',
      { branchName, branchDescription, goalContext, userContext: refinedContext },
      "Break this strategic branch into practical, achievable tasks considering user's real-world constraints."
    );
  }

  /**
   * Generate Level 4: Micro-Particles for any task
   */
  async generateMicroParticles(taskTitle, taskDescription, goalContext, currentUserContext) {
    const refinedContext = await this.refineContextBasedOnLearning(currentUserContext);
    
    return await this.generateLevelContent(
      'microParticles',
      { taskTitle, taskDescription, goalContext, userContext: refinedContext },
      "Create foolproof micro-tasks that are so small they cannot fail, with clear validation criteria."
    );
  }

  /**
   * Generate Level 5: Nano-Actions for any micro-particle
   */
  async generateNanoActions(microTitle, microDescription, goalContext, currentUserContext) {
    const refinedContext = await this.refineContextBasedOnLearning(currentUserContext);
    
    return await this.generateLevelContent(
      'nanoActions',
      { microTitle, microDescription, goalContext, userContext: refinedContext },
      "Break this micro-task into granular execution steps accounting for tool switching and context changes."
    );
  }

  /**
   * Generate Level 6: Context-Adaptive Primitives for any nano-action
   */
  async generateContextAdaptivePrimitives(nanoTitle, nanoDescription, goalContext, currentUserContext) {
    const refinedContext = await this.refineContextBasedOnLearning(currentUserContext);
    
    return await this.generateLevelContent(
      'contextAdaptivePrimitives',
      { nanoTitle, nanoDescription, goalContext, userContext: refinedContext },
      "Create fundamental actions that adapt to different user constraints and situations."
    );
  }

  /**
   * Learn from user interaction and evolve tree if needed
   */
  async learnFromUserInteraction(interaction) {
    const contextInsights = await this.generateLevelContent(
      'contextMining',
      { interaction, currentContext: this.getContextSnapshot() },
      "Analyze this user interaction to extract insights about capabilities, constraints, and context evolution needs."
    );

    this.updateUserContext(contextInsights);

    if (this.shouldEvolveTree(contextInsights)) {
      return await this.evolveTreeStructure(contextInsights);
    }

    return null;
  }

  /**
   * Assess domain relevance for exploration filtering
   */
  async assessDomainRelevance(userTopic, currentGoal) {
    return await this.generateLevelContent(
      'domainRelevance',
      { userTopic, currentGoal, domainBoundaries: this.getDomainBoundaries() },
      "Assess how relevant this user topic is to the learning domain and provide exploration guidance."
    );
  }

  /**
   * Universal content generation method - all intelligence from LLM
   */
  async generateLevelContent(schemaKey, inputData, systemMessage) {
    const schema = this.schemas[schemaKey];
    const prompt = this.buildUniversalPrompt(inputData, schema);
    
    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt: prompt,
        max_tokens: this.getTokenLimitForSchema(schemaKey),
        temperature: this.getTemperatureForSchema(schemaKey),
        system: systemMessage
      }
    });

    return this.validateAndFormatResponse(response, schema, schemaKey);
  }

  /**
   * Build universal prompt - no hardcoded examples or patterns
   */
  buildUniversalPrompt(inputData, schema) {
    return `Analyze the provided data and generate a response following the exact JSON schema structure.

**Input Data:**
${JSON.stringify(inputData, null, 2)}

**Required Response Schema:**
${JSON.stringify(schema, null, 2)}

Generate intelligent, contextually appropriate content that fits this structure. Use your expertise to provide relevant, practical, and actionable content based on the input data and schema requirements.`;
  }

  /**
   * Refine context based on accumulated learning
   */
  async refineContextBasedOnLearning(currentUserContext) {
    if (!this.hasSignificantLearningHistory()) {
      return currentUserContext;
    }

    return await this.generateLevelContent(
      'contextMining',
      { 
        currentContext: currentUserContext,
        learningHistory: this.getLearningHistory(),
        discoveredConstraints: this.getDiscoveredConstraints(),
        revealedCapabilities: this.getRevealedCapabilities()
      },
      "Refine user context based on accumulated learning history and interaction patterns."
    );
  }

  /**
   * Evolve tree structure based on context insights
   */
  async evolveTreeStructure(contextInsights) {
    return await this.generateLevelContent(
      'treeEvolution',
      { 
        contextInsights, 
        currentTree: this.getTreeSnapshot(),
        userContext: this.getContextSnapshot()
      },
      "Evolve the learning tree structure based on new context insights while maintaining goal focus."
    );
  }

  // === PURE SCHEMA DEFINITIONS (no hardcoded content) ===

  defineGoalContextSchema() {
    return {
      type: "object",
      properties: {
        goal_analysis: {
          type: "object",
          properties: {
            primary_goal: { type: "string" },
            goal_complexity: { type: "integer", minimum: 1, maximum: 10 },
            domain_type: { type: "string" },
            domain_characteristics: { type: "array", items: { type: "string" } },
            success_criteria: { type: "array", items: { type: "string" } },
            timeline_assessment: { type: "string" },
            complexity_factors: { type: "array", items: { type: "string" } }
          }
        },
        user_context: {
          type: "object",
          properties: {
            background_knowledge: { type: "array", items: { type: "string" } },
            available_resources: { type: "array", items: { type: "string" } },
            constraints: { type: "array", items: { type: "string" } },
            motivation_drivers: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } }
          }
        },
        domain_boundaries: {
          type: "object",
          properties: {
            core_domain_elements: { type: "array", items: { type: "string" } },
            relevant_adjacent_domains: { type: "array", items: { type: "string" } },
            exploration_worthy_topics: { type: "array", items: { type: "string" } },
            irrelevant_domains: { type: "array", items: { type: "string" } }
          }
        },
        learning_approach: {
          type: "object",
          properties: {
            recommended_strategy: { type: "string" },
            key_principles: { type: "array", items: { type: "string" } },
            potential_pain_points: { type: "array", items: { type: "string" } },
            success_enablers: { type: "array", items: { type: "string" } }
          }
        }
      },
      required: ["goal_analysis", "user_context", "domain_boundaries", "learning_approach"]
    };
  }

  defineStrategicBranchSchema() {
    return {
      type: "object",
      properties: {
        strategic_branches: {
          type: "array",
          minItems: 3,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              priority: { type: "integer", minimum: 1 },
              rationale: { type: "string" },
              domain_focus: { type: "string" },
              expected_outcomes: { type: "array", items: { type: "string" } },
              context_adaptations: { type: "array", items: { type: "string" } },
              pain_point_mitigations: { type: "array", items: { type: "string" } },
              exploration_opportunities: { type: "array", items: { type: "string" } }
            },
            required: ["name", "description", "priority", "rationale", "domain_focus"]
          }
        },
        progression_logic: { type: "string" },
        alternative_paths: { type: "array", items: { type: "string" } }
      },
      required: ["strategic_branches", "progression_logic"]
    };
  }

  defineTaskDecompositionSchema() {
    return {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          minItems: 3,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              estimated_duration: { type: "string" },
              difficulty_level: { type: "integer", minimum: 1, maximum: 5 },
              prerequisites: { type: "array", items: { type: "string" } },
              success_criteria: { type: "array", items: { type: "string" } },
              context_considerations: { type: "array", items: { type: "string" } },
              potential_obstacles: { type: "array", items: { type: "string" } },
              alternative_approaches: { type: "array", items: { type: "string" } }
            },
            required: ["title", "description", "estimated_duration", "difficulty_level"]
          }
        },
        decomposition_rationale: { type: "string" }
      },
      required: ["tasks", "decomposition_rationale"]
    };
  }

  defineMicroParticleSchema() {
    return {
      type: "object",
      properties: {
        micro_particles: {
          type: "array",
          minItems: 3,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              action: { type: "string" },
              validation: { type: "string" },
              duration_minutes: { type: "integer", minimum: 2, maximum: 25 },
              difficulty: { type: "integer", minimum: 1, maximum: 5 },
              resources_needed: { type: "array", items: { type: "string" } },
              success_indicators: { type: "array", items: { type: "string" } },
              common_mistakes: { type: "array", items: { type: "string" } },
              context_adaptations: { type: "array", items: { type: "string" } }
            },
            required: ["title", "description", "action", "validation", "duration_minutes", "difficulty"]
          }
        },
        granularity_rationale: { type: "string" }
      },
      required: ["micro_particles", "granularity_rationale"]
    };
  }

  defineNanoActionSchema() {
    return {
      type: "object",
      properties: {
        nano_actions: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              action_title: { type: "string" },
              specific_steps: { type: "array", items: { type: "string" } },
              duration_seconds: { type: "integer", minimum: 10, maximum: 300 },
              tools_required: { type: "array", items: { type: "string" } },
              validation_method: { type: "string" },
              failure_recovery: { type: "array", items: { type: "string" } },
              context_switches: { type: "array", items: { type: "string" } }
            },
            required: ["action_title", "specific_steps", "duration_seconds", "validation_method"]
          }
        },
        execution_notes: { type: "string" }
      },
      required: ["nano_actions", "execution_notes"]
    };
  }

  defineContextAdaptivePrimitiveSchema() {
    return {
      type: "object",
      properties: {
        base_primitive: {
          type: "object",
          properties: {
            action_name: { type: "string" },
            default_approach: { type: "string" },
            duration_range: { type: "string" }
          }
        },
        context_adaptations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              context_condition: { type: "string" },
              adapted_approach: { type: "string" },
              modification_rationale: { type: "string" },
              success_indicators: { type: "array", items: { type: "string" } }
            },
            required: ["context_condition", "adapted_approach", "modification_rationale"]
          }
        },
        fallback_options: { type: "array", items: { type: "string" } }
      },
      required: ["base_primitive", "context_adaptations"]
    };
  }

  defineContextMiningSchema() {
    return {
      type: "object",
      properties: {
        context_insights: {
          type: "object",
          properties: {
            capability_indicators: { type: "array", items: { type: "string" } },
            constraint_discoveries: { type: "array", items: { type: "string" } },
            preference_patterns: { type: "array", items: { type: "string" } },
            struggle_signals: { type: "array", items: { type: "string" } },
            motivation_shifts: { type: "array", items: { type: "string" } }
          }
        },
        recommended_adaptations: {
          type: "object",
          properties: {
            difficulty_adjustments: { type: "string" },
            approach_modifications: { type: "string" },
            resource_adaptations: { type: "string" },
            timeline_revisions: { type: "string" }
          }
        },
        tree_evolution_suggestions: { type: "array", items: { type: "string" } }
      },
      required: ["context_insights", "recommended_adaptations"]
    };
  }

  defineDomainRelevanceSchema() {
    return {
      type: "object",
      properties: {
        relevance_assessment: {
          type: "object",
          properties: {
            relevance_score: { type: "number", minimum: 0, maximum: 1 },
            relevance_category: { type: "string" },
            connection_explanation: { type: "string" },
            exploration_value: { type: "string" }
          }
        },
        guidance: {
          type: "object",
          properties: {
            response_type: { type: "string" },
            exploration_approach: { type: "string" },
            time_recommendation: { type: "string" },
            connection_back_to_goal: { type: "string" }
          }
        }
      },
      required: ["relevance_assessment", "guidance"]
    };
  }

  definePainPointValidationSchema() {
    return {
      type: "object",
      properties: {
        pain_point_analysis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              potential_issue: { type: "string" },
              likelihood: { type: "string" },
              impact_severity: { type: "string" },
              affected_user_types: { type: "array", items: { type: "string" } }
            }
          }
        },
        refinement_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue_addressed: { type: "string" },
              suggested_modification: { type: "string" },
              improvement_rationale: { type: "string" }
            }
          }
        },
        alternative_approaches: { type: "array", items: { type: "string" } }
      },
      required: ["pain_point_analysis", "refinement_suggestions"]
    };
  }

  defineTreeEvolutionSchema() {
    return {
      type: "object",
      properties: {
        evolution_recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              change_type: { type: "string" },
              target_element: { type: "string" },
              modification_description: { type: "string" },
              justification: { type: "string" },
              goal_alignment_check: { type: "string" }
            }
          }
        },
        goal_focus_validation: { type: "string" },
        risk_assessment: { type: "string" }
      },
      required: ["evolution_recommendations", "goal_focus_validation"]
    };
  }

  // === UTILITY METHODS ===

  getTokenLimitForSchema(schemaKey) {
    const limits = {
      goalContext: 2000,
      strategicBranches: 2000,
      taskDecomposition: 2500,
      microParticles: 2500,
      nanoActions: 1500,
      contextAdaptivePrimitives: 1200,
      contextMining: 1000,
      domainRelevance: 500,
      painPointValidation: 800,
      treeEvolution: 1000
    };
    return limits[schemaKey] || 1500;
  }

  getTemperatureForSchema(schemaKey) {
    const temperatures = {
      goalContext: 0.3,
      strategicBranches: 0.3,
      taskDecomposition: 0.25,
      microParticles: 0.2,
      nanoActions: 0.15,
      contextAdaptivePrimitives: 0.1,
      contextMining: 0.2,
      domainRelevance: 0.2,
      painPointValidation: 0.2,
      treeEvolution: 0.25
    };
    return temperatures[schemaKey] || 0.2;
  }

  validateAndFormatResponse(response, schema, schemaKey) {
    // Basic validation that response matches schema structure
    // In production, use proper JSON schema validator
    return response;
  }

  initializeContextTracking(goal, goalContext) {
    this.userContext.set('goal', goal);
    this.userContext.set('initialContext', goalContext);
    this.userContext.set('learningHistory', []);
    this.userContext.set('contextEvolution', []);
    
    if (goalContext.domain_boundaries) {
      this.domainBoundaries.set('boundaries', goalContext.domain_boundaries);
    }
  }

  updateUserContext(contextInsights) {
    const history = this.userContext.get('learningHistory') || [];
    history.push({
      timestamp: new Date().toISOString(),
      insights: contextInsights
    });
    this.userContext.set('learningHistory', history);
  }

  getContextSnapshot() {
    return {
      goal: this.userContext.get('goal'),
      learningHistoryCount: (this.userContext.get('learningHistory') || []).length,
      lastUpdate: new Date().toISOString()
    };
  }

  getDomainBoundaries() {
    return this.domainBoundaries.get('boundaries') || {};
  }

  hasSignificantLearningHistory() {
    return (this.userContext.get('learningHistory') || []).length > 2;
  }

  getLearningHistory() {
    return this.userContext.get('learningHistory') || [];
  }

  getDiscoveredConstraints() {
    return this.userContext.get('discoveredConstraints') || [];
  }

  getRevealedCapabilities() {
    return this.userContext.get('revealedCapabilities') || [];
  }

  shouldEvolveTree(contextInsights) {
    return contextInsights.tree_evolution_suggestions && 
           contextInsights.tree_evolution_suggestions.length > 0;
  }

  getTreeSnapshot() {
    return {
      goal: this.userContext.get('goal'),
      context: this.getContextSnapshot(),
      boundaries: this.getDomainBoundaries()
    };
  }
}

export default PureSchemaHTASystem;
