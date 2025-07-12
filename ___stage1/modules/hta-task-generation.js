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
      // Phase-specific task templates
      foundation: {
        research: {
          name: 'Research {topic} fundamentals',
          description: 'Study and understand the basic concepts of {topic}',
          type: 'research',
          difficulty: 2,
          estimatedDuration: 45,
          deliverable: 'Research notes on {topic}',
          successCriteria: 'Can explain key concepts of {topic}'
        },
        practice: {
          name: 'Practice {topic} basics',
          description: 'Apply basic {topic} concepts through hands-on exercises',
          type: 'practice',
          difficulty: 3,
          estimatedDuration: 60,
          deliverable: 'Completed basic {topic} exercises',
          successCriteria: 'Successfully complete fundamental {topic} tasks'
        },
        setup: {
          name: 'Set up {tool} environment',
          description: 'Install and configure {tool} for {topic} development',
          type: 'setup',
          difficulty: 2,
          estimatedDuration: 30,
          deliverable: 'Working {tool} environment',
          successCriteria: 'Can create and run basic {topic} projects'
        }
      },
      research: {
        investigate: {
          name: 'Investigate {concept} in detail',
          description: 'Deep dive into {concept} and its applications',
          type: 'research',
          difficulty: 4,
          estimatedDuration: 90,
          deliverable: 'Detailed research document on {concept}',
          successCriteria: 'Can discuss {concept} with technical depth'
        },
        analyze: {
          name: 'Analyze {example} implementation',
          description: 'Study how {concept} is implemented in {example}',
          type: 'analysis',
          difficulty: 5,
          estimatedDuration: 75,
          deliverable: 'Analysis report of {example}',
          successCriteria: 'Can identify key implementation patterns'
        }
      },
      capability: {
        build: {
          name: 'Build {project} using {skill}',
          description: 'Create a working {project} that demonstrates {skill}',
          type: 'build',
          difficulty: 6,
          estimatedDuration: 120,
          deliverable: 'Functional {project}',
          successCriteria: 'Project meets all specified requirements'
        },
        implement: {
          name: 'Implement {feature} in {project}',
          description: 'Add {feature} functionality to your {project}',
          type: 'implementation',
          difficulty: 5,
          estimatedDuration: 90,
          deliverable: 'Working {feature} implementation',
          successCriteria: '{feature} works as specified'
        }
      },
      implementation: {
        develop: {
          name: 'Develop complete {application}',
          description: 'Build a full-featured {application} using {skill}',
          type: 'development',
          difficulty: 7,
          estimatedDuration: 180,
          deliverable: 'Complete {application}',
          successCriteria: 'Application is fully functional and tested'
        },
        integrate: {
          name: 'Integrate {system} with {tool}',
          description: 'Connect {system} to work with {tool}',
          type: 'integration',
          difficulty: 6,
          estimatedDuration: 120,
          deliverable: 'Integrated {system}',
          successCriteria: 'Systems work together seamlessly'
        }
      },
      mastery: {
        innovate: {
          name: 'Innovate on {concept} techniques',
          description: 'Develop new approaches or improvements to {concept}',
          type: 'innovation',
          difficulty: 9,
          estimatedDuration: 240,
          deliverable: 'Novel {concept} implementation',
          successCriteria: 'Shows clear improvement over existing approaches'
        },
        mentor: {
          name: 'Mentor others in {skill}',
          description: 'Teach and guide others learning {skill}',
          type: 'mentoring',
          difficulty: 8,
          estimatedDuration: 180,
          deliverable: 'Mentoring sessions and materials',
          successCriteria: 'Mentees show measurable progress'
        }
      },
      // Pattern configurations for dynamic generation
      patterns: {
        exploration: { baseTime: 30, difficultyRange: [1, 3] },
        learning: { baseTime: 45, difficultyRange: [2, 4] },
        practice: { baseTime: 90, difficultyRange: [3, 6] },
        creation: { baseTime: 120, difficultyRange: [4, 7] },
        mastery: { baseTime: 180, difficultyRange: [5, 9] }
      },
      characteristics: {
        introductory: { timeMultiplier: 0.8, difficultyAdjust: -1 },
        intermediate: { timeMultiplier: 1.0, difficultyAdjust: 0 },
        advanced: { timeMultiplier: 1.5, difficultyAdjust: +2 },
        expert: { timeMultiplier: 2.0, difficultyAdjust: +3 }
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
    // Domain-adaptive task counts
    const baseTasks = {
      mathematical_foundations: 5,  // More tasks for complex mathematical concepts
      algorithmic_understanding: 4,
      security_fundamentals: 4,
      threat_analysis: 3,
      language_mastery: 5,         // More practice needed for language learning
      problem_solving: 4,
      camera_fundamentals: 3,      // Hands-on practice
      creative_composition: 3,
      
      // Generic fallbacks
      foundation: 4,
      capability: 4,
      application: 4,
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
    const mainSubject = this.extractMainSubject(goal);
    const capitalizedSubject = mainSubject.charAt(0).toUpperCase() + mainSubject.slice(1);
    
    const params = {
      subject: capitalizedSubject,
      goal: goal,
      branchName: branch.name,
      branchDescription: branch.description,
      domain: this.extractDomain(goal),
      // Generate context-aware elements based on the actual goal content
      activities: this.generateGoalBasedActivities(goal, branch),
      concepts: this.extractConcepts(branch, goal),
      tools: this.extractTools(goal),
      examples: this.generateExamples(branch, goal),
      skills: this.extractSkills(branch, goal),
      outcomes: this.generateGoalBasedOutcomes(goal, branch)
    };
    
    return params;
  }

  extractMainSubject(goal) {
    // Extract main subject from goal without domain categorization
    const goalWords = goal.toLowerCase().split(/\s+/);
    const stopWords = ['learn', 'master', 'understand', 'build', 'create', 'develop', 'practice', 'study', 'get', 'become', 'improve'];
    
    // Find the most significant word (usually a noun)
    const significantWords = goalWords.filter(word => 
      !stopWords.includes(word) && 
      word.length > 2 && 
      !['the', 'and', 'or', 'but', 'with', 'for', 'to', 'in', 'on', 'at'].includes(word)
    );
    
    return significantWords[0] || goalWords[goalWords.length - 1] || 'subject';
  }

  extractTools(goal) {
    const commonTools = {
      ai_ml: ['Python', 'Jupyter Notebook', 'TensorFlow', 'PyTorch', 'scikit-learn', 'pandas'],
      cybersecurity: ['Wireshark', 'Metasploit', 'Nmap', 'Burp Suite', 'Kali Linux', 'OWASP tools'],
      photography: ['camera', 'Lightroom', 'Photoshop', 'tripod', 'lighting equipment'],
      programming: ['VS Code', 'Git', 'Node.js', 'database', 'testing frameworks'],
      music: ['DAW', 'microphone', 'MIDI controller', 'audio interface'],
      design: ['Figma', 'Adobe Creative Suite', 'Sketch', 'InVision'],
      business: ['spreadsheet', 'CRM', 'analytics', 'presentation software']
    };
    
    const domain = this.extractDomain(goal);
    return commonTools[domain] || ['computer', 'internet', 'notebook'];
  }

  extractConcepts(branch, goal) {
    const domain = this.extractDomain(goal);
    
    // Domain-specific concepts by phase
    const domainConcepts = {
      ai_ml: {
        mathematical_foundations: ['linear algebra', 'calculus', 'statistics', 'probability'],
        algorithmic_understanding: ['neural networks', 'gradient descent', 'backpropagation', 'optimization'],
        foundations: ['machine learning basics', 'data preprocessing', 'feature engineering'],
        application: ['model training', 'validation', 'hyperparameter tuning', 'deployment'],
        mastery: ['advanced architectures', 'research', 'innovation', 'paper writing']
      },
      cybersecurity: {
        security_fundamentals: ['CIA triad', 'threat modeling', 'risk assessment', 'security policies'],
        threat_analysis: ['vulnerability assessment', 'penetration testing', 'malware analysis'],
        foundations: ['network security', 'cryptography', 'access control'],
        application: ['incident response', 'security monitoring', 'compliance'],
        mastery: ['advanced threats', 'zero-day research', 'security architecture']
      },
      programming: {
        language_mastery: ['syntax', 'data structures', 'algorithms', 'debugging'],
        problem_solving: ['design patterns', 'architecture', 'best practices'],
        foundations: ['programming basics', 'version control', 'testing'],
        application: ['project development', 'APIs', 'databases', 'deployment'],
        mastery: ['advanced patterns', 'performance optimization', 'system design']
      },
      photography: {
        camera_fundamentals: ['exposure triangle', 'composition rules', 'camera settings'],
        creative_composition: ['lighting techniques', 'artistic vision', 'storytelling'],
        foundations: ['camera operation', 'basic editing', 'equipment'],
        application: ['portrait photography', 'landscape', 'event photography'],
        mastery: ['advanced techniques', 'artistic development', 'commercial work']
      }
    };
    
    // Fallback for generic phases or unknown domains
    const genericConcepts = {
      foundations: ['basics', 'fundamentals', 'principles', 'terminology'],
      application: ['techniques', 'workflows', 'processes', 'skills'],
      mastery: ['advanced techniques', 'innovation', 'leadership', 'expertise']
    };
    
    return domainConcepts[domain]?.[branch.phase] || genericConcepts[branch.phase] || ['general concepts'];
  }

  generateExamples(branch, goal) {
    const domain = this.extractDomain(goal);
    const examplesByDomain = {
      ai_ml: ['image classification model', 'NLP sentiment analysis', 'recommendation system', 'time series prediction'],
      cybersecurity: ['network vulnerability scan', 'phishing detection system', 'incident response plan', 'security audit'],
      photography: ['portrait session', 'landscape shot', 'street photography', 'product photo'],
      programming: ['web application', 'mobile app', 'API service', 'data analysis tool'],
      music: ['song composition', 'album recording', 'live performance', 'remix'],
      design: ['website design', 'mobile interface', 'brand identity', 'user journey'],
      business: ['marketing campaign', 'sales process', 'business plan', 'product launch']
    };
    
    return examplesByDomain[domain] || ['sample project', 'case study', 'example implementation'];
  }

  extractSkills(branch, goal) {
    const domain = this.extractDomain(goal);
    
    const domainSkills = {
      ai_ml: {
        mathematical_foundations: ['mathematical modeling', 'statistical analysis', 'equation solving'],
        algorithmic_understanding: ['algorithm implementation', 'optimization', 'debugging models'],
        foundations: ['data manipulation', 'visualization', 'basic modeling'],
        application: ['model training', 'evaluation', 'deployment', 'monitoring'],
        mastery: ['research methodology', 'paper writing', 'innovation', 'mentoring']
      },
      cybersecurity: {
        security_fundamentals: ['risk assessment', 'policy development', 'compliance checking'],
        threat_analysis: ['vulnerability scanning', 'penetration testing', 'malware analysis'],
        foundations: ['network analysis', 'security tool usage', 'incident documentation'],
        application: ['security implementation', 'monitoring', 'response coordination'],
        mastery: ['advanced research', 'security architecture', 'team leadership']
      },
      programming: {
        language_mastery: ['coding', 'debugging', 'testing', 'code review'],
        problem_solving: ['algorithm design', 'architecture planning', 'optimization'],
        foundations: ['basic programming', 'version control', 'environment setup'],
        application: ['project development', 'integration', 'deployment', 'maintenance'],
        mastery: ['system design', 'mentoring', 'technical leadership']
      }
    };
    
    const genericSkills = {
      foundations: ['reading', 'note-taking', 'basic operation', 'setup'],
      application: ['practice', 'implementation', 'troubleshooting', 'refinement'],
      mastery: ['innovation', 'teaching', 'mentoring', 'leadership']
    };
    
    return domainSkills[domain]?.[branch.phase] || genericSkills[branch.phase] || ['general skills'];
  }

  selectTaskType(branch, taskIndex, totalTasks, userContext) {
    // Domain-adaptive task type selection
    const phaseActivities = {
      mathematical_foundations: ['study', 'practice', 'apply'],
      algorithmic_understanding: ['analyze', 'implement', 'optimize'],
      security_fundamentals: ['research', 'analyze', 'practice'],
      threat_analysis: ['analyze', 'test', 'document'],
      language_mastery: ['practice', 'code', 'debug'],
      problem_solving: ['solve', 'pattern-match', 'optimize'],
      camera_fundamentals: ['practice', 'experiment', 'shoot'],
      creative_composition: ['compose', 'create', 'refine'],
      
      // Generic fallbacks
      foundation: ['research', 'setup', 'orientation'],
      capability: ['practice', 'build', 'experiment'],
      application: ['practice', 'build', 'experiment'],
      mastery: ['innovate', 'teach', 'mentor']
    };
    
    const activities = phaseActivities[branch.phase] || ['research', 'practice', 'apply'];
    
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

  generateGoalBasedActivities(goal, parameters = {}) {
    // Generate activities based on the goal and contextual parameters
    const activities = [];
    
    // Extract subject matter from goal
    const subject = this.extractMainSubject(goal);
    const tools = this.extractTools(goal);
    const concepts = this.extractConcepts(goal);
    
    // Generate foundational activities
    if (concepts.length > 0) {
      activities.push({
        type: 'foundational',
        name: `Learn core concepts in ${subject}`,
        description: `Study and understand the fundamental concepts of ${concepts.join(', ')}`,
        priority: 'high',
        category: 'theory'
      });
    }
    
    // Generate practice activities
    if (tools.length > 0) {
      activities.push({
        type: 'practice',
        name: `Practice with ${tools.join(' and ')}`,
        description: `Gain hands-on experience using ${tools.join(', ')} for ${subject}`,
        priority: 'medium',
        category: 'practical'
      });
    }
    
    // Generate application activities
    activities.push({
      type: 'application',
      name: `Apply ${subject} knowledge`,
      description: `Create or work on projects that demonstrate understanding of ${subject}`,
      priority: 'high',
      category: 'application'
    });
    
    // Generate assessment activities
    activities.push({
      type: 'assessment',
      name: `Evaluate ${subject} progress`,
      description: `Test and validate understanding through exercises and self-assessment`,
      priority: 'medium',
      category: 'evaluation'
    });
    
    return activities;
  }

  generateGoalBasedConcepts(goal, parameters = {}) {
    // Generate concepts based on the goal and contextual parameters
    const concepts = [];
    
    // Extract base concepts from goal
    const baseConcepts = this.extractConcepts(goal);
    const subject = this.extractMainSubject(goal);
    
    // Add foundational concepts
    concepts.push({
      type: 'foundational',
      name: `${subject} fundamentals`,
      description: `Core principles and basic understanding of ${subject}`,
      complexity: 'beginner',
      prerequisites: []
    });
    
    // Add extracted concepts with more detail
    baseConcepts.forEach(concept => {
      concepts.push({
        type: 'core',
        name: concept,
        description: `Understanding and application of ${concept} in ${subject}`,
        complexity: 'intermediate',
        prerequisites: [`${subject} fundamentals`]
      });
    });
    
    // Add advanced concepts
    if (baseConcepts.length > 0) {
      concepts.push({
        type: 'advanced',
        name: `Advanced ${subject} techniques`,
        description: `Complex applications and advanced methods in ${subject}`,
        complexity: 'advanced',
        prerequisites: baseConcepts
      });
    }
    
    // Add integration concepts
    concepts.push({
      type: 'integration',
      name: `${subject} best practices`,
      description: `Professional standards and best practices for ${subject}`,
      complexity: 'intermediate',
      prerequisites: baseConcepts.slice(0, 2) // First two concepts
    });
    
    return concepts;
  }

  generateGoalBasedOutcomes(goal, parameters = {}) {
    // Generate learning outcomes based on the goal and contextual parameters
    const outcomes = [];
    
    const subject = this.extractMainSubject(goal);
    const tools = this.extractTools(goal);
    const concepts = this.extractConcepts(goal);
    const skills = this.extractSkills(goal);
    
    // Knowledge outcomes
    outcomes.push({
      type: 'knowledge',
      category: 'understanding',
      statement: `Demonstrate comprehensive understanding of ${subject} principles and concepts`,
      measurable: true,
      assessmentMethod: 'written explanation and concept mapping'
    });
    
    // Skill outcomes
    if (skills.length > 0) {
      outcomes.push({
        type: 'skill',
        category: 'application',
        statement: `Successfully apply ${skills.join(', ')} in practical scenarios`,
        measurable: true,
        assessmentMethod: 'practical demonstration and project work'
      });
    }
    
    // Tool proficiency outcomes
    if (tools.length > 0) {
      outcomes.push({
        type: 'proficiency',
        category: 'technical',
        statement: `Achieve proficiency in using ${tools.join(', ')} for ${subject}`,
        measurable: true,
        assessmentMethod: 'hands-on exercises and tool-based projects'
      });
    }
    
    // Problem-solving outcomes
    outcomes.push({
      type: 'problem_solving',
      category: 'analysis',
      statement: `Analyze and solve complex problems in ${subject} domain`,
      measurable: true,
      assessmentMethod: 'case studies and problem-solving exercises'
    });
    
    // Creative/synthesis outcomes
    outcomes.push({
      type: 'synthesis',
      category: 'creation',
      statement: `Create original work or solutions that demonstrate mastery of ${subject}`,
      measurable: true,
      assessmentMethod: 'portfolio development and original project creation'
    });
    
    // Professional readiness outcomes
    outcomes.push({
      type: 'professional',
      category: 'readiness',
      statement: `Apply ${subject} knowledge in professional or real-world contexts`,
      measurable: true,
      assessmentMethod: 'professional simulation or real-world application'
    });
    
    return outcomes;
  }

  /**
   * Extract domain from goal or subject
   * @param {string} goal - The learning goal or subject
   * @returns {string} - The extracted domain
   */
  extractDomain(goal) {
    if (!goal || typeof goal !== 'string') {
      return 'general';
    }

    // Convert to lowercase for consistent matching
    const lowercaseGoal = goal.toLowerCase();
    
    // Common domain keywords mapping
    const domainKeywords = {
      'technology': ['programming', 'coding', 'software', 'development', 'tech', 'computer', 'web', 'app', 'javascript', 'python', 'java', 'react', 'node', 'database', 'api', 'framework', 'library', 'algorithm', 'data structure'],
      'business': ['business', 'management', 'marketing', 'finance', 'accounting', 'sales', 'strategy', 'entrepreneurship', 'startup', 'leadership', 'operations', 'hr', 'human resources'],
      'science': ['science', 'physics', 'chemistry', 'biology', 'mathematics', 'research', 'experiment', 'analysis', 'theory', 'hypothesis', 'data', 'statistics'],
      'arts': ['art', 'creative', 'writing', 'music', 'drawing', 'painting', 'photography', 'video', 'animation', 'graphic', 'visual', 'aesthetic'],
      'design': ['design', 'ui', 'ux', 'interface', 'website', 'layout', 'wireframe', 'prototype', 'figma', 'sketch'],
      'health': ['health', 'medicine', 'medical', 'fitness', 'nutrition', 'wellness', 'psychology', 'therapy', 'mental health', 'physical'],
      'education': ['teaching', 'education', 'learning', 'instruction', 'pedagogy', 'curriculum', 'assessment', 'student', 'academic'],
      'language': ['language', 'english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'communication', 'writing', 'speaking', 'translation'],
      'engineering': ['engineering', 'mechanical', 'electrical', 'civil', 'chemical', 'construction', 'manufacturing', 'automation', 'systems']
    };

    // Check for domain matches
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => lowercaseGoal.includes(keyword))) {
        return domain;
      }
    }

    // If no specific domain found, try to extract from common patterns
    if (lowercaseGoal.includes('learn') || lowercaseGoal.includes('study') || lowercaseGoal.includes('master')) {
      // Extract the main subject after common learning verbs
      const subjectMatch = lowercaseGoal.match(/(?:learn|study|master|understand)\s+([a-zA-Z\s]+?)(?:\s+(?:to|for|in|with|using)|$)/);
      if (subjectMatch && subjectMatch[1]) {
        const subject = subjectMatch[1].trim();
        // Check if this subject matches any domain keywords
        for (const [domain, keywords] of Object.entries(domainKeywords)) {
          if (keywords.some(keyword => subject.includes(keyword))) {
            return domain;
          }
        }
        // Return the subject itself if no domain match
        return subject.replace(/\s+/g, '_');
      }
    }

    // Default fallback
    return 'general';
  }
}
