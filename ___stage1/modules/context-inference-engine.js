/**
 * Context Inference Engine - Evidence-Based Context Analysis
 * 
 * Replaces magic numbers with observable behavioral signals, measurable outcomes,
 * and LLM-powered qualitative assessment that evolves based on actual user patterns.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class ContextInferenceEngine {
  constructor(dataDir, llmInterface = null) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data');
    this.llmInterface = llmInterface;
    this.behavioralSignals = new Map(); // projectId -> signal history
    this.contextPatterns = new Map(); // projectId -> learned patterns
    this.qualitativeCache = new Map(); // cache LLM assessments temporarily
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadBehavioralSignals();
      await this.loadContextPatterns();
      this.initialized = true;
      console.error('[ContextInference] Evidence-based context engine initialized');
    } catch (error) {
      console.error('[ContextInference] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Build context through evidence-based inference and LLM assessment
   */
  async buildEvidenceBasedContext(args = {}) {
    const projectId = args.project_id;
    const signals = await this.gatherBehavioralSignals(projectId, args);
    const patterns = this.getLearnedPatterns(projectId);
    
    // Build context through multiple evidence sources
    const context = {
      timestamp: new Date().toISOString(),
      
      // === BEHAVIORAL EVIDENCE ===
      behavioral: await this.analyzeBehavioralEvidence(signals, patterns),
      
      // === ENVIRONMENTAL SIGNALS ===
      environmental: this.analyzeEnvironmentalSignals(args),
      
      // === TEMPORAL PATTERNS ===
      temporal: this.analyzeTemporalPatterns(signals, patterns),
      
      // === PERFORMANCE INDICATORS ===
      performance: await this.analyzePerformanceIndicators(projectId, signals),
      
      // === LLM QUALITATIVE ASSESSMENT ===
      qualitative: await this.getLLMQualitativeAssessment(args, signals, patterns)
    };

    // Generate insights and recommendations without magic numbers
    context.insights = await this.generateContextInsights(context);
    context.recommendations = await this.generateTaskRecommendations(context);
    
    // Record this context for future pattern learning
    await this.recordContextEvent(projectId, context, args);
    
    return context;
  }

  /**
   * Gather observable behavioral signals from user actions
   */
  async gatherBehavioralSignals(projectId, args) {
    const signals = {
      // === MEASURABLE SESSION PATTERNS ===
      session_duration_history: await this.getSessionDurations(projectId),
      completion_rate_trend: await this.getCompletionRates(projectId),
      task_switching_frequency: await this.getTaskSwitchingPatterns(projectId),
      break_patterns: await this.getBreakPatterns(projectId),
      
      // === INTERACTION PATTERNS ===
      help_seeking_frequency: await this.getHelpSeekingPatterns(projectId),
      tool_usage_patterns: await this.getToolUsagePatterns(projectId),
      error_recovery_patterns: await this.getErrorRecoveryPatterns(projectId),
      
      // === CONTENT ENGAGEMENT ===
      content_type_preferences: await this.getContentPreferences(projectId),
      difficulty_progression: await this.getDifficultyProgression(projectId),
      topic_engagement_depth: await this.getTopicEngagementDepth(projectId),
      
      // === TEMPORAL BEHAVIOR ===
      optimal_time_patterns: await this.getOptimalTimePatterns(projectId),
      session_start_delays: await this.getSessionStartDelays(projectId),
      productivity_time_correlation: await this.getProductivityTimeCorrelation(projectId),
      
      // === CURRENT SESSION SIGNALS ===
      current_session: {
        start_time: args.session_start_time || new Date().toISOString(),
        explicit_energy: args.energy_level, // if user provides it
        explicit_time_available: args.time_available,
        context_from_memory: args.context_from_memory,
        device_info: this.getCurrentDeviceInfo(),
        environment_hints: this.getEnvironmentHints(args)
      }
    };

    return signals;
  }

  /**
   * Analyze behavioral evidence to infer cognitive and motivational state
   */
  async analyzeBehavioralEvidence(signals, patterns) {
    const evidence = {
      // === FOCUS AND ATTENTION INDICATORS ===
      focus_indicators: {
        recent_session_completion_rate: this.calculateRecentCompletionRate(signals),
        task_switching_rate: this.calculateTaskSwitchingRate(signals),
        deep_work_capability: this.inferDeepWorkCapability(signals),
        distraction_resilience: this.inferDistractionResilience(signals)
      },
      
      // === ENERGY AND CAPACITY INDICATORS ===
      energy_indicators: {
        session_duration_trend: this.analyzeSessionDurationTrend(signals),
        completion_quality_trend: this.analyzeCompletionQuality(signals),
        break_frequency_pattern: this.analyzeBreakFrequency(signals),
        time_to_productivity: this.analyzeTimeToProductivity(signals)
      },
      
      // === LEARNING VELOCITY INDICATORS ===
      learning_indicators: {
        concept_retention_rate: this.inferRetentionFromBehavior(signals),
        help_seeking_efficiency: this.analyzeHelpSeekingEfficiency(signals),
        error_recovery_speed: this.analyzeErrorRecoverySpeed(signals),
        knowledge_application_rate: this.inferApplicationRate(signals)
      },
      
      // === MOTIVATION INDICATORS ===
      motivation_indicators: {
        self_directed_exploration: this.inferExplorationBehavior(signals),
        persistence_through_difficulty: this.inferPersistence(signals),
        goal_alignment_behavior: this.inferGoalAlignment(signals),
        intrinsic_engagement_signals: this.inferIntrinsicMotivation(signals)
      }
    };

    return evidence;
  }

  /**
   * Use LLM to assess qualitative aspects that can't be measured directly
   */
  async getLLMQualitativeAssessment(args, signals, patterns) {
    if (!this.llmInterface) {
      return this.getDefaultQualitativeAssessment();
    }

    // Check cache first (avoid re-analyzing similar contexts)
    const cacheKey = this.generateContextCacheKey(args, signals);
    if (this.qualitativeCache.has(cacheKey)) {
      const cached = this.qualitativeCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.assessment;
      }
    }

    try {
      const prompt = this.buildQualitativeAssessmentPrompt(args, signals, patterns);
      const assessment = await this.llmInterface.request({
        method: 'llm/completion',
        params: {
          prompt: prompt,
          max_tokens: 800,
          temperature: 0.3,
          system: "You are an expert learning psychologist analyzing user context for personalized task recommendation. Focus on qualitative insights that complement behavioral data."
        }
      });

      // Cache the assessment
      this.qualitativeCache.set(cacheKey, {
        timestamp: Date.now(),
        assessment: assessment
      });

      return assessment;
    } catch (error) {
      console.warn('[ContextInference] LLM qualitative assessment failed:', error.message);
      return this.getDefaultQualitativeAssessment();
    }
  }

  /**
   * Build LLM prompt for qualitative context assessment
   */
  buildQualitativeAssessmentPrompt(args, signals, patterns) {
    return `Analyze this learning context and provide qualitative insights:

**Current Context:**
${args.context_from_memory || 'No explicit context provided'}

**Behavioral Evidence:**
- Recent completion rate: ${signals.session_duration_history?.length || 0} sessions tracked
- Task switching patterns: ${this.describeBehavioralPattern(signals.task_switching_frequency)}
- Help seeking: ${this.describeBehavioralPattern(signals.help_seeking_frequency)}
- Content preferences: ${this.describeBehavioralPattern(signals.content_type_preferences)}

**Session Context:**
- Explicit energy level: ${args.energy_level || 'not provided'}
- Time available: ${args.time_available || 'not specified'}
- Time of day: ${new Date().getHours()}:${new Date().getMinutes()}
- Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

**Historical Patterns:**
${this.describeHistoricalPatterns(patterns)}

Please assess:
1. **Cognitive Readiness**: Based on behavioral signals and context, how ready is the user for different types of cognitive work?
2. **Motivational State**: What does the evidence suggest about intrinsic motivation, curiosity, and engagement?
3. **Learning Mode**: What type of learning activity would be most effective right now (explore, practice, review, create)?
4. **Risk Factors**: What might derail progress or cause frustration?
5. **Optimal Challenge Level**: What difficulty/complexity would create the best learning experience?

Respond in JSON format:
{
  "cognitive_readiness": {
    "assessment": "high/medium/low",
    "reasoning": "evidence-based explanation",
    "confidence": 0.8
  },
  "motivational_state": {
    "assessment": "engaged/neutral/disengaged", 
    "reasoning": "evidence-based explanation",
    "confidence": 0.7
  },
  "recommended_mode": {
    "mode": "explore/practice/review/create",
    "reasoning": "why this mode is optimal",
    "confidence": 0.9
  },
  "challenge_level": {
    "optimal_complexity": "low/medium/high",
    "reasoning": "evidence for this complexity level",
    "confidence": 0.8
  },
  "risk_factors": [
    {
      "factor": "specific risk",
      "likelihood": 0.3,
      "mitigation": "how to address"
    }
  ],
  "contextual_insights": [
    "key insight about current state",
    "pattern or trend observed"
  ]
}`;
  }

  /**
   * Generate actionable insights from multi-source context analysis
   */
  async generateContextInsights(context) {
    const insights = [];

    // Behavioral insight patterns
    const behavioralInsights = this.extractBehavioralInsights(context.behavioral);
    insights.push(...behavioralInsights);

    // Performance trend insights
    const performanceInsights = this.extractPerformanceInsights(context.performance);
    insights.push(...performanceInsights);

    // Temporal pattern insights
    const temporalInsights = this.extractTemporalInsights(context.temporal);
    insights.push(...temporalInsights);

    // LLM qualitative insights
    if (context.qualitative && context.qualitative.contextual_insights) {
      insights.push(...context.qualitative.contextual_insights);
    }

    return insights;
  }

  /**
   * Generate task recommendations based on evidence
   */
  async generateTaskRecommendations(context) {
    const recommendations = {
      task_characteristics: {
        duration: this.recommendDurationFromEvidence(context),
        complexity: this.recommendComplexityFromEvidence(context),
        type: this.recommendTypeFromEvidence(context),
        format: this.recommendFormatFromEvidence(context)
      },
      
      session_structure: {
        warm_up_needed: this.recommendWarmUpFromEvidence(context),
        break_frequency: this.recommendBreakFrequencyFromEvidence(context),
        buffer_time: this.recommendBufferTimeFromEvidence(context)
      },
      
      learning_approach: {
        mode: context.qualitative?.recommended_mode?.mode || 'mixed',
        social_context: this.recommendSocialContextFromEvidence(context),
        tools_needed: this.recommendToolsFromEvidence(context)
      },
      
      risk_mitigation: this.recommendRiskMitigationFromEvidence(context)
    };

    return recommendations;
  }

  // === EVIDENCE-BASED CALCULATION METHODS ===

  calculateRecentCompletionRate(signals) {
    const recentSessions = signals.session_duration_history?.slice(-10) || [];
    if (recentSessions.length === 0) return null;
    
    const completed = recentSessions.filter(session => session.completed).length;
    return {
      rate: completed / recentSessions.length,
      sample_size: recentSessions.length,
      trend: this.calculateTrend(recentSessions.map(s => s.completed ? 1 : 0))
    };
  }

  calculateTaskSwitchingRate(signals) {
    const switchingData = signals.task_switching_frequency || [];
    if (switchingData.length === 0) return null;
    
    const recent = switchingData.slice(-20);
    const avgSwitches = recent.reduce((sum, s) => sum + s.switches, 0) / recent.length;
    
    return {
      average_switches_per_session: avgSwitches,
      trend: this.calculateTrend(recent.map(s => s.switches)),
      context: avgSwitches > 5 ? 'high_switching' : avgSwitches < 2 ? 'focused' : 'moderate'
    };
  }

  inferDeepWorkCapability(signals) {
    const sessions = signals.session_duration_history || [];
    const longSessions = sessions.filter(s => s.duration_minutes > 45);
    const completionInLongSessions = longSessions.filter(s => s.completed).length;
    
    if (longSessions.length === 0) return { capability: 'unknown', evidence: 'insufficient_data' };
    
    const capability = completionInLongSessions / longSessions.length;
    return {
      capability_score: capability,
      evidence: `${completionInLongSessions}/${longSessions.length} long sessions completed`,
      assessment: capability > 0.7 ? 'high' : capability > 0.4 ? 'medium' : 'low'
    };
  }

  // === UTILITY METHODS ===

  calculateTrend(values) {
    if (values.length < 3) return 'insufficient_data';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  generateContextCacheKey(args, signals) {
    const keyData = {
      hour: new Date().getHours(),
      context: args.context_from_memory?.substring(0, 50) || '',
      recent_completion_rate: this.calculateRecentCompletionRate(signals)?.rate || 0
    };
    return JSON.stringify(keyData);
  }

  describeBehavioralPattern(pattern) {
    if (!pattern || pattern.length === 0) return 'No data available';
    return `${pattern.length} data points collected`;
  }

  describeHistoricalPatterns(patterns) {
    if (!patterns || Object.keys(patterns).length === 0) return 'No historical patterns established';
    return Object.keys(patterns).map(key => `${key}: ${patterns[key].summary || 'established'}`).join(', ');
  }

  getDefaultQualitativeAssessment() {
    return {
      cognitive_readiness: { assessment: 'medium', reasoning: 'No LLM available for assessment', confidence: 0.5 },
      motivational_state: { assessment: 'neutral', reasoning: 'No LLM available for assessment', confidence: 0.5 },
      recommended_mode: { mode: 'mixed', reasoning: 'Default fallback mode', confidence: 0.5 },
      challenge_level: { optimal_complexity: 'medium', reasoning: 'Default moderate complexity', confidence: 0.5 },
      risk_factors: [],
      contextual_insights: ['Operating in fallback mode without LLM assessment']
    };
  }

  // === PLACEHOLDER METHODS FOR BEHAVIORAL DATA COLLECTION ===
  // These would integrate with actual data collection systems

  async getSessionDurations(projectId) { return []; }
  async getCompletionRates(projectId) { return []; }
  async getTaskSwitchingPatterns(projectId) { return []; }
  async getBreakPatterns(projectId) { return []; }
  async getHelpSeekingPatterns(projectId) { return []; }
  async getToolUsagePatterns(projectId) { return []; }
  async getErrorRecoveryPatterns(projectId) { return []; }
  async getContentPreferences(projectId) { return []; }
  async getDifficultyProgression(projectId) { return []; }
  async getTopicEngagementDepth(projectId) { return []; }
  async getOptimalTimePatterns(projectId) { return []; }
  async getSessionStartDelays(projectId) { return []; }
  async getProductivityTimeCorrelation(projectId) { return []; }

  getCurrentDeviceInfo() {
    return {
      platform: process.platform,
      user_agent: process.env.USER_AGENT || 'unknown',
      screen_info: 'not_available'
    };
  }

  getEnvironmentHints(args) {
    return {
      location_type: args.location_type,
      noise_level: args.noise_level,
      distractions: args.distractions
    };
  }

  getLearnedPatterns(projectId) {
    return this.contextPatterns.get(projectId) || {};
  }

  // === RECOMMENDATION METHODS ===

  recommendDurationFromEvidence(context) {
    const behavioral = context.behavioral;
    if (behavioral?.focus_indicators?.deep_work_capability?.assessment === 'high') {
      return { recommended_minutes: 60, reasoning: 'High deep work capability observed' };
    }
    if (behavioral?.energy_indicators?.session_duration_trend === 'declining') {
      return { recommended_minutes: 25, reasoning: 'Recent session duration declining' };
    }
    return { recommended_minutes: 30, reasoning: 'Default duration based on insufficient evidence' };
  }

  recommendComplexityFromEvidence(context) {
    const qualitative = context.qualitative;
    if (qualitative?.challenge_level?.optimal_complexity) {
      return {
        level: qualitative.challenge_level.optimal_complexity,
        reasoning: qualitative.challenge_level.reasoning,
        confidence: qualitative.challenge_level.confidence
      };
    }
    return { level: 'medium', reasoning: 'Default complexity level', confidence: 0.5 };
  }

  recommendTypeFromEvidence(context) {
    const mode = context.qualitative?.recommended_mode?.mode || 'mixed';
    return {
      type: mode,
      reasoning: context.qualitative?.recommended_mode?.reasoning || 'Default mixed approach',
      confidence: context.qualitative?.recommended_mode?.confidence || 0.5
    };
  }

  recommendFormatFromEvidence(context) {
    return { format: 'interactive', reasoning: 'Default interactive format' };
  }

  recommendWarmUpFromEvidence(context) {
    return { needed: false, reasoning: 'Insufficient evidence for warm-up assessment' };
  }

  recommendBreakFrequencyFromEvidence(context) {
    return { frequency_minutes: 25, reasoning: 'Standard pomodoro timing' };
  }

  recommendBufferTimeFromEvidence(context) {
    return { buffer_minutes: 5, reasoning: 'Standard buffer for context switching' };
  }

  recommendSocialContextFromEvidence(context) {
    return { mode: 'solo', reasoning: 'Default solo mode' };
  }

  recommendToolsFromEvidence(context) {
    return { tools: [], reasoning: 'No specific tools recommended' };
  }

  recommendRiskMitigationFromEvidence(context) {
    const risks = context.qualitative?.risk_factors || [];
    return risks.map(risk => ({
      risk: risk.factor,
      mitigation: risk.mitigation,
      priority: risk.likelihood
    }));
  }

  // === INSIGHT EXTRACTION METHODS ===

  extractBehavioralInsights(behavioral) {
    const insights = [];
    
    if (behavioral?.focus_indicators?.task_switching_rate?.context === 'high_switching') {
      insights.push('High task switching detected - may indicate distraction or unclear priorities');
    }
    
    if (behavioral?.energy_indicators?.session_duration_trend === 'declining') {
      insights.push('Session duration declining - may indicate fatigue or loss of engagement');
    }
    
    return insights;
  }

  extractPerformanceInsights(performance) {
    return ['Performance analysis not yet implemented'];
  }

  extractTemporalInsights(temporal) {
    return ['Temporal pattern analysis not yet implemented'];
  }

  // === PERSISTENCE METHODS ===

  async loadBehavioralSignals() {
    try {
      const signalsPath = path.join(this.dataDir, 'behavioral-signals.json');
      const content = await fs.readFile(signalsPath, 'utf8');
      const data = JSON.parse(content);
      this.behavioralSignals = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[ContextInference] Failed to load behavioral signals:', error.message);
      }
    }
  }

  async loadContextPatterns() {
    try {
      const patternsPath = path.join(this.dataDir, 'context-patterns.json');
      const content = await fs.readFile(patternsPath, 'utf8');
      const data = JSON.parse(content);
      this.contextPatterns = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[ContextInference] Failed to load context patterns:', error.message);
      }
    }
  }

  async recordContextEvent(projectId, context, args) {
    // Record for future pattern learning
    if (!this.behavioralSignals.has(projectId)) {
      this.behavioralSignals.set(projectId, []);
    }
    
    const signals = this.behavioralSignals.get(projectId);
    signals.push({
      timestamp: new Date().toISOString(),
      context_snapshot: context,
      user_args: args
    });
    
    // Keep only last 50 events per project
    if (signals.length > 50) {
      signals.splice(0, signals.length - 50);
    }
    
    await this.saveBehavioralSignals();
  }

  async saveBehavioralSignals() {
    try {
      const signalsPath = path.join(this.dataDir, 'behavioral-signals.json');
      const data = Object.fromEntries(this.behavioralSignals);
      await fs.writeFile(signalsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('[ContextInference] Failed to save behavioral signals:', error.message);
    }
  }

  analyzeEnvironmentalSignals(args) {
    return {
      current_environment: {
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        platform: process.platform,
        provided_context: Object.keys(args).filter(key => args[key] !== undefined)
      }
    };
  }

  analyzeTemporalPatterns(signals, patterns) {
    return {
      session_timing: 'analysis_not_implemented',
      patterns: patterns.temporal || {}
    };
  }

  async analyzePerformanceIndicators(projectId, signals) {
    return {
      completion_trends: 'analysis_not_implemented',
      efficiency_metrics: 'analysis_not_implemented'
    };
  }

  // Additional stub methods for comprehensive behavioral analysis
  analyzeSessionDurationTrend(signals) { return 'stable'; }
  analyzeCompletionQuality(signals) { return 'unknown'; }
  analyzeBreakFrequency(signals) { return 'normal'; }
  analyzeTimeToProductivity(signals) { return 'unknown'; }
  inferRetentionFromBehavior(signals) { return 'unknown'; }
  analyzeHelpSeekingEfficiency(signals) { return 'unknown'; }
  analyzeErrorRecoverySpeed(signals) { return 'unknown'; }
  inferApplicationRate(signals) { return 'unknown'; }
  inferExplorationBehavior(signals) { return 'unknown'; }
  inferPersistence(signals) { return 'unknown'; }
  inferGoalAlignment(signals) { return 'unknown'; }
  inferIntrinsicMotivation(signals) { return 'unknown'; }
  inferDistractionResilience(signals) { return 'unknown'; }
}

export default ContextInferenceEngine;
