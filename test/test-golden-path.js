/**
 * Golden Path End-to-End Test
 * Tests the critical workflow: start server → create project → build HTA → get_next_task
 * This test ensures that the core functionality works without NaN errors or crashes
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises');
const { expect } = require('jest');

describe('Golden Path End-to-End Test', () => {
  let serverProcess;
  let projectId;
  const timeout = 30000; // 30 seconds timeout for slower operations

  beforeAll(async () => {
    // Clean up any existing test data
    const testDataDir = path.join(__dirname, '..', '.forest-data');
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore if directory doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up server process
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      // Give it a moment to clean up
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  test('Golden Path: Complete workflow without NaN errors', async () => {
    // Step 1: Start the MCP server
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(serverPath)
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within timeout'));
      }, 10000);

      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('MCP Server started') || 
            data.toString().includes('Server listening')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Error') || output.includes('NaN')) {
          clearTimeout(timeout);
          reject(new Error(`Server error: ${output}`));
        }
      });
    });

    // Step 2: Create a test project
    const createProjectRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_project',
        arguments: {
          goal: 'Learn JavaScript programming fundamentals',
          domain: 'web development',
          complexity: 'beginner',
          timeframe: '3 months'
        }
      }
    };

    const projectResult = await sendMCPRequest(serverProcess, createProjectRequest);
    expect(projectResult.error).toBeUndefined();
    expect(projectResult.result.content).toBeDefined();
    
    // Extract project ID from response
    const projectResponse = JSON.parse(projectResult.result.content[0].text);
    projectId = projectResponse.project_id;
    expect(projectId).toBeDefined();
    expect(typeof projectId).toBe('string');

    // Step 3: Build HTA tree
    const buildHTARequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'build_hta_tree',
        arguments: {
          project_id: projectId
        }
      }
    };

    const htaResult = await sendMCPRequest(serverProcess, buildHTARequest);
    expect(htaResult.error).toBeUndefined();
    expect(htaResult.result.content).toBeDefined();
    
    const htaResponse = JSON.parse(htaResult.result.content[0].text);
    expect(htaResponse.success).toBe(true);
    expect(htaResponse.tree).toBeDefined();
    expect(htaResponse.tree.frontierNodes).toBeDefined();
    expect(Array.isArray(htaResponse.tree.frontierNodes)).toBe(true);
    expect(htaResponse.tree.frontierNodes.length).toBeGreaterThan(0);

    // Step 4: Get next task (critical test for NaN prevention)
    const getNextTaskRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_next_task',
        arguments: {
          project_id: projectId,
          energy_level: 3,
          time_available: '30 minutes',
          context: 'Starting to learn JavaScript'
        }
      }
    };

    const taskResult = await sendMCPRequest(serverProcess, getNextTaskRequest);
    expect(taskResult.error).toBeUndefined();
    expect(taskResult.result.content).toBeDefined();
    
    const taskResponse = JSON.parse(taskResult.result.content[0].text);
    expect(taskResponse.success).toBe(true);
    expect(taskResponse.task).toBeDefined();
    expect(taskResponse.task.id).toBeDefined();
    expect(taskResponse.task.title).toBeDefined();
    expect(taskResponse.task.priority).toBeDefined();
    expect(typeof taskResponse.task.priority).toBe('number');
    expect(taskResponse.task.priority).not.toBeNaN();

    // Step 5: Verify no NaN values in task scoring
    expect(taskResponse.score).toBeDefined();
    expect(typeof taskResponse.score).toBe('number');
    expect(taskResponse.score).not.toBeNaN();
    expect(taskResponse.score).toBeGreaterThan(0);

    // Step 6: Test multiple task retrievals to ensure consistent scoring
    for (let i = 0; i < 3; i++) {
      const additionalTaskRequest = {
        jsonrpc: '2.0',
        id: 4 + i,
        method: 'tools/call',
        params: {
          name: 'get_next_task',
          arguments: {
            project_id: projectId,
            energy_level: 2 + i,
            time_available: `${20 + i * 10} minutes`,
            context: `Learning session ${i + 1}`
          }
        }
      };

      const additionalTaskResult = await sendMCPRequest(serverProcess, additionalTaskRequest);
      expect(additionalTaskResult.error).toBeUndefined();
      
      const additionalTaskResponse = JSON.parse(additionalTaskResult.result.content[0].text);
      expect(additionalTaskResponse.success).toBe(true);
      expect(additionalTaskResponse.score).not.toBeNaN();
      expect(typeof additionalTaskResponse.score).toBe('number');
    }

    console.log('✅ Golden Path test completed successfully - no NaN errors detected');
  }, timeout);

  test('Stress test: Multiple rapid task requests', async () => {
    if (!projectId) {
      throw new Error('Project ID not available - run golden path test first');
    }

    // Rapid-fire requests to test for race conditions or NaN errors
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const request = {
        jsonrpc: '2.0',
        id: 100 + i,
        method: 'tools/call',
        params: {
          name: 'get_next_task',
          arguments: {
            project_id: projectId,
            energy_level: (i % 5) + 1,
            time_available: `${(i % 4 + 1) * 15} minutes`,
            context: `Stress test request ${i}`
          }
        }
      };
      promises.push(sendMCPRequest(serverProcess, request));
    }

    const results = await Promise.all(promises);
    
    // Verify all results are valid
    for (const result of results) {
      expect(result.error).toBeUndefined();
      const response = JSON.parse(result.result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.score).not.toBeNaN();
      expect(typeof response.score).toBe('number');
    }

    console.log('✅ Stress test completed successfully');
  }, timeout);

  test('Edge case: Invalid inputs handling', async () => {
    if (!projectId) {
      throw new Error('Project ID not available - run golden path test first');
    }

    // Test with edge case inputs
    const edgeCaseRequest = {
      jsonrpc: '2.0',
      id: 200,
      method: 'tools/call',
      params: {
        name: 'get_next_task',
        arguments: {
          project_id: projectId,
          energy_level: 0, // Edge case: zero energy
          time_available: 'invalid time', // Edge case: invalid time format
          context: null // Edge case: null context
        }
      }
    };

    const result = await sendMCPRequest(serverProcess, edgeCaseRequest);
    
    // Should handle gracefully without crashing
    if (result.error) {
      // If there's an error, it should be a proper error, not a NaN-related crash
      expect(result.error.message).not.toContain('NaN');
    } else {
      // If it succeeds, the score should still be valid
      const response = JSON.parse(result.result.content[0].text);
      if (response.success) {
        expect(response.score).not.toBeNaN();
        expect(typeof response.score).toBe('number');
      }
    }

    console.log('✅ Edge case test completed successfully');
  }, timeout);
});

/**
 * Helper function to send MCP requests and receive responses
 */
async function sendMCPRequest(serverProcess, request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 15000);

    let responseData = '';
    
    const onData = (data) => {
      responseData += data.toString();
      
      // Look for complete JSON response
      try {
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('jsonrpc')) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              serverProcess.stdout.removeListener('data', onData);
              resolve(response);
              return;
            }
          }
        }
      } catch (err) {
        // Continue waiting for complete response
      }
    };

    serverProcess.stdout.on('data', onData);
    
    // Send the request
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}