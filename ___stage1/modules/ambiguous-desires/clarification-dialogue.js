/**
 * Clarification Dialogue System
 * Handles interactive goal refinement for ambiguous desires through targeted questioning
 */

import { FILE_NAMES, DEFAULT_PATHS } from '../memory-sync.js';

const CLARIFICATION_CONSTANTS = {
  MIN_RESPONSES_FOR_CONVERGENCE: 3,
  HIGH_UNCERTAINTY_THRESHOLD: 0.7,
  MEDIUM_UNCERTAINTY_THRESHOLD: 0.5,
  LOW_UNCERTAINTY_THRESHOLD: 0.3,
  MAX_CLARIFICATION_ROUNDS: 8,
  CONVERGENCE_CONFIDENCE_THRESHOLD: 0.8,
  PIVOT_DETECTION_THRESHOLD: 0.6,
};

export class ClarificationDialogue {
  constructor(dataPersistence, projectManagement, vectorStore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.vectorStore = vectorStore;
    this.activeDialogues = new Map(); // Track ongoing clarification sessions
  }

  /**
   * Start a clarification dialogue for ambiguous goals
   */
  async startClarificationDialogue(args) {
    const ambiguousGoal = args.ambiguous_goal || args.goal || '';
    const initialContext = args.context || '';
    const projectId = args.project_id || null;

    try {
      let activeProjectId = projectId;
      if (!activeProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (!activeProject || !activeProject.project_id) {
          // If called during project creation, use a temporary ID
          activeProjectId = 'temp_' + Date.now();
        } else {
          activeProjectId = activeProject.project_id;
        }
      }

      // Initialize dialogue session
      const dialogueId = `clarification_${Date.now()}`;
      const session = {
        id: dialogueId,
        projectId: activeProjectId,
        originalGoal: ambiguousGoal,
        context: initialContext,
        responses: [],
        uncertaintyMap: {},
        confidenceLevels: {},
        currentRound: 1,
        status: 'active',
        startedAt: new Date().toISOString(),
        goalEvolution: [ambiguousGoal], // Track how the goal evolves
      };

      this.activeDialogues.set(dialogueId, session);

      // Analyze goal ambiguity
      const ambiguityAnalysis = this.analyzeGoalAmbiguity(ambiguousGoal, initialContext);
      
      // Generate first clarification question
      const firstQuestion = this.generateClarificationQuestion(session, ambiguityAnalysis);

      // Store session data
      await this.saveDialogueSession(activeProjectId, session);

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: `**🔍 Goal Clarification Dialogue Started**\n\n**Original Goal**: ${ambiguousGoal}\n\n**Analysis**: ${ambiguityAnalysis.summary}\n\n**Uncertainty Areas**: ${ambiguityAnalysis.uncertainAreas.join(', ')}\n\n---\n\n**Question ${session.currentRound}**: ${firstQuestion.text}\n\n*Please respond with your thoughts. I'll ask follow-up questions to help clarify your true desires.*`,
          },
        ],
        dialogue_id: dialogueId,
        question: firstQuestion,
        uncertainty_analysis: ambiguityAnalysis,
        session_info: {
          round: session.currentRound,
          max_rounds: CLARIFICATION_CONSTANTS.MAX_CLARIFICATION_ROUNDS,
        },
      };
    } catch (error) {
      console.error('ClarificationDialogue.startClarificationDialogue failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Clarification Dialogue Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Continue clarification dialogue with user response
   */
  async continueDialogue(args) {
    const dialogueId = args.dialogue_id;
    const userResponse = args.response || '';

    try {
      const session = this.activeDialogues.get(dialogueId);
      if (!session || session.status !== 'active') {
        throw new Error('No active clarification dialogue found with that ID');
      }

      // Record user response
      const responseData = {
        round: session.currentRound,
        question: session.lastQuestion || '',
        response: userResponse,
        timestamp: new Date().toISOString(),
        themes: this.extractThemes(userResponse),
        confidence: this.assessResponseConfidence(userResponse),
      };

      session.responses.push(responseData);
      session.currentRound++;

      // Analyze convergence
      const convergenceAnalysis = this.analyzeGoalConvergence(session);
      
      // Check if we've achieved clarity or need more questions
      if (convergenceAnalysis.hasConverged || session.currentRound > CLARIFICATION_CONSTANTS.MAX_CLARIFICATION_ROUNDS) {
        return await this.concludeDialogue(session, convergenceAnalysis);
      }

      // Generate next question based on patterns
      const nextQuestion = this.generateAdaptiveQuestion(session, convergenceAnalysis);
      session.lastQuestion = nextQuestion.text;

      // Update uncertainty map
      this.updateUncertaintyMap(session, responseData);

      // Save updated session
      await this.saveDialogueSession(session.projectId, session);

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: `**🔍 Clarification Progress** (Round ${session.currentRound - 1}/${CLARIFICATION_CONSTANTS.MAX_CLARIFICATION_ROUNDS})\n\n**Your Response**: "${userResponse}"\n\n**Detected Themes**: ${responseData.themes.join(', ')}\n\n**Convergence Status**: ${convergenceAnalysis.status}\n\n---\n\n**Question ${session.currentRound}**: ${nextQuestion.text}\n\n*Progress: ${this.formatConvergenceProgress(convergenceAnalysis)}*`,
          },
        ],
        dialogue_id: dialogueId,
        question: nextQuestion,
        convergence_analysis: convergenceAnalysis,
        session_info: {
          round: session.currentRound,
          responses_so_far: session.responses.length,
          themes_detected: responseData.themes,
        },
      };
    } catch (error) {
      console.error('ClarificationDialogue.continueDialogue failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Dialogue Continuation Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Analyze goal ambiguity to identify uncertainty areas
   */
  analyzeGoalAmbiguity(goal, context) {
    const goalLower = goal.toLowerCase();
    const contextLower = context.toLowerCase();

    const uncertainAreas = [];
    const ambiguityFactors = [];

    // Check for vague terms
    const vagueTerms = ['better', 'improve', 'learn', 'understand', 'get good at', 'master', 'explore'];
    if (vagueTerms.some(term => goalLower.includes(term))) {
      uncertainAreas.push('specificity');
      ambiguityFactors.push('Contains vague terms requiring clarification');
    }

    // Check for multiple potential interpretations
    const broadDomains = ['development', 'programming', 'design', 'business', 'technology'];
    const domainMatches = broadDomains.filter(domain => goalLower.includes(domain));
    if (domainMatches.length > 1) {
      uncertainAreas.push('domain_focus');
      ambiguityFactors.push('Multiple domains mentioned - need focus area');
    }

    // Check for missing context
    if (goal.length < 20 && context.length < 10) {
      uncertainAreas.push('context');
      ambiguityFactors.push('Limited context provided');
    }

    // Check for outcome ambiguity
    const outcomeIndicators = ['job', 'career', 'project', 'hobby', 'business', 'certification'];
    if (!outcomeIndicators.some(indicator => goalLower.includes(indicator) || contextLower.includes(indicator))) {
      uncertainAreas.push('outcome');
      ambiguityFactors.push('Unclear desired outcome or application');
    }

    // Check for timeline ambiguity
    const timeIndicators = ['quickly', 'soon', 'months', 'weeks', 'deadline', 'urgent'];
    if (!timeIndicators.some(indicator => goalLower.includes(indicator) || contextLower.includes(indicator))) {
      uncertainAreas.push('timeline');
      ambiguityFactors.push('No timeline or urgency specified');
    }

    const overallUncertainty = uncertainAreas.length / 5; // Max 5 uncertainty areas

    return {
      uncertainAreas,
      ambiguityFactors,
      overallUncertainty,
      summary: `Goal has ${uncertainAreas.length} uncertain areas: ${uncertainAreas.join(', ')}`,
      recommendation: overallUncertainty > 0.6 ? 'High clarification priority' : 'Moderate clarification needed',
    };
  }

  /**
   * Generate targeted clarification questions based on uncertainty analysis
   */
  generateClarificationQuestion(session, ambiguityAnalysis) {
    const { uncertainAreas } = ambiguityAnalysis;
    const round = session.currentRound;

    // Progressive questioning strategy
    if (round === 1) {
      // Start with broad motivation/outcome
      if (uncertainAreas.includes('outcome')) {
        return {
          type: 'outcome_exploration',
          text: "What's driving this goal? Are you looking to advance your career, build something specific, solve a problem, or explore personal interest?",
          targetArea: 'outcome',
          intent: 'Understand primary motivation and desired outcome',
        };
      } else if (uncertainAreas.includes('specificity')) {
        return {
          type: 'specificity_drill',
          text: "When you imagine achieving this goal, what does success look like? What would you actually be doing or creating?",
          targetArea: 'specificity',
          intent: 'Convert vague terms into concrete outcomes',
        };
      }
    }

    if (round === 2) {
      // Focus on domain/scope
      if (uncertainAreas.includes('domain_focus')) {
        return {
          type: 'domain_focus',
          text: "There are several areas mentioned. Which one excites you most or feels most important right now? What draws you to that particular area?",
          targetArea: 'domain_focus',
          intent: 'Identify primary area of interest',
        };
      } else if (uncertainAreas.includes('context')) {
        return {
          type: 'context_expansion',
          text: "What's your current experience level with this? What have you tried before, and what sparked your interest in pursuing this goal?",
          targetArea: 'context',
          intent: 'Gather background context and experience level',
        };
      }
    }

    if (round >= 3) {
      // Get specific about timeline and constraints
      if (uncertainAreas.includes('timeline')) {
        return {
          type: 'timeline_constraints',
          text: "What's your timeline like? Are you looking to make quick progress, or is this a longer-term journey? Any deadlines or time pressures?",
          targetArea: 'timeline',
          intent: 'Understand urgency and time constraints',
        };
      }
    }

    // Fallback adaptive question
    return {
      type: 'adaptive_exploration',
      text: "What aspect of this goal feels most unclear or exciting to you right now? What would you like to focus on first?",
      targetArea: 'general',
      intent: 'Open-ended exploration for remaining ambiguity',
    };
  }

  /**
   * Generate adaptive questions based on emerging patterns
   */
  generateAdaptiveQuestion(session, convergenceAnalysis) {
    const { convergingThemes, divergentAreas, confidence } = convergenceAnalysis;

    // If themes are converging, validate the convergence
    if (convergingThemes.length > 0 && confidence > CLARIFICATION_CONSTANTS.MEDIUM_UNCERTAINTY_THRESHOLD) {
      return {
        type: 'convergence_validation',
        text: `I'm seeing a pattern toward ${convergingThemes[0]}. Does this feel like the right direction? What aspects of this excite you most?`,
        targetArea: 'validation',
        intent: 'Validate emerging theme convergence',
      };
    }

    // If there are divergent areas, explore the tension
    if (divergentAreas.length > 0) {
      return {
        type: 'divergence_resolution',
        text: `I notice you've mentioned both ${divergentAreas[0]} and ${divergentAreas[1]}. How do these connect for you, or is one more important than the other?`,
        targetArea: 'resolution',
        intent: 'Resolve conflicting themes',
      };
    }

    // If confidence is low, dig deeper
    if (confidence < CLARIFICATION_CONSTANTS.LOW_UNCERTAINTY_THRESHOLD) {
      return {
        type: 'depth_exploration',
        text: "Let's dig deeper. What would make you feel most accomplished or excited about achieving this goal? What impact do you want it to have?",
        targetArea: 'depth',
        intent: 'Explore deeper motivations',
      };
    }

    // Progressive refinement
    return {
      type: 'refinement',
      text: "Based on what you've shared, what feels like the most important next step or milestone toward this goal?",
      targetArea: 'refinement',
      intent: 'Refine understanding toward actionable steps',
    };
  }

  /**
   * Extract themes from user responses
   */
  extractThemes(response) {
    const responseLower = response.toLowerCase();
    const themes = [];

    // Technical themes
    const techPatterns = {
      'web development': ['web', 'website', 'frontend', 'backend', 'full-stack'],
      'mobile development': ['mobile', 'app', 'ios', 'android', 'react native'],
      'data science': ['data', 'analytics', 'machine learning', 'ai', 'statistics'],
      'devops': ['devops', 'deployment', 'ci/cd', 'infrastructure', 'cloud'],
      'design': ['ui', 'ux', 'design', 'user experience', 'interface'],
    };

    // Motivation themes
    const motivationPatterns = {
      'career advancement': ['job', 'career', 'promotion', 'professional', 'salary'],
      'entrepreneurship': ['business', 'startup', 'entrepreneur', 'product', 'launch'],
      'personal interest': ['hobby', 'curiosity', 'interested', 'explore', 'fun'],
      'problem solving': ['solve', 'fix', 'problem', 'challenge', 'improve'],
      'creativity': ['creative', 'build', 'create', 'design', 'make'],
    };

    // Timeline themes
    const timelinePatterns = {
      'urgent': ['urgent', 'quickly', 'asap', 'deadline', 'soon'],
      'gradual': ['slowly', 'eventually', 'long-term', 'patient', 'steady'],
      'structured': ['course', 'curriculum', 'planned', 'systematic', 'organized'],
    };

    // Extract themes from all patterns
    [techPatterns, motivationPatterns, timelinePatterns].forEach(patternGroup => {
      for (const [theme, keywords] of Object.entries(patternGroup)) {
        if (keywords.some(keyword => responseLower.includes(keyword))) {
          themes.push(theme);
        }
      }
    });

    return themes;
  }

  /**
   * Assess confidence level of user response
   */
  assessResponseConfidence(response) {
    const confidenceIndicators = {
      high: ['definitely', 'absolutely', 'certainly', 'exactly', 'precisely', 'specifically'],
      medium: ['probably', 'likely', 'seems', 'appears', 'mostly', 'generally'],
      low: ['maybe', 'perhaps', 'not sure', 'uncertain', 'unclear', 'confused'],
    };

    const responseLower = response.toLowerCase();
    
    for (const [level, indicators] of Object.entries(confidenceIndicators)) {
      if (indicators.some(indicator => responseLower.includes(indicator))) {
        switch (level) {
          case 'high': return 0.9;
          case 'medium': return 0.6;
          case 'low': return 0.3;
        }
      }
    }

    // Default based on response length and specificity
    if (response.length > 100 && response.includes('because')) return 0.7;
    if (response.length > 50) return 0.5;
    return 0.4;
  }

  /**
   * Analyze goal convergence patterns across responses
   */
  analyzeGoalConvergence(session) {
    const responses = session.responses;
    if (responses.length < 2) {
      return {
        hasConverged: false,
        status: 'insufficient_data',
        confidence: 0,
        convergingThemes: [],
        divergentAreas: [],
      };
    }

    // Analyze theme frequency and consistency
    const themeFrequency = new Map();
    const themeEvolution = [];

    responses.forEach((response, index) => {
      response.themes.forEach(theme => {
        themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
      });
      themeEvolution.push(response.themes);
    });

    // Find convergent themes (appearing in multiple responses)
    const convergingThemes = Array.from(themeFrequency.entries())
      .filter(([theme, count]) => count >= Math.min(3, responses.length))
      .map(([theme]) => theme)
      .sort((a, b) => themeFrequency.get(b) - themeFrequency.get(a));

    // Find divergent areas (themes that appear once then disappear)
    const divergentAreas = Array.from(themeFrequency.entries())
      .filter(([theme, count]) => count === 1)
      .map(([theme]) => theme);

    // Calculate confidence based on theme consistency
    const totalThemes = Array.from(themeFrequency.values()).reduce((sum, count) => sum + count, 0);
    const convergentWeight = convergingThemes.reduce((sum, theme) => sum + themeFrequency.get(theme), 0);
    const confidence = totalThemes > 0 ? convergentWeight / totalThemes : 0;

    // Check convergence criteria
    const hasConverged = 
      responses.length >= CLARIFICATION_CONSTANTS.MIN_RESPONSES_FOR_CONVERGENCE &&
      confidence >= CLARIFICATION_CONSTANTS.CONVERGENCE_CONFIDENCE_THRESHOLD &&
      convergingThemes.length > 0;

    // Detect goal pivots (significant theme changes)
    const pivotDetected = this.detectGoalPivot(themeEvolution);

    return {
      hasConverged,
      status: hasConverged ? 'converged' : confidence > 0.5 ? 'converging' : 'exploring',
      confidence,
      convergingThemes,
      divergentAreas,
      pivotDetected,
      themeFrequency: Object.fromEntries(themeFrequency),
      responses_analyzed: responses.length,
    };
  }

  /**
   * Detect significant goal pivots in theme evolution
   */
  detectGoalPivot(themeEvolution) {
    if (themeEvolution.length < 3) return false;

    const recent = themeEvolution.slice(-2).flat();
    const earlier = themeEvolution.slice(0, -2).flat();

    const recentSet = new Set(recent);
    const earlierSet = new Set(earlier);

    // Calculate overlap
    const overlap = [...recentSet].filter(theme => earlierSet.has(theme)).length;
    const totalUnique = new Set([...recent, ...earlier]).size;

    const overlapRatio = totalUnique > 0 ? overlap / totalUnique : 1;

    return overlapRatio < CLARIFICATION_CONSTANTS.PIVOT_DETECTION_THRESHOLD;
  }

  /**
   * Update uncertainty map based on new response
   */
  updateUncertaintyMap(session, responseData) {
    const { themes, confidence } = responseData;

    themes.forEach(theme => {
      if (!session.uncertaintyMap[theme]) {
        session.uncertaintyMap[theme] = {
          appearances: 0,
          totalConfidence: 0,
          averageConfidence: 0,
          trend: 'stable',
        };
      }

      const themeData = session.uncertaintyMap[theme];
      themeData.appearances++;
      themeData.totalConfidence += confidence;
      themeData.averageConfidence = themeData.totalConfidence / themeData.appearances;

      // Simple trend analysis
      if (themeData.appearances > 1) {
        const previousConfidence = (themeData.totalConfidence - confidence) / (themeData.appearances - 1);
        if (confidence > previousConfidence + 0.1) {
          themeData.trend = 'increasing';
        } else if (confidence < previousConfidence - 0.1) {
          themeData.trend = 'decreasing';
        }
      }
    });
  }

  /**
   * Conclude clarification dialogue and generate refined goal
   */
  async concludeDialogue(session, convergenceAnalysis) {
    const { convergingThemes, confidence } = convergenceAnalysis;
    
    // Generate refined goal based on convergence analysis
    const refinedGoal = this.generateRefinedGoal(session, convergenceAnalysis);
    
    // Create evolution summary
    const evolutionSummary = this.createEvolutionSummary(session, refinedGoal);

    session.status = 'completed';
    session.refinedGoal = refinedGoal;
    session.finalConfidence = confidence;
    session.completedAt = new Date().toISOString();

    // Save final session
    await this.saveDialogueSession(session.projectId, session);

    // Generate recommendations for next steps
    const nextSteps = this.generateNextSteps(refinedGoal, convergingThemes);

    return {
      success: true,
      content: [
        {
          type: 'text',
          text: `**🎯 Goal Clarification Complete!**\n\n**Original Goal**: ${session.originalGoal}\n\n**Refined Goal**: ${refinedGoal.text}\n\n**Confidence Level**: ${Math.round(confidence * 100)}%\n\n**Key Themes Identified**: ${convergingThemes.join(', ')}\n\n**Evolution Summary**:\n${evolutionSummary}\n\n**Recommended Next Steps**:\n${nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n*Your clarified goal is ready to be used for building your HTA tree!*`,
        },
      ],
      dialogue_completed: true,
      refined_goal: refinedGoal,
      confidence: confidence,
      converging_themes: convergingThemes,
      evolution_summary: evolutionSummary,
      next_steps: nextSteps,
      session_id: session.id,
    };
  }

  /**
   * Generate refined goal from clarification dialogue
   */
  generateRefinedGoal(session, convergenceAnalysis) {
    const { convergingThemes, confidence } = convergenceAnalysis;
    const responses = session.responses;

    // Extract key elements from responses
    const goals = [];
    const motivations = [];
    const outcomes = [];

    responses.forEach(response => {
      const text = response.response;
      
      // Extract goal-like statements
      if (text.includes('want to') || text.includes('goal is') || text.includes('looking to')) {
        goals.push(text.split(/want to|goal is|looking to/)[1]?.trim().split(/[.!?]/)[0]);
      }

      // Extract motivations
      if (text.includes('because') || text.includes('so that') || text.includes('in order to')) {
        motivations.push(text.split(/because|so that|in order to/)[1]?.trim().split(/[.!?]/)[0]);
      }

      // Extract desired outcomes
      if (text.includes('success') || text.includes('achieve') || text.includes('accomplish')) {
        outcomes.push(text.match(/success.{0,50}|achieve.{0,50}|accomplish.{0,50}/)?.[0]);
      }
    });

    // Synthesize refined goal
    const primaryTheme = convergingThemes[0] || 'general development';
    const mainGoal = goals.filter(g => g && g.length > 5)[0] || session.originalGoal;
    const primaryMotivation = motivations.filter(m => m && m.length > 5)[0];

    let refinedText = mainGoal;
    
    // Enhance with theme and motivation if available
    if (primaryTheme !== 'general development') {
      refinedText = `${mainGoal} with focus on ${primaryTheme}`;
    }
    
    if (primaryMotivation) {
      refinedText += ` in order to ${primaryMotivation}`;
    }

    return {
      text: refinedText,
      themes: convergingThemes,
      confidence: confidence,
      source: 'clarification_dialogue',
      originalGoal: session.originalGoal,
      responseCount: responses.length,
    };
  }

  /**
   * Create evolution summary showing how goal understanding progressed
   */
  createEvolutionSummary(session, refinedGoal) {
    const responses = session.responses;
    const rounds = responses.length;

    const summary = [];
    summary.push(`• Started with ambiguous goal: "${session.originalGoal}"`);
    
    if (rounds >= 1) {
      summary.push(`• Round 1: Explored ${responses[0].themes.join(', ')} themes`);
    }
    
    if (rounds >= 2) {
      const newThemes = responses[1].themes.filter(t => !responses[0].themes.includes(t));
      if (newThemes.length > 0) {
        summary.push(`• Round 2: Discovered ${newThemes.join(', ')} focus areas`);
      } else {
        summary.push(`• Round 2: Reinforced initial themes`);
      }
    }
    
    if (rounds >= 3) {
      summary.push(`• Round 3+: Refined understanding through ${rounds - 2} additional exchanges`);
    }

    summary.push(`• Final: Converged on "${refinedGoal.text}" with ${Math.round(refinedGoal.confidence * 100)}% confidence`);

    return summary.join('\n');
  }

  /**
   * Generate actionable next steps based on refined goal
   */
  generateNextSteps(refinedGoal, themes) {
    const steps = [];

    // Always suggest building HTA tree
    steps.push(`Build your HTA tree using: \`build_hta_tree_forest\` with goal "${refinedGoal.text}"`);

    // Theme-specific recommendations
    if (themes.includes('career advancement')) {
      steps.push('Consider setting timeline milestones aligned with career goals');
    }

    if (themes.includes('web development') || themes.includes('mobile development')) {
      steps.push('Plan a portfolio project to demonstrate your learning progress');
    }

    if (themes.includes('urgent')) {
      steps.push('Set daily learning targets and track progress frequently');
    }

    if (themes.includes('gradual')) {
      steps.push('Establish consistent learning routines and longer-term milestones');
    }

    // Default recommendations
    steps.push('Use `get_next_task_forest` to begin with your first learning task');
    steps.push('Track your progress and use `evolve_strategy_forest` as your understanding deepens');

    return steps;
  }

  /**
   * Format convergence progress for user feedback
   */
  formatConvergenceProgress(convergenceAnalysis) {
    const { confidence, convergingThemes, status } = convergenceAnalysis;
    
    const progressBar = '█'.repeat(Math.round(confidence * 10)) + '░'.repeat(10 - Math.round(confidence * 10));
    
    return `${progressBar} ${Math.round(confidence * 100)}% confidence | Status: ${status} | Themes: ${convergingThemes.slice(0, 3).join(', ')}`;
  }

  /**
   * Save dialogue session to persistent storage
   */
  async saveDialogueSession(projectId, session) {
    try {
      const sessionData = {
        ...session,
        lastSaved: new Date().toISOString(),
      };

      await this.dataPersistence.saveProjectData(
        projectId,
        `clarification_dialogue_${session.id}.json`,
        sessionData
      );
    } catch (error) {
      console.error('Failed to save clarification dialogue session:', error.message);
    }
  }

  /**
   * Load existing dialogue session
   */
  async loadDialogueSession(projectId, dialogueId) {
    try {
      const sessionData = await this.dataPersistence.loadProjectData(
        projectId,
        `clarification_dialogue_${dialogueId}.json`
      );

      if (sessionData) {
        this.activeDialogues.set(dialogueId, sessionData);
        return sessionData;
      }
    } catch (error) {
      console.error('Failed to load clarification dialogue session:', error.message);
    }
    return null;
  }

  /**
   * Get all active dialogue sessions for a project
   */
  getActiveDialogues(projectId) {
    return Array.from(this.activeDialogues.values())
      .filter(session => session.projectId === projectId && session.status === 'active');
  }
}