# MCP Local - Prompts do Cursor em Português

## Prompts de Gerenciamento de Tarefas

### @proxima-tarefa
```
Consulte o servidor MCP para minha próxima tarefa recomendada. Inclua:
- Título e descrição da tarefa
- Tempo estimado e prioridade
- Dependências que precisam ser concluídas primeiro
- Contexto relacionado de tarefas anteriores

Use o comando proximaTarefa do MCP e forneça orientação acionável.
```

### @buscar-tarefas  
```
Buscar tarefas relacionadas a: {consulta}

Use o comando buscaHibrida do MCP para encontrar:
- Tarefas semanticamente similares
- Tarefas com dependências relacionadas
- Contexto histórico e decisões
- Exemplos de código de implementações similares

Forneça os 5 resultados mais relevantes com contexto.
```

### @contexto-tarefa
```
Estou trabalhando na tarefa ID: {id-tarefa}

Por favor, use detalhesTarefa para recuperar:
- Informações completas da tarefa
- Todas as dependências e bloqueios
- Tarefas filhas e subtarefas
- Código ou documentação relacionada
- Reflexões e aprendizados anteriores

Forneça um resumo abrangente do contexto para codificação.
```

### @planejar-projeto
```
Analise a seguinte especificação e crie um plano de projeto:

{texto_especificacao}

Use gerarTarefas para criar:
- Divisão em nível de épico
- Histórias de usuário com critérios de aceite
- Tarefas técnicas com dependências
- Estimativas de tempo e prioridades

Forneça um roadmap estruturado com marcos.
```

### @reflexao-tarefa
```
Acabei de concluir a tarefa {id-tarefa} e levou {tempo-real} minutos.

Principais aprendizados e desafios:
{notas_reflexao}

Use reflexaoTarefa para armazenar este aprendizado e peça ao sistema para:
- Atualizar modelos de estimativa
- Capturar lições aprendidas
- Sugerir melhorias para tarefas similares futuras
- Atualizar base de conhecimento do projeto
```

## Prompts de Desenvolvimento

### @estrutura-tarefa
```
Gere uma estrutura de código para a tarefa: {id-tarefa}

Use o comando gerarEstructura do MCP para criar:
- Estrutura de arquivos de implementação
- Arquivos de teste com casos iniciais
- Templates de documentação
- Comentários TODO com critérios de aceite

Depois me ajude a entender a estrutura gerada e próximos passos.
```

### @codigo-com-contexto
```
Preciso implementar: {descricao_funcionalidade}

Primeiro, busque por tarefas e contexto relacionados usando MCP, depois:
- Forneça orientação de implementação baseada em padrões do projeto
- Sugira estrutura de código seguindo convenções estabelecidas
- Inclua tratamento de erros e casos extremos
- Adicione testes e documentação apropriados

Use contexto do projeto para garantir consistência.
```

### @estimar-esforco
```
Me ajude a estimar o esforço para: {descricao_tarefa}

Considere:
- Tarefas similares concluídas neste projeto (consulte MCP)
- Fatores de complexidade e dependências
- Velocidade da equipe e dados históricos
- Riscos técnicos e incógnitas

Forneça faixa de estimativa com nível de confiança.
```

## Prompts de Análise

### @status-projeto
```
Me dê um status abrangente do projeto usando dados do MCP:

Consulte por:
- Tarefas por status (pendente, em-andamento, concluída)
- Tendências de velocidade e precisão de estimativa
- Tarefas bloqueadas e problemas de dependência
- Conclusões recentes e produtividade da equipe

Forneça resumo estilo dashboard com insights.
```

### @insights-aprendizado
```
Analise nossos padrões de desenvolvimento e aprendizados:

Use MCP para revisar:
- Tendências de precisão de estimativa
- Gargalos e desafios comuns
- Padrões de trabalho mais produtivos
- Áreas para melhoria de processo

Forneça recomendações acionáveis para eficiência da equipe.
```

### @analise-dependencias
```
Analise o grafo de dependências para: {epico_ou_funcionalidade}

Use MCP para mapear:
- Dependências do caminho crítico
- Potenciais gargalos
- Oportunidades de trabalho paralelo
- Fatores de risco e mitigação

Forneça resumo visual de dependências e recomendações.
```

## Prompts de Integração

### @sincronizar-externo
```
Me ajude a sincronizar dados do MCP com ferramentas externas:

- Exportar status atual do projeto para atualizações de stakeholders
- Gerar relatórios para ferramentas de gestão de projeto
- Criar documentação para base de conhecimento da equipe
- Preparar métricas para retrospectivas

Formate saídas para fácil cópia-cola em outras ferramentas.
```

### @integrar-colega
```
Crie um guia de integração para um novo membro da equipe:

Use MCP para reunir:
- Estrutura atual do projeto e prioridades
- Decisões importantes e escolhas arquiteturais
- Padrões de desenvolvimento e convenções
- Contexto importante e conhecimento tribal

Forneça guia abrangente de primeiros passos.
```

## Instruções de Uso

1. **Copie o prompt desejado** no chat do Cursor
2. **Substitua os placeholders** como {id-tarefa}, {consulta} com valores reais
3. **O Cursor automaticamente** usará comandos MCP quando disponível
4. **Faça perguntas de acompanhamento** baseadas nas respostas do MCP

## Comandos Personalizados

Você também pode pedir ao Cursor para:
- "Verificar minha próxima tarefa usando MCP"
- "Buscar tarefas relacionadas à autenticação"
- "Gerar estrutura para a funcionalidade de login"
- "Mostrar estatísticas do projeto do MCP"
- "Me ajudar a refletir sobre a tarefa de API que acabei de terminar"

## Dicas

- **Seja específico** com IDs de tarefa e termos de busca
- **Faça perguntas de acompanhamento** para aprofundar nos dados do MCP
- **Combine prompts** para workflows complexos
- **Salve prompts usados frequentemente** como snippets do Cursor