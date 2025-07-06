/**
 * Schema-Driven Granular Decomposer - Universal Micro-Task Generator
 * 
 * Uses LLM intelligence to decompose ANY domain task into actionable micro-particles.
 * No hardcoded domain patterns - pure schema-driven intelligence.
 */

export class SchemaDrivenGranularDecomposer {
  constructor(llmInterface) {
    this.llmInterface = llmInterface;
    
    // Schema for micro-task decomposition
    this.microTaskSchema = {
      type: "object",
      properties: {
        decomposition_analysis: {
          type: "object",
          properties: {
            task_complexity: { type: "integer", minimum: 1, maximum: 10 },
            cognitive_load_factors: {
              type: "array",
              items: { type: "string" },
              description: "What makes this task mentally challenging"
            },
            prerequisite_knowledge: {
              type: "array", 
              items: { type: "string" },
              description: "What someone needs to know before starting"
            },
            recommended_approach: { type: "string", description: "How to break this down effectively" }
          }
        },
        micro_tasks: {
          type: "array",
          minItems: 3,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Clear, specific micro-task title" },
              description: { type: "string", description: "What this micro-task accomplishes" },
              action: { type: "string", description: "Exact step-by-step action to take" },
              validation: { type: "string", description: "How to know this step is complete" },
              duration_minutes: { type: "integer", minimum: 2, maximum: 25, description: "Time to complete this micro-task" },
              difficulty: { type: "integer", minimum: 1, maximum: 5 },
              prerequisites: {
                type: "array",
                items: { type: "string" },
                description: "Which previous micro-tasks must be completed first"
              },
              resources_needed: {
                type: "array",
                items: { type: "string" },
                description: "What tools, materials, or information is needed"
              },
              success_indicators: {
                type: "array",
                items: { type: "string" },
                description: "Specific signs that this micro-task was done correctly"
              },
              common_mistakes: {
                type: "array",
                items: { type: "string" },
                description: "What people often get wrong at this step"
              }
            },
            required: ["title", "description", "action", "validation", "duration_minutes", "difficulty"]
          }
        },
        progression_notes: {
          type: "string",
          description: "How these micro-tasks build on each other"
        }
      },
      required: ["decomposition_analysis", "micro_tasks", "progression_notes"]
    };
  }

  /**
   * Decompose any task into actionable micro-particles
   */
  async decomposeTask(taskTitle, taskDescription, difficulty = 3, learningStyle = 'mixed', context = {}) {
    try {
      // Use LLM to generate context-aware micro-task decomposition
      const decomposition = await this.generateMicroTaskDecomposition(
        taskTitle,
        taskDescription, 
        difficulty,
        learningStyle,
        context
      );

      // Validate and format for HTA system
      const formattedMicroTasks = this.formatMicroTasks(decomposition, taskTitle);

      return formattedMicroTasks;

    } catch (error) {
      console.warn('[SchemaDrivenDecomposer] LLM decomposition failed, using fallback:', error.message);
      return this.generateFallbackDecomposition(taskTitle, taskDescription, difficulty);
    }
  }

  /**
   * Generate micro-task decomposition using LLM with schema guidance
   */
  async generateMicroTaskDecomposition(taskTitle, taskDescription, difficulty, learningStyle, context) {
    const prompt = this.buildDecompositionPrompt(
      taskTitle,
      taskDescription,
      difficulty,
      learningStyle,
      context
    );

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 2500,
        temperature: 0.2, // Lower temperature for precise, actionable steps
        system: "You are an expert learning designer who breaks complex tasks into small, achievable micro-tasks. Focus on creating steps that are so small they cannot fail."
      }
    });

    return response;
  }

  /**
   * Build the prompt for micro-task decomposition
   */
  buildDecompositionPrompt(taskTitle, taskDescription, difficulty, learningStyle, context) {
    return `Break down this learning task into precise, actionable micro-tasks:

**Task**: ${taskTitle}
**Description**: ${taskDescription}
**Difficulty**: ${difficulty}/5
**Learning Style**: ${learningStyle}
**Context**: ${context.urgency || 'normal'} urgency, ${context.available_resources || 'standard'} resources
**Domain Context**: ${context.domain_type || 'general'}
**Intent**: ${context.intent || 'general learning'}

**Your Mission**:
Decompose this task into 5-10 micro-tasks that are:
1. **Atomic**: Each step is so small it cannot be broken down further
2. **Actionable**: Clear, specific actions anyone can follow
3. **Measurable**: Clear success criteria for each step
4. **Sequential**: Each step builds logically on the previous
5. **Time-bounded**: 5-25 minutes maximum per micro-task

**Critical Requirements**:
- Each micro-task should feel like a "quick win"
- No step should require more than 25 minutes
- Include specific validation criteria for each step
- Consider the learning style and context when designing actions
- Account for available resources and urgency level
- Ensure prerequisites are clear

**Respond in this exact JSON format**:
${JSON.stringify(this.microTaskSchema, null, 2)}

**Examples of Good Micro-Task Decomposition**:

**Bad**: "Learn HTML basics" (too vague, too big)
**Good**: 
- "Create a new file named index.html" (5 min)
- "Type the HTML5 doctype at the top" (3 min)  
- "Add opening and closing html tags" (5 min)
- "Create head section with title" (8 min)

**Context Adaptations**:
- **Urgency: High** → Focus on essential steps only, combine where safe
- **Resources: Limited** → Emphasize improvisation and alternatives
- **Learning Style: Hands-on** → More doing, less reading
- **Learning Style: Theoretical** → More understanding, then doing

Break down THIS specific task now:`;
  }

  /**
   * Format LLM response for HTA system compatibility
   */
  formatMicroTasks(decomposition, originalTaskTitle) {
    if (!decomposition?.micro_tasks || !Array.isArray(decomposition.micro_tasks)) {
      throw new Error('Invalid decomposition structure from LLM');
    }

    return decomposition.micro_tasks.map((microTask, index) => ({
      id: `micro_${originalTaskTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index + 1}`,
      title: microTask.title,
      description: microTask.description,
      action: microTask.action,
      validation: microTask.validation,
      duration: `${microTask.duration_minutes} minutes`,
      difficulty: microTask.difficulty,
      prerequisites: microTask.prerequisites || [],
      resources_needed: microTask.resources_needed || [],
      success_indicators: microTask.success_indicators || [],
      common_mistakes: microTask.common_mistakes || [],
      
      // HTA system compatibility
      taskType: this.inferTaskType(microTask, originalTaskTitle),
      learningOutcome: `Complete: ${microTask.title}`,
      granular: true,
      micro_particle: true,
      
      // Metadata for intelligence
      cognitive_load: decomposition.decomposition_analysis?.task_complexity || 3,
      generated_by: 'schema_driven_decomposer'
    }));
  }

  /**
   * Infer task type from micro-task content
   */
  inferTaskType(microTask, originalTaskTitle) {
    const action = microTask.action.toLowerCase();
    const title = microTask.title.toLowerCase();
    
    if (action.includes('create') || action.includes('build') || action.includes('make')) {
      return 'hands_on_creation';
    }
    if (action.includes('study') || action.includes('read') || action.includes('understand')) {
      return 'conceptual_learning';
    }
    if (action.includes('practice') || action.includes('try') || action.includes('attempt')) {
      return 'skill_practice';
    }
    if (action.includes('test') || action.includes('verify') || action.includes('check')) {
      return 'validation';
    }
    if (action.includes('find') || action.includes('locate') || action.includes('identify')) {
      return 'resource_acquisition';
    }
    
    return 'interactive_exercise';
  }

  /**
   * Generate fallback decomposition when LLM fails
   */
  generateFallbackDecomposition(taskTitle, taskDescription, difficulty) {
    const baseDuration = Math.max(5, Math.min(25, difficulty * 5));
    
    return [
      {
        id: 'fallback_intro',
        title: `Introduction to ${taskTitle}`,
        description: `Get familiar with the basics of ${taskTitle}`,
        action: `Research and understand what ${taskTitle} involves`,
        validation: `Can explain the basic concepts of ${taskTitle}`,
        duration: `${baseDuration} minutes`,
        difficulty: Math.max(1, difficulty - 1),
        taskType: 'conceptual_learning',
        granular: true,
        micro_particle: true
      },
      {
        id: 'fallback_practice',
        title: `Practice ${taskTitle}`,
        description: `Apply your understanding through hands-on practice`,
        action: `Follow a simple example or tutorial for ${taskTitle}`,
        validation: `Successfully complete a basic example`,
        duration: `${baseDuration + 5} minutes`,
        difficulty: difficulty,
        prerequisites: ['fallback_intro'],
        taskType: 'skill_practice',
        granular: true,
        micro_particle: true
      },
      {
        id: 'fallback_validate',
        title: `Validate ${taskTitle} Understanding`,
        description: `Confirm your grasp of ${taskTitle} concepts`,
        action: `Test your understanding by explaining or demonstrating ${taskTitle}`,
        validation: `Can demonstrate competency in ${taskTitle}`,
        duration: `${baseDuration} minutes`,
        difficulty: Math.min(5, difficulty + 1),
        prerequisites: ['fallback_practice'],
        taskType: 'validation',
        granular: true,
        micro_particle: true
      }
    ];
  }

  /**
   * Validate micro-task quality and granularity
   */
  validateMicroTasks(microTasks) {
    const validation = {
      valid: true,
      issues: [],
      recommendations: []
    };

    microTasks.forEach((task, index) => {
      // Check duration (should be 5-25 minutes for micro-tasks)
      const duration = parseInt(task.duration);
      if (duration > 25) {
        validation.issues.push(`Micro-task ${index + 1}: Duration too long (${duration}min) - should be ≤25min`);
        validation.recommendations.push(`Break down "${task.title}" into smaller steps`);
      }
      
      if (duration < 2) {
        validation.issues.push(`Micro-task ${index + 1}: Duration too short (${duration}min) - might be too trivial`);
        validation.recommendations.push(`Consider combining "${task.title}" with adjacent tasks`);
      }

      // Check action specificity
      if (!task.action || task.action.length < 20) {
        validation.issues.push(`Micro-task ${index + 1}: Action not specific enough`);
        validation.recommendations.push(`Add more specific action steps for "${task.title}"`);
      }

      // Check validation criteria
      if (!task.validation) {
        validation.issues.push(`Micro-task ${index + 1}: Missing validation criteria`);
        validation.recommendations.push(`Add clear success criteria for "${task.title}"`);
      }
    });

    if (validation.issues.length > 0) {
      validation.valid = false;
    }

    return validation;
  }
}

export default SchemaDrivenGranularDecomposer;
