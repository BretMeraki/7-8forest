/**
 * Progressive Task Refinement System
 * 
 * Implements smart task generation strategy:
 * 1. High-fidelity first batch (immediate tasks) with full LLM attention
 * 2. Rough estimates for distant tasks (just enough for tree structure)
 * 3. Context-driven refinement as tasks approach based on accumulated learning data
 * 4. Adaptive evolution based on user's actual journey patterns
 */

export class ProgressiveTaskRefinement {
  constructor(llmInterface, vectorStore, dataPersistence) {
    this.llmInterface = llmInterface;
    this.vectorStore = vectorStore;
    this.dataPersistence = dataPersistence;
    
    // Task refinement configuration
    this.config = {
      immediateTasksCount: 3,        // High-fidelity tasks to generate upfront
      roughEstimatesCount: 8,        // Rough placeholder tasks
      refinementHorizon: 2,          // How many tasks ahead to refine
      contextAccumulationThreshold: 3, // Min interactions before refinement
      refinementTriggerDistance: 1   // Distance from task to trigger refinement
    };
    
    // Track refinement state
    this.refinementState = new Map();
    this.userJourneyContext = new Map();
  }

  /**
   * Generate initial HTA tree with progressive task refinement strategy
   */
  async generateInitialTree(goal, initialContext, strategicBranches) {
    const refinedTree = {
      goal,
      strategicBranches: [],
      frontierNodes: [],
      refinementStrategy: 'progressive',
      generated: new Date().toISOString()
    };

    // Process each strategic branch
    for (const branch of strategicBranches) {
      const branchData = await this.generateBranchWithProgressiveRefinement(
        branch, 
        goal, 
        initialContext
      );
      
      refinedTree.strategicBranches.push(branchData);
      refinedTree.frontierNodes.push(...branchData.frontierNodes);
    }

    return refinedTree;
  }

  /**
   * Generate branch with progressive refinement: immediate tasks + rough estimates
   */
  async generateBranchWithProgressiveRefinement(branch, goal, context) {
    const branchData = {
      ...branch,
      frontierNodes: [],
      refinementMetadata: {
        lastRefined: new Date().toISOString(),
        refinementLevel: 'initial',
        contextSnapshot: this.captureContextSnapshot(context)
      }
    };

    // Generate immediate high-fidelity tasks
    const immediateTasks = await this.generateImmediateTasks(
      branch, 
      goal, 
      context, 
      this.config.immediateTasksCount
    );

    // Generate rough estimates for distant tasks
    const roughEstimates = await this.generateRoughEstimates(
      branch, 
      goal, 
      context, 
      this.config.roughEstimatesCount
    );

    // Combine and mark refinement status
    branchData.frontierNodes = [
      ...immediateTasks.map(task => ({
        ...task,
        refinementStatus: 'high_fidelity',
        refinementPriority: 'immediate'
      })),
      ...roughEstimates.map((task, index) => ({
        ...task,
        refinementStatus: 'rough_estimate',
        refinementPriority: index < 3 ? 'soon' : 'distant',
        estimatedRefinementDistance: index + this.config.immediateTasksCount
      }))
    ];

    return branchData;
  }

  /**
   * Generate immediate high-fidelity tasks with full LLM attention
   */
  async generateImmediateTasks(branch, goal, context, count) {
    const prompt = `Generate ${count} immediate, high-fidelity tasks for the "${branch.name}" phase of goal: "${goal}".

**Context:**
${JSON.stringify(context, null, 2)}

**Requirements:**
- These are the FIRST tasks the user will encounter
- Use full detail and specificity
- Include clear success criteria and estimated duration
- Consider user's current context and constraints
- Make them actionable and achievable

**Focus:** Maximum quality and specificity for immediate execution.

**Schema:**
{
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string", 
      "estimatedDuration": "string",
      "difficulty": "number (1-10)",
      "successCriteria": ["string"],
      "prerequisites": ["string"],
      "type": "string",
      "immediateNext": "boolean"
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 1000,
        temperature: 0.7,
        system: 'You are an expert learning designer creating detailed, actionable tasks.'
      }
    });

    return this.parseTaskResponse(response, 'immediate');
  }

  /**
   * Generate rough estimates for distant tasks (lightweight)
   */
  async generateRoughEstimates(branch, goal, context, count) {
    const prompt = `Generate ${count} rough task estimates for the "${branch.name}" phase of goal: "${goal}".

**Context:**
${JSON.stringify(context, null, 2)}

**Requirements:**
- These are PLACEHOLDER tasks for later refinement
- Use general descriptions and estimates
- Focus on logical progression and coverage
- Don't over-specify - keep it lightweight

**Focus:** Rough structure and progression, not detailed specifications.

**Schema:**
{
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "estimatedDuration": "string",
      "difficulty": "number (1-10)",
      "type": "string",
      "roughEstimate": "boolean"
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 600,
        temperature: 0.5,
        system: 'You are creating rough task estimates for future refinement.'
      }
    });

    return this.parseTaskResponse(response, 'rough');
  }

  /**
   * Refine tasks as user approaches them using accumulated context
   */
  async refineTasksOnApproach(projectId, currentTaskId, frontierNodes) {
    const currentTaskIndex = frontierNodes.findIndex(task => task.id === currentTaskId);
    if (currentTaskIndex === -1) return frontierNodes;

    const tasksToRefine = this.identifyTasksForRefinement(
      frontierNodes, 
      currentTaskIndex
    );

    // Accumulate user journey context
    const userJourneyContext = await this.accumulateUserJourneyContext(projectId);
    
    // Refine each identified task
    const refinedNodes = [...frontierNodes];
    for (const taskIndex of tasksToRefine) {
      const task = refinedNodes[taskIndex];
      
      if (task.refinementStatus === 'rough_estimate') {
        console.log(`🔄 Refining task: ${task.title}`);
        
        const refinedTask = await this.refineTaskWithContext(
          task, 
          userJourneyContext, 
          projectId
        );
        
        refinedNodes[taskIndex] = refinedTask;
      }
    }

    return refinedNodes;
  }

  /**
   * Identify which tasks need refinement based on user's current position
   */
  identifyTasksForRefinement(frontierNodes, currentTaskIndex) {
    const tasksToRefine = [];
    
    // Refine tasks within the refinement horizon
    for (let i = currentTaskIndex + 1; i <= currentTaskIndex + this.config.refinementHorizon; i++) {
      if (i < frontierNodes.length && frontierNodes[i].refinementStatus === 'rough_estimate') {
        tasksToRefine.push(i);
      }
    }

    return tasksToRefine;
  }

  /**
   * Accumulate user journey context from completed tasks and interactions
   */
  async accumulateUserJourneyContext(projectId) {
    const context = {
      completedTasks: [],
      userPreferences: {},
      learningPatterns: {},
      strugglingAreas: [],
      strengths: [],
      timePatterns: {},
      contextEvolution: []
    };

    try {
      // Load completed tasks and analyze patterns
      const completedTasks = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
      context.completedTasks = completedTasks;

      // Analyze user patterns from vector store if available
      if (this.vectorStore) {
        const vectorContext = await this.vectorStore.getUserLearningPatterns(projectId);
        if (vectorContext) {
          context.learningPatterns = vectorContext.patterns || {};
          context.userPreferences = vectorContext.preferences || {};
        }
      }

      // Identify struggling areas and strengths
      context.strugglingAreas = this.identifyStrugglingAreas(completedTasks);
      context.strengths = this.identifyStrengths(completedTasks);

      // Track time patterns
      context.timePatterns = this.analyzeTimePatterns(completedTasks);

      return context;
    } catch (error) {
      console.warn('Failed to accumulate user journey context:', error.message);
      return context;
    }
  }

  /**
   * Refine a rough task using accumulated user context
   */
  async refineTaskWithContext(roughTask, userContext, projectId) {
    const prompt = `Refine this rough task estimate using accumulated user journey context:

**Rough Task:**
${JSON.stringify(roughTask, null, 2)}

**User Journey Context:**
${JSON.stringify(userContext, null, 2)}

**Refinement Instructions:**
- Use the user's demonstrated preferences and patterns
- Adapt to their time constraints and learning style
- Address any struggling areas identified
- Leverage their strengths
- Make the task more specific and actionable
- Adjust difficulty based on their progression

**Schema:**
{
  "id": "string",
  "title": "string", 
  "description": "string",
  "estimatedDuration": "string",
  "difficulty": "number (1-10)",
  "successCriteria": ["string"],
  "prerequisites": ["string"],
  "type": "string",
  "adaptations": ["string"],
  "contextualNotes": "string"
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 800,
        temperature: 0.6,
        system: 'You are refining a task using real user journey data and patterns.'
      }
    });

    const refinedTask = this.parseTaskResponse(response, 'refined')[0];
    
    return {
      ...refinedTask,
      refinementStatus: 'context_refined',
      refinementTimestamp: new Date().toISOString(),
      originalTask: roughTask,
      userContextSnapshot: userContext
    };
  }

  /**
   * Parse task response from LLM
   */
  parseTaskResponse(response, type) {
    try {
      const parsed = JSON.parse(response.result || response);
      return parsed.tasks || [];
    } catch (error) {
      console.warn(`Failed to parse ${type} task response:`, error.message);
      return [];
    }
  }

  /**
   * Capture current context snapshot for refinement
   */
  captureContextSnapshot(context) {
    return {
      timestamp: new Date().toISOString(),
      learningStyle: context.learningStyle,
      urgency: context.urgency,
      constraints: context.constraints,
      preferences: context.preferences
    };
  }

  /**
   * Analyze user patterns to identify struggling areas
   */
  identifyStrugglingAreas(completedTasks) {
    const struggling = [];
    
    completedTasks.forEach(task => {
      if (task.actualDuration > task.estimatedDuration * 1.5) {
        struggling.push(`Time management with ${task.type} tasks`);
      }
      if (task.difficulty > 7 && task.completionQuality < 0.7) {
        struggling.push(`High difficulty ${task.type} tasks`);
      }
    });

    return [...new Set(struggling)];
  }

  /**
   * Analyze user patterns to identify strengths
   */
  identifyStrengths(completedTasks) {
    const strengths = [];
    
    completedTasks.forEach(task => {
      if (task.actualDuration < task.estimatedDuration * 0.8) {
        strengths.push(`Efficient with ${task.type} tasks`);
      }
      if (task.completionQuality > 0.9) {
        strengths.push(`High quality ${task.type} execution`);
      }
    });

    return [...new Set(strengths)];
  }

  /**
   * Analyze time patterns from completed tasks
   */
  analyzeTimePatterns(completedTasks) {
    const patterns = {
      averageTaskDuration: 0,
      preferredTimeSlots: [],
      productivityPatterns: {}
    };

    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => sum + (task.actualDuration || 0), 0);
      patterns.averageTaskDuration = totalDuration / completedTasks.length;
    }

    return patterns;
  }

  /**
   * Check if task refinement should be triggered
   */
  shouldTriggerRefinement(task, userPosition) {
    return (
      task.refinementStatus === 'rough_estimate' &&
      task.estimatedRefinementDistance <= this.config.refinementTriggerDistance
    );
  }

  /**
   * Get refinement status for UI display
   */
  getRefinementStatus(projectId) {
    return {
      totalTasks: this.refinementState.get(projectId)?.totalTasks || 0,
      refinedTasks: this.refinementState.get(projectId)?.refinedTasks || 0,
      pendingRefinements: this.refinementState.get(projectId)?.pendingRefinements || 0,
      nextRefinementTrigger: this.refinementState.get(projectId)?.nextRefinementTrigger || null
    };
  }
}
