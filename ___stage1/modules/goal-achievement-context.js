/**
 * Goal Achievement Context Engine
 * 
 * Laser-focused on one purpose: helping users achieve their goals, dreams, and aspirations.
 * Only tracks behavioral signals and context that directly impact goal achievement velocity.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class GoalAchievementContext {
  constructor(dataDir, llmInterface = null) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data');
    this.llmInterface = llmInterface;
    this.achievementPatterns = new Map(); // projectId -> goal achievement patterns
    this.goalProgressHistory = new Map(); // projectId -> progress milestones
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadAchievementPatterns();
      await this.loadGoalProgressHistory();
      this.initialized = true;
      console.error('[GoalAchievement] Goal achievement context engine initialized');
    } catch (error) {
      console.error('[GoalAchievement] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Build context focused entirely on goal achievement potential
   */
  async buildGoalAchievementContext(args = {}) {
    const projectId = args.project_id;
    const goalData = await this.getGoalData(projectId);
    
    const context = {
      timestamp: new Date().toISOString(),
      
      // === GOAL MOMENTUM ===
      momentum: await this.analyzeGoalMomentum(projectId, args),
      
      // === ACHIEVEMENT READINESS ===
      readiness: await this.analyzeAchievementReadiness(projectId, args),
      
      // === GOAL ALIGNMENT ===
      alignment: await this.analyzeGoalAlignment(projectId, args, goalData),
      
      // === BREAKTHROUGH POTENTIAL ===
      breakthrough: await this.analyzeBreakthroughPotential(projectId, args),
      
      // === DREAM FULFILLMENT STATE ===
      fulfillment: await this.analyzeDreamFulfillmentState(projectId, args, goalData)
    };

    // Generate goal-focused recommendations
    context.recommendations = await this.generateGoalAchievementRecommendations(context, goalData);
    
    // Record for goal achievement pattern learning
    await this.recordGoalProgressEvent(projectId, context, args);
    
    return context;
  }

  /**
   * Analyze current momentum toward goal achievement
   */
  async analyzeGoalMomentum(projectId, args) {
    const recentProgress = await this.getRecentProgressSignals(projectId);
    const progressVelocity = this.calculateProgressVelocity(recentProgress);
    const consistencyPattern = this.analyzeConsistencyPattern(recentProgress);
    
    return {
      // How fast are they moving toward their goal?
      velocity: {
        current_rate: progressVelocity.current,
        trend: progressVelocity.trend,
        acceleration: progressVelocity.acceleration,
        evidence: progressVelocity.evidence
      },
      
      // How consistently are they showing up for their goal?
      consistency: {
        pattern: consistencyPattern.assessment,
        streak: consistencyPattern.current_streak,
        reliability_score: consistencyPattern.reliability,
        evidence: consistencyPattern.evidence
      },
      
      // Are they building on previous achievements?
      compound_growth: {
        building_on_previous: this.analyzeBuildingPattern(recentProgress),
        skill_stacking: this.analyzeSkillStacking(recentProgress),
        momentum_breaks: this.identifyMomentumBreaks(recentProgress)
      }
    };
  }

  /**
   * Analyze readiness for meaningful goal progress right now
   */
  async analyzeAchievementReadiness(projectId, args) {
    const currentState = await this.assessCurrentState(projectId, args);
    const optimalConditions = await this.getOptimalConditions(projectId);
    
    return {
      // Can they make meaningful progress right now?
      immediate_potential: {
        can_advance_goal: this.assessGoalAdvancementPotential(currentState, args),
        optimal_task_type: this.identifyOptimalTaskType(currentState, optimalConditions),
        breakthrough_readiness: this.assessBreakthroughReadiness(currentState, args)
      },
      
      // What's their capacity for goal-directed work?
      capacity: {
        focus_for_goal_work: this.assessGoalFocusCapacity(currentState, args),
        persistence_potential: this.assessPersistencePotential(currentState, args),
        creative_problem_solving: this.assessCreativePotential(currentState, args)
      },
      
      // What might block goal achievement right now?
      blockers: {
        immediate_obstacles: this.identifyImmediateObstacles(currentState, args),
        energy_misalignment: this.assessEnergyAlignment(currentState, args),
        goal_clarity_issues: this.assessGoalClarityIssues(currentState, args)
      }
    };
  }

  /**
   * Analyze alignment between current state and goal achievement
   */
  async analyzeGoalAlignment(projectId, args, goalData) {
    const currentContext = args.context_from_memory || '';
    const goalDirection = goalData?.goal || '';
    
    if (!this.llmInterface || !goalDirection) {
      return this.getDefaultAlignmentAssessment();
    }

    try {
      const alignmentPrompt = this.buildGoalAlignmentPrompt(currentContext, goalDirection, args);
      const assessment = await this.llmInterface.request({
        method: 'llm/completion',
        params: {
          prompt: alignmentPrompt,
          max_tokens: 400,
          temperature: 0.2,
          system: "You are a goal achievement specialist. Assess how well the user's current state aligns with achieving their specific goal. Focus only on goal achievement potential."
        }
      });

      return assessment;
    } catch (error) {
      console.warn('[GoalAchievement] LLM alignment assessment failed:', error.message);
      return this.getDefaultAlignmentAssessment();
    }
  }

  /**
   * Analyze potential for breakthrough moments
   */
  async analyzeBreakthroughPotential(projectId, args) {
    const recentProgress = await this.getRecentProgressSignals(projectId);
    const learningEdges = this.identifyLearningEdges(recentProgress);
    const readinessSignals = this.assessBreakthroughReadinessSignals(args);
    
    return {
      // Is this a moment for a significant leap forward?
      breakthrough_window: {
        conditions_aligned: this.assessBreakthroughConditions(readinessSignals),
        learning_edge_proximity: learningEdges.proximity_to_breakthrough,
        confidence_trajectory: this.analyzeConfidenceTrajectory(recentProgress)
      },
      
      // What type of breakthrough is most likely?
      breakthrough_type: {
        skill_mastery: learningEdges.skill_mastery_potential,
        conceptual_integration: learningEdges.integration_potential,
        application_breakthrough: learningEdges.application_potential
      }
    };
  }

  /**
   * Analyze dream fulfillment state and trajectory
   */
  async analyzeDreamFulfillmentState(projectId, args, goalData) {
    const progressHistory = this.goalProgressHistory.get(projectId) || [];
    const dreamAlignment = await this.assessDreamAlignment(projectId, goalData);
    
    return {
      // How close are they to their dream?
      proximity_to_dream: {
        progress_percentage: this.calculateDreamProgress(progressHistory, goalData),
        missing_capabilities: this.identifyMissingCapabilities(progressHistory, goalData),
        next_milestone: this.identifyNextMilestone(progressHistory, goalData)
      },
      
      // Is their current path optimal for dream achievement?
      path_optimization: {
        current_path_effectiveness: dreamAlignment.path_effectiveness,
        suggested_pivots: dreamAlignment.pivot_opportunities,
        acceleration_opportunities: dreamAlignment.acceleration_potential
      },
      
      // Dream fulfillment momentum
      fulfillment_momentum: {
        trajectory: this.analyzeFulfillmentTrajectory(progressHistory),
        emotional_alignment: this.assessEmotionalAlignment(args),
        intrinsic_motivation: this.assessIntrinsicDrive(args, goalData)
      }
    };
  }

  /**
   * Generate recommendations focused purely on goal achievement
   */
  async generateGoalAchievementRecommendations(context, goalData) {
    return {
      // What should they do right now to advance their goal?
      immediate_action: {
        optimal_task_type: this.recommendOptimalTaskType(context),
        duration: this.recommendGoalFocusedDuration(context),
        intensity: this.recommendOptimalIntensity(context),
        approach: this.recommendGoalApproach(context)
      },
      
      // How should they structure this session for maximum goal impact?
      session_design: {
        goal_connection: this.recommendGoalConnection(context, goalData),
        momentum_building: this.recommendMomentumBuilding(context),
        breakthrough_setup: this.recommendBreakthroughSetup(context)
      },
      
      // What patterns should they cultivate for sustained goal achievement?
      pattern_cultivation: {
        consistency_building: this.recommendConsistencyBuilding(context),
        skill_stacking: this.recommendSkillStacking(context),
        dream_alignment: this.recommendDreamAlignment(context, goalData)
      }
    };
  }

  // === GOAL-FOCUSED CALCULATION METHODS ===

  calculateProgressVelocity(recentProgress) {
    if (!recentProgress || recentProgress.length < 2) {
      return {
        current: 'unknown',
        trend: 'insufficient_data',
        acceleration: 'unknown',
        evidence: 'Need more progress data points'
      };
    }

    const progressScores = recentProgress.map(p => p.goal_advancement_score || 0);
    const recent = progressScores.slice(-5);
    const older = progressScores.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, score) => sum + score, 0) / older.length : recentAvg;
    
    const velocity = recentAvg;
    const acceleration = recentAvg - olderAvg;
    
    return {
      current: velocity > 0.7 ? 'high' : velocity > 0.4 ? 'moderate' : 'low',
      trend: acceleration > 0.1 ? 'accelerating' : acceleration < -0.1 ? 'decelerating' : 'stable',
      acceleration: acceleration,
      evidence: `Recent avg: ${recentAvg.toFixed(2)}, Previous avg: ${olderAvg.toFixed(2)}`
    };
  }

  analyzeConsistencyPattern(recentProgress) {
    if (!recentProgress || recentProgress.length === 0) {
      return {
        assessment: 'unknown',
        current_streak: 0,
        reliability: 0,
        evidence: 'No progress data available'
      };
    }

    const recentSessions = recentProgress.slice(-14); // Last 2 weeks
    const goalFocusedSessions = recentSessions.filter(session => session.goal_focused).length;
    const totalSessions = recentSessions.length;
    
    // Calculate current streak
    let currentStreak = 0;
    for (let i = recentSessions.length - 1; i >= 0; i--) {
      if (recentSessions[i].goal_focused) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    const reliability = totalSessions > 0 ? goalFocusedSessions / totalSessions : 0;
    
    return {
      assessment: reliability > 0.7 ? 'highly_consistent' : reliability > 0.4 ? 'moderately_consistent' : 'inconsistent',
      current_streak: currentStreak,
      reliability: reliability,
      evidence: `${goalFocusedSessions}/${totalSessions} recent sessions were goal-focused`
    };
  }

  assessGoalAdvancementPotential(currentState, args) {
    // Assess based on explicit signals and context
    const explicitEnergy = args.energy_level;
    const timeAvailable = args.time_available;
    const contextSignals = args.context_from_memory || '';
    
    // Look for advancement-indicating signals
    const advancementSignals = [
      explicitEnergy && explicitEnergy >= 3,
      timeAvailable && this.parseTimeToMinutes(timeAvailable) >= 25,
      contextSignals.toLowerCase().includes('ready') || contextSignals.toLowerCase().includes('motivated'),
      !contextSignals.toLowerCase().includes('stuck') && !contextSignals.toLowerCase().includes('confused')
    ].filter(Boolean).length;
    
    const potential = advancementSignals >= 3 ? 'high' : advancementSignals >= 2 ? 'moderate' : 'low';
    
    return {
      potential: potential,
      signals: advancementSignals,
      reasoning: `${advancementSignals}/4 advancement signals present`,
      can_make_progress: potential !== 'low'
    };
  }

  buildGoalAlignmentPrompt(currentContext, goalDirection, args) {
    return `Assess goal achievement alignment for this specific situation:

**User's Goal/Dream:**
${goalDirection}

**Current Context:**
${currentContext || 'No specific context provided'}

**Session Parameters:**
- Energy level: ${args.energy_level || 'not specified'}
- Time available: ${args.time_available || 'not specified'}
- Current time: ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}

**Assessment Focus:**
Analyze ONLY how well this current moment aligns with making meaningful progress toward their specific goal.

Respond in JSON format:
{
  "alignment_score": 0.8,
  "alignment_quality": "high/medium/low",
  "goal_advancement_potential": "high/medium/low", 
  "optimal_focus_area": "specific area most aligned with goal right now",
  "goal_connection_strategy": "how to connect current session to goal achievement",
  "momentum_opportunity": "specific way this session can build goal momentum",
  "dream_fulfillment_step": "how this session advances their dream"
}`;
  }

  // === UTILITY METHODS ===

  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30;
    
    const minuteMatch = timeStr.match(/(\d+)\s*min/i);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStr.match(/(\d+)\s*hour/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const numberMatch = timeStr.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30;
  }

  getDefaultAlignmentAssessment() {
    return {
      alignment_score: 0.5,
      alignment_quality: 'medium',
      goal_advancement_potential: 'medium',
      optimal_focus_area: 'foundational skills',
      goal_connection_strategy: 'focus on building core capabilities',
      momentum_opportunity: 'consistent small progress',
      dream_fulfillment_step: 'steady advancement'
    };
  }

  // === RECOMMENDATION METHODS ===

  recommendOptimalTaskType(context) {
    const momentum = context.momentum?.velocity?.current || 'moderate';
    const readiness = context.readiness?.immediate_potential?.can_advance_goal || false;
    const breakthrough = context.breakthrough?.breakthrough_window?.conditions_aligned || false;
    
    if (breakthrough && readiness) {
      return {
        type: 'breakthrough_attempt',
        reasoning: 'Conditions aligned for significant progress leap',
        characteristics: ['challenging', 'goal_directly_connected', 'high_impact']
      };
    }
    
    if (momentum === 'high' && readiness) {
      return {
        type: 'momentum_building',
        reasoning: 'High momentum - capitalize with substantial progress',
        characteristics: ['substantial', 'builds_on_recent_progress', 'goal_advancing']
      };
    }
    
    return {
      type: 'steady_progress',
      reasoning: 'Build consistent progress toward goal',
      characteristics: ['achievable', 'goal_connected', 'momentum_maintaining']
    };
  }

  recommendGoalFocusedDuration(context) {
    const potential = context.readiness?.immediate_potential?.can_advance_goal;
    const momentum = context.momentum?.velocity?.current;
    
    if (potential && momentum === 'high') {
      return {
        duration_minutes: 60,
        reasoning: 'High potential and momentum - extended goal-focused session',
        structure: 'deep_goal_work'
      };
    }
    
    if (potential) {
      return {
        duration_minutes: 45,
        reasoning: 'Good advancement potential - substantial goal work',
        structure: 'focused_goal_session'
      };
    }
    
    return {
      duration_minutes: 30,
      reasoning: 'Standard goal advancement session',
      structure: 'consistent_progress'
    };
  }

  recommendOptimalIntensity(context) {
    const breakthrough = context.breakthrough?.breakthrough_window?.conditions_aligned;
    const readiness = context.readiness?.capacity?.focus_for_goal_work;
    
    if (breakthrough && readiness) {
      return {
        intensity: 'high',
        reasoning: 'Breakthrough conditions - push for significant advancement',
        approach: 'challenge_driven'
      };
    }
    
    return {
      intensity: 'moderate',
      reasoning: 'Sustainable intensity for consistent goal progress',
      approach: 'steady_advancement'
    };
  }

  recommendGoalApproach(context) {
    const alignment = context.alignment?.optimal_focus_area || 'foundational skills';
    const momentum = context.momentum?.consistency?.pattern || 'unknown';
    
    return {
      approach: alignment,
      reasoning: `Focus on ${alignment} to maximize goal advancement`,
      connection_strategy: context.alignment?.goal_connection_strategy || 'build core capabilities',
      momentum_strategy: momentum === 'highly_consistent' ? 'accelerate' : 'establish_rhythm'
    };
  }

  // === PLACEHOLDER METHODS FOR GOAL DATA COLLECTION ===

  async getGoalData(projectId) {
    try {
      // Load from project configuration (assuming data persistence is available)
      const configPath = path.join(this.dataDir, projectId, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      return {
        goal: config.goal || 'No goal specified',
        dream_context: config.context || 'No context provided',
        domain: config.domain,
        focus_areas: config.focusAreas || [],
        learning_style: config.learningStyle || 'mixed'
      };
    } catch (error) {
      console.warn(`[GoalAchievement] Could not load goal data for project ${projectId}:`, error.message);
      return { 
        goal: 'Project goal not loaded', 
        dream_context: 'Unknown',
        domain: 'general',
        focus_areas: [],
        learning_style: 'mixed'
      };
    }
  }

  async getRecentProgressSignals(projectId) {
    // In real implementation, load actual progress data
    return [];
  }

  async assessCurrentState(projectId, args) {
    return {
      explicit_energy: args.energy_level,
      time_available: args.time_available,
      context: args.context_from_memory,
      goal_focused_recently: false // would be calculated from actual data
    };
  }

  async getOptimalConditions(projectId) {
    // In real implementation, learn from successful sessions
    return { optimal_time: 'morning', optimal_duration: 45, optimal_energy: 4 };
  }

  // Additional stub methods
  analyzeBuildingPattern(recentProgress) { return 'unknown'; }
  analyzeSkillStacking(recentProgress) { return 'unknown'; }
  identifyMomentumBreaks(recentProgress) { return []; }
  identifyOptimalTaskType(currentState, optimalConditions) { return 'steady_progress'; }
  assessBreakthroughReadiness(currentState, args) { return false; }
  assessGoalFocusCapacity(currentState, args) { return 'moderate'; }
  assessPersistencePotential(currentState, args) { return 'moderate'; }
  assessCreativePotential(currentState, args) { return 'moderate'; }
  identifyImmediateObstacles(currentState, args) { return []; }
  assessEnergyAlignment(currentState, args) { return 'aligned'; }
  assessGoalClarityIssues(currentState, args) { return []; }
  identifyLearningEdges(recentProgress) { return { proximity_to_breakthrough: 'unknown' }; }
  assessBreakthroughReadinessSignals(args) { return {}; }
  assessBreakthroughConditions(readinessSignals) { return false; }
  analyzeConfidenceTrajectory(recentProgress) { return 'stable'; }
  calculateDreamProgress(progressHistory, goalData) { return 0.2; }
  identifyMissingCapabilities(progressHistory, goalData) { return []; }
  identifyNextMilestone(progressHistory, goalData) { return 'Next milestone unknown'; }
  async assessDreamAlignment(projectId, goalData) {
    return { path_effectiveness: 'unknown', pivot_opportunities: [], acceleration_potential: 'unknown' };
  }
  analyzeFulfillmentTrajectory(progressHistory) { return 'positive'; }
  assessEmotionalAlignment(args) { return 'aligned'; }
  assessIntrinsicDrive(args, goalData) { return 'strong'; }

  // Recommendation stubs
  recommendGoalConnection(context, goalData) { return 'explicit_goal_connection'; }
  recommendMomentumBuilding(context) { return 'build_on_recent_progress'; }
  recommendBreakthroughSetup(context) { return 'prepare_for_advancement'; }
  recommendConsistencyBuilding(context) { return 'daily_goal_focused_work'; }
  recommendSkillStacking(context) { return 'connect_new_to_existing_skills'; }
  recommendDreamAlignment(context, goalData) { return 'strengthen_goal_vision_connection'; }

  // === PERSISTENCE METHODS ===

  async loadAchievementPatterns() {
    try {
      const patternsPath = path.join(this.dataDir, 'achievement-patterns.json');
      const content = await fs.readFile(patternsPath, 'utf8');
      const data = JSON.parse(content);
      this.achievementPatterns = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[GoalAchievement] Failed to load achievement patterns:', error.message);
      }
    }
  }

  async loadGoalProgressHistory() {
    try {
      const historyPath = path.join(this.dataDir, 'goal-progress-history.json');
      const content = await fs.readFile(historyPath, 'utf8');
      const data = JSON.parse(content);
      this.goalProgressHistory = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[GoalAchievement] Failed to load goal progress history:', error.message);
      }
    }
  }

  async recordGoalProgressEvent(projectId, context, args) {
    if (!this.goalProgressHistory.has(projectId)) {
      this.goalProgressHistory.set(projectId, []);
    }
    
    const history = this.goalProgressHistory.get(projectId);
    history.push({
      timestamp: new Date().toISOString(),
      context_snapshot: context,
      user_args: args,
      goal_advancement_score: context.readiness?.immediate_potential?.can_advance_goal ? 0.8 : 0.3,
      goal_focused: true // would be determined based on actual session outcome
    });
    
    // Keep only last 100 events per project
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await this.saveGoalProgressHistory();
  }

  async saveGoalProgressHistory() {
    try {
      const historyPath = path.join(this.dataDir, 'goal-progress-history.json');
      const data = Object.fromEntries(this.goalProgressHistory);
      await fs.writeFile(historyPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('[GoalAchievement] Failed to save goal progress history:', error.message);
    }
  }
}

export default GoalAchievementContext;
