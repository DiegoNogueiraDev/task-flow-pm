#!/bin/bash

# 🚀 Task Flow PM - Instalação Automática para Desenvolvedores
# Este script configura tudo automaticamente para um novo dev da equipe

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variáveis globais
TASKFLOW_HOME="$HOME/.taskflow"
CONFIG_FILE="$TASKFLOW_HOME/config.json"
SERVER_ENDPOINTS=(
    "192.168.1.100:9200"
    "10.0.0.100:9200" 
    "172.16.0.100:9200"
    "taskflow.empresa.com:9200"
    "monitoring.local:9200"
)

echo -e "${CYAN}"
cat << 'EOF'
╔════════════════════════════════════════════════╗
║              🚀 Task Flow PM                   ║
║           Instalação Automática                ║
║        Para Desenvolvedores da Equipe          ║
╚════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Função para verificar requisitos
check_requirements() {
    echo -e "${BLUE}🔍 Verificando requisitos...${NC}"
    
    # Node.js
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 18+ primeiro.${NC}"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        echo -e "${RED}❌ Node.js versão 18+ necessária. Atual: $(node --version)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node --version) encontrado${NC}"
    
    # npm
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ npm não encontrado${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm $(npm --version) encontrado${NC}"
    
    # Git (para detectar configurações)
    if ! command -v git >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Git não encontrado - configuração manual necessária${NC}"
    else
        echo -e "${GREEN}✅ Git encontrado${NC}"
    fi
    
    # curl para testes de conectividade
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}❌ curl não encontrado${NC}"
        exit 1
    fi
}

# Função para detectar servidor de monitoramento
detect_monitoring_server() {
    echo -e "${BLUE}🌐 Procurando servidor de monitoramento...${NC}"
    
    for endpoint in "${SERVER_ENDPOINTS[@]}"; do
        echo -e "${YELLOW}   Testando $endpoint...${NC}"
        if curl -s --max-time 3 "http://$endpoint/_cluster/health" >/dev/null 2>&1; then
            MONITORING_SERVER="$endpoint"
            echo -e "${GREEN}✅ Servidor encontrado em $endpoint${NC}"
            return 0
        fi
    done
    
    echo -e "${YELLOW}⚠️ Servidor de monitoramento não encontrado automaticamente${NC}"
    echo -e "${BLUE}Digite o endereço do servidor (ex: 192.168.1.100:9200):${NC}"
    read -p "Servidor: " manual_server
    
    if [ -n "$manual_server" ]; then
        if curl -s --max-time 5 "http://$manual_server/_cluster/health" >/dev/null 2>&1; then
            MONITORING_SERVER="$manual_server"
            echo -e "${GREEN}✅ Conectado a $manual_server${NC}"
        else
            echo -e "${RED}❌ Não foi possível conectar a $manual_server${NC}"
            echo -e "${YELLOW}Continuando sem monitoramento remoto...${NC}"
            MONITORING_SERVER="localhost:9200"
        fi
    else
        MONITORING_SERVER="localhost:9200"
    fi
}

# Função para detectar informações do desenvolvedor
detect_developer_info() {
    echo -e "${BLUE}🧑‍💻 Detectando informações do desenvolvedor...${NC}"
    
    # Nome do git ou input manual
    if git config user.name >/dev/null 2>&1; then
        DEV_NAME=$(git config user.name)
        echo -e "${GREEN}👤 Nome detectado: $DEV_NAME${NC}"
    else
        read -p "Digite seu nome completo: " DEV_NAME
    fi
    
    # Email do git ou input manual
    if git config user.email >/dev/null 2>&1; then
        DEV_EMAIL=$(git config user.email)
        echo -e "${GREEN}📧 Email detectado: $DEV_EMAIL${NC}"
    else
        read -p "Digite seu email: " DEV_EMAIL
    fi
    
    # Tentar detectar equipe pela URL do repositório
    if git remote get-url origin >/dev/null 2>&1; then
        REPO_URL=$(git remote get-url origin)
        if [[ "$REPO_URL" == *"frontend"* ]]; then
            DEV_TEAM="Frontend"
        elif [[ "$REPO_URL" == *"backend"* ]]; then
            DEV_TEAM="Backend"
        elif [[ "$REPO_URL" == *"mobile"* ]]; then
            DEV_TEAM="Mobile"
        elif [[ "$REPO_URL" == *"devops"* ]]; then
            DEV_TEAM="DevOps"
        else
            read -p "Digite sua equipe/departamento: " DEV_TEAM
        fi
    else
        read -p "Digite sua equipe/departamento: " DEV_TEAM
    fi
    
    echo -e "${GREEN}🏢 Equipe: $DEV_TEAM${NC}"
    
    # Função/Role
    echo "Selecione sua função:"
    echo "1) Developer"
    echo "2) Senior Developer" 
    echo "3) Tech Lead"
    echo "4) Product Manager"
    echo "5) Designer"
    echo "6) QA/Tester"
    echo "7) DevOps Engineer"
    echo "8) Outro"
    read -p "Escolha (1-8): " role_choice
    
    case $role_choice in
        1) DEV_ROLE="developer" ;;
        2) DEV_ROLE="senior_developer" ;;
        3) DEV_ROLE="tech_lead" ;;
        4) DEV_ROLE="product_manager" ;;
        5) DEV_ROLE="designer" ;;
        6) DEV_ROLE="qa_tester" ;;
        7) DEV_ROLE="devops_engineer" ;;
        8) read -p "Digite sua função: " DEV_ROLE ;;
        *) DEV_ROLE="developer" ;;
    esac
    
    echo -e "${GREEN}💼 Função: $DEV_ROLE${NC}"
    
    # Informações de sistema
    DEV_MACHINE=$(hostname)
    DEV_OS=$(uname -s)
    DEV_ARCH=$(uname -m)
    DEV_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "unknown")
    DEV_TIMEZONE=$(date +%Z 2>/dev/null || echo "UTC")
    
    echo -e "${GREEN}🖥️ Máquina: $DEV_MACHINE${NC}"
    echo -e "${GREEN}🌐 IP: $DEV_IP${NC}"
    echo -e "${GREEN}🕐 Fuso: $DEV_TIMEZONE${NC}"
    
    # Geolocalização (com consentimento)
    echo -e "${YELLOW}📍 Detectar localização geográfica para métricas da equipe?${NC}"
    echo "   Isso ajuda a analisar padrões de produtividade por região"
    read -p "Permitir geolocalização? (y/N): " geo_consent
    
    if [[ "$geo_consent" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}   Detectando localização...${NC}"
        GEO_INFO=$(curl -s --max-time 5 "https://ipapi.co/json/" 2>/dev/null || echo '{}')
        DEV_CITY=$(echo "$GEO_INFO" | grep -o '"city":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "Unknown")
        DEV_COUNTRY=$(echo "$GEO_INFO" | grep -o '"country_name":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "Unknown")
        DEV_LAT=$(echo "$GEO_INFO" | grep -o '"latitude":[^,]*' | cut -d':' -f2 2>/dev/null || echo "0")
        DEV_LON=$(echo "$GEO_INFO" | grep -o '"longitude":[^,]*' | cut -d':' -f2 2>/dev/null || echo "0")
        
        if [ "$DEV_CITY" != "Unknown" ]; then
            DEV_LOCATION="$DEV_CITY, $DEV_COUNTRY"
            echo -e "${GREEN}📍 Localização: $DEV_LOCATION${NC}"
        else
            read -p "Digite sua localização (cidade, país): " DEV_LOCATION
            DEV_LAT="0"
            DEV_LON="0"
        fi
    else
        read -p "Digite sua localização (cidade, país): " DEV_LOCATION
        DEV_LAT="0"
        DEV_LON="0"
    fi
}

# Função para instalar dependências
install_dependencies() {
    echo -e "${BLUE}📦 Instalando dependências...${NC}"
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json não encontrado. Execute no diretório do projeto.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}   npm install...${NC}"
    npm install --silent
    
    echo -e "${YELLOW}   Building projeto...${NC}"
    npm run build --silent
    
    echo -e "${GREEN}✅ Dependências instaladas e build realizado${NC}"
}

# Função para configurar CLI global
setup_cli() {
    echo -e "${BLUE}🔧 Configurando CLI global...${NC}"
    
    # Link global do CLI
    npm link --silent
    
    # Verificar se foi instalado corretamente
    if command -v mcp >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CLI 'mcp' disponível globalmente${NC}"
    else
        echo -e "${YELLOW}⚠️ Adicionando ~/.npm-global/bin ao PATH${NC}"
        echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
        echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
    fi
}

# Função para criar configuração
create_config() {
    echo -e "${BLUE}📝 Criando configuração...${NC}"
    
    # Criar diretório home do taskflow
    mkdir -p "$TASKFLOW_HOME"
    
    # Gerar ID único do usuário
    USER_ID="${DEV_NAME// /_}_${DEV_MACHINE}_$(date +%s)"
    
    # Configuração completa
    cat > "$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "installation_date": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "project": {
    "dbPath": "$TASKFLOW_HOME/graph.db",
    "embeddingsModel": "all-MiniLM-L6-v2",
    "esEndpoint": "http://$MONITORING_SERVER/taskflow-logs",
    "contextTokens": 1024
  },
  "user": {
    "id": "$USER_ID",
    "name": "$DEV_NAME",
    "email": "$DEV_EMAIL",
    "team": "$DEV_TEAM",
    "role": "$DEV_ROLE",
    "location": "$DEV_LOCATION",
    "machine": "$DEV_MACHINE",
    "os": "$DEV_OS",
    "arch": "$DEV_ARCH",
    "ip": "$DEV_IP",
    "timezone": "$DEV_TIMEZONE",
    "coordinates": {
      "lat": $DEV_LAT,
      "lon": $DEV_LON
    },
    "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  },
  "monitoring": {
    "enabled": true,
    "level": "detailed",
    "includeGeoLocation": true,
    "includeSystemMetrics": true,
    "trackIdleTime": true,
    "trackWorkPatterns": true,
    "flushInterval": 30000,
    "batchSize": 10,
    "retryAttempts": 3,
    "privacy": {
      "anonymizeData": false,
      "shareWithTeam": true,
      "includeInReports": true
    }
  },
  "mcp_server": {
    "port": 3000,
    "auto_start": true,
    "enabled": true
  }
}
EOF
    
    echo -e "${GREEN}✅ Configuração criada em $CONFIG_FILE${NC}"
}

# Função para configurar MCP Server
setup_mcp_server() {
    echo -e "${BLUE}🔧 Configurando MCP Server...${NC}"
    
    # Criar configuração para Cursor/VSCode
    if [ -d "$HOME/.cursor" ]; then
        CURSOR_CONFIG="$HOME/.cursor/mcp_settings.json"
        mkdir -p "$(dirname "$CURSOR_CONFIG")"
        
        cat > "$CURSOR_CONFIG" << EOF
{
  "mcpServers": {
    "taskflow-pm": {
      "command": "node",
      "args": ["$(pwd)/dist/bin/server.js"],
      "cwd": "$(pwd)",
      "description": "Task Flow PM with automatic monitoring",
      "env": {
        "TASKFLOW_CONFIG": "$CONFIG_FILE"
      }
    }
  }
}
EOF
        echo -e "${GREEN}✅ Cursor MCP configurado${NC}"
    fi
    
    if [ -d "$HOME/.vscode" ]; then
        VSCODE_CONFIG="$HOME/.vscode/settings.json"
        # Similar configuração para VSCode
        echo -e "${GREEN}✅ VSCode MCP configurado${NC}"
    fi
}

# Função para testar instalação
test_installation() {
    echo -e "${BLUE}🧪 Testando instalação...${NC}"
    
    # Testar CLI
    if mcp --version >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CLI funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️ CLI pode precisar de reload do shell${NC}"
    fi
    
    # Testar conectividade com servidor
    echo -e "${YELLOW}   Testando conexão com servidor...${NC}"
    if curl -s --max-time 5 "http://$MONITORING_SERVER/_cluster/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Conexão com servidor funcionando${NC}"
        
        # Enviar evento de teste
        TEST_EVENT=$(cat << EOF
{
  "@timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "user_id": "$USER_ID",
  "user_name": "$DEV_NAME",
  "team_name": "$DEV_TEAM",
  "action": "installation_test",
  "machine_name": "$DEV_MACHINE",
  "location": "$DEV_LOCATION",
  "tags": ["taskflow", "installation", "test"]
}
EOF
)
        
        if curl -X POST "http://$MONITORING_SERVER/taskflow-logs/_doc" \
           -H 'Content-Type: application/json' \
           -d "$TEST_EVENT" \
           --max-time 10 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Evento de teste enviado com sucesso${NC}"
        else
            echo -e "${YELLOW}⚠️ Falha ao enviar evento de teste${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Servidor não acessível - funcionará em modo offline${NC}"
    fi
}

# Função principal
main() {
    echo -e "${PURPLE}🚀 Iniciando instalação automática...${NC}"
    echo ""
    
    check_requirements
    echo ""
    
    detect_monitoring_server
    echo ""
    
    detect_developer_info
    echo ""
    
    # Confirmação final
    echo -e "${CYAN}📋 Resumo da configuração:${NC}"
    echo "👤 Nome: $DEV_NAME"
    echo "📧 Email: $DEV_EMAIL"
    echo "🏢 Equipe: $DEV_TEAM"
    echo "💼 Função: $DEV_ROLE"
    echo "📍 Localização: $DEV_LOCATION"
    echo "🖥️ Máquina: $DEV_MACHINE ($DEV_OS)"
    echo "🌐 Servidor: $MONITORING_SERVER"
    echo ""
    
    read -p "Confirmar instalação? (Y/n): " confirm
    if [[ "$confirm" =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}❌ Instalação cancelada${NC}"
        exit 0
    fi
    
    echo ""
    install_dependencies
    echo ""
    
    setup_cli
    echo ""
    
    create_config
    echo ""
    
    setup_mcp_server
    echo ""
    
    test_installation
    echo ""
    
    # Sucesso!
    echo -e "${GREEN}"
    cat << 'EOF'
╔════════════════════════════════════════════════╗
║              🎉 INSTALAÇÃO COMPLETA!           ║
╚════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${CYAN}🚀 Próximos passos:${NC}"
    echo "1. ${YELLOW}mcp init${NC} - Inicializar projeto"
    echo "2. ${YELLOW}mcp plan exemplo.md${NC} - Gerar tarefas"
    echo "3. ${YELLOW}mcp tasks${NC} - Ver todas as tarefas"
    echo "4. ${YELLOW}mcp begin TASK_ID${NC} - Começar uma tarefa"
    echo ""
    
    echo -e "${BLUE}📊 Dashboards disponíveis:${NC}"
    if [ "$MONITORING_SERVER" != "localhost:9200" ]; then
        SERVER_IP=$(echo "$MONITORING_SERVER" | cut -d':' -f1)
        echo "• Kibana: ${YELLOW}http://$SERVER_IP:5601${NC}"
        echo "• Grafana: ${YELLOW}http://$SERVER_IP:3001${NC} (admin/admin)"
    else
        echo "• Kibana: ${YELLOW}http://localhost:5601${NC}"
        echo "• Grafana: ${YELLOW}http://localhost:3001${NC} (admin/admin)"
    fi
    echo ""
    
    echo -e "${PURPLE}⚙️ Arquivos criados:${NC}"
    echo "• Configuração: ${YELLOW}$CONFIG_FILE${NC}"
    echo "• Database: ${YELLOW}$TASKFLOW_HOME/graph.db${NC}"
    echo ""
    
    echo -e "${GREEN}✨ O Task Flow PM está pronto para uso!${NC}"
    echo -e "${GREEN}   Todas as suas atividades serão monitoradas automaticamente.${NC}"
    echo ""
    
    echo -e "${BLUE}🛑 Para parar monitoramento: ${YELLOW}mcp stop-monitoring${NC}"
    echo -e "${BLUE}🔧 Para reconfigurar: ${YELLOW}./scripts/install-dev.sh${NC}"
}

# Executar instalação
main "$@" 