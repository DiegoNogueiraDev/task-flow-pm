#!/bin/bash

echo "🌐 Configurando MCP Local Multi-Idioma com Cursor"
echo "=============================================="

# Detectar idioma do sistema
detect_language() {
    if [[ "$LANG" == *"pt"* ]] || [[ "$LANG" == *"BR"* ]]; then
        echo "pt-BR"
    else
        echo "en"
    fi
}

DETECTED_LANG=$(detect_language)

# Perguntar preferência do usuário
echo "🌍 Idioma detectado do sistema: $DETECTED_LANG"
echo ""
echo "Escolha seu idioma preferido:"
echo "1) English (en)"
echo "2) Português Brasil (pt-BR)" 
echo "3) Auto-detect (usar detecção automática)"
echo ""
read -p "Escolha (1-3) [3]: " LANG_CHOICE

case $LANG_CHOICE in
    1) USER_LANG="en" ;;
    2) USER_LANG="pt-BR" ;;
    *) USER_LANG="auto" ;;
esac

echo "✅ Configuração: $USER_LANG"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script a partir da raiz do projeto mcp-local"
    exit 1
fi

# Verificar se o Cursor está instalado
if ! command -v cursor &> /dev/null; then
    echo "❌ Cursor não está instalado ou não está no PATH"
    echo "💡 Baixar de: https://cursor.sh/"
    exit 1
fi

# 1. Build do projeto
echo "📦 Construindo MCP Local (versão unificada)..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Falha na construção. Corrija os erros primeiro."
    exit 1
fi

# 2. Criar configuração .cursor
echo "📁 Criando configuração inteligente do Cursor..."
mkdir -p .cursor

# 3. Criar configuração MCP inteligente
cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "\${workspaceRoot}",
      "description": "Local-first task management with intelligent context (Multi-language)",
      "env": {
        "NODE_ENV": "production",
        "MCP_PREFERRED_LANG": "$USER_LANG"
      }
    }
  }
}
EOF

# 4. Criar configurações inteligentes do Cursor
cat > .cursor/settings.json << EOF
{
  "cursor.mcp.enabled": true,
  "cursor.mcp.autoStart": true,
  "cursor.mcp.servers": ["local-task-mcp"],
  "cursor.chat.contextAwareness": "enhanced",
  "cursor.chat.systemLanguage": "$USER_LANG",
  "mcp.local.preferredLanguage": "$USER_LANG",
  "mcp.local.autoDetectLanguage": $([ "$USER_LANG" = "auto" ] && echo "true" || echo "false"),
  "mcp.local.commands": {
    "english": "mcp",
    "portuguese": "mcp-pt",
    "unified": "mcp"
  },
  "cursor.chat.aliases": {
    "next": "Get my next priority task using MCP",
    "proxima": "Obter minha próxima tarefa prioritária via MCP",
    "search": "Search MCP for tasks related to: ",
    "buscar": "Buscar no MCP tarefas relacionadas a: ",
    "context": "Get full MCP context for task: ",
    "contexto": "Obter contexto completo MCP para tarefa: ",
    "scaffold": "Generate code scaffold for task: ",
    "estrutura": "Gerar estrutura de código para tarefa: ",
    "status": "Show project status from MCP",
    "projeto": "Mostrar status do projeto via MCP"
  }
}
EOF

# 5. Testar servidor MCP
echo "🧪 Testando servidor MCP..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Servidor MCP funcionando"
else
    echo "⚠️  Teste do servidor MCP teve problemas"
fi

kill $SERVER_PID 2>/dev/null

# 6. Inicializar projeto se necessário
if [ ! -f ".mcp/graph.db" ]; then
    echo "🚀 Inicializando projeto MCP..."
    if [ "$USER_LANG" = "pt-BR" ]; then
        LANG=pt_BR.UTF-8 node dist/bin/mcp-unified.js inicializar
    else
        node dist/bin/mcp-unified.js init
    fi
fi

# 7. Criar tarefas de exemplo se necessário
TASK_COUNT=$(node -e "
const Database = require('better-sqlite3');
try {
  const db = new Database('.mcp/graph.db');
  const count = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
  console.log(count.count);
  db.close();
} catch(e) {
  console.log('0');
}
")

if [ "$TASK_COUNT" -eq 0 ] && [ -f "spec.md" ]; then
    echo "📝 Criando tarefas de exemplo..."
    if [ "$USER_LANG" = "pt-BR" ]; then
        LANG=pt_BR.UTF-8 node dist/bin/mcp-unified.js planejar spec.md
    else
        node dist/bin/mcp-unified.js plan spec.md
    fi
fi

# 8. Criar aliases inteligentes baseados na preferência
echo "🔧 Configurando aliases inteligentes..."

if [ "$USER_LANG" = "pt-BR" ]; then
    cat >> ~/.bashrc << 'EOF'

# MCP Local - Aliases em Português
alias mcp-proxima="mcp-pt proxima"
alias mcp-tarefas="mcp-pt tarefas"
alias mcp-buscar="mcp-pt buscar"
alias mcp-iniciar="mcp-pt iniciar"
alias mcp-concluir="mcp-pt concluir"
alias mcp-stats="mcp-pt estatisticas"
EOF
elif [ "$USER_LANG" = "en" ]; then
    cat >> ~/.bashrc << 'EOF'

# MCP Local - English Aliases  
alias mcp-next="mcp next"
alias mcp-tasks="mcp tasks"
alias mcp-search="mcp search" 
alias mcp-begin="mcp begin"
alias mcp-done="mcp done"
alias mcp-stats="mcp stats"
EOF
fi

echo
echo "🎉 Setup Multi-Idioma Concluído!"
echo "================================"
echo
echo "📋 Configuração:"
echo "   🌍 Idioma preferido: $USER_LANG"
echo "   🤖 Auto-detecção: $([ "$USER_LANG" = "auto" ] && echo "Habilitada" || echo "Desabilitada")"
echo "   📁 Configuração salva em: .cursor/"
echo
echo "🚀 Como usar:"
echo

if [ "$USER_LANG" = "pt-BR" ]; then
    echo "   Português:"
    echo "   mcp-pt proxima              # Próxima tarefa"
    echo "   mcp-pt buscar autenticacao  # Buscar tarefas"
    echo "   mcp-pt iniciar <id>         # Iniciar tarefa"
    echo "   mcp-pt estatisticas         # Ver estatísticas"
    echo
    echo "   Cursor Chat:"
    echo "   'Qual minha próxima tarefa?'"
    echo "   'Buscar tarefas de autenticação'"
    echo "   'Status do projeto'"
elif [ "$USER_LANG" = "en" ]; then
    echo "   English:"
    echo "   mcp next                    # Next task"
    echo "   mcp search authentication   # Search tasks"
    echo "   mcp begin <id>              # Begin task" 
    echo "   mcp stats                   # View statistics"
    echo
    echo "   Cursor Chat:"
    echo "   'What's my next task?'"
    echo "   'Search for authentication tasks'"
    echo "   'Show project status'"
else
    echo "   Auto-detect (use either):"
    echo "   mcp next     ou     mcp-pt proxima"
    echo "   mcp search   ou     mcp-pt buscar"
    echo "   mcp begin    ou     mcp-pt iniciar"
    echo
    echo "   Cursor Chat (either language):"
    echo "   'What's my next task?' ou 'Qual minha próxima tarefa?'"
    echo "   'Search tasks' ou 'Buscar tarefas'"
fi

echo
echo "🔧 Comandos universais:"
echo "   mcp --help                  # Ajuda em inglês"
echo "   mcp-pt --help               # Ajuda em português"
echo "   mcp --lang=en next          # Forçar inglês"
echo "   mcp --lang=pt-BR proxima    # Forçar português"
echo
echo "💡 Dicas:"
echo "   • Use qualquer comando - a detecção é automática"
echo "   • No Cursor Chat, fale naturalmente em qualquer idioma"
echo "   • Para mudar idioma: edite .cursor/settings.json"
echo "   • Aliases foram adicionados ao ~/.bashrc"
echo

# Perguntar se quer abrir o Cursor
if [ "$USER_LANG" = "pt-BR" ]; then
    read -p "🤔 Abrir Cursor agora? (s/N): " -n 1 -r
else
    read -p "🤔 Open Cursor now? (y/N): " -n 1 -r
fi

echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo "🎯 Abrindo Cursor..."
    cursor . &
    echo "✅ Cursor aberto! Teste a integração MCP multi-idioma."
    echo
    if [ "$USER_LANG" = "pt-BR" ]; then
        echo "💡 Teste rápido no Cursor Chat:"
        echo "   'Qual minha próxima tarefa?'"
    else
        echo "💡 Quick test in Cursor Chat:"
        echo "   'What's my next task?'"
    fi
fi

echo
echo "🌐 MCP Local agora suporta inglês e português de forma inteligente!"