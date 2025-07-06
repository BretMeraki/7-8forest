import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverProcess = spawn('node', [join(__dirname, '___stage1/forest-mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log('Server:', data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Wait for server to start, then send the create project command
setTimeout(() => {
  const createProjectRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'create_project_forest',
      arguments: {
        projectName: 'AI Product Manager',
        goalStatement: 'Secure a role as an AI product manager, transitioning from current role as a physical security guard',
        description: 'A comprehensive career transition plan focusing on acquiring the necessary skills, knowledge, and experience to successfully move from physical security into an AI product management role. This includes learning AI/ML fundamentals, product management methodologies, building relevant experience, and networking within the AI industry.'
      }
    }
  };

  console.log('Sending create project request...');
  serverProcess.stdin.write(JSON.stringify(createProjectRequest) + '\n');
  
  // Clean shutdown after a few seconds
  setTimeout(() => {
    serverProcess.kill('SIGINT');
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }, 5000);
}, 2000);

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});
