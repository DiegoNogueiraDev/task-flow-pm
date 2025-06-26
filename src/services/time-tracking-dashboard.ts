import { TaskNode, TimeTrackingSession, ELKMetrics } from '../mcp/schema';
import { GraphDB } from '../db/graph';
import { TimeTracker } from './time-tracker';

interface DashboardMetrics {
  activeSessionsCount: number;
  totalTasksTracked: number;
  averageAccuracy: number;
  estimationTrend: 'improving' | 'stable' | 'declining';
  topVariancePatterns: VariancePattern[];
  realTimeStats: RealTimeStats;
  recommendations: string[];
}

interface VariancePattern {
  pattern: string;
  frequency: number;
  averageVariance: number;
  taskTypes: string[];
  confidence: number;
}

interface RealTimeStats {
  currentActiveTime: number;
  estimatedRemainingTime: number;
  currentTaskProgress: number;
  todayProductivity: number;
  weeklyTrend: number;
}

interface ProductivityInsight {
  type: 'warning' | 'success' | 'info';
  message: string;
  actionable: boolean;
  priority: number;
}

export class TimeTrackingDashboard {
  private db: GraphDB;
  private timeTracker: TimeTracker;
  private metricsCache: DashboardMetrics | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(db: GraphDB, timeTracker: TimeTracker) {
    this.db = db;
    this.timeTracker = timeTracker;
  }

  /**
   * 🎯 Get comprehensive dashboard metrics with caching
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.metricsCache && now < this.cacheExpiry) {
      return this.metricsCache;
    }

    const completedTasks = this.getCompletedTasksWithTime();
    const activeSessions: TimeTrackingSession[] = []; // Simplified for now
    
    const metrics = {
      activeSessionsCount: activeSessions.length,
      totalTasksTracked: completedTasks.length,
      averageAccuracy: this.calculateAverageAccuracy(completedTasks),
      estimationTrend: this.calculateEstimationTrend(completedTasks),
      topVariancePatterns: this.identifyVariancePatterns(completedTasks),
      realTimeStats: this.calculateRealTimeStats(activeSessions),
      recommendations: this.generateRecommendations(completedTasks, activeSessions)
    };

    this.metricsCache = metrics;
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return metrics;
  }

  /**
   * 📊 Calculate comprehensive dashboard metrics
   */
  private async calculateMetrics(): Promise<DashboardMetrics> {
    const completedTasks = this.getCompletedTasksWithTime();
    const activeSessions = this.getActiveSessions();
    
    return {
      activeSessionsCount: activeSessions.length,
      totalTasksTracked: completedTasks.length,
      averageAccuracy: this.calculateAverageAccuracy(completedTasks),
      estimationTrend: this.calculateEstimationTrend(completedTasks),
      topVariancePatterns: this.identifyVariancePatterns(completedTasks),
      realTimeStats: this.calculateRealTimeStats(activeSessions),
      recommendations: this.generateRecommendations(completedTasks, activeSessions)
    };
  }

  /**
   * 🎯 Calculate estimation accuracy percentage
   */
  private calculateAverageAccuracy(tasks: TaskNode[]): number {
    if (tasks.length === 0) return 0;
    
    const accuracies = tasks.map(task => {
      if (!task.actualMinutes || !task.estimateMinutes) return 0;
      
      const variance = Math.abs(task.actualMinutes - task.estimateMinutes) / task.estimateMinutes;
      return Math.max(0, 100 - (variance * 100));
    });
    
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  /**
   * 📈 Analyze estimation trend (improving/stable/declining)
   */
  private calculateEstimationTrend(tasks: TaskNode[]): 'improving' | 'stable' | 'declining' {
    if (tasks.length < 5) return 'stable';
    
    // Sort by completion date (most recent first)
    const sortedTasks = tasks
      .filter(t => t.endedAt)
      .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())
      .slice(0, 10); // Last 10 tasks
    
    if (sortedTasks.length < 5) return 'stable';
    
    const recentAccuracies = sortedTasks.slice(0, 5).map(this.getTaskAccuracy.bind(this));
    const olderAccuracies = sortedTasks.slice(5, 10).map(this.getTaskAccuracy.bind(this));
    
    const recentAvg = recentAccuracies.reduce((a, b) => a + b, 0) / recentAccuracies.length;
    const olderAvg = olderAccuracies.reduce((a, b) => a + b, 0) / olderAccuracies.length;
    
    const improvement = recentAvg - olderAvg;
    
    if (improvement > 5) return 'improving';
    if (improvement < -5) return 'declining';
    return 'stable';
  }

  /**
   * 🔍 Identify patterns in estimation variances
   */
  private identifyVariancePatterns(tasks: TaskNode[]): VariancePattern[] {
    const patterns = new Map<string, {
      variances: number[];
      taskTypes: Set<string>;
      frequency: number;
    }>();

    tasks.forEach(task => {
      if (!task.actualMinutes || !task.estimateMinutes) return;
      
      const variance = ((task.actualMinutes - task.estimateMinutes) / task.estimateMinutes) * 100;
      const taskType = task.type || 'unknown';
      
      // Categorize variance patterns
      let patternKey: string;
      if (variance > 50) patternKey = 'severe_underestimation';
      else if (variance > 20) patternKey = 'significant_underestimation';
      else if (variance > 0) patternKey = 'mild_underestimation';
      else if (variance > -20) patternKey = 'mild_overestimation';
      else if (variance > -50) patternKey = 'significant_overestimation';
      else patternKey = 'severe_overestimation';
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          variances: [],
          taskTypes: new Set(),
          frequency: 0
        });
      }
      
      const pattern = patterns.get(patternKey)!;
      pattern.variances.push(variance);
      pattern.taskTypes.add(taskType);
      pattern.frequency++;
    });

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        averageVariance: data.variances.reduce((a, b) => a + b, 0) / data.variances.length,
        taskTypes: Array.from(data.taskTypes),
        confidence: Math.min(95, (data.frequency / tasks.length) * 100)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * ⏱️ Calculate real-time statistics for active sessions
   */
  private calculateRealTimeStats(activeSessions: TimeTrackingSession[]): RealTimeStats {
    return {
      currentActiveTime: 0,
      estimatedRemainingTime: 0,
      currentTaskProgress: 0,
      todayProductivity: this.getTodayProductivity(),
      weeklyTrend: this.getWeeklyTrend()
    };
  }

  /**
   * 💡 Generate actionable recommendations
   */
  private generateRecommendations(completedTasks: TaskNode[], activeSessions: TimeTrackingSession[]): string[] {
    const recommendations: string[] = [];
    const accuracy = this.calculateAverageAccuracy(completedTasks);
    
    // Accuracy-based recommendations
    if (accuracy < 70) {
      recommendations.push("🎯 Consider breaking large tasks into smaller, more predictable chunks");
      recommendations.push("📊 Review recent estimation patterns to identify systematic biases");
    } else if (accuracy > 90) {
      recommendations.push("🏆 Excellent estimation accuracy! Consider taking on more challenging tasks");
    }
    
    // Active session recommendations
    if (activeSessions.length === 0) {
      recommendations.push("🚀 Start tracking time on your current task for better insights");
    } else if (activeSessions.length > 1) {
      recommendations.push("⚠️ Multiple active sessions detected - consider focusing on one task at a time");
    }
    
    // Pattern-based recommendations
    const patterns = this.identifyVariancePatterns(completedTasks);
    const topPattern = patterns[0];
    
    if (topPattern && topPattern.frequency > 3) {
      if (topPattern.pattern.includes('underestimation')) {
        recommendations.push(`📈 You tend to underestimate ${topPattern.taskTypes.join(', ')} tasks - add 20% buffer time`);
      } else if (topPattern.pattern.includes('overestimation')) {
        recommendations.push(`📉 You tend to overestimate ${topPattern.taskTypes.join(', ')} tasks - consider more aggressive estimates`);
      }
    }
    
    // Productivity recommendations
    const todayProductivity = this.getTodayProductivity();
    if (todayProductivity < 60) {
      recommendations.push("⚡ Current productivity is below average - consider taking a break or switching tasks");
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * 📈 Get today's productivity percentage
   */
  private getTodayProductivity(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTasks = this.getCompletedTasksWithTime()
      .filter(task => task.endedAt && new Date(task.endedAt) >= today);
    
    if (todayTasks.length === 0) return 0;
    
    const totalAccuracy = todayTasks.reduce((sum, task) => sum + this.getTaskAccuracy(task), 0);
    return totalAccuracy / todayTasks.length;
  }

  /**
   * 📊 Get weekly productivity trend
   */
  private getWeeklyTrend(): number {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = this.getCompletedTasksWithTime()
      .filter(task => task.endedAt && new Date(task.endedAt) >= oneWeekAgo);
    
    const lastWeek = this.getCompletedTasksWithTime()
      .filter(task => {
        if (!task.endedAt) return false;
        const endDate = new Date(task.endedAt);
        return endDate >= twoWeeksAgo && endDate < oneWeekAgo;
      });
    
    if (lastWeek.length === 0) return 0;
    
    const thisWeekAvg = thisWeek.length > 0 
      ? thisWeek.reduce((sum, task) => sum + this.getTaskAccuracy(task), 0) / thisWeek.length
      : 0;
    
    const lastWeekAvg = lastWeek.reduce((sum, task) => sum + this.getTaskAccuracy(task), 0) / lastWeek.length;
    
    return ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100;
  }

  /**
   * 🎯 Get productivity insights with actionable recommendations
   */
  async getProductivityInsights(): Promise<ProductivityInsight[]> {
    const metrics = await this.getDashboardMetrics();
    const insights: ProductivityInsight[] = [];
    
    // Accuracy insights
    if (metrics.averageAccuracy > 90) {
      insights.push({
        type: 'success',
        message: `Outstanding estimation accuracy: ${metrics.averageAccuracy.toFixed(1)}%`,
        actionable: false,
        priority: 1
      });
    } else if (metrics.averageAccuracy < 70) {
      insights.push({
        type: 'warning',
        message: `Low estimation accuracy: ${metrics.averageAccuracy.toFixed(1)}%. Consider breaking tasks into smaller chunks.`,
        actionable: true,
        priority: 3
      });
    }
    
    // Trend insights
    if (metrics.estimationTrend === 'improving') {
      insights.push({
        type: 'success',
        message: 'Your estimation accuracy is improving over time! Keep up the good work.',
        actionable: false,
        priority: 2
      });
    } else if (metrics.estimationTrend === 'declining') {
      insights.push({
        type: 'warning',
        message: 'Your estimation accuracy is declining. Review recent tasks for patterns.',
        actionable: true,
        priority: 3
      });
    }
    
    // Active session insights
    if (metrics.activeSessionsCount === 0) {
      insights.push({
        type: 'info',
        message: 'No active time tracking sessions. Start tracking to get better insights.',
        actionable: true,
        priority: 2
      });
    } else if (metrics.activeSessionsCount > 1) {
      insights.push({
        type: 'warning',
        message: `${metrics.activeSessionsCount} active sessions detected. Focus on one task for better accuracy.`,
        actionable: true,
        priority: 3
      });
    }
    
    return insights.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 🔧 Helper methods
   */
  private getCompletedTasksWithTime(): TaskNode[] {
    return this.db.listTasks({})
      .filter(task => 
        task.status === 'completed' && 
        task.actualMinutes && 
        task.estimateMinutes &&
        task.actualMinutes > 0 && 
        task.estimateMinutes > 0
      );
  }

  private getActiveSessions(): TimeTrackingSession[] {
    // In a real implementation, this would fetch from TimeTracker
    // For now, we'll use a simplified approach
    return [];
  }

  private getTaskAccuracy(task: TaskNode): number {
    if (!task.actualMinutes || !task.estimateMinutes) return 0;
    
    const variance = Math.abs(task.actualMinutes - task.estimateMinutes) / task.estimateMinutes;
    return Math.max(0, 100 - (variance * 100));
  }

  /**
   * 📊 Generate detailed report for analysis
   */
  async generateReport(): Promise<string> {
    const metrics = await this.getDashboardMetrics();
    const insights = await this.getProductivityInsights();
    
    let report = `
# 📊 Time Tracking Dashboard Report

## 🎯 Overall Performance
- **Active Sessions**: ${metrics.activeSessionsCount}
- **Total Tasks Tracked**: ${metrics.totalTasksTracked}
- **Average Accuracy**: ${metrics.averageAccuracy.toFixed(1)}%
- **Estimation Trend**: ${this.getTrendEmoji(metrics.estimationTrend)} ${metrics.estimationTrend}

## ⏱️ Real-Time Statistics
- **Current Active Time**: ${metrics.realTimeStats.currentActiveTime} minutes
- **Estimated Remaining**: ${metrics.realTimeStats.estimatedRemainingTime} minutes
- **Current Task Progress**: ${metrics.realTimeStats.currentTaskProgress.toFixed(1)}%
- **Today's Productivity**: ${metrics.realTimeStats.todayProductivity.toFixed(1)}%
- **Weekly Trend**: ${metrics.realTimeStats.weeklyTrend > 0 ? '📈' : '📉'} ${metrics.realTimeStats.weeklyTrend.toFixed(1)}%

## 🔍 Top Variance Patterns
${metrics.topVariancePatterns.map((pattern, i) => 
  `${i + 1}. **${pattern.pattern.replace(/_/g, ' ')}**: ${pattern.frequency} occurrences (${pattern.averageVariance.toFixed(1)}% avg variance)`
).join('\n')}

## 💡 Recommendations
${metrics.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## 🎯 Insights
${insights.map((insight, i) => 
  `${i + 1}. ${this.getInsightEmoji(insight.type)} ${insight.message}`
).join('\n')}
`;

    return report;
  }

  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  private getInsightEmoji(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }
} 