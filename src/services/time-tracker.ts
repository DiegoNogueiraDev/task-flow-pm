import { randomUUID } from 'crypto';
import { TimeTrackingSession, ELKMetrics, TaskNode } from '../mcp/schema';
import { Logger } from './logger';

export class TimeTracker {
  private activeSessions: Map<string, TimeTrackingSession> = new Map();
  private logger: Logger;

  constructor(elkEndpoint?: string) {
    this.logger = new Logger(elkEndpoint || 'http://localhost:9200/task-metrics');
  }

  async startTracking(taskId: string, context?: string): Promise<TimeTrackingSession> {
    // Stop any existing session for this task
    await this.stopTracking(taskId);

    const session: TimeTrackingSession = {
      id: randomUUID(),
      taskId,
      startTime: new Date(),
      pausedTime: 0,
      context,
      status: 'active'
    };

    this.activeSessions.set(taskId, session);

    // Send start metric to ELK
    await this.sendMetric({
      timestamp: new Date().toISOString(),
      taskId,
      action: 'start',
      context,
      sessionId: session.id
    });

    return session;
  }

  async stopTracking(taskId: string): Promise<TimeTrackingSession | null> {
    const session = this.activeSessions.get(taskId);
    if (!session) {
      return null;
    }

    session.endTime = new Date();
    session.status = 'completed';
    
    const duration = session.endTime.getTime() - session.startTime.getTime() - session.pausedTime;
    const actualMinutes = Math.round(duration / (1000 * 60));

    // Send stop metric to ELK
    await this.sendMetric({
      timestamp: new Date().toISOString(),
      taskId,
      action: 'stop',
      duration,
      actualMinutes,
      context: session.context,
      sessionId: session.id
    });

    this.activeSessions.delete(taskId);
    return session;
  }

  async pauseTracking(taskId: string): Promise<TimeTrackingSession | null> {
    const session = this.activeSessions.get(taskId);
    if (!session || session.status !== 'active') {
      return null;
    }

    session.status = 'paused';
    const pauseStart = new Date();

    // Send pause metric to ELK
    await this.sendMetric({
      timestamp: pauseStart.toISOString(),
      taskId,
      action: 'pause',
      context: session.context,
      sessionId: session.id
    });

    return session;
  }

  async resumeTracking(taskId: string): Promise<TimeTrackingSession | null> {
    const session = this.activeSessions.get(taskId);
    if (!session || session.status !== 'paused') {
      return null;
    }

    const resumeTime = new Date();
    // Add pause duration to total paused time
    const pauseDuration = resumeTime.getTime() - session.startTime.getTime();
    session.pausedTime += pauseDuration;
    session.status = 'active';

    // Update start time to current for clean tracking
    session.startTime = resumeTime;

    // Send resume metric to ELK
    await this.sendMetric({
      timestamp: resumeTime.toISOString(),
      taskId,
      action: 'resume',
      context: session.context,
      sessionId: session.id
    });

    return session;
  }

  getActiveSession(taskId: string): TimeTrackingSession | null {
    return this.activeSessions.get(taskId) || null;
  }

  getCurrentDuration(taskId: string): number {
    const session = this.activeSessions.get(taskId);
    if (!session) {
      return 0;
    }

    const currentTime = new Date();
    const elapsed = currentTime.getTime() - session.startTime.getTime();
    return elapsed - session.pausedTime;
  }

  async sendTaskCompleteMetrics(
    taskId: string, 
    task: TaskNode, 
    actualMinutes: number
  ): Promise<void> {
    const session = this.activeSessions.get(taskId);
    const estimatedMinutes = task.estimateMinutes;
    
    // Calculate accuracy
    let accuracy = 100;
    if (estimatedMinutes > 0) {
      const variance = Math.abs(actualMinutes - estimatedMinutes) / estimatedMinutes;
      accuracy = Math.max(0, 100 - (variance * 100));
    }

    const metrics: ELKMetrics = {
      timestamp: new Date().toISOString(),
      taskId,
      action: 'complete',
      duration: actualMinutes * 60 * 1000, // convert to milliseconds
      taskTitle: task.title,
      taskType: task.type,
      estimatedMinutes,
      actualMinutes,
      accuracy,
      sessionId: session?.id || randomUUID()
    };

    await this.sendMetric(metrics);
  }

  private async sendMetric(metric: ELKMetrics): Promise<void> {
    try {
      // Use the logger to send to ELK
      await this.logger.logTimeTracking(metric);
    } catch (error) {
      console.warn('Failed to send time tracking metric to ELK:', error);
    }
  }

  // Get summary of tracking sessions for reporting
  getActiveSessions(): TimeTrackingSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Auto-start tracking when task begins
  async autoStartForTask(taskId: string, context?: string): Promise<void> {
    const existingSession = this.getActiveSession(taskId);
    if (!existingSession) {
      await this.startTracking(taskId, context || 'Auto-started when task began');
    }
  }

  // Auto-stop tracking when task completes
  async autoStopForTask(taskId: string): Promise<number> {
    const session = await this.stopTracking(taskId);
    if (session && session.endTime) {
      const duration = session.endTime.getTime() - session.startTime.getTime() - session.pausedTime;
      return Math.round(duration / (1000 * 60)); // return minutes
    }
    return 0;
  }
} 