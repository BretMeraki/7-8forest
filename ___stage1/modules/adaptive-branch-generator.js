/**
 * Adaptive Branch Generator - Dynamic Domain-Aware Strategic Branches
 * 
 * Replaces rigid Foundation→Research→Capability→Implementation→Mastery
 * with contextual, goal-specific strategic branches that respect domain differences.
 */

export class AdaptiveBranchGenerator {
  constructor() {
    // Domain archetypes that define different strategic approaches
    this.domainArchetypes = {
      // === CREATIVE DOMAINS ===
      'creative': {
        archetypePattern: ['Inspiration', 'Experimentation', 'Skill Development', 'Creative Expression', 'Portfolio Building'],
        signals: ['art', 'design', 'music', 'writing', 'creative', 'aesthetic', 'visual', 'artistic'],
        branchCharacteristics: {
          inspiration_driven: true,
          iterative_refinement: true,
          portfolio_focused: true,
          subjective_evaluation: true
        }
      },

      // === TECHNICAL DOMAINS ===
      'technical': {
        archetypePattern: ['Fundamentals', 'Practical Application', 'System Building', 'Optimization', 'Advanced Integration'],
        signals: ['programming', 'code', 'software', 'algorithm', 'technical', 'engineering', 'development', 'system'],
        branchCharacteristics: {
          logic_driven: true,
          progressive_complexity: true,
          hands_on_practice: true,
          objective_validation: true
        }
      },

      // === BUSINESS DOMAINS ===
      'business': {
        archetypePattern: ['Market Understanding', 'Strategy Development', 'Execution', 'Growth & Scaling', 'Leadership'],
        signals: ['business', 'startup', 'marketing', 'sales', 'revenue', 'customer', 'market', 'entrepreneur'],
        branchCharacteristics: {
          market_validation: true,
          iterative_testing: true,
          metrics_driven: true,
          relationship_building: true
        }
      },

      // === PHYSICAL/HEALTH DOMAINS ===
      'physical': {
        archetypePattern: ['Foundation Building', 'Skill Acquisition', 'Performance Development', 'Consistency Mastery', 'Peak Performance'],
        signals: ['fitness', 'health', 'exercise', 'training', 'physical', 'body', 'strength', 'endurance', 'sport'],
        branchCharacteristics: {
          progressive_overload: true,
          consistency_critical: true,
          recovery_important: true,
          measurable_progress: true
        }
      },

      // === ACADEMIC/RESEARCH DOMAINS ===
      'academic': {
        archetypePattern: ['Knowledge Foundation', 'Research & Analysis', 'Critical Thinking', 'Knowledge Synthesis', 'Expertise Development'],
        signals: ['research', 'study', 'academic', 'theory', 'analysis', 'knowledge', 'learning', 'education'],
        branchCharacteristics: {
          depth_over_breadth: true,
          evidence_based: true,
          peer_review: true,
          cumulative_knowledge: true
        }
      },

      // === CRAFT/SKILL DOMAINS ===
      'craft': {
        archetypePattern: ['Tool Mastery', 'Technique Development', 'Practice & Refinement', 'Creative Application', 'Mastery Expression'],
        signals: ['craft', 'skill', 'technique', 'practice', 'manual', 'hands-on', 'artisan', 'mastery'],
        branchCharacteristics: {
          muscle_memory: true,
          repetitive_practice: true,
          quality_focus: true,
          mentorship_valuable: true
        }
      },

      // === SOCIAL/COMMUNICATION DOMAINS ===
      'social': {
        archetypePattern: ['Self-Awareness', 'Communication Skills', 'Relationship Building', 'Influence & Leadership', 'Community Impact'],
        signals: ['communication', 'leadership', 'social', 'relationship', 'influence', 'team', 'people', 'networking'],
        branchCharacteristics: {
          emotional_intelligence: true,
          practice_with_others: true,
          feedback_driven: true,
          context_dependent: true
        }
      }
    };

    // Goal intent patterns that modify strategic approach
    this.intentPatterns = {
      'career_transition': {
        modifiers: ['Quick Wins', 'Credibility Building', 'Network Development', 'Portfolio Creation', 'Market Positioning'],
        signals: ['career', 'job', 'transition', 'professional', 'certification', 'qualification']
      },
      'passion_project': {
        modifiers: ['Exploration', 'Deep Dive', 'Creative Expression', 'Personal Fulfillment', 'Sharing & Teaching'],
        signals: ['passion', 'love', 'enjoy', 'fascinated', 'curious', 'always wanted']
      },
      'problem_solving': {
        modifiers: ['Problem Analysis', 'Solution Research', 'Prototyping', 'Testing & Validation', 'Implementation'],
        signals: ['solve', 'fix', 'improve', 'challenge', 'problem', 'better way']
      },
      'lifestyle_change': {
        modifiers: ['Habit Formation', 'Gradual Integration', 'Environment Design', 'Social Support', 'Long-term Sustainability'],
        signals: ['lifestyle', 'habit', 'routine', 'daily', 'consistent', 'long-term', 'sustainable']
      }
    };
  }

  /**
   * Generate adaptive strategic branches based on goal analysis
   */
  generateAdaptiveBranches(goal, complexityAnalysis, focusAreas = [], learningStyle = 'mixed', context = {}) {
    // Step 1: Identify domain archetype
    const domainArchetype = this.identifyDomainArchetype(goal, focusAreas, context);
    
    // Step 2: Identify goal intent pattern
    const intentPattern = this.identifyIntentPattern(goal, context);
    
    // Step 3: Generate contextual branches
    const branches = this.generateContextualBranches(
      goal, 
      domainArchetype, 
      intentPattern, 
      complexityAnalysis, 
      focusAreas, 
      learningStyle
    );
    
    return branches;
  }

  /**
   * Identify which domain archetype best fits the goal
   */
  identifyDomainArchetype(goal, focusAreas, context) {
    const goalText = (goal + ' ' + focusAreas.join(' ') + ' ' + (context.context || '')).toLowerCase();
    
    const archetypeScores = {};
    
    // Score each archetype based on signal matches
    for (const [archetypeName, archetype] of Object.entries(this.domainArchetypes)) {
      let score = 0;
      let matchCount = 0;
      
      for (const signal of archetype.signals) {
        if (goalText.includes(signal)) {
          score += signal.length; // Longer signals get higher weight
          matchCount++;
        }
      }
      
      // Normalize by signal count to avoid bias toward archetypes with more signals
      archetypeScores[archetypeName] = matchCount > 0 ? score / archetype.signals.length : 0;
    }
    
    // Find highest scoring archetype
    const bestArchetype = Object.entries(archetypeScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    const archetypeName = bestArchetype[0];
    const confidence = bestArchetype[1];
    
    return {
      name: archetypeName,
      confidence: confidence,
      pattern: this.domainArchetypes[archetypeName].archetypePattern,
      characteristics: this.domainArchetypes[archetypeName].branchCharacteristics,
      fallbackToGeneric: confidence < 0.1
    };
  }

  /**
   * Identify the goal intent pattern
   */
  identifyIntentPattern(goal, context) {
    const goalText = (goal + ' ' + (context.context || '')).toLowerCase();
    
    for (const [patternName, pattern] of Object.entries(this.intentPatterns)) {
      for (const signal of pattern.signals) {
        if (goalText.includes(signal)) {
          return {
            name: patternName,
            modifiers: pattern.modifiers,
            detected: true
          };
        }
      }
    }
    
    return {
      name: 'general_learning',
      modifiers: [],
      detected: false
    };
  }

  /**
   * Generate contextual branches combining archetype + intent
   */
  generateContextualBranches(goal, domainArchetype, intentPattern, complexityAnalysis, focusAreas, learningStyle) {
    const branches = [];
    
    // Use fallback if domain detection failed
    if (domainArchetype.fallbackToGeneric) {
      return this.generateGenericAdaptiveBranches(goal, complexityAnalysis, focusAreas);
    }
    
    // Base branches from domain archetype
    const basePattern = domainArchetype.pattern;
    
    // Apply intent modifiers if detected
    const finalPattern = intentPattern.detected 
      ? this.blendPatternWithIntent(basePattern, intentPattern.modifiers)
      : basePattern;
    
    // Generate branches with contextual names and descriptions
    finalPattern.forEach((branchName, index) => {
      branches.push({
        name: branchName,
        description: this.generateContextualDescription(branchName, goal, domainArchetype, intentPattern),
        priority: index + 1,
        archetype: domainArchetype.name,
        intent: intentPattern.name,
        characteristics: this.generateBranchCharacteristics(branchName, domainArchetype, intentPattern),
        focus: this.determineBranchFocus(branchName, domainArchetype, learningStyle),
        tasks: []
      });
    });
    
    return branches;
  }

  /**
   * Blend archetype pattern with intent modifiers
   */
  blendPatternWithIntent(basePattern, intentModifiers) {
    // For now, prefer intent modifiers if they exist, otherwise use base pattern
    return intentModifiers.length > 0 ? intentModifiers : basePattern;
  }

  /**
   * Generate contextual description for each branch
   */
  generateContextualDescription(branchName, goal, domainArchetype, intentPattern) {
    const goalContext = goal.toLowerCase();
    
    // Template-based description generation
    const templates = {
      // Generic templates that work with any branch name
      'exploration': `Explore and discover the essential aspects of ${branchName.toLowerCase()} for ${goal}`,
      'development': `Develop strong ${branchName.toLowerCase()} capabilities to advance your ${goal}`,
      'application': `Apply ${branchName.toLowerCase()} skills in practical contexts for ${goal}`,
      'mastery': `Achieve mastery in ${branchName.toLowerCase()} to excel at ${goal}`,
      'building': `Build solid ${branchName.toLowerCase()} foundation for ${goal}`,
      'integration': `Integrate ${branchName.toLowerCase()} with other skills for ${goal}`
    };
    
    // Choose template based on branch name keywords
    const branchLower = branchName.toLowerCase();
    if (branchLower.includes('foundation') || branchLower.includes('fundamental')) {
      return templates.building;
    } else if (branchLower.includes('application') || branchLower.includes('practice')) {
      return templates.application;
    } else if (branchLower.includes('mastery') || branchLower.includes('advanced')) {
      return templates.mastery;
    } else if (branchLower.includes('integration') || branchLower.includes('synthesis')) {
      return templates.integration;
    } else {
      return templates.development;
    }
  }

  /**
   * Generate characteristics for this specific branch
   */
  generateBranchCharacteristics(branchName, domainArchetype, intentPattern) {
    const characteristics = { ...domainArchetype.characteristics };
    
    // Add branch-specific characteristics
    const branchLower = branchName.toLowerCase();
    
    if (branchLower.includes('foundation') || branchLower.includes('fundamental')) {
      characteristics.foundational = true;
      characteristics.prerequisite_heavy = true;
    }
    
    if (branchLower.includes('practice') || branchLower.includes('application')) {
      characteristics.hands_on = true;
      characteristics.feedback_important = true;
    }
    
    if (branchLower.includes('mastery') || branchLower.includes('advanced')) {
      characteristics.high_difficulty = true;
      characteristics.refinement_focused = true;
    }
    
    return characteristics;
  }

  /**
   * Determine the focus type for this branch
   */
  determineBranchFocus(branchName, domainArchetype, learningStyle) {
    const branchLower = branchName.toLowerCase();
    
    // Branch name-based focus
    if (branchLower.includes('theory') || branchLower.includes('knowledge') || branchLower.includes('understanding')) {
      return 'theory';
    }
    
    if (branchLower.includes('practice') || branchLower.includes('application') || branchLower.includes('hands')) {
      return 'hands-on';
    }
    
    if (branchLower.includes('project') || branchLower.includes('building') || branchLower.includes('creation')) {
      return 'project';
    }
    
    // Domain-based focus
    if (domainArchetype.characteristics.hands_on_practice) {
      return 'hands-on';
    }
    
    if (domainArchetype.characteristics.logic_driven) {
      return 'practical';
    }
    
    // Learning style-based focus
    if (learningStyle === 'hands-on') {
      return 'hands-on';
    }
    
    if (learningStyle === 'theoretical') {
      return 'theory';
    }
    
    return 'balanced';
  }

  /**
   * Generate generic adaptive branches when domain detection fails
   */
  generateGenericAdaptiveBranches(goal, complexityAnalysis, focusAreas) {
    const branches = [];
    
    // Use complexity-based branching
    const complexity = complexityAnalysis.score;
    
    if (complexity <= 3) {
      // Simple goals get straightforward progression
      branches.push(
        { name: 'Getting Started', description: `Begin your journey with ${goal}`, priority: 1, focus: 'exploration' },
        { name: 'Building Skills', description: `Develop core skills for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Applying Knowledge', description: `Apply what you've learned about ${goal}`, priority: 3, focus: 'application' }
      );
    } else if (complexity <= 6) {
      // Moderate goals get more structured approach
      branches.push(
        { name: 'Foundation', description: `Build strong foundation for ${goal}`, priority: 1, focus: 'theory' },
        { name: 'Skill Development', description: `Develop essential skills for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Practical Application', description: `Apply skills in real contexts for ${goal}`, priority: 3, focus: 'hands-on' },
        { name: 'Integration & Mastery', description: `Integrate and master all aspects of ${goal}`, priority: 4, focus: 'advanced' }
      );
    } else {
      // Complex goals get comprehensive approach
      branches.push(
        { name: 'Strategic Foundation', description: `Build comprehensive foundation for ${goal}`, priority: 1, focus: 'theory' },
        { name: 'Core Competencies', description: `Develop core competencies for ${goal}`, priority: 2, focus: 'practice' },
        { name: 'Advanced Applications', description: `Explore advanced applications of ${goal}`, priority: 3, focus: 'hands-on' },
        { name: 'Systems Integration', description: `Integrate systems and approaches for ${goal}`, priority: 4, focus: 'integration' },
        { name: 'Expertise & Innovation', description: `Achieve expertise and drive innovation in ${goal}`, priority: 5, focus: 'mastery' }
      );
    }
    
    // Add focus areas as specialized branches
    focusAreas.forEach((area, index) => {
      branches.push({
        name: `${area.charAt(0).toUpperCase() + area.slice(1)} Specialization`,
        description: `Deep specialization in ${area} for ${goal}`,
        priority: branches.length + 1,
        focus: 'specialized',
        tasks: []
      });
    });
    
    return branches;
  }

  /**
   * Validate that generated branches make sense for the goal
   */
  validateBranches(branches, goal, domainArchetype) {
    const validation = {
      valid: true,
      issues: [],
      suggestions: []
    };
    
    // Check for reasonable number of branches (3-7 is optimal)
    if (branches.length < 2) {
      validation.issues.push('Too few branches - learning path may be too simplistic');
      validation.suggestions.push('Consider adding more granular learning phases');
    }
    
    if (branches.length > 8) {
      validation.issues.push('Too many branches - learning path may be overwhelming');
      validation.suggestions.push('Consider consolidating related branches');
    }
    
    // Check for logical progression
    const hasFoundation = branches.some(b => b.name.toLowerCase().includes('foundation') || b.priority === 1);
    if (!hasFoundation && branches.length > 2) {
      validation.issues.push('No clear foundation branch identified');
      validation.suggestions.push('Ensure first branch establishes foundational concepts');
    }
    
    // Check for domain alignment
    if (domainArchetype && !domainArchetype.fallbackToGeneric) {
      const branchNames = branches.map(b => b.name.toLowerCase()).join(' ');
      const archetypeKeywords = domainArchetype.pattern.join(' ').toLowerCase();
      
      // Simple keyword overlap check
      const overlapCount = archetypeKeywords.split(' ').filter(word => 
        branchNames.includes(word.substring(0, 4)) // Partial matching
      ).length;
      
      if (overlapCount < 2) {
        validation.issues.push('Branches may not align well with domain archetype');
        validation.suggestions.push('Review branch names for domain relevance');
      }
    }
    
    if (validation.issues.length > 0) {
      validation.valid = false;
    }
    
    return validation;
  }
}

export default AdaptiveBranchGenerator;
