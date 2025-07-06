#!/usr/bin/env node

import { spawn } from 'child_process';

class SimpleMCPClient {
    constructor() {
        this.mcpProcess = null;
        this.requestId = 1;
    }

    async startServer() {
        console.log('Starting MCP server...');
        this.mcpProcess = spawn('node', ['___stage1/forest-mcp-server.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd()
        });

        this.mcpProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.log('Server stderr:', output);
            if (output.includes('Forest MCP server started successfully')) {
                console.log('✅ Server ready detected');
            }
        });

        this.mcpProcess.stdout.on('data', (data) => {
            console.log('Server stdout:', data.toString());
        });

        this.mcpProcess.on('error', (error) => {
            console.error('Server error:', error);
        });

        this.mcpProcess.on('exit', (code) => {
            console.log('Server exited with code:', code);
        });

        // Wait for server to be ready
        await new Promise(resolve => {
            const checkReady = () => {
                setTimeout(() => {
                    console.log('Assuming server is ready after 3 seconds...');
                    resolve();
                }, 3000);
            };
            checkReady();
        });
    }

    async sendRequest(method, params = {}) {
        const request = {
            jsonrpc: "2.0",
            id: this.requestId++,
            method: method,
            params: params
        };

        console.log('Sending request:', JSON.stringify(request, null, 2));

        return new Promise((resolve, reject) => {
            let responseData = '';
            
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);

            const dataHandler = (data) => {
                responseData += data.toString();
                console.log('Received data chunk:', data.toString());
                
                try {
                    // Try to parse complete JSON response
                    const response = JSON.parse(responseData);
                    clearTimeout(timeout);
                    this.mcpProcess.stdout.removeListener('data', dataHandler);
                    resolve(response);
                } catch (e) {
                    // Not complete JSON yet, continue collecting
                }
            };

            this.mcpProcess.stdout.on('data', dataHandler);
            this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        });
    }

    async test() {
        try {
            await this.startServer();
            
            console.log('\n=== Testing tools/list ===');
            const toolsResponse = await this.sendRequest('tools/list');
            console.log('Tools response:', JSON.stringify(toolsResponse, null, 2));

        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            if (this.mcpProcess) {
                console.log('Stopping server...');
                this.mcpProcess.kill('SIGINT');
            }
        }
    }
}

// Run the test
const client = new SimpleMCPClient();
client.test().then(() => {
    console.log('Test complete');
    process.exit(0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
