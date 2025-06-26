import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { GraphDB } from './graph';
import { TaskNode } from '../mcp/schema';

describe('GraphDB', () => {
  let db: GraphDB;
  const testDbPath = 'test-graph.db';

  beforeEach(() => {
    // Remove test database if it exists
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    db = new GraphDB(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('basic operations', () => {
    it('should add and retrieve nodes', () => {
      const task: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
        id: 'test-1',
        title: 'Test Task',
        description: 'Test Description',
        type: 'task',
        status: 'pending',
        estimateMinutes: 60,
        actualMinutes: 0,
        priority: 'medium',
        tags: ['test'],
      };

      const addedTask = db.addNode(task);
      expect(addedTask.id).toBe('test-1');
      expect(addedTask.createdAt).toBeDefined();

      const retrievedTask = db.getNode('test-1');
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.title).toBe('Test Task');
    });

    it('should handle task lifecycle with timestamps', () => {
      const task: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
        id: 'lifecycle-test',
        title: 'Lifecycle Test',
        description: 'Testing task lifecycle',
        type: 'task',
        status: 'pending',
        estimateMinutes: 30,
        actualMinutes: 0,
        priority: 'high',
        tags: [],
      };

      // Add task
      const addedTask = db.addNode(task);
      expect(addedTask.status).toBe('pending');
      expect(addedTask.startedAt).toBeUndefined();

      // Start task
      const startTime = new Date().toISOString();
      const startedTask = db.updateNode('lifecycle-test', {
        status: 'in-progress',
        startedAt: startTime,
      });

      expect(startedTask?.status).toBe('in-progress');
      expect(startedTask?.startedAt).toBe(startTime);

      // Complete task
      const endTime = new Date().toISOString();
      const completedTask = db.updateNode('lifecycle-test', {
        status: 'completed',
        endedAt: endTime,
        actualMinutes: 25,
      });

      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.endedAt).toBe(endTime);
      expect(completedTask?.actualMinutes).toBe(25);
    });
  });

  describe('hybrid search', () => {
    beforeEach(() => {
      // Add test tasks for search
      const tasks = [
        {
          id: 'search-1',
          title: 'Authentication System',
          description: 'Implement user authentication with JWT tokens',
          type: 'task' as const,
          status: 'pending' as const,
          estimateMinutes: 120,
          actualMinutes: 0,
          priority: 'high' as const,
          tags: ['auth', 'security'],
        },
        {
          id: 'search-2',
          title: 'Database Schema',
          description: 'Design and implement database schema for users',
          type: 'task' as const,
          status: 'completed' as const,
          estimateMinutes: 60,
          actualMinutes: 75,
          priority: 'medium' as const,
          tags: ['database', 'schema'],
        },
        {
          id: 'search-3',
          title: 'API Endpoints',
          description: 'Create REST API endpoints for authentication',
          type: 'task' as const,
          status: 'in-progress' as const,
          estimateMinutes: 90,
          actualMinutes: 0,
          priority: 'high' as const,
          tags: ['api', 'auth'],
        },
      ];

      tasks.forEach(task => db.addNode(task));

      // Add some edges for graph scoring
      db.addEdge({
        id: 'edge-1',
        fromId: 'search-3',
        toId: 'search-1',
        type: 'depends_on',
      });

      db.addEdge({
        id: 'edge-2',
        fromId: 'search-1',
        toId: 'search-2',
        type: 'depends_on',
      });
    });

    it('should perform hybrid search and return ranked results', () => {
      const results = db.hybridSearch('authentication', 3);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Results should be sorted by final score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].finalScore).toBeGreaterThanOrEqual(results[i].finalScore);
      }

      // Check that scores are properly calculated
      results.forEach(result => {
        expect(result.simScore).toBeGreaterThanOrEqual(0);
        expect(result.simScore).toBeLessThanOrEqual(1);
        expect(result.graphScore).toBeGreaterThanOrEqual(0);
        expect(result.graphScore).toBeLessThanOrEqual(1);
        expect(result.finalScore).toBeGreaterThanOrEqual(0);
        expect(result.finalScore).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty results for non-matching query', () => {
      const results = db.hybridSearch('nonexistent topic xyz', 5);
      expect(results).toBeDefined();
      // May return some results due to fallback vector similarity, but scores should be low
      if (results.length > 0) {
        results.forEach(result => {
          expect(result.finalScore).toBeLessThan(0.5);
        });
      }
    });

    it('should respect the k parameter', () => {
      const results1 = db.hybridSearch('authentication', 1);
      const results2 = db.hybridSearch('authentication', 2);
      
      expect(results1.length).toBeLessThanOrEqual(1);
      expect(results2.length).toBeLessThanOrEqual(2);
      expect(results2.length).toBeGreaterThanOrEqual(results1.length);
    });
  });

  describe('reflections system', () => {
    beforeEach(() => {
      const task: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
        id: 'reflection-task',
        title: 'Task with Reflections',
        description: 'A task to test reflections',
        type: 'task',
        status: 'completed',
        estimateMinutes: 60,
        actualMinutes: 90,
        priority: 'medium',
        tags: [],
      };
      db.addNode(task);
    });

    it('should add and retrieve reflections', () => {
      const reflection = db.addReflection({
        id: 'reflection-1',
        taskId: 'reflection-task',
        note: 'This task took longer than expected due to unexpected complexity',
      });

      expect(reflection.id).toBe('reflection-1');
      expect(reflection.timestamp).toBeDefined();

      const reflections = db.getReflections('reflection-task');
      expect(reflections.length).toBe(1);
      expect(reflections[0].note).toBe('This task took longer than expected due to unexpected complexity');
    });

    it('should handle multiple reflections for same task', () => {
      db.addReflection({
        id: 'reflection-1',
        taskId: 'reflection-task',
        note: 'First reflection',
      });

      db.addReflection({
        id: 'reflection-2',
        taskId: 'reflection-task',
        note: 'Second reflection',
      });

      const reflections = db.getReflections('reflection-task');
      expect(reflections.length).toBe(2);
      
      // Should be ordered by timestamp (most recent first)
      expect(new Date(reflections[0].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(reflections[1].timestamp).getTime());
    });
  });

  describe('estimation analytics', () => {
    beforeEach(() => {
      // Add completed tasks with various estimation accuracies
      const completedTasks = [
        {
          id: 'accurate-task',
          estimateMinutes: 60,
          actualMinutes: 65, // 8.3% over
        },
        {
          id: 'underestimated-task',
          estimateMinutes: 30,
          actualMinutes: 45, // 50% over
        },
        {
          id: 'overestimated-task',
          estimateMinutes: 120,
          actualMinutes: 90, // 25% under
        },
      ];

      completedTasks.forEach((taskData, index) => {
        const task: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
          id: taskData.id,
          title: `Completed Task ${index + 1}`,
          description: 'A completed task for testing',
          type: 'task',
          status: 'completed',
          estimateMinutes: taskData.estimateMinutes,
          actualMinutes: taskData.actualMinutes,
          priority: 'medium',
          tags: [],
        };
        db.addNode(task);
      });
    });

    it('should calculate estimation variances correctly', () => {
      const variances = db.getEstimationVariances(10);
      
      expect(variances.length).toBe(3);
      
      // Check variance calculations
      const accurateTask = variances.find(v => v.taskId === 'accurate-task');
      expect(accurateTask?.variance).toBeCloseTo(8.33, 1); // (65-60)/60 * 100

      const underestimatedTask = variances.find(v => v.taskId === 'underestimated-task');
      expect(underestimatedTask?.variance).toBeCloseTo(50, 1); // (45-30)/30 * 100

      const overestimatedTask = variances.find(v => v.taskId === 'overestimated-task');
      expect(overestimatedTask?.variance).toBeCloseTo(-25, 1); // (90-120)/120 * 100
    });

    it('should limit results by the specified limit', () => {
      const variances = db.getEstimationVariances(2);
      expect(variances.length).toBe(2);
    });

    it('should return empty array when no completed tasks exist', () => {
      const emptyDb = new GraphDB('empty-test.db');
      const variances = emptyDb.getEstimationVariances(10);
      expect(variances.length).toBe(0);
      emptyDb.close();
      if (existsSync('empty-test.db')) {
        unlinkSync('empty-test.db');
      }
    });
  });

  describe('settings system', () => {
    it('should store and retrieve settings', () => {
      db.setSetting('test_key', 'test_value');
      
      const value = db.getSetting('test_key');
      expect(value).toBe('test_value');
    });

    it('should update existing settings', () => {
      db.setSetting('update_key', 'initial_value');
      db.setSetting('update_key', 'updated_value');
      
      const value = db.getSetting('update_key');
      expect(value).toBe('updated_value');
    });

    it('should return null for non-existent settings', () => {
      const value = db.getSetting('non_existent_key');
      expect(value).toBeNull();
    });

    it('should retrieve all settings', () => {
      db.setSetting('key1', 'value1');
      db.setSetting('key2', 'value2');
      
      const allSettings = db.getAllSettings();
      expect(allSettings.length).toBe(2);
      
      const setting1 = allSettings.find(s => s.key === 'key1');
      const setting2 = allSettings.find(s => s.key === 'key2');
      
      expect(setting1?.value).toBe('value1');
      expect(setting2?.value).toBe('value2');
    });
  });

  describe('migration and schema updates', () => {
    it('should handle database migration gracefully', () => {
      // Create a basic task to ensure schema is working
      const task: Omit<TaskNode, 'createdAt' | 'updatedAt'> = {
        id: 'migration-test',
        title: 'Migration Test',
        description: 'Testing database migration',
        type: 'task',
        status: 'pending',
        estimateMinutes: 30,
        actualMinutes: 0,
        priority: 'low',
        tags: [],
      };

      const addedTask = db.addNode(task);
      expect(addedTask).toBeDefined();
      
      // Verify new columns are available
      expect(addedTask.startedAt).toBeUndefined();
      expect(addedTask.endedAt).toBeUndefined();
    });
  });
});