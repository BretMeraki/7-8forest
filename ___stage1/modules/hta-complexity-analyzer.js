/**
 * HTA Complexity Analyzer - Handles goal complexity analysis and tree structure calculation
 * Split from hta-core.js for better modularity
 */

class HTAComplexityAnalyzer {
  constructor() {
    // Goal complexity analysis constants
    this.COMPLEXITY_INDICATORS = {
      TECHNICAL_TERMS: [
        'programming', 'coding', 'algorithm', 'database', 'machine learning', 'ai', 'framework', 'library', 'api', 'cloud', 'security',
        // Engineering & energy related
        'engineering', 'energy', 'renewable', 'solar', 'battery', 'storage', 'electronics', 'hardware', 'materials', 'photovoltaic',
        'mechanical', 'electrical', 'power', 'grid', 'thermal'
      ],
      CREATIVE_TERMS: ['design', 'art', 'music', 'writing', 'photography', 'video', 'creative', 'visual', 'aesthetic'],
      BUSINESS_TERMS: ['marketing', 'sales', 'business', 'entrepreneurship', 'finance', 'economics', 'management', 'strategy'],
      PHYSICAL_TERMS: ['fitness', 'exercise', 'sport', 'physical', 'health', 'training', 'martial arts'],
      ACADEMIC_TERMS: ['research', 'study', 'academic', 'science', 'mathematics', 'physics', 'chemistry', 'biology']
    };

    this.COMPLEXITY_MULTIPLIERS = {
      MULTIPLE_DOMAINS: 1.5,
      TIME_CONSTRAINTS: 1.3,
      RESOURCE_CONSTRAINTS: 1.2,
      VAGUE_GOALS: 1.4,
      // Specific outcomes shouldn't drastically reduce complexity – slight adjustment only
      SPECIFIC_OUTCOMES: 0.95
    };
  }

  analyzeGoalComplexity(goal, focusAreas = [], constraints = {}) {
    // Start with a baseline complexity of 2 to avoid chronic under-estimation
    let complexityScore = 2;
    const analysis = {
      baseComplexity: 2,
      domainFactors: [],
      constraintFactors: [],
      totalScore: 2,
      reasoning: []
    };

    // Base complexity from goal length and structure
    const goalWords = goal.split(' ').length;
    if (goalWords > 20) {
      complexityScore += 2;
      analysis.reasoning.push('Long, detailed goal description indicates complexity');
    } else if (goalWords > 10) {
      complexityScore += 1;
      analysis.reasoning.push('Moderately detailed goal');
    }

    // Domain complexity analysis
    const domains = this.identifyDomains(goal, focusAreas);
    if (domains.length > 1) {
      complexityScore *= this.COMPLEXITY_MULTIPLIERS.MULTIPLE_DOMAINS;
      analysis.domainFactors.push(`Multiple domains: ${domains.join(', ')}`);
      analysis.reasoning.push(`Cross-domain learning requires ${this.COMPLEXITY_MULTIPLIERS.MULTIPLE_DOMAINS}x complexity`);
    }

    // Technical domain bonus complexity
    if (domains.includes('technical')) {
      complexityScore += 2;
      analysis.reasoning.push('Technical domain adds significant complexity');
    }

    // Constraint analysis
    if (constraints.timeLimit) {
      complexityScore *= this.COMPLEXITY_MULTIPLIERS.TIME_CONSTRAINTS;
      analysis.constraintFactors.push('Time constraints');
      analysis.reasoning.push('Time constraints increase learning pressure');
    }

    if (constraints.resources === 'limited') {
      complexityScore *= this.COMPLEXITY_MULTIPLIERS.RESOURCE_CONSTRAINTS;
      analysis.constraintFactors.push('Limited resources');
      analysis.reasoning.push('Resource limitations require creative approaches');
    }

    // Goal specificity analysis
    if (this.isVagueGoal(goal)) {
      complexityScore *= this.COMPLEXITY_MULTIPLIERS.VAGUE_GOALS;
      analysis.reasoning.push('Vague goals require exploration and clarification');
    } else if (this.hasSpecificOutcomes(goal)) {
      complexityScore *= this.COMPLEXITY_MULTIPLIERS.SPECIFIC_OUTCOMES;
      analysis.reasoning.push('Specific outcomes allow focused learning paths');
    }

    analysis.totalScore = Math.round(Math.min(Math.max(complexityScore, 1), 10));
    
    return analysis;
  }

  identifyDomains(goal, focusAreas = []) {
    const domains = new Set();
    const text = (goal + ' ' + focusAreas.join(' ')).toLowerCase();

    Object.entries(this.COMPLEXITY_INDICATORS).forEach(([category, terms]) => {
      if (terms.some(term => text.includes(term))) {
        domains.add(category.toLowerCase().replace('_terms', ''));
      }
    });

    return Array.from(domains);
  }

  isVagueGoal(goal) {
    const vagueIndicators = ['learn', 'understand', 'get better at', 'improve', 'explore', 'figure out'];
    const specificIndicators = ['build', 'create', 'develop', 'implement', 'design', 'complete'];
    
    const hasVague = vagueIndicators.some(indicator => goal.toLowerCase().includes(indicator));
    const hasSpecific = specificIndicators.some(indicator => goal.toLowerCase().includes(indicator));
    
    return hasVague && !hasSpecific;
  }

  hasSpecificOutcomes(goal) {
    const outcomeIndicators = ['build', 'create', 'complete', 'finish', 'launch', 'publish', 'deliver'];
    return outcomeIndicators.some(indicator => goal.toLowerCase().includes(indicator));
  }

  calculateTreeStructure(complexityScore, focusAreas = []) {
    const structure = {
      totalBranches: 5, // Default strategic branches
      tasksPerBranch: { min: 3, max: 8 },
      granularityLevels: 2,
      estimatedDuration: { weeks: 4, hours: 40 }
    };

    // Adjust based on complexity
    if (complexityScore >= 8) {
      structure.tasksPerBranch = { min: 6, max: 12 };
      structure.granularityLevels = 3;
      structure.estimatedDuration = { weeks: 8, hours: 80 };
    } else if (complexityScore >= 6) {
      structure.tasksPerBranch = { min: 4, max: 10 };
      structure.granularityLevels = 3;
      structure.estimatedDuration = { weeks: 6, hours: 60 };
    } else if (complexityScore <= 3) {
      structure.tasksPerBranch = { min: 2, max: 6 };
      structure.granularityLevels = 2;
      structure.estimatedDuration = { weeks: 2, hours: 20 };
    }

    // Adjust for focus areas
    if (focusAreas.length > 3) {
      structure.totalBranches = Math.min(7, structure.totalBranches + 1);
      structure.estimatedDuration.weeks += 1;
    }

    return structure;
  }

  generateStrategicBranches(goal, focusAreas = [], complexityScore = 5) {
    const domains = this.identifyDomains(goal, focusAreas);
    
    // Base strategic learning phases
    const baseBranches = [
      {
        name: 'Foundation',
        description: 'Build fundamental understanding and core concepts',
        priority: 1,
        phase: 'foundation'
      },
      {
        name: 'Research & Discovery',
        description: 'Explore resources, tools, and methodologies',
        priority: 2,
        phase: 'research'
      },
      {
        name: 'Skill Development',
        description: 'Practice core skills and build capabilities',
        priority: 3,
        phase: 'capability'
      },
      {
        name: 'Implementation',
        description: 'Apply skills through practical projects',
        priority: 4,
        phase: 'implementation'
      },
      {
        name: 'Mastery & Optimization',
        description: 'Refine skills and achieve advanced proficiency',
        priority: 5,
        phase: 'mastery'
      }
    ];

    // Customize based on domains and complexity
    if (domains.includes('technical') && complexityScore >= 6) {
      baseBranches.splice(2, 0, {
        name: 'Technical Architecture',
        description: 'Design system architecture and technical approach',
        priority: 3,
        phase: 'architecture'
      });
      // Adjust subsequent priorities
      baseBranches.forEach((branch, index) => {
        if (branch.priority > 3 && branch.name !== 'Technical Architecture') {
          branch.priority++;
        }
      });
    }

    if (domains.includes('creative') && complexityScore >= 5) {
      baseBranches.splice(1, 0, {
        name: 'Creative Exploration',
        description: 'Explore creative possibilities and inspiration',
        priority: 2,
        phase: 'creative'
      });
      // Adjust subsequent priorities
      baseBranches.forEach((branch, index) => {
        if (branch.priority > 2 && branch.name !== 'Creative Exploration') {
          branch.priority++;
        }
      });
    }

    return baseBranches;
  }

  estimateTaskDuration(taskDescription, difficulty = 'medium', domain = 'general') {
    const baseDurations = {
      'easy': { min: 15, max: 30 },
      'medium': { min: 30, max: 60 },
      'hard': { min: 60, max: 120 },
      'expert': { min: 120, max: 240 }
    };

    const domainMultipliers = {
      'technical': 1.5,
      'creative': 1.2,
      'academic': 1.3,
      'physical': 0.8,
      'general': 1.0
    };

    const base = baseDurations[difficulty] || baseDurations['medium'];
    const multiplier = domainMultipliers[domain] || 1.0;

    return {
      estimatedMinutes: Math.round(base.min * multiplier),
      maxMinutes: Math.round(base.max * multiplier),
      confidence: domain === 'general' ? 0.7 : 0.8
    };
  }
}

export { HTAComplexityAnalyzer };
