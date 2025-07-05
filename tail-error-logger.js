// tail-error-logger.js
// Watches forest-mcp-stderr.log and prints new error lines in real time

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = process.env.FOREST_DATA_DIR ?
  path.join(process.env.FOREST_DATA_DIR, 'forest-mcp.log') :
  path.join(__dirname, 'forest-mcp-stderr.log');

// Regex to match error, failed, or exception (case-insensitive)
const errorRegex = /(error|failed|exception)/i;

// Start at the end of the file
let fileSize = 0;

function printNewErrors() {
  fs.stat(LOG_FILE, (err, stats) => {
    if (err) return; // File might not exist yet
    if (stats.size < fileSize) {
      // File was truncated or rotated
      fileSize = 0;
    }
    if (stats.size > fileSize) {
      const stream = fs.createReadStream(LOG_FILE, {
        start: fileSize,
        end: stats.size
      });
      let buffer = '';
      stream.on('data', chunk => {
        buffer += chunk.toString();
      });
      stream.on('end', () => {
        buffer.split(/\r?\n/).forEach(line => {
          if (errorRegex.test(line)) {
            console.log(line);
          }
        });
        fileSize = stats.size;
      });
    }
  });
}

// Poll for new data every second
setInterval(printNewErrors, 1000);

console.log(`Watching for errors in ${LOG_FILE} ...`); 