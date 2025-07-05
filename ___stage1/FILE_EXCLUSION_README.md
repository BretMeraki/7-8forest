# File Exclusion System

## Overview

This system prevents the Forest MCP Server from processing external libraries like `node_modules`, preventing performance issues when parsing thousands of files during AST operations and vector processing.

## Problem Solved

The original issue was that the system would try to parse every file in the project directory, including:
- `node_modules/` with thousands of external library files
- Minified and bundled files (`*.min.js`, `*.bundle.js`)
- Build artifacts (`dist/`, `build/`, `coverage/`)
- Version control files (`.git/`)
- Other external dependencies

This caused significant performance problems and potential crashes when trying to parse large codebases.

## Solution Components

### 1. Centralized Configuration (`config/file-processing-config.js`)

Central configuration file that defines:
- Excluded directories (node_modules, .git, dist, etc.)
- Excluded file patterns (*.min.js, *.map, etc.)
- File size limits for different operations
- AST parsing specific settings
- Vector processing constraints

### 2. File Exclusion Utility (`utils/file-exclusion.js`)

Core utility functions:
- `isExcludedDirectory()` - Check if directory should be skipped
- `isExcludedFile()` - Check if file should be excluded
- `isParseableFile()` - Check if file can be safely parsed
- `walkDirectorySafe()` - Safe directory traversal with limits
- `getSafeFilePatterns()` - Generate safe glob patterns

### 3. .forestignore File Support

Similar to `.gitignore`, allows project-specific exclusion rules:
```
# External dependencies
node_modules/
vendor/

# Build outputs  
dist/
build/

# Large files
size:2MB

# Specific patterns
*.min.js
*.bundle.js
```

### 4. Enhanced AST Blueprint Extractor

Updated `utils/ast-blueprint-extractor.js` to:
- Use safe file exclusion checks
- Only parse intended source files
- Skip external libraries and build artifacts

### 5. Validation Tool (`utils/validate-exclusions.js`)

Testing utility to validate the exclusion system:
```bash
node utils/validate-exclusions.js
```

## Configuration Options

### Built-in Exclusions

**Directories:**
- `node_modules`, `bower_components`
- `.git`, `.svn`, `.hg`
- `dist`, `build`, `out`, `target`
- `vendor`, `third_party`, `external`
- `coverage`, `.nyc_output`, `.jest`
- Python: `__pycache__`, `venv`, `.env`

**File Patterns:**
- `*.min.js`, `*.bundle.js`, `*.chunk.js`
- `*.map`, `*.d.ts`
- `package-lock.json`, `yarn.lock`
- `*.log`, `*.tmp`, `*.cache`

### Size Limits

- **General files:** 5MB max
- **AST parsing:** 2MB max
- **Vector embedding:** 512KB max

### Runtime Constraints

- **Max files per operation:** 1,000
- **Max directory depth:** 10 levels
- **Operation timeout:** 30 seconds

## Usage Examples

### Basic File Checking

```javascript
import { isExcludedFile, isParseableFile } from './utils/file-exclusion.js';

// Check if file should be excluded
if (!isExcludedFile('src/main.js')) {
  // Safe to process
}

// Check if file can be parsed for AST
if (isParseableFile('src/component.js')) {
  // Safe to parse
}
```

### Safe Directory Walking

```javascript
import { walkDirectorySafe } from './utils/file-exclusion.js';

await walkDirectorySafe('.', (filePath, entry, depth) => {
  console.log(`Processing: ${filePath}`);
}, {
  recursive: true,
  parseableOnly: true,
  maxFiles: 500,
  maxDepth: 5
});
```

### Custom .forestignore

Create a `.forestignore` file in your project root:

```
# Custom exclusions for this project
legacy/
temp/
*.old.js

# Include specific files that would normally be excluded
!important.min.js

# Custom size limit
size:1MB
```

## Performance Benefits

### Before
- Tried to parse 10,000+ files in node_modules
- AST parsing took minutes or failed
- High memory usage
- Potential crashes

### After
- Only parses project source files
- AST parsing completes in seconds
- Low memory footprint
- Stable operation

## Integration Points

The exclusion system is integrated into:

1. **AST Blueprint Extractor** - Only parses core project files
2. **Vector Store Operations** - Excludes external libraries from embedding
3. **File Discovery** - Safe glob patterns for file searches
4. **Directory Walking** - Respects exclusions during traversal

## Environment Variables

Control exclusion behavior with environment variables:

```bash
# Enable exclusion logging (debugging)
DEBUG_FILE_EXCLUSION=true

# Enable operation monitoring
NODE_ENV=development

# Custom cache limits
VECTOR_CACHE_MAX=5000
EMBEDDING_CACHE_MAX=1000
```

## Testing

Run the validation tool to verify the system is working:

```bash
node utils/validate-exclusions.js
```

This will test:
- Directory exclusion rules
- File pattern matching
- .forestignore integration
- Safe directory walking
- Pattern generation

## Maintenance

### Adding New Exclusions

1. **Built-in exclusions:** Update `config/file-processing-config.js`
2. **Project-specific:** Add to `.forestignore`
3. **Pattern-based:** Add regex patterns to configuration

### Performance Tuning

Adjust limits in `config/file-processing-config.js`:
- `maxFileSize` - General file size limit
- `maxFilesPerOperation` - Batch processing limit
- `maxDirectoryDepth` - Traversal depth limit
- `fileOperationTimeout` - Operation timeout

## Summary

This file exclusion system ensures that the Forest MCP Server:
- ✅ Only processes intended project files
- ✅ Excludes external libraries and dependencies
- ✅ Prevents performance issues with large codebases
- ✅ Provides configurable exclusion rules
- ✅ Maintains safe AST parsing operations
- ✅ Supports ChromaDB vector operations efficiently

The system is now ready for production use with proper safeguards against processing external libraries.
