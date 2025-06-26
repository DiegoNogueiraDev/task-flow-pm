import fetch from 'node-fetch';
import { MetricEvent } from '../mcp/schema';

export class Logger {
  private esEndpoint: string;
  private enabled: boolean;
  private retryDelays = [1000, 3000, 5000]; // 1s, 3s, 5s backoff

  constructor(esEndpoint: string) {
    this.esEndpoint = esEndpoint;
    this.enabled = this.isValidEndpoint(esEndpoint);
  }

  private isValidEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Post event with retry logic (3 attempts with exponential backoff)
   * Example payload structure:
   * {
   *   "type": "task_completed",
   *   "taskId": "abc-123-def",
   *   "oldStatus": "in-progress", 
   *   "newStatus": "completed",
   *   "estimate": 60,
   *   "actualMinutes": 75,
   *   "timestamp": "2025-06-25T10:30:00.000Z",
   *   "metadata": {
   *     "variance": 25.0,
   *     "efficiency": 0.8,
   *     "tags": ["backend", "api"]
   *   }
   * }
   */
  async postEvent(event: MetricEvent): Promise<boolean> {
    if (!this.enabled) {
      console.log('📊 Metric event (ES disabled):', JSON.stringify(event, null, 2));
      return true;
    }

    for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(this.esEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(event),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Event sent to Elasticsearch: ${event.type} (attempt ${attempt + 1})`);
          return true;
        } else {
          console.warn(`⚠️  ES request failed with status ${response.status}: ${response.statusText}`);
          
          if (attempt < this.retryDelays.length - 1) {
            await this.delay(this.retryDelays[attempt]);
            continue;
          }
        }
      } catch (error) {
        console.warn(`❌ ES request error (attempt ${attempt + 1}):`, error);
        
        if (attempt < this.retryDelays.length - 1) {
          await this.delay(this.retryDelays[attempt]);
          continue;
        }
      }
    }

    console.error('🚨 Failed to send event to Elasticsearch after all retries');
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logEvent(event: MetricEvent): Promise<void> {
    // Fire and forget with internal retry logic
    this.postEvent(event).catch(() => {
      // Already logged in postEvent
    });
  }

  logTaskCreated(taskId: string, estimate: number): void {
    const event: MetricEvent = {
      type: 'task_created',
      taskId,
      estimate,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  logTaskStarted(taskId: string, estimate: number): void {
    const event: MetricEvent = {
      type: 'task_started',
      taskId,
      newStatus: 'in-progress',
      estimate,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  logTaskStatusChange(
    taskId: string,
    oldStatus: string,
    newStatus: string,
    estimate?: number,
    actualMinutes?: number
  ): void {
    const event: MetricEvent = {
      type: 'task_status_change',
      taskId,
      oldStatus,
      newStatus,
      estimate,
      actualMinutes,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  logTaskCompleted(taskId: string, estimate: number, actualMinutes: number): void {
    const event: MetricEvent = {
      type: 'task_completed',
      taskId,
      estimate,
      actualMinutes,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  logReflectionAdded(taskId: string, note: string): void {
    const event: MetricEvent = {
      type: 'reflection_added',
      taskId,
      note,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Health check method
  async healthCheck(): Promise<{
    enabled: boolean;
    endpoint: string;
    reachable: boolean;
    responseTime?: number;
  }> {
    if (!this.enabled) {
      return {
        enabled: false,
        endpoint: this.esEndpoint,
        reachable: false,
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.esEndpoint.replace('/mcp-events', '/_cluster/health'), {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      return {
        enabled: true,
        endpoint: this.esEndpoint,
        reachable: response.ok,
        responseTime,
      };
    } catch {
      return {
        enabled: true,
        endpoint: this.esEndpoint,
        reachable: false,
        responseTime: Date.now() - startTime,
      };
    }
  }
}