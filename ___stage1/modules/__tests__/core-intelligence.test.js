/**
 * @jest-environment node
 */
import { MCPIntelligenceCore } from '../core-intelligence.js';

// Mock a sample response for testing
const mockClaudeResponse = {
  requestId: 'req_123',
  response: JSON.stringify({
    title: "Sample Task",
    description: "This is a sample task description.",
    timeEstimate: "30 minutes",
    difficulty: 2
  })
};

describe('MCPIntelligenceCore', () => {
  let intelligenceCore;

  beforeAll(() => {
    intelligenceCore = new MCPIntelligenceCore();
  });

  it('should delegate requests to Claude intelligence', async () => {
    const params = {
      system: "You are a test assistant",
      user: "Test user task",
      schema: {
        required: ['title', 'description']
      },
      max_tokens: 300,
      temperature: 0.5
    };

    const response = await intelligenceCore.delegateToClaudeIntelligence(params);

    expect(response.type).toBe('CLAUDE_INTELLIGENCE_REQUEST');
    expect(response.prompt.user).toBe('Test user task');
  });

  it('should process Claude response correctly', async () => {
    const processedResponse = await intelligenceCore.processClaudeResponse(mockClaudeResponse);
    
    expect(processedResponse.type).toBe('INTELLIGENCE_RESPONSE');
    expect(processedResponse.data.title).toBe('Sample Task');
    expect(processedResponse.data.difficulty).toBe(2);
  });

  it('should throw error for unknown method', async () => {
    try {
      await intelligenceCore.request({ method: 'unknown', params: {} });
    } catch (error) {
      expect(error).toEqual(new Error('Unknown method: unknown'));
    }
  });
});

