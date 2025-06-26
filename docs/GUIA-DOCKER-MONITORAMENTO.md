# 🚀 Guia Completo - Ambiente Docker de Monitoramento Task Flow PM

## 🎯 **Visão Geral**

Este guia configura um ambiente completo de monitoramento e análise de equipes usando:
- **Elasticsearch + Kibana** para logs e métricas
- **Grafana** para dashboards avançados  
- **PostgreSQL** para dados relacionais
- **Redis** para cache e sessões
- **Nginx** como proxy reverso

**Resultado**: Várias máquinas da equipe podem se conectar a um servidor central para monitoramento em tempo real!

---

## 🛠️ **Instalação e Configuração**

### **Pré-requisitos**
```bash
# Docker e Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# (faça logout/login após este comando)

# Verificar instalação
docker --version
docker-compose --version
```

### **Inicialização Rápida**
```bash
# Clone o projeto (se ainda não fez)
git clone https://github.com/your-org/task-flow-pm.git
cd task-flow-pm

# Execute o script de inicialização
./scripts/start-monitoring.sh
```

### **Inicialização Manual (se preferir)**
```bash
# Configurar sistema para Elasticsearch
sudo sysctl -w vm.max_map_count=262144

# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

---

## 📊 **Acesso aos Dashboards**

### **URLs Locais (na máquina servidor)**
- 🌐 **Task Flow PM**: http://localhost
- 📊 **Kibana**: http://localhost:5601
- 📈 **Grafana**: http://localhost:3001 (admin/admin)
- 🔍 **Elasticsearch**: http://localhost:9200
- 🗄️ **PostgreSQL**: localhost:5432 (taskflow/taskflow_password)

### **URLs Externas (para outras máquinas)**
Substitua `YOUR_SERVER_IP` pelo IP da máquina servidor:
- 🌐 **Task Flow PM**: http://YOUR_SERVER_IP
- 📊 **Kibana**: http://YOUR_SERVER_IP:5601  
- 📈 **Grafana**: http://YOUR_SERVER_IP:3001

**Como descobrir o IP do servidor:**
```bash
# No servidor, execute:
hostname -I | awk '{print $1}'
# ou
ip route get 1 | awk '{print $7}'
```

---

## 🎯 **Configuração das Máquinas Cliente**

### **Para que outras máquinas da equipe se conectem:**

#### **1. Configurar Hosts (Opcional)**
Nas máquinas cliente, adicione ao `/etc/hosts`:
```
YOUR_SERVER_IP    taskflow.local
YOUR_SERVER_IP    kibana.taskflow.local  
YOUR_SERVER_IP    grafana.taskflow.local
```

#### **2. Configurar Task Flow PM Cliente**
No arquivo `.env` ou configuração da aplicação cliente:
```bash
# Conexão com servidor de monitoramento
ELASTICSEARCH_URL=http://YOUR_SERVER_IP:9200
POSTGRES_URL=postgresql://taskflow:taskflow_password@YOUR_SERVER_IP:5432/taskflow
REDIS_URL=redis://:redis_password@YOUR_SERVER_IP:6379

# Habilitar envio de métricas
METRICS_ENABLED=true
TEAM_MONITORING=true
CENTRAL_SERVER=YOUR_SERVER_IP
```

#### **3. Script para Máquinas Cliente**
```bash
#!/bin/bash
# setup-client.sh - Configure máquina cliente

SERVER_IP="YOUR_SERVER_IP"

echo "🔧 Configurando conexão com servidor Task Flow PM..."

# Testar conectividade
if curl -s http://$SERVER_IP:9200/_cluster/health > /dev/null; then
    echo "✅ Servidor acessível"
else
    echo "❌ Não foi possível conectar ao servidor $SERVER_IP"
    exit 1
fi

# Configurar variáveis de ambiente
cat > .env << EOF
ELASTICSEARCH_URL=http://$SERVER_IP:9200
POSTGRES_URL=postgresql://taskflow:taskflow_password@$SERVER_IP:5432/taskflow
REDIS_URL=redis://:redis_password@$SERVER_IP:6379
METRICS_ENABLED=true
TEAM_MONITORING=true
CENTRAL_SERVER=$SERVER_IP
NODE_ENV=production
EOF

echo "✅ Cliente configurado! Execute a aplicação Task Flow PM."
```

---

## 📊 **Dashboards e Visualizações**

### **Kibana - Análise de Logs**
1. **Acesse**: http://YOUR_SERVER_IP:5601
2. **Configure Index Pattern**: 
   - Vá em Management > Index Patterns
   - Adicione `taskflow-logs-*`
   - Campo de timestamp: `@timestamp`

3. **Dashboards Disponíveis**:
   - 📊 Produtividade da Equipe
   - ⏱️ Duração de Tarefas
   - 👥 Atividade por Usuário
   - 🌍 Distribuição Geográfica

### **Grafana - Métricas Avançadas**
1. **Acesse**: http://YOUR_SERVER_IP:3001
2. **Login**: admin/admin (mude na primeira vez)
3. **Datasources** já configurados:
   - Elasticsearch
   - PostgreSQL
   - Prometheus

4. **Dashboards**:
   - 🚀 Team Monitoring Dashboard
   - 📈 Performance Metrics
   - 🎯 Productivity Scores

---

## 🔧 **Configurações Avançadas**

### **Firewall (se necessário)**
```bash
# Abrir portas necessárias
sudo ufw allow 80/tcp      # Nginx
sudo ufw allow 3001/tcp    # Grafana
sudo ufw allow 5601/tcp    # Kibana
sudo ufw allow 9200/tcp    # Elasticsearch
sudo ufw allow 5432/tcp    # PostgreSQL
sudo ufw allow 6379/tcp    # Redis
```

### **SSL/HTTPS (produção)**
```bash
# Gerar certificados SSL
sudo apt install certbot
sudo certbot certonly --standalone -d taskflow.yourdomain.com

# Atualizar config/nginx.conf para usar SSL
# (adicionar certificados na pasta config/ssl/)
```

### **Backup dos Dados**
```bash
# Backup automático
cat > backup-monitoring.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups

# Backup PostgreSQL
docker-compose exec postgres pg_dump -U taskflow taskflow > backups/postgres_$DATE.sql

# Backup Elasticsearch
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/usr/share/elasticsearch/snapshots"
  }
}'

echo "✅ Backup concluído: $DATE"
EOF

chmod +x backup-monitoring.sh
```

---

## 📈 **Métricas Monitoradas**

### **Produtividade Individual**
- ✅ Tarefas completadas
- ⏱️ Tempo médio por tarefa
- 🎯 Taxa de conclusão
- 📊 Score de qualidade

### **Performance da Equipe**
- 👥 Membros ativos
- 📈 Tendência de produtividade
- 🔄 Distribuição de trabalho
- 🚀 Velocity do time

### **Insights Geográficos**
- 🌍 Localização dos membros
- ⏰ Fusos horários
- 📍 Centros de produtividade

### **Alertas Automáticos**
- 🔴 Tarefas em atraso
- ⚠️ Baixa produtividade
- 🚨 Sobrecarga de trabalho
- 📉 Queda na qualidade

---

## 🛠️ **Comandos Úteis**

### **Gerenciamento de Containers**
```bash
# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Restart serviço específico
docker-compose restart kibana

# Parar tudo
docker-compose down

# Parar e limpar volumes
docker-compose down -v

# Rebuild aplicação
docker-compose build taskflow-app
docker-compose up -d taskflow-app
```

### **Monitoramento de Performance**
```bash
# Uso de recursos
docker stats

# Logs específicos
docker-compose logs elasticsearch
docker-compose logs kibana
docker-compose logs taskflow-app

# Health check
curl http://localhost:9200/_cluster/health
curl http://localhost:5601/api/status
```

### **Limpeza de Dados**
```bash
# Limpar logs antigos do Elasticsearch
curl -X DELETE "localhost:9200/taskflow-logs-*/_doc/_query" -H 'Content-Type: application/json' -d'
{
  "query": {
    "range": {
      "@timestamp": {
        "lt": "now-30d"
      }
    }
  }
}'

# Vacuum PostgreSQL
docker-compose exec postgres psql -U taskflow -d taskflow -c "VACUUM ANALYZE;"
```

---

## 🚨 **Troubleshooting**

### **Problemas Comuns**

#### **Elasticsearch não inicia**
```bash
# Verificar configuração de memória
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf

# Verificar espaço em disco
df -h
```

#### **Kibana não conecta**
```bash
# Verificar se Elasticsearch está rodando
curl http://localhost:9200

# Verificar logs do Kibana
docker-compose logs kibana
```

#### **Aplicação não conecta ao banco**
```bash
# Verificar se PostgreSQL está acessível
docker-compose exec postgres psql -U taskflow -d taskflow -c "SELECT 1;"

# Verificar configurações de rede
docker network ls
docker network inspect task-flow-pm_taskflow-network
```

#### **Performance lenta**
```bash
# Aumentar recursos do Elasticsearch
# Edite docker-compose.yml:
# ES_JAVA_OPTS=-Xms4g -Xmx4g

# Verificar índices
curl "localhost:9200/_cat/indices?v"

# Otimizar índices
curl -X POST "localhost:9200/taskflow-logs-*/_forcemerge?max_num_segments=1"
```

---

## 🎯 **Casos de Uso Práticos**

### **1. Monitoramento de Sprint**
- Dashboard em tempo real da evolução do sprint
- Alertas de tarefas em risco
- Análise de velocity

### **2. Análise de Produtividade Individual**
- Comparação entre membros da equipe
- Identificação de pontos de melhoria
- Coaching baseado em dados

### **3. Gestão de Home Office**
- Monitoramento de equipes distribuídas
- Análise de produtividade por localização
- Otimização de horários de trabalho

### **4. Análise de Qualidade**
- Correlação entre velocidade e qualidade
- Identificação de padrões de bugs
- Melhoria contínua de processos

---

## 📞 **Suporte e Manutenção**

### **Manutenção Regular**
- ✅ Backup diário dos dados
- ✅ Limpeza de logs antigos
- ✅ Monitoramento de recursos
- ✅ Atualizações de segurança

### **Expansão do Sistema**
- 🔄 Adicionar mais nós Elasticsearch
- 📈 Configurar clustering
- 🌐 Implementar SSL/TLS
- 🔐 Integrar com AD/LDAP

### **Contato**
- 📧 Email: support@taskflow.com
- 💬 Slack: #taskflow-support
- 📚 Docs: docs.taskflow.com
- 🐛 Issues: github.com/taskflow/issues

---

## 🎉 **Conclusão**

Este ambiente Docker fornece uma solução completa de monitoramento para equipes usando Task Flow PM. Com dashboards em tempo real, análises avançadas e capacidades de monitoramento distribuído, você pode:

- ✅ **Monitorar produtividade** em tempo real
- ✅ **Identificar gargalos** rapidamente  
- ✅ **Otimizar processos** baseado em dados
- ✅ **Escalar monitoramento** para toda organização

**🚀 Pronto para transformar a gestão da sua equipe com dados!** 