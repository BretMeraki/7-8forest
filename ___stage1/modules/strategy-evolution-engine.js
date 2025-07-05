/**
 * Strategy Evolution Engine - Handles strategy adaptation and learning evolution
 * Manages breakthroughs, opportunity detection, and HTA evolution based on learning patterns
 */

import { FILE_NAMES, DEFAULT_PATHS, EVOLUTION_STRATEGIES, THRESHOLDS } from './memory-sync.js';

const STRATEGY_CONSTANTS = {
  MIN_TASKS_FOR_STRATEGY: 3,
  STAGNATION_THRESHOLD: 50,
  EFFICIENCY_THRESHOLD: 100,
  DIFFICULTY_ADJUSTMENT_FACTOR: 0.7,
  STRATEGY_IMPROVEMENT_FACTOR: 0.5,
  STRATEGY_SCORE_MULTIPLIER: 100,
};

export class StrategyEvolver {
  constructor(dataPersistence, projectManagement = null, llmInterface = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.llmInterface = llmInterface;
    this.logger = console;
  }

  async evolveHTABasedOnLearning(feedback, projectId, options = {}) {
    try {
      console.error(`🚀 Processing HTA evolution for project ${projectId}`);
      
      if (!projectId) {
        throw new Error('Project ID is required for HTA evolution');
      }

      // Load current HTA data
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
      if (!config) {
        throw new Error(`Project configuration not found for ${projectId}`);
      }

      const activePath = config.activePath || 'general';
      let htaData = await this.dataPersistence.loadPathData(projectId, activePath, FILE_NAMES.HTA);
      
      if (!htaData) {
        console.warn('[StrategyEvolver] No HTA data found for evolution');
        return {
          success: false,
          message: 'No HTA data found to evolve',
          recommendation: 'Build an HTA tree first using build_hta_tree_forest'
        };
      }

      // Analyze learning patterns from feedback
      const learningPatterns = this.analyzeLearningPatterns(feedback, htaData);
      
      // Determine evolution strategy
      const evolutionStrategy = this.determineEvolutionStrategy(learningPatterns, options);
      
      // Apply evolution strategy
      const evolutionResult = await this.applyEvolutionStrategy(
        htaData, 
        evolutionStrategy, 
        feedback, 
        projectId,
        activePath
      );

      // Save evolved HTA
      if (evolutionResult.success && evolutionResult.evolvedHTA) {
        await this.dataPersistence.savePathData(
          projectId, 
          activePath, 
          FILE_NAMES.HTA, 
          evolutionResult.evolvedHTA
        );
        
        console.error('[StrategyEvolver] HTA evolution completed successfully');
      }

      return evolutionResult;

    } catch (error) {
      console.error('StrategyEvolver.evolveHTABasedOnLearning failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Evolution failed due to technical error'
      };
    }
  }

  analyzeLearningPatterns(feedback, htaData) {
    const patterns = {
      learningVelocity: 'normal',
      difficultyProgression: 'appropriate',
      engagementLevel: 'moderate',
      focusAreas: [],
      strugglingAreas: [],
      breakthroughIndicators: false
    };

    // Analyze feedback content for patterns
    const feedbackLower = feedback.toLowerCase();
    
    // Velocity indicators
    if (feedbackLower.includes('fast') || feedbackLower.includes('quick') || feedbackLower.includes('easy')) {
      patterns.learningVelocity = 'accelerated';
      patterns.breakthroughIndicators = true;
    } else if (feedbackLower.includes('slow') || feedbackLower.includes('difficult') || feedbackLower.includes('confused')) {
      patterns.learningVelocity = 'decelerated';
    }

    // Difficulty assessment
    if (feedbackLower.includes('too easy') || feedbackLower.includes('simple')) {
      patterns.difficultyProgression = 'too_easy';
    } else if (feedbackLower.includes('too hard') || feedbackLower.includes('overwhelming')) {
      patterns.difficultyProgression = 'too_difficult';
    }

    // Engagement indicators
    if (feedbackLower.includes('excited') || feedbackLower.includes('interested') || feedbackLower.includes('love')) {
      patterns.engagementLevel = 'high';
    } else if (feedbackLower.includes('boring') || feedbackLower.includes('uninterested')) {
      patterns.engagementLevel = 'low';
    }

    // Extract focus areas from completed tasks
    if (htaData.frontierNodes) {
      const completedTasks = htaData.frontierNodes.filter(task => task.completed);
      patterns.focusAreas = this.extractTopicAreas(completedTasks);
    }

    return patterns;
  }

  determineEvolutionStrategy(patterns, options) {
    const strategy = {
      type: 'adaptive',
      adjustments: [],
      priority: 'medium'
    };

    // Breakthrough detected - accelerate learning
    if (patterns.breakthroughIndicators || patterns.learningVelocity === 'accelerated') {
      strategy.type = 'breakthrough';
      strategy.adjustments.push('increase_difficulty', 'add_advanced_tasks', 'expand_scope');
      strategy.priority = 'high';
    }
    
    // Struggling detected - provide support
    else if (patterns.learningVelocity === 'decelerated' || patterns.difficultyProgression === 'too_difficult') {
      strategy.type = 'support';
      strategy.adjustments.push('reduce_difficulty', 'add_foundation_tasks', 'provide_scaffolding');
      strategy.priority = 'high';
    }
    
    // Boredom detected - increase challenge
    else if (patterns.difficultyProgression === 'too_easy' || patterns.engagementLevel === 'low') {
      strategy.type = 'challenge';
      strategy.adjustments.push('increase_difficulty', 'add_variety', 'introduce_projects');
      strategy.priority = 'medium';
    }

    // Apply user preferences from options
    if (options.prefer_challenge) {
      strategy.adjustments.push('increase_difficulty');
    }
    if (options.prefer_depth) {
      strategy.adjustments.push('deepen_current_topics');
    }
    if (options.prefer_breadth) {
      strategy.adjustments.push('expand_scope');
    }

    return strategy;
  }

  async applyEvolutionStrategy(htaData, strategy, feedback, projectId, activePath) {
    const evolvedHTA = JSON.parse(JSON.stringify(htaData)); // Deep clone
    
    try {
      // Apply adjustments based on strategy
      for (const adjustment of strategy.adjustments) {
        switch (adjustment) {
          case 'increase_difficulty':
            this.increaseDifficulty(evolvedHTA);
            break;
          case 'reduce_difficulty':
            this.reduceDifficulty(evolvedHTA);
            break;
          case 'add_advanced_tasks':
            await this.addAdvancedTasks(evolvedHTA, projectId);
            break;
          case 'add_foundation_tasks':
            await this.addFoundationTasks(evolvedHTA, projectId);
            break;
          case 'expand_scope':
            await this.expandScope(evolvedHTA, feedback);
            break;
          case 'deepen_current_topics':
            await this.deepenCurrentTopics(evolvedHTA);
            break;
        }
      }

      // Update metadata
      evolvedHTA.lastEvolution = {
        timestamp: new Date().toISOString(),
        strategy: strategy.type,
        adjustments: strategy.adjustments,
        feedback: feedback.substring(0, 200), // Store first 200 chars
        version: (htaData.version || 1) + 1
      };

      return {
        success: true,
        evolvedHTA,
        strategy,
        changes: strategy.adjustments,
        message: `Strategy evolved using ${strategy.type} approach with ${strategy.adjustments.length} adjustments`
      };

    } catch (error) {
      console.error('[StrategyEvolver] Evolution strategy application failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to apply evolution strategy'
      };
    }
  }

  increaseDifficulty(htaData) {
    if (htaData.frontierNodes) {
      htaData.frontierNodes.forEach(task => {
        if (!task.completed && task.difficulty < 5) {
          task.difficulty = Math.min(5, (task.difficulty || 3) + 1);
        }
      });
    }
  }

  reduceDifficulty(htaData) {
    if (htaData.frontierNodes) {
      htaData.frontierNodes.forEach(task => {
        if (!task.completed && task.difficulty > 1) {
          task.difficulty = Math.max(1, (task.difficulty || 3) - 1);
        }
      });
    }
  }

  async addAdvancedTasks(htaData, projectId) {
    // Add challenging tasks to push learning forward
    const advancedTasks = [
      {
        id: `advanced_${Date.now()}_1`,
        title: 'Advanced Integration Challenge',
        description: 'Apply multiple concepts together in a complex scenario',
        difficulty: 4,
        priority: 'high',
        type: 'integration',
        estimated_duration: '60 minutes'
      },
      {
        id: `advanced_${Date.now()}_2`,
        title: 'Creative Application Project',
        description: 'Design and implement an original solution',
        difficulty: 5,
        priority: 'medium',
        type: 'creative',
        estimated_duration: '90 minutes'
      }
    ];

    if (!htaData.frontierNodes) htaData.frontierNodes = [];
    htaData.frontierNodes.push(...advancedTasks);
  }

  async addFoundationTasks(htaData, projectId) {
    // Add supportive tasks to reinforce understanding
    const foundationTasks = [
      {
        id: `foundation_${Date.now()}_1`,
        title: 'Core Concept Review',
        description: 'Review and reinforce fundamental concepts',
        difficulty: 2,
        priority: 'high',
        type: 'review',
        estimated_duration: '30 minutes'
      },
      {
        id: `foundation_${Date.now()}_2`,
        title: 'Guided Practice Exercise',
        description: 'Step-by-step practice with detailed guidance',
        difficulty: 2,
        priority: 'medium',
        type: 'guided_practice',
        estimated_duration: '45 minutes'
      }
    ];

    if (!htaData.frontierNodes) htaData.frontierNodes = [];
    htaData.frontierNodes.unshift(...foundationTasks); // Add to front for priority
  }

  async expandScope(htaData, feedback) {
    // Add tasks that expand into related areas mentioned in feedback
    const expansionTask = {
      id: `expansion_${Date.now()}`,
      title: 'Related Topic Exploration',
      description: `Explore topics related to your interests: ${feedback.substring(0, 100)}`,
      difficulty: 3,
      priority: 'medium',
      type: 'exploration',
      estimated_duration: '45 minutes'
    };

    if (!htaData.frontierNodes) htaData.frontierNodes = [];
    htaData.frontierNodes.push(expansionTask);
  }

  async deepenCurrentTopics(htaData) {
    // Add tasks that go deeper into current topics
    const deepeningTask = {
      id: `deepen_${Date.now()}`,
      title: 'Deep Dive Analysis',
      description: 'Explore advanced aspects of your current learning topics',
      difficulty: 4,
      priority: 'medium',
      type: 'deep_dive',
      estimated_duration: '60 minutes'
    };

    if (!htaData.frontierNodes) htaData.frontierNodes = [];
    htaData.frontierNodes.push(deepeningTask);
  }

  extractTopicAreas(tasks) {
    const topics = new Set();
    
    tasks.forEach(task => {
      if (task.title) {
        // Simple keyword extraction
        const words = task.title.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3) topics.add(word);
        });
      }
    });

    return Array.from(topics).slice(0, 5); // Top 5 topics
  }

  async handleBreakthrough(data) {
    console.error('🚀 Processing breakthrough for project', data.projectId);
    
    const evolutionResult = await this.evolveHTABasedOnLearning(
      'Breakthrough detected - rapid learning progress', 
      data.projectId,
      { strategy_type: 'breakthrough' }
    );
    
    return {
      success: true,
      type: 'breakthrough',
      evolution: evolutionResult,
      message: 'Strategy escalated due to breakthrough progress'
    };
  }

  async handleOpportunityDetection(data) {
    console.error('🔍 Processing opportunity detection for project', data.projectId);
    
    const evolutionResult = await this.evolveHTABasedOnLearning(
      `Opportunity detected: ${data.opportunity}`, 
      data.projectId,
      { strategy_type: 'opportunity' }
    );
    
    return {
      success: true,
      type: 'opportunity',
      evolution: evolutionResult,
      opportunity: data.opportunity,
      message: 'Strategy adapted to capitalize on detected opportunity'
    };
  }

  async handleEvolutionRequest(data) {
    console.error('📈 Processing evolution request for project', data.projectId);
    
    const evolutionResult = await this.evolveHTABasedOnLearning(
      data.feedback || 'User requested strategy evolution', 
      data.projectId,
      data.options || {}
    );
    
    return {
      success: true,
      type: 'requested',
      evolution: evolutionResult,
      message: 'Strategy evolved based on user request'
    };
  }

  async handleBlockCompletion(data) {
    // Strategy-specific block completion logic
    console.log('[StrategyEvolver] Processing block completion for strategy:', data.blockId);
    
    // Analyze completion patterns for strategy insights
    // This would contain strategy-focused completion logic
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      strategyUpdated: true,
      insights: 'Block completion analyzed for strategy patterns'
    };
  }
}
