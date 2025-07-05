/**
 * HTA Strategic Branch Management Module
 * Handles strategic phases, branch operations, and phase transitions
 */

import { CONSTANTS } from './constants.js';

export class HTAStrategicBranches {
  constructor() {
    this.phaseDefinitions = this.initializePhaseDefinitions();
  }

  initializePhaseDefinitions() {
    return {
      foundation: {
        name: 'Foundation',
        description: 'Establish core understanding and fundamental skills',
        focus: 'Understanding basics, setting up environment, learning prerequisites',
        prerequisites: [],
        estimatedDuration: 0.2, // 20% of total time
        keyActivities: ['research', 'setup', 'fundamentals', 'orientation'],
        successCriteria: 'Can articulate basic concepts and have proper tools setup'
      },
      research: {
        name: 'Research',
        description: 'Deep dive into domain knowledge and best practices',
        focus: 'Gathering information, understanding ecosystem, studying examples',
        prerequisites: ['foundation'],
        estimatedDuration: 0.25, // 25% of total time
        keyActivities: ['study', 'analyze', 'compare', 'document'],
        successCriteria: 'Has comprehensive understanding of domain and approaches'
      },
      capability: {
        name: 'Capability',
        description: 'Build practical skills through hands-on practice',
        focus: 'Skills development, practice exercises, building competency',
        prerequisites: ['foundation', 'research'],
        estimatedDuration: 0.3, // 30% of total time
        keyActivities: ['practice', 'build', 'experiment', 'refine'],
        successCriteria: 'Can execute core skills with confidence'
      },
      implementation: {
        name: 'Implementation',
        description: 'Apply skills to real-world projects and challenges',
        focus: 'Building actual projects, solving real problems',
        prerequisites: ['foundation', 'research', 'capability'],
        estimatedDuration: 0.2, // 20% of total time
        keyActivities: ['create', 'deploy', 'iterate', 'optimize'],
        successCriteria: 'Has completed meaningful projects demonstrating skill'
      },
      mastery: {
        name: 'Mastery',
        description: 'Advanced techniques and continuous improvement',
        focus: 'Advanced concepts, optimization, teaching others',
        prerequisites: ['foundation', 'research', 'capability', 'implementation'],
        estimatedDuration: 0.05, // 5% of total time (ongoing)
        keyActivities: ['innovate', 'teach', 'mentor', 'advance'],
        successCriteria: 'Can teach others and innovate within the domain'
      }
    };
  }

  generateStrategicBranches(goal, complexity, userPreferences = {}) {
    const branches = {};
    const totalComplexity = complexity;
    
    // Adjust phase selection based on complexity
    const phasesToInclude = this.selectPhasesForComplexity(complexity, userPreferences);
    
    for (const phaseKey of phasesToInclude) {
      const phaseDefinition = this.phaseDefinitions[phaseKey];
      
      branches[phaseKey] = {
        id: `${phaseKey}_${Date.now()}`,
        name: phaseDefinition.name,
        description: phaseDefinition.description,
        focus: phaseDefinition.focus,
        phase: phaseKey,
        prerequisites: phaseDefinition.prerequisites,
        estimatedDuration: this.calculatePhaseDuration(phaseKey, complexity, userPreferences),
        keyActivities: phaseDefinition.keyActivities,
        successCriteria: phaseDefinition.successCriteria,
        status: 'not_started',
        progress: 0,
        tasks: [],
        adaptations: [],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    }

    return this.optimizeBranchSequence(branches, goal, userPreferences);
  }

  selectPhasesForComplexity(complexity, userPreferences = {}) {
    const allPhases = ['foundation', 'research', 'capability', 'implementation', 'mastery'];
    
    // For very simple goals (complexity 1-2), might skip research
    if (complexity <= 2 && userPreferences.skipResearch) {
      return ['foundation', 'capability', 'implementation'];
    }
    
    // For very complex goals (complexity 8+), ensure all phases
    if (complexity >= 8) {
      return allPhases;
    }
    
    // Standard flow for most goals
    return allPhases;
  }

  calculatePhaseDuration(phase, complexity, userPreferences = {}) {
    const baseDefinition = this.phaseDefinitions[phase];
    let duration = baseDefinition.estimatedDuration;
    
    // Adjust based on complexity
    if (complexity >= 8) {
      duration *= 1.2; // 20% longer for complex goals
    } else if (complexity <= 3) {
      duration *= 0.8; // 20% shorter for simple goals
    }
    
    // Adjust based on user preferences
    if (userPreferences.learningStyle === 'research-heavy' && phase === 'research') {
      duration *= 1.3;
    } else if (userPreferences.learningStyle === 'hands-on' && phase === 'capability') {
      duration *= 1.3;
    }
    
    return Math.max(0.05, Math.min(0.5, duration)); // Clamp between 5% and 50%
  }

  optimizeBranchSequence(branches, goal, userPreferences = {}) {
    // Add cross-branch dependencies and optimizations
    const branchKeys = Object.keys(branches);
    
    for (let i = 0; i < branchKeys.length; i++) {
      const currentBranch = branches[branchKeys[i]];
      
      // Add dependencies to previous phases
      if (i > 0) {
        const previousPhases = branchKeys.slice(0, i);
        currentBranch.prerequisites = [...new Set([...currentBranch.prerequisites, ...previousPhases])];
      }
      
      // Add optimization suggestions
      currentBranch.optimizations = this.generatePhaseOptimizations(currentBranch, goal, userPreferences);
    }
    
    return branches;
  }

  generatePhaseOptimizations(branch, goal, userPreferences = {}) {
    const optimizations = [];
    
    switch (branch.phase) {
      case 'foundation':
        optimizations.push({
          type: 'parallel_setup',
          description: 'Set up development environment while studying theory',
          impact: 'time_saving'
        });
        break;
        
      case 'research':
        optimizations.push({
          type: 'focused_research',
          description: 'Focus research on directly applicable knowledge',
          impact: 'relevance'
        });
        break;
        
      case 'capability':
        optimizations.push({
          type: 'incremental_building',
          description: 'Build skills incrementally through small projects',
          impact: 'retention'
        });
        break;
        
      case 'implementation':
        optimizations.push({
          type: 'real_world_projects',
          description: 'Focus on projects that align with end goals',
          impact: 'motivation'
        });
        break;
        
      case 'mastery':
        optimizations.push({
          type: 'teaching_others',
          description: 'Teach concepts to solidify understanding',
          impact: 'retention'
        });
        break;
    }
    
    return optimizations;
  }

  evolveBranch(branch, evolutionData) {
    const evolution = {
      timestamp: new Date().toISOString(),
      type: evolutionData.type || 'progress_update',
      changes: {},
      reason: evolutionData.reason || 'User feedback'
    };
    
    switch (evolutionData.type) {
      case 'accelerate':
        // User is progressing faster than expected
        evolution.changes.estimatedDuration = branch.estimatedDuration * 0.8;
        evolution.changes.difficulty = Math.min(10, (branch.difficulty || 5) + 1);
        break;
        
      case 'decelerate':
        // User needs more time or simpler tasks
        evolution.changes.estimatedDuration = branch.estimatedDuration * 1.2;
        evolution.changes.difficulty = Math.max(1, (branch.difficulty || 5) - 1);
        break;
        
      case 'refocus':
        // Change focus based on user interests or external factors
        evolution.changes.focus = evolutionData.newFocus;
        evolution.changes.keyActivities = evolutionData.newActivities || branch.keyActivities;
        break;
        
      case 'expand':
        // Add new elements to the branch
        evolution.changes.additionalTasks = evolutionData.newTasks || [];
        evolution.changes.expandedScope = evolutionData.scopeChanges;
        break;
    }
    
    // Apply changes to branch
    Object.assign(branch, evolution.changes);
    
    // Add evolution to history
    if (!branch.adaptations) {
      branch.adaptations = [];
    }
    branch.adaptations.push(evolution);
    
    branch.lastModified = new Date().toISOString();
    
    return branch;
  }

  calculateBranchProgress(branch) {
    if (!branch.tasks || branch.tasks.length === 0) {
      return 0;
    }
    
    const completedTasks = branch.tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / branch.tasks.length) * 100);
  }

  getNextPhase(currentPhase, branches) {
    const phaseOrder = ['foundation', 'research', 'capability', 'implementation', 'mastery'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return null; // No next phase
    }
    
    const nextPhaseKey = phaseOrder[currentIndex + 1];
    return branches[nextPhaseKey] || null;
  }

  canProgressToPhase(targetPhase, branches) {
    const targetBranch = branches[targetPhase];
    if (!targetBranch) {
      return { canProgress: false, reason: 'Phase not found' };
    }
    
    // Check if all prerequisites are completed
    for (const prereq of targetBranch.prerequisites) {
      const prereqBranch = branches[prereq];
      if (!prereqBranch) {
        return { canProgress: false, reason: `Prerequisite ${prereq} not found` };
      }
      
      if (prereqBranch.status !== 'completed') {
        return { canProgress: false, reason: `Prerequisite ${prereq} not completed` };
      }
    }
    
    return { canProgress: true };
  }

  generateBranchSummary(branches) {
    const summary = {
      totalPhases: Object.keys(branches).length,
      completedPhases: 0,
      currentPhase: null,
      overallProgress: 0,
      estimatedTimeRemaining: 0,
      phaseDetails: {}
    };
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    for (const [phaseKey, branch] of Object.entries(branches)) {
      const branchProgress = this.calculateBranchProgress(branch);
      
      summary.phaseDetails[phaseKey] = {
        name: branch.name,
        status: branch.status,
        progress: branchProgress,
        tasks: branch.tasks?.length || 0,
        completedTasks: branch.tasks?.filter(t => t.status === 'completed').length || 0
      };
      
      if (branch.status === 'completed') {
        summary.completedPhases++;
      } else if (branch.status === 'in_progress' && !summary.currentPhase) {
        summary.currentPhase = phaseKey;
      }
      
      totalTasks += branch.tasks?.length || 0;
      completedTasks += branch.tasks?.filter(t => t.status === 'completed').length || 0;
    }
    
    summary.overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return summary;
  }
}
