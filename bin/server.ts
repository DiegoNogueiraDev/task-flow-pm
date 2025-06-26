#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GraphDB } from '../src/db/graph';
import { EmbeddingsService } from '../src/db/embeddings';
import { Logger } from '../src/services/logger';
import { MCPCommandHandler } from '../src/mcp/commands';
import { MCPConfig, MCPRequestTypes } from '../src/mcp/schema';

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

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

  private getToolDefinitions(): MCPTool[] {
    return [
      {
        name: 'generateTasksFromSpec',
        description: 'Generate tasks from a project specification text',
        inputSchema: {
          type: 'object',
          properties: {
            specText: { type: 'string', description: 'The specification text to generate tasks from' },
            projectId: { type: 'string', description: 'Optional project identifier' }
          },
          required: ['specText']
        }
      },
      {
        name: 'listTasks',
        description: 'List tasks with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'in-progress', 'completed', 'blocked'] },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 }
          }
        }
      },
      {
        name: 'getTaskDetails',
        description: 'Get detailed information about a specific task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to get details for' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'beginTask',
        description: 'Start working on a task (sets status to in-progress)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to begin' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'markTaskComplete',
        description: 'Mark a task as completed with optional time tracking',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to complete' },
            actualMinutes: { type: 'number', description: 'Actual time spent in minutes' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'getNextTask',
        description: 'Get the next recommended task to work on',
        inputSchema: {
          type: 'object',
          properties: {
            excludeIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to exclude from recommendations' }
          }
        }
      },
      {
        name: 'reflectTask',
        description: 'Add a reflection note to a task for learning purposes',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to add reflection to' },
            note: { type: 'string', description: 'The reflection note' }
          },
          required: ['taskId', 'note']
        }
      },
      {
        name: 'generateScaffold',
        description: 'Generate code scaffold for a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to generate scaffold for' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'hybridSearch',
        description: 'Search tasks using hybrid semantic and graph-based search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            k: { type: 'number', default: 5, description: 'Number of results to return' }
          },
          required: ['query']
        }
      },
      {
        name: 'storeDocument',
        description: 'Store a document with embeddings for future retrieval',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The document content' },
            title: { type: 'string', description: 'Document title' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Document tags' }
          },
          required: ['content', 'title']
        }
      },
      {
        name: 'retrieveContext',
        description: 'Retrieve relevant context for a query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The context query' },
            k: { type: 'number', default: 3, description: 'Number of contexts to return' }
          },
          required: ['query']
        }
      },
      {
        name: 'trackTaskTime',
        description: 'Start or stop time tracking for a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to track time for' },
            action: { type: 'string', enum: ['start', 'stop', 'pause', 'resume'], description: 'Time tracking action' },
            context: { type: 'string', description: 'Additional context about the work being done' }
          },
          required: ['taskId', 'action']
        }
      },
      {
        name: 'processDocument',
        description: 'Process a document using Docling and generate tasks, context, and stories',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the document file to process' },
            format: { type: 'string', enum: ['markdown', 'html', 'json'], description: 'Output format for the converted content' },
            generateTasks: { type: 'boolean', description: 'Whether to generate tasks from the document' },
            generateContext: { type: 'boolean', description: 'Whether to generate context from the document' },
            storyMapping: { type: 'boolean', description: 'Whether to extract user stories from the document' }
          },
          required: ['filePath']
        }
      },
      {
        name: 'convertDocument',
        description: 'Convert a document to text using Docling without processing',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the document file to convert' },
            format: { type: 'string', enum: ['markdown', 'html', 'json'], description: 'Output format for the converted content' }
          },
          required: ['filePath']
        }
      },
      {
        name: 'listProcessedDocuments',
        description: 'List all documents that have been processed with Docling',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  async start(): Promise<void> {
    // Test embeddings service on startup
    const embeddingsWorking = await this.embeddings.testConnection();
    if (!embeddingsWorking) {
      console.error('Warning: Embeddings service not available, using fallback');
    }

    // Set up stdin/stdout communication for MCP protocol
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          this.handleMCPRequest(line.trim());
        }
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

  private async handleMCPRequest(input: string): Promise<void> {
    try {
      const request: MCPRequest = JSON.parse(input);
      let response: MCPResponse;

      switch (request.method) {
        case 'initialize':
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                logging: {}
              },
              serverInfo: {
                name: 'task-flow-pm',
                version: '1.0.0'
              }
            }
          };
          break;

        case 'tools/list':
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: this.getToolDefinitions()
            }
          };
          break;

        case 'tools/call':
          const toolName = request.params?.name;
          const toolArgs = request.params?.arguments || {};
          
          // Convert MCP tool call to our internal command format
          const commandRequest: MCPRequestTypes = {
            command: toolName,
            ...toolArgs
          } as MCPRequestTypes;
          
          const commandResult = await this.commandHandler.handleCommand(commandRequest);
          
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: commandResult.success ? {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(commandResult.data, null, 2)
                }
              ]
            } : undefined,
            error: commandResult.success ? undefined : {
              code: -1,
              message: commandResult.error || 'Unknown error'
            }
          };
          break;

        default:
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }

      console.log(JSON.stringify(response));
    } catch (error) {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : 'Parse error'
        }
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