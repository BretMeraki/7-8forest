#!/usr/bin/env node

/**
 * Filtered Filesystem Server for MCP
 * Excludes ALL log files from Claude's access - no exceptions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log patterns to exclude (NO EXCEPTIONS)
const LOG_PATTERNS = [
  /\.log$/i,                    // .log files
  /\.log\./i,                   // .log. files
  /-log\./i,                    // -log. files
  /log-/i,                      // log- prefix
  /logs\//i,                    // logs/ directory
  /\/logs$/i,                   // /logs directory
  /forest-mcp\.log/i,           // specific forest log
  /combined\.log/i,             // combined logs
  /error\.log/i,                // error logs
  /access\.log/i,               // access logs
  /debug\.log/i,                // debug logs
  /server\.log/i,               // server logs
];

class FilteredFilesystemServer {
  constructor(allowedDirectories) {
    this.allowedDirectories = allowedDirectories.map(dir => path.resolve(dir));
    this.server = new Server(
      {
        name: 'filtered-filesystem',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {
            read_file: {
              description: 'Read file contents (logs excluded)',
            },
            list_directory: {
              description: 'List directory contents (logs excluded)',
            },
          },
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];
      
      for (const dir of this.allowedDirectories) {
        try {
          const items = await this.listDirectoryFiltered(dir);
          for (const item of items) {
            if (!this.isLogFile(item.path)) {
              resources.push({
                uri: `file://${item.path}`,
                name: path.relative(dir, item.path),
                mimeType: item.type === 'file' ? this.getMimeType(item.path) : undefined,
              });
            }
          }
        } catch (error) {
          console.error(`Error listing directory ${dir}: ${error.message}`);
        }
      }
      
      return { resources };
    });

    // Read resource handler  
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (!uri.startsWith('file://')) {
        throw new Error('Only file:// URIs are supported');
      }
      
      const filePath = uri.substring(7);
      
      // Security check
      if (!this.isPathAllowed(filePath)) {
        throw new Error('Access denied: Path not in allowed directories');
      }
      
      // Log file check - STRICT EXCLUSION
      if (this.isLogFile(filePath)) {
        throw new Error('Access denied: Log files are excluded');
      }
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          contents: [
            {
              uri,
              mimeType: this.getMimeType(filePath),
              text: content,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
    });

    // Tool handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'read_file':
          return await this.handleReadFile(args);
        case 'list_directory': 
          return await this.handleListDirectory(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async handleReadFile(args) {
    const { path: filePath } = args;
    
    if (!filePath) {
      throw new Error('Path is required');
    }
    
    const absolutePath = path.resolve(filePath);
    
    if (!this.isPathAllowed(absolutePath)) {
      throw new Error('Access denied: Path not in allowed directories');
    }
    
    // STRICT LOG EXCLUSION
    if (this.isLogFile(absolutePath)) {
      throw new Error('Access denied: Log files are excluded');
    }
    
    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async handleListDirectory(args) {
    const { path: dirPath } = args;
    
    if (!dirPath) {
      throw new Error('Path is required');
    }
    
    const absolutePath = path.resolve(dirPath);
    
    if (!this.isPathAllowed(absolutePath)) {
      throw new Error('Access denied: Path not in allowed directories');
    }
    
    try {
      const items = await this.listDirectoryFiltered(absolutePath);
      // Filter out ALL log files
      const filteredItems = items.filter(item => !this.isLogFile(item.path));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filteredItems, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async listDirectoryFiltered(dirPath) {
    const items = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip ALL log files and directories
        if (this.isLogFile(fullPath)) {
          continue;
        }
        
        items.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
        });
        
        // Recursively list subdirectories (but still filter logs)
        if (entry.isDirectory()) {
          try {
            const subItems = await this.listDirectoryFiltered(fullPath);
            items.push(...subItems);
          } catch (error) {
            // Continue if subdirectory can't be read
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}: ${error.message}`);
    }
    
    return items;
  }

  isLogFile(filePath) {
    const normalizedPath = path.normalize(filePath);
    return LOG_PATTERNS.some(pattern => pattern.test(normalizedPath));
  }

  isPathAllowed(filePath) {
    const normalizedPath = path.resolve(filePath);
    return this.allowedDirectories.some(allowedDir => 
      normalizedPath.startsWith(allowedDir)
    );
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
    };
    return mimeMap[ext] || 'text/plain';
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filtered filesystem server started (logs excluded)');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const allowedDirectories = process.argv.slice(2);
  
  if (allowedDirectories.length === 0) {
    console.error('Usage: node filtered-filesystem-server.js <directory1> [directory2...]');
    process.exit(1);
  }
  
  const server = new FilteredFilesystemServer(allowedDirectories);
  server.start().catch(console.error);
}

export default FilteredFilesystemServer;
