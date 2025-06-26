import { Logger } from './logger';
import { randomUUID } from 'crypto';
import { MCPConfig } from '../mcp/schema';

export interface EnhancedUserActivity {
  action: string;
  context?: string;
  metadata?: Record<string, any>;
  taskId?: string;
  duration?: number;
  timestamp?: string;
  location?: GeoLocation;
  idleTime?: number;
  focusScore?: number;
}

export interface GeoLocation {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  batteryLevel?: number;
  isCharging?: boolean;
  uptime: number;
}

export interface IdleTracker {
  isIdle: boolean;
  idleStartTime?: Date;
  totalIdleTime: number;
  lastActiveTime: Date;
  idleThreshold: number; // milliseconds
}

export interface WorkPattern {
  startTime: Date;
  endTime?: Date;
  totalWorkTime: number;
  focusBlocks: FocusBlock[];
  interruptions: number;
  productivityScore: number;
  peakHours: number[];
}

export interface FocusBlock {
  startTime: Date;
  endTime: Date;
  duration: number;
  taskId?: string;
  quality: 'high' | 'medium' | 'low';
}

export class EnhancedUserMetricsCollector {
  private logger: Logger;
  private config: MCPConfig;
  private sessionId: string;
  private sessionStartTime: Date;
  private lastActivityTime: Date;
  private activityBuffer: EnhancedUserActivity[] = [];
  private flushTimer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;
  private systemMetricsTimer?: NodeJS.Timeout;
  
  // Tracking de estado
  private idleTracker!: IdleTracker;
  private workPattern!: WorkPattern;
  private geoLocation?: GeoLocation;
  private currentFocusBlock?: FocusBlock;

  constructor(config: MCPConfig) {
    this.logger = new Logger(config.esEndpoint);
    this.config = config;
    this.sessionId = randomUUID();
    this.sessionStartTime = new Date();
    this.lastActivityTime = new Date();
    
    // Inicializar trackers
    this.initializeTrackers();
    
    // Setup automático
    this.setupPeriodicFlush();
    this.setupIdleTracking();
    this.setupSystemMetrics();
    this.detectGeoLocation();
    
    // Registrar início de sessão
    this.trackSessionStart();
  }

  /**
   * 🚀 Inicializar todos os trackers
   */
  private initializeTrackers(): void {
    this.idleTracker = {
      isIdle: false,
      totalIdleTime: 0,
      lastActiveTime: new Date(),
      idleThreshold: 300000 // 5 minutos
    };

    this.workPattern = {
      startTime: new Date(),
      totalWorkTime: 0,
      focusBlocks: [],
      interruptions: 0,
      productivityScore: 0,
      peakHours: []
    };
  }

  /**
   * 📍 Detectar localização geográfica
   */
  private async detectGeoLocation(): Promise<void> {
    if (!this.config.monitoring?.includeGeoLocation) {
      return;
    }

    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        this.geoLocation = {
          city: data.city || 'Unknown',
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || 'UN',
          lat: parseFloat(data.latitude) || 0,
          lon: parseFloat(data.longitude) || 0,
          timezone: data.timezone || 'UTC',
          isp: data.org || 'Unknown'
        };

        console.log(`📍 Localização detectada: ${this.geoLocation.city}, ${this.geoLocation.country}`);
        
        // Atualizar configuração com coordenadas
        if (this.config.user && this.geoLocation.lat && this.geoLocation.lon) {
          this.config.user.location = `${this.geoLocation.city}, ${this.geoLocation.country}`;
        }
      }
    } catch (error) {
      console.warn('⚠️ Falha ao detectar geolocalização:', error);
      
      // Fallback para dados do sistema ou configuração
      this.geoLocation = {
        city: this.config.user?.location?.split(',')[0] || 'Unknown',
        country: this.config.user?.location?.split(',')[1]?.trim() || 'Unknown',
        countryCode: 'UN',
        lat: 0,
        lon: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isp: 'Unknown'
      };
    }
  }

  /**
   * ⏰ Setup de tracking de tempo ocioso
   */
  private setupIdleTracking(): void {
    if (!this.config.monitoring?.trackIdleTime) {
      return;
    }

    // Verificar ociosidade a cada minuto
    this.idleTimer = setInterval(() => {
      this.checkIdleStatus();
    }, 60000);
  }

  /**
   * 🔍 Verificar status de ociosidade
   */
  private checkIdleStatus(): void {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivityTime.getTime();
    
    if (timeSinceLastActivity >= this.idleTracker.idleThreshold) {
      if (!this.idleTracker.isIdle) {
        // Começou a ficar ocioso
        this.idleTracker.isIdle = true;
        this.idleTracker.idleStartTime = new Date(this.lastActivityTime.getTime() + this.idleTracker.idleThreshold);
        
        this.trackUserActivity({
          action: 'idle_start',
          metadata: {
            idle_threshold: this.idleTracker.idleThreshold,
            last_activity: this.lastActivityTime.toISOString()
          }
        });

        // Finalizar bloco de foco se ativo
        if (this.currentFocusBlock) {
          this.endFocusBlock('idle');
        }
      } else {
        // Continua ocioso - acumular tempo
        if (this.idleTracker.idleStartTime) {
          this.idleTracker.totalIdleTime = now.getTime() - this.idleTracker.idleStartTime.getTime();
        }
      }
    } else {
      if (this.idleTracker.isIdle) {
        // Voltou a ficar ativo
        this.idleTracker.isIdle = false;
        
        const idleDuration = this.idleTracker.idleStartTime ? 
          now.getTime() - this.idleTracker.idleStartTime.getTime() : 0;
        
        this.trackUserActivity({
          action: 'idle_end',
          duration: idleDuration,
          metadata: {
            idle_duration_minutes: Math.round(idleDuration / 60000),
            total_idle_time: this.idleTracker.totalIdleTime
          }
        });

        // Iniciar novo bloco de foco
        this.startFocusBlock();
      }
    }
  }

  /**
   * 🎯 Iniciar bloco de foco
   */
  private startFocusBlock(): void {
    if (this.currentFocusBlock) {
      this.endFocusBlock('interrupted');
    }

    this.currentFocusBlock = {
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      quality: 'medium'
    };
  }

  /**
   * 🎯 Finalizar bloco de foco
   */
  private endFocusBlock(reason: 'completed' | 'interrupted' | 'idle'): void {
    if (!this.currentFocusBlock) return;

    const now = new Date();
    this.currentFocusBlock.endTime = now;
    this.currentFocusBlock.duration = now.getTime() - this.currentFocusBlock.startTime.getTime();

    // Calcular qualidade do foco baseado na duração
    if (this.currentFocusBlock.duration >= 1800000) { // 30+ minutos
      this.currentFocusBlock.quality = 'high';
    } else if (this.currentFocusBlock.duration >= 600000) { // 10+ minutos
      this.currentFocusBlock.quality = 'medium';
    } else {
      this.currentFocusBlock.quality = 'low';
    }

    this.workPattern.focusBlocks.push(this.currentFocusBlock);

    // Tracking de interrupções
    if (reason === 'interrupted') {
      this.workPattern.interruptions++;
    }

    // Enviar métrica de foco
    this.trackUserActivity({
      action: 'focus_block_completed',
      duration: this.currentFocusBlock.duration,
      metadata: {
        focus_quality: this.currentFocusBlock.quality,
        duration_minutes: Math.round(this.currentFocusBlock.duration / 60000),
        end_reason: reason,
        task_id: this.currentFocusBlock.taskId
      }
    });

    this.currentFocusBlock = undefined;
  }

  /**
   * 📊 Setup de métricas de sistema
   */
  private setupSystemMetrics(): void {
    if (!this.config.monitoring?.includeSystemMetrics) {
      return;
    }

    // Coletar métricas de sistema a cada 2 minutos
    this.systemMetricsTimer = setInterval(async () => {
      const metrics = await this.collectSystemMetrics();
      await this.trackSystemMetrics(metrics);
    }, 120000);
  }

  /**
   * 🖥️ Coletar métricas do sistema
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const os = require('os');
      
      // CPU Usage
      const cpus = os.cpus();
      let cpuUsage = 0;
      
      // Simplified CPU calculation (would need proper implementation)
      const loadAvg = os.loadavg()[0];
      cpuUsage = Math.min(100, (loadAvg / cpus.length) * 100);

      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

      // Network latency (ping ao servidor de monitoramento)
      const networkLatency = await this.measureNetworkLatency();

      // System uptime
      const uptime = os.uptime() * 1000; // em milliseconds

      return {
        cpuUsage: Math.round(cpuUsage),
        memoryUsage: Math.round(memoryUsage),
        diskUsage: 0, // Placeholder - would need disk space check
        networkLatency,
        uptime
      };
    } catch (error) {
      console.warn('⚠️ Erro ao coletar métricas de sistema:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        uptime: 0
      };
    }
  }

  /**
   * 🌐 Medir latência de rede
   */
  private async measureNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      
      // Ping simples ao servidor Elasticsearch
      const serverUrl = this.config.esEndpoint.replace('/taskflow-logs', '/_cluster/health');
      await fetch(serverUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      return Date.now() - start;
    } catch {
      return -1; // Indica erro de conectividade
    }
  }

  /**
   * 📊 Rastrear atividade do usuário (método principal)
   */
  async trackUserActivity(activity: EnhancedUserActivity): Promise<void> {
    this.lastActivityTime = new Date();
    
    // Reset idle status se estava ocioso
    if (this.idleTracker.isIdle) {
      this.idleTracker.isIdle = false;
      this.startFocusBlock();
    }

    const enrichedActivity: EnhancedUserActivity = {
      ...activity,
      timestamp: activity.timestamp || new Date().toISOString(),
      location: this.geoLocation,
      idleTime: this.idleTracker.totalIdleTime,
      focusScore: this.calculateCurrentFocusScore(),
      metadata: {
        ...activity.metadata,
        session_id: this.sessionId,
        user_id: this.config.user?.id,
        user_name: this.config.user?.name,
        team_name: this.config.user?.team,
        user_role: this.config.user?.role,
        machine_name: this.config.user?.machine || require('os').hostname(),
        ip_address: this.config.user?.ip || this.getLocalIP(),
        timezone: this.geoLocation?.timezone || 'UTC',
        work_pattern: this.getWorkPatternSummary()
      }
    };

    // Buffer otimizado
    if (this.config.monitoring?.enabled) {
      this.activityBuffer.push(enrichedActivity);
      
      // Flush imediato para ações importantes
      if (this.isHighPriorityAction(activity.action)) {
        await this.flushActivities();
      }
    }

    // Log local
    console.log(`📊 Enhanced Activity: ${activity.action}${activity.context ? ` - ${activity.context}` : ''}`);
  }

  /**
   * 📈 Rastrear início de sessão
   */
  private async trackSessionStart(): Promise<void> {
    await this.trackUserActivity({
      action: 'session_start',
      metadata: {
        session_type: 'work_session',
        monitoring_level: this.config.monitoring?.level,
        geo_enabled: this.config.monitoring?.includeGeoLocation,
        system_metrics_enabled: this.config.monitoring?.includeSystemMetrics,
        idle_tracking_enabled: this.config.monitoring?.trackIdleTime,
        user_config: {
          name: this.config.user?.name,
          team: this.config.user?.team,
          role: this.config.user?.role,
          timezone: this.config.user?.timezone
        }
      }
    });

    this.startFocusBlock();
  }

  /**
   * 📊 Rastrear métricas de sistema
   */
  private async trackSystemMetrics(metrics: SystemMetrics): Promise<void> {
    await this.trackUserActivity({
      action: 'system_metrics',
      metadata: {
        system_metrics: metrics,
        performance_score: this.calculatePerformanceScore(metrics),
        health_status: this.getSystemHealthStatus(metrics)
      }
    });
  }

  /**
   * 🔢 Calcular score de foco atual
   */
  private calculateCurrentFocusScore(): number {
    if (!this.currentFocusBlock) return 0;
    
    const blockDuration = Date.now() - this.currentFocusBlock.startTime.getTime();
    const maxFocusTime = 3600000; // 1 hora
    
    return Math.min(100, (blockDuration / maxFocusTime) * 100);
  }

  /**
   * 📋 Obter resumo do padrão de trabalho
   */
  private getWorkPatternSummary() {
    const totalFocusTime = this.workPattern.focusBlocks.reduce((sum, block) => sum + block.duration, 0);
    const totalWorkTime = Date.now() - this.workPattern.startTime.getTime();
    
    return {
      total_work_time: totalWorkTime,
      total_focus_time: totalFocusTime,
      focus_efficiency: totalWorkTime > 0 ? (totalFocusTime / totalWorkTime) * 100 : 0,
      focus_blocks_count: this.workPattern.focusBlocks.length,
      interruptions: this.workPattern.interruptions,
      idle_time: this.idleTracker.totalIdleTime,
      current_hour: new Date().getHours()
    };
  }

  /**
   * 🎯 Calcular score de performance do sistema
   */
  private calculatePerformanceScore(metrics: SystemMetrics): number {
    let score = 100;
    
    // Penalizar por alto uso de CPU
    if (metrics.cpuUsage > 80) score -= 20;
    else if (metrics.cpuUsage > 60) score -= 10;
    
    // Penalizar por alto uso de memória
    if (metrics.memoryUsage > 90) score -= 20;
    else if (metrics.memoryUsage > 70) score -= 10;
    
    // Penalizar por alta latência de rede
    if (metrics.networkLatency > 1000) score -= 15;
    else if (metrics.networkLatency > 500) score -= 5;
    
    return Math.max(0, score);
  }

  /**
   * 🏥 Obter status de saúde do sistema
   */
  private getSystemHealthStatus(metrics: SystemMetrics): string {
    if (metrics.cpuUsage > 90 || metrics.memoryUsage > 95) return 'critical';
    if (metrics.cpuUsage > 70 || metrics.memoryUsage > 80) return 'warning';
    if (metrics.networkLatency > 1000) return 'network_issues';
    return 'healthy';
  }

  /**
   * 📤 Flush otimizado das atividades
   */
  private async flushActivities(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const batchSize = this.config.monitoring?.batchSize || 10;
    const activities = this.activityBuffer.splice(0, batchSize);

    for (const activity of activities) {
      const event = {
        '@timestamp': activity.timestamp,
        // Dados do usuário
        user_id: activity.metadata?.user_id,
        user_name: activity.metadata?.user_name,
        team_name: activity.metadata?.team_name,
        user_role: activity.metadata?.user_role,
        machine_name: activity.metadata?.machine_name,
        ip_address: activity.metadata?.ip_address,
        
        // Ação e contexto
        action: activity.action,
        task_id: activity.taskId,
        context: activity.context,
        duration: activity.duration,
        
        // Localização
        location: activity.location ? {
          city: activity.location.city,
          country: activity.location.country,
          country_code: activity.location.countryCode,
          coordinates: {
            lat: activity.location.lat,
            lon: activity.location.lon
          },
          timezone: activity.location.timezone,
          isp: activity.location.isp
        } : null,
        
        // Métricas de produtividade
        productivity_metrics: {
          focus_score: activity.focusScore,
          idle_time: activity.idleTime,
          work_pattern: activity.metadata?.work_pattern
        },
        
        // Metadados de sessão
        session_id: this.sessionId,
        session_duration: Date.now() - this.sessionStartTime.getTime(),
        monitoring_level: this.config.monitoring?.level,
        
        // Tags para indexação
        tags: ['taskflow', 'enhanced_metrics', activity.action],
        
        // Metadados extras
        metadata: {
          ...activity.metadata,
          enhanced_tracking: true,
          buffer_size: activities.length
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
      await this.logger.postEvent({
        type: 'enhanced_user_metrics',
        taskId: event.task_id || 'system',
        timestamp: event['@timestamp'],
        metadata: event
      });
    } catch (error) {
      console.warn('❌ Falha ao enviar métrica enhanced:', error);
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
      'task_completed', 'task_started', 'session_start', 'session_end',
      'focus_block_completed', 'idle_start', 'idle_end',
      'error', 'milestone_reached'
    ];
    return highPriorityActions.includes(action);
  }

  private setupPeriodicFlush(): void {
    const flushInterval = this.config.monitoring?.flushInterval || 30000;
    
    this.flushTimer = setInterval(async () => {
      await this.flushActivities();
      
      // Métricas periódicas detalhadas
      if (this.config.monitoring?.level === 'detailed') {
        await this.trackWorkPatternAnalysis();
      }
    }, flushInterval);
  }

  /**
   * 🧠 Análise de padrões de trabalho
   */
  private async trackWorkPatternAnalysis(): Promise<void> {
    const summary = this.getWorkPatternSummary();
    
    await this.trackUserActivity({
      action: 'work_pattern_analysis',
      metadata: {
        productivity_analysis: {
          ...summary,
          peak_performance_hours: this.identifyPeakHours(),
          focus_quality_trend: this.analyzeFocusQuality(),
          recommendations: this.generateProductivityRecommendations()
        }
      }
    });
  }

  /**
   * 🕐 Identificar horários de pico
   */
  private identifyPeakHours(): number[] {
    const hourlyProductivity = new Map<number, number>();
    
    this.workPattern.focusBlocks.forEach(block => {
      const hour = block.startTime.getHours();
      const productivity = block.quality === 'high' ? 3 : block.quality === 'medium' ? 2 : 1;
      hourlyProductivity.set(hour, (hourlyProductivity.get(hour) || 0) + productivity);
    });

    return Array.from(hourlyProductivity.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  /**
   * 📈 Analisar qualidade do foco
   */
  private analyzeFocusQuality(): string {
    if (this.workPattern.focusBlocks.length === 0) return 'insufficient_data';
    
    const highQualityBlocks = this.workPattern.focusBlocks.filter(b => b.quality === 'high').length;
    const totalBlocks = this.workPattern.focusBlocks.length;
    const ratio = highQualityBlocks / totalBlocks;
    
    if (ratio >= 0.7) return 'excellent';
    if (ratio >= 0.5) return 'good';
    if (ratio >= 0.3) return 'average';
    return 'needs_improvement';
  }

  /**
   * 💡 Gerar recomendações de produtividade
   */
  private generateProductivityRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getWorkPatternSummary();
    
    if (summary.focus_efficiency < 60) {
      recommendations.push('Consider using Pomodoro technique for better focus');
    }
    
    if (this.workPattern.interruptions > 5) {
      recommendations.push('Try to reduce interruptions during focus time');
    }
    
    if (this.idleTracker.totalIdleTime > 3600000) { // 1 hora
      recommendations.push('Consider taking more structured breaks');
    }

    return recommendations;
  }

  /**
   * 🛑 Cleanup completo
   */
  async cleanup(): Promise<void> {
    // Finalizar bloco de foco ativo
    if (this.currentFocusBlock) {
      this.endFocusBlock('completed');
    }

    // Limpar timers
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.idleTimer) clearInterval(this.idleTimer);
    if (this.systemMetricsTimer) clearInterval(this.systemMetricsTimer);
    
    // Flush final
    await this.flushActivities();
    
    // Sessão final
    await this.trackUserActivity({
      action: 'session_end',
      metadata: {
        session_summary: {
          duration: Date.now() - this.sessionStartTime.getTime(),
          total_activities: this.activityBuffer.length,
          work_pattern: this.getWorkPatternSummary(),
          final_productivity_score: this.calculateFinalProductivityScore()
        }
      }
    });
  }

  /**
   * 🏆 Calcular score final de produtividade
   */
  private calculateFinalProductivityScore(): number {
    const summary = this.getWorkPatternSummary();
    
    let score = 50; // Base
    score += summary.focus_efficiency * 0.4; // 40% peso para eficiência
    score += Math.max(0, (10 - this.workPattern.interruptions) * 2); // Menos interrupções = melhor
    score -= Math.min(20, this.idleTracker.totalIdleTime / 180000); // Penalidade por muito idle
    
    return Math.min(100, Math.max(0, score));
  }
} 