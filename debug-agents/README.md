# 🌲 Forest Debug Agents System

A comprehensive multi-agent debugging system for the Forest MCP Server. This system deploys 7 specialized AI agents that work together to monitor, analyze, and automatically fix issues in your codebase.

## 🤖 Agent Overview

### 1. **Error Detection Agent** 🔍
- Monitors log files in real-time
- Detects errors, exceptions, and crashes
- Extracts error context and stack traces
- Tracks error patterns and frequency

### 2. **Code Analysis Agent** 📝
- Performs static code analysis
- Identifies code quality issues
- Detects complexity and maintainability problems
- Finds unused code and potential bugs

### 3. **Test Coverage Agent** 🧪
- Analyzes test coverage metrics
- Identifies untested functions
- Monitors test execution and failures
- Suggests critical functions needing tests

### 4. **Performance Agent** ⚡
- Monitors CPU and memory usage
- Tracks response times and throughput
- Detects performance bottlenecks
- Identifies memory leaks and resource issues

### 5. **Dependency Agent** 📦
- Validates all project dependencies
- Checks for security vulnerabilities
- Identifies outdated packages
- Detects circular dependencies

### 6. **Self-Healing Agent** 🔧
- Automatically fixes common issues
- Applies code formatting fixes
- Resolves simple type errors
- Installs missing dependencies

### 7. **Orchestrator Agent** 🎯
- Coordinates all other agents
- Generates comprehensive reports
- Manages agent health and restarts
- Provides system-wide recommendations

## 🚀 Quick Start

### Installation

```bash
# Ensure you're in the project root
cd /Users/bretmeraki/Downloads/7-3forest-main

# Install dependencies (if needed)
npm install ws
```

### Starting the Debug System

```bash
# Start all agents with dashboard
node start-debug-agents.js

# Start without dashboard
node start-debug-agents.js --no-dashboard

# Generate a single report
node start-debug-agents.js --report-only

# Run only self-healing fixes
node start-debug-agents.js --fix-only
```

### Accessing the Dashboard

Once started, open your browser to:
```
http://localhost:3001
```

## 📊 Dashboard Features

The real-time dashboard provides:

- **System Health Score**: Overall health percentage (0-100%)
- **Agent Status Cards**: Live status for each agent
- **Recent Issues**: Real-time issue detection
- **Recommendations**: Actionable improvement suggestions
- **Live Log Viewer**: Streaming log entries
- **Control Panel**: Generate reports, toggle auto-fix, etc.

## 📁 Generated Reports

Reports are saved in multiple formats:
- `debug-reports/report_[timestamp].json` - Raw JSON data
- `debug-reports/report_[timestamp].html` - Interactive HTML report
- `debug-reports/report_[timestamp].md` - Markdown documentation

## ⚙️ Configuration

Edit `debug-agents/config.js` to customize:

```javascript
// Agent intervals
agents: {
  errorDetection: {
    scanInterval: 5000, // 5 seconds
    logFiles: ['error.log', 'app.log']
  },
  codeAnalysis: {
    scanInterval: 30000, // 30 seconds
    directories: ['src', 'modules']
  }
  // ... more agent configs
}

// Dashboard settings
dashboard: {
  port: 3001,
  updateInterval: 1000
}

// Reporting settings
reporting: {
  outputDir: 'debug-reports',
  formats: ['json', 'html', 'markdown'],
  generateInterval: 300000 // 5 minutes
}
```

## 🔧 Self-Healing Capabilities

The Self-Healing Agent can automatically fix:

- **Missing semicolons**
- **Unused imports**
- **Code formatting issues**
- **Simple type errors**
- **Missing await keywords**
- **Console statements** (comments them out)
- **Missing dependencies** (installs them)
- **Security vulnerabilities** (runs npm audit fix)
- **Version mismatches**

## 📈 Metrics Tracked

### Error Metrics
- Total error count
- Error rate (errors/minute)
- Error severity distribution
- Error sources and patterns

### Code Quality Metrics
- Cyclomatic complexity
- Code issues by type
- Files analyzed
- Average issues per file

### Test Metrics
- Function coverage percentage
- Line coverage percentage
- Untested critical functions
- Test execution results

### Performance Metrics
- CPU usage trends
- Memory usage patterns
- Response time averages
- Performance bottlenecks

### Dependency Metrics
- Total vs installed dependencies
- Vulnerability count by severity
- Outdated package count
- Circular dependency chains

## 🎯 Health Score Calculation

The overall health score is calculated using weighted metrics:

- **Errors** (30%): Absence of errors
- **Code Quality** (20%): Low issue count
- **Test Coverage** (20%): High coverage percentage
- **Performance** (15%): Low resource usage
- **Dependencies** (15%): No vulnerabilities

## 🛠️ Troubleshooting

### Agents Not Starting
- Check Node.js version (requires 14+)
- Verify file permissions
- Check port availability (3001)

### No Data in Dashboard
- Ensure WebSocket connection is established
- Check browser console for errors
- Verify agents are running (check console output)

### High Memory Usage
- Reduce scan intervals in config
- Limit log file sizes being monitored
- Disable unused agents

## 🔍 Advanced Usage

### Running Specific Agents Only

```bash
# Disable specific agents in config.js
agents: {
  errorDetection: { enabled: false },
  // ... other agents
}
```

### Custom Log Patterns

Add custom error patterns:
```javascript
errorPatterns: [
  /custom-error-pattern/i,
  /specific-exception/i
]
```

### Integration with CI/CD

Generate reports in CI:
```bash
# In your CI script
node start-debug-agents.js --report-only
# Check exit code and report results
```

## 📝 API Endpoints

The dashboard exposes:
- `GET /` - Dashboard HTML
- `GET /api/status` - Current system status (JSON)
- `GET /api/report` - Latest report (JSON)
- `WebSocket /` - Real-time updates

## 🤝 Contributing

To add a new agent:

1. Create `debug-agents/new-agent.js`
2. Extend base agent pattern
3. Register in `agent-orchestrator.js`
4. Add configuration in `config.js`

## 📄 License

MIT

## 🐛 Known Issues

- File watching may not work on some network drives
- Large log files (>100MB) may cause performance issues
- Some auto-fixes require manual review

## 🚦 Status Indicators

- 🟢 **Green**: System healthy (80-100%)
- 🟡 **Yellow**: Warning state (60-79%)
- 🔴 **Red**: Critical issues (<60%)

## 💡 Tips

1. **Start Small**: Begin with error detection and gradually enable more agents
2. **Review Auto-Fixes**: Always review self-healing changes before committing
3. **Custom Thresholds**: Adjust thresholds based on your project needs
4. **Regular Reports**: Schedule report generation for team reviews
5. **Monitor Trends**: Focus on trends rather than absolute numbers

---

For more information about the Forest MCP Server, see the main [README.md](../README.md).
