/**
 * Simple Onboarding Handler
 * Implements the streamlined create_project_forest flow
 * No multi-step processes, no session tracking, just simple project creation
 */

import { logger } from '../../modules/utils/logger.js';

export class SimpleOnboardingHandler {
  constructor(projectManagement, htaCore, dataPersistence) {
    this.projectManagement = projectManagement;
    this.htaCore = htaCore;
    this.dataPersistence = dataPersistence;
    this.logger = logger;
  }

  /**
   * Handle create_project_forest with automatic HTA generation
   * This is the ONLY onboarding method - no complex flows
   */
  async createProject(params) {
    try {
      // Validate goal
      const goal = params.goal || '';
      if (!goal || goal.trim().length < 5) {
        return this.showGoalHelp();
      }

      // Generate or use provided project ID
      const projectId = params.project_id || this.generateProjectId(goal);
      
      // Check if project already exists
      const existingProjects = await this.projectManagement.listProjects();
      const exists = existingProjects.some(p => p.id === projectId);
      
      if (exists) {
        return this.showProjectExistsError(projectId);
      }

      // Create project with minimal required data
      const projectData = {
        id: projectId,
        name: projectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        goal: goal,
        context: params.context || `User wants to achieve: ${goal}`,
        created_at: new Date().toISOString(),
        is_active: true,
        learning_paths: [],
        progress: {
          completed_tasks: 0,
          total_tasks: 0,
          current_phase: 'foundation'
        }
      };

      // Save project
      await this.dataPersistence.saveProjectData(projectId, projectData);
      
      // Set as active project
      await this.projectManagement.setActiveProject(projectId);

      // Build HTA tree immediately
      const htaResult = await this.htaCore.buildHTATree({
        goal: goal,
        context: projectData.context,
        learning_style: params.learning_style || 'mixed',
        constraints: params.constraints || {}
      });

      // Save HTA data
      if (htaResult && htaResult.strategic_branches) {
        await this.dataPersistence.savePathData(projectId, 'main', {
          hta_tree: htaResult,
          created_at: new Date().toISOString()
        });
      }

      // Return success with clear next steps
      return {
        success: true,
        content: [{
          type: 'text',
          text: `# ✅ Project Created Successfully!

**Project:** ${projectData.name}
**Goal:** ${goal}

## Your Learning Strategy is Ready!

${this.formatHTAPreview(htaResult)}

## What's Next?

**Start immediately:** \`get_next_task_forest\`

This will give you your first task based on your current energy and available time.

## Other Actions:
- **See full strategy:** \`get_hta_status_forest\`
- **Plan your day:** \`generate_daily_schedule_forest\`
- **Check progress:** \`current_status_forest\`

---
🎯 **Pro tip:** The system adapts as you learn. Complete tasks and provide feedback to evolve your strategy!`
        }],
        project_created: true,
        project_id: projectId,
        hta_generated: true
      };

    } catch (error) {
      this.logger.error('[SimpleOnboarding] Create project failed', { error: error.message });
      return this.showErrorMessage(error);
    }
  }

  /**
   * Show help when goal is missing or too short
   */
  showGoalHelp() {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `# 📝 Tell Me Your Goal

I need to know what you want to achieve to create your personalized learning strategy.

## Examples of Good Goals:

**🎵 Creative:**
- "Learn to play jazz piano"
- "Write and publish a novel"
- "Build a YouTube channel about cooking"

**💼 Career:**
- "Become a full-stack developer"
- "Transition to data science"
- "Start a freelance design business"

**🏃 Personal:**
- "Run a marathon"
- "Learn Spanish for travel"
- "Develop a meditation practice"

## How to Create Your Project:

\`\`\`
create_project_forest "your specific goal here"
\`\`\`

**Tips:**
- Be specific about what success looks like
- Include why this matters to you
- Think about what you want to be able to do

What would you like to achieve?`
      }]
    };
  }

  /**
   * Show error when project already exists
   */
  showProjectExistsError(projectId) {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `# Project Already Exists

A project with ID "${projectId}" already exists.

## Your Options:

1. **Switch to existing project:**
   \`\`\`
   switch_project_forest "${projectId}"
   \`\`\`

2. **See all your projects:**
   \`\`\`
   list_projects_forest
   \`\`\`

3. **Create with different name:**
   \`\`\`
   create_project_forest "your goal" --project_id "unique_name"
   \`\`\`

4. **Delete and recreate (careful!):**
   \`\`\`
   factory_reset_forest --project_id "${projectId}" --confirm_deletion true
   \`\`\``
      }]
    };
  }

  /**
   * Show generic error message
   */
  showErrorMessage(error) {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `# Something Went Wrong

${error.message}

## Let's Try Again:

1. **Simple project creation:**
   \`\`\`
   create_project_forest "your goal"
   \`\`\`

2. **Check system status:**
   \`\`\`
   get_current_config
   \`\`\`

3. **Get help:**
   \`\`\`
   get_landing_page_forest
   \`\`\`

If the problem persists, try restarting the Forest server.`
      }]
    };
  }

  /**
   * Format HTA preview for display
   */
  formatHTAPreview(htaResult) {
    if (!htaResult || !htaResult.strategic_branches) {
      return '*Building your personalized strategy...*';
    }

    const branches = htaResult.strategic_branches.slice(0, 3);
    let preview = '';

    branches.forEach((branch, index) => {
      preview += `### ${index + 1}. ${branch.name}\n`;
      preview += `*${branch.description}*\n\n`;
      
      if (branch.tasks && branch.tasks.length > 0) {
        const task = branch.tasks[0];
        preview += `**First Task:** ${task.title}\n`;
        preview += `- Duration: ${task.duration || '30 minutes'}\n`;
        preview += `- Difficulty: ${this.getDifficultyStars(task.difficulty)}\n\n`;
      }
    });

    return preview;
  }

  /**
   * Generate simple project ID from goal
   */
  generateProjectId(goal) {
    const words = goal.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3);
    
    const base = words.join('_') || 'project';
    return `${base}_${Date.now().toString(36).slice(-4)}`;
  }

  /**
   * Get difficulty stars display
   */
  getDifficultyStars(difficulty) {
    const level = difficulty || 1;
    return '⭐'.repeat(Math.min(5, Math.max(1, level)));
  }
}
