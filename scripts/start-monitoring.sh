#!/bin/bash

# 🚀 Script para Inicializar Ambiente de Monitoramento Task Flow PM
# Este script configura e inicia todo o stack de monitoramento

set -e

echo "🚀 Iniciando Task Flow PM - Ambiente de Monitoramento..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Verificar se docker-compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose não encontrado. Instale o docker-compose primeiro."
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p logs data/elasticsearch data/postgres data/redis

# Definir permissões corretas para Elasticsearch
echo "🔧 Configurando permissões para Elasticsearch..."
sudo sysctl -w vm.max_map_count=262144 2>/dev/null || echo "⚠️ Não foi possível configurar vm.max_map_count (precisa de sudo)"

# Parar containers existentes se estiverem rodando
echo "🔄 Parando containers existentes..."
docker-compose down -v 2>/dev/null || echo "Nenhum container estava rodando"

# Inicializar serviços de infraestrutura primeiro
echo "🗄️ Iniciando serviços de infraestrutura..."
docker-compose up -d postgres redis

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL estar pronto..."
until docker-compose exec postgres pg_isready -U taskflow -d taskflow; do
    echo "Aguardando PostgreSQL..."
    sleep 2
done

# Inicializar Elasticsearch
echo "🔍 Iniciando Elasticsearch..."
docker-compose up -d elasticsearch

# Aguardar Elasticsearch estar pronto
echo "⏳ Aguardando Elasticsearch estar pronto..."
until curl -s http://localhost:9200/_cluster/health > /dev/null; do
    echo "Aguardando Elasticsearch..."
    sleep 5
done

# Inicializar Kibana
echo "📊 Iniciando Kibana..."
docker-compose up -d kibana

# Aguardar Kibana estar pronto
echo "⏳ Aguardando Kibana estar pronto..."
until curl -s http://localhost:5601/api/status > /dev/null; do
    echo "Aguardando Kibana..."
    sleep 5
done

# Inicializar Grafana
echo "📈 Iniciando Grafana..."
docker-compose up -d grafana

# Inicializar aplicação Task Flow PM
echo "🚀 Iniciando aplicação Task Flow PM..."
docker-compose up -d taskflow-app

# Inicializar Logstash (opcional)
echo "🔄 Iniciando Logstash..."
docker-compose up -d logstash

# Inicializar Nginx (proxy reverso)
echo "🌐 Iniciando Nginx..."
docker-compose up -d nginx

# Verificar status dos serviços
echo ""
echo "🔍 Verificando status dos serviços..."
docker-compose ps

echo ""
echo "✅ Ambiente de monitoramento inicializado com sucesso!"
echo ""
echo "📊 ACESSO AOS DASHBOARDS:"
echo "========================================"
echo "🌐 Task Flow PM App:     http://localhost"
echo "📊 Kibana Dashboards:    http://localhost:5601"
echo "📈 Grafana Dashboards:   http://localhost:3001 (admin/admin)"
echo "🔍 Elasticsearch:        http://localhost:9200"
echo "🗄️ PostgreSQL:           localhost:5432 (taskflow/taskflow_password)"
echo "🔴 Redis:                localhost:6379"
echo ""
echo "🎯 PARA CONEXÃO EXTERNA (outras máquinas da equipe):"
echo "========================================"
echo "Substitua 'localhost' pelo IP desta máquina:"
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Task Flow PM App:     http://$LOCAL_IP"
echo "📊 Kibana Dashboards:    http://$LOCAL_IP:5601"
echo "📈 Grafana Dashboards:   http://$LOCAL_IP:3001"
echo ""
echo "🔧 CONFIGURAÇÃO DE HOSTS (opcional):"
echo "========================================"
echo "Adicione ao /etc/hosts das máquinas da equipe:"
echo "$LOCAL_IP    taskflow.local"
echo "$LOCAL_IP    kibana.taskflow.local"
echo "$LOCAL_IP    grafana.taskflow.local"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "========================================"
echo "1. Acesse Kibana em http://localhost:5601"
echo "2. Configure os index patterns para 'taskflow-logs-*'"
echo "3. Importe os dashboards da pasta ./dashboards/"
echo "4. Configure as máquinas cliente para enviar métricas para este servidor"
echo ""
echo "🛠️ COMANDOS ÚTEIS:"
echo "========================================"
echo "• Ver logs:        docker-compose logs -f"
echo "• Parar tudo:      docker-compose down"
echo "• Restart app:     docker-compose restart taskflow-app"
echo "• Status:          docker-compose ps"
echo ""
echo "🎉 Monitoramento de equipe pronto para uso!" 