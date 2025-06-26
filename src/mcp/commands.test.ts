import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { MCPCommandHandler } from './commands';
import { GraphDB } from '../db/graph';
import { EmbeddingsService } from '../db/embeddings';
import { Logger } from '../services/logger';

describe('MCPCommandHandler', () => {
  let handler: MCPCommandHandler;
  let db: GraphDB;
  let embeddings: EmbeddingsService;
  let logger: Logger;
  const testDbPath = 'test-mcp-commands.db';

  beforeEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Create fresh instances
    db = new GraphDB(testDbPath);
    embeddings = new EmbeddingsService();
    logger = new Logger('http://localhost:9200/test');
    handler = new MCPCommandHandler(db, embeddings, logger);

    // Mock the logger to avoid actual HTTP calls in tests
    vi.spyOn(logger, 'logEvent').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('beginTask command', () => {
    it('should start a task successfully', async () => {
      // First create a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Test Task\nA simple test task for testing',
      });

      expect(createResponse.success).toBe(true);
      const taskId = createResponse.data.tasks[0].id;

      // Now begin the task
      const beginResponse = await handler.handleCommand({
        command: 'beginTask',
        taskId,
      });

      expect(beginResponse.success).toBe(true);
      expect(beginResponse.data.task.status).toBe('in-progress');
      expect(beginResponse.data.startedAt).toBeDefined();
      expect(beginResponse.data.estimatedCompletionTime).toBeDefined();
    });

    it('should fail to start non-existent task', async () => {
      const response = await handler.handleCommand({
        command: 'beginTask',
        taskId: 'non-existent-id',
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });

    it('should fail to start already completed task', async () => {
      // Create and complete a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Test Task\nA simple test task',
      });

      const taskId = createResponse.data.tasks[0].id;

      await handler.handleCommand({
        command: 'markTaskComplete',
        taskId,
      });

      // Try to begin completed task
      const beginResponse = await handler.handleCommand({
        command: 'beginTask',
        taskId,
      });

      expect(beginResponse.success).toBe(false);
      expect(beginResponse.error).toContain('already completed');
    });
  });

  describe('markTaskComplete with time calculation', () => {
    it('should calculate actual minutes from start time', async () => {
      // Create a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Timed Task\nA task to test time calculation',
      });

      const taskId = createResponse.data.tasks[0].id;

      // Begin the task
      const beginTime = new Date();
      await handler.handleCommand({
        command: 'beginTask',
        taskId,
      });

      // Simulate some time passing (mock the start time to be 30 minutes ago)
      const task = db.getNode(taskId)!;
      const thirtyMinutesAgo = new Date(beginTime.getTime() - 30 * 60 * 1000).toISOString();
      db.updateNode(taskId, { startedAt: thirtyMinutesAgo });

      // Complete the task
      const completeResponse = await handler.handleCommand({
        command: 'markTaskComplete',
        taskId,
      });

      expect(completeResponse.success).toBe(true);
      expect(completeResponse.data.task.actualMinutes).toBeCloseTo(30, 0);
      expect(completeResponse.data.learningStats).toBeDefined();
    });

    it('should use provided actual minutes over calculated time', async () => {
      // Create and begin a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Manual Time Task\nTask with manual time entry',
      });

      const taskId = createResponse.data.tasks[0].id;
      await handler.handleCommand({ command: 'beginTask', taskId });

      // Complete with explicit time
      const completeResponse = await handler.handleCommand({
        command: 'markTaskComplete',
        taskId,
        actualMinutes: 45,
      });

      expect(completeResponse.success).toBe(true);
      expect(completeResponse.data.task.actualMinutes).toBe(45);
    });
  });

  describe('reflectTask command', () => {
    it('should add reflection successfully', async () => {
      // Create a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Reflection Task\nA task to test reflections',
      });

      const taskId = createResponse.data.tasks[0].id;

      // Add reflection
      const reflectResponse = await handler.handleCommand({
        command: 'reflectTask',
        taskId,
        note: 'This task was more complex than expected due to edge cases',
      });

      expect(reflectResponse.success).toBe(true);
      expect(reflectResponse.data.reflection.note).toBe('This task was more complex than expected due to edge cases');
      expect(reflectResponse.data.totalReflections).toBe(1);
    });

    it('should fail with missing parameters', async () => {
      const response = await handler.handleCommand({
        command: 'reflectTask',
        taskId: 'test-id',
        note: '',
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
    });
  });

  describe('generateScaffold command', () => {
    it('should generate scaffold for task', async () => {
      // Create a task
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# API Development\nImplement REST API endpoints for user management',
      });

      const taskId = createResponse.data.tasks[0].id;

      // Generate scaffold
      const scaffoldResponse = await handler.handleCommand({
        command: 'generateScaffold',
        taskId,
      });

      expect(scaffoldResponse.success).toBe(true);
      expect(scaffoldResponse.data.scaffoldPath).toBeDefined();
      expect(scaffoldResponse.data.files).toBeDefined();
      expect(scaffoldResponse.data.files.readme).toBeDefined();
      expect(scaffoldResponse.data.files.implementation).toBeDefined();
      expect(scaffoldResponse.data.files.test).toBeDefined();
    });

    it('should fail for non-existent task', async () => {
      const response = await handler.handleCommand({
        command: 'generateScaffold',
        taskId: 'non-existent',
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });
  });

  describe('hybridSearch command', () => {
    beforeEach(async () => {
      // Create some tasks for searching
      await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: `
# Authentication System
Implement JWT-based authentication with login and registration

## User Management
Create user registration, login, and profile management features

## API Security
Add middleware for protecting API endpoints
        `,
      });
    });

    it('should perform hybrid search successfully', async () => {
      const response = await handler.handleCommand({
        command: 'hybridSearch',
        query: 'authentication login security',
        k: 3,
      });

      expect(response.success).toBe(true);
      expect(response.data.results).toBeDefined();
      expect(response.data.meta).toBeDefined();
      expect(response.data.meta.searchType).toBe('hybrid');

      // Check that results have proper scores
      if (response.data.results.length > 0) {
        response.data.results.forEach((result: any) => {
          expect(result.scores).toBeDefined();
          expect(result.scores.similarity).toBeGreaterThanOrEqual(0);
          expect(result.scores.graph).toBeGreaterThanOrEqual(0);
          expect(result.scores.final).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('should handle empty query', async () => {
      const response = await handler.handleCommand({
        command: 'hybridSearch',
        query: '',
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
    });
  });

  describe('retrieveContext with hybrid search', () => {
    beforeEach(async () => {
      // Create tasks and documents for context retrieval
      await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: `
# Database Design
Design PostgreSQL schema for user data and sessions

# API Implementation  
Create REST endpoints for CRUD operations
        `,
      });

      await handler.handleCommand({
        command: 'storeDocument',
        title: 'Database Schema Documentation',
        content: 'Detailed documentation about the database schema design and relationships',
        tags: ['database', 'documentation'],
      });
    });

    it('should retrieve context using hybrid search', async () => {
      const response = await handler.handleCommand({
        command: 'retrieveContext',
        query: 'database schema design',
        limit: 3,
      });

      expect(response.success).toBe(true);
      expect(response.data.chunks).toBeDefined();
      expect(response.data.meta).toBeDefined();
      expect(response.data.searchType).toBeDefined();

      // Verify response structure
      if (response.data.chunks.length > 0) {
        const chunk = response.data.chunks[0];
        expect(chunk.id).toBeDefined();
        expect(chunk.title).toBeDefined();
        expect(chunk.content).toBeDefined();
      }
    });
  });

  describe('task workflow integration', () => {
    it('should handle complete task workflow', async () => {
      // 1. Generate tasks
      const createResponse = await handler.handleCommand({
        command: 'generateTasksFromSpec',
        specText: '# Integration Test\nComplete workflow test task',
      });

      expect(createResponse.success).toBe(true);
      const taskId = createResponse.data.tasks[0].id;

      // 2. Begin task
      const beginResponse = await handler.handleCommand({
        command: 'beginTask',
        taskId,
      });

      expect(beginResponse.success).toBe(true);
      expect(beginResponse.data.task.status).toBe('in-progress');

      // 3. Generate scaffold
      const scaffoldResponse = await handler.handleCommand({
        command: 'generateScaffold',
        taskId,
      });

      expect(scaffoldResponse.success).toBe(true);

      // 4. Complete task
      const completeResponse = await handler.handleCommand({
        command: 'markTaskComplete',
        taskId,
        actualMinutes: 30,
      });

      expect(completeResponse.success).toBe(true);
      expect(completeResponse.data.task.status).toBe('completed');

      // 5. Add reflection
      const reflectResponse = await handler.handleCommand({
        command: 'reflectTask',
        taskId,
        note: 'Task completed successfully with good time estimation',
      });

      expect(reflectResponse.success).toBe(true);

      // 6. Verify task details include all the workflow data
      const detailsResponse = await handler.handleCommand({
        command: 'getTaskDetails',
        taskId,
      });

      expect(detailsResponse.success).toBe(true);
      const task = detailsResponse.data.task;
      expect(task.status).toBe('completed');
      expect(task.startedAt).toBeDefined();
      expect(task.endedAt).toBeDefined();
      expect(task.actualMinutes).toBe(30);
    });
  });

  describe('error handling', () => {
    it('should handle invalid command gracefully', async () => {
      const response = await handler.handleCommand({
        command: 'invalidCommand',
      } as any);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown command');
    });

    it('should handle database errors gracefully', async () => {
      // Close the database to simulate error
      db.close();

      const response = await handler.handleCommand({
        command: 'listTasks',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});