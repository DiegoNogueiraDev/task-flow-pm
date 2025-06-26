# 🚀 Início Rápido - Task Flow PM

> **Tenha seu primeiro projeto inteligente funcionando em menos de 5 minutos!**

## ⚡ Configuração Express (5 minutos)

### 1. Instale as dependências
```bash
git clone <repo-url>
cd task-flow-pm
npm install && npm run build
```

### 2. Configure sua IDE favorita

#### Para **Cursor** (Recomendado):
```bash
# Linux/Mac/WSL
./scripts/setup-cursor.sh

# Windows
.\scripts\setup-cursor.ps1
```

#### Para **VS Code**:
```bash
# Linux/Mac/WSL  
./scripts/setup-vscode.sh

# Windows
.\scripts\setup-vscode.ps1
```

### 3. Inicialize e teste
```bash
# Inicializar projeto
npm run cli init

# Testar com especificação de exemplo
npm run cli plan spec.md

# Ver tarefas geradas
npm run cli tasks

# Obter próxima tarefa
npm run cli next
```

## 🎯 Primeiro Projeto (10 minutos)

### 1. Crie sua especificação
```bash
cat > meu-projeto.md << 'EOF'
# App de Notas Pessoais

## Funcionalidades Principais
- Criar, editar e deletar notas
- Organizar notas por categorias
- Busca por conteúdo
- Backup automático

## Interface
- Interface web responsiva
- Design minimalista
- Dark/Light mode

## Técnico
- Backend API REST
- Banco de dados SQLite
- Frontend em React
- Testes automatizados
EOF
```

### 2. Gere o plano de desenvolvimento
```bash
npm run cli plan meu-projeto.md
```

### 3. Inicie o desenvolvimento
```bash
# Veja todas as tarefas criadas
npm run cli tasks

# Pegue a primeira tarefa
TASK_ID=$(npm run cli next | grep "ID:" | cut -d' ' -f4)

# Inicie a tarefa
npm run cli begin $TASK_ID

# Gere código scaffold
npm run cli scaffold $TASK_ID
```

### 4. Desenvolvimento no Cursor/VS Code
```bash
# Abra a IDE (se não configurou auto-open)
cursor .   # ou: code .

# No chat da IDE, teste:
"Qual minha próxima tarefa?"
"Gerar código para login de usuários"
"Buscar tarefas relacionadas a autenticação"
```

### 5. Finalize e aprenda
```bash
# Quando terminar a implementação
npm run cli done $TASK_ID 60  # 60 minutos gastos

# Adicione reflexão
npm run cli reflect $TASK_ID "API foi mais simples que esperado"

# Veja estatísticas
npm run cli stats
```

## 🎨 Personalização Rápida

### Idioma Português
```bash
# Configure para português
export MCP_LANG=pt-BR

# Ou use comandos em português diretamente
npm run cli-pt tarefas
npm run cli-pt proxima
```

### Integração com Embeddings Python (Opcional)
```bash
# Instale para busca semântica melhorada
pip install sentence-transformers

# Teste embeddings
npm run test:js-embeddings
```

## 🔍 Comandos Essenciais

### Gestão de Tarefas
```bash
npm run cli tasks           # Listar todas
npm run cli tasks pending   # Apenas pendentes  
npm run cli next            # Próxima recomendada
npm run cli search "auth"   # Busca semântica
```

### Workflow de Desenvolvimento
```bash
npm run cli begin <id>      # Iniciar tarefa
npm run cli scaffold <id>   # Gerar código
npm run cli done <id> 45    # Marcar concluída
npm run cli reflect <id> "nota"  # Adicionar reflexão
```

### Análise e Relatórios
```bash
npm run cli stats           # Métricas de aprendizado
npm run cli tasks completed # Trabalho realizado
npm run cli details <id>    # Detalhes completos
```

## 🆘 Solução Rápida de Problemas

### ❌ Comando não encontrado
```bash
npm run build  # Recompile primeiro
```

### ❌ Permissão negada (Linux/Mac)
```bash
chmod +x scripts/*.sh
```

### ❌ Python não encontrado
```bash
# Normal! Sistema usa JavaScript automaticamente
npm run test:js-embeddings  # Confirma funcionamento
```

### ❌ IDE não detecta MCP
```bash
# Reinicie a IDE após configuração
# Verifique se .cursor/cursor.local-mcp.json existe
```

## 🎓 Próximos Passos

1. **📖 Leia a documentação completa**: [`README.md`](README.md)
2. **🔧 Configure avançado**: [`docs/cursor-setup.md`](docs/cursor-setup.md)
3. **🎯 Entenda metodologias**: [`docs/methods.md`](docs/methods.md)
4. **🧪 Execute testes**: [`docs/test-howto.md`](docs/test-howto.md)

## ✨ Dicas Pro

### Maximize a Produtividade
- Use `npm run cli next` toda manhã para começar com foco
- Configure aliases: `alias task="npm run cli"`
- Sempre adicione reflexões com `reflect` para melhorar estimativas
- Use busca semântica para encontrar trabalho relacionado rapidamente

### Comandos da IDE
- **Cursor**: "What's my next task?" → resposta automática via MCP
- **VS Code**: Configure tasks (Ctrl+Shift+P → "Tasks") para workflows

### Organização
- Crie specs detalhadas para melhor decomposição
- Use tags específicas do domínio (auth, api, ui, tests)
- Revise estimativas regularmente com `npm run cli stats`

---

**🎉 Pronto! Você já tem um sistema de gestão de projetos com IA funcionando!**

Para dúvidas: [`docs/`](docs/) | Para contribuir: [`CONTRIBUTING.md`](CONTRIBUTING.md) 