# 🚀 Task Flow PM - Sistema 100% Node.js

[![Node.js Only](https://img.shields.io/badge/Runtime-Node.js%20Only-brightgreen)](https://nodejs.org/)
[![No Python](https://img.shields.io/badge/Python-Zero%20Dependencies-red)](#100-nodejs)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-15%20Active-blue)](#15-ferramentas-mcp)
[![Enterprise Ready](https://img.shields.io/badge/Enterprise-Ready-gold)](#enterprise-ready)

> **Sistema inteligente de gestão de projetos com IA embarcada, Knowledge Graph e integração nativa com Cursor/VS Code**

## ⚡ Início Rápido (5 minutos)

```bash
# 1. Clonar e instalar (100% Node.js)
git clone <repo-url> && cd task-flow-pm
npm install && npm run build

# 2. Configurar IDE
./scripts/setup-cursor.sh    # ou setup-vscode.sh

# 3. Testar funcionamento
npm run test:docling          # ✅ 6 formatos de documento
npm run mcp:diagnose          # ✅ 15 ferramentas MCP
```

## 🎯 Principais Recursos

- 🧠 **IA Nativa**: Converte especificações em tarefas automaticamente
- 🔗 **Knowledge Graph**: Relacionamentos inteligentes entre tarefas
- 🔍 **Busca Híbrida**: Embeddings + grafo + busca textual
- 💻 **Integração IDE**: 15 ferramentas MCP para Cursor/VS Code
- 🏗️ **Code Scaffold**: Gera implementação + testes automaticamente
- 📄 **Documentos**: Processa PDF, DOCX, HTML, MD (100% Node.js)
- 🌐 **Multi-idioma**: Português e Inglês completos
- 🏢 **Corporate Ready**: Zero dependências Python

## 🔧 15 Ferramentas MCP

### Core Task Management
1. `generateTasksFromSpec` - Gerar tarefas de especificações
2. `listTasks` - Listar com filtros avançados
3. `getTaskDetails` - Detalhes completos
4. `beginTask` - Iniciar com time tracking
5. `markTaskComplete` - Finalizar com métricas
6. `getNextTask` - Recomendação IA

### Advanced Features  
7. `reflectTask` - Adicionar aprendizados
8. `generateScaffold` - Gerar código automático
9. `hybridSearch` - Busca semântica + grafo
10. `storeDocument` - Armazenar com embeddings
11. `retrieveContext` - Recuperar contexto
12. `trackTaskTime` - Rastreamento temporal

### **🆕 Document Processing (100% Node.js)**
13. `processDocument` - Processar e gerar tarefas
14. `convertDocument` - Converter para texto
15. `listProcessedDocuments` - Histórico

## 📄 Processamento de Documentos

**Formatos Suportados (Zero Python):**
- `.md` `.txt` `.json` - Nativo Node.js
- `.html` `.htm` - Cheerio  
- `.docx` - Mammoth
- `.pdf` - pdf-parse

```bash
# Teste de funcionamento
npm run test:docling

# Resultado esperado:
✅ 5 tarefas geradas automaticamente
✅ JSON: ✅ HTML: ✅ DOCX: ✅ PDF: ✅
💡 100% Node.js - SEM PYTHON!
```

## 🏢 Enterprise Ready

### ✅ Corporate Compliance
- **Aprovado TI**: Apenas Node.js, sem Python
- **Single Runtime**: npm install resolve tudo
- **Fast Build**: ~200ms (esbuild)
- **Small Bundle**: 14MB vs 100MB+ Python
- **Unified Pipeline**: CI/CD simplificado

### Comparação: Antes vs Depois
| Aspecto | Python+Docling | Node.js Only |
|---------|---------------|--------------|
| **Corporate Approval** | ❌ Bloqueado | ✅ Aprovado |
| **Dependencies** | 2 runtimes | 1 runtime |
| **Install Time** | ~5min | ~1min |
| **Bundle Size** | 100MB+ | 14MB |
| **Team Skills** | JS+Python | JS apenas |

## 🎮 Uso no Cursor/VS Code

### 🇧🇷 Comandos em Português
```text
"Qual minha próxima tarefa?"
"Buscar tarefas relacionadas a autenticação"
"Processar documento requisitos.docx e gerar tarefas"
"Gerar código para tarefa xyz-456"
"Status do projeto e progresso"
```

### 🇺🇸 English Commands
```text
"What's my next task?"
"Search for authentication related tasks"
"Process document spec.pdf and generate tasks"
"Generate code for task xyz-456"
"Show project status and progress"
```

## 🧪 Verificação de Funcionamento

```bash
# Health check completo
npm run mcp:diagnose

# Resultado esperado:
✅ Projeto compilado encontrado
✅ 15 ferramentas MCP funcionais  
✅ Processamento de documentos Node.js
✅ 0 dependências Python
```

## 📚 Documentação Completa

**📖 [DOCUMENTATION.md](./DOCUMENTATION.md)** - Documentação unificada completa com:

- 🚀 Guia de instalação detalhado
- 🔧 Configuração avançada IDE
- 📊 Arquitetura e fluxo de dados
- 🌐 Configuração multi-idioma
- 🔍 Métodos e workflows
- 🚀 Deploy e produção
- ❓ FAQ e troubleshooting

## 🛟 Suporte

- 📚 **Documentação**: [DOCUMENTATION.md](./DOCUMENTATION.md)
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussões**: GitHub Discussions
- 🔧 **Debug**: `npm run mcp:diagnose`

---

**Status:** ✅ **ENTERPRISE READY - 100% NODE.JS**  
**Testado em:** Linux, Windows, macOS  
**Última atualização:** Janeiro 2025