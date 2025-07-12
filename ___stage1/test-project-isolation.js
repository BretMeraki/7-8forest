/**
 * Project Isolation Verification Test
 * Ensures that all projects are properly sequestered and protected from each other's data
 */

import { DataPersistence } from './modules/data-persistence.js';
import { ProjectManagement } from './modules/project-management.js';
import { HtaCore } from './modules/hta-core.js';
import path from 'path';
import { promises as fs } from 'fs';

class ProjectIsolationTest {
  constructor() {
    this.testDataDir = path.join(process.cwd(), '.test-isolation');
    this.dataPersistence = new DataPersistence(this.testDataDir);
    this.projectManagement = new ProjectManagement(this.dataPersistence);
    this.htaCore = new HtaCore(this.dataPersistence, this.projectManagement);
  }

  async runAllTests() {
    console.log('🔒 Starting Project Isolation Verification Tests...\n');
    
    try {
      // Clean up any existing test data
      await this.cleanup();
      
      const tests = [
        this.testFileSystemIsolation,
        this.testDataPersistenceIsolation,
        this.testCacheIsolation,
        this.testVectorStoreIsolation,
        this.testActiveProjectIsolation,
        this.testCrossProjectDataAccess,
        this.testProjectDeletion
      ];

      let passed = 0;
      let failed = 0;

      for (const test of tests) {
        try {
          console.log(`🧪 Running: ${test.name}`);
          await test.call(this);
          console.log(`✅ PASSED: ${test.name}\n`);
          passed++;
        } catch (error) {
          console.error(`❌ FAILED: ${test.name}`);
          console.error(`   Error: ${error.message}\n`);
          failed++;
        }
      }

      console.log(`\n📊 Test Results:`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

      if (failed === 0) {
        console.log('\n🎉 ALL PROJECT ISOLATION TESTS PASSED! Projects are properly sequestered.');
      } else {
        console.log('\n⚠️  Some isolation tests failed. Review the project isolation implementation.');
      }

    } finally {
      await this.cleanup();
    }
  }

  async testFileSystemIsolation() {
    // Test 1: Verify projects are stored in separate directories
    const project1 = 'test-project-1';
    const project2 = 'test-project-2';

    // Create two projects
    await this.projectManagement.createProject({
      project_id: project1,
      goal: 'Learn React',
      context: 'Frontend development'
    });

    await this.projectManagement.createProject({
      project_id: project2,
      goal: 'Learn Python',
      context: 'Backend development'
    });

    // Verify separate directories exist
    const project1Dir = path.join(this.testDataDir, project1);
    const project2Dir = path.join(this.testDataDir, project2);

    const project1Exists = await fs.stat(project1Dir).then(() => true).catch(() => false);
    const project2Exists = await fs.stat(project2Dir).then(() => true).catch(() => false);

    if (!project1Exists) throw new Error('Project 1 directory not created');
    if (!project2Exists) throw new Error('Project 2 directory not created');

    // Verify each project has its own config file
    const config1 = await this.dataPersistence.loadProjectData(project1, 'config.json');
    const config2 = await this.dataPersistence.loadProjectData(project2, 'config.json');

    if (!config1) throw new Error('Project 1 config not found');
    if (!config2) throw new Error('Project 2 config not found');
    if (config1.goal === config2.goal) throw new Error('Projects have same goal - data not isolated');
  }

  async testDataPersistenceIsolation() {
    // Test 2: Verify data operations are scoped to specific projects
    const project1 = 'data-test-1';
    const project2 = 'data-test-2';

    // Create projects with different data
    await this.dataPersistence.saveProjectData(project1, 'test.json', { value: 'project1-data' });
    await this.dataPersistence.saveProjectData(project2, 'test.json', { value: 'project2-data' });

    // Verify data isolation
    const data1 = await this.dataPersistence.loadProjectData(project1, 'test.json');
    const data2 = await this.dataPersistence.loadProjectData(project2, 'test.json');

    if (!data1 || data1.value !== 'project1-data') {
      throw new Error('Project 1 data not properly isolated');
    }
    if (!data2 || data2.value !== 'project2-data') {
      throw new Error('Project 2 data not properly isolated');
    }

    // Test path-based data isolation
    await this.dataPersistence.savePathData(project1, 'path1', 'data.json', { path: 'project1-path1' });
    await this.dataPersistence.savePathData(project2, 'path1', 'data.json', { path: 'project2-path1' });

    const pathData1 = await this.dataPersistence.loadPathData(project1, 'path1', 'data.json');
    const pathData2 = await this.dataPersistence.loadPathData(project2, 'path1', 'data.json');

    if (!pathData1 || pathData1.path !== 'project1-path1') {
      throw new Error('Project 1 path data not properly isolated');
    }
    if (!pathData2 || pathData2.path !== 'project2-path1') {
      throw new Error('Project 2 path data not properly isolated');
    }
  }

  async testCacheIsolation() {
    // Test 3: Verify cache isolation between projects
    const project1 = 'cache-test-1';
    const project2 = 'cache-test-2';

    // Save data to trigger caching
    await this.dataPersistence.saveProjectData(project1, 'cached.json', { cached: 'data1' });
    await this.dataPersistence.saveProjectData(project2, 'cached.json', { cached: 'data2' });

    // Load to populate cache
    await this.dataPersistence.loadProjectData(project1, 'cached.json');
    await this.dataPersistence.loadProjectData(project2, 'cached.json');

    // Invalidate project1 cache and verify project2 cache unaffected
    this.dataPersistence.invalidateProjectCache(project1);

    // Modify project1 data directly on filesystem
    const project1Dir = path.join(this.testDataDir, project1);
    const project1File = path.join(project1Dir, 'cached.json');
    await fs.writeFile(project1File, JSON.stringify({ cached: 'modified1' }, null, 2));

    // Load both - project1 should get new data, project2 should get cached data
    const data1 = await this.dataPersistence.loadProjectData(project1, 'cached.json');
    const data2 = await this.dataPersistence.loadProjectData(project2, 'cached.json');

    if (data1.cached !== 'modified1') {
      throw new Error('Project 1 cache invalidation failed');
    }
    if (data2.cached !== 'data2') {
      throw new Error('Project 2 cache affected by project 1 invalidation');
    }
  }

  async testVectorStoreIsolation() {
    // Test 4: Verify vector store uses project-scoped namespaces
    const project1 = 'vector-test-1';
    const project2 = 'vector-test-2';

    // Create test HTA data
    const htaData1 = {
      goal: 'Learn React',
      complexity: 5,
      frontierNodes: [
        { id: 'task1', title: 'Setup Environment', description: 'Setup React dev environment' }
      ]
    };

    const htaData2 = {
      goal: 'Learn Python',
      complexity: 4,
      frontierNodes: [
        { id: 'task1', title: 'Install Python', description: 'Install Python interpreter' }
      ]
    };

    // Store HTA trees (this should use project-scoped vector namespaces)
    if (this.htaCore.vectorStore) {
      await this.htaCore.vectorStore.storeHTATree(project1, htaData1);
      await this.htaCore.vectorStore.storeHTATree(project2, htaData2);

      // Verify project stats are separate
      const stats1 = await this.htaCore.vectorStore.getProjectStats(project1);
      const stats2 = await this.htaCore.vectorStore.getProjectStats(project2);

      if (stats1.total_vectors === 0) {
        throw new Error('Project 1 vectors not stored');
      }
      if (stats2.total_vectors === 0) {
        throw new Error('Project 2 vectors not stored');
      }

      // Verify vector IDs use project prefixes
      const vectors1 = await this.htaCore.vectorStore.provider.listVectors(project1 + ':');
      const vectors2 = await this.htaCore.vectorStore.provider.listVectors(project2 + ':');

      if (vectors1.length === 0) {
        throw new Error('Project 1 vectors not properly namespaced');
      }
      if (vectors2.length === 0) {
        throw new Error('Project 2 vectors not properly namespaced');
      }

      // Verify no cross-contamination
      const crossVectors1 = await this.htaCore.vectorStore.provider.listVectors(project2 + ':');
      const crossVectors2 = await this.htaCore.vectorStore.provider.listVectors(project1 + ':');

      for (const vector of crossVectors1) {
        if (vector.id.startsWith(project1 + ':')) {
          throw new Error('Project 1 vectors found in project 2 namespace');
        }
      }
      for (const vector of crossVectors2) {
        if (vector.id.startsWith(project2 + ':')) {
          throw new Error('Project 2 vectors found in project 1 namespace');
        }
      }
    }
  }

  async testActiveProjectIsolation() {
    // Test 5: Verify active project switching properly isolates operations
    const project1 = 'active-test-1';
    const project2 = 'active-test-2';

    await this.projectManagement.createProject({
      project_id: project1,
      goal: 'Project 1 Goal'
    });

    await this.projectManagement.createProject({
      project_id: project2,
      goal: 'Project 2 Goal'
    });

    // Switch to project 1
    await this.projectManagement.switchProject(project1);
    let activeProject = await this.projectManagement.getActiveProject();
    
    if (activeProject.project_id !== project1) {
      throw new Error('Failed to switch to project 1');
    }

    // Switch to project 2
    await this.projectManagement.switchProject(project2);
    activeProject = await this.projectManagement.getActiveProject();
    
    if (activeProject.project_id !== project2) {
      throw new Error('Failed to switch to project 2');
    }

    // Verify project 1 config is unchanged after switch
    const config1 = await this.dataPersistence.loadProjectData(project1, 'config.json');
    if (!config1 || config1.goal !== 'Project 1 Goal') {
      throw new Error('Project 1 data corrupted after switching');
    }
  }

  async testCrossProjectDataAccess() {
    // Test 6: Verify that accessing non-existent project data returns null
    const validProject = 'valid-project';
    const invalidProject = 'invalid-project';

    await this.dataPersistence.saveProjectData(validProject, 'data.json', { value: 'valid' });

    // Try to access data from non-existent project
    const invalidData = await this.dataPersistence.loadProjectData(invalidProject, 'data.json');
    
    if (invalidData !== null) {
      throw new Error('Non-existent project returned data - isolation breach');
    }

    // Verify valid project data is still accessible
    const validData = await this.dataPersistence.loadProjectData(validProject, 'data.json');
    if (!validData || validData.value !== 'valid') {
      throw new Error('Valid project data corrupted');
    }
  }

  async testProjectDeletion() {
    // Test 7: Verify project deletion removes all associated data
    const project1 = 'delete-test-1';
    const project2 = 'delete-test-2';

    // Create projects with data
    await this.dataPersistence.saveProjectData(project1, 'config.json', { goal: 'Project 1' });
    await this.dataPersistence.saveProjectData(project2, 'config.json', { goal: 'Project 2' });
    await this.dataPersistence.savePathData(project1, 'path1', 'data.json', { data: 'path1' });
    await this.dataPersistence.savePathData(project2, 'path1', 'data.json', { data: 'path2' });

    // Delete project 1
    await this.dataPersistence.deleteProject(project1);

    // Verify project 1 data is gone
    const deletedData = await this.dataPersistence.loadProjectData(project1, 'config.json');
    if (deletedData !== null) {
      throw new Error('Deleted project data still accessible');
    }

    const deletedPathData = await this.dataPersistence.loadPathData(project1, 'path1', 'data.json');
    if (deletedPathData !== null) {
      throw new Error('Deleted project path data still accessible');
    }

    // Verify project 2 data is untouched
    const project2Data = await this.dataPersistence.loadProjectData(project2, 'config.json');
    if (!project2Data || project2Data.goal !== 'Project 2') {
      throw new Error('Project 2 data affected by project 1 deletion');
    }

    const project2PathData = await this.dataPersistence.loadPathData(project2, 'path1', 'data.json');
    if (!project2PathData || project2PathData.data !== 'path2') {
      throw new Error('Project 2 path data affected by project 1 deletion');
    }
  }

  async cleanup() {
    try {
      await fs.rm(this.testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new ProjectIsolationTest();
  test.runAllTests().catch(console.error);
}

export { ProjectIsolationTest };
