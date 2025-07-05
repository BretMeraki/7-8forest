/**
 * Ambiguous Desires Architecture - Entry Point
 * Integrates clarification dialogue, goal convergence detection, and adaptive HTA evolution
 * for handling evolving and unclear learning goals
 */

import { ClarificationDialogue } from './clarification-dialogue.js';
import { GoalConvergenceDetector } from './goal-convergence-detector.js';
import { AdaptiveHTAEvolution } from './adaptive-hta-evolution.js';

export { ClarificationDialogue, GoalConvergenceDetector, AdaptiveHTAEvolution };

/**
 * Integrated Ambiguous Desires Manager
 * Coordinates all three components for seamless goal clarification and evolution
 */
export class AmbiguousDesiresManager {
  constructor(dataPersistence, projectManagement, taskStrategyCore, coreIntelligence, vectorStore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.taskStrategyCore = taskStrategyCore;
    this.coreIntelligence = coreIntelligence;
    this.vectorStore = vectorStore;

    // Initialize subsystems
    this.clarificationDialogue = new ClarificationDialogue(
      dataPersistence,
      projectManagement,
      vectorStore
    );

    this.convergenceDetector = new GoalConvergenceDetector(
      dataPersistence,
      coreIntelligence
    );

    this.adaptiveEvolution = new AdaptiveHTAEvolution(
      dataPersistence,
      projectManagement,
      taskStrategyCore,
      vectorStore
    );
  }

  /**
   * Assess if a goal needs clarification
   */
  async assessGoalClarity(goal, context = '') {
    try {
      // Use clarification dialogue's ambiguity analysis
      const ambiguityAnalysis = this.clarificationDialogue.analyzeGoalAmbiguity(goal, context);
      
      return {
        needsClarification: ambiguityAnalysis.overallUncertainty > 0.5,
        uncertaintyLevel: ambiguityAnalysis.overallUncertainty,
        uncertainAreas: ambiguityAnalysis.uncertainAreas,
        recommendation: ambiguityAnalysis.recommendation,
        summary: ambiguityAnalysis.summary,
      };
    } catch (error) {
      console.error('AmbiguousDesiresManager.assessGoalClarity failed:', error);
      return {
        needsClarification: false,
        uncertaintyLevel: 0,
        uncertainAreas: [],
        recommendation: 'Unable to assess clarity',
        summary: 'Assessment failed',
        error: error.message,
      };
    }
  }

  /**
   * Comprehensive goal and learning pattern analysis
   */
  async analyzeGoalEvolution(projectId) {
    try {
      // Get convergence analysis
      const convergenceResult = await this.convergenceDetector.analyzeGoalConvergence({
        project_id: projectId,
        detailed: true,
      });

      // Get cached convergence data
      const cachedConvergence = this.convergenceDetector.getCachedConvergence(projectId);

      // Check for active clarification dialogues
      const activeDialogues = this.clarificationDialogue.getActiveDialogues(projectId);

      // Assess current uncertainty state
      const uncertaintyState = await this.adaptiveEvolution.loadUncertaintyState(projectId);

      return {
        convergenceAnalysis: convergenceResult.convergence_analysis,
        pivotAnalysis: convergenceResult.pivot_analysis,
        activeDialogues: activeDialogues.length,
        uncertaintyState,
        needsAdaptiveEvolution: this.assessNeedsAdaptiveEvolution(
          convergenceResult.convergence_analysis,
          uncertaintyState
        ),
        recommendations: this.generateIntegratedRecommendations(
          convergenceResult.convergence_analysis,
          convergenceResult.pivot_analysis,
          uncertaintyState,
          activeDialogues
        ),
      };
    } catch (error) {
      console.error('AmbiguousDesiresManager.analyzeGoalEvolution failed:', error);
      return {
        error: error.message,
        recommendations: ['Unable to analyze goal evolution - please try again'],
      };
    }
  }

  /**
   * Smart evolution that chooses between different evolution strategies
   */
  async smartEvolution(args) {
    const projectId = args.project_id || args.projectId;
    const feedback = args.feedback || args.context || '';
    const allowGoalRewrite = args.allow_goal_rewrite !== false;
    try {
      // Analyze current state
      const goalEvolution = await this.analyzeGoalEvolution(projectId);
      // Assess feedback uncertainty
      const uncertaintyLevel = this.adaptiveEvolution.assessFeedbackUncertainty(feedback);
      // Determine best evolution strategy using context hierarchy
      const strategy = await this.selectEvolutionStrategy(
        goalEvolution,
        uncertaintyLevel,
        feedback,
        allowGoalRewrite,
        projectId
      );
      // Execute chosen strategy
      switch (strategy.type) {
        case 'clarification_dialogue':
          return await this.clarificationDialogue.startClarificationDialogue({
            ambiguous_goal: strategy.goal,
            context: feedback,
            project_id: projectId,
            context_source: strategy.contextSource
          });
        case 'adaptive_evolution':
          return await this.adaptiveEvolution.adaptiveEvolution({
            feedback,
            project_id: projectId,
            uncertainty_level: uncertaintyLevel,
            allow_goal_rewrite: allowGoalRewrite,
            context_source: strategy.contextSource
          });
        case 'standard_evolution':
          return await this.taskStrategyCore.evolveStrategy({
            feedback,
            project_id: projectId,
            context_source: strategy.contextSource
          });
        default:
          throw new Error(`Unknown evolution strategy: ${strategy.type}`);
      }
    } catch (error) {
      console.error('AmbiguousDesiresManager.smartEvolution failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Smart Evolution Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Select the best evolution strategy based on current state
   * Implements context hierarchy: feedback > convergence > config
   */
  async selectEvolutionStrategy(goalEvolution, uncertaintyLevel, feedback, allowGoalRewrite, projectId) {
    // Load initial project config for context reconciliation
    let projectConfig = null;
    if (projectId && this.dataPersistence) {
      try {
        projectConfig = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      } catch (e) { projectConfig = null; }
    }
    const { convergenceAnalysis, uncertaintyState, activeDialogues } = goalEvolution;
    let contextSource = 'config';
    // 1. Direct user feedback (highest priority)
    if (feedback && feedback.trim().length > 0) {
      // If feedback contradicts config or recent themes, feedback wins
      contextSource = 'feedback';
      // If feedback is highly uncertain or vague, suggest clarification
      if (uncertaintyLevel > 0.7 && feedback.length < 50) {
        return {
          type: 'clarification_dialogue',
          reason: 'High uncertainty with vague feedback needs clarification',
          goal: feedback,
          contextSource
        };
      }
      // If feedback is clear and focused, proceed with evolution
      if (uncertaintyLevel < 0.4) {
        return {
          type: 'adaptive_evolution',
          reason: 'Clear feedback, adaptive refinement',
          contextSource
        };
      }
    }
    // 2. Recent interaction patterns (convergence analysis)
    if (convergenceAnalysis?.dominantThemes?.length > 0) {
      contextSource = 'convergence';
      if (convergenceAnalysis.convergenceLevel === 'strong' && uncertaintyLevel < 0.4) {
        return {
          type: 'adaptive_evolution',
          reason: 'Strong convergence with low uncertainty - adaptive refinement',
          contextSource
        };
      }
      if (uncertaintyLevel > 0.4 && uncertaintyLevel < 0.8) {
        return {
          type: 'adaptive_evolution',
          reason: 'Moderate uncertainty - adaptive exploration needed',
          contextSource
        };
      }
      if (convergenceAnalysis.pivotAnalysis?.recentPivots?.length > 0) {
        return {
          type: 'adaptive_evolution',
          reason: 'Recent goal pivots detected - adaptive evolution needed',
          contextSource
        };
      }
    }
    // 3. Initial project config (lowest priority)
    if (projectConfig) {
      contextSource = 'config';
      // If config goal is vague or unclear, suggest clarification
      if (projectConfig.goal && projectConfig.goal.length < 10) {
        return {
          type: 'clarification_dialogue',
          reason: 'Initial project goal is too vague',
          goal: projectConfig.goal,
          contextSource
        };
      }
    }
    // Default to standard evolution
    return {
      type: 'standard_evolution',
      reason: 'Standard conditions - using regular strategy evolution',
      contextSource
    };
  }

  /**
   * Assess if adaptive evolution is needed
   */
  assessNeedsAdaptiveEvolution(convergenceAnalysis, uncertaintyState) {
    if (!convergenceAnalysis) return false;

    const { convergenceLevel, pivotAnalysis } = convergenceAnalysis;
    const uncertaintyLevel = uncertaintyState?.uncertaintyLevel || 0.5;

    // High uncertainty needs adaptive evolution
    if (uncertaintyLevel > 0.6) return true;

    // Recent pivots need adaptive evolution
    if (pivotAnalysis?.recentPivots?.length > 0) return true;

    // Strong convergence with exploration mode needs refinement
    if (convergenceLevel === 'strong' && uncertaintyLevel < 0.3) return true;

    return false;
  }

  /**
   * Generate integrated recommendations from all subsystems
   */
  generateIntegratedRecommendations(convergenceAnalysis, pivotAnalysis, uncertaintyState, activeDialogues) {
    const recommendations = [];

    // Active dialogues
    if (activeDialogues.length > 0) {
      recommendations.push('🔍 Complete your active clarification dialogue to refine your goals');
    }

    // Uncertainty-based recommendations
    const uncertaintyLevel = uncertaintyState?.uncertaintyLevel || 0.5;
    if (uncertaintyLevel > 0.7) {
      recommendations.push('🤔 High uncertainty detected - consider starting a clarification dialogue');
      recommendations.push('🌟 Focus on discovery tasks to explore different directions');
    } else if (uncertaintyLevel < 0.3 && convergenceAnalysis?.convergenceLevel === 'strong') {
      recommendations.push('🎯 Your goals are clear - time for focused specialization');
      recommendations.push('🚀 Consider pruning irrelevant branches and deepening expertise');
    }

    // Convergence-based recommendations
    if (convergenceAnalysis?.convergenceLevel === 'exploratory') {
      recommendations.push('🔍 Exploratory phase - great time for broad learning and discovery');
      recommendations.push('📊 Track what excites you to identify convergence patterns');
    }

    // Pivot-based recommendations
    if (pivotAnalysis?.recentPivots?.length > 1) {
      recommendations.push('🔄 Multiple recent pivots - ensure your HTA aligns with current direction');
      recommendations.push('⚖️ Consider goal clarification to reduce future pivots');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('📈 Continue with your current learning approach');
      recommendations.push('🔧 Use adaptive evolution if your interests shift');
    }

    return recommendations;
  }

  /**
   * Get comprehensive status of ambiguous desires system
   */
  async getAmbiguousDesireStatus(projectId) {
    try {
      const goalEvolution = await this.analyzeGoalEvolution(projectId);
      const goalClarity = await this.getProjectGoalClarity(projectId);

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: this.formatAmbiguousDesireStatus(goalEvolution, goalClarity),
          },
        ],
        goal_evolution: goalEvolution,
        goal_clarity: goalClarity,
      };
    } catch (error) {
      console.error('AmbiguousDesiresManager.getAmbiguousDesireStatus failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Status Check Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Get project goal clarity assessment
   */
  async getProjectGoalClarity(projectId) {
    try {
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!config) return null;

      return await this.assessGoalClarity(config.goal, config.context || '');
    } catch (error) {
      return null;
    }
  }

  /**
   * Format ambiguous desire status for display
   */
  formatAmbiguousDesireStatus(goalEvolution, goalClarity) {
    let status = '# 🎯 Ambiguous Desires Status\n\n';

    // Goal clarity
    if (goalClarity) {
      status += `## Goal Clarity Assessment\n`;
      status += `**Clarity Level**: ${goalClarity.needsClarification ? 'NEEDS CLARIFICATION' : 'CLEAR'}\n`;
      status += `**Uncertainty**: ${Math.round(goalClarity.uncertaintyLevel * 100)}%\n`;
      if (goalClarity.uncertainAreas.length > 0) {
        status += `**Uncertain Areas**: ${goalClarity.uncertainAreas.join(', ')}\n`;
      }
      status += `**Recommendation**: ${goalClarity.recommendation}\n\n`;
    }

    // Convergence analysis
    if (goalEvolution.convergenceAnalysis) {
      const conv = goalEvolution.convergenceAnalysis;
      status += `## Convergence Analysis\n`;
      status += `**Level**: ${conv.convergenceLevel?.toUpperCase() || 'UNKNOWN'}\n`;
      status += `**Strength**: ${Math.round((conv.convergenceStrength || 0) * 100)}%\n`;
      
      if (conv.dominantThemes?.length > 0) {
        status += `**Dominant Themes**: ${conv.dominantThemes.slice(0, 3).map(t => t.theme).join(', ')}\n`;
      }
      status += '\n';
    }

    // Active dialogues
    if (goalEvolution.activeDialogues > 0) {
      status += `## Active Clarification\n`;
      status += `**Dialogues**: ${goalEvolution.activeDialogues} active session(s)\n\n`;
    }

    // Uncertainty state
    if (goalEvolution.uncertaintyState) {
      const uncertainty = goalEvolution.uncertaintyState;
      status += `## Uncertainty Tracking\n`;
      status += `**Current Level**: ${Math.round((uncertainty.uncertaintyLevel || 0) * 100)}%\n`;
      status += `**Last Update**: ${uncertainty.lastUpdate || 'Never'}\n\n`;
    }

    // Recommendations
    if (goalEvolution.recommendations?.length > 0) {
      status += `## Recommendations\n`;
      goalEvolution.recommendations.forEach((rec, i) => {
        status += `${i + 1}. ${rec}\n`;
      });
      status += '\n';
    }

    status += `---\n*Status generated at ${new Date().toLocaleString()}*`;

    return status;
  }
}