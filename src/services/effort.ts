import { TaskNode } from '../mcp/schema';
import { GraphDB } from '../db/graph';

export class EffortEstimator {
  private static readonly COMPLEXITY_MULTIPLIERS = {
    epic: 8.0,
    story: 4.0,
    task: 2.0,
    subtask: 1.0,
  };

  private static readonly PRIORITY_MULTIPLIERS = {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 0.8,
  };

  static estimateEffort(task: Partial<TaskNode>, db?: GraphDB): number {
    const baseEstimate = this.getBaseEstimate(task.description || '', task.type || 'task');
    const complexityMultiplier = this.COMPLEXITY_MULTIPLIERS[task.type || 'task'];
    const priorityMultiplier = this.PRIORITY_MULTIPLIERS[task.priority || 'medium'];
    
    let estimate = Math.round(baseEstimate * complexityMultiplier * priorityMultiplier);

    // Apply learning factor if database is available
    if (db) {
      const learningFactor = this.getLearningFactor(db);
      estimate = Math.round(estimate * learningFactor);
    }

    return estimate;
  }ortEstimator {
  private static readonly COMPLEXITY_MULTIPLIERS = {
    epic: 8.0,
    story: 4.0,
    task: 2.0,
    subtask: 1.0,
  };

  private static readonly PRIORITY_MULTIPLIERS = {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 0.8,
  };

  static estimateEffort(task: Partial<TaskNode>): number {
    const baseEstimate = this.getBaseEstimate(task.description || '', task.type || 'task');
    const complexityMultiplier = this.COMPLEXITY_MULTIPLIERS[task.type || 'task'];
    const priorityMultiplier = this.PRIORITY_MULTIPLIERS[task.priority || 'medium'];
    
    return Math.round(baseEstimate * complexityMultiplier * priorityMultiplier);
  }

  private static getBaseEstimate(description: string, type: string): number {
    // Simple heuristic based on description length and keywords
    const wordCount = description.split(/\s+/).length;
    const hasComplexKeywords = this.hasComplexKeywords(description);
    
    let baseMinutes = 30; // Minimum estimate
    
    // Add time based on word count
    baseMinutes += Math.min(wordCount * 2, 120); // Max 2 hours from word count
    
    // Add time for complex keywords
    if (hasComplexKeywords) {
      baseMinutes += 60;
    }
    
    // Type-specific adjustments
    switch (type) {
      case 'epic':
        baseMinutes *= 4;
        break;
      case 'story':
        baseMinutes *= 2;
        break;
      case 'subtask':
        baseMinutes *= 0.5;
        break;
    }
    
    return Math.max(15, baseMinutes); // Minimum 15 minutes
  }

  private static hasComplexKeywords(description: string): boolean {
    const complexKeywords = [
      'integrate', 'architecture', 'database', 'security', 'authentication',
      'authorization', 'algorithm', 'optimization', 'performance', 'testing',
      'deployment', 'infrastructure', 'api', 'frontend', 'backend', 'full-stack',
      'research', 'investigation', 'analysis', 'design', 'review'
    ];
    
    const lowerDescription = description.toLowerCase();
    return complexKeywords.some(keyword => lowerDescription.includes(keyword));
  }

  static calculateVariance(estimated: number, actual: number): number {
    if (estimated === 0) return 0;
    return ((actual - estimated) / estimated) * 100;
  }

  static getEffortCategory(minutes: number): string {
    if (minutes <= 30) return 'quick';
    if (minutes <= 120) return 'medium';
    if (minutes <= 480) return 'large';
    return 'epic';
  }

  // 🧠 Learning from Historical Data
  private static getLearningFactor(db: GraphDB): number {
    const variances = db.getEstimationVariances(20);
    
    if (variances.length < 5) {
      return 1.0; // Not enough data, use default
    }

    // Calculate average variance
    const avgVariance = variances.reduce((sum, v) => sum + v.variance, 0) / variances.length;
    
    // Convert variance to correction factor
    // If we consistently underestimate (positive variance), increase factor
    // If we consistently overestimate (negative variance), decrease factor
    const correctionFactor = 1 + (avgVariance / 100);
    
    // Limit factor between 0.5 and 2.0 to avoid extreme adjustments
    const boundedFactor = Math.max(0.5, Math.min(2.0, correctionFactor));
    
    // Store the factor for reference
    db.setSetting('effort_learning_factor', boundedFactor.toString());
    db.setSetting('effort_last_calculated', new Date().toISOString());
    
    return boundedFactor;
  }

  static updateLearningFromCompletion(
    taskId: string, 
    estimateMinutes: number, 
    actualMinutes: number, 
    db: GraphDB
  ): void {
    const variance = this.calculateVariance(estimateMinutes, actualMinutes);
    
    // Store individual variance for future learning
    const currentFactor = parseFloat(db.getSetting('effort_learning_factor') || '1.0');
    const adjustment = variance / 1000; // Small incremental adjustment
    const newFactor = Math.max(0.5, Math.min(2.0, currentFactor + adjustment));
    
    db.setSetting('effort_learning_factor', newFactor.toString());
    db.setSetting('effort_last_updated', new Date().toISOString());
  }

  static getLearningStats(db: GraphDB): {
    currentFactor: number;
    recentVariances: Array<{ taskId: string; variance: number }>;
    averageVariance: number;
    totalCompletedTasks: number;
  } {
    const variances = db.getEstimationVariances(20);
    const currentFactor = parseFloat(db.getSetting('effort_learning_factor') || '1.0');
    
    const averageVariance = variances.length > 0 
      ? variances.reduce((sum, v) => sum + v.variance, 0) / variances.length 
      : 0;

    return {
      currentFactor,
      recentVariances: variances.map(v => ({ taskId: v.taskId, variance: v.variance })),
      averageVariance,
      totalCompletedTasks: variances.length,
    };
  }