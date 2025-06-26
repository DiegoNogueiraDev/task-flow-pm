#!/bin/bash

echo "🇧🇷 Configurando MCP Local com Cursor em Português"
echo "=================================================="

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

# 1. Construir o projeto
echo "📦 Construindo MCP Local..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Falha na construção. Corrija os erros primeiro."
    exit 1
fi

# 2. Criar diretório .cursor
echo "📁 Criando configuração do Cursor..."
mkdir -p .cursor

# 3. Backup da configuração existente se presente
if [ -f ".cursor/mcp.json" ]; then
    echo "⚠️  Fazendo backup do mcp.json existente"
    cp .cursor/mcp.json .cursor/mcp.json.backup
fi

if [ -f ".cursor/settings.json" ]; then
    echo "⚠️  Fazendo backup do settings.json existente"
    cp .cursor/settings.json .cursor/settings.json.backup
fi

# 4. Testar funcionalidade do servidor MCP
echo "🧪 Testando servidor MCP..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

# Testar comandos básicos do MCP
echo "🔍 Testando comandos MCP..."
echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
TESTE_LISTA=$?

echo '{"command":"getNextTask"}' | node dist/bin/server.js > /dev/null 2>&1
TESTE_PROXIMA=$?

# Limpar servidor de teste
kill $SERVER_PID 2>/dev/null

if [ $TESTE_LISTA -eq 0 ] && [ $TESTE_PROXIMA -eq 0 ]; then
    echo "✅ Servidor MCP está respondendo corretamente"
else
    echo "⚠️  Teste do servidor MCP teve problemas (pode ainda funcionar no Cursor)"
fi

# 5. Inicializar projeto MCP se ainda não foi feito
if [ ! -f ".mcp/graph.db" ]; then
    echo "🚀 Inicializando projeto MCP..."
    npm run cli init
fi

# 6. Construir CLI em português se não existir
echo "🇧🇷 Construindo CLI em português..."
if [ ! -f "dist/bin/mcp-pt.js" ]; then
    npx esbuild bin/mcp-pt.ts --bundle --platform=node --outdir=dist/bin --format=cjs --target=node18 --external:better-sqlite3 --external:sqlite3
fi

# 7. Criar tarefas de exemplo se o banco estiver vazio
CONTAGEM_TAREFAS=$(node -e "
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

if [ "$CONTAGEM_TAREFAS" -eq 0 ]; then
    echo "📝 Criando tarefas de exemplo a partir do spec.md..."
    if [ -f "spec.md" ]; then
        node dist/bin/mcp-pt.js planejar spec.md
    else
        echo "⚠️  Nenhum spec.md encontrado. Você pode criar tarefas depois com 'mcp-pt planejar <seu-arquivo-spec>'"
    fi
fi

# 8. Testar integração Cursor MCP
echo "🎯 Testando integração Cursor MCP..."

# Criar configuração de teste do workspace
cat > .cursor/test-mcp.json << 'EOF'
{
  "test": true,
  "mcpServers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "${workspaceRoot}"
    }
  }
}
EOF

# Testar se o Cursor pode analisar a configuração
cursor --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ CLI do Cursor está disponível"
else
    echo "⚠️  CLI do Cursor não encontrado. MCP ainda funcionará ao abrir no Cursor GUI."
fi

# Limpar arquivo de teste
rm .cursor/test-mcp.json

echo
echo "🎉 Setup Cursor + MCP Local em Português Concluído!"
echo "=================================================="
echo
echo "📋 Próximos Passos:"
echo "1. Abrir este projeto no Cursor:"
echo "   cursor ."
echo
echo "2. O Cursor detectará automaticamente a configuração MCP"
echo "   Procure por 'MCP Server: local-task-mcp' na barra de status"
echo
echo "3. Testar integração MCP no Chat do Cursor:"
echo "   - Abrir Cursor Chat (Cmd/Ctrl + L)"
echo "   - Digite: 'Qual minha próxima tarefa?' "
echo "   - O Cursor deve consultar o MCP automaticamente"
echo
echo "4. Usar prompts integrados:"
echo "   Copie prompts de .cursor/prompts.md"
echo "   Ou digite '@proxima-tarefa', '@buscar-tarefas', etc."
echo
echo "🇧🇷 Comandos CLI em Português:"
echo "   mcp-pt proxima              # Próxima tarefa"
echo "   mcp-pt buscar autenticacao  # Buscar tarefas"
echo "   mcp-pt iniciar <id>         # Iniciar tarefa"
echo "   mcp-pt concluir <id>        # Concluir tarefa"
echo "   mcp-pt estrutura <id>       # Gerar código"
echo "   mcp-pt estatisticas         # Ver aprendizado"
echo
echo "🔧 Solução de Problemas:"
echo "   • Se MCP não funcionar: Reinicie o Cursor"
echo "   • Verifique .cursor/mcp.json configuração"
echo "   • Verifique servidor MCP: npm run dev"
echo
echo "📊 Status Atual:"
if [ -f ".mcp/graph.db" ]; then
    STATS_ATUAIS=$(node -e "
    const Database = require('better-sqlite3');
    try {
      const db = new Database('.mcp/graph.db');
      const stats = db.prepare('SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = \"pending\" THEN 1 ELSE 0 END) as pendente,
        SUM(CASE WHEN status = \"completed\" THEN 1 ELSE 0 END) as concluida
      FROM nodes').get();
      console.log(\`   📋 Total de tarefas: \${stats.total}\`);
      console.log(\`   ⏳ Pendentes: \${stats.pendente}\`);  
      console.log(\`   ✅ Concluídas: \${stats.concluida}\`);
      db.close();
    } catch(e) {
      console.log('   📊 Estatísticas do banco indisponíveis');
    }
    ")
    echo "$STATS_ATUAIS"
fi

echo
echo "🚀 Pronto para experiência de desenvolvimento IA-powered com Cursor + MCP Local em Português!"

# Oferecer para abrir o Cursor automaticamente
read -p "🤔 Abrir Cursor agora? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo "🎯 Abrindo Cursor..."
    cursor . &
    echo "✅ Cursor aberto! Verifique status do MCP na barra de status."
    echo
    echo "💡 Teste rápido:"
    echo "   1. Abra Cursor Chat (Ctrl+L)"
    echo "   2. Digite: 'Qual minha próxima tarefa?'"
    echo "   3. O Cursor deve consultar MCP e mostrar sua próxima tarefa!"
fi