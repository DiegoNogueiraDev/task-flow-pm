import { Logger } from './logger';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { MCPConfig } from '../mcp/schema';

export interface UserActivity {
  action: string;
  context?: string;
  metadata?: Record<string, any>;
  taskId?: string;
  duration?: number;
}

export interface SystemMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  activeTime?: number;
}

export class UserMetricsCollector {
  private logger: Logger;
  private config: MCPConfig;
  private sessionId: string;
  private sessionStartTime: Date;
  private lastActivityTime: Date;
  private activityBuffer: UserActivity[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: MCPConfig) {
    this.logger = new Logger(config.esEndpoint);
    this.config = config;
    this.sessionId = randomUUID();
    this.sessionStartTime = new Date();
    this.lastActivityTime = new Date();
    
    this.setupPeriodicFlush();
    this.trackSystemMetrics();
  }

  /**
   * 📊 Rastrear atividade do usuário
   */
  async trackUserActivity(activity: UserActivity): Promise<void> {
    this.lastActivityTime = new Date();
    
    const enrichedActivity = {
      ...activity,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.config.user?.id,
      userName: this.config.user?.name,
      teamName: this.config.user?.team,
      userRole: this.config.user?.role,
      location: this.config.user?.location,
      machine: this.config.user?.machine || require('os').hostname(),
      ip: this.config.user?.ip || this.getLocalIP()
    };

    // Buffer para otimização
    if (this.config.monitoring?.enabled) {
      this.activityBuffer.push(enrichedActivity);
      
      // Flush imediato para ações importantes
      if (this.isHighPriorityAction(activity.action)) {
        await this.flushActivities();
      }
    }

    // Log local sempre
    console.log(`📊 User Activity: ${activity.action}${activity.context ? ` - ${activity.context}` : ''}`);
  }

  /**
   * ⏱️ Rastrear produtividade em tempo real
   */
  async trackProductivityMetrics(metrics: {
    tasksCompleted?: number;
    timeSpent?: number;
    focusTime?: number;
    interruptions?: number;
    codeQuality?: number;
    estimationAccuracy?: number;
  }): Promise<void> {
    const event = {
      '@timestamp': new Date().toISOString(),
      user_id: this.config.user?.id,
      user_name: this.config.user?.name,
      team_name: this.config.user?.team,
      action: 'productivity_snapshot',
      session_id: this.sessionId,
      machine_name: require('os').hostname(),
      ip_address: this.getLocalIP(),
      tags: ['taskflow', 'productivity', 'metrics'],
      metrics: {
        ...metrics,
        session_duration: Date.now() - this.sessionStartTime.getTime(),
        activities_count: this.activityBuffer.length,
        last_activity: this.lastActivityTime.toISOString()
      },
      metadata: {
        monitoring_level: this.config.monitoring?.level || 'basic',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user_agent: 'TaskFlow-PM-Metrics/1.0'
      }
    };

    await this.sendEvent(event);
  }

  /**
   * 📈 Rastrear performance de estimativas
   */
  async trackEstimationAccuracy(data: {
    taskId: string;
    taskTitle: string;
    taskType: string;
    estimatedMinutes: number;
    actualMinutes: number;
    complexity?: string;
    tags?: string[];
  }): Promise<void> {
    const variance = ((data.actualMinutes - data.estimatedMinutes) / data.estimatedMinutes) * 100;
    const accuracy = Math.max(0, 100 - Math.abs(variance));

    const event = {
      '@timestamp': new Date().toISOString(),
      user_id: this.config.user?.id,
      user_name: this.config.user?.name,
      team_name: this.config.user?.team,
      action: 'estimation_analysis',
      task_id: data.taskId,
      task_title: data.taskTitle,
      task_type: data.taskType,
      session_id: this.sessionId,
      tags: ['taskflow', 'estimation', 'accuracy', ...(data.tags || [])],
      estimation_metrics: {
        estimated_minutes: data.estimatedMinutes,
        actual_minutes: data.actualMinutes,
        variance_percent: Math.round(variance * 100) / 100,
        accuracy_percent: Math.round(accuracy * 100) / 100,
        complexity: data.complexity || 'unknown',
        over_under: data.actualMinutes > data.estimatedMinutes ? 'over' : 'under'
      },
      metadata: {
        estimation_pattern: this.getEstimationPattern(variance),
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay()
      }
    };

    await this.sendEvent(event);
  }

  /**
   * 🧠 Rastrear padrões de trabalho
   */
  async trackWorkPatterns(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Detectar período produtivo
    const productivePeriod = this.getProductivePeriod(hour);
    
    // Calcular tempo desde última atividade
    const timeSinceLastActivity = now.getTime() - this.lastActivityTime.getTime();
    const isActiveSession = timeSinceLastActivity < 300000; // 5 minutos

    const event = {
      '@timestamp': now.toISOString(),
      user_id: this.config.user?.id,
      user_name: this.config.user?.name,
      team_name: this.config.user?.team,
      action: 'work_pattern_analysis',
      session_id: this.sessionId,
      tags: ['taskflow', 'patterns', 'productivity'],
      work_patterns: {
        hour_of_day: hour,
        day_of_week: dayOfWeek,
        productive_period: productivePeriod,
        is_active_session: isActiveSession,
        session_duration_minutes: Math.round((now.getTime() - this.sessionStartTime.getTime()) / 60000),
        activities_per_hour: this.calculateActivitiesPerHour(),
        focus_score: this.calculateFocusScore()
      },
      system_context: await this.getSystemMetrics()
    };

    await this.sendEvent(event);
  }

  /**
   * 🚀 Configurar flush periódico do buffer
   */
  private setupPeriodicFlush(): void {
    const flushInterval = this.config.monitoring?.flushInterval || 30000;
    
    this.flushTimer = setInterval(async () => {
      await this.flushActivities();
      
      // Enviar métricas de padrões de trabalho a cada flush
      if (this.config.monitoring?.level === 'detailed') {
        await this.trackWorkPatterns();
      }
    }, flushInterval);
  }

  /**
   * 📤 Flush das atividades em buffer
   */
  private async flushActivities(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const batchSize = this.config.monitoring?.batchSize || 10;
    const activities = this.activityBuffer.splice(0, batchSize);

    for (const activity of activities) {
      const event = {
        '@timestamp': activity.timestamp,
        user_id: activity.userId,
        user_name: activity.userName,
        team_name: activity.teamName,
        user_role: activity.userRole,
        location: activity.location,
        action: activity.action,
        task_id: activity.taskId,
        context: activity.context,
        duration: activity.duration,
        session_id: activity.sessionId,
        machine_name: activity.machine,
        ip_address: activity.ip,
        tags: ['taskflow', 'user_activity', activity.action],
        metadata: {
          ...activity.metadata,
          buffer_size: activities.length,
          monitoring_level: this.config.monitoring?.level
        }
      };

      await this.sendEvent(event);
    }
  }

  /**
   * 📡 Enviar evento para Elasticsearch
   */
  private async sendEvent(event: any): Promise<void> {
    try {
      // Usar o Logger existente para aproveitar retry logic
      await this.logger.postEvent({
        type: 'user_metrics',
        taskId: event.task_id || 'system',
        timestamp: event['@timestamp'],
        metadata: event
      });
    } catch (error) {
      console.warn('❌ Falha ao enviar métrica de usuário:', error);
    }
  }

  /**
   * 🔧 Funções auxiliares
   */
  private getLocalIP(): string {
    const nets = require('os').networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  private isHighPriorityAction(action: string): boolean {
    const highPriorityActions = [
      'task_completed', 'task_started', 'session_start', 
      'session_end', 'error', 'milestone_reached'
    ];
    return highPriorityActions.includes(action);
  }

  private getEstimationPattern(variance: number): string {
    if (Math.abs(variance) <= 10) return 'accurate';
    if (variance > 10 && variance <= 50) return 'conservative';
    if (variance > 50) return 'very_conservative';
    if (variance < -10 && variance >= -50) return 'optimistic';
    return 'very_optimistic';
  }

  private getProductivePeriod(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private calculateActivitiesPerHour(): number {
    const sessionHours = (Date.now() - this.sessionStartTime.getTime()) / (1000 * 60 * 60);
    return sessionHours > 0 ? Math.round((this.activityBuffer.length / sessionHours) * 100) / 100 : 0;
  }

  private calculateFocusScore(): number {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime.getTime();
    const maxFocusTime = 300000; // 5 minutos
    return Math.max(0, 100 - (timeSinceLastActivity / maxFocusTime) * 100);
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    if (!this.config.monitoring?.includeSystemMetrics) {
      return {};
    }

    try {
      const os = require('os');
      return {
        cpuUsage: this.getCPUUsage(),
        memoryUsage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
        activeTime: Date.now() - this.sessionStartTime.getTime()
      };
    } catch {
      return {};
    }
  }

  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    const cpus = require('os').cpus();
    return Math.round(Math.random() * 100); // Placeholder - would need proper implementation
  }

  private trackSystemMetrics(): void {
    // Setup system metrics tracking if enabled
    if (this.config.monitoring?.includeSystemMetrics) {
      setInterval(async () => {
        const metrics = await this.getSystemMetrics();
        await this.trackProductivityMetrics({
          focusTime: this.calculateFocusScore()
        });
      }, 60000); // Every minute
    }
  }

  /**
   * 🛑 Limpar recursos ao finalizar
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    await this.flushActivities();
    
    // Enviar evento de fim de sessão
    await this.trackUserActivity({
      action: 'session_end',
      metadata: {
        session_duration: Date.now() - this.sessionStartTime.getTime(),
        total_activities: this.activityBuffer.length
      }
    });
  }
} 