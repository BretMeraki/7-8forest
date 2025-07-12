/**
 * Debug Agents Configuration
 * Central configuration for all debugging agents
 */

export const DEBUG_CONFIG = {
  // Agent Settings
  agents: {
    errorDetection: {
      enabled: true,
      scanInterval: 5000, // 5 seconds
      logFiles: [
        '.forest-data/forest-mcp.log',
        '.forest-data/forest-mcp-stderr.log',
        'error.log'
      ],
      errorPatterns: [
        /error/i,
        /failed/i,
        /exception/i,
        /crash/i,
        /fatal/i,
        /undefined is not/i,
        /cannot read property/i,
        /unhandled rejection/i
      ]
    },
    codeAnalysis: {
      enabled: true,
      scanInterval: 30000, // 30 seconds
      directories: [
        '___stage1/modules',
        '___stage1/utils',
        'modules'
      ],
      issuePatterns: {
        unusedVariables: /const\s+(\w+)\s*=.*\n(?!.*\1)/g,
        longFunctions: /function.*\{[\s\S]{500,}\}/g,
        complexConditions: /if\s*\([^)]{100,}\)/g,
        todoComments: /\/\/\s*(TODO|FIXME|HACK|BUG|XXX)/gi,
        console: /console\.(log|error|warn|debug)/g,
        hardcodedValues: /(localhost|127\.0\.0\.1|8000|3000|password|secret)/gi
      }
    },
    testCoverage: {
      enabled: true,
      scanInterval: 60000, // 1 minute
      coverageThreshold: 80,
      testDirectories: [
        '___stage1/modules/__tests__',
        'modules/__tests__',
        'test'
      ]
    },
    performance: {
      enabled: true,
      monitorInterval: 10000, // 10 seconds
      thresholds: {
        memoryUsageMB: 500,
        cpuUsagePercent: 80,
        responseTimeMs: 1000,
        errorRate: 0.05
      }
    },
    dependency: {
      enabled: true,
      checkInterval: 300000, // 5 minutes
      vulnerabilityCheck: true,
      outdatedCheck: true
    },
    selfHealing: {
      enabled: true,
      autoFix: true,
      fixableIssues: [
        'missing_semicolon',
        'unused_import',
        'formatting',
        'simple_type_error',
        'missing_await'
      ]
    }
  },

  // Communication Settings
  communication: {
    messageQueueSize: 1000,
    broadcastInterval: 2000,
    eventTypes: {
      ERROR_DETECTED: 'error_detected',
      ISSUE_FOUND: 'issue_found',
      PERFORMANCE_ALERT: 'performance_alert',
      TEST_FAILURE: 'test_failure',
      DEPENDENCY_ISSUE: 'dependency_issue',
      FIX_APPLIED: 'fix_applied',
      HEALTH_CHECK: 'health_check',
      REPORT_READY: 'report_ready'
    }
  },

  // Dashboard Settings
  dashboard: {
    port: 3001,
    updateInterval: 1000,
    historySize: 100,
    enableWebSocket: true
  },

  // Reporting Settings
  reporting: {
    outputDir: 'debug-reports',
    formats: ['json', 'html', 'markdown'],
    includeRecommendations: true,
    generateInterval: 300000 // 5 minutes
  },

  // Logging Settings
  logging: {
    level: 'info', // debug, info, warn, error
    outputFile: 'debug-agents/agent.log',
    maxFileSize: '10MB',
    maxFiles: 5
  }
};

// Agent Priority Levels
export const PRIORITY_LEVELS = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  INFO: 5
};

// Issue Severity Mapping
export const SEVERITY_MAP = {
  error: PRIORITY_LEVELS.CRITICAL,
  exception: PRIORITY_LEVELS.CRITICAL,
  failed: PRIORITY_LEVELS.HIGH,
  warning: PRIORITY_LEVELS.MEDIUM,
  deprecated: PRIORITY_LEVELS.LOW,
  info: PRIORITY_LEVELS.INFO
};
