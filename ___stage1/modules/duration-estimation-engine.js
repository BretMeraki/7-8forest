/**
 * Duration Estimation Engine
 * 
 * Calculates realistic, evidence-based task durations that feel authentic
 * and manageable to users, based on task characteristics, complexity,
 * learning style, and cognitive load factors.
 */

export class DurationEstimationEngine {
  constructor() {
    // Base time estimates for fundamental learning operations (in minutes)
    this.baseTimes = {
      // Reading and comprehension
      read_documentation: 2, // per page/section
      understand_concept: 5, // per new concept
      connect_ideas: 3, // relating new to existing knowledge
      
      // Hands-on activities
      create_file: 1,
      write_code: 3, // per meaningful line/block
      test_functionality: 2,
      debug_simple_issue: 5,
      setup_environment: 8,
      
      // Cognitive processing
      absorb_new_syntax: 4,
      practice_pattern: 6,
      build_mental_model: 8,
      troubleshoot_error: 7,
      
      // Validation and verification
      check_output: 1,
      verify_understanding: 3,
      confirm_success: 2
    };

    // Complexity multipliers based on task characteristics
    this.complexityMultipliers = {
      trivial: 0.7,    // Very simple, almost automatic
      simple: 0.85,    // Straightforward, single step
      moderate: 1.0,   // Standard complexity
      complex: 1.3,    // Multiple steps, some thinking required
      challenging: 1.7, // Requires problem solving
      expert: 2.2      // Deep thinking, potential roadblocks
    };

    // Learning style adjustments
    this.learningStyleMultipliers = {
      'hands-on': {
        creation: 0.9,     // Faster at doing
        reading: 1.2,      // Slower at pure reading
        conceptual: 1.1    // Need to see it in action
      },
      'reading': {
        creation: 1.2,     // Slower at doing
        reading: 0.8,      // Faster at reading
        conceptual: 0.9    // Good at abstract thinking
      },
      'visual': {
        creation: 1.0,
        reading: 1.1,
        conceptual: 0.9    // Better with diagrams/examples
      },
      'mixed': {
        creation: 1.0,
        reading: 1.0,
        conceptual: 1.0
      }
    };

    // First-time vs. practice multipliers
    this.experienceMultipliers = {
      first_time: 1.4,      // Learning something new takes longer
      second_time: 1.1,     // Still consolidating
      practiced: 0.9,       // Getting comfortable
      familiar: 0.7         // Quick execution
    };

    // Context switching and setup overhead
    this.overheadTimes = {
      context_switch: 2,    // Time to refocus on new topic
      tool_setup: 3,        // Opening IDE, browser, etc.
      mental_preparation: 1, // Getting in the right mindset
      validation_buffer: 2   // Time to check your work
    };
  }

  /**
   * Calculate realistic duration for a task based on multiple factors
   */
  calculateTaskDuration(task, userContext = {}) {
    const taskType = this.inferTaskType(task);
    const complexity = this.assessTaskComplexity(task);
    const cognitiveLoad = this.calculateCognitiveLoad(task, userContext);
    
    // Base time calculation
    let baseTime = this.getBaseTimeForTask(task, taskType);
    
    // Apply complexity multiplier
    baseTime *= this.complexityMultipliers[complexity];
    
    // Apply learning style multiplier
    const learningStyle = userContext.learningStyle || 'mixed';
    const activityType = this.getActivityType(task);
    const styleMultiplier = this.learningStyleMultipliers[learningStyle]?.[activityType] || 1.0;
    baseTime *= styleMultiplier;
    
    // Apply experience multiplier
    const experience = this.inferExperienceLevel(task, userContext);
    baseTime *= this.experienceMultipliers[experience];
    
    // Add overhead based on cognitive load
    const overhead = this.calculateOverhead(cognitiveLoad, taskType);
    baseTime += overhead;
    
    // Apply realistic variance (tasks rarely take exactly the estimated time)
    const variance = this.calculateRealisticVariance(baseTime, complexity);
    baseTime += variance;
    
    // Round to realistic increments (people don't work in exact minutes)
    const finalDuration = this.roundToRealisticIncrement(baseTime);
    
    return {
      estimated_minutes: finalDuration,
      confidence_level: this.calculateConfidence(task, userContext),
      factors_considered: this.getFactorsConsidered(complexity, experience, learningStyle),
      time_breakdown: this.getTimeBreakdown(task, baseTime, overhead, variance)
    };
  }

  /**
   * Infer the type of task from its properties
   */
  inferTaskType(task) {
    const title = (task.title || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    const action = (task.action || '').toLowerCase();
    const text = `${title} ${description} ${action}`;

    if (text.includes('create') || text.includes('build') || text.includes('write')) {
      return 'creation';
    }
    if (text.includes('understand') || text.includes('learn') || text.includes('study')) {
      return 'learning';
    }
    if (text.includes('practice') || text.includes('exercise') || text.includes('try')) {
      return 'practice';
    }
    if (text.includes('debug') || text.includes('fix') || text.includes('troubleshoot')) {
      return 'debugging';
    }
    if (text.includes('test') || text.includes('verify') || text.includes('check')) {
      return 'verification';
    }
    
    return 'general';
  }

  /**
   * Assess the complexity of a task
   */
  assessTaskComplexity(task) {
    const title = (task.title || '').toLowerCase();
    const action = (task.action || '').toLowerCase();
    const difficulty = task.difficulty || 3;
    
    // Simple patterns
    if (title.includes('create your first') || action.includes('create a new file')) {
      return 'simple';
    }
    if (title.includes('add') || title.includes('write') && action.length < 50) {
      return 'simple';
    }
    
    // Complex patterns
    if (title.includes('understand') || title.includes('connect') || title.includes('integrate')) {
      return 'moderate';
    }
    if (title.includes('debug') || title.includes('troubleshoot') || title.includes('solve')) {
      return 'complex';
    }
    if (title.includes('advanced') || title.includes('optimize') || title.includes('architect')) {
      return 'challenging';
    }
    
    // Use difficulty as fallback
    if (difficulty <= 1) return 'trivial';
    if (difficulty <= 2) return 'simple';
    if (difficulty <= 3) return 'moderate';
    if (difficulty <= 4) return 'complex';
    return 'challenging';
  }

  /**
   * Calculate cognitive load based on task and user context
   */
  calculateCognitiveLoad(task, userContext) {
    let load = 1.0; // baseline
    
    // Prerequisites increase cognitive load
    const prereqCount = (task.prerequisites || []).length;
    load += prereqCount * 0.2;
    
    // New concepts increase load
    if (task.title && task.title.toLowerCase().includes('first')) {
      load += 0.3;
    }
    
    // User's current state affects load
    const energyLevel = userContext.energy_level || 3;
    if (energyLevel <= 2) load += 0.4; // Low energy = higher cognitive load
    if (energyLevel >= 4) load -= 0.2; // High energy = lower cognitive load
    
    return Math.max(0.5, Math.min(2.0, load));
  }

  /**
   * Get base time for a task based on its characteristics
   */
  getBaseTimeForTask(task, taskType) {
    const action = (task.action || '').toLowerCase();
    
    // Specific action patterns
    if (action.includes('create a new file')) {
      return this.baseTimes.create_file + this.baseTimes.understand_concept;
    }
    if (action.includes('type') && action.includes('doctype')) {
      return this.baseTimes.write_code + this.baseTimes.check_output;
    }
    if (action.includes('add') && action.includes('element')) {
      return this.baseTimes.write_code * 2 + this.baseTimes.test_functionality;
    }
    if (action.includes('create') && action.includes('with')) {
      return this.baseTimes.write_code * 3 + this.baseTimes.understand_concept;
    }
    if (action.includes('link') || action.includes('connect')) {
      return this.baseTimes.setup_environment + this.baseTimes.test_functionality;
    }
    
    // Task type defaults
    switch (taskType) {
      case 'creation':
        return this.baseTimes.write_code * 2 + this.baseTimes.test_functionality;
      case 'learning':
        return this.baseTimes.understand_concept + this.baseTimes.build_mental_model;
      case 'practice':
        return this.baseTimes.practice_pattern + this.baseTimes.verify_understanding;
      case 'debugging':
        return this.baseTimes.debug_simple_issue + this.baseTimes.test_functionality;
      case 'verification':
        return this.baseTimes.check_output + this.baseTimes.confirm_success;
      default:
        return this.baseTimes.understand_concept + this.baseTimes.practice_pattern;
    }
  }

  /**
   * Get the primary activity type for learning style adjustments
   */
  getActivityType(task) {
    const action = (task.action || '').toLowerCase();
    
    if (action.includes('create') || action.includes('build') || action.includes('write') || action.includes('add')) {
      return 'creation';
    }
    if (action.includes('read') || action.includes('study') || action.includes('understand')) {
      return 'reading';
    }
    return 'conceptual';
  }

  /**
   * Infer user's experience level with this type of task
   */
  inferExperienceLevel(task, userContext) {
    const title = (task.title || '').toLowerCase();
    
    // Look for first-time indicators
    if (title.includes('first') || title.includes('your first') || title.includes('introduction')) {
      return 'first_time';
    }
    if (title.includes('basic') || title.includes('fundamental')) {
      return 'first_time';
    }
    if (title.includes('advanced') || title.includes('complex')) {
      return 'practiced'; // They've gotten this far
    }
    
    // Check for practice indicators
    if (title.includes('practice') || title.includes('exercise')) {
      return 'second_time';
    }
    
    return 'first_time'; // Default to first time for conservative estimates
  }

  /**
   * Calculate overhead time for context switching and setup
   */
  calculateOverhead(cognitiveLoad, taskType) {
    let overhead = this.overheadTimes.mental_preparation;
    
    // Higher cognitive load means more setup time
    overhead += (cognitiveLoad - 1.0) * this.overheadTimes.context_switch;
    
    // Creation tasks need more setup
    if (taskType === 'creation') {
      overhead += this.overheadTimes.tool_setup * 0.5;
    }
    
    // Always add validation buffer
    overhead += this.overheadTimes.validation_buffer;
    
    return Math.max(1, overhead);
  }

  /**
   * Add realistic variance - tasks rarely take exactly the estimated time
   */
  calculateRealisticVariance(baseTime, complexity) {
    const varianceFactors = {
      trivial: 0.1,
      simple: 0.15,
      moderate: 0.2,
      complex: 0.3,
      challenging: 0.4,
      expert: 0.5
    };
    
    const varianceFactor = varianceFactors[complexity] || 0.2;
    return baseTime * varianceFactor * 0.5; // Add half the variance as buffer
  }

  /**
   * Round to realistic time increments (people think in 5-minute blocks)
   */
  roundToRealisticIncrement(minutes) {
    if (minutes <= 3) return 3;
    if (minutes <= 5) return 5;
    if (minutes <= 8) return 8;
    if (minutes <= 12) return 10;
    if (minutes <= 18) return 15;
    if (minutes <= 25) return 20;
    if (minutes <= 35) return 30;
    if (minutes <= 50) return 45;
    if (minutes <= 70) return 60;
    if (minutes <= 95) return 90;
    
    // For longer tasks, round to 15-minute increments
    return Math.ceil(minutes / 15) * 15;
  }

  /**
   * Calculate confidence level in the estimate
   */
  calculateConfidence(task, userContext) {
    let confidence = 0.8; // Base confidence
    
    // More specific actions = higher confidence
    if (task.action && task.action.length > 30) {
      confidence += 0.1;
    }
    
    // Clear validation criteria = higher confidence
    if (task.validation && task.validation.length > 20) {
      confidence += 0.1;
    }
    
    // First-time tasks are less predictable
    if (task.title && task.title.toLowerCase().includes('first')) {
      confidence -= 0.2;
    }
    
    return Math.max(0.5, Math.min(1.0, confidence));
  }

  /**
   * Get human-readable factors that influenced the estimate
   */
  getFactorsConsidered(complexity, experience, learningStyle) {
    const factors = [];
    
    factors.push(`${complexity} complexity`);
    factors.push(`${experience.replace('_', ' ')} experience`);
    factors.push(`${learningStyle} learning style`);
    
    return factors;
  }

  /**
   * Provide breakdown of time allocation
   */
  getTimeBreakdown(task, baseTime, overhead, variance) {
    return {
      core_work: Math.round(baseTime),
      setup_overhead: Math.round(overhead),
      buffer_time: Math.round(variance),
      total: Math.round(baseTime + overhead + variance)
    };
  }

  /**
   * Format duration for display to users
   */
  formatDuration(durationData) {
    const minutes = durationData.estimated_minutes;
    const confidence = durationData.confidence_level;
    
    let timeString;
    if (minutes < 60) {
      timeString = `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        timeString = `${hours}h ${remainingMinutes}m`;
      }
    }
    
    // Add confidence indicator
    const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
    
    return {
      display: `${timeString} (estimated)`,
      confidence_display: `${Math.round(confidence * 100)}% confidence`,
      factors_display: durationData.factors_considered.join(', ')
    };
  }
}

export default DurationEstimationEngine;
