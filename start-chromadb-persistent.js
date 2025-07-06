#!/usr/bin/env node

/**
 * ChromaDB Persistent Connection Manager
 * 
 * This script keeps a ChromaDB connection alive to prevent "closed channel" errors.
 * Run this alongside your Forest MCP server to maintain stable vector storage.
 */

import ChromaDBProvider from './___stage1/modules/vector-providers/ChromaDBProvider.js';
import vectorConfig from './___stage1/config/vector-config.js';

class ChromaDBConnectionManager {
  constructor() {
    this.provider = null;
    this.isRunning = false;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async start() {
    console.log('🚀 Starting ChromaDB Persistent Connection Manager...');
    console.log('=========================================\n');

    try {
      // Initialize ChromaDB provider
      this.provider = new ChromaDBProvider(vectorConfig.chroma);
      await this.provider.initialize();
      
      console.log('✅ ChromaDB connection established');
      console.log(`📋 Collection: ${this.provider.collectionName}`);
      console.log(`🔧 Mode: ${this.provider.isEmbedded ? 'embedded' : 'server'}`);
      
      this.isRunning = true;
      this.startHealthChecks();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => this.gracefulShutdown());
      process.on('SIGTERM', () => this.gracefulShutdown());
      
      console.log('\n🔄 Connection manager is running...');
      console.log('   Press Ctrl+C to stop gracefully');
      console.log('   This will keep ChromaDB connections healthy for Forest MCP\n');
      
      // Keep the process alive
      await this.keepAlive();
      
    } catch (error) {
      console.error('❌ Failed to start ChromaDB connection manager:', error.message);
      process.exit(1);
    }
  }

  startHealthChecks() {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.warn('⚠️ Health check failed:', error.message);
        await this.attemptReconnect();
      }
    }, 30000);
  }

  async performHealthCheck() {
    if (!this.provider) return;
    
    // Simple health check - list collections
    const collections = await this.provider.client.listCollections();
    
    // Reset reconnect attempts on successful health check
    this.reconnectAttempts = 0;
    
    const timestamp = new Date().toISOString();
    console.log(`💚 [${timestamp}] Health check passed - ${collections.length} collections`);
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Shutting down.`);
      await this.gracefulShutdown();
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting to ChromaDB (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    try {
      // Close existing connection
      if (this.provider) {
        await this.provider.close();
      }

      // Create new connection
      this.provider = new ChromaDBProvider(vectorConfig.chroma);
      await this.provider.initialize();

      console.log('✅ Reconnection successful');
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error.message);
      
      // Wait before next attempt (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      console.log(`⏳ Waiting ${delay/1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async keepAlive() {
    // Keep the process running
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async gracefulShutdown() {
    console.log('\n🛑 Graceful shutdown initiated...');
    
    this.isRunning = false;
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Close ChromaDB connection
    if (this.provider) {
      try {
        await this.provider.close();
        console.log('✅ ChromaDB connection closed');
      } catch (error) {
        console.warn('⚠️ Error closing ChromaDB connection:', error.message);
      }
    }
    
    console.log('👋 ChromaDB Connection Manager stopped');
    process.exit(0);
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ChromaDBConnectionManager();
  manager.start().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

export default ChromaDBConnectionManager; 