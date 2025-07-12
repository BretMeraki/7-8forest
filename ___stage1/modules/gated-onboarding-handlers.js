/**
 * Gated Onboarding Handlers - Extracted from core server
 * 
 * Handles all gated onboarding flow and Next + Pipeline presentation tools
 */

export class GatedOnboardingHandlers {
  constructor(gatedOnboarding, pipelinePresenter, projectManagement) {
    this.gatedOnboarding = gatedOnboarding;
    this.pipelinePresenter = pipelinePresenter;
    this.projectManagement = projectManagement;
  }

  /**
   * Start the 6-stage gated onboarding journey
   */
  async startLearningJourney(args) {
    try {
      const { goal, user_context = {} } = args;
      
      if (!goal) {
        return {
          content: [{
            type: 'text',
            text: '**🎯 Learning Journey Startup Error**\n\nA learning goal is required to start the journey.\n\nExample: `start_learning_journey_forest --goal "Learn portrait photography and grow Instagram to 10k followers"`'
          }],
          error: 'Goal is required'
        };
      }
      
      const result = await this.gatedOnboarding.startNewProject(goal, user_context);
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `**🚀 Learning Journey Started!**\n\n` +
                  `**Goal**: ${result.validated_goal || goal}\n` +
                  `**Project ID**: ${result.projectId}\n` +
                  `**Stage**: ${result.stage}\n` +
                  `**Status**: ${result.gate_status}\n\n` +
                  `${result.message}\n\n` +
                  `**Next Step**: Use \`continue_onboarding_forest\` to proceed to ${result.next_stage}`
          }],
          success: true,
          project_id: result.projectId,
          stage: result.stage,
          gate_status: result.gate_status,
          next_stage: result.next_stage
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**❌ Learning Journey Failed to Start**\n\n` +
                  `**Error**: ${result.error || result.message}\n\n` +
                  `${result.suggestions ? '**Suggestions**:\n' + result.suggestions.map(s => `• ${s}`).join('\n') : ''}\n\n` +
                  `**Action Required**: ${result.action_required || 'Check your goal and try again'}`
          }],
          error: result.error || result.message,
          suggestions: result.suggestions
        };
      }
    } catch (error) {
      console.error('GatedOnboardingHandlers.startLearningJourney failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Learning Journey Startup Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Continue through onboarding stages with quality gates
   */
  async continueOnboarding(args) {
    try {
      const { stage, input_data = {}, project_id } = args;
      
      // Get project ID from args or active project
      let targetProjectId = project_id;
      if (!targetProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (activeProject && activeProject.project_id) {
          targetProjectId = activeProject.project_id;
        }
      }
      
      if (!targetProjectId) {
        return {
          content: [{
            type: 'text',
            text: '**❌ No Project Found**\n\nPlease specify a project_id or ensure you have an active project.\n\nUse `start_learning_journey_forest` to begin a new onboarding journey.'
          }],
          error: 'No project ID available'
        };
      }
      
      let result;
      
      switch (stage) {
        case 'context_gathering':
          result = await this.gatedOnboarding.gatherContext(targetProjectId, input_data);
          break;
        case 'questionnaire':
          if (input_data.action === 'start') {
            result = await this.gatedOnboarding.startDynamicQuestionnaire(targetProjectId);
          } else if (input_data.question_id && input_data.response) {
            result = await this.gatedOnboarding.processQuestionnaireResponse(
              targetProjectId,
              input_data.question_id,
              input_data.response
            );
          } else {
            return {
              content: [{
                type: 'text',
                text: '**❌ Questionnaire Input Error**\n\nFor questionnaire stage, provide either:\n• `{"action": "start"}` to begin\n• `{"question_id": "ID", "response": "your answer"}` to answer'
              }],
              error: 'Invalid questionnaire input'
            };
          }
          break;
        case 'complexity_analysis':
          result = await this.gatedOnboarding.performComplexityAnalysis(targetProjectId);
          break;
        case 'hta_generation':
          result = await this.gatedOnboarding.generateHTATree(targetProjectId);
          break;
        case 'strategic_framework':
          result = await this.gatedOnboarding.buildStrategicFramework(targetProjectId);
          break;
        default:
          return {
            content: [{
              type: 'text',
              text: `**❌ Invalid Stage**\n\nStage '${stage}' is not recognized.\n\n**Valid stages**:\n• context_gathering\n• questionnaire\n• complexity_analysis\n• hta_generation\n• strategic_framework`
            }],
            error: 'Invalid stage'
          };
      }
      
      if (result.success) {
        let statusText = `**✅ Stage Complete: ${stage}**\n\n` +
                        `**Status**: ${result.gate_status}\n` +
                        `**Message**: ${result.message}\n`;
        
        if (result.next_stage) {
          statusText += `\n**Next Stage**: ${result.next_stage}\n`;
          statusText += `**Action**: Use \`continue_onboarding_forest\` with stage "${result.next_stage}"`;
        }
        
        if (result.onboarding_complete) {
          statusText += `\n\n🎉 **Onboarding Complete!** You can now use \`get_next_pipeline_forest\` to start learning.`;
        }
        
        return {
          content: [{
            type: 'text',
            text: statusText
          }],
          success: true,
          project_id: targetProjectId,
          stage: result.stage,
          gate_status: result.gate_status,
          next_stage: result.next_stage,
          onboarding_complete: result.onboarding_complete
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**🚫 Stage Blocked: ${stage}**\n\n` +
                  `**Gate Status**: ${result.gate_status}\n` +
                  `**Message**: ${result.message}\n` +
                  `**Action Required**: ${result.action_required}\n\n` +
                  `${result.missing_info ? '**Missing Information**: ' + result.missing_info.join(', ') : ''}\n` +
                  `${result.suggestions ? '**Suggestions**: ' + result.suggestions.join(', ') : ''}`
          }],
          error: result.error || result.message,
          gate_status: result.gate_status,
          action_required: result.action_required
        };
      }
    } catch (error) {
      console.error('GatedOnboardingHandlers.continueOnboarding failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Onboarding Continuation Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Get current onboarding status and progress
   */
  async getOnboardingStatus(args) {
    try {
      const { project_id } = args;
      
      // Get project ID from args or active project
      let targetProjectId = project_id;
      if (!targetProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (activeProject && activeProject.project_id) {
          targetProjectId = activeProject.project_id;
        }
      }
      
      if (!targetProjectId) {
        return {
          content: [{
            type: 'text',
            text: '**❌ No Project Found**\n\nPlease specify a project_id or ensure you have an active project.\n\nUse `start_learning_journey_forest` to begin a new onboarding journey.'
          }],
          error: 'No project ID available'
        };
      }
      
      const result = await this.gatedOnboarding.getOnboardingStatus(targetProjectId);
      
      if (result.success) {
        const gateStatus = Object.entries(result.gates)
          .map(([gate, status]) => `${status ? '✅' : '❌'} ${gate.replace(/_/g, ' ')}`)
          .join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `**🎯 Onboarding Status**\n\n` +
                  `**Project**: ${result.projectId}\n` +
                  `**Current Stage**: ${result.current_stage}\n` +
                  `**Progress**: ${result.progress}%\n` +
                  `**Started**: ${result.started_at ? new Date(result.started_at).toLocaleString() : 'Unknown'}\n` +
                  `${result.completed_at ? `**Completed**: ${new Date(result.completed_at).toLocaleString()}\n` : ''}\n` +
                  `**Gate Status**:\n${gateStatus}\n\n` +
                  `${result.progress === 100 ? '🎉 **Onboarding Complete!** Use `get_next_pipeline_forest` to start learning.' : `**Next Action**: Continue with stage "${result.current_stage}"`}`
          }],
          project_id: result.projectId,
          current_stage: result.current_stage,
          progress: result.progress,
          gates: result.gates,
          completed: result.completed_at !== undefined
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**ℹ️ No Onboarding in Progress**\n\n` +
                  `${result.message}\n\n` +
                  `**Action**: Use \`start_learning_journey_forest\` to begin the gated onboarding process.`
          }],
          message: result.message,
          onboarding_active: false
        };
      }
    } catch (error) {
      console.error('GatedOnboardingHandlers.getOnboardingStatus failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Onboarding Status Check Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Complete onboarding process (if needed)
   */
  async completeOnboarding(args) {
    try {
      const { project_id } = args;
      
      // Get project ID from args or active project
      let targetProjectId = project_id;
      if (!targetProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (activeProject && activeProject.project_id) {
          targetProjectId = activeProject.project_id;
        }
      }
      
      if (!targetProjectId) {
        return {
          content: [{
            type: 'text',
            text: '**❌ No Project Found**\n\nPlease specify a project_id or ensure you have an active project.'
          }],
          error: 'No project ID available'
        };
      }
      
      // Check if onboarding is already complete
      const status = await this.gatedOnboarding.getOnboardingStatus(targetProjectId);
      
      if (status.success && status.progress === 100) {
        return {
          content: [{
            type: 'text',
            text: `**🎉 Onboarding Already Complete!**\n\n` +
                  `**Project**: ${targetProjectId}\n` +
                  `**Completed**: ${status.completed_at ? new Date(status.completed_at).toLocaleString() : 'Recently'}\n\n` +
                  `**Action**: Use \`get_next_pipeline_forest\` to start your learning journey.`
          }],
          project_id: targetProjectId,
          already_complete: true
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `**⚠️ Onboarding Not Complete**\n\n` +
                `**Project**: ${targetProjectId}\n` +
                `**Progress**: ${status.progress || 0}%\n` +
                `**Current Stage**: ${status.current_stage || 'Unknown'}\n\n` +
                `**Action**: Use \`continue_onboarding_forest\` to complete the remaining stages.`
        }],
        project_id: targetProjectId,
        progress: status.progress || 0,
        current_stage: status.current_stage
      };
    } catch (error) {
      console.error('GatedOnboardingHandlers.completeOnboarding failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Onboarding Completion Check Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Get Next + Pipeline task presentation (hybrid design)
   */
  async getNextPipeline(args) {
    try {
      const { energy_level = 3, time_available = '45 minutes' } = args;
      
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**❌ No Active Project**\n\nCreate or switch to a project first to get your task pipeline.\n\nUse `start_learning_journey_forest` to begin a new learning journey.'
          }],
          error: 'No active project'
        };
      }
      
      // Check if onboarding is complete
      const onboardingStatus = await this.gatedOnboarding.getOnboardingStatus(activeProject.project_id);
      if (onboardingStatus.success && onboardingStatus.progress < 100) {
        return {
          content: [{
            type: 'text',
            text: `**⚠️ Onboarding Not Complete**\n\n` +
                  `**Progress**: ${onboardingStatus.progress}%\n` +
                  `**Current Stage**: ${onboardingStatus.current_stage}\n\n` +
                  `**Action**: Complete onboarding first using \`continue_onboarding_forest\` before accessing the task pipeline.`
          }],
          onboarding_incomplete: true,
          progress: onboardingStatus.progress
        };
      }
      
      const result = await this.pipelinePresenter.generateNextPipeline({
        project_id: activeProject.project_id,
        energy_level,
        time_available
      });
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `**🎯 Next + Pipeline Presentation**\n\n` +
                  `**Project**: ${activeProject.goal || 'Unknown'}\n` +
                  `**Energy Level**: ${energy_level}/5\n` +
                  `**Time Available**: ${time_available}\n\n` +
                  `${result.presentation}\n\n` +
                  `**Action**: Use \`complete_block_forest\` when you finish a task.`
          }],
          success: true,
          project_id: activeProject.project_id,
          pipeline: result.pipeline,
          primary_task: result.primary_task,
          coming_up: result.coming_up,
          alternatives: result.alternatives
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**❌ Pipeline Generation Failed**\n\nError: ${result.error || result.message}\n\nPlease check your project status and try again.`
          }],
          error: result.error || result.message
        };
      }
    } catch (error) {
      console.error('GatedOnboardingHandlers.getNextPipeline failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Pipeline Presentation Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }

  /**
   * Evolve pipeline based on progress and evolution triggers
   */
  async evolvePipeline(args) {
    try {
      const { triggers = {}, context = {} } = args;
      
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**❌ No Active Project**\n\nCreate or switch to a project first to evolve your pipeline.'
          }],
          error: 'No active project'
        };
      }
      
      const result = await this.pipelinePresenter.evolvePipeline({
        project_id: activeProject.project_id,
        triggers,
        context
      });
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `**🔄 Pipeline Evolved**\n\n` +
                  `**Project**: ${activeProject.goal || 'Unknown'}\n` +
                  `**Evolution Triggers**: ${Object.keys(triggers).join(', ') || 'None'}\n\n` +
                  `${result.message}\n\n` +
                  `**Action**: Use \`get_next_pipeline_forest\` to see your refreshed task pipeline.`
          }],
          success: true,
          project_id: activeProject.project_id,
          evolution_applied: true,
          changes: result.changes
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**❌ Pipeline Evolution Failed**\n\nError: ${result.error || result.message}\n\nPlease check your project status and try again.`
          }],
          error: result.error || result.message
        };
      }
    } catch (error) {
      console.error('GatedOnboardingHandlers.evolvePipeline failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Pipeline Evolution Failed**\n\nError: ${error.message}\n\nPlease check the system status and try again.`
        }],
        error: error.message
      };
    }
  }
}
