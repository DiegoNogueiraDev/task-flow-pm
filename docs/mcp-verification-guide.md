# MCP Server Verification Guide

## 🎯 Cursor - Como Verificar MCP Status

### **Método 1: Status Bar (Mais Fácil)**
```
Após abrir projeto no Cursor, procure na barra de status (bottom):

✅ Status Ativo:
   [MCP: local-task-mcp ●] 
   ● = servidor ativo e conectado

❌ Status Inativo:
   [MCP: local-task-mcp ○] 
   ○ = servidor não conectado

⚠️ Status Error:
   [MCP: local-task-mcp ⚠] 
   ⚠ = erro na conexão
```

### **Método 2: Command Palette**
```bash
# Abrir Command Palette
Ctrl+Shift+P (Windows/Linux)
Cmd+Shift+P (Mac)

# Buscar comandos MCP
> MCP: Show Server Status
> MCP: List Available Tools  
> MCP: Restart Server
> MCP: View Server Logs
```

### **Método 3: Settings UI**
```
File → Preferences → Settings
Search: "MCP"

Você verá:
┌─────────────────────────────────────┐
│ Model Context Protocol              │
│ ✅ Enable MCP Servers               │
│ ┌─────────────────────────────────┐ │
│ │ Configured Servers:             │ │
│ │ • local-task-mcp     [Active]   │ │
│ │   Status: Connected ●           │ │
│ │   Tools: 8 available            │ │
│ │   [View Details] [Restart]      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Método 4: Chat Integration Check**
```
Open Cursor Chat (Ctrl+L)

No campo de input, você verá:
┌────────────────────────────────────┐
│ @ [Tab for suggestions]            │
│                                    │
│ Available contexts:                │
│ • @files                          │
│ • @web                            │
│ • @mcp-local-task ← MCP ativo!    │
└────────────────────────────────────┘

Se @mcp-local-task aparecer = MCP funcionando!
```

## 🔍 **VSCode - Como Verificar MCP Status**

### **Método 1: Extensions View**
```
Ctrl+Shift+X → Search "MCP"

Se instalou extensão MCP:
┌─────────────────────────────────────┐
│ MCP Client Extension                │
│ ✅ Enabled                          │
│ ┌─────────────────────────────────┐ │
│ │ Connected Servers:              │ │
│ │ • local-task-mcp                │ │
│ │   Port: stdio                   │ │
│ │   Status: Running ●             │ │
│ │   Tools: 8 found                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Método 2: Output Panel**
```
View → Output → Select "MCP Client" from dropdown

Você verá logs como:
[INFO] MCP Server local-task-mcp starting...
[INFO] Connected to server via stdio
[INFO] Found 8 tools: generateTasksFromSpec, listTasks, getTaskDetails...
[INFO] MCP Server ready ✅
```

### **Método 3: Settings JSON**
```
Ctrl+Shift+P → "Preferences: Open Settings (JSON)"

Procure por:
{
  "mcp.servers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "status": "connected",     ← Status aqui!
      "tools": [
        "generateTasksFromSpec",
        "listTasks", 
        "getTaskDetails",
        "beginTask",
        "markTaskComplete",
        "getNextTask",
        "reflectTask",
        "generateScaffold"
      ]
    }
  }
}
```

## 🛠️ **Lista Completa de Tools Disponíveis**

### **Quando MCP estiver ativo, você deve ver estas 12 tools:**

```json
{
  "tools": [
    {
      "name": "generateTasksFromSpec",
      "description": "Generate tasks from specification text",
      "status": "available"
    },
    {
      "name": "listTasks", 
      "description": "List tasks with optional filters",
      "status": "available"
    },
    {
      "name": "getTaskDetails",
      "description": "Get detailed task information",
      "status": "available"
    },
    {
      "name": "beginTask",
      "description": "Start working on a task",
      "status": "available"
    },
    {
      "name": "markTaskComplete",
      "description": "Mark task as completed",
      "status": "available"
    },
    {
      "name": "getNextTask",
      "description": "Get next recommended task",
      "status": "available"
    },
    {
      "name": "reflectTask",
      "description": "Add reflection note to task",
      "status": "available"
    },
    {
      "name": "generateScaffold",
      "description": "Generate code scaffold for task",
      "status": "available"
    },
    {
      "name": "hybridSearch",
      "description": "Search tasks using hybrid algorithm",
      "status": "available"
    },
    {
      "name": "storeDocument",
      "description": "Store document with embeddings",
      "status": "available"
    },
    {
      "name": "retrieveContext",
      "description": "Retrieve relevant context",
      "status": "available"
    },
    {
      "name": "healthCheck",
      "description": "Check MCP server health",
      "status": "available"
    }
  ]
}
```

## 🔧 **Troubleshooting - Se MCP Não Aparecer**

### **Problema 1: Servidor Não Inicia**
```bash
# Teste manual do servidor
cd seu-projeto
npm run dev

# Deve mostrar:
# MCP Server started and listening on stdin/stdout

# Se não funcionar:
npm run build    # Rebuild
npm install      # Reinstall deps
```

### **Problema 2: Configuração Não Detectada**
```bash
# Verificar arquivos de config
ls -la .cursor/mcp.json          # Cursor
ls -la .vscode/settings.json     # VSCode

# Recriar config se necessário
./scripts/setup-cursor-smart.sh
```

### **Problema 3: Tools Não Aparecem**
```bash
# Testar servidor manualmente
echo '{"command":"listTasks"}' | node dist/bin/server.js

# Deve retornar JSON válido
# Se retornar erro = problema no servidor
```

### **Problema 4: Cursor/VSCode Não Detecta**
```
1. Restart IDE completamente
2. Reload Window (Ctrl+Shift+P → "Developer: Reload Window")
3. Check Extensions (disable/enable MCP extension)
4. Clear cache if needed
```

## 📊 **Health Check Script**

### **Script Automático de Verificação**
```bash
#!/bin/bash
# scripts/check-mcp-status.sh

echo "🔍 Verificando Status do MCP Local"
echo "================================="

# 1. Verificar build
if [ -f "dist/bin/server.js" ]; then
    echo "✅ Servidor compilado"
else
    echo "❌ Servidor não compilado - execute: npm run build"
    exit 1
fi

# 2. Testar servidor
echo "🧪 Testando servidor..."
timeout 5s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

# 3. Testar comandos MCP
echo '{"command":"listTasks"}' | node dist/bin/server.js > /tmp/mcp-test.json 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Servidor MCP respondendo"
    TOOL_COUNT=$(cat /tmp/mcp-test.json | grep -o '"command"' | wc -l)
    echo "📊 Tools disponíveis: verificado"
else
    echo "❌ Servidor MCP não responde"
    cat /tmp/mcp-test.json
fi

kill $SERVER_PID 2>/dev/null
rm -f /tmp/mcp-test.json

# 4. Verificar configuração Cursor
if [ -f ".cursor/mcp.json" ]; then
    echo "✅ Configuração Cursor encontrada"
else
    echo "⚠️  Configuração Cursor não encontrada"
fi

# 5. Verificar configuração VSCode  
if [ -f ".vscode/settings.json" ]; then
    echo "✅ Configuração VSCode encontrada"
else
    echo "ℹ️  Configuração VSCode não encontrada (normal se usando só Cursor)"
fi

echo
echo "🎯 Próximos passos se MCP não aparecer na IDE:"
echo "1. Restart da IDE"
echo "2. Reload Window"
echo "3. Check extensions MCP"
echo "4. Verificar logs da IDE"
```

## 🎭 **Demonstração Visual**

### **Cursor - Interface Esperada**
```
┌─ Cursor IDE ─────────────────────────────────────┐
│ File Edit View ... [●●●] [MCP: local-task-mcp ●]│
├─────────────────────────────────────────────────┤
│                                                 │
│  Chat Panel:                                    │
│  ┌─────────────────────────────────────────────┐│
│  │ @mcp-local-task available ✅                ││
│  │                                             ││
│  │ > What's my next task?                      ││
│  │ 🤖 Based on MCP data, your next task is... ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  Status Bar: [MCP: local-task-mcp ● Connected] │
└─────────────────────────────────────────────────┘
```

### **VSCode - Interface Esperada**
```
┌─ VS Code ───────────────────────────────────────┐
│ File Edit View ... Extensions [MCP Status: ●]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Command Palette:                               │
│  > MCP: Show Server Status                      │
│                                                 │
│  Output Panel:                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ [MCP Client] Server local-task-mcp ready ✅ ││
│  │ [MCP Client] 8 tools loaded                 ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**💡 TL;DR: Se você vir "MCP: local-task-mcp ●" na barra de status = tudo funcionando!**