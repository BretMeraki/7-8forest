/**
 * Granular HTA Decomposer - Deep Task Breakdown
 * 
 * Transforms broad concepts like "HTML Fundamentals" into specific,
 * actionable micro-tasks that users can complete and feel progress.
 */

export class GranularHTADecomposer {
  constructor() {
    // Knowledge domain decomposition templates
    this.domainDecompositions = {
      'html': this.getHTMLDecomposition(),
      'css': this.getCSSDecomposition(),
      'javascript': this.getJavaScriptDecomposition(),
      'react': this.getReactDecomposition(),
      'node': this.getNodeDecomposition(),
      'database': this.getDatabaseDecomposition(),
      'api': this.getAPIDecomposition(),
      'git': this.getGitDecomposition()
    };
  }

  /**
   * Decompose a high-level task into granular, actionable micro-tasks
   */
  decomposeTask(taskTitle, taskDescription, difficulty = 3, learningStyle = 'mixed') {
    const domain = this.identifyDomain(taskTitle, taskDescription);
    const decomposition = this.domainDecompositions[domain];
    
    if (!decomposition) {
      return this.createGenericDecomposition(taskTitle, taskDescription, difficulty);
    }

    // Find matching concept within domain
    const concept = this.findMatchingConcept(taskTitle, taskDescription, decomposition);
    
    if (concept) {
      return this.generateMicroTasks(concept, difficulty, learningStyle);
    }

    return this.createGenericDecomposition(taskTitle, taskDescription, difficulty);
  }

  /**
   * HTML Domain Decomposition
   */
  getHTMLDecomposition() {
    return {
      'fundamentals': {
        concepts: [
          {
            id: 'html_structure',
            name: 'HTML Document Structure',
            micro_tasks: [
              {
                title: 'Create your first HTML file',
                description: 'Create an index.html file and understand the .html extension',
                action: 'Create a new file named index.html in a folder',
                validation: 'File exists and has .html extension',
                duration: '5 minutes',
                difficulty: 1
              },
              {
                title: 'Write the HTML5 doctype',
                description: 'Add <!DOCTYPE html> to declare this as an HTML5 document',
                action: 'Type the HTML5 doctype declaration at the top of your file',
                validation: 'Doctype is present and correct',
                duration: '3 minutes',
                difficulty: 1
              },
              {
                title: 'Create the html element',
                description: 'Add opening and closing <html> tags to wrap your document',
                action: 'Add <html> and </html> tags with proper nesting',
                validation: 'Html element properly opened and closed',
                duration: '5 minutes',
                difficulty: 1
              },
              {
                title: 'Build the head section',
                description: 'Add <head> section with essential meta information',
                action: 'Create head element with charset and title',
                validation: 'Head contains meta charset and title elements',
                duration: '8 minutes',
                difficulty: 2
              },
              {
                title: 'Create the body section',
                description: 'Add <body> section where visible content goes',
                action: 'Add body element and write your first "Hello World" content',
                validation: 'Body element contains visible text content',
                duration: '5 minutes',
                difficulty: 1
              }
            ]
          },
          {
            id: 'html_elements',
            name: 'Essential HTML Elements',
            micro_tasks: [
              {
                title: 'Create headings (h1-h6)',
                description: 'Use heading elements to structure content hierarchy',
                action: 'Create h1, h2, and h3 elements with different text',
                validation: 'Multiple heading levels are properly nested',
                duration: '10 minutes',
                difficulty: 2
              },
              {
                title: 'Write paragraphs with <p>',
                description: 'Use paragraph elements for blocks of text',
                action: 'Create 3 paragraphs with different content',
                validation: 'Paragraphs are properly separated and formatted',
                duration: '8 minutes',
                difficulty: 1
              },
              {
                title: 'Create links with <a>',
                description: 'Make clickable links to other pages and websites',
                action: 'Create internal link and external link with href attributes',
                validation: 'Links work and open correctly',
                duration: '12 minutes',
                difficulty: 2
              },
              {
                title: 'Add images with <img>',
                description: 'Embed images in your web page',
                action: 'Add image with src, alt, and width attributes',
                validation: 'Image displays with proper alt text',
                duration: '10 minutes',
                difficulty: 2
              },
              {
                title: 'Create lists (ul, ol, li)',
                description: 'Organize content in unordered and ordered lists',
                action: 'Create both bullet list and numbered list',
                validation: 'Lists display with proper indentation and bullets/numbers',
                duration: '15 minutes',
                difficulty: 2
              }
            ]
          }
        ]
      },
      'forms': {
        concepts: [
          {
            id: 'form_basics',
            name: 'HTML Forms',
            micro_tasks: [
              {
                title: 'Create a basic form',
                description: 'Build a form element with action and method',
                action: 'Create form with action="#" and method="post"',
                validation: 'Form element is properly structured',
                duration: '8 minutes',
                difficulty: 2
              },
              {
                title: 'Add text inputs',
                description: 'Create text input fields with labels',
                action: 'Add name and email input fields with labels',
                validation: 'Inputs have proper labels and name attributes',
                duration: '12 minutes',
                difficulty: 2
              },
              {
                title: 'Create a submit button',
                description: 'Add button to submit the form',
                action: 'Add input type="submit" or button element',
                validation: 'Button submits the form when clicked',
                duration: '5 minutes',
                difficulty: 1
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * CSS Domain Decomposition
   */
  getCSSDecomposition() {
    return {
      'fundamentals': {
        concepts: [
          {
            id: 'css_selectors',
            name: 'CSS Selectors',
            micro_tasks: [
              {
                title: 'Create your first CSS file',
                description: 'Create a styles.css file and link it to HTML',
                action: 'Create CSS file and add link element to HTML head',
                validation: 'CSS file is linked and styles are applied',
                duration: '8 minutes',
                difficulty: 2
              },
              {
                title: 'Style elements by tag name',
                description: 'Use element selectors to style HTML tags',
                action: 'Style all h1 elements with color and font-size',
                validation: 'All h1 elements show the new styling',
                duration: '10 minutes',
                difficulty: 2
              },
              {
                title: 'Use class selectors',
                description: 'Create and apply CSS classes',
                action: 'Create a .highlight class and apply it to elements',
                validation: 'Elements with class show different styling',
                duration: '12 minutes',
                difficulty: 2
              },
              {
                title: 'Apply ID selectors',
                description: 'Use ID selectors for unique elements',
                action: 'Create #header ID and style it uniquely',
                validation: 'Element with ID has unique styling',
                duration: '10 minutes',
                difficulty: 2
              }
            ]
          },
          {
            id: 'css_properties',
            name: 'CSS Properties',
            micro_tasks: [
              {
                title: 'Change text colors',
                description: 'Use the color property to change text color',
                action: 'Set different colors using names, hex, and RGB',
                validation: 'Text appears in specified colors',
                duration: '8 minutes',
                difficulty: 1
              },
              {
                title: 'Modify font properties',
                description: 'Change font-family, font-size, and font-weight',
                action: 'Apply different fonts and sizes to various elements',
                validation: 'Fonts display as specified',
                duration: '15 minutes',
                difficulty: 2
              },
              {
                title: 'Add background colors',
                description: 'Use background-color to style element backgrounds',
                action: 'Add background colors to div elements',
                validation: 'Elements show colored backgrounds',
                duration: '8 minutes',
                difficulty: 1
              },
              {
                title: 'Control spacing with margin and padding',
                description: 'Use margin and padding to control element spacing',
                action: 'Add margin and padding to see spacing differences',
                validation: 'Elements have visible spacing changes',
                duration: '20 minutes',
                difficulty: 3
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * JavaScript Domain Decomposition
   */
  getJavaScriptDecomposition() {
    return {
      'fundamentals': {
        concepts: [
          {
            id: 'variables',
            name: 'JavaScript Variables',
            micro_tasks: [
              {
                title: 'Create your first variable',
                description: 'Declare a variable using let keyword',
                action: 'Write: let message = "Hello World"; in console',
                validation: 'Variable is declared and contains value',
                duration: '5 minutes',
                difficulty: 1
              },
              {
                title: 'Understand let vs const',
                description: 'Learn when to use let vs const for variables',
                action: 'Create examples of both let and const variables',
                validation: 'Understand mutability differences',
                duration: '10 minutes',
                difficulty: 2
              },
              {
                title: 'Work with different data types',
                description: 'Create variables with string, number, and boolean values',
                action: 'Declare variables of each type and log them',
                validation: 'Variables contain correct data types',
                duration: '12 minutes',
                difficulty: 2
              },
              {
                title: 'Print to console',
                description: 'Use console.log to display variable values',
                action: 'Log different variables to browser console',
                validation: 'Values appear in browser console',
                duration: '8 minutes',
                difficulty: 1
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * React Domain Decomposition
   */
  getReactDecomposition() {
    return {
      'components': {
        concepts: [
          {
            id: 'first_component',
            name: 'Your First React Component',
            micro_tasks: [
              {
                title: 'Create a functional component',
                description: 'Write a simple function that returns JSX',
                action: 'Create function Welcome() that returns <h1>Hello React</h1>',
                validation: 'Component renders text on screen',
                duration: '10 minutes',
                difficulty: 2
              },
              {
                title: 'Export your component',
                description: 'Make your component available for import',
                action: 'Add export default to your component function',
                validation: 'Component can be imported in other files',
                duration: '5 minutes',
                difficulty: 2
              },
              {
                title: 'Import and use component',
                description: 'Import your component and render it',
                action: 'Import Welcome and render it in App component',
                validation: 'Component appears on the page',
                duration: '8 minutes',
                difficulty: 2
              }
            ]
          }
        ]
      }
    };
  }

  // Additional domain decompositions...
  getNodeDecomposition() { return {}; }
  getDatabaseDecomposition() { return {}; }
  getAPIDecomposition() { return {}; }
  getGitDecomposition() { return {}; }

  /**
   * Identify the domain from task title and description
   */
  identifyDomain(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('html') || text.includes('markup') || text.includes('elements')) {
      return 'html';
    }
    if (text.includes('css') || text.includes('styling') || text.includes('styles')) {
      return 'css';
    }
    if (text.includes('javascript') || text.includes('js') || text.includes('variables')) {
      return 'javascript';
    }
    if (text.includes('react') || text.includes('component') || text.includes('jsx')) {
      return 'react';
    }
    
    return null;
  }

  /**
   * Find matching concept within domain
   */
  findMatchingConcept(title, description, decomposition) {
    const text = (title + ' ' + description).toLowerCase();
    
    for (const [categoryKey, category] of Object.entries(decomposition)) {
      for (const concept of category.concepts) {
        // Check if task matches this concept
        if (text.includes(concept.name.toLowerCase()) || 
            text.includes(concept.id.replace('_', ' ')) ||
            this.matchesConceptKeywords(text, concept)) {
          return concept;
        }
      }
    }
    
    // Return first concept in fundamentals as fallback
    const fundamentals = decomposition.fundamentals;
    if (fundamentals && fundamentals.concepts.length > 0) {
      return fundamentals.concepts[0];
    }
    
    return null;
  }

  /**
   * Check if text matches concept-specific keywords
   */
  matchesConceptKeywords(text, concept) {
    const keywords = {
      'html_structure': ['structure', 'document', 'basic', 'fundamentals'],
      'html_elements': ['elements', 'tags', 'headings', 'paragraphs'],
      'css_selectors': ['selectors', 'classes', 'ids'],
      'css_properties': ['properties', 'colors', 'fonts', 'spacing'],
      'variables': ['variables', 'data', 'types', 'declare']
    };
    
    const conceptKeywords = keywords[concept.id] || [];
    return conceptKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Generate micro-tasks from concept
   */
  generateMicroTasks(concept, baseDifficulty, learningStyle) {
    const microTasks = concept.micro_tasks.map((microTask, index) => ({
      id: `${concept.id}_${index + 1}`,
      title: microTask.title,
      description: microTask.description,
      action: microTask.action,
      validation: microTask.validation,
      duration: microTask.duration,
      difficulty: microTask.difficulty || baseDifficulty,
      branch: concept.name,
      taskType: this.inferTaskType(microTask, learningStyle),
      prerequisites: index > 0 ? [`${concept.id}_${index}`] : [],
      learningOutcome: `Master: ${microTask.title}`,
      granular: true,
      concept_id: concept.id
    }));

    return microTasks;
  }

  /**
   * Infer task type based on micro-task content and learning style
   */
  inferTaskType(microTask, learningStyle) {
    const action = microTask.action.toLowerCase();
    
    if (action.includes('create') || action.includes('build') || action.includes('write')) {
      return learningStyle === 'hands-on' ? 'hands_on_creation' : 'guided_creation';
    }
    if (action.includes('understand') || action.includes('learn')) {
      return 'conceptual_learning';
    }
    if (action.includes('practice') || action.includes('apply')) {
      return 'skill_practice';
    }
    
    return 'interactive_exercise';
  }

  /**
   * Create generic decomposition for unknown domains
   */
  createGenericDecomposition(title, description, difficulty) {
    return [
      {
        id: 'generic_intro',
        title: `Introduction to ${title}`,
        description: `Get familiar with the basics of ${title}`,
        duration: '15 minutes',
        difficulty: Math.max(1, difficulty - 1),
        taskType: 'conceptual_learning',
        granular: true
      },
      {
        id: 'generic_practice',
        title: `Practice ${title}`,
        description: `Apply your knowledge of ${title} through exercises`,
        duration: '20 minutes',
        difficulty: difficulty,
        taskType: 'skill_practice',
        prerequisites: ['generic_intro'],
        granular: true
      },
      {
        id: 'generic_apply',
        title: `Apply ${title}`,
        description: `Use ${title} in a practical context`,
        duration: '25 minutes',
        difficulty: Math.min(5, difficulty + 1),
        taskType: 'hands_on_creation',
        prerequisites: ['generic_practice'],
        granular: true
      }
    ];
  }

  /**
   * Validate that micro-tasks are properly granular
   */
  validateGranularity(microTasks) {
    const validationResults = {
      valid: true,
      issues: [],
      recommendations: []
    };

    microTasks.forEach((task, index) => {
      // Check duration (should be 5-25 minutes for micro-tasks)
      const duration = parseInt(task.duration);
      if (duration > 25) {
        validationResults.issues.push(`Task ${index + 1}: Duration too long (${duration}min) - should be ≤25min`);
        validationResults.recommendations.push(`Break down "${task.title}" into smaller steps`);
      }

      // Check specificity (should have concrete action)
      if (!task.action || task.action.length < 20) {
        validationResults.issues.push(`Task ${index + 1}: Action not specific enough`);
        validationResults.recommendations.push(`Add more specific action steps for "${task.title}"`);
      }

      // Check validation criteria
      if (!task.validation) {
        validationResults.issues.push(`Task ${index + 1}: Missing validation criteria`);
        validationResults.recommendations.push(`Add clear success criteria for "${task.title}"`);
      }
    });

    if (validationResults.issues.length > 0) {
      validationResults.valid = false;
    }

    return validationResults;
  }
}

export default GranularHTADecomposer;
