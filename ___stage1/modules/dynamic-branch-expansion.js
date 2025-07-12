/**
 * Dynamic Branch Expansion System
 * 
 * Automatically adds new strategic branches to the HTA tree based on:
 * - User reflections and feedback
 * - Context evolution and emerging interests
 * - Learning patterns and discovered capabilities
 * - Struggle areas that need dedicated focus
 * - Unexpected opportunities and pivots
 */

export class DynamicBranchExpansion {
  constructor(llmInterface, vectorStore, dataPersistence) {
    this.llmInterface = llmInterface;
    this.vectorStore = vectorStore;
    this.dataPersistence = dataPersistence;
    
    // Branch expansion configuration
    this.config = {
      reflectionAnalysisThreshold: 3,      // Min reflections before analysis
      contextEvolutionThreshold: 0.7,     // Similarity threshold for context drift
      strugglingTasksThreshold: 3,        // Min struggling tasks to trigger support branch
      interestSignalsThreshold: 2,        // Min interest signals for new exploration
      branchExpansionCooldown: 7,         // Days between branch expansions
      maxBranchesPerProject: 12,          // Maximum branches to prevent overwhelming
      emergingInterestMinTasks: 5         // Min tasks completed before considering new interests
    };
    
    // Track expansion state
    this.expansionHistory = new Map();
    this.contextEvolution = new Map();
    this.userInterestSignals = new Map();
  }

  /**
   * Analyze user journey and determine if new branches should be added
   */
  async analyzeForBranchExpansion(projectId, trigger = 'periodic') {
    const analysis = {
      shouldExpand: false,
      expansionTriggers: [],
      suggestedBranches: [],
      analysisTimestamp: new Date().toISOString(),
      trigger
    };

    // Get current HTA tree
    const htaData = await this.loadCurrentTree(projectId);
    if (!htaData) return analysis;

    // Gather expansion signals
    const expansionSignals = await this.gatherExpansionSignals(projectId, htaData);
    
    // Analyze each signal type
    const reflectionAnalysis = await this.analyzeReflectionSignals(expansionSignals.reflections, htaData);
    const contextAnalysis = await this.analyzeContextEvolution(expansionSignals.contextEvolution, htaData);
    const strugglingAnalysis = await this.analyzeStrugglingPatterns(expansionSignals.strugglingPatterns, htaData);
    const interestAnalysis = await this.analyzeEmergingInterests(expansionSignals.emergingInterests, htaData);
    const opportunityAnalysis = await this.analyzeUnexpectedOpportunities(expansionSignals.opportunities, htaData);

    // Combine analyses
    const allAnalyses = [reflectionAnalysis, contextAnalysis, strugglingAnalysis, interestAnalysis, opportunityAnalysis];
    
    for (const analysisResult of allAnalyses) {
      if (analysisResult.shouldExpand) {
        analysis.shouldExpand = true;
        analysis.expansionTriggers.push(...analysisResult.triggers);
        analysis.suggestedBranches.push(...analysisResult.suggestedBranches);
      }
    }

    // Apply expansion constraints
    analysis.suggestedBranches = await this.applyExpansionConstraints(
      analysis.suggestedBranches, 
      htaData, 
      projectId
    );

    return analysis;
  }

  /**
   * Gather all expansion signals from user journey
   */
  async gatherExpansionSignals(projectId, htaData) {
    const signals = {
      reflections: [],
      contextEvolution: [],
      strugglingPatterns: [],
      emergingInterests: [],
      opportunities: []
    };

    try {
      // Get user reflections and feedback
      const reflections = await this.dataPersistence.loadProjectData(projectId, 'user_reflections.json') || [];
      signals.reflections = reflections.slice(-10); // Last 10 reflections

      // Get task completions for pattern analysis
      const completedTasks = await this.dataPersistence.loadProjectData(projectId, 'completed_tasks.json') || [];
      
      // Analyze struggling patterns
      signals.strugglingPatterns = this.identifyStrugglingPatterns(completedTasks);
      
      // Get context evolution from vector store
      if (this.vectorStore) {
        const contextEvolution = await this.vectorStore.getContextEvolution(projectId);
        signals.contextEvolution = contextEvolution || [];
      }

      // Extract emerging interests from reflections and completions
      signals.emergingInterests = this.extractEmergingInterests(reflections, completedTasks);
      
      // Identify unexpected opportunities
      signals.opportunities = this.identifyUnexpectedOpportunities(reflections, completedTasks, htaData);

      return signals;
    } catch (error) {
      console.warn('Failed to gather expansion signals:', error.message);
      return signals;
    }
  }

  /**
   * Analyze reflection signals for branch expansion needs
   */
  async analyzeReflectionSignals(reflections, htaData) {
    const analysis = {
      shouldExpand: false,
      triggers: [],
      suggestedBranches: []
    };

    if (reflections.length < this.config.reflectionAnalysisThreshold) {
      return analysis;
    }

    const prompt = `Analyze these user reflections to determine if new strategic branches should be added to their learning tree:

**Current Goal**: ${htaData.goal}

**Current Strategic Branches**:
${htaData.strategicBranches.map(b => `- ${b.name}: ${b.description}`).join('\n')}

**User Reflections**:
${reflections.map(r => `- ${r.timestamp}: ${r.content}`).join('\n')}

**Analysis Instructions**:
- Look for emerging interests not covered by current branches
- Identify areas where user is expressing confusion or need for deeper focus
- Detect pivots or evolution in learning direction
- Consider gaps between user's expressed needs and current structure

**Schema**:
{
  "shouldExpand": "boolean",
  "triggers": ["string"],
  "suggestedBranches": [
    {
      "name": "string",
      "description": "string",
      "rationale": "string",
      "priority": "number",
      "type": "reflection-driven"
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 800,
        temperature: 0.6,
        system: 'You are analyzing user reflections to determine learning tree expansion needs.'
      }
    });

    try {
      const result = JSON.parse(response.result || response);
      return {
        shouldExpand: result.shouldExpand,
        triggers: result.triggers || [],
        suggestedBranches: result.suggestedBranches || []
      };
    } catch (error) {
      console.warn('Failed to parse reflection analysis:', error.message);
      return analysis;
    }
  }

  /**
   * Analyze context evolution for new branch needs
   */
  async analyzeContextEvolution(contextEvolution, htaData) {
    const analysis = {
      shouldExpand: false,
      triggers: [],
      suggestedBranches: []
    };

    if (!contextEvolution || contextEvolution.length === 0) {
      return analysis;
    }

    // Check for significant context drift
    const contextDrift = this.calculateContextDrift(contextEvolution);
    
    if (contextDrift.magnitude > this.config.contextEvolutionThreshold) {
      analysis.shouldExpand = true;
      analysis.triggers.push('significant_context_evolution');
      
      // Generate context-driven branches
      const contextBranches = await this.generateContextDrivenBranches(
        contextDrift.evolutionAreas,
        htaData
      );
      
      analysis.suggestedBranches.push(...contextBranches);
    }

    return analysis;
  }

  /**
   * Analyze struggling patterns for support branch needs
   */
  async analyzeStrugglingPatterns(strugglingPatterns, htaData) {
    const analysis = {
      shouldExpand: false,
      triggers: [],
      suggestedBranches: []
    };

    if (strugglingPatterns.length < this.config.strugglingTasksThreshold) {
      return analysis;
    }

    analysis.shouldExpand = true;
    analysis.triggers.push('persistent_struggling_patterns');

    // Generate support branches for struggling areas
    const supportBranches = await this.generateSupportBranches(strugglingPatterns, htaData);
    analysis.suggestedBranches.push(...supportBranches);

    return analysis;
  }

  /**
   * Analyze emerging interests for exploration branches
   */
  async analyzeEmergingInterests(emergingInterests, htaData) {
    const analysis = {
      shouldExpand: false,
      triggers: [],
      suggestedBranches: []
    };

    if (emergingInterests.length < this.config.interestSignalsThreshold) {
      return analysis;
    }

    analysis.shouldExpand = true;
    analysis.triggers.push('emerging_interests_detected');

    // Generate exploration branches for new interests
    const explorationBranches = await this.generateExplorationBranches(emergingInterests, htaData);
    analysis.suggestedBranches.push(...explorationBranches);

    return analysis;
  }

  /**
   * Analyze unexpected opportunities for pivot branches
   */
  async analyzeUnexpectedOpportunities(opportunities, htaData) {
    const analysis = {
      shouldExpand: false,
      triggers: [],
      suggestedBranches: []
    };

    if (opportunities.length === 0) {
      return analysis;
    }

    analysis.shouldExpand = true;
    analysis.triggers.push('unexpected_opportunities_identified');

    // Generate opportunity branches
    const opportunityBranches = await this.generateOpportunityBranches(opportunities, htaData);
    analysis.suggestedBranches.push(...opportunityBranches);

    return analysis;
  }

  /**
   * Generate support branches for struggling areas
   */
  async generateSupportBranches(strugglingPatterns, htaData) {
    const prompt = `Generate focused support branches to help with these struggling areas:

**Current Goal**: ${htaData.goal}

**Struggling Patterns**:
${strugglingPatterns.map(p => `- ${p.area}: ${p.description} (${p.frequency} occurrences)`).join('\n')}

**Current Branches**:
${htaData.strategicBranches.map(b => `- ${b.name}`).join('\n')}

**Requirements**:
- Create branches that specifically address the struggling areas
- Focus on foundational skills or prerequisites that may be missing
- Provide alternative approaches or learning methods
- Consider breaking down complex areas into smaller, manageable branches

**Schema**:
{
  "branches": [
    {
      "name": "string",
      "description": "string",
      "rationale": "string",
      "priority": "number",
      "type": "support",
      "targetStruggles": ["string"]
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 600,
        temperature: 0.5,
        system: 'You are creating support branches to help with learning difficulties.'
      }
    });

    try {
      const result = JSON.parse(response.result || response);
      return result.branches || [];
    } catch (error) {
      console.warn('Failed to generate support branches:', error.message);
      return [];
    }
  }

  /**
   * Generate exploration branches for emerging interests
   */
  async generateExplorationBranches(emergingInterests, htaData) {
    const prompt = `Generate exploration branches for these emerging interests:

**Current Goal**: ${htaData.goal}

**Emerging Interests**:
${emergingInterests.map(i => `- ${i.interest}: ${i.context} (confidence: ${i.confidence})`).join('\n')}

**Current Branches**:
${htaData.strategicBranches.map(b => `- ${b.name}`).join('\n')}

**Requirements**:
- Create branches that explore the new interests while staying connected to the main goal
- Balance exploration with goal focus
- Consider how new interests might enhance or complement existing learning
- Provide structured pathways for interest exploration

**Schema**:
{
  "branches": [
    {
      "name": "string",
      "description": "string",
      "rationale": "string",
      "priority": "number",
      "type": "exploration",
      "targetInterests": ["string"],
      "goalAlignment": "string"
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 600,
        temperature: 0.6,
        system: 'You are creating exploration branches for emerging user interests.'
      }
    });

    try {
      const result = JSON.parse(response.result || response);
      return result.branches || [];
    } catch (error) {
      console.warn('Failed to generate exploration branches:', error.message);
      return [];
    }
  }

  /**
   * Generate opportunity branches for unexpected opportunities
   */
  async generateOpportunityBranches(opportunities, htaData) {
    const prompt = `Generate opportunity branches for these unexpected opportunities:

**Current Goal**: ${htaData.goal}

**Opportunities**:
${opportunities.map(o => `- ${o.opportunity}: ${o.description} (urgency: ${o.urgency})`).join('\n')}

**Current Branches**:
${htaData.strategicBranches.map(b => `- ${b.name}`).join('\n')}

**Requirements**:
- Create branches that capitalize on time-sensitive opportunities
- Maintain connection to main learning goal
- Consider resource allocation and priority
- Provide clear pathways to leverage opportunities

**Schema**:
{
  "branches": [
    {
      "name": "string",
      "description": "string",
      "rationale": "string",
      "priority": "number",
      "type": "opportunity",
      "targetOpportunities": ["string"],
      "urgency": "string"
    }
  ]
}`;

    const response = await this.llmInterface.request({
      method: 'llm/completion',
      params: {
        prompt,
        max_tokens: 600,
        temperature: 0.6,
        system: 'You are creating opportunity branches for unexpected learning opportunities.'
      }
    });

    try {
      const result = JSON.parse(response.result || response);
      return result.branches || [];
    } catch (error) {
      console.warn('Failed to generate opportunity branches:', error.message);
      return [];
    }
  }

  /**
   * Apply expansion constraints to prevent overwhelming the user
   */
  async applyExpansionConstraints(suggestedBranches, htaData, projectId) {
    const constraints = {
      maxNewBranches: 3,
      cooldownCheck: true,
      currentBranchCount: htaData.strategicBranches.length,
      maxTotalBranches: this.config.maxBranchesPerProject
    };

    let filteredBranches = suggestedBranches;

    // Check cooldown period
    if (constraints.cooldownCheck) {
      const lastExpansion = await this.getLastExpansionDate(projectId);
      if (lastExpansion && this.isWithinCooldown(lastExpansion)) {
        console.log('Branch expansion skipped due to cooldown period');
        return [];
      }
    }

    // Limit total branches
    const availableSlots = constraints.maxTotalBranches - constraints.currentBranchCount;
    if (availableSlots <= 0) {
      console.log('Branch expansion skipped: maximum branches reached');
      return [];
    }

    // Limit new branches per expansion
    const maxNewBranches = Math.min(constraints.maxNewBranches, availableSlots);
    if (filteredBranches.length > maxNewBranches) {
      // Sort by priority and take top branches
      filteredBranches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      filteredBranches = filteredBranches.slice(0, maxNewBranches);
    }

    // Remove duplicate branches
    filteredBranches = this.removeDuplicateBranches(filteredBranches, htaData.strategicBranches);

    return filteredBranches;
  }

  /**
   * Execute branch expansion by adding new branches to the tree
   */
  async executeBranchExpansion(projectId, suggestedBranches, progressiveRefinement) {
    const pathName = 'general';
    const htaData = await this.loadCurrentTree(projectId);
    
    if (!htaData) {
      throw new Error('Cannot expand branches: no HTA tree found');
    }

    const expansionResult = {
      success: false,
      addedBranches: [],
      totalBranches: htaData.strategicBranches.length,
      timestamp: new Date().toISOString()
    };

    try {
      // Add new branches to the tree
      for (const branchSpec of suggestedBranches) {
        const newBranch = await this.createExpandedBranch(branchSpec, htaData, progressiveRefinement);
        htaData.strategicBranches.push(newBranch);
        expansionResult.addedBranches.push(newBranch);
      }

      // Update metadata
      htaData.lastBranchExpansion = new Date().toISOString();
      htaData.expansionHistory = (htaData.expansionHistory || []).concat({
        timestamp: new Date().toISOString(),
        addedBranches: suggestedBranches.map(b => b.name),
        trigger: 'dynamic_expansion'
      });

      // Recalculate frontier nodes
      htaData.frontierNodes = await this.recalculateFrontierNodes(htaData, progressiveRefinement);

      // Save updated tree
      await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', htaData);

      // Update expansion history
      await this.updateExpansionHistory(projectId, expansionResult);

      expansionResult.success = true;
      expansionResult.totalBranches = htaData.strategicBranches.length;

      console.log(`🌳 Successfully expanded HTA tree with ${expansionResult.addedBranches.length} new branches`);
      
      return expansionResult;
    } catch (error) {
      console.error('Failed to execute branch expansion:', error.message);
      expansionResult.error = error.message;
      return expansionResult;
    }
  }

  /**
   * Create a new branch with progressive refinement
   */
  async createExpandedBranch(branchSpec, htaData, progressiveRefinement) {
    const newBranch = {
      name: branchSpec.name,
      description: branchSpec.description,
      priority: htaData.strategicBranches.length + 1,
      phase: branchSpec.name.toLowerCase().replace(/\s+/g, '_'),
      order: htaData.strategicBranches.length + 1,
      estimatedDuration: '2-4 weeks',
      prerequisites: [],
      deliverables: [`Progress in ${branchSpec.name}`, 'Practical skills'],
      tasks: [],
      focus: 'balanced',
      schema_generated: true,
      dynamically_expanded: true,
      expansion_rationale: branchSpec.rationale,
      expansion_type: branchSpec.type,
      expansion_timestamp: new Date().toISOString()
    };

    // Generate initial tasks using progressive refinement
    if (progressiveRefinement) {
      const branchData = await progressiveRefinement.generateBranchWithProgressiveRefinement(
        newBranch,
        htaData.goal,
        { expandedBranch: true }
      );
      
      newBranch.frontierNodes = branchData.frontierNodes;
      newBranch.refinementMetadata = branchData.refinementMetadata;
    }

    return newBranch;
  }

  /**
   * Recalculate frontier nodes after branch expansion
   */
  async recalculateFrontierNodes(htaData, progressiveRefinement) {
    const allNodes = [];
    
    // Collect existing nodes
    const existingNodes = htaData.frontierNodes || [];
    allNodes.push(...existingNodes);
    
    // Add new branch nodes
    for (const branch of htaData.strategicBranches) {
      if (branch.dynamically_expanded && branch.frontierNodes) {
        allNodes.push(...branch.frontierNodes);
      }
    }
    
    return allNodes;
  }

  /**
   * Utility methods for analysis
   */
  
  identifyStrugglingPatterns(completedTasks) {
    const patterns = [];
    const tasksByType = {};
    
    completedTasks.forEach(task => {
      if (!tasksByType[task.type]) {
        tasksByType[task.type] = [];
      }
      tasksByType[task.type].push(task);
    });
    
    for (const [type, tasks] of Object.entries(tasksByType)) {
      const strugglingTasks = tasks.filter(t => 
        t.actualDuration > t.estimatedDuration * 1.5 || 
        t.completionQuality < 0.7
      );
      
      if (strugglingTasks.length >= 2) {
        patterns.push({
          area: type,
          description: `Consistent struggles with ${type} tasks`,
          frequency: strugglingTasks.length,
          severity: strugglingTasks.reduce((sum, t) => sum + (t.actualDuration / t.estimatedDuration), 0) / strugglingTasks.length
        });
      }
    }
    
    return patterns;
  }

  extractEmergingInterests(reflections, completedTasks) {
    const interests = [];
    
    // Extract from reflections
    reflections.forEach(reflection => {
      const content = reflection.content.toLowerCase();
      if (content.includes('interested in') || content.includes('curious about') || content.includes('want to explore')) {
        interests.push({
          interest: reflection.content,
          context: 'user_reflection',
          confidence: 0.8,
          timestamp: reflection.timestamp
        });
      }
    });
    
    // Extract from task completion patterns
    const taskTypes = {};
    completedTasks.forEach(task => {
      if (task.completionQuality > 0.9) {
        if (!taskTypes[task.type]) {
          taskTypes[task.type] = { count: 0, quality: 0 };
        }
        taskTypes[task.type].count++;
        taskTypes[task.type].quality += task.completionQuality;
      }
    });
    
    for (const [type, stats] of Object.entries(taskTypes)) {
      if (stats.count >= 2 && stats.quality / stats.count > 0.9) {
        interests.push({
          interest: `Advanced ${type}`,
          context: 'high_performance_pattern',
          confidence: 0.7,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return interests;
  }

  identifyUnexpectedOpportunities(reflections, completedTasks, htaData) {
    const opportunities = [];
    
    reflections.forEach(reflection => {
      const content = reflection.content.toLowerCase();
      if (content.includes('opportunity') || content.includes('chance to') || content.includes('project available')) {
        opportunities.push({
          opportunity: reflection.content,
          description: 'User-mentioned opportunity',
          urgency: content.includes('urgent') || content.includes('deadline') ? 'high' : 'medium',
          timestamp: reflection.timestamp
        });
      }
    });
    
    return opportunities;
  }

  calculateContextDrift(contextEvolution) {
    // Simple context drift calculation
    if (contextEvolution.length < 2) {
      return { magnitude: 0, evolutionAreas: [] };
    }
    
    const recent = contextEvolution.slice(-3);
    const magnitude = recent.reduce((sum, ctx) => sum + (ctx.driftMagnitude || 0), 0) / recent.length;
    const evolutionAreas = recent.flatMap(ctx => ctx.evolutionAreas || []);
    
    return { magnitude, evolutionAreas };
  }

  async generateContextDrivenBranches(evolutionAreas, htaData) {
    // Generate branches based on context evolution
    return evolutionAreas.map(area => ({
      name: `${area} Integration`,
      description: `Explore ${area} in the context of ${htaData.goal}`,
      rationale: `Context evolution detected in ${area}`,
      priority: 5,
      type: 'context-driven'
    }));
  }

  removeDuplicateBranches(newBranches, existingBranches) {
    const existingNames = new Set(existingBranches.map(b => b.name.toLowerCase()));
    return newBranches.filter(branch => !existingNames.has(branch.name.toLowerCase()));
  }

  async getLastExpansionDate(projectId) {
    const expansionHistory = this.expansionHistory.get(projectId);
    return expansionHistory?.lastExpansion || null;
  }

  isWithinCooldown(lastExpansionDate) {
    const cooldownMs = this.config.branchExpansionCooldown * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(lastExpansionDate).getTime()) < cooldownMs;
  }

  async updateExpansionHistory(projectId, expansionResult) {
    const history = this.expansionHistory.get(projectId) || { expansions: [] };
    history.expansions.push(expansionResult);
    history.lastExpansion = expansionResult.timestamp;
    this.expansionHistory.set(projectId, history);
  }

  async loadCurrentTree(projectId) {
    return await this.dataPersistence.loadPathData(projectId, 'general', 'hta.json');
  }

  /**
   * Get branch expansion recommendations for UI
   */
  async getBranchExpansionRecommendations(projectId) {
    const analysis = await this.analyzeForBranchExpansion(projectId, 'user_request');
    
    return {
      canExpand: analysis.shouldExpand,
      recommendedBranches: analysis.suggestedBranches,
      triggers: analysis.expansionTriggers,
      analysisTimestamp: analysis.analysisTimestamp,
      expansionHistory: this.expansionHistory.get(projectId) || { expansions: [] }
    };
  }
}
