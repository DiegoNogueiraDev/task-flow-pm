#!/bin/bash

# 🚀 Task Flow PM - Inicialização com Monitoramento
# Este script configura automaticamente o envio de métricas para o ambiente de monitoramento

set -e

echo "🚀 Iniciando Task Flow PM com monitoramento..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para testar conectividade
test_elasticsearch() {
    local endpoint="$1"
    if curl -s --max-time 5 "$endpoint/_cluster/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo "🔍 Detectando ambiente de monitoramento..."

# Variáveis padrão
ELASTICSEARCH_URL=""
MONITORING_SERVER=""

# Verificar se servidor local está rodando
if test_elasticsearch "http://localhost:9200"; then
    ELASTICSEARCH_URL="http://localhost:9200/taskflow-logs"
    echo -e "${GREEN}✅ Servidor Elasticsearch local detectado${NC}"
else
    echo -e "${YELLOW}⚠️ Servidor Elasticsearch não encontrado em localhost:9200${NC}"
    
    # Tentar IPs comuns da rede local
    LOCAL_IP=$(hostname -I | awk '{print $1}' | sed 's/\.[0-9]*$/./')
    
    for i in {1..254}; do
        TEST_IP="${LOCAL_IP}${i}"
        if test_elasticsearch "http://${TEST_IP}:9200"; then
            MONITORING_SERVER="$TEST_IP"
            ELASTICSEARCH_URL="http://${TEST_IP}:9200/taskflow-logs"
            echo -e "${GREEN}✅ Servidor de monitoramento encontrado em ${TEST_IP}${NC}"
            break
        fi
    done
    
    # Se não encontrou, pedir IP manualmente
    if [ -z "$MONITORING_SERVER" ]; then
        echo -e "${BLUE}Digite o IP do servidor de monitoramento (ou ENTER para usar localhost):${NC}"
        read -p "IP: " USER_INPUT
        
        if [ -n "$USER_INPUT" ]; then
            if test_elasticsearch "http://${USER_INPUT}:9200"; then
                MONITORING_SERVER="$USER_INPUT"
                ELASTICSEARCH_URL="http://${USER_INPUT}:9200/taskflow-logs"
                echo -e "${GREEN}✅ Conectado ao servidor ${USER_INPUT}${NC}"
            else
                echo -e "${RED}❌ Não foi possível conectar a ${USER_INPUT}:9200${NC}"
                echo -e "${YELLOW}Continuando sem monitoramento remoto...${NC}"
                ELASTICSEARCH_URL="http://localhost:9200/taskflow-logs"
            fi
        else
            ELASTICSEARCH_URL="http://localhost:9200/taskflow-logs"
        fi
    fi
fi

# Coletar informações do usuário
echo ""
echo -e "${BLUE}🧑‍💻 Configuração do usuário:${NC}"

# Nome do usuário
if [ -z "$USER_NAME" ]; then
    read -p "Digite seu nome completo: " USER_NAME
fi

# Equipe
if [ -z "$TEAM_NAME" ]; then
    read -p "Digite sua equipe/departamento: " TEAM_NAME
fi

# Role/Função
if [ -z "$USER_ROLE" ]; then
    echo "Selecione sua função:"
    echo "1) Developer"
    echo "2) Senior Developer"
    echo "3) Tech Lead"
    echo "4) Product Manager"
    echo "5) Designer"
    echo "6) QA/Tester"
    echo "7) DevOps"
    echo "8) Outro"
    read -p "Escolha (1-8): " ROLE_CHOICE
    
    case $ROLE_CHOICE in
        1) USER_ROLE="developer" ;;
        2) USER_ROLE="senior_developer" ;;
        3) USER_ROLE="tech_lead" ;;
        4) USER_ROLE="product_manager" ;;
        5) USER_ROLE="designer" ;;
        6) USER_ROLE="qa_tester" ;;
        7) USER_ROLE="devops" ;;
        8) 
            read -p "Digite sua função: " USER_ROLE
            ;;
        *) USER_ROLE="developer" ;;
    esac
fi

# Detectar localização
LOCATION=$(curl -s --max-time 3 "https://ipapi.co/city" 2>/dev/null || echo "Unknown")
if [ "$LOCATION" = "Unknown" ]; then
    read -p "Digite sua localização (cidade, país): " LOCATION
fi

# Gerar ID único do usuário
USER_ID="${USER_NAME// /_}_$(hostname)_$(date +%s)"

echo ""
echo -e "${GREEN}📋 Resumo da configuração:${NC}"
echo "👤 Nome: $USER_NAME"
echo "🏢 Equipe: $TEAM_NAME"
echo "💼 Função: $USER_ROLE"
echo "📍 Localização: $LOCATION"
echo "🖥️ Máquina: $(hostname)"
echo "🌐 Monitoramento: $ELASTICSEARCH_URL"
echo "🆔 User ID: $USER_ID"

# Confirmação
echo ""
read -p "Confirmar configuração? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Configuração cancelada."
    exit 1
fi

# Criar diretório .mcp se não existir
mkdir -p .mcp

# Criar configuração MCP
echo ""
echo -e "${BLUE}📝 Criando configuração MCP...${NC}"

cat > mcp.json << EOF
{
  "dbPath": ".mcp/graph.db",
  "embeddingsModel": "all-MiniLM-L6-v2",
  "esEndpoint": "${ELASTICSEARCH_URL}",
  "contextTokens": 1024,
  "user": {
    "id": "${USER_ID}",
    "name": "${USER_NAME}",
    "team": "${TEAM_NAME}",
    "role": "${USER_ROLE}",
    "location": "${LOCATION}",
    "machine": "$(hostname)",
    "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "ip": "$(hostname -I | awk '{print $1}')"
  },
  "monitoring": {
    "enabled": true,
    "level": "detailed",
    "includeGeoLocation": true,
    "includeSystemMetrics": true,
    "flushInterval": 30000,
    "batchSize": 10,
    "retryAttempts": 3
  }
}
EOF

echo -e "${GREEN}✅ Configuração criada em mcp.json${NC}"

# Registrar início da sessão
echo ""
echo -e "${BLUE}📊 Registrando início da sessão...${NC}"

SESSION_DATA=$(cat << EOF
{
  "@timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "user_id": "${USER_ID}",
  "user_name": "${USER_NAME}",
  "team_name": "${TEAM_NAME}",
  "user_role": "${USER_ROLE}",
  "location": "${LOCATION}",
  "action": "session_start",
  "machine_name": "$(hostname)",
  "ip_address": "$(hostname -I | awk '{print $1}')",
  "os": "$(uname -s)",
  "arch": "$(uname -m)",
  "shell": "${SHELL}",
  "tags": ["taskflow", "session", "start"],
  "metadata": {
    "timezone": "$(date +%Z)",
    "user_agent": "TaskFlow-PM-CLI/1.0",
    "session_type": "work_session"
  }
}
EOF
)

# Tentar enviar dados de sessão
if curl -X POST "${ELASTICSEARCH_URL}/_doc" \
   -H 'Content-Type: application/json' \
   -d "$SESSION_DATA" \
   --max-time 10 > /dev/null 2>&1; then
    echo -e "${GREEN}📊 Sessão registrada no monitoramento${NC}"
else
    echo -e "${YELLOW}⚠️ Falha ao registrar sessão (continuando sem monitoramento)${NC}"
fi

# Verificar se o projeto MCP já foi inicializado
if [ ! -f ".mcp/graph.db" ]; then
    echo ""
    echo -e "${BLUE}🔧 Inicializando projeto MCP...${NC}"
    if command_exists mcp; then
        mcp init > /dev/null 2>&1 || echo -e "${YELLOW}⚠️ MCP já inicializado${NC}"
    elif command_exists npx; then
        npx mcp init > /dev/null 2>&1 || echo -e "${YELLOW}⚠️ MCP já inicializado${NC}"
    fi
fi

# Criar script para parar o monitoramento
cat > scripts/stop-monitoring.sh << 'EOF'
#!/bin/bash

echo "🛑 Parando monitoramento do Task Flow PM..."

# Ler configuração atual
if [ -f "mcp.json" ]; then
    USER_ID=$(grep -o '"id": "[^"]*"' mcp.json | head -1 | sed 's/"id": "\([^"]*\)"/\1/')
    USER_NAME=$(grep -o '"name": "[^"]*"' mcp.json | head -1 | sed 's/"name": "\([^"]*\)"/\1/')
    ES_ENDPOINT=$(grep -o '"esEndpoint": "[^"]*"' mcp.json | sed 's/"esEndpoint": "\([^"]*\)"/\1/')
    
    # Enviar evento de fim de sessão
    SESSION_END_DATA=$(cat << EOL
{
  "@timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "user_id": "${USER_ID}",
  "user_name": "${USER_NAME}",
  "action": "session_end",
  "machine_name": "$(hostname)",
  "tags": ["taskflow", "session", "end"]
}
EOL
)
    
    curl -X POST "${ES_ENDPOINT}/_doc" \
         -H 'Content-Type: application/json' \
         -d "$SESSION_END_DATA" \
         --max-time 5 > /dev/null 2>&1 && echo "📊 Fim de sessão registrado"
fi

echo "✅ Monitoramento parado."
EOF

chmod +x scripts/stop-monitoring.sh

# Instruções finais
echo ""
echo -e "${GREEN}🎉 Configuração completa!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. ${YELLOW}Trabalhe normalmente${NC} - todas as atividades serão monitoradas"
echo "2. ${YELLOW}mcp plan spec.md${NC} - para gerar tarefas de uma especificação"
echo "3. ${YELLOW}mcp tasks${NC} - para ver todas as tarefas"
echo "4. ${YELLOW}mcp begin TASK_ID${NC} - para começar uma tarefa (inicia time tracking)"
echo "5. ${YELLOW}mcp done TASK_ID${NC} - para completar uma tarefa"
echo ""
echo -e "${BLUE}📊 Visualizar dados:${NC}"
if [ -n "$MONITORING_SERVER" ]; then
    echo "• Kibana: ${YELLOW}http://${MONITORING_SERVER}:5601${NC}"
    echo "• Grafana: ${YELLOW}http://${MONITORING_SERVER}:3001${NC} (admin/admin)"
else
    echo "• Kibana: ${YELLOW}http://localhost:5601${NC}"
    echo "• Grafana: ${YELLOW}http://localhost:3001${NC} (admin/admin)"
fi
echo ""
echo -e "${BLUE}🛑 Para parar o monitoramento:${NC} ${YELLOW}./scripts/stop-monitoring.sh${NC}"
echo ""
echo -e "${GREEN}✨ Tudo pronto! Suas atividades serão monitoradas automaticamente.${NC}" 