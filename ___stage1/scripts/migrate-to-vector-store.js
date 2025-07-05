#!/usr/bin/env node

/**
 * Migration Script: Migrate existing HTA data to Vector Store
 * Migrates JSON-based HTA trees to Qdrant-backed vector database
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { DataPersistence } from '../modules/data-persistence.js';
import { HTAVectorStore } from '../modules/hta-vector-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class VectorMigration {
  constructor() {
    this.dataDir = process.env.FOREST_DATA_DIR || path.join(process.env.HOME || '.', '.forest-data');
    this.dataPersistence = new DataPersistence(this.dataDir);
    this.vectorStore = new HTAVectorStore(this.dataDir);
    this.migrationResults = {
      totalProjects: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: []
    };
  }

  async run() {
    console.log('🔄 Starting HTA Vector Store Migration...');
    console.log(`📁 Data directory: ${this.dataDir}`);
    
    try {
      // Initialize vector store
      await this.vectorStore.initialize();
      console.log('✅ Vector store initialized');
      
      // Get all projects
      const projects = await this.dataPersistence.getProjectList();
      this.migrationResults.totalProjects = projects.length;
      
      console.log(`📊 Found ${projects.length} projects to migrate`);
      
      // Migrate each project
      for (const project of projects) {
        await this.migrateProject(project);
      }
      
      // Print results
      this.printMigrationResults();
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  async migrateProject(projectId) {
    console.log(`\n🔄 Migrating project: ${projectId}`);
    
    try {
      // Load project configuration
      const projectConfig = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!projectConfig) {
        console.log(`⚠️ No config found for project ${projectId}, skipping`);
        return;
      }
      
      // Find all HTA files for this project
      const projectDir = path.join(this.dataDir, 'projects', projectId);
      const htaFiles = await this.findHTAFiles(projectDir);
      
      let migratedPaths = 0;
      for (const htaFile of htaFiles) {
        const pathName = path.basename(path.dirname(htaFile));
        
        try {
          const htaData = await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
          if (htaData && htaData.frontierNodes && htaData.frontierNodes.length > 0) {
            // Store in vector database
            await this.vectorStore.storeHTATree(projectId, htaData);
            console.log(`  ✅ Migrated path: ${pathName}`);
            migratedPaths++;
          }
        } catch (error) {
          console.log(`  ⚠️ Failed to migrate path ${pathName}: ${error.message}`);
        }
      }
      
      console.log(`✅ Project ${projectId} migrated (${migratedPaths} paths)`);
      this.migrationResults.successfulMigrations++;
      
    } catch (error) {
      console.log(`❌ Failed to migrate project ${projectId}: ${error.message}`);
      this.migrationResults.failedMigrations++;
      this.migrationResults.errors.push({ projectId, error: error.message });
    }
  }

  async findHTAFiles(projectDir) {
    const htaFiles = [];
    
    try {
      const fs = await import('fs/promises');
      const items = await fs.readdir(projectDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const htaPath = path.join(projectDir, item.name, 'hta.json');
          try {
            await fs.access(htaPath);
            htaFiles.push(htaPath);
          } catch {
            // File doesn't exist, skip
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return htaFiles;
  }

  printMigrationResults() {
    console.log('\n📊 Migration Results:');
    console.log('=====================================');
    console.log(`Total projects: ${this.migrationResults.totalProjects}`);
    console.log(`Successful migrations: ${this.migrationResults.successfulMigrations}`);
    console.log(`Failed migrations: ${this.migrationResults.failedMigrations}`);
    
    if (this.migrationResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of this.migrationResults.errors) {
        console.log(`  ${error.projectId}: ${error.error}`);
      }
    }
    
    if (this.migrationResults.successfulMigrations === this.migrationResults.totalProjects) {
      console.log('\n🎉 All projects migrated successfully!');
    } else {
      console.log('\n⚠️ Some projects failed to migrate. Check errors above.');
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new VectorMigration();
  migration.run().catch(console.error);
}

export { VectorMigration }; 