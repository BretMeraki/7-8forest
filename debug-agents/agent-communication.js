/**
 * Agent Communication System
 * Handles inter-agent messaging and coordination
 */

import EventEmitter from 'events';
import { DEBUG_CONFIG } from './config.js';

export class AgentCommunication extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.messageQueue = [];
    this.messageHistory = [];
    this.startTime = Date.now();
  }

  /**
   * Register an agent with the communication system
   */
  registerAgent(agentId, agentInstance) {
    this.agents.set(agentId, {
      instance: agentInstance,
      status: 'active',
      lastHeartbeat: Date.now(),
      messagesProcessed: 0
    });
    
    console.log(`[AgentCommunication] Registered agent: ${agentId}`);
    this.emit('agent_registered', { agentId, timestamp: Date.now() });
  }

  /**
   * Send a message from one agent to another or broadcast
   */
  sendMessage(fromAgent, toAgent, type, data, priority = 3) {
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgent,
      to: toAgent || 'broadcast',
      type,
      data,
      priority,
      timestamp: Date.now()
    };

    this.messageQueue.push(message);
    this.messageHistory.push(message);

    // Trim history if needed
    if (this.messageHistory.length > DEBUG_CONFIG.communication.messageQueueSize) {
      this.messageHistory.shift();
    }

    // Emit events so listeners can react in real-time
    // Emit generic broadcast or direct message events
    if (toAgent === 'broadcast') {
      this.emit('broadcast_message', message);
    } else {
      this.emit(`message_${toAgent}`, message);
    }

    // Emit event for the specific message type as well (e.g., 'health_check', 'error_detected')
    // This allows consumers like the orchestrator or dashboard to listen by type regardless of target.
    this.emit(type, message);

    return message.id;
  }

  /**
   * Get messages for a specific agent
   */
  getMessagesForAgent(agentId, since = 0) {
    return this.messageHistory.filter(msg => 
      (msg.to === agentId || msg.to === 'broadcast') && 
      msg.timestamp > since
    );
  }

  /**
   * Update agent heartbeat
   */
  heartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.status = 'active';
    }
  }

  /**
   * Check agent health
   */
  checkAgentHealth() {
    const now = Date.now();
    const unhealthyAgents = [];

    for (const [agentId, agent] of this.agents) {
      const timeSinceHeartbeat = now - agent.lastHeartbeat;
      if (timeSinceHeartbeat > 30000) { // 30 seconds
        agent.status = 'unresponsive';
        unhealthyAgents.push(agentId);
      }
    }

    if (unhealthyAgents.length > 0) {
      this.emit('agents_unhealthy', unhealthyAgents);
    }

    return unhealthyAgents;
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const agents = {};
    for (const [agentId, agent] of this.agents) {
      agents[agentId] = {
        status: agent.status,
        lastHeartbeat: agent.lastHeartbeat,
        messagesProcessed: agent.messagesProcessed,
        uptime: Date.now() - this.startTime
      };
    }

    return {
      agents,
      messageQueueSize: this.messageQueue.length,
      totalMessagesProcessed: this.messageHistory.length,
      systemUptime: Date.now() - this.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Process message queue
   */
  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      if (message.to === 'broadcast') {
        // Send to all agents
        for (const [agentId, agent] of this.agents) {
          if (agentId !== message.from && agent.status === 'active') {
            try {
              await agent.instance.handleMessage(message);
              agent.messagesProcessed++;
            } catch (error) {
              console.error(`[AgentCommunication] Error delivering message to ${agentId}:`, error);
            }
          }
        }
      } else {
        // Send to specific agent
        const agent = this.agents.get(message.to);
        if (agent && agent.status === 'active') {
          try {
            await agent.instance.handleMessage(message);
            agent.messagesProcessed++;
          } catch (error) {
            console.error(`[AgentCommunication] Error delivering message to ${message.to}:`, error);
          }
        }
      }
    }
  }

  /**
   * Start the communication system
   */
  start() {
    // Process message queue periodically
    this.messageProcessor = setInterval(() => {
      this.processMessageQueue();
    }, 100);

    // Check agent health periodically
    this.healthChecker = setInterval(() => {
      this.checkAgentHealth();
    }, 10000);

    console.log('[AgentCommunication] Communication system started');
  }

  /**
   * Stop the communication system
   */
  stop() {
    if (this.messageProcessor) {
      clearInterval(this.messageProcessor);
    }
    if (this.healthChecker) {
      clearInterval(this.healthChecker);
    }
    
    console.log('[AgentCommunication] Communication system stopped');
  }
}

// Singleton instance
export const agentCommunication = new AgentCommunication();
