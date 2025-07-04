export interface MCPConfig {
    dbPath: string;
    embeddingsModel: string;
    esEndpoint: string;
    contextTokens: number;
    user?: {
      id: string;
      name: string;
      team: string;
      role: string;
      location: string;
      machine: string;
      startTime: string;
      ip: string;
      timezone: string;
    };
    monitoring?: {
      enabled: boolean;
      level: 'basic' | 'detailed' | 'debug';
      includeGeoLocation: boolean;
      includeSystemMetrics: boolean;
      trackIdleTime: boolean;
      trackWorkPatterns: boolean;
      flushInterval: number;
      batchSize: number;
      retryAttempts: number;
    };
  }
  
  export interface TaskNode {
    id: string;
    title: string;
    description: string;
    type: 'epic' | 'story' | 'task' | 'subtask';
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    estimateMinutes: number;
    actualMinutes: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    endedAt?: string;
    parentId?: string;
  }
  
  export interface TaskEdge {
    id: string;
    fromId: string;
    toId: string;
    type: 'depends_on' | 'blocks' | 'child_of' | 'related_to';
    createdAt: string;
  }
  
  export interface EmbeddingRecord {
    id: string;
    nodeId: string;
    text: string;
    vector: number[];
    createdAt: string;
  }
  
  export interface MCPCommand {
    command: string;
    [key: string]: any;
  }
  
  export interface MCPResponse {
    success: boolean;
    data?: any;
    error?: string;
  }
  
  export interface GenerateTasksRequest {
    command: 'generateTasksFromSpec';
    specText: string;
    projectId?: string;
  }
  
  export interface ListTasksRequest {
    command: 'listTasks';
    status?: string;
    limit?: number;
    offset?: number;
  }
  
  export interface GetTaskDetailsRequest {
    command: 'getTaskDetails';
    taskId: string;
  }
  
  export interface MarkTaskCompleteRequest {
    command: 'markTaskComplete';
    taskId: string;
    actualMinutes?: number;
  }
  
  export interface GetNextTaskRequest {
    command: 'getNextTask';
    excludeIds?: string[];
  }
  
  export interface BeginTaskRequest {
    command: 'beginTask';
    taskId: string;
  }
  
  export interface ReflectTaskRequest {
    command: 'reflectTask';
    taskId: string;
    note: string;
  }
  
  export interface GenerateScaffoldRequest {
    command: 'generateScaffold';
    taskId: string;
  }
  
  export interface HybridSearchRequest {
    command: 'hybridSearch';
    query: string;
    k?: number;
  }
  
  export interface StoreDocumentRequest {
    command: 'storeDocument';
    title: string;
    content: string;
    tags?: string[];
  }
  
  export interface RetrieveContextRequest {
    command: 'retrieveContext';
    query: string;
    limit?: number;
  }
  
  export interface MetricEvent {
    type: 'task_created' | 'task_started' | 'task_completed' | 'task_status_change' | 'reflection_added' | 'time_tracking' | 'user_activity' | 'enhanced_user_metrics';
    taskId: string;
    oldStatus?: string;
    newStatus?: string;
    estimate?: number;
    actualMinutes?: number;
    timestamp: string;
    note?: string;
    metadata?: Record<string, any>;
  }
  
  export interface TaskReflection {
    id: string;
    taskId: string;
    note: string;
    timestamp: string;
  }
  
  export interface SystemSetting {
    key: string;
    value: string;
    updatedAt: string;
  }
  
  export interface HybridSearchResult {
    node: TaskNode;
    simScore: number;
    graphScore: number;
    finalScore: number;
  }
  
  export interface TrackTaskTimeRequest {
  command: 'trackTaskTime';
  taskId: string;
  action: 'start' | 'stop' | 'pause' | 'resume';
  context?: string;
}

export interface ProcessDocumentRequest {
  command: 'processDocument';
  filePath: string;
  format?: 'markdown' | 'html' | 'json';
  generateTasks?: boolean;
  generateContext?: boolean;
  storyMapping?: boolean;
}

export interface ConvertDocumentRequest {
  command: 'convertDocument';
  filePath: string;
  format?: 'markdown' | 'html' | 'json';
}

export interface ListProcessedDocumentsRequest {
  command: 'listProcessedDocuments';
}
  
  export interface TimeTrackingSession {
    id: string;
    taskId: string;
    startTime: Date;
    endTime?: Date;
    pausedTime: number; // milliseconds
    context?: string;
    status: 'active' | 'paused' | 'completed';
  }
  
  export interface ELKMetrics {
    timestamp: string;
    taskId: string;
    action: string;
    duration?: number; // milliseconds
    context?: string;
    taskTitle?: string;
    taskType?: string;
    estimatedMinutes?: number;
    actualMinutes?: number;
    accuracy?: number; // percentage
    userId?: string;
    sessionId: string;
  }
  
  export type MCPRequestTypes = 
  | GenerateTasksRequest 
  | ListTasksRequest 
  | GetTaskDetailsRequest 
  | MarkTaskCompleteRequest 
  | GetNextTaskRequest 
  | BeginTaskRequest 
  | ReflectTaskRequest 
  | GenerateScaffoldRequest 
  | HybridSearchRequest 
  | StoreDocumentRequest 
  | RetrieveContextRequest
  | TrackTaskTimeRequest
  | ProcessDocumentRequest
  | ConvertDocumentRequest
  | ListProcessedDocumentsRequest;