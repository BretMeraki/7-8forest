/**
 * Core Intelligence Module - MCP-Native Intelligence Bridge
 * Provides domain-agnostic intelligence capabilities via MCP protocol
 */

import { FILE_NAMES, DEFAULT_PATHS, THRESHOLDS } from './memory-sync.js';

/**
 * MCPIntelligenceCore - Core MCP intelligence bridge implementation
 */
class MCPIntelligenceCore {
    constructor() {
        this.pendingRequests = new Map();
    }

    async request(requestData) {
        const { method, params } = requestData;
        
        if (method === 'llm/completion') {
            return await this.delegateToClaudeIntelligence(params);
        }
        
        if (method === 'llm/process_response') {
            return await this.processClaudeResponse(params);
        }
        
        throw new Error(`Unknown method: ${method}`);
    }

    async delegateToClaudeIntelligence(params) {
        console.error('🌉 MCP Bridge: delegateToClaudeIntelligence called with params:');
        console.error('  - params:', JSON.stringify(params, null, 2));
        console.error('  - params.goal:', params.goal);
        console.error('  - params.user_goal:', params.user_goal);
        console.error('  - params.learning_goal:', params.learning_goal);
        console.error('  - params.system:', params.system);
        console.error('  - params.user:', params.user);
        console.error('  - params.prompt:', params.prompt);
        
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.pendingRequests.set(requestId, {
            originalParams: params,
            timestamp: Date.now(),
            expectedSchema: params.schema
        });
        
        console.error('🧠 **Intelligent Task Generated via MCP Bridge** ✨');
        console.error('Project Goal:', params.goal || params.user_goal || params.learning_goal || 'undefined');
        console.error('Request ID:', requestId);

        return {
            type: 'CLAUDE_INTELLIGENCE_REQUEST',
            requestId: requestId,
            prompt: {
                system: params.system,
                user: params.user || params.prompt,
                schema: params.schema ? JSON.stringify(params.schema, null, 2) : null,
                goal: params.goal || params.user_goal || params.learning_goal,
                context: params.context
            },
            parameters: {
                maxTokens: params.max_tokens || 500,
                temperature: params.temperature || 0.95
            },
            processingInstructions: this.generateProcessingInstructions(params),
            responseFormat: params.schema ? 'structured_json' : 'text'
        };
    }

    generateProcessingInstructions(params) {
        let instructions = [
            "Please process the following prompt with your full intelligence:",
            "- Provide thoughtful, comprehensive analysis",
            "- Use your complete reasoning capabilities"
        ];

        if (params.schema) {
            instructions.push(
                "- Return response as valid JSON matching the provided schema",
                "- Ensure all required fields are included",
                "- Validate data types match schema requirements"
            );
        }

        if (params.context) {
            instructions.push(
                "- Consider the provided context in your analysis",
                "- Build upon previous insights where relevant"
            );
        }

        return instructions.join('\n');
    }

    async processClaudeResponse(params) {
        const { requestId, response } = params;
        const requestContext = this.pendingRequests.get(requestId);
        if (!requestContext) {
            throw new Error(`No pending request found for ID: ${requestId}`);
        }

        this.pendingRequests.delete(requestId);

        try {
            const processedResponse = await this.validateAndStructureResponse(
                response, 
                requestContext.expectedSchema
            );

            return {
                type: 'INTELLIGENCE_RESPONSE',
                requestId: requestId,
                data: processedResponse,
                metadata: {
                    processedAt: Date.now(),
                    processingTime: Date.now() - requestContext.timestamp,
                    schema: requestContext.expectedSchema ? 'validated' : 'none'
                }
            };
        } catch (error) {
            return {
                type: 'INTELLIGENCE_ERROR',
                requestId: requestId,
                error: error.message,
                originalResponse: response
            };
        }
    }

    async validateAndStructureResponse(response, expectedSchema) {
        if (expectedSchema) {
            try {
                const parsedResponse = typeof response === 'string' 
                    ? JSON.parse(response) 
                    : response;
                
                if (this.validateAgainstSchema(parsedResponse, expectedSchema)) {
                    return parsedResponse;
                } else {
                    throw new Error('Response does not match expected schema');
                }
            } catch (parseError) {
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
        }

        return { content: response };
    }

    validateAgainstSchema(data, schema) {
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in data)) {
                    return false;
                }
            }
        }
        return true;
    }

    static createIntelligenceRequest(system, user, options = {}) {
        return {
            method: 'llm/completion',
            params: {
                system: system,
                user: user,
                schema: options.schema,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.9,
                context: options.context
            }
        };
    }

    static processIntelligenceResponse(requestId, claudeResponse) {
        return {
            method: 'llm/process_response',
            params: {
                requestId: requestId,
                response: claudeResponse
            }
        };
    }
}

class ForestIntelligenceAdapter {
    constructor() {
        this.core = new MCPIntelligenceCore();
    }

    async requestTaskGeneration(context, userGoal) {
        const system = "You are a learning strategy expert creating optimal task sequences.";
        const user = `Context: ${context}\nGoal: ${userGoal}\nGenerate next learning task.`;
        
        const schema = {
            type: "object",
            required: ["title", "description", "timeEstimate", "difficulty"],
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                timeEstimate: { type: "string" },
                difficulty: { type: "number", minimum: 1, maximum: 5 },
                prerequisites: { type: "array", items: { type: "string" } }
            }
        };

        const request = MCPIntelligenceCore.createIntelligenceRequest(
            system, user, { schema, maxTokens: 400, temperature: 0.9 }
        );

        return await this.core.request(request);
    }

    async requestStrategicBranches(goal, complexityAnalysis, focusAreas = [], learningStyle = 'mixed', context = {}) {
        const system = "You are an expert learning strategist who understands how different domains and goals require different learning approaches. Generate contextually appropriate learning phases.";
        const user = `Analyze this learning goal and generate a contextually appropriate strategic learning progression:

**Goal**: ${goal}
**Complexity**: ${complexityAnalysis.score}/10 (${complexityAnalysis.level})
**Focus Areas**: ${focusAreas.join(', ') || 'None specified'}
**Learning Style**: ${learningStyle}
**Context**: ${context.context || 'No additional context'}

**Your Task**: 
1. Analyze the domain and determine how experts typically approach learning in this area
2. Identify the person's intent and motivations for pursuing this goal
3. Generate 3-7 strategic learning phases that are contextually appropriate for this specific goal
4. Ensure each phase builds logically on previous phases
5. Make the progression natural for how this domain is actually learned

**Critical Requirements**:
- DO NOT use generic academic phases like "Research" unless they're truly appropriate for this domain
- Consider how real experts in this field actually learn and progress
- Adapt the progression to the person's intent (career, passion, problem-solving, etc.)
- Make each phase actionable and meaningful
- Ensure logical prerequisites between phases`;

        const schema = {
            type: "object",
            properties: {
                domain_analysis: {
                    type: "object",
                    properties: {
                        domain_type: { type: "string", description: "The primary domain this goal belongs to" },
                        domain_characteristics: { 
                            type: "array", 
                            items: { type: "string" },
                            description: "Key characteristics that define how this domain is typically approached"
                        },
                        learning_patterns: {
                            type: "array",
                            items: { type: "string" },
                            description: "How experts typically learn and progress in this domain"
                        }
                    }
                },
                strategic_branches: {
                    type: "array",
                    minItems: 3,
                    maxItems: 7,
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Clear, specific name for this learning phase" },
                            description: { type: "string", description: "What this phase accomplishes and why it's important" },
                            priority: { type: "integer", minimum: 1, description: "Order in the learning progression" },
                            duration_estimate: { type: "string", description: "Estimated time to complete this phase" },
                            key_activities: {
                                type: "array",
                                items: { type: "string" },
                                description: "Main types of activities in this phase"
                            },
                            learning_focus: { type: "string", description: "Primary learning approach for this phase" }
                        },
                        required: ["name", "description", "priority", "key_activities", "learning_focus"]
                    }
                }
            },
            required: ["domain_analysis", "strategic_branches"]
        };

        const request = MCPIntelligenceCore.createIntelligenceRequest(
            system, user, { schema, maxTokens: 2000, temperature: 0.95 }
        );

        return await this.core.request(request);
    }

    async requestOnboardingAnalysis(goal, context = {}) {
        const system = "You are an expert onboarding specialist who helps learners get started effectively with new goals.";
        const user = `Analyze this learning goal and provide onboarding recommendations:

**Goal**: ${goal}
**Context**: ${JSON.stringify(context, null, 2)}

**Your Task**: Provide guidance for getting started with this goal, including:
1. Key questions to clarify before starting
2. Essential prerequisites or background knowledge
3. Recommended first steps
4. Potential obstacles and how to address them
5. Success metrics for the initial phase`;

        const schema = {
            type: "object",
            properties: {
                clarification_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Important questions to ask before starting"
                },
                prerequisites: {
                    type: "array",
                    items: { type: "string" },
                    description: "Essential background or setup needed"
                },
                first_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended initial actions"
                },
                potential_obstacles: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            obstacle: { type: "string" },
                            solution: { type: "string" }
                        }
                    }
                },
                success_metrics: {
                    type: "array",
                    items: { type: "string" },
                    description: "How to measure early progress"
                }
            },
            required: ["clarification_questions", "first_steps", "success_metrics"]
        };

        const request = MCPIntelligenceCore.createIntelligenceRequest(
            system, user, { schema, maxTokens: 1500, temperature: 0.85 }
        );

        return await this.core.request(request);
    }

    async processIntelligenceResponse(requestId, claudeResponse) {
        const processRequest = MCPIntelligenceCore.processIntelligenceResponse(
            requestId, claudeResponse
        );

        return await this.core.request(processRequest);
    }

    // Direct response processing for vectorized handlers
    async processIntelligenceResponseDirect(requestId, claudeResponseParams) {
        const requestContext = this.core.pendingRequests.get(requestId);
        if (!requestContext) {
            throw new Error(`No pending request found for ID: ${requestId}`);
        }

        this.core.pendingRequests.delete(requestId);

        try {
            const processedResponse = await this.core.validateAndStructureResponse(
                claudeResponseParams.response || claudeResponseParams, 
                requestContext.expectedSchema
            );

            return {
                type: 'INTELLIGENCE_RESPONSE',
                requestId: requestId,
                data: processedResponse,
                metadata: {
                    processedAt: Date.now(),
                    processingTime: Date.now() - requestContext.timestamp,
                    schema: requestContext.expectedSchema ? 'validated' : 'none'
                }
            };
        } catch (error) {
            return {
                type: 'INTELLIGENCE_ERROR',
                requestId: requestId,
                error: error.message,
                originalResponse: claudeResponseParams.response || claudeResponseParams
            };
        }
    }

    // Legacy compatibility method for existing Forest modules
    async requestIntelligence(prompt, options = {}) {
        const system = options.system || "You are an intelligent assistant providing analysis and insights.";
        const request = MCPIntelligenceCore.createIntelligenceRequest(
            system, prompt, {
                schema: options.schema,
                maxTokens: options.max_tokens || options.maxTokens || 500,
                temperature: options.temperature || 0.9,
                context: options.context
            }
        );

        return await this.core.request(request);
    }
}

// Legacy CoreIntelligence class for backward compatibility
export class CoreIntelligence {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.mcpCore = new MCPIntelligenceCore();
  }

  async request(requestData) {
    return await this.mcpCore.request(requestData);
  }

  async requestIntelligence(prompt, options = {}) {
    // Bridge to MCP intelligence for legacy compatibility
    const system = options.system || "You are an intelligent assistant providing analysis and insights.";
    const request = MCPIntelligenceCore.createIntelligenceRequest(
      system, prompt, {
        schema: options.schema,
        maxTokens: options.max_tokens || options.maxTokens || 500,
        temperature: options.temperature || 0.9,
        context: options.context
      }
    );
    return await this.mcpCore.request(request);
  }

  // Stub methods for compatibility - delegate to analysis methods when needed
  async analyzeReasoning(includeDetailedAnalysis = true) {
    return {
      content: [{
        type: 'text',
        text: '**Reasoning Analysis via MCP Intelligence**\n\nAnalysis functionality is now delegated to Claude via MCP protocol.'
      }],
      reasoning_analysis: {
        deductions: [],
        pacingContext: {},
        recommendations: [],
        timestamp: new Date().toISOString()
      }
    };
  }

  async generateLogicalDeductions(input) {
    // Simplified for MCP delegation
    return [];
  }

  async generateLLMResponse({ context, prompt, format = 'json' }) {
    const system = `Generate response for context: ${context}`;
    const request = MCPIntelligenceCore.createIntelligenceRequest(
      system, prompt, { responseFormat: format }
    );
    return await this.mcpCore.request(request);
  }
}

export { MCPIntelligenceCore, ForestIntelligenceAdapter };
