/**
 * Streamlined Onboarding Manager
 * Provides a single, clear path for new users to create projects
 * Eliminates confusion from multiple onboarding tools
 */

import { logger } from '../../modules/utils/logger.js';

export class StreamlinedOnboarding {
  constructor(projectManagement, htaCore, dataPersistence) {
    this.projectManagement = projectManagement;
    this.htaCore = htaCore;
    this.dataPersistence = dataPersistence;
    this.logger = logger;
    
    // Single source of truth for onboarding state
    this.sessions = new Map();
  }

  /**
   * Main entry point - detects if user needs onboarding
   * @returns {Object} Appropriate response based on user state
   */
  async getStarted() {
    try {
      // Check if user has any projects
      const projects = await this.projectManagement.listProjects();
      
      if (projects && projects.length > 0) {
        // User has projects - show project list
        return this.showExistingProjects(projects);
      } else {
        // New user - start onboarding
        return this.startNewUserOnboarding();
      }
    } catch (error) {
      this.logger.error('[StreamlinedOnboarding] Error in getStarted', { error: error.message });
      return this.showErrorWithRecovery(error);
    }
  }

  /**
   * Start onboarding for new users
   * @returns {Object} Welcome message with clear next step
   */
  async startNewUserOnboarding() {
    const sessionId = `onboard_${Date.now()}`;
    
    this.sessions.set(sessionId, {
      id: sessionId,
      state: 'welcome',
      data: {},
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      content: [{
        type: 'text',
        text: `# 🌲 Welcome to Forest Suite!

I'll help you create a personalized learning and achievement system. This is a simple 3-step process:

**Step 1:** Share your goal or dream
**Step 2:** Tell me about your current situation  
**Step 3:** Answer a few quick questions

Ready to begin? Just tell me: **What would you like to achieve?**

*Example: "I want to learn piano", "I want to start a business", "I want to change careers"*

---
💡 **Tip:** Be specific about what success looks like for you.`
      }],
      next_action: 'Use create_project_forest with your goal to continue',
      session_id: sessionId
    };
  }

  /**
   * Show existing projects for returning users
   * @param {Array} projects - List of user's projects
   * @returns {Object} Project list with clear actions
   */
  showExistingProjects(projects) {
    const activeProject = projects.find(p => p.is_active);
    
    let content = `# 🌲 Welcome Back to Forest Suite!\n\n`;
    
    if (activeProject) {
      content += `**Active Project:** ${activeProject.name}\n`;
      content += `*Goal:* ${activeProject.goal || 'No goal set'}\n\n`;
    }
    
    content += `## Your Projects:\n\n`;
    
    projects.forEach((project, index) => {
      const status = project.is_active ? '🟢' : '⚪';
      content += `${status} **${project.name}**\n`;
      content += `   Created: ${new Date(project.created_at).toLocaleDateString()}\n`;
      if (project.last_activity) {
        content += `   Last activity: ${this.getRelativeTime(project.last_activity)}\n`;
      }
      content += '\n';
    });
    
    content += `## What would you like to do?\n\n`;
    content += `1. **Continue with active project** → Use \`get_next_task_forest\`\n`;
    content += `2. **Switch projects** → Use \`switch_project_forest\` + project name\n`;
    content += `3. **Create new project** → Use \`create_project_forest\` + your goal\n`;
    content += `4. **View project details** → Use \`get_hta_status_forest\`\n`;

    return {
      success: true,
      content: [{
        type: 'text',
        text: content
      }],
      has_projects: true,
      active_project: activeProject?.id
    };
  }

  /**
   * Simplified project creation - single command
   * @param {Object} params - Project parameters
   * @returns {Object} Project creation response
   */
  async createProjectSimplified(params) {
    try {
      // Extract the goal from various parameter formats
      const goal = params.goal || params.project_id || params.name || '';
      
      if (!goal || goal.trim().length < 5) {
        return {
          success: false,
          content: [{
            type: 'text',
            text: `## Please provide more detail about your goal

I need at least a brief description of what you want to achieve.

**Examples:**
- "Learn to play jazz piano"
- "Build a successful online business"
- "Transition to a career in data science"
- "Write and publish a novel"

Try again with: \`create_project_forest "your detailed goal here"\``
          }]
        };
      }

      // Generate a simple project ID from the goal
      const projectId = this.generateProjectId(goal);
      
      // Create minimal project structure
      const projectData = {
        project_id: projectId,
        goal: goal,
        context: params.context || `User wants to achieve: ${goal}`,
        life_structure_preferences: {
          focus_duration: params.focus_duration || 'flexible',
          wake_time: params.wake_time || '7:00 AM',
          sleep_time: params.sleep_time || '11:00 PM'
        }
      };

      // Use existing project management to create
      const result = await this.projectManagement.createProject(projectData);
      
      if (result.success) {
        // Immediately build HTA tree for the new project
        const htaResult = await this.htaCore.buildHTATree({
          goal: goal,
          context: projectData.context,
          learning_style: 'mixed'
        });

        return {
          success: true,
          content: [{
            type: 'text',
            text: `# ✅ Project Created Successfully!

**Project:** ${projectId}
**Goal:** ${goal}

## Your Strategic Learning Path:

${this.formatHTAPreview(htaResult)}

## Next Steps:

1. **Start learning now** → Use \`get_next_task_forest\`
2. **See full strategy** → Use \`get_hta_status_forest\`
3. **Plan your day** → Use \`generate_daily_schedule_forest\`

---
🎯 **Ready to begin?** Just ask for your next task!`
          }],
          project_id: projectId,
          hta_built: true
        };
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('[StreamlinedOnboarding] Project creation failed', { error: error.message });
      return {
        success: false,
        content: [{
          type: 'text',
          text: `## Oops! Something went wrong

${error.message}

**Try this instead:**
\`create_project_forest "your specific goal here"\`

Need help? Just ask: "How do I create a project?"`
        }]
      };
    }
  }

  /**
   * Format HTA preview for display
   * @param {Object} htaResult - HTA tree result
   * @returns {string} Formatted preview
   */
  formatHTAPreview(htaResult) {
    if (!htaResult || !htaResult.strategic_branches) {
      return 'Building your personalized learning strategy...';
    }

    let preview = '';
    const branches = htaResult.strategic_branches.slice(0, 3); // Show first 3
    
    branches.forEach((branch, index) => {
      preview += `**${index + 1}. ${branch.name}**\n`;
      preview += `${branch.description}\n`;
      if (branch.tasks && branch.tasks.length > 0) {
        preview += `First task: ${branch.tasks[0].title}\n`;
      }
      preview += '\n';
    });
    
    return preview;
  }

  /**
   * Generate simple project ID from goal
   * @param {string} goal - User's goal
   * @returns {string} Project ID
   */
  generateProjectId(goal) {
    const words = goal.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3);
    
    return words.join('_') || 'my_project';
  }

  /**
   * Get relative time string
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Relative time
   */
  getRelativeTime(timestamp) {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  }

  /**
   * Show error with recovery options
   * @param {Error} error - The error that occurred
   * @returns {Object} Error response with help
   */
  showErrorWithRecovery(error) {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `## Something went wrong

${error.message}

### Quick Recovery Options:

1. **View available commands** → Use \`get_landing_page_forest\`
2. **Check system status** → Use \`get_current_config\`
3. **Start fresh** → Use \`factory_reset_forest\` (careful - this deletes data!)

### Common Solutions:

- If you're trying to create a project: \`create_project_forest "your goal"\`
- If you want to see your projects: \`list_projects_forest\`
- If you need help: Just ask "How do I...?"`
      }]
    };
  }
}

// Helper function to detect user intent from natural language
export function detectUserIntent(input) {
  const normalized = input.toLowerCase();
  
  // Creation intents
  if (normalized.includes('create') || normalized.includes('new') || normalized.includes('start')) {
    return 'create';
  }
  
  // Navigation intents
  if (normalized.includes('next') || normalized.includes('task') || normalized.includes('what should')) {
    return 'next_task';
  }
  
  // Status intents
  if (normalized.includes('status') || normalized.includes('progress') || normalized.includes('how am i')) {
    return 'status';
  }
  
  // Help intents
  if (normalized.includes('help') || normalized.includes('how do') || normalized.includes('what can')) {
    return 'help';
  }
  
  return 'unknown';
}
