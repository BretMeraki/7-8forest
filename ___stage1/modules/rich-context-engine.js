/**
 * Rich Context Engine - Advanced User Context for Intelligent Learning
 * 
 * Replaces the primitive energy_level/time_available system with comprehensive
 * multi-dimensional context analysis that adapts to user patterns, environment,
 * cognitive state, and learning progression.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class RichContextEngine {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data');
    this.contextHistory = new Map(); // projectId -> context timeline
    this.learningPatterns = new Map(); // projectId -> discovered patterns
    this.environmentBaseline = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadContextHistory();
      await this.loadLearningPatterns();
      this.initialized = true;
      console.error('[RichContext] Context engine initialized');
    } catch (error) {
      console.error('[RichContext] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Build comprehensive user context from multiple signals
   */
  async buildUserContext(args = {}) {
    const context = {
      timestamp: new Date().toISOString(),
      
      // === COGNITIVE STATE ===
      cognitive: this.analyzeCognitiveState(args),
      
      // === TEMPORAL CONTEXT ===
      temporal: this.analyzeTemporalContext(args),
      
      // === ENVIRONMENTAL CONTEXT ===
      environmental: this.analyzeEnvironmentalContext(args),
      
      // === LEARNING STATE ===
      learning: await this.analyzeLearningState(args),
      
      // === GOAL ALIGNMENT ===
      alignment: this.analyzeGoalAlignment(args),
      
      // === MOTIVATION & FLOW ===
      motivation: this.analyzeMotivationState(args),
      
      // === TECHNICAL ENVIRONMENT ===
      technical: this.analyzeTechnicalContext(args),
      
      // === SOCIAL CONTEXT ===
      social: this.analyzeSocialContext(args)
    };

    // Calculate composite scores
    context.composite = this.calculateCompositeScores(context);
    
    return context;
  }

  /**
   * Analyze cognitive readiness and capacity
   */
  analyzeCognitiveState(args) {
    const cognitive = {
      // Traditional energy level enhanced
      energy_level: args.energy_level || 3,
      
      // Mental clarity (1-5)
      mental_clarity: this.inferMentalClarity(args),
      
      // Focus capacity (deep work vs scattered attention)
      focus_capacity: this.inferFocusCapacity(args),
      
      // Cognitive load (how much mental overhead user is dealing with)
      cognitive_load: this.inferCognitiveLoad(args),
      
      // Decision fatigue level
      decision_fatigue: this.inferDecisionFatigue(args),
      
      // Processing preference (visual, auditory, kinesthetic, analytical)
      processing_preference: this.inferProcessingPreference(args),
      
      // Stress level indicators
      stress_level: this.inferStressLevel(args)
    };

    return cognitive;
  }

  /**
   * Analyze temporal context and time patterns
   */
  analyzeTemporalContext(args) {
    const now = new Date();
    const temporal = {
      // Enhanced time availability
      time_available: args.time_available || '30 minutes',
      time_available_minutes: this.parseTimeToMinutes(args.time_available || '30 minutes'),
      
      // Time of day patterns
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      
      // Chronotype (morning, afternoon, evening person)
      chronotype_alignment: this.inferChronotype(now.getHours(), args),
      
      // Deadline pressure
      deadline_pressure: this.inferDeadlinePressure(args),
      
      // Time since last session
      time_since_last_session: this.calculateTimeSinceLastSession(args.project_id),
      
      // Session frequency pattern
      session_frequency_pattern: this.analyzeSessionFrequency(args.project_id),
      
      // Optimal task duration for current state
      optimal_task_duration: this.calculateOptimalDuration(args),
      
      // Buffer time needed (for context switching, etc.)
      buffer_time_needed: this.calculateBufferTime(args)
    };

    return temporal;
  }

  /**
   * Analyze physical and environmental context
   */
  analyzeEnvironmentalContext(args) {
    const environmental = {
      // Location type (home, office, coffee shop, library, etc.)
      location_type: args.location_type || this.inferLocationType(args),
      
      // Device being used (laptop, desktop, mobile, tablet)
      device_type: args.device_type || this.inferDeviceType(),
      
      // Noise level and distractions
      distraction_level: this.inferDistractionLevel(args),
      
      // Internet connectivity quality
      connectivity_quality: args.connectivity_quality || 'good',
      
      // Available resources (books, second monitor, whiteboard, etc.)
      available_resources: args.available_resources || [],
      
      // Privacy level (can take calls, need quiet, etc.)
      privacy_level: args.privacy_level || this.inferPrivacyLevel(args),
      
      // Comfort level (ergonomics, temperature, lighting)
      comfort_level: this.inferComfortLevel(args),
      
      // Collaboration availability (others around, can ask questions)
      collaboration_availability: this.inferCollaborationAvailability(args)
    };

    return environmental;
  }

  /**
   * Analyze current learning state and progress
   */
  async analyzeLearningState(args) {
    const projectId = args.project_id;
    if (!projectId) return this.getDefaultLearningState();

    const learning = {
      // Current skill level in the domain
      current_skill_level: await this.assessCurrentSkillLevel(projectId),
      
      // Learning velocity (how fast progressing)
      learning_velocity: await this.calculateLearningVelocity(projectId),
      
      // Knowledge retention rate
      retention_rate: await this.assessRetentionRate(projectId),
      
      // Confidence level in current domain
      confidence_level: await this.assessConfidenceLevel(projectId),
      
      // Recent learning patterns
      recent_patterns: await this.analyzeRecentLearningPatterns(projectId),
      
      // Struggle areas (where user gets stuck)
      struggle_areas: await this.identifyStruggleAreas(projectId),
      
      // Breakthrough momentum (recent successes)
      breakthrough_momentum: await this.assessBreakthroughMomentum(projectId),
      
      // Learning style effectiveness
      style_effectiveness: await this.assessStyleEffectiveness(projectId),
      
      // Knowledge gaps that are blocking progress
      blocking_gaps: await this.identifyBlockingGaps(projectId),
      
      // Readiness for advanced concepts
      advancement_readiness: await this.assessAdvancementReadiness(projectId)
    };

    return learning;
  }

  /**
   * Analyze goal alignment and priority shifts
   */
  analyzeGoalAlignment(args) {
    const alignment = {
      // How aligned is user with original goal (goal drift detection)
      goal_alignment_score: this.assessGoalAlignment(args),
      
      // Priority shifts (career, personal, urgent needs)
      priority_shifts: this.detectPriorityShifts(args),
      
      // External pressures affecting goals
      external_pressures: this.identifyExternalPressures(args),
      
      // Goal clarity (how well-defined is what they want)
      goal_clarity: this.assessGoalClarity(args),
      
      // Value alignment (intrinsic vs extrinsic motivation)
      value_alignment: this.assessValueAlignment(args),
      
      // Long-term vs short-term focus
      time_horizon_focus: this.assessTimeHorizonFocus(args)
    };

    return alignment;
  }

  /**
   * Analyze motivation and flow state potential
   */
  analyzeMotivationState(args) {
    const motivation = {
      // Intrinsic motivation level
      intrinsic_motivation: this.assessIntrinsicMotivation(args),
      
      // Flow state potential (likelihood of entering flow)
      flow_potential: this.assessFlowPotential(args),
      
      // Challenge-skill balance
      challenge_skill_balance: this.assessChallengeSkillBalance(args),
      
      // Progress satisfaction (feeling of advancement)
      progress_satisfaction: this.assessProgressSatisfaction(args),
      
      // Autonomy level (feeling of control)
      autonomy_level: this.assessAutonomyLevel(args),
      
      // Curiosity state (how eager to learn new things)
      curiosity_state: this.assessCuriosityState(args),
      
      // Frustration tolerance (ability to persist through difficulty)
      frustration_tolerance: this.assessFrustrationTolerance(args),
      
      // Achievement momentum (recent wins building confidence)
      achievement_momentum: this.assessAchievementMomentum(args)
    };

    return motivation;
  }

  /**
   * Analyze technical environment and constraints
   */
  analyzeTechnicalContext(args) {
    const technical = {
      // Available development environment
      dev_environment: args.dev_environment || this.inferDevEnvironment(),
      
      // Required vs available tools
      tool_availability: this.assessToolAvailability(args),
      
      // Technical setup time needed
      setup_overhead: this.calculateSetupOverhead(args),
      
      // Platform constraints (Windows, Mac, Linux specific tasks)
      platform_constraints: this.assessPlatformConstraints(),
      
      // Network dependencies (can work offline)
      network_dependencies: this.assessNetworkDependencies(args),
      
      // Screen real estate (multi-monitor, small screen, etc.)
      screen_real_estate: this.assessScreenRealEstate(args),
      
      // Input method efficiency (keyboard shortcuts, mouse, touch)
      input_efficiency: this.assessInputEfficiency(args)
    };

    return technical;
  }

  /**
   * Analyze social context and collaboration needs
   */
  analyzeSocialContext(args) {
    const social = {
      // Collaboration mode (solo, pair, team, mentor available)
      collaboration_mode: args.collaboration_mode || 'solo',
      
      // Social energy level (introverted/extroverted state)
      social_energy: this.assessSocialEnergy(args),
      
      // Peer availability (for questions, code review, discussion)
      peer_availability: this.assessPeerAvailability(args),
      
      // Mentor/expert access
      expert_access: this.assessExpertAccess(args),
      
      // Community engagement level
      community_engagement: this.assessCommunityEngagement(args),
      
      // Teaching opportunities (explaining to others)
      teaching_opportunities: this.assessTeachingOpportunities(args),
      
      // Social accountability (deadlines, commitments to others)
      social_accountability: this.assessSocialAccountability(args)
    };

    return social;
  }

  /**
   * Calculate composite scores for decision making
   */
  calculateCompositeScores(context) {
    return {
      // Overall readiness for deep work
      deep_work_readiness: this.calculateDeepWorkReadiness(context),
      
      // Optimal task complexity for current state
      optimal_complexity: this.calculateOptimalComplexity(context),
      
      // Learning mode recommendation (explore, practice, review, create)
      recommended_mode: this.recommendLearningMode(context),
      
      // Ideal task characteristics
      ideal_task_profile: this.calculateIdealTaskProfile(context),
      
      // Risk factors that might derail learning
      risk_factors: this.identifyRiskFactors(context),
      
      // Success probability for different task types
      success_probability: this.calculateSuccessProbability(context)
    };
  }

  // === INFERENCE METHODS ===
  
  inferMentalClarity(args) {
    // Analyze context clues for mental clarity
    let clarity = 3; // baseline
    
    if (args.context_from_memory) {
      const context = args.context_from_memory.toLowerCase();
      if (context.includes('confused') || context.includes('overwhelmed')) clarity -= 1;
      if (context.includes('clear') || context.includes('focused')) clarity += 1;
    }
    
    // Time of day adjustments
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) clarity += 0.5; // morning clarity boost
    if (hour >= 14 && hour <= 16) clarity -= 0.5; // afternoon dip
    
    return Math.max(1, Math.min(5, Math.round(clarity)));
  }

  inferFocusCapacity(args) {
    const timeAvailable = this.parseTimeToMinutes(args.time_available || '30 minutes');
    let capacity = 3;
    
    // Longer time blocks suggest deeper focus capability
    if (timeAvailable >= 120) capacity += 1;
    if (timeAvailable <= 15) capacity -= 1;
    
    // Energy level correlation
    const energy = args.energy_level || 3;
    capacity += (energy - 3) * 0.5;
    
    return Math.max(1, Math.min(5, Math.round(capacity)));
  }

  inferCognitiveLoad(args) {
    let load = 2; // baseline low-medium load
    
    // Infer from context
    if (args.context_from_memory) {
      const context = args.context_from_memory.toLowerCase();
      if (context.includes('multiple') || context.includes('juggling')) load += 1;
      if (context.includes('deadline') || context.includes('pressure')) load += 1;
      if (context.includes('simple') || context.includes('one thing')) load -= 1;
    }
    
    // Time pressure increases cognitive load
    const timeMinutes = this.parseTimeToMinutes(args.time_available || '30 minutes');
    if (timeMinutes <= 15) load += 1;
    
    return Math.max(1, Math.min(5, load));
  }

  calculateDeepWorkReadiness(context) {
    const factors = [
      context.cognitive.mental_clarity * 0.25,
      context.cognitive.focus_capacity * 0.25,
      (6 - context.cognitive.cognitive_load) * 0.2, // inverse
      (6 - context.environmental.distraction_level) * 0.15, // inverse
      context.temporal.optimal_task_duration > 45 ? 1 : 0.5 * 0.15
    ];
    
    return Math.max(1, Math.min(5, factors.reduce((sum, f) => sum + f, 0)));
  }

  calculateOptimalComplexity(context) {
    let complexity = context.cognitive.energy_level;
    
    // Adjust based on cognitive state
    complexity += (context.cognitive.mental_clarity - 3) * 0.5;
    complexity -= (context.cognitive.cognitive_load - 3) * 0.3;
    
    // Adjust based on learning state
    if (context.learning.confidence_level > 3) complexity += 0.5;
    if (context.learning.struggle_areas.length > 2) complexity -= 0.5;
    
    // Adjust based on temporal context
    if (context.temporal.time_available_minutes < 30) complexity -= 1;
    if (context.temporal.time_available_minutes > 90) complexity += 0.5;
    
    return Math.max(1, Math.min(5, Math.round(complexity)));
  }

  recommendLearningMode(context) {
    const modes = [];
    
    // Deep work conditions favor exploration and creation
    if (context.composite.deep_work_readiness >= 4) {
      modes.push({ mode: 'explore', weight: 0.4 });
      modes.push({ mode: 'create', weight: 0.3 });
    }
    
    // High energy and good focus favor practice
    if (context.cognitive.energy_level >= 4 && context.cognitive.focus_capacity >= 4) {
      modes.push({ mode: 'practice', weight: 0.4 });
    }
    
    // Low energy or high cognitive load favor review
    if (context.cognitive.energy_level <= 2 || context.cognitive.cognitive_load >= 4) {
      modes.push({ mode: 'review', weight: 0.5 });
    }
    
    // Recent struggles suggest need for reinforcement
    if (context.learning.struggle_areas.length > 1) {
      modes.push({ mode: 'practice', weight: 0.3 });
      modes.push({ mode: 'review', weight: 0.3 });
    }
    
    // Default to balanced approach
    if (modes.length === 0) {
      return 'mixed';
    }
    
    // Return highest weighted mode
    return modes.sort((a, b) => b.weight - a.weight)[0].mode;
  }

  // === UTILITY METHODS ===

  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30;
    
    const timeStr_lower = timeStr.toLowerCase();
    const minuteMatch = timeStr_lower.match(/(\d+)\s*min/);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStr_lower.match(/(\d+)\s*hour/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const numberMatch = timeStr_lower.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30;
  }

  getDefaultLearningState() {
    return {
      current_skill_level: 2,
      learning_velocity: 'moderate',
      retention_rate: 0.7,
      confidence_level: 3,
      recent_patterns: [],
      struggle_areas: [],
      breakthrough_momentum: 'stable',
      style_effectiveness: 'unknown',
      blocking_gaps: [],
      advancement_readiness: 3
    };
  }

  // Placeholder implementations for complex analysis methods
  // These would be implemented with actual historical data analysis

  async assessCurrentSkillLevel(projectId) { return 3; }
  async calculateLearningVelocity(projectId) { return 'moderate'; }
  async assessRetentionRate(projectId) { return 0.7; }
  async assessConfidenceLevel(projectId) { return 3; }
  async analyzeRecentLearningPatterns(projectId) { return []; }
  async identifyStruggleAreas(projectId) { return []; }
  async assessBreakthroughMomentum(projectId) { return 'stable'; }
  async assessStyleEffectiveness(projectId) { return 'effective'; }
  async identifyBlockingGaps(projectId) { return []; }
  async assessAdvancementReadiness(projectId) { return 3; }

  inferDecisionFatigue(args) { return 2; }
  inferProcessingPreference(args) { return 'mixed'; }
  inferStressLevel(args) { return 2; }
  inferChronotype(hour, args) { return hour >= 6 && hour <= 10 ? 'high' : 'medium'; }
  inferDeadlinePressure(args) { return 'low'; }
  calculateTimeSinceLastSession(projectId) { return '1 day'; }
  analyzeSessionFrequency(projectId) { return 'regular'; }
  calculateOptimalDuration(args) { return 30; }
  calculateBufferTime(args) { return 5; }
  inferLocationType(args) { return 'home'; }
  inferDeviceType() { return 'laptop'; }
  inferDistractionLevel(args) { return 2; }
  inferPrivacyLevel(args) { return 'high'; }
  inferComfortLevel(args) { return 4; }
  inferCollaborationAvailability(args) { return 'limited'; }

  // === PERSISTENCE METHODS ===

  async loadContextHistory() {
    try {
      const historyPath = path.join(this.dataDir, 'context-history.json');
      const content = await fs.readFile(historyPath, 'utf8');
      const data = JSON.parse(content);
      this.contextHistory = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[RichContext] Failed to load context history:', error.message);
      }
    }
  }

  async loadLearningPatterns() {
    try {
      const patternsPath = path.join(this.dataDir, 'learning-patterns.json');
      const content = await fs.readFile(patternsPath, 'utf8');
      const data = JSON.parse(content);
      this.learningPatterns = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[RichContext] Failed to load learning patterns:', error.message);
      }
    }
  }

  async saveContextHistory() {
    try {
      const historyPath = path.join(this.dataDir, 'context-history.json');
      const data = Object.fromEntries(this.contextHistory);
      await fs.writeFile(historyPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('[RichContext] Failed to save context history:', error.message);
    }
  }

  async recordContextEvent(projectId, contextData, outcome) {
    if (!this.contextHistory.has(projectId)) {
      this.contextHistory.set(projectId, []);
    }
    
    const history = this.contextHistory.get(projectId);
    history.push({
      timestamp: new Date().toISOString(),
      context: contextData,
      outcome: outcome
    });
    
    // Keep only last 100 entries per project
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await this.saveContextHistory();
  }

  // Additional stub methods for comprehensive context analysis
  assessGoalAlignment(args) { return 4; }
  detectPriorityShifts(args) { return []; }
  identifyExternalPressures(args) { return []; }
  assessGoalClarity(args) { return 4; }
  assessValueAlignment(args) { return 4; }
  assessTimeHorizonFocus(args) { return 'balanced'; }
  assessIntrinsicMotivation(args) { return 4; }
  assessFlowPotential(args) { return 3; }
  assessChallengeSkillBalance(args) { return 3; }
  assessProgressSatisfaction(args) { return 3; }
  assessAutonomyLevel(args) { return 4; }
  assessCuriosityState(args) { return 4; }
  assessFrustrationTolerance(args) { return 3; }
  assessAchievementMomentum(args) { return 3; }
  inferDevEnvironment() { return 'vscode'; }
  assessToolAvailability(args) { return 'full'; }
  calculateSetupOverhead(args) { return 5; }
  assessPlatformConstraints() { return []; }
  assessNetworkDependencies(args) { return 'low'; }
  assessScreenRealEstate(args) { return 'adequate'; }
  assessInputEfficiency(args) { return 'high'; }
  assessSocialEnergy(args) { return 3; }
  assessPeerAvailability(args) { return 'limited'; }
  assessExpertAccess(args) { return 'online'; }
  assessCommunityEngagement(args) { return 'medium'; }
  assessTeachingOpportunities(args) { return 'none'; }
  assessSocialAccountability(args) { return 'self'; }
  calculateIdealTaskProfile(context) { 
    return {
      duration: context.temporal.optimal_task_duration,
      complexity: context.composite.optimal_complexity,
      mode: context.composite.recommended_mode,
      social: context.social.collaboration_mode
    };
  }
  identifyRiskFactors(context) { return []; }
  calculateSuccessProbability(context) { return 0.8; }
}

export default RichContextEngine;
