import { GraphDB } from '../db/graph';
import { EmbeddingsService } from '../db/embeddings';
import { TaskPlanner } from '../services/planner';
import { Logger } from '../services/logger';
import { EffortEstimator } from '../services/effort';
import { ScaffoldGenerator } from '../services/scaffold';
import { TimeTracker } from '../services/time-tracker';
import { doclingService } from '../services/docling';
import { 
MCPRequestTypes, 
MCPResponse, 
TaskNode,
GenerateTasksRequest,
ListTasksRequest,
GetTaskDetailsRequest,
MarkTaskCompleteRequest,
GetNextTaskRequest,
BeginTaskRequest,
ReflectTaskRequest,
GenerateScaffoldRequest,
HybridSearchRequest,
StoreDocumentRequest,
RetrieveContextRequest,
TrackTaskTimeRequest,
ProcessDocumentRequest,
ListProcessedDocumentsRequest,
ConvertDocumentRequest
} from './schema';
import { randomUUID } from 'crypto';

export class MCPCommandHandler {
private db: GraphDB;
private embeddings: EmbeddingsService;
private logger: Logger;
private scaffoldGenerator: ScaffoldGenerator;
private timeTracker: TimeTracker;

constructor(db: GraphDB, embeddings: EmbeddingsService, logger: Logger) {
  this.db = db;
  this.embeddings = embeddings;
  this.logger = logger;
  this.scaffoldGenerator = new ScaffoldGenerator();
  this.timeTracker = new TimeTracker(logger.isEnabled() ? (logger as any).esEndpoint : undefined);
}

async handleCommand(request: MCPRequestTypes): Promise<MCPResponse> {
  try {
    switch (request.command) {
      case 'generateTasksFromSpec':
        return await this.generateTasksFromSpec(request as GenerateTasksRequest);
      case 'listTasks':
        return await this.listTasks(request as ListTasksRequest);
      case 'getTaskDetails':
        return await this.getTaskDetails(request as GetTaskDetailsRequest);
      case 'markTaskComplete':
        return await this.markTaskComplete(request as MarkTaskCompleteRequest);
      case 'getNextTask':
        return await this.getNextTask(request as GetNextTaskRequest);
      case 'beginTask':
        return await this.beginTask(request as BeginTaskRequest);
      case 'reflectTask':
        return await this.reflectTask(request as ReflectTaskRequest);
      case 'generateScaffold':
        return await this.generateScaffold(request as GenerateScaffoldRequest);
      case 'hybridSearch':
        return await this.hybridSearch(request as HybridSearchRequest);
      case 'storeDocument':
        return await this.storeDocument(request as StoreDocumentRequest);
      case 'retrieveContext':
        return await this.retrieveContext(request as RetrieveContextRequest);
      case 'trackTaskTime':
        return await this.trackTaskTime(request as TrackTaskTimeRequest);
      case 'processDocument':
        return await this.processDocument(request as ProcessDocumentRequest);
      case 'convertDocument':
        return await this.convertDocument(request as ConvertDocumentRequest);
      case 'listProcessedDocuments':
        return await this.listProcessedDocuments(request as ListProcessedDocumentsRequest);
      default:
        return {
          success: false,
          error: `Unknown command: ${(request as any).command}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

private async generateTasksFromSpec(request: GenerateTasksRequest): Promise<MCPResponse> {
  const { specText, projectId } = request;
  
  if (!specText || specText.trim().length === 0) {
    return {
      success: false,
      error: 'specText is required and cannot be empty',
    };
  }

  // Generate tasks using the planner
  const planResult = await TaskPlanner.plan(specText);
  
  // Store tasks in the database
  const storedTasks: TaskNode[] = [];
  
  for (const task of planResult.tasks) {
    const storedTask = this.db.addNode(task);
    storedTasks.push(storedTask);
    
    // Log task creation
    this.logger.logTaskCreated(storedTask.id, storedTask.estimateMinutes);
    
    // Generate and store embeddings
    const embeddingText = `${task.title} ${task.description}`;
    try {
      const vector = await this.embeddings.generateEmbedding(embeddingText);
      this.db.addEmbedding({
        id: randomUUID(),
        nodeId: task.id,
        text: embeddingText,
        vector,
      });
    } catch (error) {
      console.warn(`Failed to generate embedding for task ${task.id}:`, error);
    }
  }
  
  // Store dependencies as edges
  for (const dep of planResult.dependencies) {
    this.db.addEdge({
      id: randomUUID(),
      fromId: dep.fromId,
      toId: dep.toId,
      type: dep.type,
    });
  }

  return {
    success: true,
    data: {
      tasksCreated: storedTasks.length,
      dependenciesCreated: planResult.dependencies.length,
      tasks: storedTasks,
      projectId: projectId || 'default',
    },
  };
}

private async listTasks(request: ListTasksRequest): Promise<MCPResponse> {
  const { status, limit = 50, offset = 0 } = request;
  
  const tasks = this.db.listTasks({
    status,
    limit,
    offset,
  });

  return {
    success: true,
    data: {
      tasks,
      total: tasks.length,
      limit,
      offset,
    },
  };
}

private async getTaskDetails(request: GetTaskDetailsRequest): Promise<MCPResponse> {
  const { taskId } = request;
  
  if (!taskId) {
    return {
      success: false,
      error: 'taskId is required',
    };
  }

  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  // Get related tasks
  const children = this.db.getChildren(taskId);
  const dependencies = this.db.getDependencies(taskId);
  const blocking = this.db.getBlocking(taskId);

  return {
    success: true,
    data: {
      task,
      children,
      dependencies,
      blocking,
      canStart: blocking.filter(t => t.status !== 'completed').length === 0,
    },
  };
}

private async markTaskComplete(request: MarkTaskCompleteRequest): Promise<MCPResponse> {
  const { taskId, actualMinutes } = request;
  
  if (!taskId) {
    return {
      success: false,
      error: 'taskId is required',
    };
  }

  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  if (task.status === 'completed') {
    return {
      success: false,
      error: 'Task is already completed',
    };
  }

  // Update task status and calculate actual minutes
  const oldStatus = task.status;
  let calculatedActualMinutes = actualMinutes || task.actualMinutes;
  
  // Calculate actual minutes if task was started
  if (task.startedAt && !actualMinutes) {
    const startTime = new Date(task.startedAt).getTime();
    const endTime = new Date().getTime();
    calculatedActualMinutes = Math.round((endTime - startTime) / (1000 * 60));
  }

  const updatedTask = this.db.updateNode(taskId, {
    status: 'completed',
    actualMinutes: calculatedActualMinutes,
    endedAt: new Date().toISOString(),
  });

  if (!updatedTask) {
    return {
      success: false,
      error: 'Failed to update task',
    };
  }

  // Update learning from completion
  EffortEstimator.updateLearningFromCompletion(
    taskId,
    task.estimateMinutes,
    calculatedActualMinutes,
    this.db
  );

  // Log the status change and completion
  this.logger.logTaskStatusChange(
    taskId,
    oldStatus,
    'completed',
    task.estimateMinutes,
    calculatedActualMinutes
  );

  this.logger.logTaskCompleted(
    taskId,
    task.estimateMinutes,
    calculatedActualMinutes
  );

  // Auto-stop time tracking and get actual minutes from tracking
  const trackedMinutes = await this.timeTracker.autoStopForTask(taskId);
  if (trackedMinutes > 0 && !actualMinutes) {
    // Update task with more accurate tracked time
    const finalUpdatedTask = this.db.updateNode(taskId, {
      actualMinutes: trackedMinutes,
    });
    
    // Send final metrics to ELK
    await this.timeTracker.sendTaskCompleteMetrics(taskId, task, trackedMinutes);
    
    return {
      success: true,
      data: {
        task: finalUpdatedTask || updatedTask,
        actualMinutes: trackedMinutes,
        timeTracked: true,
        variance: trackedMinutes ? 
          ((trackedMinutes - task.estimateMinutes) / task.estimateMinutes) * 100 : 0,
        learningStats: EffortEstimator.getLearningStats(this.db),
      },
    };
  }

  return {
    success: true,
    data: {
      task: updatedTask,
      actualMinutes: calculatedActualMinutes,
      timeTracked: false,
      variance: calculatedActualMinutes ? 
        ((calculatedActualMinutes - task.estimateMinutes) / task.estimateMinutes) * 100 : 0,
      learningStats: EffortEstimator.getLearningStats(this.db),
    },
  };
}

// 🔄 Begin Task - New Command
private async beginTask(request: BeginTaskRequest): Promise<MCPResponse> {
  const { taskId } = request;
  
  if (!taskId) {
    return {
      success: false,
      error: 'taskId is required',
    };
  }

  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  if (task.status === 'completed') {
    return {
      success: false,
      error: 'Task is already completed',
    };
  }

  if (task.status === 'in-progress') {
    return {
      success: false,
      error: 'Task is already in progress',
    };
  }

  // Check if dependencies are met
  const blocking = this.db.getBlocking(taskId);
  const incompleteDependencies = blocking.filter(dep => dep.status !== 'completed');
  
  if (incompleteDependencies.length > 0) {
    return {
      success: false,
      error: `Task is blocked by ${incompleteDependencies.length} incomplete dependencies`,
      data: { blocking: incompleteDependencies },
    };
  }

  // Update task to in-progress
  const startTime = new Date().toISOString();
  const updatedTask = this.db.updateNode(taskId, {
    status: 'in-progress',
    startedAt: startTime,
  });

  if (!updatedTask) {
    return {
      success: false,
      error: 'Failed to update task',
    };
  }

  // Log task started
  this.logger.logTaskStarted(taskId, task.estimateMinutes);
  this.logger.logTaskStatusChange(taskId, task.status, 'in-progress', task.estimateMinutes);

  // Auto-start time tracking
  await this.timeTracker.autoStartForTask(taskId, 'Auto-started when task began');

  return {
    success: true,
    data: {
      task: updatedTask,
      startedAt: startTime,
      estimatedCompletionTime: new Date(Date.now() + task.estimateMinutes * 60000).toISOString(),
      timeTrackingStarted: true,
    },
  };
}

// 🪞 Reflect Task - New Command
private async reflectTask(request: ReflectTaskRequest): Promise<MCPResponse> {
  const { taskId, note } = request;
  
  if (!taskId || !note) {
    return {
      success: false,
      error: 'taskId and note are required',
    };
  }

  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  // Add reflection
  const reflection = this.db.addReflection({
    id: randomUUID(),
    taskId,
    note,
  });

  // Log reflection added
  this.logger.logReflectionAdded(taskId, note);

  return {
    success: true,
    data: {
      reflection,
      task: task.title,
      totalReflections: this.db.getReflections(taskId).length,
    },
  };
}

// 🏗️ Generate Scaffold - New Command
private async generateScaffold(request: GenerateScaffoldRequest): Promise<MCPResponse> {
  const { taskId } = request;
  
  if (!taskId) {
    return {
      success: false,
      error: 'taskId is required',
    };
  }

  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  try {
    const scaffoldResult = this.scaffoldGenerator.generateScaffold(task);
    
    return {
      success: true,
      data: {
        taskId,
        scaffoldPath: scaffoldResult.baseDir,
        files: scaffoldResult.files,
        task: {
          title: task.title,
          type: task.type,
          estimate: task.estimateMinutes,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate scaffold',
    };
  }
}

// 🔍 Hybrid Search - New Command
private async hybridSearch(request: HybridSearchRequest): Promise<MCPResponse> {
  const { query, k = 5 } = request;
  
  if (!query) {
    return {
      success: false,
      error: 'query is required',
    };
  }

  try {
    const results = this.db.hybridSearch(query, k);
    
    return {
      success: true,
      data: {
        query,
        results: results.map(result => ({
          task: result.node,
          scores: {
            similarity: result.simScore,
            graph: result.graphScore,
            final: result.finalScore,
          },
        })),
        meta: {
          totalFound: results.length,
          searchType: 'hybrid',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Hybrid search failed',
    };
  }
}

private async getNextTask(request: GetNextTaskRequest): Promise<MCPResponse> {
  const { excludeIds = [] } = request;
  
  // Get all pending tasks
  const pendingTasks = this.db.listTasks({ status: 'pending' });
  
  // Filter out excluded tasks
  const availableTasks = pendingTasks.filter(task => !excludeIds.includes(task.id));
  
  // Find tasks that have no blocking dependencies
  const readyTasks: TaskNode[] = [];
  
  for (const task of availableTasks) {
    const blocking = this.db.getBlocking(task.id);
    const incompleteDependencies = blocking.filter(dep => dep.status !== 'completed');
    
    if (incompleteDependencies.length === 0) {
      readyTasks.push(task);
    }
  }
  
  if (readyTasks.length === 0) {
    return {
      success: true,
      data: {
        task: null,
        message: 'No ready tasks available',
      },
    };
  }
  
  // Sort by priority and creation date
  readyTasks.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // If same priority, prefer smaller tasks (quicker wins)
    return a.estimateMinutes - b.estimateMinutes;
  });

  return {
    success: true,
    data: {
      task: readyTasks[0],
      alternativeTasks: readyTasks.slice(1, 4), // Next 3 options
    },
  };
}

private async storeDocument(request: StoreDocumentRequest): Promise<MCPResponse> {
  const { title, content, tags = [] } = request;
  
  if (!title || !content) {
    return {
      success: false,
      error: 'title and content are required',
    };
  }

  // Create a document node
  const documentNode: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
    id: randomUUID(),
    title,
    description: content,
    type: 'task', // Documents are stored as special tasks
    status: 'completed', // Documents are always "complete"
    estimateMinutes: 0,
    actualMinutes: 0,
    priority: 'low',
    tags: [...tags, 'document'],
  };

  const storedNode = this.db.addNode(documentNode);
  
  // Generate and store embeddings for searchability
  try {
    const embeddingText = `${title} ${content}`;
    const vector = await this.embeddings.generateEmbedding(embeddingText);
    this.db.addEmbedding({
      id: randomUUID(),
      nodeId: storedNode.id,
      text: embeddingText,
      vector,
    });
  } catch (error) {
    console.warn(`Failed to generate embedding for document ${storedNode.id}:`, error);
  }

  return {
    success: true,
    data: {
      documentId: storedNode.id,
      document: storedNode,
    },
  };
}

private async retrieveContext(request: RetrieveContextRequest): Promise<MCPResponse> {
  const { query, limit = 5 } = request;
  
  if (!query) {
    return {
      success: false,
      error: 'query is required',
    };
  }

  try {
    // Use hybrid search for better context retrieval
    const hybridResults = this.db.hybridSearch(query, limit);
    
    if (hybridResults.length > 0) {
      return {
        success: true,
        data: {
          query,
          chunks: hybridResults.map(result => ({
            id: result.node.id,
            title: result.node.title,
            content: result.node.description,
            type: result.node.type,
            tags: result.node.tags,
          })),
          meta: hybridResults.map(result => ({
            id: result.node.id,
            simScore: result.simScore,
            graphScore: result.graphScore,
            finalScore: result.finalScore,
          })),
          searchType: 'hybrid',
        },
      };
    }

    // Fallback to embedding search if hybrid fails
    const queryVector = await this.embeddings.generateEmbedding(query);
    const similarEmbeddings = this.db.searchEmbeddings(queryVector, limit);
    
    const contextNodes: Array<TaskNode & { similarity: number }> = [];
    
    for (const embedding of similarEmbeddings) {
      const node = this.db.getNode(embedding.nodeId);
      if (node) {
        contextNodes.push({
          ...node,
          similarity: embedding.similarity,
        });
      }
    }

    return {
      success: true,
      data: {
        query,
        chunks: contextNodes.map(node => ({
          id: node.id,
          title: node.title,
          content: node.description,
          type: node.type,
          tags: node.tags,
        })),
        meta: contextNodes.map(node => ({
          id: node.id,
          simScore: node.similarity,
          graphScore: 0,
          finalScore: node.similarity,
        })),
        searchType: 'embedding_fallback',
      },
    };
  } catch (error) {
    // Final fallback to simple text search
    const allTasks = this.db.listTasks({});
    const lowerQuery = query.toLowerCase();
    
    const matchingTasks = allTasks
      .filter(task => 
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description.toLowerCase().includes(lowerQuery) ||
        task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);

    return {
      success: true,
      data: {
        query,
        chunks: matchingTasks.map(task => ({
          id: task.id,
          title: task.title,
          content: task.description,
          type: task.type,
          tags: task.tags,
        })),
        meta: matchingTasks.map(task => ({
          id: task.id,
          simScore: 0.5,
          graphScore: 0,
          finalScore: 0.5,
        })),
        searchType: 'text_fallback',
        fallbackUsed: true,
      },
    };
  }
}

private async trackTaskTime(request: TrackTaskTimeRequest): Promise<MCPResponse> {
  const { taskId, action, context } = request;
  
  if (!taskId || !action) {
    return {
      success: false,
      error: 'taskId and action are required',
    };
  }

  // Verify task exists
  const task = this.db.getNode(taskId);
  if (!task) {
    return {
      success: false,
      error: `Task with id ${taskId} not found`,
    };
  }

  try {
    let session;
    let duration = 0;

    switch (action) {
      case 'start':
        session = await this.timeTracker.startTracking(taskId, context);
        return {
          success: true,
          data: {
            action: 'started',
            sessionId: session.id,
            startTime: session.startTime.toISOString(),
            message: `Time tracking started for task: ${task.title}`,
          },
        };

      case 'stop':
        session = await this.timeTracker.stopTracking(taskId);
        if (session && session.endTime) {
          duration = Math.round((session.endTime.getTime() - session.startTime.getTime() - session.pausedTime) / (1000 * 60));
          
          // Auto-update task with actual time
          const actualTime = duration > 0 ? duration : 1; // Minimum 1 minute
          
          // Send completion metrics to ELK
          await this.timeTracker.sendTaskCompleteMetrics(taskId, task, actualTime);
          
          return {
            success: true,
            data: {
              action: 'stopped',
              sessionId: session.id,
              duration,
              actualMinutes: actualTime,
              message: `Time tracking stopped. Duration: ${actualTime} minutes`,
            },
          };
        } else {
          return {
            success: false,
            error: 'No active tracking session found for this task',
          };
        }

      case 'pause':
        session = await this.timeTracker.pauseTracking(taskId);
        if (session) {
          return {
            success: true,
            data: {
              action: 'paused',
              sessionId: session.id,
              message: 'Time tracking paused',
            },
          };
        } else {
          return {
            success: false,
            error: 'No active tracking session found to pause',
          };
        }

      case 'resume':
        session = await this.timeTracker.resumeTracking(taskId);
        if (session) {
          return {
            success: true,
            data: {
              action: 'resumed',
              sessionId: session.id,
              message: 'Time tracking resumed',
            },
          };
        } else {
          return {
            success: false,
            error: 'No paused tracking session found to resume',
          };
        }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}. Valid actions are: start, stop, pause, resume`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Time tracking operation failed',
    };
  }
}

  private async processDocument(request: ProcessDocumentRequest): Promise<MCPResponse> {
    const { filePath, format = 'markdown', generateTasks = true, generateContext = true, storyMapping = false } = request;
    
    if (!filePath) {
      return {
        success: false,
        error: 'filePath is required',
      };
    }

    try {
      const processed = await doclingService.processDocument(filePath, {
        format,
        generateTasks,
        generateContext,
        storyMapping,
      });

      // Se gerou tarefas, armazená-las no banco
      if (processed.tasks && processed.tasks.length > 0) {
        for (const task of processed.tasks) {
                     const storedTask = this.db.addNode({
             id: task.id,
             title: task.title,
             description: task.description,
             type: task.type,
             status: 'pending',
             priority: task.priority,
             estimateMinutes: task.estimatedMinutes,
             actualMinutes: 0,
             tags: [`docling-${task.source}`, 'auto-generated'],
           });

          // Log task creation
          this.logger.logTaskCreated(storedTask.id, storedTask.estimateMinutes);

          // Generate and store embeddings
          const embeddingText = `${task.title} ${task.description}`;
          try {
            const vector = await this.embeddings.generateEmbedding(embeddingText);
            this.db.addEmbedding({
              id: randomUUID(),
              nodeId: task.id,
              text: embeddingText,
              vector,
            });
          } catch (error) {
            console.warn(`Failed to generate embedding for task ${task.id}:`, error);
          }
        }
      }

      // Se gerou contexto, armazená-lo
      if (processed.context && processed.context.length > 0) {
        for (const ctx of processed.context) {
          const contextText = `${ctx.title || 'Context'} ${ctx.content || ctx.text || ''}`;
          try {
            await this.storeDocument({
              command: 'storeDocument',
              content: contextText,
              title: ctx.title || 'Generated Context',
              tags: [`docling-context`, ...(ctx.tags || [])],
            });
          } catch (error) {
            console.warn(`Failed to store context ${ctx.id || 'unknown'}:`, error);
          }
        }
      }

      return {
        success: true,
        data: {
          documentId: processed.id,
          sourceFile: processed.sourceFile,
          tasksGenerated: processed.tasks?.length || 0,
          contextGenerated: processed.context?.length || 0,
          storiesGenerated: processed.stories?.length || 0,
          metadata: processed.metadata,
          processedAt: processed.processedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document processing failed',
      };
    }
  }

  private async convertDocument(request: ConvertDocumentRequest): Promise<MCPResponse> {
    const { filePath, format = 'markdown' } = request;
    
    if (!filePath) {
      return {
        success: false,
        error: 'filePath is required',
      };
    }

    try {
      const result = await doclingService.convertDocument(filePath, format);

      return {
        success: true,
        data: {
          content: result.content,
          metadata: result.metadata,
          format: result.metadata?.format || 'unknown',
          sourceFile: filePath,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document conversion failed',
      };
    }
  }

  private async listProcessedDocuments(request: ListProcessedDocumentsRequest): Promise<MCPResponse> {
    try {
      const documents = doclingService.getProcessedDocuments();

      return {
        success: true,
        data: {
          documents: documents.map(doc => ({
            id: doc.id,
            sourceFile: doc.sourceFile,
            tasksCount: doc.tasks?.length || 0,
            contextCount: doc.context?.length || 0,
            storiesCount: doc.stories?.length || 0,
            processedAt: doc.processedAt,
            metadata: {
              title: doc.metadata.title,
              pageCount: doc.metadata.page_count,
              textLength: doc.metadata.text_length,
            },
          })),
          total: documents.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list processed documents',
      };
    }
  }
}