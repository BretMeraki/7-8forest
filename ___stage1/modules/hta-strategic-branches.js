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
    // Domain-adaptive phase definitions - no hardcoded names
    return {
      // AI/ML Domain
      mathematical_foundations: {
        name: 'Mathematical Foundations',
        description: 'Master mathematical concepts underlying AI/ML',
        focus: 'Linear algebra, calculus, statistics, probability',
        prerequisites: [],
        estimatedDuration: 0.25,
        keyActivities: ['study', 'practice', 'apply', 'verify'],
        successCriteria: 'Can work with mathematical concepts confidently'
      },
      algorithmic_understanding: {
        name: 'Algorithmic Understanding',
        description: 'Learn key algorithms and their applications',
        focus: 'Algorithm selection, implementation, optimization',
        prerequisites: ['mathematical_foundations'],
        estimatedDuration: 0.3,
        keyActivities: ['analyze', 'implement', 'compare', 'optimize'],
        successCriteria: 'Can select and implement appropriate algorithms'
      },
      
      // Cybersecurity Domain
      security_fundamentals: {
        name: 'Security Fundamentals',
        description: 'Learn core security principles and concepts',
        focus: 'Security principles, threat models, basic defense',
        prerequisites: [],
        estimatedDuration: 0.2,
        keyActivities: ['study', 'analyze', 'practice', 'assess'],
        successCriteria: 'Understands core security concepts and principles'
      },
      threat_analysis: {
        name: 'Threat Analysis',
        description: 'Understand and identify security threats',
        focus: 'Threat identification, vulnerability assessment, risk analysis',
        prerequisites: ['security_fundamentals'],
        estimatedDuration: 0.25,
        keyActivities: ['assess', 'analyze', 'document', 'prioritize'],
        successCriteria: 'Can identify and analyze security threats effectively'
      },
      
      // Programming Domain
      language_mastery: {
        name: 'Language Mastery',
        description: 'Master programming language syntax and concepts',
        focus: 'Syntax, idioms, best practices, tooling',
        prerequisites: [],
        estimatedDuration: 0.25,
        keyActivities: ['practice', 'code', 'review', 'refactor'],
        successCriteria: 'Can write clean, idiomatic code confidently'
      },
      problem_solving: {
        name: 'Problem-Solving Patterns',
        description: 'Learn common patterns and problem-solving approaches',
        focus: 'Design patterns, algorithms, debugging, optimization',
        prerequisites: ['language_mastery'],
        estimatedDuration: 0.3,
        keyActivities: ['solve', 'pattern-match', 'optimize', 'debug'],
        successCriteria: 'Can solve complex problems using appropriate patterns'
      },
      
      // Photography Domain
      camera_fundamentals: {
        name: 'Camera Fundamentals',
        description: 'Master camera settings and technical aspects',
        focus: 'Exposure, composition rules, camera operation',
        prerequisites: [],
        estimatedDuration: 0.2,
        keyActivities: ['practice', 'experiment', 'shoot', 'review'],
        successCriteria: 'Can operate camera confidently in various conditions'
      },
      creative_composition: {
        name: 'Creative Composition',
        description: 'Develop artistic eye and composition skills',
        focus: 'Composition techniques, visual storytelling, artistic vision',
        prerequisites: ['camera_fundamentals'],
        estimatedDuration: 0.25,
        keyActivities: ['compose', 'create', 'critique', 'refine'],
        successCriteria: 'Can create compelling, well-composed images'
      },
      
      // Generic adaptive phases
      foundations: {
        name: 'Foundations',
        description: 'Build essential knowledge and skills',
        focus: 'Core concepts, basic skills, fundamental understanding',
        prerequisites: [],
        estimatedDuration: 0.2,
        keyActivities: ['learn', 'practice', 'understand', 'apply'],
        successCriteria: 'Has solid foundation in core concepts'
      },
      application: {
        name: 'Application',
        description: 'Apply knowledge to practical scenarios',
        focus: 'Real-world application, problem solving, skill development',
        prerequisites: ['foundations'],
        estimatedDuration: 0.3,
        keyActivities: ['apply', 'solve', 'build', 'iterate'],
        successCriteria: 'Can apply knowledge to solve real problems'
      },
      mastery: {
        name: 'Mastery',
        description: 'Achieve advanced proficiency and innovation',
        focus: 'Advanced techniques, innovation, teaching others',
        prerequisites: ['application'],
        estimatedDuration: 0.2,
        keyActivities: ['innovate', 'teach', 'mentor', 'advance'],
        successCriteria: 'Can innovate and contribute to the field'
      }
    };
  }

  generateStrategicBranches(goal, complexity, userPreferences = {}) {
    const branches = {};
    
    // Select domain-specific phases based on goal analysis
    const phasesToInclude = this.selectDomainSpecificPhases(goal, complexity, userPreferences);
    
    for (const phaseKey of phasesToInclude) {
      const phaseDefinition = this.phaseDefinitions[phaseKey];
      
      if (phaseDefinition) {
        branches[phaseKey] = {
          id: `${phaseKey}_${Date.now()}`,
          name: this.customizePhaseNameForGoal(phaseDefinition.name, goal),
          description: this.customizePhaseDescriptionForGoal(phaseDefinition.description, goal),
          focus: this.customizePhaseFocus(phaseDefinition.focus, goal),
          phase: phaseKey,
          prerequisites: phaseDefinition.prerequisites,
          estimatedDuration: this.calculatePhaseDuration(phaseKey, complexity, userPreferences),
          keyActivities: phaseDefinition.keyActivities,
          successCriteria: this.customizeSuccessCriteria(phaseDefinition.successCriteria, goal),
          status: 'not_started',
          progress: 0,
          tasks: [],
          adaptations: [],
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          domain_adaptive: true
        };
      }
    }

    return this.optimizeBranchSequence(branches, goal, userPreferences);
  }

  selectDomainSpecificPhases(goal, complexity, userPreferences = {}) {
    const goalLower = goal.toLowerCase();
    
    // AI/ML domain detection
    if (/artificial intelligence|machine learning|neural network|deep learning|ai|ml|cnn|rnn|transformer/i.test(goalLower)) {
      return complexity <= 3 
        ? ['mathematical_foundations', 'algorithmic_understanding', 'application']
        : ['mathematical_foundations', 'algorithmic_understanding', 'application', 'mastery'];
    }
    
    // Cybersecurity domain detection
    if (/cybersecurity|security|penetration|vulnerability|hacking|encryption|firewall/i.test(goalLower)) {
      return complexity <= 3
        ? ['security_fundamentals', 'threat_analysis', 'application']
        : ['security_fundamentals', 'threat_analysis', 'application', 'mastery'];
    }
    
    // Programming domain detection
    if (/programming|coding|development|software|javascript|python|java|react|node/i.test(goalLower)) {
      return complexity <= 3
        ? ['language_mastery', 'problem_solving', 'application']
        : ['language_mastery', 'problem_solving', 'application', 'mastery'];
    }
    
    // Photography domain detection
    if (/photography|photo|camera|lens|composition|lighting/i.test(goalLower)) {
      return complexity <= 3
        ? ['camera_fundamentals', 'creative_composition', 'application']
        : ['camera_fundamentals', 'creative_composition', 'application', 'mastery'];
    }
    
    // Default adaptive approach for other domains
    return complexity <= 3
      ? ['foundations', 'application']
      : ['foundations', 'application', 'mastery'];
  }

  customizePhaseNameForGoal(baseName, goal) {
    // Keep domain-specific names but make them more contextual
    const goalContext = this.extractMainContext(goal);
    
    if (baseName === 'Foundations') {
      return `${goalContext} Foundations`;
    } else if (baseName === 'Application') {
      return `${goalContext} Application`;
    } else if (baseName === 'Mastery') {
      return `${goalContext} Mastery`;
    }
    
    return baseName; // Keep domain-specific names as-is
  }

  customizePhaseDescriptionForGoal(baseDescription, goal) {
    return baseDescription.replace(/domain/g, goal).replace(/field/g, goal);
  }

  customizePhaseFocus(baseFocus, goal) {
    return baseFocus.replace(/domain/g, goal);
  }

  customizeSuccessCriteria(baseCriteria, goal) {
    return baseCriteria.replace(/domain/g, goal).replace(/field/g, goal);
  }

  extractMainContext(goal) {
    const words = goal.split(' ');
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !['learn', 'master', 'understand', 'study', 'with', 'using', 'through'].includes(word.toLowerCase())
    );
    
    if (importantWords.length > 0) {
      return importantWords[0].charAt(0).toUpperCase() + importantWords[0].slice(1);
    }
    
    return 'Skill';
  }

  selectPhasesForComplexity(complexity, userPreferences = {}) {
    // This method is deprecated - use selectDomainSpecificPhases instead
    console.warn('selectPhasesForComplexity is deprecated. Use selectDomainSpecificPhases for domain-adaptive phase selection.');
    return this.selectDomainSpecificPhases('general skill', complexity, userPreferences);
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
