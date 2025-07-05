/**
 * Memory Sync Module - Consolidated Memory Operations & Constants
 * Optimized from memory-sync.js and constants.js - Preserves memory synchronization and configuration
 */

// Use stderr for logging to avoid interfering with MCP JSON-RPC on stdout
const loggerModule = {
  getLogger: async () => ({
    debug: (...args) => console.error('[DEBUG]', ...args),
    info: (...args) => console.error('[INFO]', ...args),
    warn: (...args) => console.error('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
  }),
};

// ===== CONSTANTS =====

export const FILE_NAMES = {
  CONFIG: 'config.json',
  HTA: 'hta.json',
  LEARNING_HISTORY: 'learning-history.json',
  DAILY_SCHEDULE: 'daily-schedule.json',
  COMPLETION_LOG: 'completion-log.json',
  STRATEGY_EVOLUTION: 'strategy-evolution.json',
};

export const DEFAULT_PATHS = {
  GENERAL: 'general',
};

export const FEATURE_FLAGS = {
  DEEP_HTA_ENABLED: true,
  ADAPTIVE_COMPLEXITY: true,
  ENHANCED_CONTEXT: true,
  BREAKTHROUGH_DETECTION: true,
};

export const HTA_LEVELS = {
  MIN_DEPTH: 3,
  MAX_DEPTH: 8,
  DEFAULT_DEPTH: 5,
  COMPLEXITY_MULTIPLIER: 1.2,
};

export const TASK_CONFIG = {
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  DEFAULT_DIFFICULTY: 5,
  MIN_ENERGY_LEVEL: 1,
  MAX_ENERGY_LEVEL: 10,
  DEFAULT_ENERGY_LEVEL: 5,
  MIN_DURATION: 15,
  MAX_DURATION: 240,
  DEFAULT_DURATION: 60,
};

export const SCORING = {
  ADAPTIVE_TASK_BOOST: 1000,
  FINANCIAL_SCALE_LARGE: 1000000,
  FINANCIAL_SCALE_MEDIUM: 10000,
  FINANCIAL_SCALE_SMALL: 1000,
  TEAM_SIZE_LARGE: 10,
  TEAM_SIZE_MEDIUM: 5,
  TEAM_SIZE_SMALL: 2,
  COMPLEXITY_BOOST_MULTIPLIER: 1.5,
  BREAKTHROUGH_AMPLIFICATION_BONUS: 100,
  GENERATED_TASK_BOOST: 25,
};

export const THRESHOLDS = {
  LOW_ENGAGEMENT: 2.5,
  RECENT_DAYS: 7,
  MIN_TASKS_FOR_ANALYSIS: 3,
  COMPLEXITY_ESCALATION: 2,
  STUCK_TASK_COUNT: 3,
};

export const EVOLUTION_STRATEGIES = {
  ESCALATE: 'escalate_after_breakthrough',
  ADAPT_BUDGET: 'adapt_to_zero_budget',
  ADAPT_CAREGIVING: 'adapt_to_caregiving',
};

export const COMPLEXITY_THRESHOLDS = {
  BEGINNER: { min: 1, max: 3 },
  INTERMEDIATE: { min: 4, max: 6 },
  ADVANCED: { min: 7, max: 8 },
  EXPERT: { min: 9, max: 10 },
};

export const URGENCY_MULTIPLIERS = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  critical: 1.6,
};

export const PACING_THRESHOLDS = {
  BEHIND: -15,
  ON_TRACK: 15,
  AHEAD: 15,
};

export const ENGAGEMENT_THRESHOLDS = {
  LOW: 4,
  MEDIUM: 7,
  HIGH: 9,
};

export const DIFFICULTY_PROGRESSION = {
  REDUCTION_THRESHOLD: 0.3,
  INCREASE_THRESHOLD: 0.8,
  MAX_JUMP: 2,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
};

const MEMORY_SYNC_CONSTANTS = {
  FINANCIAL_SCALE_SMALL: 1000,
  TEAM_SIZE_LARGE: 10,
  TEAM_SIZE_MEDIUM: 5,
  TEAM_SIZE_SMALL: 2,
  COMPLEXITY_BOOST_MULTIPLIER: 1.5,
  BREAKTHROUGH_AMPLIFICATION_BONUS: 100,
  GENERATED_TASK_BOOST: 25,
};

export const BREAKTHROUGH_SCORING = {
  WEIGHTS: {
    engagement: 0.3,
    difficulty: 0.2,
    learned_content: 0.25,
    questions_generated: 0.15,
    time_efficiency: 0.1,
  },
  THRESHOLDS: {
    MINOR: 6,
    MAJOR: 8,
    EXCEPTIONAL: 9.5,
  },
};

export const STRATEGY_EVOLUTION_CONFIG = {
  MIN_COMPLETIONS_FOR_ANALYSIS: 5,
  PATTERN_CONFIDENCE_THRESHOLD: 0.7,
  MAX_STRATEGY_CHANGES_PER_WEEK: 2,
  EVOLUTION_COOLDOWN_HOURS: 24,
};

export const HTA_GENERATION_LIMITS = {
  MAX_TASKS_PER_BRANCH: 50,
  MAX_BRANCH_DEPTH: 5,
  MIN_TASKS_FOR_FRONTIER: 3,
  MAX_FRONTIER_SIZE: 20,
};

export const CACHE_CONFIG = {
  DEFAULT_TTL: 300000, // 5 minutes
  MAX_CACHE_SIZE: 1000,
  CLEANUP_INTERVAL: 60000, // 1 minute
};

export const LOGGING_CONFIG = {
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  LOG_ROTATION_COUNT: 5,
  DEBUG_ENABLED: process.env.NODE_ENV !== 'production',
};

export const TASK_STRATEGY_CONSTANTS = {
  STAGNATION_THRESHOLD: 100,
  EFFICIENCY_THRESHOLD: 200,
  DIFFICULTY_ADJUSTMENT_FACTOR: 0.7,
  STRATEGY_IMPROVEMENT_FACTOR: 0.6,
};

// ===== MEMORY SYNC CLASS =====

export class MemorySync {
  constructor(dataPersistence) {
    this.dataPersistence = dataPersistence;
    this.logger = null; // Will be initialized lazily
    this.syncQueue = [];
    this.isSyncing = false;
    this.lastSyncTime = null;
  }

  async getLogger() {
    if (!this.logger) {
      this.logger = await loggerModule.getLogger();
    }
    return this.logger;
  }

  async syncForestMemory(projectId, pathName = DEFAULT_PATHS.GENERAL) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required for memory sync');
      }
      
      const logger = await this.getLogger();
      logger.info('[MemorySync] Starting Forest memory sync', { projectId, pathName });

      // Load current project state
      const projectConfig = await this.dataPersistence.loadProjectData(
        projectId,
        FILE_NAMES.CONFIG
      );
      if (!projectConfig) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Load HTA data - always use path-based storage for consistency
      const htaData = await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);

      // Load learning history - always use path-based storage for consistency
      const learningHistory = await this.dataPersistence.loadPathData(
        projectId,
        pathName,
        FILE_NAMES.LEARNING_HISTORY
      );

      // Load completion log - always use path-based storage for consistency
      const completionLog = await this.dataPersistence.loadPathData(
        projectId,
        pathName,
        FILE_NAMES.COMPLETION_LOG
      );

      // Create memory context
      const memoryContext = this.createMemoryContext({
        projectConfig,
        htaData,
        learningHistory,
        completionLog,
        pathName,
      });

      // Format for memory storage
      const memoryContent = this.formatMemoryContent(memoryContext);

      logger.info('[MemorySync] Forest memory sync completed', {
        projectId,
        pathName,
        contextSize: JSON.stringify(memoryContext).length,
      });

      return {
        content: [
          {
            type: 'text',
            text:
              `**Forest Memory Synced** 🧠✨\n\n` +
              `**Project**: ${projectConfig.goal}\n` +
              `**Path**: ${pathName}\n` +
              `**Progress**: ${projectConfig.progress || 0}%\n` +
              `**Tasks Available**: ${htaData?.frontierNodes?.length || 0}\n` +
              `**Completed Topics**: ${learningHistory?.completedTopics?.length || 0}\n\n` +
              `Memory context updated for enhanced task recommendations!`,
          },
        ],
        memory_context: memoryContext,
        formatted_content: memoryContent,
      };
    } catch (error) {
      const logger = await this.getLogger();
      logger.error('[MemorySync] Forest memory sync failed', {
        projectId,
        pathName,
        error: error.message,
      });

      return {
        content: [
          {
            type: 'text',
            text: `**Memory Sync Failed** ❌\n\nError: ${error.message}\n\nPlease try again or check project status.`,
          },
        ],
        error: error.message,
      };
    }
  }

  createMemoryContext({ projectConfig, htaData, learningHistory, completionLog, pathName }) {
    const context = {
      project: {
        id: projectConfig.id,
        goal: projectConfig.goal,
        urgency: projectConfig.urgency_level,
        progress: projectConfig.progress || 0,
        activePath: pathName,
        created: projectConfig.created_at,
      },
      learning: {
        completedTopics: learningHistory?.completedTopics || [],
        totalHours: learningHistory?.totalHours || 0,
        streakDays: learningHistory?.streakDays || 0,
        lastActivity: learningHistory?.lastActivity,
      },
      tasks: {
        available: htaData?.frontierNodes?.length || 0,
        completed: completionLog?.completions?.length || 0,
        inProgress: htaData?.frontierNodes?.filter(n => n.status === 'in_progress')?.length || 0,
      },
      patterns: this.extractLearningPatterns(completionLog),
      preferences: {
        focusDuration: projectConfig.life_structure_preferences?.focus_duration,
        energyPatterns: projectConfig.constraints?.energy_patterns,
        timeConstraints: projectConfig.constraints?.time_constraints,
      },
      timestamp: new Date().toISOString(),
    };

    return context;
  }

  extractLearningPatterns(completionLog) {
    if (!completionLog?.completions || completionLog.completions.length === 0) {
      return {
        averageEngagement: 0,
        preferredDifficulty: 3,
        breakthroughRate: 0,
        velocityTrend: 'stable',
      };
    }

    const completions = completionLog.completions;
    const recent = completions.slice(-10); // Last 10 completions

    const avgEngagement =
      recent.reduce((sum, c) => sum + (c.engagement_level || 5), 0) / recent.length;
    const avgDifficulty =
      recent.reduce((sum, c) => sum + (c.difficulty_rating || 3), 0) / recent.length;
    const breakthroughs = recent.filter(c => c.breakthrough).length;
    const breakthroughRate = breakthroughs / recent.length;

    // Simple velocity trend analysis
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstHalfAvgTime =
      firstHalf.reduce((sum, c) => sum + (c.duration || 30), 0) / firstHalf.length;
    const secondHalfAvgTime =
      secondHalf.reduce((sum, c) => sum + (c.duration || 30), 0) / secondHalf.length;

    let velocityTrend = 'stable';
    if (secondHalfAvgTime < firstHalfAvgTime * 0.8) {
      velocityTrend = 'improving';
    } else if (secondHalfAvgTime > firstHalfAvgTime * 1.2) {
      velocityTrend = 'declining';
    }

    return {
      averageEngagement: Math.round(avgEngagement * 10) / 10,
      preferredDifficulty: Math.round(avgDifficulty),
      breakthroughRate: Math.round(breakthroughRate * 100) / 100,
      velocityTrend,
    };
  }

  formatMemoryContent(context) {
    const { project, learning, tasks, patterns, preferences } = context;

    let content = `# Forest Learning Context - ${project.goal}\n\n`;

    content += `## Project Overview\n`;
    content += `- **Goal**: ${project.goal}\n`;
    content += `- **Progress**: ${project.progress}%\n`;
    content += `- **Urgency**: ${project.urgency}\n`;
    content += `- **Active Path**: ${project.activePath}\n\n`;

    content += `## Learning Status\n`;
    content += `- **Completed Topics**: ${learning.completedTopics.length}\n`;
    content += `- **Total Hours**: ${learning.totalHours}\n`;
    content += `- **Current Streak**: ${learning.streakDays} days\n`;
    if (learning.lastActivity) {
      content += `- **Last Activity**: ${new Date(learning.lastActivity).toLocaleDateString()}\n`;
    }
    content += '\n';

    content += `## Task Pipeline\n`;
    content += `- **Available Tasks**: ${tasks.available}\n`;
    content += `- **Completed Tasks**: ${tasks.completed}\n`;
    content += `- **In Progress**: ${tasks.inProgress}\n\n`;

    content += `## Learning Patterns\n`;
    content += `- **Average Engagement**: ${patterns.averageEngagement}/10\n`;
    content += `- **Preferred Difficulty**: ${patterns.preferredDifficulty}/10\n`;
    content += `- **Breakthrough Rate**: ${Math.round(patterns.breakthroughRate * 100)}%\n`;
    content += `- **Velocity Trend**: ${patterns.velocityTrend}\n\n`;

    if (preferences.focusDuration || preferences.energyPatterns) {
      content += `## Preferences & Constraints\n`;
      if (preferences.focusDuration) {
        content += `- **Focus Duration**: ${preferences.focusDuration}\n`;
      }
      if (preferences.energyPatterns) {
        content += `- **Energy Patterns**: ${preferences.energyPatterns}\n`;
      }
      if (preferences.timeConstraints) {
        content += `- **Time Constraints**: ${preferences.timeConstraints}\n`;
      }
      content += '\n';
    }

    content += `---\n*Context updated: ${new Date(context.timestamp).toLocaleString()}*`;

    return content;
  }

  async queueSync(projectId, pathName, priority = 'normal') {
    const syncItem = {
      projectId,
      pathName,
      priority,
      timestamp: Date.now(),
    };

    this.syncQueue.push(syncItem);

    // Sort by priority and timestamp
    this.syncQueue.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return a.timestamp - b.timestamp;
    });

    const logger = await this.getLogger();
    logger.debug('[MemorySync] Sync queued', { projectId, pathName, priority });

    // Process queue if not already syncing
    if (!this.isSyncing) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const syncItem = this.syncQueue.shift();
        await this.syncForestMemory(syncItem.projectId, syncItem.pathName);

        // Small delay between syncs to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.lastSyncTime = Date.now();
    } catch (error) {
      const logger = await this.getLogger();
      logger.error('[MemorySync] Queue processing failed', {
        error: error.message,
        remainingItems: this.syncQueue.length,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      lastSyncAgo: this.lastSyncTime ? Date.now() - this.lastSyncTime : null,
    };
  }

  async clearQueue() {
    this.syncQueue = [];
    const logger = await this.getLogger();
    logger.debug('[MemorySync] Sync queue cleared');
  }
}
