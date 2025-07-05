/**
 * Schema-Driven Branch Generator - Dynamic LLM-Powered Strategic Branches
 * 
 * Replaces ALL hardcoded patterns with LLM intelligence guided by schemas.
 * Truly domain-agnostic - can handle any goal type through intelligent analysis.
 */

export class SchemaDrivenBranchGenerator {
  constructor(llmInterface) {
    this.llmInterface = llmInterface;
    
    // Schema for branch generation - defines structure, not content
    this.branchGenerationSchema = {
      type: "object",
      properties: {
        domain_analysis: {
          type: "object",
          properties: {
            domain_type: { type: "string", description: "The primary domain this goal belongs to" },
            domain_characteristics: { 
              type: "array", 
              items: { type: "string" },
              description: "Key characteristics that define how this domain is typically approached"
            },
            learning_patterns: {
              type: "array",
              items: { type: "string" },
              description: "How experts typically learn and progress in this domain"
            },
            success_indicators: {
              type: "array", 
              items: { type: "string" },
              description: "How progress and success are typically measured in this domain"
            }
          }
        },
        intent_analysis: {
          type: "object",
          properties: {
            primary_intent: { type: "string", description: "The main intent behind pursuing this goal" },
            motivational_drivers: {
              type: "array",
              items: { type: "string" },
              description: "What motivates someone to pursue this specific goal"
            },
            success_criteria: {
              type: "array",
              items: { type: "string" },
              description: "How the person will know they've achieved their goal"
            },
            time_sensitivity: { type: "string", enum: ["urgent", "moderate", "patient"], description: "Timeline pressure for achieving this goal" }
          }
        },
        strategic_branches: {
          type: "array",
          minItems: 3,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Clear, specific name for this learning phase" },
              description: { type: "string", description: "What this phase accomplishes and why it's important" },
              priority: { type: "integer", minimum: 1, description: "Order in the learning progression" },
              duration_estimate: { type: "string", description: "Estimated time to complete this phase" },
              key_activities: {
                type: "array",
                items: { type: "string" },
                description: "Main types of activities in this phase"
              },
              learning_focus: { type: "string", description: "Primary learning approach for this phase" },
              success_indicators: {
                type: "array",
                items: { type: "string" },
                description: "How to know this phase is complete"
              },
              prerequisites: {
                type: "array",
                items: { type: "string" },
                description: "What must be completed before starting this phase"
              }
            },
            required: ["name", "description", "priority", "key_activities", "learning_focus"]
          }
        },
        progression_rationale: {
          type: "string",
          description: "Explanation of why these branches follow this specific order"
        }
      },
      required: ["domain_analysis", "intent_analysis", "strategic_branches", "progression_rationale"]
    };

    // Schema for complexity-based adjustments
    this.complexityAdjustmentSchema = {
      type: "object",
      properties: {
        complexity_assessment: {
          type: "object",
          properties: {
            overall_complexity: { type: "integer", minimum: 1, maximum: 10 },
            complexity_factors: {
              type: "array",
              items: { type: "string" },
              description: "What makes this goal complex or simple"
            },
            recommended_approach: { type: "string", description: "How complexity should influence the learning approach" }
          }
        },
        branch_adjustments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              branch_name: { type: "string" },
              adjustment_type: { type: "string", enum: ["merge", "split", "reorder", "modify"] },
              adjustment_reason: { type: "string" },
              new_structure: { type: "string", description: "How the branch should be adjusted" }
            }
          }
        }
      }
    };
  }

  /**
   * Generate adaptive strategic branches using LLM intelligence
   */
  async generateAdaptiveBranches(goal, complexityAnalysis, focusAreas = [], learningStyle = 'mixed', context = {}) {
    try {
      // Step 1: Generate base branch structure using LLM
      const branchStructure = await this.generateBaseBranchStructure(
        goal, 
        complexityAnalysis, 
        focusAreas, 
        learningStyle, 
        context
      );

      // Step 2: Apply complexity-based refinements
      const refinedStructure = await this.applyComplexityRefinements(
        branchStructure,
        complexityAnalysis,
        goal
      );

      // Step 3: Validate and format for HTA system
      const validatedBranches = this.validateAndFormatBranches(refinedStructure);

      return validatedBranches;

    } catch (error) {
      console.warn('[SchemaBranchGen] LLM generation failed, using fallback:', error.message);
      return this.generateFallbackBranches(goal, complexityAnalysis, focusAreas);
    }
  }

  /**
   * Generate base branch structure using LLM with schema guidance
   */
  async generateBaseBranchStructure(goal, complexityAnalysis, focusAreas, learningStyle, context) {
    const prompt = this.buildBranchGenerationPrompt(
      goal, 
      complexityAnalysis, 
      focusAreas, 
      learningStyle, 
      context
    );

    const response = await this.llmInterface.requestIntelligence(prompt, {
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent structure
      system: "You are an expert learning strategist who understands how different domains and goals require different learning approaches. Generate contextually appropriate learning phases."
    });

    return response;
  }

  /**
   * Build the prompt for LLM branch generation
   */
  buildBranchGenerationPrompt(goal, complexityAnalysis, focusAreas, learningStyle, context) {
    return `Analyze this learning goal and generate a contextually appropriate strategic learning progression:

**Goal**: ${goal}
**Complexity**: ${complexityAnalysis.score}/10 (${complexityAnalysis.level})
**Focus Areas**: ${focusAreas.join(', ') || 'None specified'}
**Learning Style**: ${learningStyle}
**Context**: ${context.context || 'No additional context'}

**Your Task**: 
1. Analyze the domain and determine how experts typically approach learning in this area
2. Identify the person's intent and motivations for pursuing this goal
3. Generate 3-7 strategic learning phases that are contextually appropriate for this specific goal
4. Ensure each phase builds logically on previous phases
5. Make the progression natural for how this domain is actually learned

**Critical Requirements**:
- DO NOT use generic academic phases like "Research" unless they're truly appropriate for this domain
- Consider how real experts in this field actually learn and progress
- Adapt the progression to the person's intent (career, passion, problem-solving, etc.)
- Make each phase actionable and meaningful
- Ensure logical prerequisites between phases

**Respond in this exact JSON format**:
${JSON.stringify(this.branchGenerationSchema, null, 2)}

**Examples of Domain-Appropriate Progressions**:
- Cooking: Inspiration → Basic Techniques → Recipe Mastery → Creative Development → Signature Style
- Fitness: Foundation Building → Consistency Development → Performance Improvement → Advanced Training → Peak Performance
- Business: Problem Identification → Market Validation → Solution Development → Launch & Scale → Growth Optimization
- Programming: Environment Setup → Basic Concepts → Project Building → Best Practices → Advanced Applications

Generate a progression that makes sense for THIS specific goal and domain.`;
  }

  /**
   * Apply complexity-based refinements to the generated structure
   */
  async applyComplexityRefinements(branchStructure, complexityAnalysis, goal) {
    // For simple goals (1-3), suggest consolidation
    // For complex goals (7-10), suggest expansion
    // For moderate goals (4-6), keep as-is mostly

    if (complexityAnalysis.score <= 3 && branchStructure.strategic_branches.length > 4) {
      return await this.suggestSimplification(branchStructure, goal);
    }

    if (complexityAnalysis.score >= 7 && branchStructure.strategic_branches.length < 5) {
      return await this.suggestExpansion(branchStructure, goal, complexityAnalysis);
    }

    return branchStructure; // No adjustments needed
  }

  /**
   * Suggest simplification for simple goals
   */
  async suggestSimplification(branchStructure, goal) {
    const prompt = `This goal appears to be relatively simple, but the generated learning progression has ${branchStructure.strategic_branches.length} phases, which might be overcomplicated.

**Goal**: ${goal}
**Current Branches**: ${branchStructure.strategic_branches.map(b => b.name).join(', ')}

**Task**: Suggest how to consolidate these into 3-4 clear, essential phases that still cover all the important learning but are less overwhelming.

**Respond in this JSON format**:
${JSON.stringify(this.complexityAdjustmentSchema, null, 2)}`;

    try {
      const response = await this.llmInterface.requestIntelligence(prompt, {
        max_tokens: 1000,
        temperature: 0.2,
        system: "You are an expert at simplifying learning progressions without losing essential content."
      });

      return this.applyBranchAdjustments(branchStructure, response.branch_adjustments);
    } catch (error) {
      console.warn('[SchemaBranchGen] Simplification failed:', error.message);
      return branchStructure;
    }
  }

  /**
   * Suggest expansion for complex goals
   */
  async suggestExpansion(branchStructure, goal, complexityAnalysis) {
    const prompt = `This goal appears to be quite complex (${complexityAnalysis.score}/10), but the generated learning progression only has ${branchStructure.strategic_branches.length} phases, which might be insufficient.

**Goal**: ${goal}
**Complexity Factors**: ${complexityAnalysis.factors.join(', ')}
**Current Branches**: ${branchStructure.strategic_branches.map(b => b.name).join(', ')}

**Task**: Suggest how to expand this into 5-7 phases that properly address the complexity while maintaining logical progression.

**Respond in this JSON format**:
${JSON.stringify(this.complexityAdjustmentSchema, null, 2)}`;

    try {
      const response = await this.llmInterface.requestIntelligence(prompt, {
        max_tokens: 1000,
        temperature: 0.3,
        system: "You are an expert at designing comprehensive learning progressions for complex goals."
      });

      return this.applyBranchAdjustments(branchStructure, response.branch_adjustments);
    } catch (error) {
      console.warn('[SchemaBranchGen] Expansion failed:', error.message);
      return branchStructure;
    }
  }

  /**
   * Apply suggested branch adjustments
   */
  applyBranchAdjustments(branchStructure, adjustments) {
    if (!adjustments || !Array.isArray(adjustments)) {
      return branchStructure;
    }

    let modifiedBranches = [...branchStructure.strategic_branches];

    adjustments.forEach(adjustment => {
      switch (adjustment.adjustment_type) {
        case 'merge':
          // Logic to merge branches
          break;
        case 'split':
          // Logic to split branches
          break;
        case 'reorder':
          // Logic to reorder branches
          break;
        case 'modify':
          // Logic to modify branch content
          break;
      }
    });

    return {
      ...branchStructure,
      strategic_branches: modifiedBranches
    };
  }

  /**
   * Validate and format branches for HTA system compatibility
   */
  validateAndFormatBranches(branchStructure) {
    if (!branchStructure?.strategic_branches || !Array.isArray(branchStructure.strategic_branches)) {
      throw new Error('Invalid branch structure received from LLM');
    }

    return branchStructure.strategic_branches.map((branch, index) => ({
      name: branch.name || `Phase ${index + 1}`,
      description: branch.description || `Learning phase ${index + 1}`,
      priority: branch.priority || index + 1,
      duration_estimate: branch.duration_estimate || 'Variable',
      key_activities: branch.key_activities || [],
      learning_focus: branch.learning_focus || 'balanced',
      success_indicators: branch.success_indicators || [],
      prerequisites: branch.prerequisites || [],
      
      // HTA system compatibility
      focus: this.mapLearningFocusToHTAFocus(branch.learning_focus),
      tasks: [],
      
      // Metadata for intelligence
      domain_type: branchStructure.domain_analysis?.domain_type,
      intent: branchStructure.intent_analysis?.primary_intent,
      generated_by: 'schema_driven_llm'
    }));
  }

  /**
   * Map LLM-generated learning focus to HTA focus types
   */
  mapLearningFocusToHTAFocus(learningFocus) {
    if (!learningFocus) return 'balanced';
    
    const focusMapping = {
      'hands-on': 'hands-on',
      'practical': 'hands-on',
      'application': 'hands-on',
      'theory': 'theory',
      'theoretical': 'theory',
      'conceptual': 'theory',
      'project': 'project',
      'building': 'project',
      'creation': 'project',
      'exploration': 'exploration',
      'discovery': 'exploration',
      'practice': 'practice',
      'skill-building': 'practice',
      'integration': 'integration',
      'synthesis': 'integration',
      'mastery': 'mastery',
      'advanced': 'mastery'
    };

    const lowerFocus = learningFocus.toLowerCase();
    for (const [key, value] of Object.entries(focusMapping)) {
      if (lowerFocus.includes(key)) {
        return value;
      }
    }

    return 'balanced';
  }

  /**
   * Generate fallback branches when LLM fails
   */
  generateFallbackBranches(goal, complexityAnalysis, focusAreas) {
    const complexity = complexityAnalysis.score;
    
    if (complexity <= 3) {
      return [
        { name: 'Getting Started', description: `Begin your journey with ${goal}`, priority: 1, focus: 'exploration' },
        { name: 'Building Skills', description: `Develop core skills for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Applying Knowledge', description: `Apply what you've learned about ${goal}`, priority: 3, focus: 'hands-on' }
      ];
    } else if (complexity <= 6) {
      return [
        { name: 'Foundation', description: `Build strong foundation for ${goal}`, priority: 1, focus: 'theory' },
        { name: 'Skill Development', description: `Develop essential skills for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Practical Application', description: `Apply skills in real contexts for ${goal}`, priority: 3, focus: 'hands-on' },
        { name: 'Integration & Mastery', description: `Integrate and master all aspects of ${goal}`, priority: 4, focus: 'mastery' }
      ];
    } else {
      return [
        { name: 'Strategic Foundation', description: `Build comprehensive foundation for ${goal}`, priority: 1, focus: 'theory' },
        { name: 'Core Development', description: `Develop core capabilities for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Advanced Application', description: `Apply advanced concepts for ${goal}`, priority: 3, focus: 'hands-on' },
        { name: 'System Integration', description: `Integrate all systems for ${goal}`, priority: 4, focus: 'integration' },
        { name: 'Expertise & Innovation', description: `Achieve expertise and innovate in ${goal}`, priority: 5, focus: 'mastery' }
      ];
    }
  }

  /**
   * Validate that LLM response matches expected schema
   */
  validateLLMResponse(response) {
    // Basic validation - in production, use a proper JSON schema validator
    if (!response || typeof response !== 'object') {
      throw new Error('LLM response is not a valid object');
    }

    if (!response.strategic_branches || !Array.isArray(response.strategic_branches)) {
      throw new Error('LLM response missing strategic_branches array');
    }

    if (response.strategic_branches.length < 2 || response.strategic_branches.length > 8) {
      throw new Error('LLM response has invalid number of branches');
    }

    // Validate each branch has required fields
    response.strategic_branches.forEach((branch, index) => {
      if (!branch.name || !branch.description) {
        throw new Error(`Branch ${index + 1} missing required fields`);
      }
    });

    return true;
  }
}

export default SchemaDrivenBranchGenerator;
