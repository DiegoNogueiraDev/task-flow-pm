#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GraphDB } from '../src/db/graph';
import { EmbeddingsService } from '../src/db/embeddings';
import { Logger } from '../src/services/logger';
import { MCPCommandHandler } from '../src/mcp/commands';
import { MCPConfig, MCPRequestTypes } from '../src/mcp/schema';

class MCPServer {
  private config: MCPConfig;
  private db: GraphDB;
  private embeddings: EmbeddingsService;
  private logger: Logger;
  private commandHandler: MCPCommandHandler;

  constructor() {
    this.config = this.loadConfig();
    this.db = new GraphDB(this.config.dbPath);
    this.embeddings = new EmbeddingsService(this.config.embeddingsModel);
    this.logger = new Logger(this.config.esEndpoint);
    this.commandHandler = new MCPCommandHandler(this.db, this.embeddings, this.logger);
  }

  private loadConfig(): MCPConfig {
    const configPath = resolve(process.cwd(), 'mcp.json');
    
    const defaultConfig: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    if (!existsSync(configPath)) {
      return defaultConfig;
    }

    try {
      const configData = readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configData);
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.error('Error loading config, using defaults:', error);
      return defaultConfig;
    }
  }

  async start(): Promise<void> {
    // Test embeddings service on startup
    const embeddingsWorking = await this.embeddings.testConnection();
    if (!embeddingsWorking) {
      console.error('Warning: Embeddings service not available, using fallback');
    }

    // Set up stdin/stdout communication
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        this.handleInput(chunk.toString().trim());
      }
    });

    process.stdin.on('end', () => {
      this.shutdown();
    });

    // Handle process termination
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    console.error('MCP Server started and listening on stdin/stdout');
  }

  private async handleInput(input: string): Promise<void> {
    if (!input) return;

    try {
      const request: MCPRequestTypes = JSON.parse(input);
      const response = await this.commandHandler.handleCommand(request);
      
      // Output response as JSON to stdout
      console.log(JSON.stringify(response));
    } catch (error) {
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON input',
      };
      console.log(JSON.stringify(errorResponse));
    }
  }

  private shutdown(): void {
    console.error('Shutting down MCP Server...');
    this.db.close();
    process.exit(0);
  }
}

// Start the server
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch((error) => {
    console.error('Failed to start MCP Server:', error);
    process.exit(1);
  });
}