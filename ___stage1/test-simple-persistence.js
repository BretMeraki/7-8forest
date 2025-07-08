/**
 * Simple HTA Persistence Test
 * Tests just the core persistence layer without the full server
 */

import { DataPersistence } from './modules/data-persistence.js';
import { ProjectManagement } from './modules/project-management.js';
import { HTADataManager } from './modules/hta-data-manager.js';
import path from 'path';
import { promises as fs } from 'fs';

async function testSimplePersistence() {
  console.log('🔍 TESTING SIMPLE HTA PERSISTENCE\n');
  
  try {
    // Initialize just the persistence layer
    const dataDir = path.join(process.cwd(), '.test-forest-data');
    const dataPersistence = new DataPersistence(dataDir);
    const projectManagement = new ProjectManagement(dataPersistence);
    const htaDataManager = new HTADataManager(dataPersistence, projectManagement, null);
    
    // Clean up test directory
    try {
      await fs.rm(dataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('1. Creating test project...');
    
    // Create a test project
    const projectResult = await projectManagement.createProject({
      goal: 'Learn React development',
      context: 'Web development beginner',
      constraints: { time_constraints: '2 hours per day' }
    });
    
    const projectId = projectResult.project_id;
    console.log(`✅ Project created: ${projectId}`);
    
    // Switch to the project
    await projectManagement.switchProject(projectId);
    console.log(`✅ Switched to project: ${projectId}`);
    
    console.log('\n2. Creating test HTA data...');
    
    // Create test HTA data
    const testHTAData = {
      projectId,
      pathName: 'general',
      goal: 'Learn React development',
      context: 'Web development beginner',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      complexity: {
        score: 6,
        level: 'moderate',
        factors: ['technical complexity', 'new concepts'],
        recommended_depth: 3
      },
      strategicBranches: [
        {
          name: 'Foundation - Core Concepts',
          description: 'Master the fundamental concepts of React',
          priority: 1,
          estimatedDuration: '2-3 weeks'
        },
        {
          name: 'Hands-on Practice',
          description: 'Build real projects with React',
          priority: 2,
          estimatedDuration: '3-4 weeks'
        }
      ],
      frontierNodes: [
        {
          id: 'foundation_001',
          title: 'Learn JSX Syntax',
          description: 'Understand JSX and how to write components',
          difficulty: 2,
          duration: '30 minutes',
          branch: 'Foundation - Core Concepts',
          priority: 100,
          completed: false,
          generated: true
        },
        {
          id: 'foundation_002',
          title: 'Component Props',
          description: 'Learn how to pass data between components',
          difficulty: 3,
          duration: '45 minutes',
          branch: 'Foundation - Core Concepts',
          priority: 200,
          completed: false,
          generated: true
        }
      ],
      hierarchyMetadata: {
        total_tasks: 2,
        total_branches: 2,
        completed_tasks: 0,
        available_tasks: 2,
        depth_levels: 3,
        last_updated: new Date().toISOString()
      }
    };
    
    console.log('✅ Test HTA data created');
    
    console.log('\n3. Saving HTA data...');
    
    // Save the HTA data using the data manager
    const saveResult = await htaDataManager.saveHTAData(projectId, testHTAData, 'general');
    console.log(`✅ HTA data saved: ${saveResult}`);
    
    // Check what files were created
    const projectDir = path.join(dataDir, projectId);
    const files = await fs.readdir(projectDir);
    console.log(`📁 Project files: ${files.join(', ')}`);
    
    // Check for paths directory
    const pathsDir = path.join(projectDir, 'paths');
    try {
      const pathDirs = await fs.readdir(pathsDir);
      console.log(`📁 Path directories: ${pathDirs.join(', ')}`);
      
      for (const pathName of pathDirs) {
        const pathDir = path.join(pathsDir, pathName);
        const pathFiles = await fs.readdir(pathDir);
        console.log(`📁 Path '${pathName}' files: ${pathFiles.join(', ')}`);
      }
    } catch (error) {
      console.log(`⚠️ No paths directory: ${error.message}`);
    }
    
    console.log('\n4. Testing HTA data loading...');
    
    // Test loading the HTA data
    const loadedData = await htaDataManager.loadHTAData(projectId, 'general');
    
    if (loadedData) {
      console.log('✅ HTA data loaded successfully');
      console.log(`  - Goal: ${loadedData.goal}`);
      console.log(`  - Frontier nodes: ${loadedData.frontierNodes?.length || 0}`);
      console.log(`  - Strategic branches: ${loadedData.strategicBranches?.length || 0}`);
      console.log(`  - Project ID: ${loadedData.projectId}`);
      console.log(`  - Path name: ${loadedData.pathName}`);
    } else {
      console.log('❌ HTA data NOT loaded - PERSISTENCE ISSUE FOUND!');
    }
    
    console.log('\n5. Testing direct file access...');
    
    // Test direct file access using dataPersistence
    const directLoad = await dataPersistence.loadPathData(projectId, 'general', 'hta.json');
    
    if (directLoad) {
      console.log('✅ HTA data loaded via direct file access');
      console.log(`  - Goal: ${directLoad.goal}`);
      console.log(`  - Frontier nodes: ${directLoad.frontierNodes?.length || 0}`);
    } else {
      console.log('❌ HTA data NOT loaded via direct file access');
    }
    
    console.log('\n6. Testing path resolution...');
    
    // Test with different path names to understand path resolution
    const testPaths = ['general', null, undefined, ''];
    
    for (const testPath of testPaths) {
      console.log(`\nTesting path: ${testPath} (${typeof testPath})`);
      try {
        const pathData = await htaDataManager.loadHTAData(projectId, testPath);
        if (pathData) {
          console.log(`✅ Loaded with path '${testPath}': ${pathData.frontierNodes?.length || 0} tasks`);
        } else {
          console.log(`❌ No data found with path '${testPath}'`);
        }
      } catch (error) {
        console.log(`❌ Error with path '${testPath}': ${error.message}`);
      }
    }
    
    console.log('\n7. Testing config-based path resolution...');
    
    // Load project config to see active path
    const config = await dataPersistence.loadProjectData(projectId, 'config.json');
    console.log(`📋 Project config active path: ${config?.activePath}`);
    console.log(`📋 Project config goal: ${config?.goal}`);
    
    // Test loading using config's active path
    const configPath = config?.activePath || 'general';
    const configData = await htaDataManager.loadHTAData(projectId, configPath);
    
    if (configData) {
      console.log(`✅ Loaded using config active path '${configPath}': ${configData.frontierNodes?.length || 0} tasks`);
    } else {
      console.log(`❌ No data found using config active path '${configPath}'`);
    }
    
    console.log('\n=' .repeat(60));
    console.log('🎯 SIMPLE PERSISTENCE TEST COMPLETE');
    console.log('=' .repeat(60));
    
    // Clean up
    await fs.rm(dataDir, { recursive: true, force: true });
    
  } catch (error) {
    console.error('\n❌ PERSISTENCE TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testSimplePersistence().catch(console.error);