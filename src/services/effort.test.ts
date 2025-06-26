import { describe, it, expect } from 'vitest';
import { EffortEstimator } from './effort';

describe('EffortEstimator', () => {
  describe('estimateEffort', () => {
    it('should return minimum estimate for empty description', () => {
      const result = EffortEstimator.estimateEffort({
        description: '',
        type: 'task',
        priority: 'medium',
      });
      
      expect(result).toBeGreaterThanOrEqual(15);
    });

    it('should increase estimate for complex keywords', () => {
      const simpleTask = EffortEstimator.estimateEffort({
        description: 'Simple task',
        type: 'task',
        priority: 'medium',
      });

      const complexTask = EffortEstimator.estimateEffort({
        description: 'Implement authentication system with database integration',
        type: 'task',
        priority: 'medium',
      });

      expect(complexTask).toBeGreaterThan(simpleTask);
    });

    it('should scale estimates by task type', () => {
      const description = 'Create user interface';
      
      const subtask = EffortEstimator.estimateEffort({
        description,
        type: 'subtask',
        priority: 'medium',
      });

      const task = EffortEstimator.estimateEffort({
        description,
        type: 'task',
        priority: 'medium',
      });

      const story = EffortEstimator.estimateEffort({
        description,
        type: 'story',
        priority: 'medium',
      });

      const epic = EffortEstimator.estimateEffort({
        description,
        type: 'epic',
        priority: 'medium',
      });

      expect(subtask).toBeLessThan(task);
      expect(task).toBeLessThan(story);
      expect(story).toBeLessThan(epic);
    });

    it('should adjust estimates by priority', () => {
      const description = 'Implement feature';
      
      const low = EffortEstimator.estimateEffort({
        description,
        type: 'task',
        priority: 'low',
      });

      const high = EffortEstimator.estimateEffort({
        description,
        type: 'task',
        priority: 'high',
      });

      const critical = EffortEstimator.estimateEffort({
        description,
        type: 'task',
        priority: 'critical',
      });

      expect(low).toBeLessThan(high);
      expect(high).toBeLessThan(critical);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate positive variance when over estimate', () => {
      const variance = EffortEstimator.calculateVariance(60, 90);
      expect(variance).toBe(50);
    });

    it('should calculate negative variance when under estimate', () => {
      const variance = EffortEstimator.calculateVariance(60, 45);
      expect(variance).toBe(-25);
    });

    it('should return 0 for zero estimate', () => {
      const variance = EffortEstimator.calculateVariance(0, 30);
      expect(variance).toBe(0);
    });
  });

  describe('getEffortCategory', () => {
    it('should categorize efforts correctly', () => {
      expect(EffortEstimator.getEffortCategory(15)).toBe('quick');
      expect(EffortEstimator.getEffortCategory(60)).toBe('medium');
      expect(EffortEstimator.getEffortCategory(240)).toBe('large');
      expect(EffortEstimator.getEffortCategory(600)).toBe('epic');
    });
  });

  describe('getRecommendedBreakdown', () => {
    it('should recommend breakdown for large tasks', () => {
      const recommendations = EffortEstimator.getRecommendedBreakdown(300);
      expect(recommendations).toContain('Consider breaking this into smaller tasks');
    });

    it('should recommend breakdown for epic tasks', () => {
      const recommendations = EffortEstimator.getRecommendedBreakdown(600);
      expect(recommendations).toContain('This task is quite large - break into stories or epics');
    });

    it('should recommend combining small tasks', () => {
      const recommendations = EffortEstimator.getRecommendedBreakdown(10);
      expect(recommendations).toContain('Consider combining with other small tasks');
    });

    it('should return empty array for medium tasks', () => {
      const recommendations = EffortEstimator.getRecommendedBreakdown(60);
      expect(recommendations).toHaveLength(0);
    });
  });
});