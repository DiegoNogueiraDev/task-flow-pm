#!/bin/bash

# Task Flow PM - Diagnóstico MCP
# Script para diagnosticar problemas com o servidor MCP

echo "🔍 Task Flow PM - Diagnóstico MCP"
echo "=================================="
echo

# Verificar se o projeto foi compilado
echo "📦 Verificando build..."
if [ -f "dist/bin/server.js" ]; then
    echo "✅ Projeto compilado encontrado"
else
    echo "❌ Projeto não encontrado. Executando build..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build concluído com sucesso"
    else
        echo "❌ Falha no build. Verifique os erros acima."
        exit 1
    fi
fi

echo

# Verificar configuração do Cursor
echo "🎯 Verificando configuração do Cursor..."
if [ -f "cursor.local-mcp.json" ]; then
    echo "✅ Arquivo cursor.local-mcp.json encontrado"
    
    # Verificar formato JSON
    if jq empty cursor.local-mcp.json 2>/dev/null; then
        echo "✅ JSON válido"
        
        # Mostrar configuração
        echo "📋 Configuração atual:"
        jq . cursor.local-mcp.json
    else
        echo "❌ JSON inválido no cursor.local-mcp.json"
    fi
else
    echo "❌ Arquivo cursor.local-mcp.json não encontrado"
    echo "💡 Criando configuração padrão..."
    
    cat > cursor.local-mcp.json << 'EOF'
{
  "mcpServers": {
    "task-flow-pm": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
EOF
    echo "✅ Configuração criada"
fi

echo

# Testar servidor MCP
echo "🚀 Testando servidor MCP..."

# Teste 1: Inicialização
echo "1. Teste de inicialização..."
INIT_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 5s node dist/bin/server.js 2>/dev/null | head -n 2 | tail -n 1)

if [[ $INIT_RESPONSE == *"protocolVersion"* ]]; then
    echo "✅ Servidor inicializa corretamente"
else
    echo "❌ Falha na inicialização do servidor"
    echo "Debug: $INIT_RESPONSE"
fi

# Teste 2: Lista de ferramentas
echo "2. Teste de lista de ferramentas..."
TOOLS_RESPONSE=$(echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | timeout 5s node dist/bin/server.js 2>/dev/null | head -n 2 | tail -n 1)

if [[ $TOOLS_RESPONSE == *"generateTasksFromSpec"* ]]; then
    TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | jq '.result.tools | length' 2>/dev/null)
    echo "✅ Servidor expõe $TOOL_COUNT ferramentas"
    
    echo "📋 Ferramentas disponíveis:"
    echo "$TOOLS_RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null | while read tool; do
        echo "   • $tool"
    done
else
    echo "❌ Falha ao listar ferramentas"
    echo "Debug: $TOOLS_RESPONSE"
fi

echo

# Verificar dependências
echo "📚 Verificando dependências..."
if npm list better-sqlite3 >/dev/null 2>&1; then
    echo "✅ better-sqlite3 instalado"
else
    echo "❌ better-sqlite3 não encontrado"
fi

if [ -f "node_modules/node-fetch/package.json" ]; then
    echo "✅ node-fetch instalado"
else
    echo "❌ node-fetch não encontrado"
fi

echo

# Verificar banco de dados
echo "🗄️ Verificando banco de dados..."
if [ -f ".mcp/graph.db" ]; then
    echo "✅ Banco de dados encontrado"
    
    # Verificar se tem dados
    if command -v sqlite3 >/dev/null 2>&1; then
        TASK_COUNT=$(sqlite3 .mcp/graph.db "SELECT COUNT(*) FROM nodes;" 2>/dev/null || echo "0")
        echo "📊 Total de tarefas: $TASK_COUNT"
    fi
else
    echo "⚠️  Banco de dados não encontrado (será criado automaticamente)"
fi

echo

# Verificar porta e processos
echo "🔌 Verificando processos..."
MCP_PROCESSES=$(ps aux | grep "dist/bin/server.js" | grep -v grep | wc -l)
if [ $MCP_PROCESSES -gt 0 ]; then
    echo "⚠️  $MCP_PROCESSES processos MCP já rodando"
    echo "🔧 PIDs:"
    ps aux | grep "dist/bin/server.js" | grep -v grep | awk '{print "   " $2 " - " $11 " " $12 " " $13}'
else
    echo "✅ Nenhum processo MCP rodando (normal para stdin/stdout)"
fi

echo

# Verificar configuração do Cursor (se existir)
echo "🔧 Diagnóstico de integração..."
if [ -d ".cursor" ]; then
    echo "✅ Diretório .cursor encontrado"
    
    if [ -f ".cursor/settings.json" ]; then
        echo "📋 Configurações do Cursor:"
        if jq . .cursor/settings.json >/dev/null 2>&1; then
            jq . .cursor/settings.json
        else
            echo "❌ settings.json inválido"
        fi
    else
        echo "⚠️  Arquivo .cursor/settings.json não encontrado"
    fi
else
    echo "⚠️  Diretório .cursor não encontrado"
fi

echo

# Sugestões de correção
echo "🛠️  Soluções para problemas comuns:"
echo "================================="
echo

echo "❌ '0 tools enabled' no Cursor:"
echo "   1. Verificar se cursor.local-mcp.json está na raiz do projeto"
echo "   2. Reiniciar o Cursor completamente"
echo "   3. Verificar se o caminho para dist/bin/server.js está correto"
echo "   4. Executar: npm run build"
echo

echo "❌ Servidor não inicia:"
echo "   1. Verificar dependências: npm install"
echo "   2. Recompilar: npm run build"
echo "   3. Verificar permissões do arquivo dist/bin/server.js"
echo

echo "❌ Ferramentas não funcionam:"
echo "   1. Verificar se o banco de dados tem tarefas: npm run cli init"
echo "   2. Testar comando básico: npm run cli tasks"
echo "   3. Verificar logs do servidor MCP"
echo

echo "📝 Para testar manualmente:"
echo "   echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}' | node dist/bin/server.js"
echo

echo "🔗 Links úteis:"
echo "   • Documentação MCP: https://modelcontextprotocol.io/"
echo "   • Issues do projeto: https://github.com/user/task-flow-pm/issues"
echo "   • Logs do Cursor: Help > Toggle Developer Tools > Console"
echo

echo "✅ Diagnóstico concluído!"
echo "Se o problema persistir, compartilhe este output nos issues do projeto." 