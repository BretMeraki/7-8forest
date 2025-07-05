/**
 * File Integrity Checker
 * 
 * Detects real file corruption vs normal UTF-8 encoding issues.
 * Helps distinguish between legitimate Unicode content and actual corruption.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { isExcludedFile, walkDirectorySafe } from './file-exclusion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if bytes represent valid UTF-8 encoding
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} - True if valid UTF-8
 */
function isValidUTF8(buffer) {
  try {
    const str = buffer.toString('utf8');
    const backToBuffer = Buffer.from(str, 'utf8');
    return buffer.equals(backToBuffer);
  } catch {
    return false;
  }
}

/**
 * Detect signs of actual file corruption
 * @param {Buffer} buffer - File buffer
 * @param {string} filePath - File path for context
 * @returns {object} - Corruption analysis
 */
function analyzeCorruption(buffer, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const analysis = {
    isCorrupted: false,
    issues: [],
    encoding: 'unknown',
    confidence: 0
  };

  // Check for completely null/empty files
  if (buffer.length === 0) {
    analysis.isCorrupted = true;
    analysis.issues.push('Empty file');
    return analysis;
  }

  // Check for files that are all null bytes
  if (buffer.every(byte => byte === 0)) {
    analysis.isCorrupted = true;
    analysis.issues.push('All null bytes - likely corrupted');
    return analysis;
  }

  // Check for valid UTF-8
  if (isValidUTF8(buffer)) {
    analysis.encoding = 'utf8';
    analysis.confidence = 0.9;
  } else {
    // Try other encodings
    try {
      buffer.toString('ascii');
      analysis.encoding = 'ascii';
      analysis.confidence = 0.7;
    } catch {
      try {
        buffer.toString('latin1');
        analysis.encoding = 'latin1';
        analysis.confidence = 0.5;
      } catch {
        analysis.encoding = 'binary';
        analysis.confidence = 0.1;
      }
    }
  }

  // Check for common corruption patterns
  const corruptionPatterns = [
    // Repeated null bytes in text files
    { pattern: /\x00{10,}/, description: 'Long sequences of null bytes', severity: 'high' },
    // Invalid UTF-8 sequences
    { pattern: /[\xC0-\xC1][\x80-\xBF]/, description: 'Invalid UTF-8 overlong encoding', severity: 'high' },
    // Control characters in wrong context
    { pattern: /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/, description: 'Control characters', severity: 'medium' },
    // Suspicious binary patterns in text files
    { pattern: /[\xFF\xFE]{4,}/, description: 'Repeated 0xFF/0xFE bytes', severity: 'high' }
  ];

  // Only check text files for text-based corruption
  const textExtensions = ['.js', '.ts', '.json', '.md', '.txt', '.html', '.css', '.xml'];
  const isTextFile = textExtensions.includes(ext);

  if (isTextFile) {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)); // Check first 10KB
    
    for (const { pattern, description, severity } of corruptionPatterns) {
      if (pattern.test(content)) {
        analysis.issues.push({ description, severity });
        if (severity === 'high') {
          analysis.isCorrupted = true;
        }
      }
    }

    // Check for truncated JSON
    if (ext === '.json') {
      try {
        JSON.parse(content);
      } catch (error) {
        if (content.trim().length > 0) {
          analysis.issues.push({ description: 'Invalid JSON syntax', severity: 'high' });
          analysis.isCorrupted = true;
        }
      }
    }

    // Check for truncated JavaScript
    if (['.js', '.ts'].includes(ext)) {
      // Look for incomplete function/class definitions
      const incompletePatterns = [
        /function\s+\w+\s*\([^)]*$/m,  // Function without closing paren
        /class\s+\w+\s*{[^}]*$/m,      // Class without closing brace
        /=>\s*$/m                      // Arrow function without body
      ];

      for (const pattern of incompletePatterns) {
        if (pattern.test(content)) {
          analysis.issues.push({ description: 'Potentially truncated JavaScript', severity: 'medium' });
        }
      }
    }
  }

  // Check binary files for known signatures
  if (!isTextFile) {
    // Check for known binary file signatures
    const signatures = {
      'PNG': [0x89, 0x50, 0x4E, 0x47],
      'JPG': [0xFF, 0xD8, 0xFF],
      'PDF': [0x25, 0x50, 0x44, 0x46],
      'ZIP': [0x50, 0x4B, 0x03, 0x04]
    };

    let hasValidSignature = false;
    for (const [format, sig] of Object.entries(signatures)) {
      if (buffer.length >= sig.length && 
          sig.every((byte, i) => buffer[i] === byte)) {
        hasValidSignature = true;
        analysis.encoding = format;
        break;
      }
    }

    if (!hasValidSignature && buffer.length > 4) {
      analysis.issues.push({ description: 'Unknown binary format or corrupted header', severity: 'medium' });
    }
  }

  return analysis;
}

/**
 * Check a single file for corruption
 * @param {string} filePath - Path to file to check
 * @returns {object} - File integrity report
 */
async function checkFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    
    const analysis = analyzeCorruption(buffer, filePath);
    
    return {
      filePath,
      size: stats.size,
      modified: stats.mtime,
      ...analysis,
      status: analysis.isCorrupted ? 'CORRUPTED' : 'OK'
    };
  } catch (error) {
    return {
      filePath,
      isCorrupted: true,
      issues: [{ description: `Cannot read file: ${error.message}`, severity: 'high' }],
      status: 'ERROR',
      error: error.message
    };
  }
}

/**
 * Scan directory for file integrity issues
 * @param {string} rootDir - Directory to scan
 * @param {object} options - Scan options
 * @returns {object} - Integrity report
 */
async function scanDirectory(rootDir = '.', options = {}) {
  const {
    maxFiles = 1000,
    includeBinary = false,
    verbose = false
  } = options;

  const report = {
    scannedFiles: 0,
    corruptedFiles: 0,
    errorFiles: 0,
    issues: [],
    summary: {}
  };

  console.log(`🔍 Scanning ${rootDir} for file integrity issues...`);

  await walkDirectorySafe(rootDir, async (filePath, entry, depth) => {
    if (report.scannedFiles >= maxFiles) return;

    // Skip binary files unless requested
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz'];
    if (!includeBinary && binaryExtensions.includes(ext)) {
      return;
    }

    const result = await checkFile(filePath);
    report.scannedFiles++;

    if (result.status === 'CORRUPTED') {
      report.corruptedFiles++;
      report.issues.push(result);
      
      if (verbose) {
        console.log(`❌ CORRUPTED: ${filePath}`);
        result.issues.forEach(issue => {
          console.log(`   → ${issue.description} (${issue.severity})`);
        });
      }
    } else if (result.status === 'ERROR') {
      report.errorFiles++;
      report.issues.push(result);
      
      if (verbose) {
        console.log(`⚠️  ERROR: ${filePath} - ${result.error}`);
      }
    } else if (verbose && result.issues.length > 0) {
      console.log(`⚠️  WARNINGS: ${filePath}`);
      result.issues.forEach(issue => {
        console.log(`   → ${issue.description} (${issue.severity})`);
      });
    }
  }, {
    recursive: true,
    parseableOnly: false,
    maxFiles: maxFiles
  });

  // Generate summary
  report.summary = {
    totalScanned: report.scannedFiles,
    corruptedCount: report.corruptedFiles,
    errorCount: report.errorFiles,
    healthyCount: report.scannedFiles - report.corruptedFiles - report.errorFiles,
    healthPercentage: ((report.scannedFiles - report.corruptedFiles - report.errorFiles) / report.scannedFiles * 100).toFixed(1)
  };

  return report;
}

/**
 * Fix common encoding issues
 * @param {string} filePath - File to fix
 * @param {object} options - Fix options
 */
async function fixEncodingIssues(filePath, options = {}) {
  const { backup = true, encoding = 'utf8' } = options;

  try {
    // Create backup if requested
    if (backup) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      console.log(`📄 Backup created: ${backupPath}`);
    }

    // Read file as buffer
    const buffer = await fs.readFile(filePath);
    
    // Convert to string and back to clean up encoding
    const content = buffer.toString(encoding);
    await fs.writeFile(filePath, content, encoding);
    
    console.log(`✅ Fixed encoding for: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to fix ${filePath}: ${error.message}`);
    return false;
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';
  
  if (command === 'scan') {
    const targetDir = args[1] || '.';
    scanDirectory(targetDir, { verbose: true, maxFiles: 100 })
      .then(report => {
        console.log('\n📊 Integrity Scan Results:');
        console.log('==========================');
        console.log(`Total files scanned: ${report.summary.totalScanned}`);
        console.log(`Healthy files: ${report.summary.healthyCount} (${report.summary.healthPercentage}%)`);
        console.log(`Corrupted files: ${report.summary.corruptedCount}`);
        console.log(`Error files: ${report.summary.errorCount}`);
        
        if (report.summary.corruptedCount > 0) {
          console.log('\n❌ Corrupted files found:');
          report.issues.filter(i => i.status === 'CORRUPTED').forEach(issue => {
            console.log(`   ${issue.filePath}`);
            issue.issues.forEach(problem => {
              console.log(`     → ${problem.description}`);
            });
          });
        }
        
        if (report.summary.healthPercentage < 95) {
          console.log('\n⚠️  File integrity issues detected. Consider running repair operations.');
          process.exit(1);
        } else {
          console.log('\n✅ File integrity looks good!');
        }
      })
      .catch(error => {
        console.error('❌ Scan failed:', error);
        process.exit(1);
      });
  } else if (command === 'fix') {
    const filePath = args[1];
    if (!filePath) {
      console.error('Usage: node file-integrity-checker.js fix <file-path>');
      process.exit(1);
    }
    fixEncodingIssues(filePath)
      .then(success => {
        process.exit(success ? 0 : 1);
      });
  } else {
    console.log('Usage:');
    console.log('  node file-integrity-checker.js scan [directory]');
    console.log('  node file-integrity-checker.js fix <file-path>');
  }
}

export { checkFile, scanDirectory, fixEncodingIssues, analyzeCorruption };
