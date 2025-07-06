#!/usr/bin/env node

/**
 * Live Sandbox Test - Real MCP Tools with ChromaDB
 * Tests actual MCP server functionality in real-time
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LiveMCPSandbox {
    constructor() {
        this.mcpProcess = null;
        this.testResults = [];
        this.projectId = 'sandbox-test-' + Date.now();
        this.baseDir = process.cwd();
        this.debug = true;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        // Also write to log file
        const logFile = path.join(this.baseDir, 'sandbox_test.log');
        fs.appendFileSync(logFile, logMessage + '\n');
    }

    async startMCPServer() {
        this.log('Starting MCP Server for sandbox testing...');
        
        return new Promise((resolve, reject) => {
            // Start the MCP server
            this.mcpProcess = spawn('node', ['___stage1/forest-mcp-server.js'], {
                cwd: this.baseDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let serverReady = false;
            let initData = '';

            this.mcpProcess.stdout.on('data', (data) => {
                const output = data.toString();
                initData += output;
                
                if (this.debug) {
                    this.log(`MCP Server Output: ${output.trim()}`);
                }

                // Check if server is ready
                if (output.includes('MCP Server initialized') || output.includes('Server ready')) {
                    serverReady = true;
                    this.log('MCP Server is ready for testing');
                    resolve();
                }
            });

            this.mcpProcess.stderr.on('data', (data) => {
                const error = data.toString();
                this.log(`MCP Server Error: ${error.trim()}`, 'ERROR');
                
                // Also check stderr for readiness messages since MCP server logs to stderr
                if (error.includes('Forest MCP server started successfully') || 
                    error.includes('MCP Server initialized') || 
                    error.includes('Server ready')) {
                    serverReady = true;
                    this.log('MCP Server is ready for testing (detected from stderr)');
                    resolve();
                }
            });

            this.mcpProcess.on('close', (code) => {
                this.log(`MCP Server process exited with code ${code}`);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!serverReady) {
                    this.log('MCP Server startup timeout - proceeding with tests anyway', 'WARN');
                    resolve();
                }
            }, 10000);
        });
    }

    async sendMCPRequest(method, params = {}) {
        return new Promise((resolve, reject) => {
            const request = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: method,
                params: params
            };

            const requestStr = JSON.stringify(request) + '\n';
            this.log(`Sending MCP Request: ${method}`, 'DEBUG');
            
            if (this.debug) {
                this.log(`Request params: ${JSON.stringify(params, null, 2)}`, 'DEBUG');
            }

            let responseData = '';
            let responseReceived = false;

            const dataHandler = (data) => {
                responseData += data.toString();
                
                // Try to parse JSON response
                try {
                    const lines = responseData.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        if (line.trim()) {
                            const response = JSON.parse(line);
                            if (response.id === request.id) {
                                responseReceived = true;
                                this.mcpProcess.stdout.removeListener('data', dataHandler);
                                
                                if (this.debug) {
                                    this.log(`Response received: ${JSON.stringify(response, null, 2)}`, 'DEBUG');
                                }
                                
                                if (response.error) {
                                    reject(new Error(response.error.message || 'MCP Error'));
                                } else {
                                    resolve(response.result);
                                }
                                return;
                            }
                        }
                    }
                } catch (e) {
                    // Continue collecting data
                }
            };

            this.mcpProcess.stdout.on('data', dataHandler);

            // Send the request
            this.mcpProcess.stdin.write(requestStr);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!responseReceived) {
                    this.mcpProcess.stdout.removeListener('data', dataHandler);
                    reject(new Error('MCP Request timeout'));
                }
            }, 30000);
        });
    }

    async testTool(toolName, params = {}) {
        try {
            this.log(`Testing tool: ${toolName}`);
            
            // Add projectId to params if not present
            if (!params.projectId) {
                params.projectId = this.projectId;
            }

            const result = await this.sendMCPRequest('tools/call', {
                name: toolName,
                arguments: params
            });

            this.testResults.push({
                tool: toolName,
                status: 'SUCCESS',
                result: result,
                timestamp: new Date().toISOString()
            });

            this.log(`✅ ${toolName} - SUCCESS`);
            return result;

        } catch (error) {
            this.testResults.push({
                tool: toolName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            this.log(`❌ ${toolName} - FAILED: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async runComprehensiveTest() {
        this.log('Starting comprehensive live MCP tool testing...');

        // Test 1: List available tools
        this.log('\n=== PHASE 1: Tool Discovery ===');
        try {
            const tools = await this.sendMCPRequest('tools/list');
            this.log(`Available tools: ${tools.tools.map(t => t.name).join(', ')}`);
        } catch (error) {
            this.log(`Failed to list tools: ${error.message}`, 'ERROR');
        }

        // Test 2: Core Intelligence Tools
        this.log('\n=== PHASE 2: Core Intelligence ===');
        
        await this.testTool('analyze_project_structure', {
            projectId: this.projectId,
            includeFileContent: true,
            maxDepth: 3
        });

        await this.testTool('generate_logical_deductions', {
            projectId: this.projectId,
            context: 'Analyzing project structure and dependencies',
            focusAreas: ['architecture', 'dependencies', 'patterns']
        });

        await this.testTool('extract_code_intelligence', {
            projectId: this.projectId,
            filePaths: ['server.js', 'package.json'],
            analysisType: 'comprehensive'
        });

        // Test 3: Vector Database Operations
        this.log('\n=== PHASE 3: Vector Database ===');
        
        await this.testTool('store_vector_data', {
            projectId: this.projectId,
            data: {
                type: 'test_embedding',
                content: 'This is a test document for vector storage',
                metadata: { source: 'sandbox_test', version: '1.0' }
            }
        });

        await this.testTool('query_vector_data', {
            projectId: this.projectId,
            query: 'test document vector',
            limit: 5
        });

        // Test 4: Data Persistence
        this.log('\n=== PHASE 4: Data Persistence ===');
        
        await this.testTool('save_project_data', {
            projectId: this.projectId,
            data: {
                name: 'Sandbox Test Project',
                description: 'Live testing of MCP tools',
                created: new Date().toISOString(),
                testPhase: 'comprehensive'
            }
        });

        await this.testTool('load_project_data', {
            projectId: this.projectId
        });

        // Test 5: File Operations
        this.log('\n=== PHASE 5: File Operations ===');
        
        await this.testTool('read_file_content', {
            projectId: this.projectId,
            filePath: 'package.json'
        });

        await this.testTool('analyze_file_dependencies', {
            projectId: this.projectId,
            filePath: 'server.js'
        });

        // Test 6: Advanced Analysis
        this.log('\n=== PHASE 6: Advanced Analysis ===');
        
        await this.testTool('generate_hta_tree', {
            projectId: this.projectId,
            context: 'Project structure analysis',
            focusArea: 'architecture'
        });

        await this.testTool('create_task_strategy', {
            projectId: this.projectId,
            task: 'Optimize project structure and performance',
            context: 'Based on analysis results'
        });

        // Test 7: Schema Operations
        this.log('\n=== PHASE 7: Schema Operations ===');
        
        await this.testTool('validate_project_schema', {
            projectId: this.projectId,
            schemaType: 'project_structure'
        });

        await this.testTool('update_project_metadata', {
            projectId: this.projectId,
            metadata: {
                lastTested: new Date().toISOString(),
                testType: 'comprehensive_sandbox',
                toolsValidated: true
            }
        });
    }

    async generateReport() {
        this.log('\n=== FINAL REPORT ===');
        
        const successful = this.testResults.filter(r => r.status === 'SUCCESS');
        const failed = this.testResults.filter(r => r.status === 'FAILED');
        
        this.log(`Total tests: ${this.testResults.length}`);
        this.log(`Successful: ${successful.length}`);
        this.log(`Failed: ${failed.length}`);
        this.log(`Success rate: ${((successful.length / this.testResults.length) * 100).toFixed(1)}%`);

        if (failed.length > 0) {
            this.log('\nFailed tests:');
            failed.forEach(test => {
                this.log(`  - ${test.tool}: ${test.error}`);
            });
        }

        // Save detailed report
        const reportPath = path.join(this.baseDir, 'sandbox_test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: {
                total: this.testResults.length,
                successful: successful.length,
                failed: failed.length,
                successRate: (successful.length / this.testResults.length) * 100
            },
            results: this.testResults,
            timestamp: new Date().toISOString(),
            projectId: this.projectId
        }, null, 2));

        this.log(`Detailed report saved to: ${reportPath}`);
    }

    async cleanup() {
        this.log('Cleaning up sandbox test environment...');
        
        if (this.mcpProcess) {
            this.mcpProcess.kill();
            this.log('MCP Server process terminated');
        }
    }

    async run() {
        try {
            await this.startMCPServer();
            await this.runComprehensiveTest();
            await this.generateReport();
        } catch (error) {
            this.log(`Sandbox test failed: ${error.message}`, 'ERROR');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the sandbox test
async function main() {
    const sandbox = new LiveMCPSandbox();
    
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT, cleaning up...');
        await sandbox.cleanup();
        process.exit(0);
    });

    await sandbox.run();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default LiveMCPSandbox;
