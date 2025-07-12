/**
 * Agent Orchestrator
 * Coordinates all debugging agents and generates comprehensive reports
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';
import { ErrorDetectionAgent } from './error-detection-agent.js';
import { CodeAnalysisAgent } from './code-analysis-agent.js';
import { TestCoverageAgent } from './test-coverage-agent.js';
import { PerformanceAgent } from './performance-agent.js';
import { DependencyAgent } from './dependency-agent.js';
import { SelfHealingAgent } from './self-healing-agent.js';

export class AgentOrchestrator {
  constructor() {
    this.agentId = 'orchestrator';
    this.agents = new Map();
    this.systemStatus = {
      startTime: Date.now(),
      healthy: true,
      issues: [],
      performanceAlerts: [],
      metrics: {}
    };
    this.reportHistory = [];
    this.isRunning = false;
  }

  /**
   * Initialize all agents
   */
  async initialize() {
    console.log('[Orchestrator] Initializing debugging system...');
    
    // Register orchestrator
    agentCommunication.registerAgent(this.agentId, this);
    
    // Initialize communication system
    agentCommunication.start();
    
    // Create and initialize all agents
    const agentConfigs = [
      { id: 'error_detection', AgentClass: ErrorDetectionAgent },
      { id: 'code_analysis', AgentClass: CodeAnalysisAgent },
      { id: 'test_coverage', AgentClass: TestCoverageAgent },
      { id: 'performance', AgentClass: PerformanceAgent },
      { id: 'dependency', AgentClass: DependencyAgent },
      { id: 'self_healing', AgentClass: SelfHealingAgent }
    ];
    
    for (const config of agentConfigs) {
      try {
        const agent = new config.AgentClass();
        await agent.initialize();
        this.agents.set(config.id, agent);
        console.log(`[Orchestrator] Initialized ${config.id} agent`);
      } catch (error) {
        console.error(`[Orchestrator] Failed to initialize ${config.id}:`, error);
      }
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Create report directory
    await this.ensureReportDirectory();
    
    console.log('[Orchestrator] Initialization complete');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for health check updates
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.HEALTH_CHECK, (message) => {
      this.updateAgentStatus(message.from, message.data);
    });
    
    // Listen for critical issues
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.ERROR_DETECTED, (message) => {
      if (message.data.severity <= PRIORITY_LEVELS.HIGH) {
        this.handleCriticalIssue(message);
      }
    });
    
    // Listen for agent health
    agentCommunication.on('agents_unhealthy', (unhealthyAgents) => {
      this.handleUnhealthyAgents(unhealthyAgents);
    });

    // Listen for performance alerts
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.PERFORMANCE_ALERT, (message) => {
      this.handlePerformanceAlert(message);
    });
  }

  /**
   * Start all agents
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[Orchestrator] Starting all agents...');
    
    // Start each agent
    for (const [id, agent] of this.agents) {
      try {
        await agent.start();
        console.log(`[Orchestrator] Started ${id} agent`);
      } catch (error) {
        console.error(`[Orchestrator] Failed to start ${id}:`, error);
      }
    }
    
    // Start monitoring
    this.monitorInterval = setInterval(() => {
      this.monitorSystem();
    }, 10000); // Every 10 seconds
    
    // Start report generation
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, DEBUG_CONFIG.reporting.generateInterval);
    
    console.log('[Orchestrator] All agents started');
  }

  /**
   * Monitor system health
   */
  async monitorSystem() {
    agentCommunication.heartbeat(this.agentId);
    
    // Get system status
    const status = agentCommunication.getSystemStatus();
    
    // Check agent health
    const unhealthyAgents = [];
    for (const [agentId, agentStatus] of Object.entries(status.agents)) {
      if (agentStatus.status !== 'active') {
        unhealthyAgents.push(agentId);
      }
    }
    
    // Update system status
    this.systemStatus.healthy = unhealthyAgents.length === 0;
    this.systemStatus.unhealthyAgents = unhealthyAgents;
    this.systemStatus.lastCheck = Date.now();
    
    // Collect metrics
    await this.collectMetrics();
  }

  /**
   * Collect metrics from all agents
   */
  async collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      agents: {}
    };
    
    // Collect statistics from each agent
    for (const [id, agent] of this.agents) {
      if (agent.getStatistics) {
        try {
          metrics.agents[id] = agent.getStatistics();
        } catch (error) {
          console.error(`[Orchestrator] Failed to get statistics from ${id}:`, error);
        }
      }
    }
    
    this.systemStatus.metrics = metrics;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId, status) {
    if (!this.systemStatus.agentStatuses) {
      this.systemStatus.agentStatuses = {};
    }
    
    this.systemStatus.agentStatuses[agentId] = {
      ...status,
      lastUpdate: Date.now()
    };
  }

  /**
   * Handle performance alert
   */
  handlePerformanceAlert(message) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent: message.from,
      type: message.data.type,
      severity: message.data.severity,
      data: message.data,
      timestamp: Date.now()
    };

    if (!this.systemStatus.performanceAlerts) {
      this.systemStatus.performanceAlerts = [];
    }
    this.systemStatus.performanceAlerts.push(alert);

    // Keep only last 50 alerts
    if (this.systemStatus.performanceAlerts.length > 50) {
      this.systemStatus.performanceAlerts.shift();
    }

    // If critical, also mark unhealthy
    if (alert.severity <= PRIORITY_LEVELS.HIGH) {
      this.systemStatus.healthy = false;
    }
  }

  handleCriticalIssue(message) {
    const issue = {
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent: message.from,
      type: message.data.type,
      severity: message.data.severity,
      data: message.data,
      timestamp: Date.now()
    };
    
    this.systemStatus.issues.push(issue);
    
    // Keep only last 100 issues
    if (this.systemStatus.issues.length > 100) {
      this.systemStatus.issues.shift();
    }
    
    console.log(`[Orchestrator] Critical issue from ${message.from}: ${message.data.type}`);
  }

  /**
   * Handle unhealthy agents
   */
  async handleUnhealthyAgents(unhealthyAgents) {
    console.log(`[Orchestrator] Unhealthy agents detected: ${unhealthyAgents.join(', ')}`);
    
    // Try to restart unhealthy agents
    for (const agentId of unhealthyAgents) {
      const agent = this.agents.get(agentId);
      if (agent) {
        try {
          console.log(`[Orchestrator] Attempting to restart ${agentId}...`);
          agent.stop();
          await agent.initialize();
          await agent.start();
          console.log(`[Orchestrator] Successfully restarted ${agentId}`);
        } catch (error) {
          console.error(`[Orchestrator] Failed to restart ${agentId}:`, error);
        }
      }
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log('[Orchestrator] Generating comprehensive report...');
    
    const report = {
      id: `report_${Date.now()}`,
      timestamp: Date.now(),
      duration: Date.now() - this.systemStatus.startTime,
      systemHealth: this.systemStatus.healthy,
      summary: {},
      details: {},
      recommendations: [],
      criticalIssues: [],
      metrics: this.systemStatus.metrics
    };
    
    // Collect data from all agents
    for (const [id, agent] of this.agents) {
      if (agent.getStatistics) {
        report.details[id] = agent.getStatistics();
      }
    }
    
    // Generate summary
    report.summary = this.generateSummary(report.details);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    // Add critical issues
    report.criticalIssues = this.systemStatus.issues
      .filter(issue => issue.severity <= PRIORITY_LEVELS.HIGH)
      .sort((a, b) => a.severity - b.severity)
      .slice(0, 10);
    
    // Save report
    await this.saveReport(report);
    
    // Add to history
    this.reportHistory.push(report);
    if (this.reportHistory.length > 10) {
      this.reportHistory.shift();
    }
    
    // Notify about report
    agentCommunication.sendMessage(
      this.agentId,
      'broadcast',
      DEBUG_CONFIG.communication.eventTypes.REPORT_READY,
      {
        reportId: report.id,
        summary: report.summary,
        criticalIssues: report.criticalIssues.length,
        recommendations: report.recommendations.length
      }
    );
    
    console.log(`[Orchestrator] Report generated: ${report.id}`);
    
    return report;
  }

  /**
   * Generate summary from details
   */
  generateSummary(details) {
    const summary = {
      totalErrors: 0,
      totalCodeIssues: 0,
      testCoverage: 0,
      performanceScore: 100,
      dependencyHealth: 100,
      fixesApplied: 0
    };
    
    // Error detection summary
    if (details.error_detection) {
      summary.totalErrors = details.error_detection.totalErrors;
      summary.errorRate = details.error_detection.errorRate;
    }
    
    // Code analysis summary
    if (details.code_analysis) {
      summary.totalCodeIssues = details.code_analysis.totalIssues;
      summary.filesAnalyzed = details.code_analysis.filesAnalyzed;
    }
    
    // Test coverage summary
    if (details.test_coverage && details.test_coverage.coverage) {
      summary.testCoverage = parseFloat(details.test_coverage.coverage.functions.pct) || 0;
      summary.untestedFunctions = details.test_coverage.untested.functions;
    }
    
    // Performance summary
    if (details.performance && details.performance.current) {
      const cpuScore = Math.max(0, 100 - details.performance.current.cpu.usage);
      const memoryScore = Math.max(0, 100 - details.performance.current.memory.usagePercent);
      summary.performanceScore = (cpuScore + memoryScore) / 2;
    }
    
    // Dependency summary
    if (details.dependency) {
      const totalDeps = details.dependency.dependencies.total;
      const installedDeps = details.dependency.dependencies.installed;
      const vulns = details.dependency.vulnerabilities.total;
      
      summary.dependencyHealth = totalDeps > 0 
        ? ((installedDeps / totalDeps) * 100) - (vulns * 10)
        : 100;
      summary.dependencyHealth = Math.max(0, summary.dependencyHealth);
    }
    
    // Self-healing summary
    if (details.self_healing) {
      summary.fixesApplied = details.self_healing.successfulFixes;
      summary.fixSuccessRate = details.self_healing.successRate;
    }
    
    // Overall health score
    summary.overallHealth = this.calculateOverallHealth(summary);
    
    return summary;
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth(summary) {
    const weights = {
      errors: 0.3,
      codeQuality: 0.2,
      testCoverage: 0.2,
      performance: 0.15,
      dependencies: 0.15
    };
    
    const scores = {
      errors: summary.totalErrors === 0 ? 100 : Math.max(0, 100 - (summary.totalErrors * 5)),
      codeQuality: summary.totalCodeIssues === 0 ? 100 : Math.max(0, 100 - (summary.totalCodeIssues * 2)),
      testCoverage: summary.testCoverage,
      performance: summary.performanceScore,
      dependencies: summary.dependencyHealth
    };
    
    let weightedScore = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      weightedScore += (scores[metric] || 0) * weight;
    }
    
    return Math.round(weightedScore);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];
    const summary = report.summary;
    
    // Error recommendations
    if (summary.totalErrors > 10) {
      recommendations.push({
        priority: PRIORITY_LEVELS.HIGH,
        category: 'errors',
        message: `High error count (${summary.totalErrors}). Review error logs and fix critical issues.`,
        action: 'Review recent errors in the error detection report'
      });
    }
    
    // Code quality recommendations
    if (summary.totalCodeIssues > 50) {
      recommendations.push({
        priority: PRIORITY_LEVELS.MEDIUM,
        category: 'code_quality',
        message: `Many code issues detected (${summary.totalCodeIssues}). Consider code refactoring.`,
        action: 'Run code formatter and address high-complexity functions'
      });
    }
    
    // Test coverage recommendations
    if (summary.testCoverage < 80) {
      recommendations.push({
        priority: PRIORITY_LEVELS.MEDIUM,
        category: 'testing',
        message: `Low test coverage (${summary.testCoverage.toFixed(1)}%). Add tests for critical functions.`,
        action: 'Focus on testing untested critical functions first'
      });
    }
    
    // Performance recommendations
    if (summary.performanceScore < 70) {
      recommendations.push({
        priority: PRIORITY_LEVELS.HIGH,
        category: 'performance',
        message: 'Performance issues detected. System may be under stress.',
        action: 'Review performance bottlenecks and optimize slow operations'
      });
    }
    
    // Dependency recommendations
    if (summary.dependencyHealth < 80) {
      recommendations.push({
        priority: PRIORITY_LEVELS.HIGH,
        category: 'dependencies',
        message: 'Dependency issues detected. Security vulnerabilities may exist.',
        action: 'Run npm audit fix and update outdated packages'
      });
    }
    
    // Overall health recommendations
    if (summary.overallHealth < 70) {
      recommendations.push({
        priority: PRIORITY_LEVELS.CRITICAL,
        category: 'overall',
        message: 'System health is below acceptable levels. Immediate action required.',
        action: 'Address critical issues first, then work on medium priority items'
      });
    } else if (summary.overallHealth >= 90) {
      recommendations.push({
        priority: PRIORITY_LEVELS.LOW,
        category: 'overall',
        message: 'System health is excellent. Continue monitoring.',
        action: 'Maintain current practices and monitor for changes'
      });
    }
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);
    
    return recommendations;
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDirectory() {
    const reportDir = DEBUG_CONFIG.reporting.outputDir;
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch (error) {
      console.error('[Orchestrator] Failed to create report directory:', error);
    }
  }

  /**
   * Save report to file
   */
  async saveReport(report) {
    const reportDir = DEBUG_CONFIG.reporting.outputDir;
    
    for (const format of DEBUG_CONFIG.reporting.formats) {
      try {
        let content;
        let filename;
        
        switch (format) {
          case 'json':
            content = JSON.stringify(report, null, 2);
            filename = `${report.id}.json`;
            break;
            
          case 'html':
            content = this.generateHTMLReport(report);
            filename = `${report.id}.html`;
            break;
            
          case 'markdown':
            content = this.generateMarkdownReport(report);
            filename = `${report.id}.md`;
            break;
            
          default:
            continue;
        }
        
        const filepath = path.join(reportDir, filename);
        await fs.writeFile(filepath, content, 'utf8');
        console.log(`[Orchestrator] Saved ${format} report: ${filename}`);
        
      } catch (error) {
        console.error(`[Orchestrator] Failed to save ${format} report:`, error);
      }
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const summary = report.summary;
    const healthColor = summary.overallHealth >= 80 ? 'green' : 
                       summary.overallHealth >= 60 ? 'orange' : 'red';
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Debug Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .health-score { font-size: 48px; font-weight: bold; color: ${healthColor}; }
        .metric { display: inline-block; margin: 10px 20px; padding: 10px; background: #f0f0f0; border-radius: 4px; }
        .critical { color: red; }
        .warning { color: orange; }
        .good { color: green; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Debug System Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        
        <h2>Overall Health Score</h2>
        <div class="health-score">${summary.overallHealth}%</div>
        
        <h2>Summary</h2>
        <div class="metrics">
            <div class="metric">Errors: <strong>${summary.totalErrors}</strong></div>
            <div class="metric">Code Issues: <strong>${summary.totalCodeIssues}</strong></div>
            <div class="metric">Test Coverage: <strong>${summary.testCoverage.toFixed(1)}%</strong></div>
            <div class="metric">Performance: <strong>${summary.performanceScore.toFixed(1)}%</strong></div>
            <div class="metric">Dependencies: <strong>${summary.dependencyHealth.toFixed(1)}%</strong></div>
            <div class="metric">Fixes Applied: <strong>${summary.fixesApplied}</strong></div>
        </div>
        
        <h2>Recommendations</h2>
        <ul>`;
    
    for (const rec of report.recommendations) {
      const className = rec.priority === PRIORITY_LEVELS.CRITICAL ? 'critical' :
                       rec.priority === PRIORITY_LEVELS.HIGH ? 'warning' : '';
      html += `
            <li class="${className}">
                <strong>${rec.category}:</strong> ${rec.message}<br>
                <em>Action: ${rec.action}</em>
            </li>`;
    }
    
    html += `
        </ul>
        
        <h2>Critical Issues</h2>`;
    
    if (report.criticalIssues.length > 0) {
      html += `
        <table>
            <tr>
                <th>Type</th>
                <th>Agent</th>
                <th>Details</th>
                <th>Time</th>
            </tr>`;
      
      for (const issue of report.criticalIssues) {
        html += `
            <tr>
                <td>${issue.type}</td>
                <td>${issue.agent}</td>
                <td>${JSON.stringify(issue.data).substring(0, 100)}...</td>
                <td>${new Date(issue.timestamp).toLocaleTimeString()}</td>
            </tr>`;
      }
      
      html += `
        </table>`;
    } else {
      html += `<p>No critical issues detected.</p>`;
    }
    
    html += `
    </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report) {
    const summary = report.summary;
    
    let markdown = `# Debug System Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Overall Health Score: ${summary.overallHealth}%

## Summary

- **Total Errors**: ${summary.totalErrors}
- **Code Issues**: ${summary.totalCodeIssues}
- **Test Coverage**: ${summary.testCoverage.toFixed(1)}%
- **Performance Score**: ${summary.performanceScore.toFixed(1)}%
- **Dependency Health**: ${summary.dependencyHealth.toFixed(1)}%
- **Fixes Applied**: ${summary.fixesApplied}

## Recommendations

`;
    
    for (const rec of report.recommendations) {
      const priority = rec.priority === PRIORITY_LEVELS.CRITICAL ? '🔴' :
                      rec.priority === PRIORITY_LEVELS.HIGH ? '🟠' :
                      rec.priority === PRIORITY_LEVELS.MEDIUM ? '🟡' : '🟢';
      
      markdown += `### ${priority} ${rec.category}

**Issue**: ${rec.message}

**Action**: ${rec.action}

`;
    }
    
    markdown += `## Critical Issues

`;
    
    if (report.criticalIssues.length > 0) {
      markdown += `| Type | Agent | Time |
|------|-------|------|
`;
      
      for (const issue of report.criticalIssues) {
        markdown += `| ${issue.type} | ${issue.agent} | ${new Date(issue.timestamp).toLocaleTimeString()} |
`;
      }
    } else {
      markdown += `No critical issues detected.
`;
    }
    
    markdown += `
## Detailed Statistics

### Error Detection
\`\`\`json
${JSON.stringify(report.details.error_detection || {}, null, 2)}
\`\`\`

### Code Analysis
\`\`\`json
${JSON.stringify(report.details.code_analysis || {}, null, 2)}
\`\`\`

### Test Coverage
\`\`\`json
${JSON.stringify(report.details.test_coverage || {}, null, 2)}
\`\`\`

### Performance
\`\`\`json
${JSON.stringify(report.details.performance || {}, null, 2)}
\`\`\`

### Dependencies
\`\`\`json
${JSON.stringify(report.details.dependency || {}, null, 2)}
\`\`\`

### Self-Healing
\`\`\`json
${JSON.stringify(report.details.self_healing || {}, null, 2)}
\`\`\`
`;
    
    return markdown;
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    switch (message.type) {
      case 'get_status':
        return this.systemStatus;
        
      case 'get_report':
        if (this.reportHistory.length > 0) {
          return this.reportHistory[this.reportHistory.length - 1];
        }
        return null;
        
      case 'generate_report':
        return await this.generateReport();
        
      case 'restart_agent':
        if (message.data.agentId) {
          const agent = this.agents.get(message.data.agentId);
          if (agent) {
            agent.stop();
            await agent.initialize();
            await agent.start();
            return { success: true };
          }
        }
        return { success: false, error: 'Agent not found' };
    }
  }

  /**
   * Stop the orchestrator
   */
  stop() {
    this.isRunning = false;
    
    // Stop all agents
    for (const agent of this.agents.values()) {
      agent.stop();
    }
    
    // Clear intervals
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    
    // Stop communication system
    agentCommunication.stop();
    
    console.log('[Orchestrator] Stopped');
  }

  /**
   * Get orchestrator statistics
   */
  getStatistics() {
    return {
      uptime: Date.now() - this.systemStatus.startTime,
      systemHealth: this.systemStatus.healthy,
      activeAgents: this.agents.size,
      totalIssues: this.systemStatus.issues.length,
      reportsGenerated: this.reportHistory.length,
      lastReport: this.reportHistory.length > 0 
        ? this.reportHistory[this.reportHistory.length - 1].timestamp 
        : null
    };
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator();
