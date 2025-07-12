#!/usr/bin/env node

/**
 * Migration Script: ChromaDB to SQLite Vector Store
 * 
 * This script migrates existing ChromaDB data to SQLite format and configures
 * the system to use SQLiteVecProvider as the primary vector provider.
 * 
 * Features:
 * - Migrates all vector data from ChromaDB to SQLite
 * - Preserves metadata and vector embeddings
 * - Updates configuration to use SQLiteVecProvider
 * - Cleans up old ChromaDB data directory
 * - Provides detailed migration report
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import vector providers
import ChromaDBProvider from './___stage1/modules/vector-providers/ChromaDBProvider.js';
import SQLiteVecProvider from './___stage1/modules/vector-providers/SQLiteVecProvider.js';

class ChromaToSQLiteMigrator {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || '.forest-data',
      chromaDataDir: options.chromaDataDir || '.forest-data/chroma-data',
      sqliteDbPath: options.sqliteDbPath || 'forest_vectors.sqlite',
      backupDir: options.backupDir || '.forest-data/migration-backup',
      dryRun: options.dryRun || false,
      ...options
    };
    
    this.migrationStats = {
      totalVectors: 0,
      migratedVectors: 0,
      errors: [],
      startTime: new Date(),
      endTime: null,
      collections: []
    };
  }

  async migrate() {
    console.log('🚀 Starting ChromaDB to SQLite migration...');
    console.log(`📁 Data directory: ${this.options.dataDir}`);
    console.log(`🗄️  SQLite database: ${this.options.sqliteDbPath}`);
    console.log(`🔄 Dry run: ${this.options.dryRun ? 'Yes' : 'No'}`);
    console.log('');

    try {
      // Step 1: Check if ChromaDB data exists
      await this.checkChromaDataExists();
      
      // Step 2: Create backup
      await this.createBackup();
      
      // Step 3: Initialize providers
      await this.initializeProviders();
      
      // Step 4: Migrate vector data
      await this.migrateVectorData();
      
      // Step 5: Update configuration
      await this.updateConfiguration();
      
      // Step 6: Clean up ChromaDB data (if not dry run)
      if (!this.options.dryRun) {
        await this.cleanupChromaData();
      }
      
      // Step 7: Generate migration report
      await this.generateMigrationReport();
      
      console.log('✅ Migration completed successfully!');
      return this.migrationStats;
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      this.migrationStats.errors.push(error.message);
      throw error;
    } finally {
      this.migrationStats.endTime = new Date();
    }
  }

  async checkChromaDataExists() {
    console.log('🔍 Checking for ChromaDB data...');
    
    const chromaPath = path.join(process.cwd(), this.options.chromaDataDir);
    try {
      const stats = await fs.stat(chromaPath);
      if (stats.isDirectory()) {
        console.log(`✅ Found ChromaDB data at: ${chromaPath}`);
        
        // Check for chroma.sqlite3 file
        const chromaDbFile = path.join(chromaPath, 'chroma.sqlite3');
        try {
          await fs.access(chromaDbFile);
          console.log(`✅ Found ChromaDB database file: ${chromaDbFile}`);
        } catch {
          console.log(`⚠️  ChromaDB database file not found at: ${chromaDbFile}`);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No ChromaDB data found. This might be a fresh installation.');
        console.log('   Migration will proceed to configure SQLiteVecProvider as primary.');
      } else {
        throw new Error(`Failed to check ChromaDB data: ${error.message}`);
      }
    }
  }

  async createBackup() {
    console.log('💾 Creating backup of existing data...');
    
    const backupPath = path.join(process.cwd(), this.options.backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupPath, `migration-backup-${timestamp}`);
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // Backup ChromaDB data if it exists
      const chromaPath = path.join(process.cwd(), this.options.chromaDataDir);
      try {
        await fs.access(chromaPath);
        await this.copyDirectory(chromaPath, path.join(backupDir, 'chroma-data'));
        console.log(`✅ ChromaDB data backed up to: ${backupDir}/chroma-data`);
      } catch {
        console.log('ℹ️  No ChromaDB data to backup');
      }
      
      // Backup existing SQLite database if it exists
      const sqlitePath = path.join(process.cwd(), this.options.sqliteDbPath);
      try {
        await fs.access(sqlitePath);
        await fs.copyFile(sqlitePath, path.join(backupDir, 'forest_vectors.sqlite.bak'));
        console.log(`✅ Existing SQLite database backed up to: ${backupDir}/forest_vectors.sqlite.bak`);
      } catch {
        console.log('ℹ️  No existing SQLite database to backup');
      }
      
      // Backup configuration files
      const configFiles = [
        '___stage1/config/vector-config.js',
        '.forest-data/config.json'
      ];
      
      for (const configFile of configFiles) {
        const configPath = path.join(process.cwd(), configFile);
        try {
          await fs.access(configPath);
          const fileName = path.basename(configFile);
          await fs.copyFile(configPath, path.join(backupDir, `${fileName}.bak`));
          console.log(`✅ Configuration backed up: ${fileName}`);
        } catch {
          console.log(`ℹ️  Configuration file not found: ${configFile}`);
        }
      }
      
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async initializeProviders() {
    console.log('🔧 Initializing vector providers...');
    
    // Initialize ChromaDB provider (if available)
    try {
      this.chromaProvider = new ChromaDBProvider({
        collection: 'forest_vectors',
        path: this.options.chromaDataDir
      });
      
      await this.chromaProvider.initialize();
      console.log('✅ ChromaDB provider initialized');
    } catch (error) {
      console.log(`ℹ️  ChromaDB provider not available: ${error.message}`);
      this.chromaProvider = null;
    }
    
    // Initialize SQLite provider
    try {
      this.sqliteProvider = new SQLiteVecProvider({
        dbPath: this.options.sqliteDbPath,
        dimension: 1536
      });
      
      await this.sqliteProvider.initialize();
      console.log('✅ SQLite provider initialized');
    } catch (error) {
      throw new Error(`SQLite provider initialization failed: ${error.message}`);
    }
  }

  async migrateVectorData() {
    console.log('📦 Migrating vector data...');
    
    if (!this.chromaProvider) {
      console.log('ℹ️  No ChromaDB data to migrate');
      return;
    }
    
    try {
      // Get all vectors from ChromaDB
      const vectors = await this.chromaProvider.listVectors();
      this.migrationStats.totalVectors = vectors.length;
      
      console.log(`📊 Found ${vectors.length} vectors to migrate`);
      
      if (vectors.length === 0) {
        console.log('ℹ️  No vectors found in ChromaDB');
        return;
      }
      
      // Migrate each vector
      for (const vectorData of vectors) {
        try {
          if (this.options.dryRun) {
            console.log(`🔍 [DRY RUN] Would migrate vector: ${vectorData.id}`);
          } else {
            await this.sqliteProvider.upsertVector(
              vectorData.id,
              vectorData.vector,
              vectorData.metadata || {}
            );
            console.log(`✅ Migrated vector: ${vectorData.id}`);
          }
          
          this.migrationStats.migratedVectors++;
          
        } catch (error) {
          const errorMsg = `Failed to migrate vector ${vectorData.id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.migrationStats.errors.push(errorMsg);
        }
      }
      
      console.log(`📈 Migration progress: ${this.migrationStats.migratedVectors}/${this.migrationStats.totalVectors} vectors`);
      
    } catch (error) {
      throw new Error(`Vector migration failed: ${error.message}`);
    }
  }

  async updateConfiguration() {
    console.log('⚙️  Updating configuration...');
    
    if (this.options.dryRun) {
      console.log('🔍 [DRY RUN] Would update vector-config.js to use SQLiteVecProvider');
      return;
    }
    
    try {
      // Update vector-config.js to use SQLiteVecProvider as primary
      const configPath = path.join(process.cwd(), '___stage1/config/vector-config.js');
      
      let configContent = await fs.readFile(configPath, 'utf8');
      
      // Replace provider setting
      configContent = configContent.replace(
        /provider:\s*process\.env\.FOREST_VECTOR_PROVIDER\s*\|\|\s*['"][^'"]*['"]/,
        "provider: process.env.FOREST_VECTOR_PROVIDER || 'sqlitevec'"
      );
      
      // Update SQLite configuration
      configContent = configContent.replace(
        /sqlitevec:\s*{[^}]*}/,
        `sqlitevec: {
    dbPath: process.env.SQLITEVEC_PATH || '${this.options.sqliteDbPath}',
    dimension: parseInt(process.env.SQLITEVEC_DIMENSION, 10) || 1536
  }`
      );
      
      await fs.writeFile(configPath, configContent, 'utf8');
      console.log('✅ Updated vector-config.js');
      
      // Set environment variable for this session
      process.env.FOREST_VECTOR_PROVIDER = 'sqlitevec';
      console.log('✅ Set FOREST_VECTOR_PROVIDER=sqlitevec');
      
    } catch (error) {
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }

  async cleanupChromaData() {
    console.log('🧹 Cleaning up ChromaDB data...');
    
    const chromaPath = path.join(process.cwd(), this.options.chromaDataDir);
    
    try {
      await fs.access(chromaPath);
      
      // Remove the chroma-data directory
      await fs.rmdir(chromaPath, { recursive: true });
      console.log(`✅ Cleaned up ChromaDB data directory: ${chromaPath}`);
      
      // Also clean up .chromadb directory if it exists
      const chromaDbPath = path.join(process.cwd(), '.forest-data/.chromadb');
      try {
        await fs.access(chromaDbPath);
        await fs.rmdir(chromaDbPath, { recursive: true });
        console.log(`✅ Cleaned up .chromadb directory: ${chromaDbPath}`);
      } catch {
        // Directory doesn't exist, that's fine
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No ChromaDB data to clean up');
      } else {
        console.warn(`⚠️  Failed to clean up ChromaDB data: ${error.message}`);
      }
    }
  }

  async generateMigrationReport() {
    console.log('📋 Generating migration report...');
    
    const duration = this.migrationStats.endTime - this.migrationStats.startTime;
    const report = {
      migration: {
        timestamp: this.migrationStats.startTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        dry_run: this.options.dryRun,
        success: this.migrationStats.errors.length === 0
      },
      vectors: {
        total_found: this.migrationStats.totalVectors,
        migrated: this.migrationStats.migratedVectors,
        success_rate: this.migrationStats.totalVectors > 0 
          ? `${Math.round((this.migrationStats.migratedVectors / this.migrationStats.totalVectors) * 100)}%`
          : 'N/A'
      },
      configuration: {
        primary_provider: 'SQLiteVecProvider',
        database_path: this.options.sqliteDbPath,
        dimension: 1536
      },
      errors: this.migrationStats.errors,
      next_steps: [
        'Test the application with the new SQLite vector store',
        'Verify all vector operations work correctly',
        'Monitor performance and adjust configuration as needed',
        'Remove backup files after confirming migration success'
      ]
    };
    
    const reportPath = path.join(process.cwd(), 'migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log('📊 Migration Report:');
    console.log(`   Total vectors: ${report.vectors.total_found}`);
    console.log(`   Migrated: ${report.vectors.migrated}`);
    console.log(`   Success rate: ${report.vectors.success_rate}`);
    console.log(`   Duration: ${report.migration.duration}`);
    console.log(`   Errors: ${report.errors.length}`);
    console.log(`   Report saved to: ${reportPath}`);
    
    if (report.errors.length > 0) {
      console.log('❌ Migration errors:');
      report.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  async copyDirectory(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    
    const items = await fs.readdir(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      const stats = await fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--data-dir':
        options.dataDir = args[++i];
        break;
      case '--sqlite-db':
        options.sqliteDbPath = args[++i];
        break;
      case '--help':
        console.log(`
ChromaDB to SQLite Migration Tool

Usage: node migrate-to-sqlite.js [options]

Options:
  --dry-run            Show what would be done without making changes
  --data-dir <path>    Specify the data directory (default: .forest-data)
  --sqlite-db <path>   Specify the SQLite database path (default: forest_vectors.sqlite)
  --help               Show this help message

Examples:
  node migrate-to-sqlite.js                    # Run full migration
  node migrate-to-sqlite.js --dry-run          # Preview migration changes
  node migrate-to-sqlite.js --sqlite-db custom.sqlite  # Use custom SQLite file
`);
        process.exit(0);
        break;
    }
  }
  
  try {
    const migrator = new ChromaToSQLiteMigrator(options);
    await migrator.migrate();
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test your application with the new SQLite vector store');
    console.log('2. Verify all vector operations work correctly');
    console.log('3. Monitor performance and adjust configuration as needed');
    console.log('4. Remove backup files after confirming migration success');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Please check the error above and try again.');
    console.error('If you need help, check the backup files in .forest-data/migration-backup/');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ChromaToSQLiteMigrator };
