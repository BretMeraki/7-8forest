// Official entry point for Sequential Thinking MCP Server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = path.join(__dirname, 'servers', 'sequentialthinking', 'dist', 'index.js');

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'servers', 'sequentialthinking'),
});

child.on('error', (err) => {
  console.error('Failed to start Sequential Thinking MCP Server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Sequential Thinking MCP Server exited with code ${code}`);
  }
});
