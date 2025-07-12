/**
 * Functional System Health Verification
 * Replaces static checks with actual functionality tests
 * Tests what the system can DO, not what files exist
 */

export class FunctionalHealthVerification {
  constructor(dataPersistence, projectManagement, htaCore, vectorStore, taskStrategyCore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.htaCore = htaCore;
    this.vectorStore = vectorStore;
    this.taskStrategyCore = taskStrategyCore;
  }

  /**
   * Run comprehensive functional tests instead of static checks
   */
  async runFunctionalHealthCheck() {
    const testResults = {
      project_operations: await this.testProjectOperations(),
      task_management: await this.testTaskManagement(),
      hta_functionality: await this.testHTAFunctionality(),
      vector_operations: await this.testVectorOperations(),
      data_persistence: await this.testDataPersistence(),
      end_to_end_workflow: await this.testEndToEndWorkflow()
    };

    // Calculate confidence scores
    const passedTests = Object.values(testResults).filter(result => result.success).length;
    const totalTests = Object.values(testResults).length;
    const confidence = passedTests / totalTests;

    return {
      overall_health: confidence >= 0.8 ? 'healthy' : confidence >= 0.6 ? 'degraded' : 'unhealthy',
      confidence_score: confidence,
      test_results: testResults,
      tested_functionality: Object.keys(testResults),
      false_positive_risk: confidence >= 0.9 ? 'low' : confidence >= 0.7 ? 'medium' : 'high',
      actionable_errors: this.extractActionableErrors(testResults)
    };
  }

  /**
   * Test actual project operations
   */
  async testProjectOperations() {
    const testId = `health_test_${Date.now()}`;
    
    try {
      // Test complete project lifecycle
      const created = await this.projectManagement.createProject({
        goal: 'Health check test project',
        projectId: testId
      });

      if (!created) throw new Error('Project creation failed');

      const retrieved = await this.projectManagement.getProject(testId);
      if (!retrieved) throw new Error('Project retrieval failed');

      const listed = await this.projectManagement.listProjects();
      if (!listed.some(p => p.project_id === testId)) {
        throw new Error('Project not in list');
      }

      // Cleanup
      await this.projectManagement.deleteProject(testId);

      return {
        success: true,
        operations_tested: ['create', 'read', 'list', 'delete'],
        evidence: 'Successfully completed full project lifecycle'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations_tested: ['create', 'read', 'list', 'delete'],
        evidence: `Failed during project operations: ${error.message}`
      };
    }
  }

  /**
   * Test task management functionality
   */
  async testTaskManagement() {
    try {
      // Get or create a test project
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject) {
        throw new Error('No active project for task testing');
      }

      // Test task generation
      const tasks = await this.taskStrategyCore.getNextTask(activeProject.project_id);
      if (!tasks || tasks.length === 0) {
        throw new Error('Task generation failed');
      }

      // Test task completion simulation
      const testTask = tasks[0];
      const completed = await this.taskStrategyCore.handleBlockCompletion(
        activeProject.project_id,
        testTask.id,
        { status: 'completed', notes: 'Health check test' }
      );

      if (!completed) throw new Error('Task completion failed');

      return {
        success: true,
        operations_tested: ['generate', 'complete'],
        evidence: `Successfully generated ${tasks.length} tasks and completed one`,
        task_count: tasks.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations_tested: ['generate', 'complete'],
        evidence: `Task management failed: ${error.message}`
      };
    }
  }

  /**
   * Test HTA (Hierarchical Task Analysis) functionality
   */
  async testHTAFunctionality() {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject) {
        throw new Error('No active project for HTA testing');
      }

      // Test HTA building
      const hta = await this.htaCore.buildHTATree(activeProject.project_id);
      if (!hta) throw new Error('HTA building failed');

      // Test HTA status
      const status = await this.htaCore.getHTAStatus(activeProject.project_id);
      if (!status) throw new Error('HTA status retrieval failed');

      return {
        success: true,
        operations_tested: ['build', 'status'],
        evidence: `HTA built successfully with status: ${status.status || 'unknown'}`,
        hta_nodes: hta.nodes ? hta.nodes.length : 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations_tested: ['build', 'status'],
        evidence: `HTA functionality failed: ${error.message}`
      };
    }
  }

  /**
   * Test vector store operations
   */
  async testVectorOperations() {
    const testVector = {
      id: `health_test_${Date.now()}`,
      content: 'Health check test vector',
      embedding: new Array(384).fill(0).map(() => Math.random())
    };

    try {
      if (!this.vectorStore) {
        return {
          success: false,
          error: 'Vector store not initialized',
          operations_tested: ['write', 'read', 'delete'],
          evidence: 'Vector store is not available'
        };
      }

      // Test write operation
      await this.vectorStore.store([testVector]);

      // Test read operation
      const retrieved = await this.vectorStore.search(testVector.embedding, 1);
      if (!retrieved || retrieved.length === 0) {
        throw new Error('Vector retrieval failed');
      }

      // Test delete operation
      await this.vectorStore.delete([testVector.id]);

      return {
        success: true,
        operations_tested: ['write', 'read', 'delete'],
        evidence: 'Successfully completed vector CRUD operations',
        vector_dimension: testVector.embedding.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations_tested: ['write', 'read', 'delete'],
        evidence: `Vector operations failed: ${error.message}`
      };
    }
  }

  /**
   * Test data persistence operations
   */
  async testDataPersistence() {
    const testData = {
      test_key: 'health_check_value',
      timestamp: new Date().toISOString()
    };

    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject) {
        throw new Error('No active project for data persistence testing');
      }

      // Test save operation
      await this.dataPersistence.saveProjectData(
        activeProject.project_id,
        'health-test.json',
        testData
      );

      // Test load operation
      const retrieved = await this.dataPersistence.loadProjectData(
        activeProject.project_id,
        'health-test.json'
      );

      if (!retrieved || retrieved.test_key !== testData.test_key) {
        throw new Error('Data retrieval mismatch');
      }

      return {
        success: true,
        operations_tested: ['save', 'load'],
        evidence: 'Successfully saved and retrieved project data',
        data_size: JSON.stringify(testData).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations_tested: ['save', 'load'],
        evidence: `Data persistence failed: ${error.message}`
      };
    }
  }

  /**
   * Test complete end-to-end workflow
   */
  async testEndToEndWorkflow() {
    const workflowId = `workflow_test_${Date.now()}`;
    
    try {
      // 1. Create project
      const project = await this.projectManagement.createProject({
        goal: 'End-to-end workflow test',
        projectId: workflowId
      });

      if (!project) throw new Error('Workflow step 1 failed: project creation');

      // 2. Switch to project
      await this.projectManagement.switchToProject(workflowId);

      // 3. Generate tasks
      const tasks = await this.taskStrategyCore.getNextTask(workflowId);
      if (!tasks || tasks.length === 0) {
        throw new Error('Workflow step 3 failed: task generation');
      }

      // 4. Complete a task
      await this.taskStrategyCore.handleBlockCompletion(
        workflowId,
        tasks[0].id,
        { status: 'completed', notes: 'Workflow test completion' }
      );

      // 5. Generate next tasks
      const nextTasks = await this.taskStrategyCore.getNextTask(workflowId);
      
      // 6. Cleanup
      await this.projectManagement.deleteProject(workflowId);

      return {
        success: true,
        operations_tested: ['create_project', 'switch_project', 'generate_tasks', 'complete_task', 'get_next_tasks'],
        evidence: `Complete workflow executed: ${tasks.length} initial tasks, ${nextTasks?.length || 0} follow-up tasks`,
        workflow_steps: 6
      };
    } catch (error) {
      // Attempt cleanup
      try {
        await this.projectManagement.deleteProject(workflowId);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error.message,
        operations_tested: ['create_project', 'switch_project', 'generate_tasks', 'complete_task', 'get_next_tasks'],
        evidence: `End-to-end workflow failed: ${error.message}`
      };
    }
  }

  /**
   * Extract actionable errors from test results
   */
  extractActionableErrors(testResults) {
    const actionableErrors = [];

    Object.entries(testResults).forEach(([testName, result]) => {
      if (!result.success && result.error) {
        // Only include errors that indicate real functional problems
        if (!this.isExpectedFailure(result.error)) {
          actionableErrors.push({
            component: testName,
            error: result.error,
            operations_affected: result.operations_tested,
            severity: this.classifyErrorSeverity(result.error)
          });
        }
      }
    });

    return actionableErrors;
  }

  /**
   * Determine if a failure is expected/acceptable
   */
  isExpectedFailure(errorMessage) {
    const expectedFailures = [
      'No active project', // Acceptable in clean environments
      'Vector store not initialized', // Acceptable if vectors disabled
      'ChromaDB not running' // Acceptable if using SQLite
    ];

    return expectedFailures.some(expected => 
      errorMessage.toLowerCase().includes(expected.toLowerCase())
    );
  }

  /**
   * Classify error severity
   */
  classifyErrorSeverity(errorMessage) {
    if (errorMessage.includes('failed') || errorMessage.includes('error')) {
      return 'high';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('slow')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate health report with confidence metrics
   */
  generateHealthReport(healthCheck) {
    const { overall_health, confidence_score, test_results, actionable_errors } = healthCheck;

    let statusEmoji = '✅';
    if (overall_health === 'degraded') statusEmoji = '🟡';
    if (overall_health === 'unhealthy') statusEmoji = '🔴';

    const reportText = `**Functional Health Verification** ${statusEmoji}

**Overall Status**: ${overall_health.toUpperCase()}
**Confidence Score**: ${Math.round(confidence_score * 100)}%
**False Positive Risk**: ${healthCheck.false_positive_risk.toUpperCase()}

**Functional Test Results**:
${Object.entries(test_results).map(([test, result]) => {
  const emoji = result.success ? '✅' : '❌';
  return `- ${test}: ${emoji} ${result.evidence}`;
}).join('\n')}

**Actionable Issues**: ${actionable_errors.length === 0 ? 'None' : actionable_errors.length}
${actionable_errors.map(error => 
  `- ${error.component}: ${error.error} (${error.severity} severity)`
).join('\n')}

**System Capability**: ${healthCheck.tested_functionality.join(', ')}

This verification tests actual functionality rather than file existence.
All results are based on real operations and workflows.`;

    return {
      content: [{
        type: 'text',
        text: reportText
      }],
      health_check: healthCheck
    };
  }
}
