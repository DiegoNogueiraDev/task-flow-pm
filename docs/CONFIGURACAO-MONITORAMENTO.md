# 🔧 Configuração do Task Flow PM para Monitoramento

## 📊 **Dados Coletados Atualmente**

O Task Flow PM já coleta uma rica variedade de métricas de produtividade e performance. Aqui está o que temos:

### **🎯 Métricas de Tarefas**
```typescript
// Eventos de ciclo de vida das tarefas
MetricEvent {
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_status_change'
  taskId: string
  oldStatus?: string
  newStatus?: string  
  estimate?: number
  actualMinutes?: number
  timestamp: string
  metadata?: Record<string, any>
}
```

### **⏱️ Métricas de Time Tracking**
```typescript
// Dados detalhados de tempo
ELKMetrics {
  timestamp: string
  taskId: string
  action: 'start' | 'stop' | 'pause' | 'resume' | 'complete'
  duration?: number // em millisegundos
  taskTitle?: string
  taskType?: 'epic' | 'story' | 'task' | 'subtask'
  estimatedMinutes?: number
  actualMinutes?: number
  accuracy?: number // percentual de precisão da estimativa
  userId?: string
  sessionId: string
  context?: string // contexto da sessão de trabalho
}
```

### **📈 Métricas de Performance**
- **Acurácia de Estimativas**: Comparação entre tempo estimado vs real
- **Velocity**: Tarefas completadas por período
- **Distribuição de Trabalho**: Por tipo de tarefa, prioridade
- **Padrões de Produtividade**: Horários mais produtivos
- **Reflexões**: Notas de aprendizado sobre tarefas completadas

---

## 🔧 **Configuração para Ambiente Docker**

### **1. Configurar Elasticsearch Endpoint**

#### **Método 1: Arquivo de Configuração (Recomendado)**
Crie ou edite o arquivo `mcp.json` no diretório do projeto:

```json
{
  "dbPath": ".mcp/graph.db",
  "embeddingsModel": "all-MiniLM-L6-v2",
  "esEndpoint": "http://localhost:9200/taskflow-logs",
  "contextTokens": 1024
}
```

#### **Método 2: Variáveis de Ambiente**
```bash
# Para desenvolvimento local
export ELASTICSEARCH_URL="http://localhost:9200/taskflow-logs"

# Para servidor remoto (outras máquinas da equipe)
export ELASTICSEARCH_URL="http://SEU_IP_SERVIDOR:9200/taskflow-logs"
```

#### **Método 3: Script de Configuração Automática**
```bash
# Execute o script que criamos para clientes
./scripts/setup-client-monitoring.sh
# Ele configurará automaticamente o endpoint correto
```

### **2. Configurar Dados de Usuário/Equipe**

Para enriquecer os dados com informações de usuário e equipe:

```json
{
  "dbPath": ".mcp/graph.db", 
  "embeddingsModel": "all-MiniLM-L6-v2",
  "esEndpoint": "http://SEU_IP_SERVIDOR:9200/taskflow-logs",
  "contextTokens": 1024,
  "user": {
    "id": "user123",
    "name": "João Silva",
    "team": "Frontend",
    "role": "developer",
    "location": "São Paulo, BR"
  }
}
```

### **3. Habilitar Monitoramento Avançado**

Para coletar métricas mais detalhadas, edite o arquivo de configuração:

```json
{
  "dbPath": ".mcp/graph.db",
  "embeddingsModel": "all-MiniLM-L6-v2", 
  "esEndpoint": "http://SEU_IP_SERVIDOR:9200/taskflow-logs",
  "contextTokens": 1024,
  "monitoring": {
    "enabled": true,
    "level": "detailed", // "basic" | "detailed" | "debug"
    "includeGeoLocation": true,
    "includeSystemMetrics": true,
    "flushInterval": 30000, // 30 segundos
    "batchSize": 10
  }
}
```

---

## 🚀 **Implementação de Métricas Personalizadas**

### **1. Adicionar Métricas de Usuário**

Crie um arquivo `src/services/user-metrics.ts`:

```typescript
import { Logger } from './logger';

export class UserMetricsCollector {
  private logger: Logger;
  private userId: string;
  private teamId: string;

  constructor(esEndpoint: string, userId: string, teamId: string) {
    this.logger = new Logger(esEndpoint);
    this.userId = userId;
    this.teamId = teamId;
  }

  async trackUserActivity(activity: {
    action: string;
    context?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event = {
      '@timestamp': new Date().toISOString(),
      user_id: this.userId,
      team_id: this.teamId,
      activity_type: activity.action,
      context: activity.context,
      metadata: activity.metadata,
      machine_name: require('os').hostname(),
      ip_address: this.getLocalIP(),
      tags: ['taskflow', 'user_activity']
    };

    // Enviar para Elasticsearch via Logger
    await this.logger.postEvent({
      type: 'user_activity',
      taskId: 'system',
      timestamp: event['@timestamp'],
      metadata: event
    });
  }

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
}
```

### **2. Integrar com MCP Commands**

Modifique `src/mcp/commands.ts` para incluir métricas de usuário:

```typescript
// No construtor da MCPCommandHandler
constructor(
  db: GraphDB, 
  embeddings: EmbeddingsService, 
  logger: Logger,
  userMetrics?: UserMetricsCollector
) {
  this.db = db;
  this.embeddings = embeddings;
  this.logger = logger;
  this.userMetrics = userMetrics;
}

// Em cada comando, adicionar tracking
private async markTaskComplete(request: MarkTaskCompleteRequest): Promise<MCPResponse> {
  // ... lógica existente ...

  // Adicionar métricas de usuário
  if (this.userMetrics) {
    await this.userMetrics.trackUserActivity({
      action: 'task_completed',
      context: `Task: ${task.title}`,
      metadata: {
        taskId: task.id,
        taskType: task.type,
        estimatedMinutes: task.estimateMinutes,
        actualMinutes: calculatedActualMinutes,
        variance: calculatedActualMinutes ? 
          ((calculatedActualMinutes - task.estimateMinutes) / task.estimateMinutes) * 100 : 0
      }
    });
  }

  // ... resto da lógica ...
}
```

### **3. Script de Inicialização com Monitoramento**

Crie `scripts/start-with-monitoring.sh`:

```bash
#!/bin/bash

echo "🚀 Iniciando Task Flow PM com monitoramento..."

# Verificar se servidor de monitoramento está acessível
if ! curl -s http://localhost:9200/_cluster/health > /dev/null; then
    echo "⚠️ Servidor Elasticsearch não encontrado em localhost:9200"
    read -p "Digite o IP do servidor de monitoramento: " MONITORING_SERVER
    if [ -n "$MONITORING_SERVER" ]; then
        export ELASTICSEARCH_URL="http://$MONITORING_SERVER:9200/taskflow-logs"
    fi
fi

# Configurar informações do usuário
read -p "Digite seu nome de usuário: " USER_NAME
read -p "Digite sua equipe: " TEAM_NAME

# Criar configuração
cat > mcp.json << EOF
{
  "dbPath": ".mcp/graph.db",
  "embeddingsModel": "all-MiniLM-L6-v2",
  "esEndpoint": "${ELASTICSEARCH_URL:-http://localhost:9200/taskflow-logs}",
  "contextTokens": 1024,
  "user": {
    "id": "$(whoami)_$(hostname)",
    "name": "$USER_NAME",
    "team": "$TEAM_NAME",
    "machine": "$(hostname)",
    "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  },
  "monitoring": {
    "enabled": true,
    "level": "detailed",
    "includeGeoLocation": true
  }
}
EOF

echo "✅ Configuração criada!"

# Enviar evento de início de sessão
curl -X POST "${ELASTICSEARCH_URL:-http://localhost:9200/taskflow-logs}/_doc" \
  -H 'Content-Type: application/json' \
  -d '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "user_id": "'$(whoami)_$(hostname)'",
    "user_name": "'$USER_NAME'",
    "team_name": "'$TEAM_NAME'",
    "action": "session_start",
    "machine_name": "'$(hostname)'",
    "ip_address": "'$(hostname -I | awk '{print $1}')'",
    "tags": ["taskflow", "session"]
  }' 2>/dev/null && echo "📊 Sessão registrada no monitoramento"

echo "🎉 Pronto! Suas atividades serão monitoradas automaticamente."
```

---

## 📈 **Exemplos de Uso com Monitoramento**

### **1. Trabalho Normal com Tracking**
```bash
# Iniciar com monitoramento
./scripts/start-with-monitoring.sh

# Gerar tarefas (automaticamente trackado)
mcp plan spec.md

# Começar uma tarefa (inicia time tracking)
mcp begin TASK_ID

# Trabalhar... (métricas sendo coletadas)

# Completar tarefa (registra métricas finais)
mcp done TASK_ID 45
```

### **2. Visualização dos Dados**

#### **No Kibana (http://SEU_IP:5601)**
1. **Configure Index Pattern**: `taskflow-logs-*`
2. **Visualize Dados**:
   - Descobrir → Ver logs em tempo real
   - Dashboard → Produtividade da equipe
   - Canvas → Relatórios personalizados

#### **No Grafana (http://SEU_IP:3001)**
1. **Login**: admin/admin
2. **Dashboard**: "Task Flow PM - Team Monitoring"
3. **Explore**: Criar suas próprias consultas

### **3. Queries Úteis no Kibana**

#### **Tarefas por usuário hoje**
```
user_name:* AND @timestamp:[now/d TO now] AND action:"task_completed"
```

#### **Performance da equipe esta semana**
```
team_name:"Frontend" AND @timestamp:[now/w TO now] AND tags:"productivity_event"
```

#### **Análise de estimativas vs realidade**
```
action:"task_completed" AND metadata.variance:* AND @timestamp:[now-30d TO now]
```

---

## 🔍 **Dados Detalhados Coletados**

### **📋 Estrutura Completa dos Logs**
```json
{
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "user_id": "joao_laptop",
  "user_name": "João Silva", 
  "team_id": "frontend",
  "team_name": "Frontend Team",
  "machine_name": "joao-laptop",
  "ip_address": "192.168.1.100",
  "action": "task_completed",
  "task_id": "task-123",
  "task_title": "Implementar componente de login",
  "task_type": "task",
  "estimated_minutes": 60,
  "actual_minutes": 75,
  "accuracy": 80.0,
  "variance": 25.0,
  "priority": "high",
  "tags": ["taskflow", "frontend", "task_completed"],
  "metadata": {
    "session_id": "session-456",
    "context": "Implementação mais complexa que esperado",
    "start_time": "2024-01-15T09:15:00.000Z",
    "end_time": "2024-01-15T10:30:00.000Z",
    "interruptions": 2,
    "focus_time": 65
  },
  "geoip": {
    "city": "São Paulo",
    "country": "Brazil",
    "timezone": "America/Sao_Paulo"
  }
}
```

### **📊 Métricas Calculadas Automaticamente**
- **Accuracy Score**: Precisão das estimativas
- **Velocity**: Tarefas/hora, tarefas/dia
- **Focus Time**: Tempo efetivo sem interrupções
- **Context Switching**: Frequência de mudança entre tarefas
- **Peak Hours**: Horários de maior produtividade
- **Task Complexity**: Análise de dificuldade vs tempo
- **Team Collaboration**: Dependências entre membros

---

## 🚨 **Troubleshooting**

### **❌ Dados não aparecem no Kibana**
```bash
# Verificar se dados estão chegando
curl "http://localhost:9200/taskflow-logs-*/_search?pretty"

# Verificar index pattern no Kibana
# Management > Index Patterns > Create > taskflow-logs-*
```

### **❌ Logger não conecta ao Elasticsearch**
```bash
# Testar conectividade
curl http://SEU_IP_SERVIDOR:9200/_cluster/health

# Verificar configuração
cat mcp.json | grep esEndpoint

# Reiniciar com debug
DEBUG=* mcp tasks
```

### **❌ Performance lenta**
```bash
# Reduzir frequência de logs
# Em mcp.json:
{
  "monitoring": {
    "level": "basic",
    "flushInterval": 60000,
    "batchSize": 20
  }
}
```

---

## 🎯 **Próximos Passos**

1. **Configure o endpoint**: Use `./scripts/setup-client-monitoring.sh`
2. **Inicie com monitoramento**: `./scripts/start-with-monitoring.sh`
3. **Trabalhe normalmente**: Todas as atividades serão trackadas
4. **Visualize os dados**: Acesse Kibana e Grafana
5. **Analise patterns**: Use os dashboards para insights

**🚀 Com essa configuração, você terá visibilidade completa da produtividade individual e da equipe em tempo real!** 