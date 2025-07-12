#!/usr/bin/env node

/**
 * Factory Reset Test Script
 * Tests the factory reset functionality without needing full server initialization
 */

import { Stage1CoreServer } from './core-server.js';
import { promises as fs } from 'fs';
import path from 'path';

class FactoryResetTest {
  constructor() {
    this.testDataDir = `/tmp/forest-factory-reset-test-${Date.now()}`;
    this.server = null;
  }

  async runTest() {
    console.log('🧪 Factory Reset Test Starting...');
    console.log('==============================\n');

    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Create test project
      await this.createTestProject();
      
      // Test factory reset denial (without confirmation)
      await this.testFactoryResetDenial();
      
      // Test factory reset with incomplete confirmation
      await this.testIncompleteConfirmation();
      
      // Test successful single project reset
      await this.testSingleProjectReset();
      
      // Create multiple projects for full reset test
      await this.createMultipleProjects();
      
      // Test full factory reset
      await this.testFullFactoryReset();
      
      console.log('\n✅ All factory reset tests passed!');
      console.log('🔄 Factory reset functionality is working correctly.');
      
    } catch (error) {
      console.error('\n❌ Factory reset test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Create test data directory
    await fs.mkdir(this.testDataDir, { recursive: true });
    
    // Initialize server with test data directory
    this.server = new Stage1CoreServer({ 
      dataDir: this.testDataDir,
      skipComplexModules: true // Skip modules that require external dependencies
    });
    
    // Initialize core components only
    this.server.dataPersistence = (await import('./modules/data-persistence.js')).DataPersistence;
    this.server.dataPersistence = new this.server.dataPersistence(this.testDataDir);
    
    this.server.projectManagement = (await import('./modules/project-management.js')).ProjectManagement;
    this.server.projectManagement = new this.server.projectManagement(this.server.dataPersistence);
    
    console.log('✅ Test environment ready');
  }

  async createTestProject() {
    console.log('\n📂 Creating test project...');
    
    const projectData = {
      project_id: 'test_project_1',
      goal: 'Test Project for Factory Reset',
      life_structure_preferences: {
        wake_time: '8:00 AM',
        sleep_time: '10:00 PM'
      }
    };
    
    const result = await this.server.projectManagement.createProject(projectData);
    if (!result.success) {
      throw new Error('Failed to create test project');
    }
    
    console.log('✅ Test project created:', projectData.project_id);
  }

  async testFactoryResetDenial() {
    console.log('\n🚫 Testing factory reset denial (safety check)...');
    
    const result = await this.server.handleFactoryReset({
      project_id: 'test_project_1',
      confirm_deletion: false
    });
    
    const responseText = result.content[0].text;
    if (!responseText.includes('Factory Reset Cancelled')) {
      throw new Error('Factory reset should be denied without confirmation');
    }
    
    console.log('✅ Factory reset correctly denied without confirmation');
  }

  async testIncompleteConfirmation() {
    console.log('\n⚠️ Testing incomplete confirmation...');
    
    const result = await this.server.handleFactoryReset({
      project_id: 'test_project_1',
      confirm_deletion: true,
      confirmation_message: 'short' // Too short
    });
    
    const responseText = result.content[0].text;
    if (!responseText.includes('Confirmation Required')) {
      throw new Error('Factory reset should require meaningful confirmation message');
    }
    
    console.log('✅ Factory reset correctly requires meaningful confirmation');
  }

  async testSingleProjectReset() {
    console.log('\n🗑️ Testing single project factory reset...');
    
    const result = await this.server.handleFactoryReset({
      project_id: 'test_project_1',
      confirm_deletion: true,
      confirmation_message: 'I understand this will permanently delete the test project data.'
    });
    
    if (!result.success) {
      throw new Error('Single project reset should succeed with proper confirmation');
    }
    
    const responseText = result.content[0].text;
    if (!responseText.includes('Factory Reset Complete')) {
      throw new Error('Factory reset response should indicate completion');
    }
    
    // Verify project was actually deleted
    const projectExists = await this.server.dataPersistence.projectExists('test_project_1');
    if (projectExists) {
      throw new Error('Project should be deleted after factory reset');
    }
    
    console.log('✅ Single project factory reset successful');
  }

  async createMultipleProjects() {
    console.log('\n📂 Creating multiple test projects...');
    
    const projects = [
      { project_id: 'test_project_2', goal: 'Second Test Project' },
      { project_id: 'test_project_3', goal: 'Third Test Project' }
    ];
    
    for (const projectData of projects) {
      const fullProjectData = {
        ...projectData,
        life_structure_preferences: {
          wake_time: '8:00 AM',
          sleep_time: '10:00 PM'
        }
      };
      
      const result = await this.server.projectManagement.createProject(fullProjectData);
      if (!result.success) {
        throw new Error(`Failed to create test project: ${projectData.project_id}`);
      }
    }
    
    console.log('✅ Multiple test projects created');
  }

  async testFullFactoryReset() {
    console.log('\n🔄 Testing full factory reset (all projects)...');
    
    const result = await this.server.handleFactoryReset({
      // No project_id means all projects
      confirm_deletion: true,
      confirmation_message: 'I understand this will permanently delete ALL project data and cannot be undone.'
    });
    
    if (!result.success) {
      throw new Error('Full factory reset should succeed with proper confirmation');
    }
    
    const responseText = result.content[0].text;
    if (!responseText.includes('Factory Reset Complete')) {
      throw new Error('Factory reset response should indicate completion');
    }
    
    // Verify all projects were deleted
    const projects = await this.server.projectManagement.listProjects();
    if (projects.projects && projects.projects.length > 0) {
      throw new Error('All projects should be deleted after full factory reset');
    }
    
    console.log('✅ Full factory reset successful');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      if (this.server) {
        await this.server.cleanup?.();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    try {
      await fs.rm(this.testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Test environment cleaned up');
  }
}

// Run the test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const test = new FactoryResetTest();
  test.runTest().catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
}

export { FactoryResetTest };
