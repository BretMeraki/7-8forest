import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverProcess = spawn('node', [join(__dirname, '___stage1/forest-mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('=== SERVER RESPONSE ===');
  console.log(response);
  console.log('======================');
  
  // Parse the response to see if it's the landing page
  try {
    const jsonResponse = JSON.parse(response);
    if (jsonResponse.result && jsonResponse.result.content) {
      const content = jsonResponse.result.content[0].text;
      
      // If we see the landing page, send the actual create project command
      if (content.includes('START NEW PROJECT')) {
        console.log('Landing page received, sending create project command...');
        
        setTimeout(() => {
          const createProjectRequest = {
            jsonrpc: '2.0',
            id: ++messageId,
            method: 'tools/call',
            params: {
              name: 'create_project_forest',
              arguments: {
                project_id: 'ai_product_manager',
                goal: 'Secure a role as an AI product manager, transitioning from current role as a physical security guard',
                context: 'Currently working as a physical security guard but seeking a career transition into the AI/tech industry as a product manager. This transition represents a significant shift from physical security to technology leadership, requiring comprehensive skill development in AI/ML fundamentals, product management methodologies, and industry networking.',
                specific_interests: [
                  'Learn AI and machine learning fundamentals',
                  'Master product management frameworks (Agile, Scrum, OKRs)',
                  'Build a portfolio of AI product case studies',
                  'Network with AI industry professionals',
                  'Obtain relevant certifications (Product Management, AI/ML)'
                ],
                constraints: {
                  time_constraints: 'Currently working full-time as security guard, need to learn during evenings and weekends',
                  energy_patterns: 'High energy in mornings and evenings, lower during traditional work hours',
                  focus_variability: 'Focused and motivated when working toward clear career goals',
                  financial_constraints: 'Limited budget for courses and certifications, prefer free/low-cost resources initially',
                  location_constraints: 'Home-based learning setup, need online resources and remote networking opportunities'
                }
              }
            }
          };

          console.log('Sending actual create project request...');
          serverProcess.stdin.write(JSON.stringify(createProjectRequest) + '\n');
        }, 1000);
      }
    }
  } catch (error) {
    // Not JSON, might be initialization logs
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log('Server Log:', data.toString());
});

// Wait for server to start, then send initial request
setTimeout(() => {
  const initialRequest = {
    jsonrpc: '2.0',
    id: messageId,
    method: 'tools/call',
    params: {
      name: 'list_projects_forest',
      arguments: {}
    }
  };

  console.log('Sending initial request to trigger landing page...');
  serverProcess.stdin.write(JSON.stringify(initialRequest) + '\n');
  
  // Clean shutdown after enough time
  setTimeout(() => {
    serverProcess.kill('SIGINT');
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }, 10000);
}, 3000);

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});
