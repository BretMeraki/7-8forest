/**
 * Forest Learning Orchestrator
 * Implements the complete 10-stage workflow from goal capture to completion:
 * 1. Capture top-level goal
 * 2. Gather initial context
 * 3. Conduct onboarding questionnaire using LLM-driven system
 * 4. Build HTA tree based on insights
 * 5. Generate initial batch of tasks
 * 6. User completes tasks in batch
 * 7. Inject context updates from user journey/reflections
 * 8. Evolve HTA tree accordingly
 * 9. Generate next batch of tasks
 * 10. Repeat steps 6-9 until goal achieved
 */

// Import necessary modules
import { IntelligentOnboardingSystem } from './intelligent-onboarding-system.js';
import { HTABridgeCommunication } from './hta-bridge-communication.js';
import { ProjectManagement } from './project-management.js';

export class ForestLearningOrchestrator {
  constructor(llmInterface) {
    this.llmInterface = llmInterface;
    this.onboardingSystem = new IntelligentOnboardingSystem(llmInterface);
    this.htaBridge = new HTABridgeCommunication();
    this.projectManagement = new ProjectManagement(); // Initialize Project Management
    this.currentSession = null;
    this.eventHandlers = new Map();
  }

  /**
   * Setup project management before proceeding with onboarding
   */
  async projectManagementSetup() {
    const activeProject = await this.projectManagement.getActiveProject();
    if (!activeProject.project_id) {
      // No active project, handle project creation or listing
      console.log('No active project. Please create or switch to a project before proceeding.');
      return;
    }
    console.log(`Active project is '${activeProject.project_id}'. Proceeding with onboarding.`);
  }
   * Stage 1 & 2: Capture top-level goal and gather initial context
   * @param {string} topLevelGoal - The primary goal for the session
   * @param {Object} initialContext - Initial context information
   * @returns {Object} Session initialization result
   */
  async captureGoalAndContext(topLevelGoal, initialContext = {}) {
    this.currentSession = {
      id: this.generateSessionId(),
      goal: topLevelGoal,
      initialContext,
      stage: 'goal_captured',
      startTime: new Date(),
      onboardingData: null,
      htaTree: null,
      taskBatches: [],
      currentBatch: null,
      completedTasks: [],
      contextUpdates: [],
      goalStatus: 'in_progress',
      metadata: {
        totalTasksCompleted: 0,
        batchesGenerated: 0,
        htaEvolutions: 0
      }
    };

    this.emit('session_initialized', this.currentSession);

    // Ensure project setup is completed
    await this.projectManagementSetup();
    return this.currentSession;
  }

  /**
   * Stage 3: Conduct onboarding questionnaire using LLM-driven system
   * @returns {Object} Onboarding results with user profile
   */
  async conductOnboarding() {
    if (!this.currentSession) {
      throw new Error('No active session. Call captureGoalAndContext first.');
    }

    this.currentSession.stage = 'onboarding_in_progress';
    this.emit('onboarding_started', this.currentSession);

    try {
      // Generate initial onboarding questions
      const onboardingQuestions = await this.onboardingSystem.generateOnboardingQuestions(
        this.currentSession.goal,
        this.currentSession.initialContext
      );

      // Store onboarding data
      this.currentSession.onboardingData = {
        questions: onboardingQuestions,
        responses: [],
        userProfile: null,
        readinessAssessment: null,
        completed: false
      };

      this.currentSession.stage = 'onboarding_ready';
      this.emit('onboarding_questions_generated', onboardingQuestions);
      
      return onboardingQuestions;
    } catch (error) {
      this.currentSession.stage = 'onboarding_failed';
      this.emit('onboarding_error', error);
      throw error;
    }
  }

  /**
   * Process user responses to onboarding questions
   * @param {Array} responses - Array of user responses
   * @returns {Object} Processed user profile and readiness assessment
   */
  async processOnboardingResponses(responses) {
    if (!this.currentSession?.onboardingData) {
      throw new Error('No onboarding session active.');
    }

    try {
      // Process responses through the onboarding system
      const processedProfile = await this.onboardingSystem.processUserResponses(responses);
      
      // Generate readiness assessment
      const readinessAssessment = await this.onboardingSystem.assessReadiness(
        this.currentSession.goal,
        processedProfile
      );

      // Update session data
      this.currentSession.onboardingData.responses = responses;
      this.currentSession.onboardingData.userProfile = processedProfile;
      this.currentSession.onboardingData.readinessAssessment = readinessAssessment;
      this.currentSession.onboardingData.completed = true;
      this.currentSession.stage = 'onboarding_completed';

      this.emit('onboarding_completed', {
        profile: processedProfile,
        readiness: readinessAssessment
      });

      return { profile: processedProfile, readiness: readinessAssessment };
    } catch (error) {
      this.currentSession.stage = 'onboarding_failed';
      this.emit('onboarding_error', error);
      throw error;
    }
  }

  /**
   * Stage 4: Build HTA tree based on onboarding insights
   * @returns {Object} Generated HTA tree structure
   */
  async buildHTATree() {
    if (!this.currentSession?.onboardingData?.completed) {
      throw new Error('Onboarding must be completed before building HTA tree.');
    }

    this.currentSession.stage = 'hta_building';
    this.emit('hta_building_started', this.currentSession);

    try {
      // Analyze goal with rich context from onboarding
      const enrichedContext = {
        ...this.currentSession.initialContext,
        userProfile: this.currentSession.onboardingData.userProfile,
        readinessAssessment: this.currentSession.onboardingData.readinessAssessment
      };

      const htaTree = await this.htaBridge.analyzeGoal(
        this.currentSession.goal,
        enrichedContext
      );

      this.currentSession.htaTree = htaTree;
      this.currentSession.stage = 'hta_built';
      this.emit('hta_tree_built', htaTree);

      return htaTree;
    } catch (error) {
      this.currentSession.stage = 'hta_building_failed';
      this.emit('hta_building_error', error);
      throw error;
    }
  }

  /**
   * Stage 5: Generate initial batch of tasks
   * @returns {Array} Initial task batch
   */
  async generateInitialTaskBatch() {
    if (!this.currentSession?.htaTree) {
      throw new Error('HTA tree must be built before generating tasks.');
    }

    this.currentSession.stage = 'task_generation';
    this.emit('task_generation_started', this.currentSession);

    try {
      const initialTasks = await this.htaBridge.generateTasks(this.currentSession.htaTree);
      
      const batch = {
        id: this.generateBatchId(),
        tasks: initialTasks,
        createdAt: new Date(),
        batchNumber: 1,
        status: 'active',
        completedTasks: [],
        pendingTasks: [...initialTasks]
      };

      this.currentSession.taskBatches.push(batch);
      this.currentSession.currentBatch = batch;
      this.currentSession.metadata.batchesGenerated = 1;
      this.currentSession.stage = 'task_batch_ready';

      this.emit('task_batch_generated', batch);
      return batch;
    } catch (error) {
      this.currentSession.stage = 'task_generation_failed';
      this.emit('task_generation_error', error);
      throw error;
    }
  }

  /**
   * Stage 6: Handle task completion by user
   * @param {Object} completedTask - Details of completed task
   * @param {Object} userReflections - User reflections and learning insights
   * @returns {Object} Task completion result
   */
  async handleTaskCompletion(completedTask, userReflections = {}) {
    if (!this.currentSession?.currentBatch) {
      throw new Error('No active task batch.');
    }

    try {
      // Update task status
      const taskIndex = this.currentSession.currentBatch.pendingTasks.findIndex(
        task => task.id === completedTask.id
      );
      
      if (taskIndex === -1) {
        throw new Error(`Task ${completedTask.id} not found in current batch.`);
      }

      // Move task from pending to completed
      const task = this.currentSession.currentBatch.pendingTasks.splice(taskIndex, 1)[0];
      task.completedAt = new Date();
      task.userReflections = userReflections;
      task.status = 'completed';
      
      this.currentSession.currentBatch.completedTasks.push(task);
      this.currentSession.completedTasks.push(task);
      this.currentSession.metadata.totalTasksCompleted++;

      this.emit('task_completed', {
        task,
        reflections: userReflections,
        batchProgress: this.getCurrentBatchProgress()
      });

      return {
        taskCompleted: task,
        batchProgress: this.getCurrentBatchProgress(),
        isLastTaskInBatch: this.currentSession.currentBatch.pendingTasks.length === 0
      };
    } catch (error) {
      this.emit('task_completion_error', error);
      throw error;
    }
  }

  /**
   * Stage 7: Inject context updates from user journey and reflections
   * @param {Object} contextUpdate - New context information
   * @returns {Object} Context injection result
   */
  async injectContextUpdates(contextUpdate) {
    if (!this.currentSession) {
      throw new Error('No active session.');
    }

    try {
      const enrichedUpdate = {
        ...contextUpdate,
        timestamp: new Date(),
        source: 'user_journey',
        batchContext: this.getCurrentBatchProgress()
      };

      this.currentSession.contextUpdates.push(enrichedUpdate);
      this.emit('context_updated', enrichedUpdate);

      return enrichedUpdate;
    } catch (error) {
      this.emit('context_injection_error', error);
      throw error;
    }
  }

  /**
   * Stage 8: Evolve HTA tree based on new context and completed tasks
   * @returns {Object} Evolved HTA tree
   */
  async evolveHTATree() {
    if (!this.currentSession?.htaTree) {
      throw new Error('No HTA tree to evolve.');
    }

    this.currentSession.stage = 'hta_evolution';
    this.emit('hta_evolution_started', this.currentSession);

    try {
      // Compile evolution data
      const evolutionData = {
        completedTasks: this.currentSession.completedTasks,
        contextUpdates: this.currentSession.contextUpdates,
        userReflections: this.currentSession.completedTasks.map(task => task.userReflections),
        currentProgress: this.getOverallProgress()
      };

      const evolvedTree = await this.htaBridge.evolveStrategy(
        this.currentSession.htaTree,
        evolutionData
      );

      this.currentSession.htaTree = evolvedTree;
      this.currentSession.metadata.htaEvolutions++;
      this.currentSession.stage = 'hta_evolved';

      this.emit('hta_tree_evolved', {
        evolvedTree,
        evolutionData,
        evolutionCount: this.currentSession.metadata.htaEvolutions
      });

      return evolvedTree;
    } catch (error) {
      this.currentSession.stage = 'hta_evolution_failed';
      this.emit('hta_evolution_error', error);
      throw error;
    }
  }

  /**
   * Stage 9: Generate next batch of tasks
   * @returns {Array} Next task batch
   */
  async generateNextTaskBatch() {
    if (!this.currentSession?.htaTree) {
      throw new Error('HTA tree required for task generation.');
    }

    this.currentSession.stage = 'next_batch_generation';
    this.emit('next_batch_generation_started', this.currentSession);

    try {
      const nextTasks = await this.htaBridge.generateTasks(this.currentSession.htaTree);
      
      const batch = {
        id: this.generateBatchId(),
        tasks: nextTasks,
        createdAt: new Date(),
        batchNumber: this.currentSession.metadata.batchesGenerated + 1,
        status: 'active',
        completedTasks: [],
        pendingTasks: [...nextTasks]
      };

      // Mark previous batch as completed
      if (this.currentSession.currentBatch) {
        this.currentSession.currentBatch.status = 'completed';
      }

      this.currentSession.taskBatches.push(batch);
      this.currentSession.currentBatch = batch;
      this.currentSession.metadata.batchesGenerated++;
      this.currentSession.stage = 'next_batch_ready';

      this.emit('next_batch_generated', batch);
      return batch;
    } catch (error) {
      this.currentSession.stage = 'next_batch_generation_failed';
      this.emit('next_batch_generation_error', error);
      throw error;
    }
  }

  /**
   * Check if the overall goal has been achieved
   * @returns {Object} Goal completion assessment
   */
  async assessGoalCompletion() {
    if (!this.currentSession) {
      throw new Error('No active session.');
    }

    try {
      const completionAssessment = await this.llmInterface.generateResponse({
        prompt: `
          Analyze the following learning session and determine if the goal has been achieved:
          
          Original Goal: ${this.currentSession.goal}
          
          Completed Tasks: ${JSON.stringify(this.currentSession.completedTasks, null, 2)}
          
          User Reflections: ${JSON.stringify(this.currentSession.completedTasks.map(t => t.userReflections), null, 2)}
          
          Context Updates: ${JSON.stringify(this.currentSession.contextUpdates, null, 2)}
          
          Provide a comprehensive assessment of:
          1. Goal achievement percentage (0-100)
          2. Key accomplishments
          3. Remaining gaps (if any)
          4. Recommendation for next steps
          5. Overall completion status (completed/in_progress/needs_adjustment)
          
          Format your response as a JSON object with these fields:
          {
            "completion_percentage": number,
            "accomplishments": [string],
            "remaining_gaps": [string],
            "next_steps": string,
            "status": "completed" | "in_progress" | "needs_adjustment",
            "reasoning": string
          }
        `
      });

      const assessment = JSON.parse(completionAssessment);
      
      if (assessment.status === 'completed') {
        this.currentSession.goalStatus = 'completed';
        this.currentSession.stage = 'goal_completed';
        this.emit('goal_completed', assessment);
      }

      return assessment;
    } catch (error) {
      this.emit('goal_assessment_error', error);
      throw error;
    }
  }

  /**
   * Execute the complete orchestration cycle (stages 6-9)
   * @param {Object} completedTask - Task that was completed
   * @param {Object} userReflections - User reflections
   * @param {Object} contextUpdate - Additional context updates
   * @returns {Object} Cycle execution result
   */
  async executeOrchestrationCycle(completedTask, userReflections, contextUpdate = {}) {
    try {
      // Stage 6: Handle task completion
      const completionResult = await this.handleTaskCompletion(completedTask, userReflections);
      
      // Stage 7: Inject context updates
      await this.injectContextUpdates(contextUpdate);
      
      // Check if batch is complete
      if (completionResult.isLastTaskInBatch) {
        // Stage 8: Evolve HTA tree
        await this.evolveHTATree();
        
        // Check goal completion
        const goalAssessment = await this.assessGoalCompletion();
        
        if (goalAssessment.status !== 'completed') {
          // Stage 9: Generate next batch
          await this.generateNextTaskBatch();
        }
        
        return {
          cycleCompleted: true,
          goalAssessment,
          nextBatchGenerated: goalAssessment.status !== 'completed'
        };
      }
      
      return {
        cycleCompleted: false,
        taskCompleted: true,
        batchProgress: completionResult.batchProgress
      };
    } catch (error) {
      this.emit('orchestration_cycle_error', error);
      throw error;
    }
  }

  /**
   * Get current batch progress
   * @returns {Object} Batch progress information
   */
  getCurrentBatchProgress() {
    if (!this.currentSession?.currentBatch) {
      return null;
    }

    const batch = this.currentSession.currentBatch;
    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      totalTasks: batch.tasks.length,
      completedTasks: batch.completedTasks.length,
      pendingTasks: batch.pendingTasks.length,
      completionPercentage: (batch.completedTasks.length / batch.tasks.length) * 100
    };
  }

  /**
   * Get overall session progress
   * @returns {Object} Overall progress information
   */
  getOverallProgress() {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.id,
      goal: this.currentSession.goal,
      stage: this.currentSession.stage,
      goalStatus: this.currentSession.goalStatus,
      totalTasksCompleted: this.currentSession.metadata.totalTasksCompleted,
      batchesGenerated: this.currentSession.metadata.batchesGenerated,
      htaEvolutions: this.currentSession.metadata.htaEvolutions,
      startTime: this.currentSession.startTime,
      duration: new Date() - this.currentSession.startTime
    };
  }

  /**
   * Event handling system
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Utility methods
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the current session state
   * @returns {Object} Current session state
   */
  getSessionState() {
    return this.currentSession;
  }

  /**
   * Reset the orchestrator
   */
  reset() {
    this.currentSession = null;
    this.eventHandlers.clear();
  }

  // Project Management Integration Methods
  
  /**
   * Create a new project
   * @param {string} projectId - Project identifier
   * @param {Object} projectData - Project configuration
   * @returns {Object} Project creation result
   */
  async createProject(projectId, projectData = {}) {
    return await this.projectManagement.createProject(projectId, projectData);
  }

  /**
   * Switch to an existing project
   * @param {string} projectId - Project identifier
   * @returns {Object} Project switch result
   */
  async switchProject(projectId) {
    return await this.projectManagement.switchProject(projectId);
  }

  /**
   * List all available projects
   * @returns {Array} List of projects
   */
  async listProjects() {
    return await this.projectManagement.listProjects();
  }

  /**
   * Get the currently active project
   * @returns {Object} Active project information
   */
  async getActiveProject() {
    return await this.projectManagement.getActiveProject();
  }

  /**
   * Update project progress
   * @param {Object} progressData - Progress information
   * @returns {Object} Progress update result
   */
  async updateProjectProgress(progressData) {
    return await this.projectManagement.updateProgress(progressData);
  }

  /**
   * Get project history
   * @param {string} projectId - Project identifier (optional, uses active project if not provided)
   * @returns {Array} Project history
   */
  async getProjectHistory(projectId = null) {
    return await this.projectManagement.getProjectHistory(projectId);
  }

  /**
   * Factory Reset - Delete project(s) with user confirmation
   * @param {string} projectId - Project identifier (optional, if not provided, offers to reset all projects)
   * @param {Function} confirmationCallback - Callback to handle user confirmation dialog
   * @returns {Object} Reset operation result
   */
  async factoryReset(projectId = null, confirmationCallback = null) {
    try {
      // Get information about what will be deleted
      let resetInfo;
      if (projectId) {
        // Single project reset
        const projectExists = await this.projectManagement.projectExists(projectId);
        if (!projectExists) {
          throw new Error(`Project '${projectId}' does not exist.`);
        }
        resetInfo = {
          type: 'single_project',
          projectId: projectId,
          message: `This will permanently delete the project '${projectId}' and all its data including:\n- Learning sessions\n- Task history\n- Progress data\n- User reflections\n- HTA trees\n\nThis action cannot be undone.`
        };
      } else {
        // All projects reset
        const allProjects = await this.projectManagement.listProjects();
        resetInfo = {
          type: 'all_projects',
          projectCount: allProjects.length,
          projects: allProjects.map(p => p.project_id),
          message: `This will permanently delete ALL ${allProjects.length} projects and their data including:\n- All learning sessions\n- All task history\n- All progress data\n- All user reflections\n- All HTA trees\n\nThis action cannot be undone.`
        };
      }

      // Emit event for UI to show confirmation dialog
      this.emit('factory_reset_confirmation_required', resetInfo);

      // Handle confirmation
      const confirmed = await this.handleFactoryResetConfirmation(
        resetInfo,
        confirmationCallback
      );

      if (!confirmed) {
        return {
          success: false,
          message: 'Factory reset cancelled by user.',
          cancelled: true
        };
      }

      // Perform the reset
      let resetResult;
      if (projectId) {
        // Reset single project
        resetResult = await this.resetSingleProject(projectId);
      } else {
        // Reset all projects
        resetResult = await this.resetAllProjects();
      }

      // Clear current session if active project was deleted
      if (this.currentSession) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (!activeProject.project_id || 
            (projectId && activeProject.project_id === projectId)) {
          this.reset();
        }
      }

      this.emit('factory_reset_completed', resetResult);
      return resetResult;

    } catch (error) {
      this.emit('factory_reset_error', error);
      throw error;
    }
  }

  /**
   * Handle factory reset confirmation dialog
   * @param {Object} resetInfo - Information about what will be reset
   * @param {Function} confirmationCallback - Callback to handle confirmation
   * @returns {boolean} Whether user confirmed the reset
   */
  async handleFactoryResetConfirmation(resetInfo, confirmationCallback) {
    if (confirmationCallback && typeof confirmationCallback === 'function') {
      // Use provided callback for confirmation
      return await confirmationCallback(resetInfo);
    }

    // Default confirmation using LLM interface for conversational confirmation
    if (this.llmInterface) {
      try {
        const confirmationPrompt = `
          The user is attempting to perform a factory reset with the following details:
          
          ${resetInfo.message}
          
          Please generate a clear, user-friendly confirmation dialog that:
          1. Clearly explains what will be deleted
          2. Emphasizes that this action cannot be undone
          3. Asks for explicit confirmation
          4. Provides options to proceed or cancel
          
          Return only the confirmation message text (no JSON, no additional formatting).
        `;

        const confirmationMessage = await this.llmInterface.generateResponse({
          prompt: confirmationPrompt
        });

        // Emit event with confirmation message for UI handling
        this.emit('factory_reset_confirmation_dialog', {
          message: confirmationMessage,
          resetInfo: resetInfo
        });

        // Return false by default - UI should handle actual confirmation
        // and call factoryReset again with proper confirmation callback
        return false;
      } catch (error) {
        console.error('Error generating confirmation dialog:', error);
        return false;
      }
    }

    // Fallback: return false to prevent accidental deletion
    return false;
  }

  /**
   * Reset a single project
   * @param {string} projectId - Project identifier
   * @returns {Object} Reset result
   */
  async resetSingleProject(projectId) {
    try {
      // Use project management's delete method
      await this.projectManagement.dataPersistence.deleteProject(projectId);
      
      return {
        success: true,
        type: 'single_project',
        projectId: projectId,
        message: `Project '${projectId}' has been successfully deleted.`,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to reset project '${projectId}': ${error.message}`);
    }
  }

  /**
   * Reset all projects
   * @returns {Object} Reset result
   */
  async resetAllProjects() {
    try {
      const allProjects = await this.projectManagement.listProjects();
      const deletedProjects = [];
      const errors = [];

      // Delete each project individually
      for (const project of allProjects) {
        try {
          await this.projectManagement.dataPersistence.deleteProject(project.project_id);
          deletedProjects.push(project.project_id);
        } catch (error) {
          errors.push({
            projectId: project.project_id,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        type: 'all_projects',
        deletedProjects: deletedProjects,
        errors: errors,
        message: `Factory reset completed. ${deletedProjects.length} projects deleted${errors.length > 0 ? ` with ${errors.length} errors` : ''}.`,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to reset all projects: ${error.message}`);
    }
  }

  /**
   * Quick confirmation for factory reset (for programmatic use)
   * @param {string} projectId - Project identifier (optional)
   * @param {boolean} forceConfirm - Skip confirmation dialog (dangerous!)
   * @returns {Object} Reset result
   */
  async quickFactoryReset(projectId = null, forceConfirm = false) {
    if (!forceConfirm) {
      throw new Error('Quick factory reset requires explicit forceConfirm=true parameter for safety.');
    }

    const confirmationCallback = () => Promise.resolve(true);
    return await this.factoryReset(projectId, confirmationCallback);
  }

  /**
   * Get factory reset preview (what would be deleted)
   * @param {string} projectId - Project identifier (optional)
   * @returns {Object} Preview of what would be deleted
   */
  async getFactoryResetPreview(projectId = null) {
    try {
      if (projectId) {
        // Single project preview
        const projectExists = await this.projectManagement.projectExists(projectId);
        if (!projectExists) {
          throw new Error(`Project '${projectId}' does not exist.`);
        }

        const projectHistory = await this.projectManagement.getProjectHistory(projectId);
        return {
          type: 'single_project',
          projectId: projectId,
          sessionsCount: projectHistory.length,
          estimatedDataSize: 'Unknown', // Could be enhanced with actual size calculation
          lastActivity: projectHistory.length > 0 ? projectHistory[0].timestamp : null
        };
      } else {
        // All projects preview
        const allProjects = await this.projectManagement.listProjects();
        const projectPreviews = [];
        
        for (const project of allProjects) {
          const history = await this.projectManagement.getProjectHistory(project.project_id);
          projectPreviews.push({
            projectId: project.project_id,
            sessionsCount: history.length,
            lastActivity: history.length > 0 ? history[0].timestamp : null
          });
        }

        return {
          type: 'all_projects',
          projectCount: allProjects.length,
          projects: projectPreviews,
          totalSessions: projectPreviews.reduce((sum, p) => sum + p.sessionsCount, 0)
        };
      }
    } catch (error) {
      throw new Error(`Failed to generate factory reset preview: ${error.message}`);
    }
  }
}
