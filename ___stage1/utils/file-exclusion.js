/**
 * File Exclusion Utility
 * 
 * Provides utilities to exclude external libraries and unwanted directories
 * from AST parsing, file globbing, and runtime operations.
 * 
 * This prevents performance issues when parsing thousands of files in
 * node_modules and other external dependency directories.
 */

import path from 'path';
import fs from 'fs/promises';
import fileProcessingConfig from '../config/file-processing-config.js';

// Use centralized configuration
export const EXCLUDED_DIRECTORIES = fileProcessingConfig.excludedDirectories;
export const EXCLUDED_FILE_PATTERNS = fileProcessingConfig.excludedFilePatterns;
export const PARSEABLE_EXTENSIONS = fileProcessingConfig.parseableExtensions;

// Configuration shortcuts
const config = fileProcessingConfig;

// Cache for parsed .forestignore rules
let forestIgnoreRules = null;
let forestIgnoreTimestamp = 0;

/**
 * Parse .forestignore file for additional exclusion rules
 * @param {string} rootDir - Root directory to look for .forestignore
 * @returns {object} - Parsed ignore rules
 */
function parseForestIgnore(rootDir = '.') {
  const forestIgnorePath = path.join(rootDir, '.forestignore');
  
  try {
    const fs = require('fs');
    const stats = fs.statSync(forestIgnorePath);
    
    // Use cached rules if file hasn't changed
    if (forestIgnoreRules && stats.mtimeMs <= forestIgnoreTimestamp) {
      return forestIgnoreRules;
    }
    
    const content = fs.readFileSync(forestIgnorePath, 'utf8');
    const lines = content.split('\n');
    
    const rules = {
      patterns: [],
      directories: [],
      extensions: [],
      negated: [], // Patterns that should NOT be ignored (starting with !)
      sizeLimit: null
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Handle negated patterns (include these files)
      if (trimmed.startsWith('!')) {
        rules.negated.push(trimmed.slice(1));
        continue;
      }
      
      // Handle size limits
      if (trimmed.startsWith('size:')) {
        const sizeStr = trimmed.slice(5).trim().toLowerCase();
        rules.sizeLimit = parseSizeString(sizeStr);
        continue;
      }
      
      // Handle directory patterns
      if (trimmed.endsWith('/')) {
        rules.directories.push(trimmed.slice(0, -1));
      }
      // Handle extension patterns
      else if (trimmed.startsWith('*.')) {
        rules.extensions.push(trimmed.slice(1)); // Remove * to get .ext
      }
      // Handle general patterns
      else {
        rules.patterns.push(trimmed);
      }
    }
    
    forestIgnoreRules = rules;
    forestIgnoreTimestamp = stats.mtimeMs;
    
    if (config.runtime.enableMonitoring) {
      console.log(`[file-exclusion] Loaded .forestignore with ${rules.patterns.length + rules.directories.length + rules.extensions.length} rules`);
    }
    
    return rules;
    
  } catch (error) {
    // If .forestignore doesn't exist or can't be read, return empty rules
    forestIgnoreRules = { patterns: [], directories: [], extensions: [], negated: [], sizeLimit: null };
    return forestIgnoreRules;
  }
}

/**
 * Parse size string like "2MB", "500KB", "1GB" into bytes
 * @param {string} sizeStr - Size string to parse
 * @returns {number} - Size in bytes
 */
function parseSizeString(sizeStr) {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toLowerCase();
  
  switch (unit) {
    case 'kb': return value * 1024;
    case 'mb': return value * 1024 * 1024;
    case 'gb': return value * 1024 * 1024 * 1024;
    default: return value; // Assume bytes if no unit
  }
}

/**
 * Check if a directory should be excluded from file operations
 * @param {string} dirPath - Directory path to check
 * @param {string} rootDir - Root directory for .forestignore lookup
 * @returns {boolean} - True if directory should be excluded
 */
export function isExcludedDirectory(dirPath, rootDir = '.') {
  if (!dirPath || typeof dirPath !== 'string') return true;
  
  const normalizedPath = path.normalize(dirPath);
  const parts = normalizedPath.split(path.sep);
  const dirName = path.basename(normalizedPath);
  
  // Check built-in excluded directories
  const builtin_excluded = parts.some(part => 
    EXCLUDED_DIRECTORIES.includes(part.toLowerCase()) ||
    part.startsWith('.') && part !== '.' && part !== '..'
  );
  
  if (builtin_excluded) return true;
  
  // Check .forestignore rules
  try {
    const ignoreRules = parseForestIgnore(rootDir);
    
    // Check directory patterns from .forestignore
    const forestignore_excluded = ignoreRules.directories.some(pattern => {
      return dirName === pattern || normalizedPath.includes(pattern);
    });
    
    if (forestignore_excluded) {
      // Check if it's negated (should be included)
      const isNegated = ignoreRules.negated.some(pattern => {
        return dirName === pattern || normalizedPath.includes(pattern);
      });
      
      return !isNegated;
    }
  } catch (error) {
    // If error parsing .forestignore, fall back to built-in rules
  }
  
  return false;
}

/**
 * Check if a file should be excluded from operations
 * @param {string} filePath - File path to check
 * @param {object} options - Additional options for checking
 * @returns {boolean} - True if file should be excluded
 */
export function isExcludedFile(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') return true;
  
  const fileName = path.basename(filePath);
  const normalizedPath = path.normalize(filePath);
  const fileExt = path.extname(filePath);
  const { checkSize = false, forAST = false, forEmbedding = false, rootDir = '.' } = options;
  
  // Check directory exclusions
  if (isExcludedDirectory(path.dirname(normalizedPath), rootDir)) {
    if (config.runtime.logExcludedFiles) {
      console.log(`[file-exclusion] Excluded file in excluded directory: ${filePath}`);
    }
    return true;
  }
  
  // Check built-in file pattern exclusions
  if (EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(fileName))) {
    if (config.runtime.logExcludedFiles) {
      console.log(`[file-exclusion] Excluded file by built-in pattern: ${filePath}`);
    }
    return true;
  }
  
  // Check .forestignore rules
  try {
    const ignoreRules = parseForestIgnore(rootDir);
    
    // Check extension patterns
    const extensionExcluded = ignoreRules.extensions.includes(fileExt);
    
    // Check general patterns
    const patternExcluded = ignoreRules.patterns.some(pattern => {
      // Simple pattern matching - could be enhanced with glob patterns
      return fileName === pattern || fileName.includes(pattern) || normalizedPath.includes(pattern);
    });
    
    if (extensionExcluded || patternExcluded) {
      // Check if it's negated (should be included)
      const isNegated = ignoreRules.negated.some(pattern => {
        return fileName === pattern || fileName.includes(pattern) || normalizedPath.includes(pattern);
      });
      
      if (!isNegated) {
        if (config.runtime.logExcludedFiles) {
          console.log(`[file-exclusion] Excluded file by .forestignore: ${filePath}`);
        }
        return true;
      }
    }
    
    // Check size limit from .forestignore
    if (ignoreRules.sizeLimit && checkSize) {
      try {
        const stats = require('fs').statSync(filePath);
        if (stats.size > ignoreRules.sizeLimit) {
          if (config.runtime.logExcludedFiles) {
            console.log(`[file-exclusion] Excluded file by .forestignore size limit (${stats.size} > ${ignoreRules.sizeLimit}): ${filePath}`);
          }
          return true;
        }
      } catch (error) {
        // If we can't stat the file, exclude it
        return true;
      }
    }
  } catch (error) {
    // If error parsing .forestignore, fall back to built-in rules
  }
  
  // AST-specific exclusions
  if (forAST && config.astParsing.astExcludePatterns.some(pattern => pattern.test(fileName))) {
    if (config.runtime.logExcludedFiles) {
      console.log(`[file-exclusion] Excluded file from AST parsing: ${filePath}`);
    }
    return true;
  }
  
  // File size checks (if requested)
  if (checkSize) {
    try {
      const stats = require('fs').statSync(filePath);
      let maxSize = config.maxFileSize;
      
      if (forAST) maxSize = config.astParsing.maxFileSizeForAST;
      if (forEmbedding) maxSize = config.vectorProcessing.maxFileSizeForEmbedding;
      
      if (stats.size > maxSize) {
        if (config.runtime.logExcludedFiles) {
          console.log(`[file-exclusion] Excluded large file (${stats.size} bytes): ${filePath}`);
        }
        return true;
      }
    } catch (error) {
      // If we can't stat the file, exclude it
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a file is parseable for AST operations
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if file can be parsed
 */
export function isParseableFile(filePath) {
  if (isExcludedFile(filePath, { checkSize: true, forAST: true })) return false;
  
  const ext = path.extname(filePath).toLowerCase();
  return PARSEABLE_EXTENSIONS.includes(ext);
}

/**
 * Filter an array of file paths to exclude unwanted files
 * @param {string[]} filePaths - Array of file paths
 * @param {boolean} parseableOnly - If true, only return parseable files
 * @returns {string[]} - Filtered array of file paths
 */
export function filterFiles(filePaths, parseableOnly = false) {
  if (!Array.isArray(filePaths)) return [];
  
  return filePaths.filter(filePath => {
    if (parseableOnly) {
      return isParseableFile(filePath);
    }
    return !isExcludedFile(filePath);
  });
}

/**
 * Create a glob pattern that excludes unwanted directories
 * @param {string} basePattern - Base glob pattern
 * @param {string} rootDir - Root directory for the search
 * @returns {string[]} - Array of patterns including exclusions
 */
export function createSafeGlobPattern(basePattern, rootDir = '.') {
  const exclusionPatterns = EXCLUDED_DIRECTORIES.map(dir => `!**/${dir}/**`);
  
  return [
    basePattern,
    ...exclusionPatterns,
    '!**/.*/**', // Exclude all hidden directories
    '!**/*.min.js',
    '!**/*.map',
    '!**/*.bundle.js',
    '!**/*.chunk.js'
  ];
}

/**
 * Safe directory walker that respects exclusions
 * @param {string} rootDir - Root directory to walk
 * @param {function} callback - Callback function for each valid file
 * @param {object} options - Options for walking
 */
export async function walkDirectorySafe(rootDir, callback, options = {}) {
  const { 
    recursive = true, 
    parseableOnly = false,
    maxDepth = config.maxDirectoryDepth,
    maxFiles = config.runtime.maxFilesPerOperation,
    signal = null // AbortSignal for cancellation
  } = options;
  
  let fileCount = 0;
  const startTime = Date.now();
  
  async function walkDir(currentDir, depth = 0) {
    // Check abort signal
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }
    
    // Check timeout
    if (Date.now() - startTime > config.runtime.fileOperationTimeout) {
      throw new Error('File operation timeout exceeded');
    }
    
    // Check depth limit
    if (depth > maxDepth) {
      if (config.runtime.logExcludedFiles) {
        console.log(`[file-exclusion] Skipping directory due to depth limit: ${currentDir}`);
      }
      return;
    }
    
    // Check file count limit
    if (fileCount >= maxFiles) {
      if (config.runtime.logExcludedFiles) {
        console.log(`[file-exclusion] Reached file limit (${maxFiles}), stopping walk`);
      }
      return;
    }
    
    if (isExcludedDirectory(currentDir)) {
      return; // Skip entire directory
    }
    
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Check limits again in the loop
        if (signal?.aborted || fileCount >= maxFiles) break;
        
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (recursive && !isExcludedDirectory(fullPath)) {
            await walkDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const shouldProcess = parseableOnly 
            ? isParseableFile(fullPath) 
            : !isExcludedFile(fullPath, { checkSize: true });
            
          if (shouldProcess) {
            fileCount++;
            await callback(fullPath, entry, depth);
          }
        }
      }
    } catch (error) {
      // Log warnings for important errors, but continue walking
      if (error.code !== 'EACCES' && error.code !== 'EPERM') {
        console.warn(`[file-exclusion] Error reading directory ${currentDir}: ${error.message}`);
      }
    }
  }
  
  try {
    await walkDir(rootDir);
    
    if (config.runtime.enableMonitoring) {
      console.log(`[file-exclusion] Processed ${fileCount} files in ${Date.now() - startTime}ms`);
    }
  } catch (error) {
    if (config.runtime.enableMonitoring) {
      console.error(`[file-exclusion] Walk failed after ${fileCount} files: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get safe file patterns for use with file globbing tools
 * @param {string[]} includePatterns - Patterns to include
 * @returns {object} - Object with include and exclude patterns
 */
export function getSafeFilePatterns(includePatterns = ['**/*.js']) {
  const excludePatterns = [
    ...EXCLUDED_DIRECTORIES.map(dir => `**/${dir}/**`),
    '**/.*/**',
    '**/*.min.js',
    '**/*.map',
    '**/*.bundle.js',
    '**/*.chunk.js',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml'
  ];
  
  return {
    include: includePatterns,
    exclude: excludePatterns,
    // Combined for tools that need a single pattern array
    combined: [
      ...includePatterns,
      ...excludePatterns.map(pattern => `!${pattern}`)
    ]
  };
}

export default {
  EXCLUDED_DIRECTORIES,
  EXCLUDED_FILE_PATTERNS,
  PARSEABLE_EXTENSIONS,
  isExcludedDirectory,
  isExcludedFile,
  isParseableFile,
  filterFiles,
  createSafeGlobPattern,
  walkDirectorySafe,
  getSafeFilePatterns
};
