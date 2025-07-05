/**
 * Goal Convergence Detection System
 * Extends CoreIntelligence to detect when user responses consistently point toward specific themes
 * Identifies goal clarification patterns and pivot points in learning journeys
 */

import { FILE_NAMES, DEFAULT_PATHS, THRESHOLDS } from '../memory-sync.js';

const CONVERGENCE_CONSTANTS = {
  MIN_INTERACTIONS_FOR_PATTERN: 3,
  STRONG_CONVERGENCE_THRESHOLD: 0.75,
  MODERATE_CONVERGENCE_THRESHOLD: 0.5,
  WEAK_CONVERGENCE_THRESHOLD: 0.25,
  PIVOT_THRESHOLD: 0.4,
  PATTERN_WINDOW_SIZE: 10, // Last N interactions to analyze
  THEME_WEIGHT_DECAY: 0.9, // Older themes get less weight
  CONFIDENCE_BOOST_FACTOR: 1.2,
  REPETITION_BOOST_FACTOR: 1.5,
  RECENCY_BOOST_FACTOR: 1.3,
};

export class GoalConvergenceDetector {
  constructor(dataPersistence, coreIntelligence) {
    this.dataPersistence = dataPersistence;
    this.coreIntelligence = coreIntelligence;
    this.convergenceCache = new Map(); // Cache convergence analysis per project
  }

  /**
   * Analyze goal convergence patterns for a project
   */
  async analyzeGoalConvergence(args) {
    const projectId = args.project_id || args.projectId;
    const includeDetailedAnalysis = args.detailed || false;

    try {
      if (!projectId) {
        throw new Error('Project ID is required for convergence analysis');
      }

      // Load interaction history
      const interactionHistory = await this.loadInteractionHistory(projectId);
      
      if (interactionHistory.length < CONVERGENCE_CONSTANTS.MIN_INTERACTIONS_FOR_PATTERN) {
        return {
          success: true,
          content: [
            {
              type: 'text',
              text: `**🔍 Goal Convergence Analysis**\n\nInsufficient interaction history (${interactionHistory.length} interactions). Need at least ${CONVERGENCE_CONSTANTS.MIN_INTERACTIONS_FOR_PATTERN} interactions to detect convergence patterns.\n\nContinue using the system and your goal patterns will become clear!`,
            },
          ],
          convergence_status: 'insufficient_data',
          interactions_analyzed: interactionHistory.length,
        };
      }

      // Perform convergence analysis
      const convergenceAnalysis = this.performConvergenceAnalysis(interactionHistory);
      
      // Detect goal pivots
      const pivotAnalysis = this.detectGoalPivots(interactionHistory);
      
      // Generate recommendations
      const recommendations = this.generateConvergenceRecommendations(convergenceAnalysis, pivotAnalysis);

      // Cache results
      this.convergenceCache.set(projectId, {
        analysis: convergenceAnalysis,
        pivots: pivotAnalysis,
        timestamp: new Date().toISOString(),
      });

      // Format report
      const report = this.formatConvergenceReport(convergenceAnalysis, pivotAnalysis, recommendations, includeDetailedAnalysis);

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
        convergence_analysis: convergenceAnalysis,
        pivot_analysis: pivotAnalysis,
        recommendations,
        interactions_analyzed: interactionHistory.length,
      };
    } catch (error) {
      console.error('GoalConvergenceDetector.analyzeGoalConvergence failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Goal Convergence Analysis Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Load interaction history from multiple sources
   */
  async loadInteractionHistory(projectId) {
    const interactions = [];

    try {
      // Load learning history
      const learningHistory = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.LEARNING_HISTORY);
      if (learningHistory?.completedTopics) {
        learningHistory.completedTopics.forEach(topic => {
          interactions.push({
            type: 'task_completion',
            timestamp: topic.completedAt || topic.timestamp,
            content: topic.learned || '',
            questions: topic.nextQuestions || '',
            breakthrough: topic.breakthrough || false,
            themes: this.extractThemesFromText(topic.learned || ''),
            metadata: {
              taskId: topic.id,
              difficulty: topic.difficulty,
              branch: topic.branch,
            },
          });
        });
      }

      // Load clarification dialogue sessions
      const dialogueSessions = await this.loadClarificationSessions(projectId);
      dialogueSessions.forEach(session => {
        session.responses?.forEach(response => {
          interactions.push({
            type: 'clarification_response',
            timestamp: response.timestamp,
            content: response.response,
            themes: response.themes || [],
            confidence: response.confidence || 0.5,
            metadata: {
              dialogueId: session.id,
              round: response.round,
            },
          });
        });
      });

      // Load strategy evolution feedback
      const evolutionHistory = await this.loadEvolutionHistory(projectId);
      evolutionHistory.forEach(evolution => {
        interactions.push({
          type: 'strategy_evolution',
          timestamp: evolution.timestamp,
          content: evolution.feedback || '',
          themes: this.extractThemesFromText(evolution.feedback || ''),
          metadata: {
            evolutionType: evolution.type,
            tasksAdded: evolution.tasksAdded,
          },
        });
      });

      // Sort by timestamp
      interactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return interactions;
    } catch (error) {
      console.error('Failed to load interaction history:', error.message);
      return [];
    }
  }

  /**
   * Perform comprehensive convergence analysis
   */
  performConvergenceAnalysis(interactions) {
    // Focus on recent interactions for convergence detection
    const recentInteractions = interactions.slice(-CONVERGENCE_CONSTANTS.PATTERN_WINDOW_SIZE);
    
    // Extract and weight themes
    const themeAnalysis = this.analyzeThemeEvolution(recentInteractions);
    
    // Calculate convergence strength
    const convergenceStrength = this.calculateConvergenceStrength(themeAnalysis);
    
    // Identify dominant themes
    const dominantThemes = this.identifyDominantThemes(themeAnalysis, convergenceStrength);
    
    // Assess confidence trends
    const confidenceTrends = this.analyzeConfidenceTrends(recentInteractions);
    
    // Detect interaction patterns
    const interactionPatterns = this.detectInteractionPatterns(recentInteractions);

    return {
      convergenceStrength,
      dominantThemes,
      themeAnalysis,
      confidenceTrends,
      interactionPatterns,
      totalInteractions: interactions.length,
      recentInteractionsAnalyzed: recentInteractions.length,
      convergenceLevel: this.classifyConvergenceLevel(convergenceStrength),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze theme evolution over time
   */
  analyzeThemeEvolution(interactions) {
    const themeTimeline = new Map();
    const themeFrequency = new Map();
    const themeConfidence = new Map();

    interactions.forEach((interaction, index) => {
      const weight = Math.pow(CONVERGENCE_CONSTANTS.THEME_WEIGHT_DECAY, interactions.length - index - 1);
      const recencyBoost = index >= interactions.length - 3 ? CONVERGENCE_CONSTANTS.RECENCY_BOOST_FACTOR : 1;
      
      interaction.themes.forEach(theme => {
        // Track timeline
        if (!themeTimeline.has(theme)) {
          themeTimeline.set(theme, []);
        }
        themeTimeline.get(theme).push({
          timestamp: interaction.timestamp,
          weight: weight * recencyBoost,
          confidence: interaction.confidence || 0.5,
        });

        // Track frequency
        themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + weight * recencyBoost);

        // Track confidence
        if (!themeConfidence.has(theme)) {
          themeConfidence.set(theme, { total: 0, count: 0 });
        }
        const confidenceData = themeConfidence.get(theme);
        confidenceData.total += (interaction.confidence || 0.5) * weight;
        confidenceData.count += weight;
      });
    });

    // Calculate average confidence per theme
    const themeAverageConfidence = new Map();
    themeConfidence.forEach((data, theme) => {
      themeAverageConfidence.set(theme, data.count > 0 ? data.total / data.count : 0.5);
    });

    return {
      timeline: themeTimeline,
      frequency: themeFrequency,
      averageConfidence: themeAverageConfidence,
      uniqueThemes: themeTimeline.size,
    };
  }

  /**
   * Calculate overall convergence strength
   */
  calculateConvergenceStrength(themeAnalysis) {
    const { frequency, averageConfidence } = themeAnalysis;
    
    if (frequency.size === 0) return 0;

    // Calculate theme concentration (how concentrated themes are)
    const totalWeight = Array.from(frequency.values()).reduce((sum, weight) => sum + weight, 0);
    const themeConcentration = this.calculateThemeConcentration(frequency, totalWeight);
    
    // Calculate confidence boost (higher confidence themes get more weight)
    const confidenceBoost = this.calculateConfidenceBoost(frequency, averageConfidence);
    
    // Calculate repetition factor (repeated themes indicate convergence)
    const repetitionFactor = this.calculateRepetitionFactor(frequency);

    // Combine factors
    const convergenceStrength = (themeConcentration * 0.4) + (confidenceBoost * 0.3) + (repetitionFactor * 0.3);

    return Math.min(1, convergenceStrength);
  }

  /**
   * Calculate theme concentration (entropy-based)
   */
  calculateThemeConcentration(frequency, totalWeight) {
    if (totalWeight === 0 || frequency.size <= 1) return 0;

    // Calculate entropy
    let entropy = 0;
    frequency.forEach(weight => {
      const probability = weight / totalWeight;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });

    // Normalize entropy (lower entropy = higher concentration)
    const maxEntropy = Math.log2(frequency.size);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 1;
    
    return 1 - normalizedEntropy; // Invert so higher concentration = higher value
  }

  /**
   * Calculate confidence boost factor
   */
  calculateConfidenceBoost(frequency, averageConfidence) {
    let weightedConfidence = 0;
    let totalWeight = 0;

    frequency.forEach((weight, theme) => {
      const confidence = averageConfidence.get(theme) || 0.5;
      weightedConfidence += weight * confidence;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedConfidence / totalWeight) * CONVERGENCE_CONSTANTS.CONFIDENCE_BOOST_FACTOR : 0.5;
  }

  /**
   * Calculate repetition factor
   */
  calculateRepetitionFactor(frequency) {
    const weights = Array.from(frequency.values()).sort((a, b) => b - a);
    
    if (weights.length === 0) return 0;
    if (weights.length === 1) return weights[0] > 1 ? CONVERGENCE_CONSTANTS.REPETITION_BOOST_FACTOR : 1;

    // Calculate how much the top themes dominate
    const topTheme = weights[0];
    const secondTheme = weights[1] || 0;
    const dominanceRatio = secondTheme > 0 ? topTheme / secondTheme : topTheme;

    return Math.min(CONVERGENCE_CONSTANTS.REPETITION_BOOST_FACTOR, 1 + (dominanceRatio - 1) * 0.3);
  }

  /**
   * Identify dominant themes based on analysis
   */
  identifyDominantThemes(themeAnalysis, convergenceStrength) {
    const { frequency, averageConfidence } = themeAnalysis;
    
    // Calculate composite scores for each theme
    const themeScores = new Map();
    frequency.forEach((freq, theme) => {
      const confidence = averageConfidence.get(theme) || 0.5;
      const score = freq * confidence * convergenceStrength;
      themeScores.set(theme, score);
    });

    // Sort themes by score
    const sortedThemes = Array.from(themeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme, score]) => ({
        theme,
        score,
        frequency: frequency.get(theme),
        confidence: averageConfidence.get(theme),
        dominance: score / Math.max(...themeScores.values()),
      }));

    return sortedThemes.slice(0, 5); // Top 5 dominant themes
  }

  /**
   * Analyze confidence trends over time
   */
  analyzeConfidenceTrends(interactions) {
    const confidenceHistory = interactions
      .filter(i => typeof i.confidence === 'number')
      .map(i => ({
        timestamp: i.timestamp,
        confidence: i.confidence,
        type: i.type,
      }));

    if (confidenceHistory.length < 2) {
      return { trend: 'insufficient_data', slope: 0, variance: 0 };
    }

    // Calculate trend (simple linear regression)
    const n = confidenceHistory.length;
    const xValues = confidenceHistory.map((_, index) => index);
    const yValues = confidenceHistory.map(item => item.confidence);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate variance
    const variance = yValues.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0) / n;

    // Classify trend
    let trend;
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0.02) {
      trend = 'increasing';
    } else if (slope < -0.02) {
      trend = 'decreasing';
    } else {
      trend = 'slight_change';
    }

    return {
      trend,
      slope,
      variance,
      averageConfidence: sumY / n,
      recentConfidence: yValues[yValues.length - 1],
      confidenceHistory: confidenceHistory.slice(-5), // Last 5 data points
    };
  }

  /**
   * Detect interaction patterns
   */
  detectInteractionPatterns(interactions) {
    const patterns = {
      interactionTypes: new Map(),
      breakthroughFrequency: 0,
      questioningDepth: 0,
      learningVelocity: 0,
      topicDiversity: new Set(),
    };

    interactions.forEach(interaction => {
      // Track interaction types
      const type = interaction.type;
      patterns.interactionTypes.set(type, (patterns.interactionTypes.get(type) || 0) + 1);

      // Track breakthroughs
      if (interaction.breakthrough) {
        patterns.breakthroughFrequency++;
      }

      // Track questioning depth
      if (interaction.questions && interaction.questions.length > 50) {
        patterns.questioningDepth++;
      }

      // Track topic diversity
      interaction.themes.forEach(theme => patterns.topicDiversity.add(theme));
    });

    // Calculate learning velocity (interactions per day for recent period)
    if (interactions.length > 1) {
      const recentInteractions = interactions.slice(-7); // Last 7 interactions
      const timeSpan = new Date(recentInteractions[recentInteractions.length - 1].timestamp) - 
                       new Date(recentInteractions[0].timestamp);
      const days = Math.max(1, timeSpan / (1000 * 60 * 60 * 24));
      patterns.learningVelocity = recentInteractions.length / days;
    }

    return {
      ...patterns,
      topicDiversity: patterns.topicDiversity.size,
      dominantInteractionType: this.findDominantInteractionType(patterns.interactionTypes),
    };
  }

  /**
   * Find dominant interaction type
   */
  findDominantInteractionType(interactionTypes) {
    let maxCount = 0;
    let dominantType = 'mixed';

    interactionTypes.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    });

    return dominantType;
  }

  /**
   * Classify convergence level
   */
  classifyConvergenceLevel(convergenceStrength) {
    if (convergenceStrength >= CONVERGENCE_CONSTANTS.STRONG_CONVERGENCE_THRESHOLD) {
      return 'strong';
    } else if (convergenceStrength >= CONVERGENCE_CONSTANTS.MODERATE_CONVERGENCE_THRESHOLD) {
      return 'moderate';
    } else if (convergenceStrength >= CONVERGENCE_CONSTANTS.WEAK_CONVERGENCE_THRESHOLD) {
      return 'weak';
    } else {
      return 'exploratory';
    }
  }

  /**
   * Detect goal pivots in the learning journey
   */
  detectGoalPivots(interactions) {
    const pivots = [];
    const windowSize = 5; // Compare themes in sliding windows

    for (let i = windowSize; i < interactions.length - windowSize; i++) {
      const beforeWindow = interactions.slice(i - windowSize, i);
      const afterWindow = interactions.slice(i, i + windowSize);

      const beforeThemes = new Set(beforeWindow.flatMap(interaction => interaction.themes));
      const afterThemes = new Set(afterWindow.flatMap(interaction => interaction.themes));

      // Calculate theme overlap
      const intersection = new Set([...beforeThemes].filter(theme => afterThemes.has(theme)));
      const union = new Set([...beforeThemes, ...afterThemes]);
      
      const overlap = union.size > 0 ? intersection.size / union.size : 1;

      // Detect pivot if overlap is low
      if (overlap < CONVERGENCE_CONSTANTS.PIVOT_THRESHOLD && beforeThemes.size > 0 && afterThemes.size > 0) {
        pivots.push({
          timestamp: interactions[i].timestamp,
          index: i,
          beforeThemes: Array.from(beforeThemes),
          afterThemes: Array.from(afterThemes),
          overlap,
          severity: 1 - overlap, // Higher severity = bigger pivot
          context: interactions[i].content.substring(0, 100),
        });
      }
    }

    return {
      pivots,
      pivotCount: pivots.length,
      majorPivots: pivots.filter(p => p.severity > 0.7),
      recentPivots: pivots.filter(p => {
        const pivotDate = new Date(p.timestamp);
        const daysSince = (Date.now() - pivotDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7; // Pivots in last 7 days
      }),
    };
  }

  /**
   * Generate convergence-based recommendations
   */
  generateConvergenceRecommendations(convergenceAnalysis, pivotAnalysis) {
    const recommendations = [];
    const { convergenceLevel, dominantThemes, confidenceTrends } = convergenceAnalysis;
    const { recentPivots, majorPivots } = pivotAnalysis;

    // Convergence-based recommendations
    switch (convergenceLevel) {
      case 'strong':
        recommendations.push('🎯 Strong goal convergence detected! Focus deeply on your dominant themes');
        recommendations.push(`Consider specializing in: ${dominantThemes[0]?.theme}`);
        break;
      
      case 'moderate':
        recommendations.push('📈 Moderate convergence - your interests are becoming clearer');
        recommendations.push('Continue exploring your top themes while maintaining focus');
        break;
      
      case 'weak':
        recommendations.push('🔍 Weak convergence - still exploring different directions');
        recommendations.push('Consider using clarification dialogue to identify your true interests');
        break;
      
      case 'exploratory':
        recommendations.push('🌟 Exploratory phase - great time for broad learning');
        recommendations.push('Try diverse tasks to discover what excites you most');
        break;
    }

    // Confidence trend recommendations
    if (confidenceTrends.trend === 'decreasing') {
      recommendations.push('⚠️ Confidence trending down - consider adjusting task difficulty or seeking clarity');
    } else if (confidenceTrends.trend === 'increasing') {
      recommendations.push('📈 Confidence growing - excellent momentum! Consider increasing challenge');
    }

    // Pivot recommendations
    if (recentPivots.length > 0) {
      recommendations.push('🔄 Recent goal pivot detected - ensure your HTA aligns with new direction');
      recommendations.push('Consider using `evolve_strategy_forest` to adapt your learning path');
    }

    if (majorPivots.length > 2) {
      recommendations.push('🌊 Multiple major pivots detected - consider goal clarification dialogue');
    }

    // Theme-specific recommendations
    if (dominantThemes.length > 0 && dominantThemes[0].dominance > 0.7) {
      recommendations.push(`🚀 Strong focus on "${dominantThemes[0].theme}" - time to go deeper`);
    }

    return recommendations;
  }

  /**
   * Format convergence report
   */
  formatConvergenceReport(convergenceAnalysis, pivotAnalysis, recommendations, includeDetailed) {
    const { convergenceLevel, convergenceStrength, dominantThemes, confidenceTrends, interactionPatterns } = convergenceAnalysis;
    const { pivotCount, recentPivots } = pivotAnalysis;

    let report = '# 🎯 Goal Convergence Analysis\n\n';

    // Main status
    report += `## Convergence Status: ${convergenceLevel.toUpperCase()}\n`;
    report += `**Strength**: ${Math.round(convergenceStrength * 100)}%\n`;
    report += `**Interactions Analyzed**: ${convergenceAnalysis.totalInteractions}\n\n`;

    // Dominant themes
    if (dominantThemes.length > 0) {
      report += `## 🌟 Dominant Themes\n`;
      dominantThemes.slice(0, 3).forEach((theme, index) => {
        report += `${index + 1}. **${theme.theme}** (${Math.round(theme.dominance * 100)}% dominance)\n`;
      });
      report += '\n';
    }

    // Confidence trends
    report += `## 📈 Confidence Trends\n`;
    report += `**Trend**: ${confidenceTrends.trend}\n`;
    report += `**Current**: ${Math.round(confidenceTrends.recentConfidence * 100)}%\n`;
    report += `**Average**: ${Math.round(confidenceTrends.averageConfidence * 100)}%\n\n`;

    // Pivot analysis
    if (pivotCount > 0) {
      report += `## 🔄 Goal Pivots\n`;
      report += `**Total Pivots**: ${pivotCount}\n`;
      report += `**Recent Pivots**: ${recentPivots.length}\n`;
      if (recentPivots.length > 0) {
        report += `**Latest Pivot**: ${recentPivots[recentPivots.length - 1].timestamp}\n`;
      }
      report += '\n';
    }

    // Interaction patterns
    if (includeDetailed) {
      report += `## 📊 Learning Patterns\n`;
      report += `**Dominant Activity**: ${interactionPatterns.dominantInteractionType}\n`;
      report += `**Topic Diversity**: ${interactionPatterns.topicDiversity} themes\n`;
      report += `**Learning Velocity**: ${interactionPatterns.learningVelocity.toFixed(1)} interactions/day\n`;
      report += `**Breakthroughs**: ${interactionPatterns.breakthroughFrequency}\n\n`;
    }

    // Recommendations
    report += `## 💡 Recommendations\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });

    report += `\n---\n*Analysis generated at ${new Date().toLocaleString()}*`;

    return report;
  }

  /**
   * Load clarification dialogue sessions for a project
   */
  async loadClarificationSessions(projectId) {
    // This would load saved clarification dialogue sessions
    // For now, return empty array - will be populated as dialogues are created
    try {
      const files = await this.dataPersistence.listProjectFiles(projectId);
      const sessionFiles = files.filter(file => file.startsWith('clarification_dialogue_'));
      
      const sessions = [];
      for (const file of sessionFiles) {
        try {
          const sessionData = await this.dataPersistence.loadProjectData(projectId, file);
          if (sessionData) {
            sessions.push(sessionData);
          }
        } catch (error) {
          console.warn(`Failed to load session ${file}:`, error.message);
        }
      }
      
      return sessions;
    } catch (error) {
      console.warn('Failed to load clarification sessions:', error.message);
      return [];
    }
  }

  /**
   * Load strategy evolution history for a project
   */
  async loadEvolutionHistory(projectId) {
    // This would load strategy evolution events
    // For now, return empty array - will be populated as evolutions occur
    try {
      const evolutionData = await this.dataPersistence.loadProjectData(projectId, 'evolution_history.json');
      return evolutionData?.evolutions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract themes from text content
   */
  extractThemesFromText(text) {
    if (!text || typeof text !== 'string') return [];

    const textLower = text.toLowerCase();
    const themes = [];

    // Technical themes
    const techThemes = {
      'web development': ['web', 'website', 'frontend', 'backend', 'html', 'css', 'javascript'],
      'mobile development': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
      'data science': ['data', 'analytics', 'machine learning', 'ai', 'statistics', 'python'],
      'cloud computing': ['cloud', 'aws', 'azure', 'kubernetes', 'docker', 'serverless'],
      'database': ['database', 'sql', 'mongodb', 'postgresql', 'data modeling'],
    };

    // Learning themes
    const learningThemes = {
      'problem solving': ['problem', 'solve', 'debug', 'troubleshoot', 'fix'],
      'project building': ['project', 'build', 'create', 'develop', 'implement'],
      'theoretical learning': ['theory', 'concept', 'understand', 'principle', 'foundation'],
      'practical application': ['practice', 'hands-on', 'exercise', 'tutorial', 'example'],
    };

    // Career themes
    const careerThemes = {
      'career advancement': ['career', 'job', 'professional', 'promotion', 'salary'],
      'entrepreneurship': ['business', 'startup', 'entrepreneur', 'product', 'launch'],
      'skill development': ['skill', 'expertise', 'mastery', 'competency', 'ability'],
    };

    // Extract themes from all categories
    [techThemes, learningThemes, careerThemes].forEach(themeCategory => {
      for (const [theme, keywords] of Object.entries(themeCategory)) {
        if (keywords.some(keyword => textLower.includes(keyword))) {
          themes.push(theme);
        }
      }
    });

    return themes;
  }

  /**
   * Get cached convergence analysis for a project
   */
  getCachedConvergence(projectId) {
    return this.convergenceCache.get(projectId);
  }

  /**
   * Clear convergence cache for a project
   */
  clearConvergenceCache(projectId) {
    this.convergenceCache.delete(projectId);
  }
}