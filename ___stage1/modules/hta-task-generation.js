/**
 * HTA Task Generation Engine Module
 * Handles creation, validation, and management of granular tasks within strategic branches
 */

import { CONSTANTS } from './constants.js';

export class HTATaskGeneration {
  constructor() {
    this.taskTemplates = this.initializeTaskTemplates();
    this.difficultyScales = this.initializeDifficultyScales();
  }

  initializeTaskTemplates() {
    return {
      foundation: {
        research: {
          name: 'Research {topic}',
          description: 'Study and understand {topic} fundamentals',
          estimatedDuration: 30, // minutes
          difficulty: 2,
          type: 'research',
          deliverable: 'Notes and understanding of {topic}',
          successCriteria: 'Can explain {topic} concepts clearly'
        },
        setup: {
          name: 'Set up {tool}',
          description: 'Install and configure {tool} for development',
          estimatedDuration: 45,
          difficulty: 3,
          type: 'setup',
          deliverable: 'Working {tool} installation',
          successCriteria: '{tool} is installed and functional'
        },
        orientation: {
          name: 'Explore {domain} ecosystem',
          description: 'Get familiar with {domain} tools, communities, and resources',
          estimatedDuration: 60,
          difficulty: 2,
          type: 'exploration',
          deliverable: 'List of key {domain} resources',
          successCriteria: 'Understands {domain} landscape'
        }
      },
      research: {
        study: {
          name: 'Deep dive into {concept}',
          description: 'Comprehensive study of {concept} including examples and use cases',
          estimatedDuration: 90,
          difficulty: 4,
          type: 'study',
          deliverable: 'Detailed notes on {concept}',
          successCriteria: 'Can apply {concept} knowledge'
        },
        analyze: {
          name: 'Analyze {example}',
          description: 'Examine and understand how {example} works',
          estimatedDuration: 60,
          difficulty: 3,
          type: 'analysis',
          deliverable: 'Analysis report of {example}',
          successCriteria: 'Understands {example} structure and logic'
        },
        compare: {
          name: 'Compare {options}',
          description: 'Evaluate different {options} and their trade-offs',
          estimatedDuration: 75,
          difficulty: 4,
          type: 'comparison',
          deliverable: 'Comparison matrix of {options}',
          successCriteria: 'Can choose appropriate {options} for different scenarios'
        }
      },
      capability: {
        practice: {
          name: 'Practice {skill}',
          description: 'Hands-on practice of {skill} through exercises',
          estimatedDuration: 120,
          difficulty: 5,
          type: 'practice',
          deliverable: 'Completed {skill} exercises',
          successCriteria: 'Can perform {skill} reliably'
        },
        build: {
          name: 'Build {component}',
          description: 'Create {component} from scratch',
          estimatedDuration: 180,
          difficulty: 6,
          type: 'creation',
          deliverable: 'Working {component}',
          successCriteria: '{component} functions as expected'
        },
        experiment: {
          name: 'Experiment with {feature}',
          description: 'Try different approaches to implementing {feature}',
          estimatedDuration: 90,
          difficulty: 5,
          type: 'experimentation',
          deliverable: 'Multiple {feature} implementations',
          successCriteria: 'Understands different approaches to {feature}'
        }
      },
      implementation: {
        create: {
          name: 'Create {project}',
          description: 'Build complete {project} from requirements to deployment',
          estimatedDuration: 480, // 8 hours
          difficulty: 7,
          type: 'project',
          deliverable: 'Complete {project}',
          successCriteria: '{project} meets all requirements'
        },
        deploy: {
          name: 'Deploy {application}',
          description: 'Set up production deployment for {application}',
          estimatedDuration: 120,
          difficulty: 6,
          type: 'deployment',
          deliverable: 'Live {application}',
          successCriteria: '{application} is accessible and functional'
        },
        optimize: {
          name: 'Optimize {system}',
          description: 'Improve performance and efficiency of {system}',
          estimatedDuration: 240,
          difficulty: 7,
          type: 'optimization',
          deliverable: 'Optimized {system}',
          successCriteria: '{system} shows measurable improvements'
        }
      },
      mastery: {
        innovate: {
          name: 'Innovate {solution}',
          description: 'Create novel approach to {solution}',
          estimatedDuration: 360,
          difficulty: 9,
          type: 'innovation',
          deliverable: 'Novel {solution}',
          successCriteria: '{solution} demonstrates creativity and effectiveness'
        },
        teach: {
          name: 'Teach {topic}',
          description: 'Create educational content about {topic}',
          estimatedDuration: 180,
          difficulty: 8,
          type: 'teaching',
          deliverable: 'Educational material on {topic}',
          successCriteria: 'Others can learn {topic} from the material'
        },
        mentor: {
          name: 'Mentor {learner}',
          description: 'Guide someone learning {domain}',
          estimatedDuration: 240,
          difficulty: 8,
          type: 'mentoring',
          deliverable: 'Successful mentoring relationship',
          successCriteria: '{learner} shows improved skills'
        }
      }
    };
  }

  initializeDifficultyScales() {
    return {
      1: { name: 'Trivial', description: 'Can be done in a few minutes with minimal thought' },
      2: { name: 'Easy', description: 'Straightforward task requiring basic attention' },
      3: { name: 'Simple', description: 'Requires some focus but uses familiar concepts' },
      4: { name: 'Moderate', description: 'Needs concentration and may involve new concepts' },
      5: { name: 'Challenging', description: 'Requires significant effort and problem-solving' },
      6: { name: 'Complex', description: 'Involves multiple components and careful planning' },
      7: { name: 'Advanced', description: 'Requires deep understanding and synthesis' },
      8: { name: 'Expert', description: 'Demands expertise and innovative thinking' },
      9: { name: 'Master', description: 'Pushes boundaries of current knowledge' },
      10: { name: 'Legendary', description: 'Groundbreaking work that advances the field' }
    };
  }

  generateTasksForBranch(branch, goal, userContext = {}) {
    const tasks = [];
    const phaseTemplates = this.taskTemplates[branch.phase] || {};
    
    // Determine number of tasks based on branch complexity and duration
    const numTasks = this.calculateOptimalTaskCount(branch, userContext);
    
    // Generate contextual parameters for this branch
    const contextParams = this.generateContextualParameters(branch, goal);
    
    // Create tasks based on phase activities
    for (let i = 0; i < numTasks; i++) {
      const taskType = this.selectTaskType(branch, i, numTasks, userContext);
      const template = phaseTemplates[taskType];
      
      if (template) {
        const task = this.createTaskFromTemplate(template, contextParams, branch, i);
        tasks.push(task);
      }
    }
    
    // Ensure task progression and dependencies
    this.establishTaskDependencies(tasks);
    
    // Validate and adjust task difficulty progression
    this.adjustTaskDifficultyProgression(tasks, userContext);
    
    return tasks;
  }

  calculateOptimalTaskCount(branch, userContext) {
    const baseTasks = {
      foundation: 4,
      research: 5,
      capability: 6,
      implementation: 4,
      mastery: 3
    };
    
    let count = baseTasks[branch.phase] || 4;
    
    // Adjust based on estimated duration
    if (branch.estimatedDuration > 0.3) {
      count += 2; // More tasks for longer phases
    } else if (branch.estimatedDuration < 0.15) {
      count = Math.max(2, count - 1); // Fewer tasks for shorter phases
    }
    
    // Adjust based on user preferences
    if (userContext.preferGranularity === 'high') {
      count += 2;
    } else if (userContext.preferGranularity === 'low') {
      count = Math.max(2, count - 1);
    }
    
    return Math.min(10, Math.max(2, count)); // Clamp between 2-10 tasks
  }

  generateContextualParameters(branch, goal) {
    const params = {
      domain: this.extractDomain(goal),
      tools: this.extractTools(goal),
      concepts: this.extractConcepts(branch, goal),
      examples: this.generateExamples(branch, goal),
      skills: this.extractSkills(branch, goal)
    };
    
    return params;
  }

  extractDomain(goal) {
    // Simple domain extraction based on keywords
    const domains = {
      'photography': ['camera', 'lighting', 'composition', 'editing'],
      'programming': ['code', 'development', 'software', 'app'],
      'music': ['instrument', 'composition', 'recording', 'performance'],
      'design': ['visual', 'ui', 'ux', 'graphic', 'layout'],
      'business': ['marketing', 'sales', 'strategy', 'management']
    };
    
    const goalLower = goal.toLowerCase();
    
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => goalLower.includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  extractTools(goal) {
    const commonTools = {
      photography: ['camera', 'Lightroom', 'Photoshop', 'tripod'],
      programming: ['VS Code', 'Git', 'Node.js', 'database'],
      music: ['DAW', 'microphone', 'MIDI controller', 'audio interface'],
      design: ['Figma', 'Adobe Creative Suite', 'Sketch', 'InVision'],
      business: ['spreadsheet', 'CRM', 'analytics', 'presentation software']
    };
    
    const domain = this.extractDomain(goal);
    return commonTools[domain] || ['computer', 'internet', 'notebook'];
  }

  extractConcepts(branch, goal) {
    const conceptsByPhase = {
      foundation: ['basics', 'fundamentals', 'principles', 'terminology'],
      research: ['best practices', 'methodologies', 'case studies', 'industry standards'],
      capability: ['techniques', 'workflows', 'processes', 'skills'],
      implementation: ['projects', 'applications', 'solutions', 'deliverables'],
      mastery: ['advanced techniques', 'innovation', 'leadership', 'expertise']
    };
    
    return conceptsByPhase[branch.phase] || ['general concepts'];
  }

  generateExamples(branch, goal) {
    const domain = this.extractDomain(goal);
    const examplesByDomain = {
      photography: ['portrait session', 'landscape shot', 'street photography', 'product photo'],
      programming: ['web application', 'mobile app', 'API service', 'data analysis'],
      music: ['song composition', 'album recording', 'live performance', 'remix'],
      design: ['website design', 'mobile interface', 'brand identity', 'user journey'],
      business: ['marketing campaign', 'sales process', 'business plan', 'product launch']
    };
    
    return examplesByDomain[domain] || ['sample project', 'case study', 'example implementation'];
  }

  extractSkills(branch, goal) {
    const skillsByPhase = {
      foundation: ['reading', 'note-taking', 'basic operation', 'setup'],
      research: ['analysis', 'comparison', 'documentation', 'synthesis'],
      capability: ['practice', 'implementation', 'troubleshooting', 'refinement'],
      implementation: ['project management', 'integration', 'testing', 'deployment'],
      mastery: ['innovation', 'teaching', 'mentoring', 'leadership']
    };
    
    return skillsByPhase[branch.phase] || ['general skills'];
  }

  selectTaskType(branch, taskIndex, totalTasks, userContext) {
    const phaseActivities = {
      foundation: ['research', 'setup', 'orientation'],
      research: ['study', 'analyze', 'compare'],
      capability: ['practice', 'build', 'experiment'],
      implementation: ['create', 'deploy', 'optimize'],
      mastery: ['innovate', 'teach', 'mentor']
    };
    
    const activities = phaseActivities[branch.phase] || ['research'];
    
    // Distribute task types evenly across the phase
    const typeIndex = taskIndex % activities.length;
    return activities[typeIndex];
  }

  createTaskFromTemplate(template, contextParams, branch, taskIndex) {
    // Select appropriate context values
    const selectedConcept = contextParams.concepts[taskIndex % contextParams.concepts.length];
    const selectedTool = contextParams.tools[taskIndex % contextParams.tools.length];
    const selectedExample = contextParams.examples[taskIndex % contextParams.examples.length];
    const selectedSkill = contextParams.skills[taskIndex % contextParams.skills.length];
    
    // Replace template variables
    let name = template.name;
    let description = template.description;
    let deliverable = template.deliverable;
    let successCriteria = template.successCriteria;
    
    // Simple template replacement
    const replacements = {
      '{topic}': selectedConcept,
      '{tool}': selectedTool,
      '{domain}': contextParams.domain,
      '{concept}': selectedConcept,
      '{example}': selectedExample,
      '{skill}': selectedSkill,
      '{component}': `${selectedConcept} component`,
      '{feature}': `${selectedConcept} feature`,
      '{project}': `${contextParams.domain} project`,
      '{application}': `${contextParams.domain} application`,
      '{system}': `${contextParams.domain} system`,
      '{solution}': `${selectedConcept} solution`,
      '{learner}': `${contextParams.domain} learner`,
      '{options}': `${selectedConcept} options`
    };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      name = name.replace(new RegExp(placeholder, 'g'), value);
      description = description.replace(new RegExp(placeholder, 'g'), value);
      deliverable = deliverable.replace(new RegExp(placeholder, 'g'), value);
      successCriteria = successCriteria.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return {
      id: `task_${branch.phase}_${Date.now()}_${taskIndex}`,
      name: name,
      description: description,
      type: template.type,
      difficulty: template.difficulty,
      estimatedDuration: template.estimatedDuration,
      deliverable: deliverable,
      successCriteria: successCriteria,
      status: 'not_started',
      progress: 0,
      phase: branch.phase,
      branchId: branch.id,
      dependencies: [],
      prerequisites: [],
      resources: [],
      notes: [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  establishTaskDependencies(tasks) {
    // Create logical dependencies between tasks
    for (let i = 1; i < tasks.length; i++) {
      const currentTask = tasks[i];
      const previousTask = tasks[i - 1];
      
      // Sequential dependency on previous task
      currentTask.dependencies.push(previousTask.id);
      
      // Additional dependencies based on task types
      if (currentTask.type === 'practice' || currentTask.type === 'build') {
        // Practice and build tasks depend on research/study tasks
        const researchTasks = tasks.slice(0, i).filter(t => 
          t.type === 'research' || t.type === 'study' || t.type === 'analysis'
        );
        researchTasks.forEach(researchTask => {
          if (!currentTask.dependencies.includes(researchTask.id)) {
            currentTask.dependencies.push(researchTask.id);
          }
        });
      }
    }
  }

  adjustTaskDifficultyProgression(tasks, userContext) {
    // Ensure smooth difficulty progression
    let targetDifficulty = userContext.startingDifficulty || 2;
    const difficultyIncrement = (8 - targetDifficulty) / Math.max(1, tasks.length - 1);
    
    tasks.forEach((task, index) => {
      // Adjust difficulty to follow progression
      const adjustedDifficulty = Math.round(targetDifficulty + (index * difficultyIncrement));
      task.difficulty = Math.max(1, Math.min(10, adjustedDifficulty));
      
      // Adjust duration based on difficulty
      const difficultyMultiplier = 1 + ((task.difficulty - 5) * 0.1);
      task.estimatedDuration = Math.round(task.estimatedDuration * difficultyMultiplier);
    });
  }

  generateMicroTasks(task, granularityLevel = 'medium') {
    const microTasks = [];
    
    if (granularityLevel === 'high' || task.difficulty >= 6) {
      // Break down complex tasks into micro-tasks
      const microTaskCount = Math.min(5, Math.max(2, Math.floor(task.difficulty / 2)));
      
      for (let i = 0; i < microTaskCount; i++) {
        const microTask = {
          id: `micro_${task.id}_${i}`,
          parentTaskId: task.id,
          name: `${task.name} - Step ${i + 1}`,
          description: this.generateMicroTaskDescription(task, i, microTaskCount),
          estimatedDuration: Math.round(task.estimatedDuration / microTaskCount),
          difficulty: Math.max(1, task.difficulty - 2),
          status: 'not_started',
          progress: 0,
          created: new Date().toISOString()
        };
        
        microTasks.push(microTask);
      }
    }
    
    return microTasks;
  }

  generateMicroTaskDescription(parentTask, stepIndex, totalSteps) {
    const stepDescriptions = {
      0: 'Prepare and set up for the task',
      1: 'Begin primary implementation',
      2: 'Complete core functionality',
      3: 'Test and validate results',
      4: 'Review and finalize output'
    };
    
    const baseDescription = stepDescriptions[stepIndex] || `Complete step ${stepIndex + 1}`;
    return `${baseDescription} for ${parentTask.name.toLowerCase()}`;
  }

  validateTaskSequence(tasks) {
    const issues = [];
    
    // Check for circular dependencies
    const dependencyGraph = new Map();
    tasks.forEach(task => {
      dependencyGraph.set(task.id, task.dependencies || []);
    });
    
    // Simple cycle detection
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (taskId) => {
      if (recursionStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const dependencies = dependencyGraph.get(taskId) || [];
      for (const depId of dependencies) {
        if (hasCycle(depId)) return true;
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    for (const task of tasks) {
      if (hasCycle(task.id)) {
        issues.push({
          type: 'circular_dependency',
          taskId: task.id,
          message: 'Task has circular dependency'
        });
      }
    }
    
    // Check difficulty progression
    for (let i = 1; i < tasks.length; i++) {
      const difficultyJump = tasks[i].difficulty - tasks[i - 1].difficulty;
      if (difficultyJump > 3) {
        issues.push({
          type: 'difficulty_jump',
          taskId: tasks[i].id,
          message: 'Difficulty increases too rapidly'
        });
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  estimateTaskDuration(task, userContext = {}) {
    let duration = task.estimatedDuration;
    
    // Adjust based on user experience level
    if (userContext.experienceLevel === 'beginner') {
      duration *= 1.5;
    } else if (userContext.experienceLevel === 'expert') {
      duration *= 0.7;
    }
    
    // Adjust based on available time blocks
    if (userContext.availableTimeBlocks) {
      const maxBlock = Math.max(...userContext.availableTimeBlocks);
      if (duration > maxBlock) {
        // Suggest breaking into smaller tasks
        task.suggestBreakdown = true;
        task.recommendedSessions = Math.ceil(duration / maxBlock);
      }
    }
    
    return Math.round(duration);
  }
}
