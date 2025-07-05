/**
 * File Processing Configuration
 * 
 * Centralized configuration for file exclusions, AST parsing settings,
 * and runtime operation constraints to prevent processing of external
 * libraries and unwanted directories.
 */

export default {
  // Directories to completely exclude from all file operations
  excludedDirectories: [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'out',
    'target',
    'vendor',
    'third_party',
    'external',
    'deps',
    'packages',
    '.npm',
    '.yarn',
    '.pnpm',
    'bower_components',
    '.webpack',
    '.next',
    '.nuxt',
    '.vuepress',
    'coverage',
    '.nyc_output',
    '.jest',
    '__pycache__',
    '.pytest_cache',
    '.tox',
    'venv',
    'env',
    '.env',
    '.venv'
  ],

  // File patterns to exclude (regex patterns)
  excludedFilePatterns: [
    /^\..*$/, // Hidden files
    /\.min\.js$/,
    /\.map$/,
    /\.bundle\.js$/,
    /\.chunk\.js$/,
    /\.lock$/,
    /\.log$/,
    /\.tmp$/,
    /\.temp$/,
    /\.cache$/,
    /\.git.*/,
    /node_modules/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.d\.ts$/ // TypeScript declaration files
  ],

  // File extensions that are safe to parse for AST operations
  parseableExtensions: [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs'
  ],

  // Maximum file size for parsing (in bytes) - skip very large files
  maxFileSize: 1024 * 1024 * 5, // 5MB

  // Maximum directory depth to traverse
  maxDirectoryDepth: 10,

  // AST parsing specific settings
  astParsing: {
    // Skip files larger than this size for AST parsing
    maxFileSizeForAST: 1024 * 1024 * 2, // 2MB
    
    // Babel parser options
    parserOptions: {
      sourceType: 'module',
      plugins: [
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
        'typescript'
      ],
      allowImportExportEverywhere: true,
      errorRecovery: true,
      strictMode: false
    },

    // Files to specifically target for blueprint extraction
    targetFiles: [
      'hta-core.js',
      'task-strategy-core.js'
    ],

    // Exclude from AST parsing even if extension matches
    astExcludePatterns: [
      /\.test\.js$/,
      /\.spec\.js$/,
      /\.mock\.js$/,
      /\.config\.js$/,
      /webpack\./,
      /rollup\./,
      /babel\./,
      /jest\./
    ]
  },

  // Vector/embedding processing settings
  vectorProcessing: {
    // Skip embedding files larger than this
    maxFileSizeForEmbedding: 1024 * 512, // 512KB
    
    // Only process these file types for embeddings
    embeddableExtensions: [
      '.js',
      '.ts',
      '.md',
      '.txt',
      '.json'
    ]
  },

  // Runtime operation constraints
  runtime: {
    // Maximum number of files to process in a single operation
    maxFilesPerOperation: 1000,
    
    // Timeout for file operations (milliseconds)
    fileOperationTimeout: 30000, // 30 seconds
    
    // Enable file operation monitoring
    enableMonitoring: process.env.NODE_ENV === 'development',
    
    // Log excluded files (for debugging)
    logExcludedFiles: process.env.DEBUG_FILE_EXCLUSION === 'true'
  }
};
