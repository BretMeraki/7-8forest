/**
 * Forest MCP Intelligence Schemas - Domain Agnostic
 * 
 * These schemas define STRUCTURE, not content. They enable Claude to provide
 * intelligent responses for ANY domain without hardcoded assumptions.
 * 
 * Key Principle: The schemas capture universal learning patterns while
 * allowing Claude's full intelligence to determine domain-specific content.
 */

export const FOREST_INTELLIGENCE_SCHEMAS = {
  // Universal Task Generation Schema - Works for any domain
  TASK_GENERATION: {
    type: "object",
    required: ["title", "description", "approach", "success_indicators"],
    properties: {
      title: { 
        type: "string",
        description: "Clear, actionable title appropriate for the domain"
      },
      description: { 
        type: "string",
        description: "What needs to be accomplished, explained in domain-appropriate terms"
      },
      approach: {
        type: "object",
        properties: {
          methodology: { 
            type: "string", 
            description: "The approach that makes sense for this domain" 
          },
          key_actions: {
            type: "array",
            items: { type: "string" },
            description: "Specific actions appropriate for this domain"
          },
          resources_needed: {
            type: "array",
            items: { type: "string" },
            description: "Whatever resources this domain typically requires"
          }
        }
      },
      context_requirements: {
        type: "object",
        properties: {
          prerequisites: { 
            type: "array", 
            items: { type: "string" },
            description: "What should be in place before starting (domain-specific)"
          },
          environment: {
            type: "string",
            description: "The context/environment where this task should be performed"
          }
        }
      },
      success_indicators: {
        type: "array",
        items: { type: "string" },
        description: "How to recognize completion in this specific domain"
      },
      time_guidance: {
        type: "object",
        properties: {
          estimated_duration: { type: "string" },
          pacing_notes: { type: "string", description: "Domain-appropriate pacing guidance" }
        }
      }
    }
  },

  // Universal Strategic Planning Schema - Adapts to any goal type
  STRATEGIC_ANALYSIS: {
    type: "object",
    required: ["domain_understanding", "strategic_progression"],
    properties: {
      domain_understanding: {
        type: "object",
        properties: {
          domain_nature: { 
            type: "string", 
            description: "What characterizes this domain and how it's typically approached" 
          },
          expertise_patterns: {
            type: "array",
            items: { type: "string" },
            description: "How experts in this domain actually develop their skills"
          },
          common_progressions: {
            type: "array",
            items: { type: "string" },
            description: "Natural learning sequences that work in this domain"
          },
          success_patterns: {
            type: "array", 
            items: { type: "string" },
            description: "How progress and mastery are recognized in this domain"
          }
        }
      },
      goal_context: {
        type: "object",
        properties: {
          intent_analysis: { 
            type: "string", 
            description: "Why this goal matters and what drives the pursuit" 
          },
          outcome_vision: {
            type: "string",
            description: "What success looks like in concrete, domain-appropriate terms"
          },
          constraints_opportunities: {
            type: "array",
            items: { type: "string" },
            description: "Relevant limitations and advantages for this specific situation"
          }
        }
      },
      strategic_progression: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            phase_name: { 
              type: "string", 
              description: "Name that reflects the nature of this phase in this domain" 
            },
            phase_purpose: { 
              type: "string", 
              description: "What this phase accomplishes and why it's essential" 
            },
            sequence_position: { 
              type: "integer", 
              minimum: 1, 
              description: "Where this fits in the natural progression" 
            },
            domain_activities: {
              type: "array",
              items: { type: "string" },
              description: "Types of activities that make sense for this domain and phase"
            },
            capability_development: { 
              type: "string", 
              description: "What capabilities are being built in this phase" 
            },
            transition_indicators: {
              type: "array",
              items: { type: "string" },
              description: "How to know this phase is complete and ready for the next"
            },
            connection_points: {
              type: "array",
              items: { type: "string" },
              description: "How this phase builds on previous work and enables future phases"
            }
          },
          required: ["phase_name", "phase_purpose", "sequence_position", "domain_activities", "capability_development"]
        }
      },
      adaptation_guidance: {
        type: "object",
        properties: {
          flexibility_points: {
            type: "array",
            items: { type: "string" },
            description: "Where and how this plan can adapt to changing circumstances"
          },
          personalization_options: {
            type: "array",
            items: { type: "string" },
            description: "How this approach can be tailored to individual preferences and constraints"
          }
        }
      }
    }
  },

  // Universal Progress Analysis Schema - Works across all domains
  PROGRESS_ANALYSIS: {
    type: "object",
    required: ["current_state", "development_patterns", "forward_guidance"],
    properties: {
      current_state: {
        type: "object",
        properties: {
          capability_assessment: {
            type: "array",
            items: { type: "string" },
            description: "Current capabilities in domain-appropriate terms"
          },
          momentum_indicators: {
            type: "object",
            properties: {
              positive_signals: { type: "array", items: { type: "string" } },
              challenges: { type: "array", items: { type: "string" } },
              stagnation_risks: { type: "array", items: { type: "string" } }
            }
          },
          context_factors: {
            type: "array",
            items: { type: "string" },
            description: "Current circumstances affecting progress"
          }
        }
      },
      development_patterns: {
        type: "object",
        properties: {
          learning_style_observations: {
            type: "array",
            items: { type: "string" },
            description: "How this person appears to learn best in this domain"
          },
          strength_areas: {
            type: "array",
            items: { type: "string" },
            description: "Areas where natural aptitude or preference is showing"
          },
          growth_edge_areas: {
            type: "array",
            items: { type: "string" },
            description: "Areas ripe for development or needing attention"
          },
          engagement_patterns: {
            type: "array",
            items: { type: "string" },
            description: "What seems to generate energy and motivation"
          }
        }
      },
      forward_guidance: {
        type: "object",
        properties: {
          immediate_opportunities: {
            type: "array",
            items: { type: "string" },
            description: "Next steps that would build effectively on current progress"
          },
          strategic_adjustments: {
            type: "array",
            items: { type: "string" },
            description: "How the overall approach might evolve based on what's been learned"
          },
          optimization_suggestions: {
            type: "array",
            items: { type: "string" },
            description: "Ways to work more effectively with this person's patterns and this domain's nature"
          }
        }
      }
    }
  },

  // Universal Context Understanding Schema - Adapts to any situation
  CONTEXT_ANALYSIS: {
    type: "object",
    required: ["situation_understanding", "intelligent_recommendations"],
    properties: {
      situation_understanding: {
        type: "object",
        properties: {
          domain_context: {
            type: "string",
            description: "Understanding of what domain we're working in and its characteristics"
          },
          goal_context: {
            type: "string", 
            description: "Understanding of what the person is trying to achieve and why"
          },
          current_position: {
            type: "string",
            description: "Where things stand right now in domain-appropriate terms"
          },
          relevant_factors: {
            type: "array",
            items: { type: "string" },
            description: "Important factors affecting the situation"
          }
        }
      },
      pattern_recognition: {
        type: "object",
        properties: {
          observed_patterns: {
            type: "array",
            items: { type: "string" },
            description: "Patterns noticed in the learning/progress so far"
          },
          domain_typical_patterns: {
            type: "array",
            items: { type: "string" },
            description: "What typically happens in this domain at this stage"
          },
          individual_patterns: {
            type: "array",
            items: { type: "string" },
            description: "Patterns specific to this person's approach"
          }
        }
      },
      intelligent_recommendations: {
        type: "object",
        properties: {
          contextual_actions: {
            type: "array",
            items: { type: "string" },
            description: "Actions that make sense given the current context"
          },
          strategic_considerations: {
            type: "array",
            items: { type: "string" },
            description: "Important factors to consider for the overall approach"
          },
          adaptive_suggestions: {
            type: "array",
            items: { type: "string" },
            description: "How to adapt based on what's been learned"
          }
        }
      },
      uncertainty_handling: {
        type: "object",
        properties: {
          confidence_areas: {
            type: "array",
            items: { type: "string" },
            description: "Aspects where the analysis is well-grounded"
          },
          exploration_areas: {
            type: "array",
            items: { type: "string" },
            description: "Areas where more information would be valuable"
          },
          adaptive_points: {
            type: "array",
            items: { type: "string" },
            description: "Places where the approach should remain flexible"
          }
        }
      }
    }
  },

  // Universal Onboarding Schema - Adapts to any goal/domain
  ONBOARDING_GUIDANCE: {
    type: "object",
    required: ["domain_orientation", "personalized_starting_approach"],
    properties: {
      domain_orientation: {
        type: "object",
        properties: {
          domain_nature: {
            type: "string",
            description: "What characterizes this domain and how people typically engage with it"
          },
          success_patterns: {
            type: "array",
            items: { type: "string" },
            description: "How people typically succeed in this domain"
          },
          common_starting_points: {
            type: "array",
            items: { type: "string" },
            description: "Where people usually begin their journey in this domain"
          }
        }
      },
      goal_clarification: {
        type: "object",
        properties: {
          essential_questions: {
            type: "array",
            items: { type: "string" },
            description: "Questions that help clarify the specific goal and context"
          },
          vision_development: {
            type: "array",
            items: { type: "string" },
            description: "Ways to develop a clearer vision of the desired outcome"
          },
          constraint_identification: {
            type: "array", 
            items: { type: "string" },
            description: "Important constraints or considerations to identify early"
          }
        }
      },
      personalized_starting_approach: {
        type: "object",
        properties: {
          foundation_elements: {
            type: "array",
            items: { type: "string" },
            description: "Essential elements to have in place before beginning"
          },
          initial_actions: {
            type: "array",
            items: { type: "string" },
            description: "First steps that make sense for this specific goal and context"
          },
          early_success_indicators: {
            type: "array",
            items: { type: "string" },
            description: "How to recognize that the start is going well"
          },
          common_early_challenges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                challenge: { type: "string" },
                approach: { type: "string" }
              }
            },
            description: "Challenges often encountered early and how to address them"
          }
        }
      },
      momentum_building: {
        type: "object",
        properties: {
          engagement_strategies: {
            type: "array",
            items: { type: "string" },
            description: "Ways to build and maintain engagement in this domain"
          },
          progress_recognition: {
            type: "array",
            items: { type: "string" },
            description: "How to recognize and celebrate early progress"
          },
          adaptation_signals: {
            type: "array",
            items: { type: "string" },
            description: "Signs that the approach should be adjusted"
          }
        }
      }
    }
  }
};

/**
 * Domain-Agnostic Validation
 * Validates structure while preserving content flexibility
 */
export function validateIntelligenceResponse(data, schemaName) {
  const schema = FOREST_INTELLIGENCE_SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Unknown schema: ${schemaName}`);
  }

  const result = validateStructure(data, schema);
  
  if (!result.valid) {
    throw new Error(`Schema validation failed: ${result.error}`);
  }
  
  return true;
}

/**
 * Structural validation that doesn't impose domain constraints
 */
function validateStructure(data, schema) {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Expected object structure' };
    }

    // Check required structural elements
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          return { valid: false, error: `Missing required structural element: ${field}` };
        }
      }
    }

    // Validate nested structure
    if (schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          const result = validateStructure(value, schema.properties[key]);
          if (!result.valid) {
            return { valid: false, error: `Invalid structure in ${key}: ${result.error}` };
          }
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Expected array structure' };
    }

    // Check structural constraints only
    if (schema.minItems && data.length < schema.minItems) {
      return { valid: false, error: `Array too short (min: ${schema.minItems})` };
    }
    if (schema.maxItems && data.length > schema.maxItems) {
      return { valid: false, error: `Array too long (max: ${schema.maxItems})` };
    }

    // Validate item structure
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        const result = validateStructure(data[i], schema.items);
        if (!result.valid) {
          return { valid: false, error: `Invalid structure in array item ${i}: ${result.error}` };
        }
      }
    }
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') {
      return { valid: false, error: 'Expected string' };
    }
    // Note: We don't validate enum constraints to preserve domain flexibility
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof data !== 'number') {
      return { valid: false, error: 'Expected number' };
    }
    // We preserve reasonable numeric constraints for structural integrity
    if (schema.minimum !== undefined && data < schema.minimum) {
      return { valid: false, error: `Number too small (min: ${schema.minimum})` };
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      return { valid: false, error: `Number too large (max: ${schema.maximum})` };
    }
    if (schema.type === 'integer' && !Number.isInteger(data)) {
      return { valid: false, error: 'Expected integer' };
    }
  }

  return { valid: true };
}

/**
 * Extract prompt templates that maintain domain agnosticism
 */
export const DOMAIN_AGNOSTIC_PROMPTS = {
  STRATEGIC_ANALYSIS: `Analyze this goal and provide strategic guidance:

**Goal**: {goal}
**Context**: {context}

As an expert strategist, determine:
1. What domain/field this goal belongs to and how that domain typically works
2. How experts in this domain actually develop their capabilities
3. What progression would be natural and effective for this specific goal
4. How to structure the learning journey to match both domain realities and individual context

Provide domain-appropriate guidance that respects how this field actually works, rather than generic academic approaches.`,

  TASK_GENERATION: `Generate the next appropriate task for this learning context:

**Current Context**: {context}
**Goal**: {goal}
**Progress**: {progress}

Create a task that:
1. Fits naturally with how this domain is learned
2. Builds appropriately on current progress
3. Moves toward the goal in a domain-appropriate way
4. Is actionable and clear for this specific context

Focus on what would actually make sense for someone learning in this domain.`,

  PROGRESS_ANALYSIS: `Analyze current progress and provide forward-looking guidance:

**Domain**: {domain}
**Goal**: {goal}
**Recent Activity**: {recent_activity}
**Current State**: {current_state}

Provide analysis that:
1. Recognizes patterns in how this learning is progressing
2. Understands what's typical for this domain and stage
3. Identifies what's working well and what needs attention
4. Suggests how to optimize the approach going forward

Ground your analysis in how this domain actually works and how people succeed in it.`,

  CONTEXT_UNDERSTANDING: `Understand this learning context and provide intelligent guidance:

**Situation**: {situation}
**Background**: {background}
**Current Challenges**: {challenges}

Provide contextual understanding that:
1. Grasps what domain and situation we're dealing with
2. Recognizes the patterns and dynamics at play
3. Suggests approaches that fit the specific context
4. Adapts to individual circumstances while respecting domain realities

Focus on providing guidance that makes sense for this specific situation.`
};

export default FOREST_INTELLIGENCE_SCHEMAS;
