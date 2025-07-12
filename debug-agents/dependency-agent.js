/**
 * Dependency Agent
 * Monitors and validates project dependencies
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';

const execAsync = promisify(exec);

export class DependencyAgent {
  constructor() {
    this.agentId = 'dependency';
    this.config = DEBUG_CONFIG.agents.dependency;
    this.dependencies = new Map();
    this.vulnerabilities = new Map();
    this.outdatedPackages = new Map();
    this.circularDependencies = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[DependencyAgent] Initializing...');
    
    // Load initial dependency data
    await this.loadDependencies();
    
    console.log('[DependencyAgent] Initialized');
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[DependencyAgent] Starting dependency monitoring...');
    
    // Run initial checks
    await this.performFullCheck();
    
    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performFullCheck();
    }, this.config.checkInterval);
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Load dependencies from package.json
   */
  async loadDependencies() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      // Store all dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      for (const [name, version] of Object.entries(allDeps)) {
        this.dependencies.set(name, {
          name,
          version,
          type: packageJson.dependencies?.[name] ? 'production' : 'dev',
          installed: false,
          actualVersion: null
        });
      }
      
      console.log(`[DependencyAgent] Loaded ${this.dependencies.size} dependencies`);
    } catch (error) {
      console.error('[DependencyAgent] Failed to load package.json:', error);
    }
  }

  /**
   * Perform full dependency check
   */
  async performFullCheck() {
    agentCommunication.heartbeat(this.agentId);
    
    console.log('[DependencyAgent] Performing full dependency check...');
    
    // Check installed packages
    await this.checkInstalledPackages();
    
    // Check for vulnerabilities
    if (this.config.vulnerabilityCheck) {
      await this.checkVulnerabilities();
    }
    
    // Check for outdated packages
    if (this.config.outdatedCheck) {
      await this.checkOutdatedPackages();
    }
    
    // Check for circular dependencies
    await this.checkCircularDependencies();
    
    // Check for unused dependencies
    await this.checkUnusedDependencies();
    
    // Check for missing dependencies
    await this.checkMissingDependencies();
    
    // Send status update
    this.sendStatus();
  }

  /**
   * Check installed packages
   */
  async checkInstalledPackages() {
    try {
      const { stdout } = await execAsync('npm ls --json --depth=0', {
        timeout: 30000
      });
      
      const installedData = JSON.parse(stdout);
      const installed = installedData.dependencies || {};
      
      // Update dependency status
      for (const [name, info] of Object.entries(installed)) {
        const dep = this.dependencies.get(name);
        if (dep) {
          dep.installed = true;
          dep.actualVersion = info.version;
          
          // Check version mismatch
          if (info.version !== dep.version && !dep.version.includes(info.version)) {
            agentCommunication.sendMessage(
              this.agentId,
              'broadcast',
              DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
              {
                type: 'version_mismatch',
                package: name,
                expected: dep.version,
                actual: info.version,
                severity: PRIORITY_LEVELS.MEDIUM
              },
              PRIORITY_LEVELS.MEDIUM
            );
          }
        }
      }
      
      // Check for missing packages
      for (const [name, dep] of this.dependencies) {
        if (!installed[name]) {
          dep.installed = false;
          
          agentCommunication.sendMessage(
            this.agentId,
            'broadcast',
            DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
            {
              type: 'missing_dependency',
              package: name,
              version: dep.version,
              severity: PRIORITY_LEVELS.HIGH
            },
            PRIORITY_LEVELS.HIGH
          );
        }
      }
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to check installed packages:', error.message);
    }
  }

  /**
   * Check for vulnerabilities
   */
  async checkVulnerabilities() {
    try {
      console.log('[DependencyAgent] Checking for vulnerabilities...');
      
      const { stdout } = await execAsync('npm audit --json', {
        timeout: 60000
      });
      
      const auditData = JSON.parse(stdout);
      this.vulnerabilities.clear();
      
      if (auditData.vulnerabilities) {
        for (const [pkg, vulnInfo] of Object.entries(auditData.vulnerabilities)) {
          const severity = vulnInfo.severity;
          const vulns = [];
          
          if (vulnInfo.via && Array.isArray(vulnInfo.via)) {
            for (const via of vulnInfo.via) {
              if (typeof via === 'object' && via.title) {
                vulns.push({
                  title: via.title,
                  severity: via.severity,
                  url: via.url
                });
              }
            }
          }
          
          if (vulns.length > 0) {
            this.vulnerabilities.set(pkg, {
              package: pkg,
              severity,
              vulnerabilities: vulns,
              fixAvailable: vulnInfo.fixAvailable
            });
            
            // Notify about critical vulnerabilities
            if (severity === 'critical' || severity === 'high') {
              agentCommunication.sendMessage(
                this.agentId,
                'broadcast',
                DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
                {
                  type: 'security_vulnerability',
                  package: pkg,
                  severity,
                  vulnerabilities: vulns,
                  severity: severity === 'critical' ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH
                },
                severity === 'critical' ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH
              );
            }
          }
        }
      }
      
      console.log(`[DependencyAgent] Found ${this.vulnerabilities.size} vulnerable packages`);
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to check vulnerabilities:', error.message);
    }
  }

  /**
   * Check for outdated packages
   */
  async checkOutdatedPackages() {
    try {
      console.log('[DependencyAgent] Checking for outdated packages...');
      
      const { stdout } = await execAsync('npm outdated --json', {
        timeout: 60000
      });
      
      if (stdout) {
        const outdatedData = JSON.parse(stdout);
        this.outdatedPackages.clear();
        
        for (const [pkg, info] of Object.entries(outdatedData)) {
          this.outdatedPackages.set(pkg, {
            package: pkg,
            current: info.current,
            wanted: info.wanted,
            latest: info.latest,
            type: info.type
          });
          
          // Check for major version differences
          const currentMajor = this.getMajorVersion(info.current);
          const latestMajor = this.getMajorVersion(info.latest);
          
          if (latestMajor > currentMajor) {
            agentCommunication.sendMessage(
              this.agentId,
              'broadcast',
              DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
              {
                type: 'major_version_available',
                package: pkg,
                current: info.current,
                latest: info.latest,
                severity: PRIORITY_LEVELS.LOW
              },
              PRIORITY_LEVELS.LOW
            );
          }
        }
      }
      
      console.log(`[DependencyAgent] Found ${this.outdatedPackages.size} outdated packages`);
      
    } catch (error) {
      // npm outdated returns non-zero exit code when packages are outdated
      // This is expected behavior, so we handle it gracefully
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          this.outdatedPackages.clear();
          
          for (const [pkg, info] of Object.entries(outdatedData)) {
            this.outdatedPackages.set(pkg, {
              package: pkg,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              type: info.type
            });
          }
        } catch (parseError) {
          console.error('[DependencyAgent] Failed to parse outdated data:', parseError);
        }
      }
    }
  }

  /**
   * Check for circular dependencies
   */
  async checkCircularDependencies() {
    try {
      const visited = new Set();
      const recursionStack = new Set();
      this.circularDependencies.clear();
      
      // Build dependency graph
      const depGraph = await this.buildDependencyGraph();
      
      // DFS to find cycles
      for (const pkg of depGraph.keys()) {
        if (!visited.has(pkg)) {
          this.findCircularDeps(pkg, depGraph, visited, recursionStack, []);
        }
      }
      
      // Notify about circular dependencies
      for (const [pkg, cycles] of this.circularDependencies) {
        agentCommunication.sendMessage(
          this.agentId,
          'broadcast',
          DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
          {
            type: 'circular_dependency',
            package: pkg,
            cycles,
            severity: PRIORITY_LEVELS.MEDIUM
          },
          PRIORITY_LEVELS.MEDIUM
        );
      }
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to check circular dependencies:', error);
    }
  }

  /**
   * Build dependency graph
   */
  async buildDependencyGraph() {
    const graph = new Map();
    
    try {
      const { stdout } = await execAsync('npm ls --json', {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      const data = JSON.parse(stdout);
      
      const processNode = (node, name) => {
        if (!graph.has(name)) {
          graph.set(name, new Set());
        }
        
        if (node.dependencies) {
          for (const [depName, depNode] of Object.entries(node.dependencies)) {
            graph.get(name).add(depName);
            processNode(depNode, depName);
          }
        }
      };
      
      if (data.dependencies) {
        for (const [name, node] of Object.entries(data.dependencies)) {
          processNode(node, name);
        }
      }
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to build dependency graph:', error.message);
    }
    
    return graph;
  }

  /**
   * Find circular dependencies using DFS
   */
  findCircularDeps(node, graph, visited, recursionStack, path) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = graph.get(node) || new Set();
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.findCircularDeps(neighbor, graph, visited, recursionStack, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        
        if (!this.circularDependencies.has(node)) {
          this.circularDependencies.set(node, []);
        }
        this.circularDependencies.get(node).push(cycle);
      }
    }
    
    recursionStack.delete(node);
  }

  /**
   * Check for unused dependencies
   */
  async checkUnusedDependencies() {
    try {
      const usedPackages = new Set();
      const sourceFiles = await this.getSourceFiles();
      
      // Scan all source files for imports
      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Find imports
        const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
        const requireMatches = content.matchAll(/require\s*\(['"]([^'"]+)['"]\)/g);
        
        for (const match of [...importMatches, ...requireMatches]) {
          const pkg = this.extractPackageName(match[1]);
          if (pkg) {
            usedPackages.add(pkg);
          }
        }
      }
      
      // Check for unused dependencies
      for (const [name, dep] of this.dependencies) {
        if (dep.type === 'production' && !usedPackages.has(name)) {
          // Check if it's a plugin or loader (often not directly imported)
          const isPlugin = name.includes('plugin') || 
                          name.includes('loader') || 
                          name.includes('preset') ||
                          name.startsWith('@babel/') ||
                          name.startsWith('eslint-');
          
          if (!isPlugin) {
            agentCommunication.sendMessage(
              this.agentId,
              'broadcast',
              DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
              {
                type: 'unused_dependency',
                package: name,
                version: dep.version,
                severity: PRIORITY_LEVELS.LOW
              },
              PRIORITY_LEVELS.LOW
            );
          }
        }
      }
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to check unused dependencies:', error);
    }
  }

  /**
   * Check for missing dependencies
   */
  async checkMissingDependencies() {
    try {
      const declaredPackages = new Set(this.dependencies.keys());
      const requiredPackages = new Set();
      const sourceFiles = await this.getSourceFiles();
      
      // Scan all source files for imports
      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Find imports
        const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
        const requireMatches = content.matchAll(/require\s*\(['"]([^'"]+)['"]\)/g);
        
        for (const match of [...importMatches, ...requireMatches]) {
          const pkg = this.extractPackageName(match[1]);
          if (pkg && !pkg.startsWith('.') && !pkg.startsWith('/')) {
            requiredPackages.add(pkg);
          }
        }
      }
      
      // Check for missing packages
      for (const pkg of requiredPackages) {
        if (!declaredPackages.has(pkg) && !this.isBuiltinModule(pkg)) {
          agentCommunication.sendMessage(
            this.agentId,
            'broadcast',
            DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE,
            {
              type: 'undeclared_dependency',
              package: pkg,
              severity: PRIORITY_LEVELS.HIGH
            },
            PRIORITY_LEVELS.HIGH
          );
        }
      }
      
    } catch (error) {
      console.error('[DependencyAgent] Failed to check missing dependencies:', error);
    }
  }

  /**
   * Extract package name from import path
   */
  extractPackageName(importPath) {
    // Handle scoped packages
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }
    
    // Handle regular packages
    const parts = importPath.split('/');
    return parts[0];
  }

  /**
   * Check if module is built-in
   */
  isBuiltinModule(name) {
    const builtins = [
      'fs', 'path', 'http', 'https', 'crypto', 'os', 'util',
      'stream', 'buffer', 'events', 'url', 'querystring', 'child_process',
      'cluster', 'net', 'dgram', 'dns', 'readline', 'repl', 'vm',
      'assert', 'tty', 'zlib', 'perf_hooks', 'worker_threads'
    ];
    
    return builtins.includes(name) || name.startsWith('node:');
  }

  /**
   * Get major version from version string
   */
  getMajorVersion(version) {
    const match = version.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get source files
   */
  async getSourceFiles() {
    const files = [];
    const directories = ['___stage1', 'modules', 'utils', 'debug-agents'];
    
    for (const dir of directories) {
      if (await this.fileExists(dir)) {
        await this.collectJSFiles(dir, files);
      }
    }
    
    return files;
  }

  /**
   * Collect JavaScript files recursively
   */
  async collectJSFiles(dir, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.collectJSFiles(fullPath, files);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send current status
   */
  sendStatus() {
    const status = {
      totalDependencies: this.dependencies.size,
      installedDependencies: Array.from(this.dependencies.values()).filter(d => d.installed).length,
      vulnerabilities: {
        total: this.vulnerabilities.size,
        critical: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'critical').length,
        high: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'high').length,
        medium: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'moderate').length,
        low: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'low').length
      },
      outdated: this.outdatedPackages.size,
      circular: this.circularDependencies.size,
      issues: []
    };
    
    // Add critical issues
    if (status.vulnerabilities.critical > 0) {
      status.issues.push(`${status.vulnerabilities.critical} critical vulnerabilities found`);
    }
    
    if (status.vulnerabilities.high > 0) {
      status.issues.push(`${status.vulnerabilities.high} high severity vulnerabilities found`);
    }
    
    const missingCount = status.totalDependencies - status.installedDependencies;
    if (missingCount > 0) {
      status.issues.push(`${missingCount} dependencies not installed`);
    }
    
    if (status.circular > 0) {
      status.issues.push(`${status.circular} circular dependencies detected`);
    }
    
    agentCommunication.sendMessage(
      this.agentId,
      'orchestrator',
      DEBUG_CONFIG.communication.eventTypes.HEALTH_CHECK,
      status
    );
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    switch (message.type) {
      case 'check_dependencies':
        await this.performFullCheck();
        break;
        
      case 'get_vulnerabilities':
        return Array.from(this.vulnerabilities.values());
        
      case 'get_outdated':
        return Array.from(this.outdatedPackages.values());
        
      case 'fix_vulnerabilities':
        try {
          const { stdout } = await execAsync('npm audit fix', { timeout: 120000 });
          console.log('[DependencyAgent] Vulnerabilities fixed:', stdout);
          await this.checkVulnerabilities();
        } catch (error) {
          console.error('[DependencyAgent] Failed to fix vulnerabilities:', error);
        }
        break;
        
      case 'update_package':
        if (message.data.package) {
          try {
            const cmd = message.data.latest 
              ? `npm install ${message.data.package}@latest`
              : `npm update ${message.data.package}`;
            const { stdout } = await execAsync(cmd, { timeout: 60000 });
            console.log(`[DependencyAgent] Updated ${message.data.package}:`, stdout);
            await this.loadDependencies();
          } catch (error) {
            console.error(`[DependencyAgent] Failed to update ${message.data.package}:`, error);
          }
        }
        break;
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    console.log('[DependencyAgent] Stopped');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      dependencies: {
        total: this.dependencies.size,
        production: Array.from(this.dependencies.values()).filter(d => d.type === 'production').length,
        dev: Array.from(this.dependencies.values()).filter(d => d.type === 'dev').length,
        installed: Array.from(this.dependencies.values()).filter(d => d.installed).length
      },
      vulnerabilities: {
        total: this.vulnerabilities.size,
        bySeverity: {
          critical: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'critical').length,
          high: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'high').length,
          moderate: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'moderate').length,
          low: Array.from(this.vulnerabilities.values()).filter(v => v.severity === 'low').length
        }
      },
      outdated: {
        total: this.outdatedPackages.size,
        major: Array.from(this.outdatedPackages.values()).filter(p => {
          const currentMajor = this.getMajorVersion(p.current);
          const latestMajor = this.getMajorVersion(p.latest);
          return latestMajor > currentMajor;
        }).length
      },
      circular: this.circularDependencies.size
    };
  }
}
