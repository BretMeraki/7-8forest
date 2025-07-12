/**
 * Debug Dashboard
 * Real-time web dashboard for monitoring all agents
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { promises as fs } from 'fs';
import path from 'path';
import { DEBUG_CONFIG } from './config.js';
import { agentCommunication } from './agent-communication.js';

export class DebugDashboard {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.port = DEBUG_CONFIG.dashboard.port;
    this.updateInterval = DEBUG_CONFIG.dashboard.updateInterval;
  }

  /**
   * Start the dashboard server
   */
  async start() {
    // Create HTTP server
    this.server = createServer(async (req, res) => {
      if (req.url === '/') {
        await this.serveDashboard(res);
      } else if (req.url === '/api/status') {
        await this.serveStatus(res);
      } else if (req.url === '/api/report') {
        await this.serveLatestReport(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Create WebSocket server
    if (DEBUG_CONFIG.dashboard.enableWebSocket) {
      this.wss = new WebSocketServer({ server: this.server });
      
      this.wss.on('connection', (ws) => {
        console.log('[Dashboard] New WebSocket connection');
        this.clients.add(ws);
        
        // Send initial status
        this.sendStatusUpdate(ws);
        
        ws.on('close', () => {
          this.clients.delete(ws);
          console.log('[Dashboard] WebSocket connection closed');
        });
        
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            await this.handleWebSocketMessage(ws, data);
          } catch (error) {
            console.error('[Dashboard] WebSocket message error:', error);
          }
        });
      });
    }

    // Start listening
    this.server.listen(this.port, () => {
      console.log(`[Dashboard] Server running at http://localhost:${this.port}`);
    });

    // Start update loop
    this.startUpdateLoop();

    // Listen for agent events
    this.setupEventListeners();
  }

  /**
   * Serve the dashboard HTML
   */
  async serveDashboard(res) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Forest Debug Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: #1a1a1a;
            padding: 20px;
            border-bottom: 2px solid #333;
            margin-bottom: 30px;
        }
        h1 {
            color: #4CAF50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .status-bar {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        .health-indicator {
            font-size: 3em;
            font-weight: bold;
        }
        .health-good { color: #4CAF50; }
        .health-warning { color: #ff9800; }
        .health-critical { color: #f44336; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .card h2 {
            color: #4CAF50;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #2a2a2a;
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-value {
            font-weight: bold;
            color: #fff;
        }
        .status-active { color: #4CAF50; }
        .status-inactive { color: #f44336; }
        .issues-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .issue {
            background: #2a2a2a;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 4px solid #f44336;
        }
        .issue.warning {
            border-left-color: #ff9800;
        }
        .issue.info {
            border-left-color: #2196F3;
        }
        .recommendations {
            background: #1e2a1e;
            border: 1px solid #2d4a2d;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .recommendation {
            padding: 10px;
            margin-bottom: 10px;
            background: #0a0a0a;
            border-radius: 4px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: background 0.2s;
        }
        button:hover {
            background: #45a049;
        }
        button:disabled {
            background: #666;
            cursor: not-allowed;
        }
        .log-viewer {
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            max-height: 400px;
            overflow-y: auto;
        }
        .log-entry {
            padding: 2px 0;
            white-space: pre-wrap;
        }
        .log-error { color: #f44336; }
        .log-warning { color: #ff9800; }
        .log-info { color: #2196F3; }
        .log-success { color: #4CAF50; }
        
        /* Animations */
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .updating {
            animation: pulse 1s infinite;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #1a1a1a;
        }
        ::-webkit-scrollbar-thumb {
            background: #4CAF50;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌲 Forest Debug Dashboard</h1>
            <div class="status-bar">
                <div>System Health: <span id="health-score" class="health-indicator">--</span></div>
                <div>Uptime: <span id="uptime">--</span></div>
                <div>Last Update: <span id="last-update">--</span></div>
            </div>
        </header>

        <div class="grid">
            <!-- Agent Status Cards -->
            <div class="card">
                <h2>🔍 Error Detection</h2>
                <div id="error-detection-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>📝 Code Analysis</h2>
                <div id="code-analysis-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🧪 Test Coverage</h2>
                <div id="test-coverage-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>⚡ Performance</h2>
                <div id="performance-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>📦 Dependencies</h2>
                <div id="dependency-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🔧 Self-Healing</h2>
                <div id="self-healing-status">
                    <div class="metric">
                        <span>Status</span>
                        <span class="metric-value status-inactive">Loading...</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🚨 Recent Issues</h2>
            <div id="issues-list" class="issues-list">
                <p>No issues detected</p>
            </div>
        </div>

        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            <div id="recommendations-list">
                <p>Loading recommendations...</p>
            </div>
        </div>

        <div class="controls">
            <button onclick="generateReport()">📊 Generate Report</button>
            <button onclick="clearIssues()">🗑️ Clear Issues</button>
            <button onclick="toggleAutoFix()" id="autofix-btn">🔧 Enable Auto-Fix</button>
            <button onclick="refreshStatus()">🔄 Refresh</button>
        </div>

        <div class="card" style="margin-top: 20px;">
            <h2>📜 Live Log</h2>
            <div id="log-viewer" class="log-viewer">
                <div class="log-entry log-info">Dashboard initialized...</div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let autoFixEnabled = false;

        // Initialize WebSocket connection
        function initWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

            ws.onopen = () => {
                addLog('Connected to debug server', 'success');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleUpdate(data);
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            };

            ws.onclose = () => {
                addLog('Disconnected from server. Reconnecting...', 'warning');
                setTimeout(initWebSocket, 3000);
            };

            ws.onerror = (error) => {
                addLog('WebSocket error: ' + error.message, 'error');
            };
        }

        // Handle status updates
        function handleUpdate(data) {
            if (data.type === 'status') {
                updateDashboard(data.data);
            } else if (data.type === 'log') {
                addLog(data.message, data.level);
            } else if (data.type === 'issue') {
                addIssue(data.data);
            }
        }

        // Update dashboard with new data
        function updateDashboard(status) {
            // Update health score
            const healthScore = status.summary?.overallHealth || 0;
            const healthElement = document.getElementById('health-score');
            healthElement.textContent = healthScore + '%';
            healthElement.className = 'health-indicator ' + 
                (healthScore >= 80 ? 'health-good' : 
                 healthScore >= 60 ? 'health-warning' : 'health-critical');

            // Update uptime
            if (status.uptime) {
                const hours = Math.floor(status.uptime / 3600000);
                const minutes = Math.floor((status.uptime % 3600000) / 60000);
                document.getElementById('uptime').textContent = \`\${hours}h \${minutes}m\`;
            }

            // Update last update time
            document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

            // Update agent statuses
            updateAgentStatus('error-detection', status.agents?.error_detection);
            updateAgentStatus('code-analysis', status.agents?.code_analysis);
            updateAgentStatus('test-coverage', status.agents?.test_coverage);
            updateAgentStatus('performance', status.agents?.performance);
            updateAgentStatus('dependency', status.agents?.dependency);
            updateAgentStatus('self-healing', status.agents?.self_healing);

            // Update issues
            if (status.issues) {
                updateIssues(status.issues);
            }

            // Update recommendations
            if (status.recommendations) {
                updateRecommendations(status.recommendations);
            }
        }

        // Update individual agent status
        function updateAgentStatus(agentId, data) {
            const container = document.getElementById(\`\${agentId}-status\`);
            if (!container || !data) return;

            let html = '';
            
            // Add status
            const statusClass = data.status === 'active' ? 'status-active' : 'status-inactive';
            html += \`<div class="metric">
                <span>Status</span>
                <span class="metric-value \${statusClass}">\${data.status || 'Unknown'}</span>
            </div>\`;

            // Add agent-specific metrics
            if (agentId === 'error-detection' && data.totalErrors !== undefined) {
                html += \`<div class="metric">
                    <span>Total Errors</span>
                    <span class="metric-value">\${data.totalErrors}</span>
                </div>\`;
                html += \`<div class="metric">
                    <span>Error Rate</span>
                    <span class="metric-value">\${data.errorRate || 0}/min</span>
                </div>\`;
            } else if (agentId === 'code-analysis' && data.totalIssues !== undefined) {
                html += \`<div class="metric">
                    <span>Code Issues</span>
                    <span class="metric-value">\${data.totalIssues}</span>
                </div>\`;
                html += \`<div class="metric">
                    <span>Files Analyzed</span>
                    <span class="metric-value">\${data.filesAnalyzed || 0}</span>
                </div>\`;
            } else if (agentId === 'test-coverage' && data.coverage) {
                html += \`<div class="metric">
                    <span>Coverage</span>
                    <span class="metric-value">\${data.coverage.functions || '0%'}</span>
                </div>\`;
                html += \`<div class="metric">
                    <span>Test Files</span>
                    <span class="metric-value">\${data.testFiles || 0}</span>
                </div>\`;
            } else if (agentId === 'performance' && data.metrics) {
                html += \`<div class="metric">
                    <span>CPU Usage</span>
                    <span class="metric-value">\${data.metrics.cpu?.current?.toFixed(1) || 0}%</span>
                </div>\`;
                html += \`<div class="metric">
                    <span>Memory Usage</span>
                    <span class="metric-value">\${data.metrics.memory?.current?.toFixed(1) || 0}%</span>
                </div>\`;
            } else if (agentId === 'dependency' && data.totalDependencies !== undefined) {
                html += \`<div class="metric">
                    <span>Dependencies</span>
                    <span class="metric-value">\${data.installedDependencies}/\${data.totalDependencies}</span>
                </div>\`;
                if (data.vulnerabilities) {
                    html += \`<div class="metric">
                        <span>Vulnerabilities</span>
                        <span class="metric-value" style="color: \${data.vulnerabilities.critical > 0 ? '#f44336' : '#4CAF50'}">\${data.vulnerabilities.total || 0}</span>
                    </div>\`;
                }
            } else if (agentId === 'self-healing' && data.fixesApplied !== undefined) {
                html += \`<div class="metric">
                    <span>Fixes Applied</span>
                    <span class="metric-value">\${data.fixesApplied}</span>
                </div>\`;
                html += \`<div class="metric">
                    <span>Queue Size</span>
                    <span class="metric-value">\${data.queueSize || 0}</span>
                </div>\`;
            }

            container.innerHTML = html;
        }

        // Update issues list
        function updateIssues(issues) {
            const container = document.getElementById('issues-list');
            if (issues.length === 0) {
                container.innerHTML = '<p>No issues detected</p>';
                return;
            }

            let html = '';
            issues.slice(0, 10).forEach(issue => {
                const severityClass = issue.severity <= 2 ? '' : 
                                     issue.severity === 3 ? 'warning' : 'info';
                html += \`<div class="issue \${severityClass}">
                    <strong>\${issue.type}</strong> - \${issue.agent}<br>
                    <small>\${new Date(issue.timestamp).toLocaleTimeString()}</small>
                </div>\`;
            });

            container.innerHTML = html;
        }

        // Add single issue
        function addIssue(issue) {
            const container = document.getElementById('issues-list');
            const severityClass = issue.severity <= 2 ? '' : 
                                 issue.severity === 3 ? 'warning' : 'info';
            
            const issueHtml = \`<div class="issue \${severityClass}">
                <strong>\${issue.type}</strong> - \${issue.agent}<br>
                <small>\${new Date(issue.timestamp).toLocaleTimeString()}</small>
            </div>\`;

            // Remove "No issues" message if present
            if (container.innerHTML.includes('No issues detected')) {
                container.innerHTML = '';
            }

            // Add new issue at the top
            container.insertAdjacentHTML('afterbegin', issueHtml);

            // Keep only last 10 issues
            while (container.children.length > 10) {
                container.removeChild(container.lastChild);
            }
        }

        // Update recommendations
        function updateRecommendations(recommendations) {
            const container = document.getElementById('recommendations-list');
            if (recommendations.length === 0) {
                container.innerHTML = '<p>No recommendations at this time.</p>';
                return;
            }

            let html = '';
            recommendations.forEach(rec => {
                html += \`<div class="recommendation">
                    <strong>\${rec.category}:</strong> \${rec.message}<br>
                    <em>Action: \${rec.action}</em>
                </div>\`;
            });

            container.innerHTML = html;
        }

        // Add log entry
        function addLog(message, level = 'info') {
            const viewer = document.getElementById('log-viewer');
            const entry = document.createElement('div');
            entry.className = \`log-entry log-\${level}\`;
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            viewer.appendChild(entry);

            // Keep only last 100 entries
            while (viewer.children.length > 100) {
                viewer.removeChild(viewer.firstChild);
            }

            // Scroll to bottom
            viewer.scrollTop = viewer.scrollHeight;
        }

        // Control functions
        function generateReport() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'generate_report' }));
                addLog('Generating report...', 'info');
            }
        }

        function clearIssues() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'clear_issues' }));
                document.getElementById('issues-list').innerHTML = '<p>No issues detected</p>';
                addLog('Issues cleared', 'success');
            }
        }

        function toggleAutoFix() {
            autoFixEnabled = !autoFixEnabled;
            const btn = document.getElementById('autofix-btn');
            btn.textContent = autoFixEnabled ? '🔧 Disable Auto-Fix' : '🔧 Enable Auto-Fix';
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    action: 'toggle_autofix', 
                    enabled: autoFixEnabled 
                }));
                addLog(\`Auto-fix \${autoFixEnabled ? 'enabled' : 'disabled'}\`, 'info');
            }
        }

        function refreshStatus() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'refresh' }));
                addLog('Refreshing status...', 'info');
            }
        }

        // Initialize on load
        window.onload = () => {
            initWebSocket();
            
            // Fallback to polling if WebSocket not available
            if (!window.WebSocket) {
                addLog('WebSocket not supported, using polling', 'warning');
                setInterval(() => {
                    fetch('/api/status')
                        .then(res => res.json())
                        .then(data => updateDashboard(data))
                        .catch(err => addLog('Failed to fetch status: ' + err.message, 'error'));
                }, 5000);
            }
        };
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve current status as JSON
   */
  async serveStatus(res) {
    const status = await this.getFullStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  /**
   * Serve latest report
   */
  async serveLatestReport(res) {
    const report = this.orchestrator.reportHistory[this.orchestrator.reportHistory.length - 1] || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report));
  }

  /**
   * Get full system status
   */
  async getFullStatus() {
    const systemStatus = this.orchestrator.systemStatus;
    const agentStatuses = systemStatus.agentStatuses || {};
    const metrics = systemStatus.metrics || {};
    
    // Get latest report summary
    const latestReport = this.orchestrator.reportHistory[this.orchestrator.reportHistory.length - 1];
    const summary = latestReport ? latestReport.summary : {};
    
    return {
      timestamp: Date.now(),
      uptime: Date.now() - systemStatus.startTime,
      healthy: systemStatus.healthy,
      summary,
      agents: agentStatuses,
      issues: systemStatus.issues.slice(-10), // Last 10 issues
      recommendations: latestReport ? latestReport.recommendations.slice(0, 5) : [],
      metrics
    };
  }

  /**
   * Handle WebSocket messages
   */
  async handleWebSocketMessage(ws, data) {
    switch (data.action) {
      case 'refresh':
        await this.sendStatusUpdate(ws);
        break;
        
      case 'generate_report':
        const report = await this.orchestrator.generateReport();
        ws.send(JSON.stringify({
          type: 'log',
          message: `Report generated: ${report.id}`,
          level: 'success'
        }));
        break;
        
      case 'clear_issues':
        this.orchestrator.systemStatus.issues = [];
        ws.send(JSON.stringify({
          type: 'log',
          message: 'Issues cleared',
          level: 'success'
        }));
        break;
        
      case 'toggle_autofix':
        agentCommunication.sendMessage(
          'dashboard',
          'self_healing',
          'toggle_autofix',
          { enabled: data.enabled }
        );
        break;
    }
  }

  /**
   * Send status update to a client
   */
  async sendStatusUpdate(ws) {
    const status = await this.getFullStatus();
    ws.send(JSON.stringify({
      type: 'status',
      data: status
    }));
  }

  /**
   * Broadcast update to all clients
   */
  broadcastUpdate(data) {
    const message = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }
  }

  /**
   * Start update loop
   */
  startUpdateLoop() {
    setInterval(async () => {
      const status = await this.getFullStatus();
      this.broadcastUpdate({
        type: 'status',
        data: status
      });
    }, this.updateInterval);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for critical events
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.ERROR_DETECTED, (message) => {
      this.broadcastUpdate({
        type: 'issue',
        data: {
          type: message.data.type || 'error',
          agent: message.from,
          severity: message.data.severity,
          timestamp: Date.now()
        }
      });
    });
    
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.FIX_APPLIED, (message) => {
      this.broadcastUpdate({
        type: 'log',
        message: `Fix applied: ${message.data.result.change}`,
        level: 'success'
      });
    });
    
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.PERFORMANCE_ALERT, (message) => {
      this.broadcastUpdate({
        type: 'log',
        message: `Performance alert: ${message.data.type}`,
        level: 'warning'
      });
    });
  }

  /**
   * Stop the dashboard
   */
  stop() {
    if (this.server) {
      this.server.close();
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('[Dashboard] Stopped');
  }
}
