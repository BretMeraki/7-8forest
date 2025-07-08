/**
 * Test HTA Tree Persistence Issue
 * Identifies why HTA trees don't persist between calls
 */

import Stage1CoreServer from './core-server.js';
import { DataPersistence } from './modules/data-persistence.js';
import { ProjectManagement } from './modules/project-management.js';
import path from 'path';
import { promises as fs } from 'fs';

async function testHTAPersistence() {
  console.log('🔍 TESTING HTA TREE PERSISTENCE ISSUE\n');
  console.log('=' .repeat(60));
  
  let server;
  let projectId;
  
  try {
    // Initialize the server
    console.log('\n1. Initializing Forest server...');
    server = new Stage1CoreServer();
    await server.initialize();
    console.log('✅ Server initialized successfully\n');
    
    // Create a test project
    console.log('\n2. Creating test project...');
    const projectResult = await server.toolRouter.handleToolCall('create_project_forest', {
      goal: 'Learn React development and build a portfolio website',
      context: 'Web development beginner with basic HTML/CSS knowledge',
      constraints: { time_constraints: '2 hours per weekday, 6 hours on weekends' }
    });
    
    if (!projectResult.success) {
      throw new Error(`Failed to create project: ${projectResult.error}`);
    }
    
    projectId = server.projectManagement.activeProjectId;
    console.log(`✅ Project created with ID: ${projectId}`);
    
    // Check what's in the project directory before HTA creation
    console.log('\n3. Checking project directory before HTA creation...');
    const projectDir = path.join(server.dataPersistence.dataDir, projectId);
    try {
      const files = await fs.readdir(projectDir);
      console.log(`📁 Project directory files: ${files.join(', ')}`);
      
      if (files.includes('config.json')) {
        const configPath = path.join(projectDir, 'config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        console.log(`🎯 Project goal: ${config.goal}`);
        console.log(`📝 Project context: ${config.context}`);
      }
    } catch (error) {
      console.log(`⚠️ Project directory doesn't exist yet: ${error.message}`);
    }
    
    // Build HTA tree
    console.log('\n4. Building HTA tree...');
    const htaResult = await server.toolRouter.handleToolCall('build_hta_tree_forest', {
      learning_style: 'hands-on',
      focus_areas: ['react', 'components', 'portfolio']
    });
    
    if (!htaResult.success) {
      throw new Error(`Failed to build HTA tree: ${htaResult.error}`);
    }
    
    console.log('✅ HTA tree built successfully');
    console.log(`📊 Tasks generated: ${htaResult.tasks_count}`);
    console.log(`🌿 Strategic branches: ${htaResult.strategic_branches}`);
    
    // Check what files were created after HTA building
    console.log('\n5. Checking files after HTA creation...');
    try {
      const files = await fs.readdir(projectDir);
      console.log(`📁 Project directory files: ${files.join(', ')}`);
      
      // Check for HTA file in paths directory
      const pathsDir = path.join(projectDir, 'paths');
      try {
        const pathsDirs = await fs.readdir(pathsDir);
        console.log(`📁 Paths subdirectories: ${pathsDirs.join(', ')}`);
        
        for (const pathName of pathsDirs) {
          const pathDir = path.join(pathsDir, pathName);
          const pathFiles = await fs.readdir(pathDir);
          console.log(`📁 Path '${pathName}' files: ${pathFiles.join(', ')}`);
          
          if (pathFiles.includes('hta.json')) {
            const htaPath = path.join(pathDir, 'hta.json');
            const htaData = JSON.parse(await fs.readFile(htaPath, 'utf8'));
            console.log(`🌳 HTA file found in path '${pathName}'`);
            console.log(`  - Goal: ${htaData.goal}`);
            console.log(`  - Frontier nodes: ${htaData.frontierNodes?.length || 0}`);
            console.log(`  - Strategic branches: ${htaData.strategicBranches?.length || 0}`);
            console.log(`  - Created: ${htaData.created}`);
            console.log(`  - Last updated: ${htaData.lastUpdated}`);
            
            // Check specific fields that might indicate persistence issues
            console.log(`  - Project ID: ${htaData.projectId}`);
            console.log(`  - Path name: ${htaData.pathName}`);
            console.log(`  - Generation context: ${JSON.stringify(htaData.generation_context)}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ No paths directory found: ${error.message}`);
      }
      
      // Check for hta.json in project root
      if (files.includes('hta.json')) {
        const htaPath = path.join(projectDir, 'hta.json');
        const htaData = JSON.parse(await fs.readFile(htaPath, 'utf8'));
        console.log(`🌳 HTA file found in project root`);
        console.log(`  - Goal: ${htaData.goal}`);
        console.log(`  - Frontier nodes: ${htaData.frontierNodes?.length || 0}`);
        console.log(`  - Strategic branches: ${htaData.strategicBranches?.length || 0}`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking files: ${error.message}`);
    }
    
    // Now try to load the HTA tree using the same methods the system uses
    console.log('\n6. Testing HTA loading methods...');
    
    // Method 1: Using dataManager.loadHTAData
    console.log('\nMethod 1: dataManager.loadHTAData');
    try {
      const loadedHTA = await server.htaCore.dataManager.loadHTAData(projectId, 'general');
      if (loadedHTA) {
        console.log(`✅ HTA loaded via dataManager: ${loadedHTA.frontierNodes?.length || 0} tasks`);
      } else {
        console.log('❌ HTA not found via dataManager');
      }
    } catch (error) {
      console.log(`❌ Error loading via dataManager: ${error.message}`);
    }
    
    // Method 2: Using htaCore.loadPathHTA
    console.log('\nMethod 2: htaCore.loadPathHTA');
    try {
      const loadedHTA = await server.htaCore.loadPathHTA(projectId, 'general');
      if (loadedHTA) {
        console.log(`✅ HTA loaded via loadPathHTA: ${loadedHTA.frontierNodes?.length || 0} tasks`);
      } else {
        console.log('❌ HTA not found via loadPathHTA');
      }
    } catch (error) {
      console.log(`❌ Error loading via loadPathHTA: ${error.message}`);
    }
    
    // Method 3: Direct dataPersistence.loadPathData
    console.log('\nMethod 3: dataPersistence.loadPathData');
    try {
      const loadedHTA = await server.dataPersistence.loadPathData(projectId, 'general', 'hta.json');
      if (loadedHTA) {
        console.log(`✅ HTA loaded via loadPathData: ${loadedHTA.frontierNodes?.length || 0} tasks`);
      } else {
        console.log('❌ HTA not found via loadPathData');
      }
    } catch (error) {
      console.log(`❌ Error loading via loadPathData: ${error.message}`);
    }
    
    // Method 4: Vector store retrieval
    console.log('\nMethod 4: Vector store retrieval');
    try {
      const vectorResult = await server.htaCore.vectorIntegration.retrieveHTAData(projectId);
      if (vectorResult) {
        console.log(`✅ HTA loaded via vector store: ${vectorResult.frontierNodes?.length || 0} tasks`);
      } else {
        console.log('❌ HTA not found via vector store');
      }
    } catch (error) {
      console.log(`❌ Error loading via vector store: ${error.message}`);
    }
    
    // Now simulate a second call to buildHTATree to see if it detects existing tree
    console.log('\n7. Testing second HTA tree build call...');
    const secondHTAResult = await server.toolRouter.handleToolCall('build_hta_tree_forest', {
      learning_style: 'hands-on',
      focus_areas: ['react', 'components', 'portfolio']
    });
    
    if (secondHTAResult.existing_tree) {
      console.log('✅ Second call detected existing HTA tree');
    } else {
      console.log('❌ Second call did NOT detect existing HTA tree - THIS IS THE PERSISTENCE ISSUE!');
      console.log(`   - Result success: ${secondHTAResult.success}`);
      console.log(`   - Tasks count: ${secondHTAResult.tasks_count}`);
      console.log(`   - Strategic branches: ${secondHTAResult.strategic_branches}`);
    }
    
    // Check project configuration and active path
    console.log('\n8. Checking project configuration and active path...');
    const config = await server.dataPersistence.loadProjectData(projectId, 'config.json');
    console.log(`📋 Active path in config: ${config?.activePath || 'NOT SET'}`);
    console.log(`📋 Goal in config: ${config?.goal}`);
    
    // Final diagnostics
    console.log('\n9. Final diagnostics...');
    console.log(`🏗️ Data directory: ${server.dataPersistence.dataDir}`);
    console.log(`🆔 Active project ID: ${server.projectManagement.activeProjectId}`);
    console.log(`📁 Project directory: ${path.join(server.dataPersistence.dataDir, projectId)}`);
    
    console.log('\n=' .repeat(60));
    console.log('🎯 PERSISTENCE TEST COMPLETE');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ PERSISTENCE TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (server) {
      await server.shutdown();
    }
  }
}

// Run the test
testHTAPersistence().catch(console.error);