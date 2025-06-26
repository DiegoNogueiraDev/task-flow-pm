#!/bin/bash

# 🧪 Script de Teste - Ambiente de Monitoramento Task Flow PM
# Este script testa todas as funcionalidades do ambiente Docker

set -e

echo "🧪 Iniciando testes do ambiente de monitoramento..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para mostrar resultado dos testes
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Função para aguardar serviço estar pronto
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}⏳ Aguardando $service_name...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name está pronto!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name não ficou pronto em tempo hábil${NC}"
    return 1
}

# Teste 1: Verificar se Docker está rodando
echo -e "${BLUE}🔍 Teste 1: Docker${NC}"
if docker info > /dev/null 2>&1; then
    test_result 0 "Docker está rodando"
else
    test_result 1 "Docker não está rodando"
    exit 1
fi

# Teste 2: Verificar se docker compose está disponível
echo -e "${BLUE}🔍 Teste 2: Docker Compose${NC}"
if docker compose version > /dev/null 2>&1; then
    test_result 0 "Docker Compose disponível"
else
    test_result 1 "Docker Compose não encontrado"
    exit 1
fi

# Teste 3: Validar configuração do docker-compose
echo -e "${BLUE}🔍 Teste 3: Configuração Docker Compose${NC}"
if docker compose config > /dev/null 2>&1; then
    test_result 0 "docker-compose.yml válido"
else
    test_result 1 "docker-compose.yml inválido"
    exit 1
fi

# Teste 4: Verificar portas disponíveis
echo -e "${BLUE}🔍 Teste 4: Portas Disponíveis${NC}"
ports=(80 3000 3001 5432 5601 6379 9200)
for port in "${ports[@]}"; do
    if ! netstat -tuln 2>/dev/null | grep ":$port " > /dev/null; then
        test_result 0 "Porta $port disponível"
    else
        echo -e "${YELLOW}⚠️ Porta $port já está em uso${NC}"
    fi
done

# Teste 5: Configuração de memória para Elasticsearch
echo -e "${BLUE}🔍 Teste 5: Configuração de Memória${NC}"
current_max_map_count=$(sysctl vm.max_map_count | awk '{print $3}')
if [ "$current_max_map_count" -ge 262144 ]; then
    test_result 0 "vm.max_map_count configurado corretamente ($current_max_map_count)"
else
    echo -e "${YELLOW}⚠️ vm.max_map_count muito baixo ($current_max_map_count). Configurando...${NC}"
    sudo sysctl -w vm.max_map_count=262144 2>/dev/null && test_result 0 "vm.max_map_count corrigido" || test_result 1 "Falha ao configurar vm.max_map_count"
fi

# Teste 6: Iniciar serviços (se não estiverem rodando)
echo -e "${BLUE}🔍 Teste 6: Inicialização dos Serviços${NC}"

if ! docker compose ps --services --filter status=running | grep -q elasticsearch; then
    echo -e "${YELLOW}🚀 Iniciando serviços...${NC}"
    docker compose up -d --build
    test_result $? "Serviços iniciados"
else
    echo -e "${GREEN}✅ Serviços já estão rodando${NC}"
fi

# Aguardar serviços ficarem prontos
echo -e "${BLUE}🔍 Teste 7: Conectividade dos Serviços${NC}"

# Elasticsearch
wait_for_service "http://localhost:9200/_cluster/health" "Elasticsearch"

# Kibana
wait_for_service "http://localhost:5601/api/status" "Kibana"

# Grafana
wait_for_service "http://localhost:3001/api/health" "Grafana"

# PostgreSQL
echo -e "${YELLOW}⏳ Aguardando PostgreSQL...${NC}"
if docker compose exec postgres pg_isready -U taskflow -d taskflow > /dev/null 2>&1; then
    test_result 0 "PostgreSQL está pronto"
else
    test_result 1 "PostgreSQL não está acessível"
fi

# Redis
echo -e "${YELLOW}⏳ Aguardando Redis...${NC}"
if docker compose exec redis redis-cli -a redis_password ping 2>/dev/null | grep -q PONG; then
    test_result 0 "Redis está pronto"
else
    test_result 1 "Redis não está acessível"
fi

# Teste 8: Funcionalidades do Elasticsearch
echo -e "${BLUE}🔍 Teste 8: Funcionalidades Elasticsearch${NC}"

# Verificar status do cluster
cluster_status=$(curl -s http://localhost:9200/_cluster/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$cluster_status" = "green" ] || [ "$cluster_status" = "yellow" ]; then
    test_result 0 "Cluster Elasticsearch saudável ($cluster_status)"
else
    test_result 1 "Cluster Elasticsearch com problemas ($cluster_status)"
fi

# Criar índice de teste
curl -s -X PUT "http://localhost:9200/taskflow-test" > /dev/null 2>&1
test_result $? "Criação de índice"

# Inserir documento de teste
curl -s -X POST "http://localhost:9200/taskflow-test/_doc" \
  -H 'Content-Type: application/json' \
  -d '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "test_type": "monitoring_setup",
    "message": "Teste de funcionalidade do ambiente",
    "status": "success"
  }' > /dev/null 2>&1
test_result $? "Inserção de documento de teste"

# Buscar documento
search_result=$(curl -s "http://localhost:9200/taskflow-test/_search" | jq '.hits.total.value' 2>/dev/null || echo "0")
if [ "$search_result" -gt 0 ]; then
    test_result 0 "Busca de documentos ($search_result documentos encontrados)"
else
    test_result 1 "Falha na busca de documentos"
fi

# Teste 9: Dashboards do Kibana
echo -e "${BLUE}🔍 Teste 9: Kibana Index Patterns${NC}"

# Verificar se Kibana está acessível
kibana_status=$(curl -s "http://localhost:5601/api/status" | jq -r '.status.overall.state' 2>/dev/null || echo "error")
if [ "$kibana_status" = "green" ]; then
    test_result 0 "Kibana API acessível"
else
    test_result 1 "Kibana API com problemas ($kibana_status)"
fi

# Teste 10: Dashboards do Grafana
echo -e "${BLUE}🔍 Teste 10: Grafana Datasources${NC}"

# Verificar se Grafana está acessível
grafana_status=$(curl -s "http://localhost:3001/api/health" | jq -r '.database' 2>/dev/null || echo "error")
if [ "$grafana_status" = "ok" ]; then
    test_result 0 "Grafana API acessível"
else
    test_result 1 "Grafana API com problemas ($grafana_status)"
fi

# Teste 11: Conectividade externa
echo -e "${BLUE}🔍 Teste 11: Conectividade Externa${NC}"

LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "${YELLOW}IP da máquina: $LOCAL_IP${NC}"

# Testar se os serviços são acessíveis externamente
external_urls=(
    "http://$LOCAL_IP:9200/_cluster/health"
    "http://$LOCAL_IP:5601/api/status"
    "http://$LOCAL_IP:3001/api/health"
)

for url in "${external_urls[@]}"; do
    service=$(echo $url | cut -d':' -f3 | cut -d'/' -f1)
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        test_result 0 "Acesso externo porta $service"
    else
        echo -e "${YELLOW}⚠️ Acesso externo porta $service pode estar bloqueado por firewall${NC}"
    fi
done

# Teste 12: Performance básica
echo -e "${BLUE}🔍 Teste 12: Performance Básica${NC}"

# Medir tempo de resposta do Elasticsearch
start_time=$(date +%s%N)
curl -s "http://localhost:9200/_cluster/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # em millisegundos

if [ $response_time -lt 1000 ]; then
    test_result 0 "Tempo de resposta Elasticsearch: ${response_time}ms"
else
    test_result 1 "Tempo de resposta Elasticsearch muito alto: ${response_time}ms"
fi

# Resumo final
echo ""
echo -e "${BLUE}📋 RESUMO DOS TESTES${NC}"
echo "=================================="

# Verificar status geral dos containers
echo -e "${YELLOW}📊 Status dos Containers:${NC}"
docker compose ps

echo ""
echo -e "${YELLOW}🌐 URLs de Acesso:${NC}"
echo "Kibana:       http://localhost:5601 (ou http://$LOCAL_IP:5601)"
echo "Grafana:      http://localhost:3001 (ou http://$LOCAL_IP:3001) - admin/admin"
echo "Elasticsearch: http://localhost:9200 (ou http://$LOCAL_IP:9200)"
echo ""

echo -e "${YELLOW}🎯 Próximos Passos:${NC}"
echo "1. Configure index patterns no Kibana (taskflow-*)"
echo "2. Importe dashboards do Grafana"
echo "3. Configure máquinas cliente: ./scripts/setup-client-monitoring.sh"
echo "4. Envie dados de teste: ./send-test-metrics.sh"
echo ""

echo -e "${GREEN}🎉 Ambiente de monitoramento testado e pronto para uso!${NC}"

# Limpeza do índice de teste
curl -s -X DELETE "http://localhost:9200/taskflow-test" > /dev/null 2>&1 