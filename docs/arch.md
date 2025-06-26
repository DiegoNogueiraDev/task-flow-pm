### Como a arquitetura do MCP foi pensada — metodologias e por quê de cada escolha

| Camada / Técnica                         | Metodologia aplicada                                                                       | Por que foi escolhida                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local-first / offline-first design**   | Edge computing + “local-first” apps: tudo roda na máquina do dev, sem serviços externos.   | • Privacidade do código e dos prompts.<br>• Baixa latência: chamadas a disco/ memória em vez de rede.<br>• Permite uso mesmo em redes restritas.                                                                     |
| **Model Context Protocol (MCP)**         | Padrão aberto que conecta IDE ↔ servidores externos via `stdin/stdout` ou HTTP.            | • Estrutura clara de **comandos** (“function calling”) que o agente entende, dispensando SDKs.<br>• Qualquer linguagem pode ser usada; Node/TS dá portabilidade. ([docs.cursor.com][1], [diamantai.substack.com][2]) |
| **Chain-of-Thought / Decomposition**     | Prompting “pensar em voz alta” para quebrar requisitos em histórias, tarefas e subtarefas. | • Modelos geram planos melhores quando raciocinam passo-a-passo, mostrando dependências implícitas. ([ft.com][3], [learnprompting.org][4], [luxananda.medium.com][5])                                                |
| **Knowledge Graph**                      | Representar tarefas como **nós** e dependências como **arestas**.                          | • Consultas transitivas (“o que bloqueia X?”) ficam O(1) no grafo.<br>• Mapeia naturalmente hierarquia épico → história → tarefa.                                                                                    |
| **RAG (Retrieval-Augmented Generation)** | Armazenar embeddings de textos no mesmo banco (SQLite + `sqlite-vec`).                     | • Garante que o agente recupere contexto **exato** (descrições, decisões) antes de gerar código.<br>• Tudo local: nada de APIs pagas de embedding. ([turso.tech][6], [dev.to][7])                                    |
| **Busca híbrida (vetor + grafo)**        | Score final = 0,7 × similaridade vetorial + 0,3 × proximidade no grafo.                    | • Combina relevância semântica (vetor) com vínculo estrutural (dependências), reduzindo “hallucinations” de contexto.                                                                                                |
| **Reflection Agent**                     | Comando `reflectTask` grava lições aprendidas; serviço recalibra estimativas futuras.      | • Metodologia de **self-critique** aumenta acurácia em iterações futuras — o agente aprende com o desvio estimado × real. ([medium.com][8], [akira.ai][9])                                                           |
| **Event sourcing + Elasticsearch**       | Cada mudança gera evento JSON assíncrono; ES centraliza métricas.                          | • Observabilidade DevOps: dashboards de velocidade, erro de estimativa, gargalos. ([elastic.co][10])                                                                                                                 |
| **CLI + stdio server**                   | Binário `mcp` e `server.ts` falam por stdin/out.                                           | • Zero configuração de portas.<br>• Funciona em VS Code, Cursor, JetBrains via plugin MCP.                                                                                                                           |
| **SQLite embarcado**                     | DB único no diretório `.mcp/`.                                                             | • Sem daemon; ACID; migrações automáticas.<br>• Extensível com vetores (plugin) — cabe em repositórios Git.                                                                                                          |
| **Node.js + TypeScript**                 | Plataforma runtime e tipagem estrita.                                                      | • On-boarding instantâneo para devs JS/TS.<br>• Ecosistema rico (yargs, vitest, prettier).                                                                                                                           |
| **TDD, ESLint, Vitest**                  | Test-driven & linting.                                                                     | • Manter qualidade de código num projeto que evolui com IA gerando patches.<br>• Cobertura ≥ 80 % garante refactors seguros.                                                                                         |

---

#### Relação entre as metodologias

1. **Decomposição (CoT)** gera um plano inicial →
2. Plano vira **grafo persistente** →
3. Antes de cada passo de código, o agente faz **RAG híbrido** para recuperar exatamente o que precisa saber →
4. Dev executa código; ao concluir chama `markTaskComplete` →
5. Evento é logado em **ES** e diferença `estimativa × real` alimenta o módulo de **Reflection**, que recalibra o próximo ciclo.

Esse loop contínuo concretiza a visão de um **“copiloto de projeto”** que planeja, executa, mede e aprende sem sair da máquina do desenvolvedor.

[1]: https://docs.cursor.com/context/model-context-protocol?utm_source=chatgpt.com "Model Context Protocol - Cursor"
[2]: https://diamantai.substack.com/p/model-context-protocol-mcp-explained?utm_source=chatgpt.com "Model Context Protocol (MCP) Explained - by Nir Diamant - DiamantAI"
[3]: https://www.ft.com/content/b349f590-de84-455d-914a-cc5d9eef04a6?utm_source=chatgpt.com "The struggle to get inside how AI models really work"
[4]: https://learnprompting.org/docs/advanced/decomposition/introduction?srsltid=AfmBOoql-_0__NBgJmpEIBWejoSyj2JhA1yumIPHrIiedmJMJSSB91em&utm_source=chatgpt.com "Advanced Decomposition Techniques for Improved Prompting in LLMs"
[5]: https://luxananda.medium.com/6-llm-techniques-of-prompt-engineering-chain-of-thoughts-cot-part-1-a10a76a474e6?utm_source=chatgpt.com "#6 LLM: Techniques of Prompt Engineering — Chain of Thoughts ..."
[6]: https://turso.tech/blog/sqlite-retrieval-augmented-generation-and-vector-search?utm_source=chatgpt.com "SQLite Retrieval Augmented Generation and Vector Search - Turso"
[7]: https://dev.to/stephenc222/how-to-use-sqlite-vec-to-store-and-query-vector-embeddings-58mf?utm_source=chatgpt.com "How to use sqlite-vec to store and query vector embeddings"
[8]: https://medium.com/%40kbdhunga/reflection-agent-in-langchain-to-enhance-math-problem-accuracy-6af2fcfa3e10?utm_source=chatgpt.com "Reflection Agent in LangChain - Medium"
[9]: https://www.akira.ai/blog/reflection-agent-prompting?utm_source=chatgpt.com "Reflection Agent Prompting: Strategies for More Efficient Performance"
[10]: https://www.elastic.co/explore/devops-observability?utm_source=chatgpt.com "DevOps Observability Tools - Elastic"


### Avaliação de cobertura das metodologias

| #  | Metodologia-chave                    | Coberta pelo **prompt + complemento**                                                                                           | Nota |
| -- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1  | **Local-first / offline-first**      | **Plena** – tudo roda local, só métricas vão p/ ES opcional                                                                     | ✅    |
| 2  | **Model Context Protocol (MCP)**     | **Plena** – manifesto detalhado, comandos stdio JSON                                                                            | ✅    |
| 3  | **Chain-of-Thought & Decomposition** | **Parcial+** – função `planner.plan()` instrui o agente a usar CoT, mas a lógica depende do modelo; não há validação automática | ⚠️   |
| 4  | **Knowledge Graph**                  | **Plena** – schema de nós/arestas, queries de dependência                                                                       | ✅    |
| 5  | **RAG (embeddings locais)**          | **Plena** – embeddings MiniLM + tabela `embeddings`                                                                             | ✅    |
| 6  | **Busca híbrida grafo + vetor**      | **Plena** – método `hybridSearch` com fórmula 0.7/0.3                                                                           | ✅    |
| 7  | **Reflection / learning loop**       | **Plena** – comando `reflectTask`, fator de correção de esforço                                                                 | ✅    |
| 8  | **Event sourcing → Elasticsearch**   | **Plena** – `logger.postEvent` com retry/back-off                                                                               | ✅    |
| 9  | **CLI + stdio server**               | **Plena** – `bin/mcp.ts` e `server.ts`                                                                                          | ✅    |
| 10 | **SQLite embarcado**                 | **Plena** – `.mcp/graph.db` + migrações auto                                                                                    | ✅    |
| 11 | **Node.js + TypeScript**             | **Plena** – projeto TS estrito, scripts npm                                                                                     | ✅    |
| 12 | **TDD / Vitest / ESLint**            | **Parcial+** – tests e lint previstos, mas cobertura ≥ 80 % depende do dev rodar                                                | ⚠️   |

### Cálculo da porcentagem

* **Plena** = 1, **Parcial+** = 0.5
* Soma = 10 × 1 + 2 × 0.5 = 11
* Total possível = 12

$$
\text{Cobertura} = \frac{11}{12}\times100 \approx 92\%
$$

---

## Resultado

⏩ **Cobertura estimada: \~92 % das metodologias listadas.**

Para chegar a 100 % basta:

1. **Automatizar teste de CoT** – ex.: checar se saída do planner contém pelo menos dois níveis (história → tarefa → subtarefa).
2. **Incluir suíte Vitest inicial** no prompt (arquivo real) e um badge de cobertura no README, garantindo que os devs executem `npm run test`.

Com esses dois ajustes a arquitetura ficaria **completamente coberta (≈ 100 %)**.
