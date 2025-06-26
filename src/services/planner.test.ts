import { describe, it, expect } from 'vitest';
import { TaskPlanner } from './planner';

describe('TaskPlanner', () => {
  describe('plan', () => {
    it('should generate tasks from a simple specification', async () => {
      const spec = `
# Login System

## Authentication
User registration and login functionality

## Dashboard  
Main user interface after login
      `;

      const result = await TaskPlanner.plan(spec);

      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.dependencies).toBeDefined();
      
      // Should have at least one epic
      const epics = result.tasks.filter(t => t.type === 'epic');
      expect(epics.length).toBeGreaterThan(0);
      
      // Should have stories and tasks
      const stories = result.tasks.filter(t => t.type === 'story');
      const tasks = result.tasks.filter(t => t.type === 'task');
      
      expect(stories.length).toBeGreaterThan(0);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should create child relationships between tasks', async () => {
      const spec = `
# Simple Feature
Basic feature implementation
      `;

      const result = await TaskPlanner.plan(spec);
      
      // Should have child_of relationships
      const childRelations = result.dependencies.filter(d => d.type === 'child_of');
      expect(childRelations.length).toBeGreaterThan(0);
    });

    it('should assign appropriate priorities', async () => {
      const spec = `
# Critical System
This is a critical high priority system
      `;

      const result = await TaskPlanner.plan(spec);
      
      // Should detect priority from content
      const highPriorityTasks = result.tasks.filter(t => 
        t.priority === 'high' || t.priority === 'critical'
      );
      expect(highPriorityTasks.length).toBeGreaterThan(0);
    });

    it('should generate estimates for all tasks', async () => {
      const spec = `
# Test Feature
Simple test feature
      `;

      const result = await TaskPlanner.plan(spec);
      
      // All tasks should have estimates
      result.tasks.forEach(task => {
        expect(task.estimateMinutes).toBeGreaterThan(0);
      });
    });

    it('should extract relevant tags', async () => {
      const spec = `
# API Development
Build REST API with authentication and database integration
      `;

      const result = await TaskPlanner.plan(spec);
      
      // Should extract tech-related tags
      const allTags = result.tasks.flatMap(t => t.tags);
      expect(allTags).toContain('api');
    });
  });
});