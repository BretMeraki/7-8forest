/**
 * Forest System Constants
 * 
 * Essential system-wide constants for the Forest project management system.
 * As specified in PRD Section 3.1 - consolidated from various modules.
 */

// Tool Names - Core Forest Tools (PRD Section 4.0)
export const FOREST_TOOLS = {
  CREATE_PROJECT: 'create_project_forest',
  SWITCH_PROJECT: 'switch_project_forest', 
  LIST_PROJECTS: 'list_projects_forest',
  BUILD_HTA_TREE: 'build_hta_tree_forest',
  GET_HTA_STATUS: 'get_hta_status_forest',
  GET_NEXT_TASK: 'get_next_task_forest',
  COMPLETE_BLOCK: 'complete_block_forest',
  EVOLVE_STRATEGY: 'evolve_strategy_forest', // ⭐ CRITICAL
  CURRENT_STATUS: 'current_status_forest',
  GENERATE_DAILY_SCHEDULE: 'generate_daily_schedule_forest',
  SYNC_FOREST_MEMORY: 'sync_forest_memory_forest',
  ASK_TRUTHFUL_CLAUDE: 'ask_truthful_claude_forest'
};

// Strategic Branches (PRD Section 6.1.2)
export const STRATEGIC_BRANCHES = [
  'Foundation',
  'Research', 
  'Capability',
  'Implementation',
  'Mastery'
];

// HTA Constants
export const HTA_CONFIG = {
  MAX_TREE_DEPTH: 5,
  DEFAULT_COMPLEXITY_THRESHOLD: 5,
  FRONTIER_NODE_LIMIT: 10,
  SKELETON_TASK_COUNT: 3
};

// Strategy Evolution Constants  
export const STRATEGY_EVOLUTION = {
  BREAKTHROUGH_THRESHOLD: 0.8,
  OPPORTUNITY_DETECTION_WINDOW: 7, // days
  ADAPTATION_TRIGGER_COUNT: 3
};

// File System Constants
export const FILE_SYSTEM = {
  HTA_FILENAME: 'hta.json',
  CONFIG_FILENAME: 'config.json',
  LEARNING_HISTORY_FILENAME: 'learning_history.json',
  DAILY_SCHEDULE_PREFIX: 'day_'
};

// Data Validation Constants
export const VALIDATION = {
  MIN_PROJECT_ID_LENGTH: 3,
  MAX_PROJECT_ID_LENGTH: 50,
  MAX_GOAL_LENGTH: 500,
  MAX_TASK_TITLE_LENGTH: 200
};

// Default Values
export const DEFAULTS = {
  ENERGY_LEVEL: 3,
  DIFFICULTY_RATING: 3,
  FOCUS_DURATION: '25 minutes',
  TIME_AVAILABLE: '30 minutes'
};

// System Status Constants
export const SYSTEM_STATUS = {
  INITIALIZING: 'initializing',
  READY: 'ready', 
  PROCESSING: 'processing',
  ERROR: 'error',
  SHUTDOWN: 'shutdown'
};

// Error Types
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'ValidationError',
  PERSISTENCE_ERROR: 'PersistenceError', 
  HTA_ERROR: 'HTAError',
  STRATEGY_ERROR: 'StrategyError',
  MCP_ERROR: 'MCPError'
};

// Logging Levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO', 
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Memory Sync Constants
export const MEMORY_SYNC = {
  SYNC_INTERVAL: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 100,
  RETRY_ATTEMPTS: 3
};

// Project Status
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused', 
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

// Task Status
export const TASK_STATUS = {
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed', 
  BLOCKED: 'blocked',
  DEFERRED: 'deferred'
};

// Learning Outcomes
export const LEARNING_OUTCOMES = {
  MASTERED: 'mastered',
  PROGRESSING: 'progressing',
  STRUGGLING: 'struggling',
  BREAKTHROUGH: 'breakthrough'
};

// Priority Levels
export const PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  OPTIONAL: 5
};

// Time Constants
export const TIME = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7
};

// Version Information
export const VERSION = {
  SYSTEM_VERSION: '1.0.0-stage1',
  PRD_VERSION: '1.0',
  API_VERSION: 'v1'
};

// HTA Server Configuration
export const HTA_SERVER = {
  HTA_SERVER_URL: 'ws://localhost:8080/hta',
  HTA_CONNECTION_TIMEOUT: 10000, // 10 seconds
  HTA_REQUEST_TIMEOUT: 30000,    // 30 seconds
  HTA_RETRY_ATTEMPTS: 3,
  HTA_RECONNECT_DELAY: 5000      // 5 seconds
};

// Consolidated CONSTANTS object for backward compatibility
export const CONSTANTS = {
  ...HTA_SERVER,
  ...HTA_CONFIG,
  ...STRATEGY_EVOLUTION,
  ...FILE_SYSTEM,
  ...VALIDATION,
  ...DEFAULTS,
  ...SYSTEM_STATUS,
  ...ERROR_TYPES,
  ...LOG_LEVELS,
  ...MEMORY_SYNC,
  ...PROJECT_STATUS,
  ...TASK_STATUS,
  ...LEARNING_OUTCOMES,
  ...PRIORITY,
  ...TIME,
  ...VERSION
};
