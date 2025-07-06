#!/usr/bin/env node

/**
 * Forest MCP Debug Marathon
 * 
 * Comprehensive testing of all 12 MCP tools with live ChromaDB integration
 * This script will exercise every tool in a realistic scenario with full debug logging
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class DebugMarathon {
  constructor() {
    this.testResults = [];
    this.currentStep = 0;
    this.totalSteps = 15;
    this.projectId = `debug-marathon-${Date.now()}`;
    this.logFile = `debug-marathon-${Date.now()}.log`;
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    
    // Append to log file
    try {
      const existingLog = existsSync(this.logFile) ? readFileSync(this.logFile, 'utf8') : '';
      writeFileSync(this.logFile, existingLog + logEntry + '\n');
    } catch (error) {
      console.warn('Failed to write to log file:', error.message);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runMCPTool(toolName, args = {}) {
    this.log(`🔧 Testing MCP Tool: ${toolName}`, 'TOOL');
    
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    return new Promise((resolve, reject) => {
      const child = spawn('node', ['___stage1/forest-mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FOREST_VECTOR_PROVIDER: 'chroma',
          DEBUG_CONTEXT: 'true',
          FOREST_DEBUG: 'true'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Send MCP request
      child.stdin.write(JSON.stringify(mcpRequest) + '\n');
      child.stdin.end();

      setTimeout(() => {
        child.kill();
        resolve({ stdout, stderr, toolName, args });
      }, 5000); // 5 second timeout per tool
    });
  }

  async step(description, action) {
    this.currentStep++;
    this.log(`\n📍 Step ${this.currentStep}/${this.totalSteps}: ${description}`, 'STEP');
    
    try {
      const result = await action();
      this.testResults.push({
        step: this.currentStep,
        description,
        status: 'SUCCESS',
        result,
        timestamp: new Date().toISOString()
      });
      this.log(`✅ Step ${this.currentStep} completed successfully`, 'SUCCESS');
      return result;
    } catch (error) {
      this.testResults.push({
        step: this.currentStep,
        description,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Step ${this.currentStep} failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async runMarathon() {
    this.log('🏃‍♂️ Starting Forest MCP Debug Marathon', 'MARATHON');
    this.log(`📊 Project ID: ${this.projectId}`, 'INFO');
    this.log(`📝 Log File: ${this.logFile}`, 'INFO');
    this.log(`🔗 ChromaDB: http://localhost:8000`, 'INFO');
    this.log('═'.repeat(80), 'SEPARATOR');

    try {
      // Step 1: Verify ChromaDB Connection
      await this.step('Verify ChromaDB Connection', async () => {
        const response = await fetch('http://localhost:8000/api/v2/heartbeat');
        if (!response.ok) throw new Error(`ChromaDB not responding: ${response.status}`);
        return await response.json();
      });

      // Step 2: Create Test Project
      await this.step('Create Test Project', async () => {
        return await this.runMCPTool('create_project_forest', {
          projectName: 'Debug Marathon Test',
          projectId: this.projectId,
          description: 'Comprehensive debug test of all Forest MCP tools',
          tags: ['debug', 'marathon', 'testing']
        });
      });

      // Step 3: List Projects
      await this.step('List All Projects', async () => {
        return await this.runMCPTool('list_projects_forest');
      });

      // Step 4: Get Active Project
      await this.step('Get Active Project', async () => {
        return await this.runMCPTool('get_active_project_forest');
      });

      // Step 5: Switch to Test Project
      await this.step('Switch to Test Project', async () => {
        return await this.runMCPTool('switch_project_forest', {
          projectId: this.projectId
        });
      });

      // Step 6: Build HTA Tree
      await this.step('Build HTA Tree', async () => {
        return await this.runMCPTool('build_hta_tree_forest', {
          taskDescription: 'Create a comprehensive web application with user authentication, data visualization, and real-time features',
          depth: 3,
          useVectorEnhancement: true
        });
      });

      // Step 7: Get HTA Status
      await this.step('Get HTA Status', async () => {
        return await this.runMCPTool('get_hta_status_forest');
      });

      // Step 8: Get Next Task
      await this.step('Get Next Task', async () => {
        return await this.runMCPTool('get_next_task_forest', {
          useVectorEnhancement: true
        });
      });

      // Step 9: Complete a Task Block
      await this.step('Complete Task Block', async () => {
        return await this.runMCPTool('complete_block_forest', {
          blockId: 'task_1_1',
          outcome: 'Successfully designed user authentication system with JWT tokens and OAuth integration',
          insights: 'Need to consider rate limiting and session management for production deployment',
          nextSteps: ['Implement password hashing', 'Add multi-factor authentication', 'Create user role management']
        });
      });

      // Step 10: Generate Daily Schedule
      await this.step('Generate Daily Schedule', async () => {
        return await this.runMCPTool('generate_daily_schedule_forest', {
          availableHours: 8,
          includeBreaks: true,
          focusAreas: ['development', 'testing', 'documentation']
        });
      });

      // Step 11: Get Current Status
      await this.step('Get Current Status', async () => {
        return await this.runMCPTool('current_status_forest');
      });

      // Step 12: Evolve Strategy
      await this.step('Evolve Strategy', async () => {
        return await this.runMCPTool('evolve_strategy_forest', {
          analysisDepth: 'deep',
          includeVectorInsights: true
        });
      });

      // Step 13: Sync Forest Memory
      await this.step('Sync Forest Memory', async () => {
        return await this.runMCPTool('sync_forest_memory_forest', {
          includeVectorData: true
        });
      });

      // Step 14: Test Vector Store Integration
      await this.step('Test Vector Store Integration', async () => {
        // Run vector integration test
        const child = spawn('node', ['___stage1/scripts/validate-vector-integration.js'], {
          stdio: 'pipe',
          env: {
            ...process.env,
            FOREST_VECTOR_PROVIDER: 'chroma'
          }
        });

        return new Promise((resolve, reject) => {
          let output = '';
          child.stdout.on('data', (data) => output += data.toString());
          child.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Vector integration test failed with code ${code}`));
          });
        });
      });

      // Step 15: Performance and Resource Analysis
      await this.step('Performance Analysis', async () => {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        // Get process stats
        const processes = await this.getProcessStats();
        
        return {
          totalExecutionTime: totalTime,
          averageStepTime: totalTime / this.currentStep,
          processStats: processes,
          memoryUsage: process.memoryUsage(),
          testResultsCount: this.testResults.length
        };
      });

      // Marathon Complete!
      this.log('🏁 Debug Marathon Completed Successfully!', 'MARATHON');
      this.generateReport();

    } catch (error) {
      this.log(`💥 Marathon Failed: ${error.message}`, 'ERROR');
      this.generateReport();
      throw error;
    }
  }

  async getProcessStats() {
    return new Promise((resolve) => {
      const child = spawn('powershell', [
        '-Command',
        'Get-Process | Where-Object {$_.ProcessName -like "*chroma*" -or $_.ProcessName -like "*node*" -or $_.ProcessName -like "*python*"} | Select-Object ProcessName, Id, CPU, WorkingSet | ConvertTo-Json'
      ], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', (data) => output += data.toString());
      child.on('close', () => {
        try {
          resolve(JSON.parse(output));
        } catch {
          resolve({ error: 'Failed to parse process stats' });
        }
      });
    });
  }

  generateReport() {
    const report = {
      marathonId: this.projectId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      stepsCompleted: this.currentStep,
      stepsTotal: this.totalSteps,
      successRate: (this.testResults.filter(r => r.status === 'SUCCESS').length / this.testResults.length) * 100,
      results: this.testResults
    };

    const reportFile = `debug-marathon-report-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📊 Full report saved to: ${reportFile}`, 'REPORT');
    this.log(`📝 Debug log saved to: ${this.logFile}`, 'REPORT');
    this.log('═'.repeat(80), 'SEPARATOR');
    this.log(`🎯 Marathon Results: ${report.successRate.toFixed(1)}% success rate`, 'REPORT');
    this.log(`⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`, 'REPORT');
    this.log(`📈 Steps Completed: ${report.stepsCompleted}/${report.stepsTotal}`, 'REPORT');
  }
}

// Run the marathon if this script is executed directly
const isMainModule = import.meta.url.endsWith('debug-marathon.js') && process.argv[1].includes('debug-marathon.js');
if (isMainModule) {
  console.log('🎯 Debug Marathon Script Starting...');
  const marathon = new DebugMarathon();
  marathon.runMarathon().catch(error => {
    console.error('💥 Marathon failed:', error.message);
    process.exit(1);
  });
}

export default DebugMarathon;
