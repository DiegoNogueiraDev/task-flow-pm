import { MCPCommandHandler } from './commands';
import { 
  ComandosMCPPortugues, 
  RespostaMCP, 
  MAPEAMENTO_COMANDOS,
  STATUS_PT,
  TIPOS_PT,
  PRIORIDADES_PT,
  NodeTarefa
} from './schema-pt';
import { MCPRequestTypes, MCPResponse, TaskNode } from './schema';

export class MCPCommandHandlerPortugues {
  private handlerIngles: MCPCommandHandler;

  constructor(handlerIngles: MCPCommandHandler) {
    this.handlerIngles = handlerIngles;
  }

  async processarComando(comando: ComandosMCPPortugues): Promise<RespostaMCP> {
    try {
      // Traduzir comando do português para inglês
      const comandoIngles = this.traduzirComandoPtParaEn(comando);
      
      // Executar comando na implementação original
      const respostaIngles = await this.handlerIngles.handleCommand(comandoIngles);
      
      // Traduzir resposta do inglês para português
      const respostaPortugues = this.traduzirRespostaEnParaPt(respostaIngles);
      
      return respostaPortugues;
    } catch (erro) {
      return {
        sucesso: false,
        erro: erro instanceof Error ? erro.message : 'Erro desconhecido',
      };
    }
  }

  private traduzirComandoPtParaEn(comando: ComandosMCPPortugues): MCPRequestTypes {
    const comandoIngles = MAPEAMENTO_COMANDOS[comando.comando as keyof typeof MAPEAMENTO_COMANDOS];
    
    if (!comandoIngles) {
      throw new Error(`Comando não reconhecido: ${comando.comando}`);
    }

    // Mapear campos específicos por tipo de comando
    switch (comando.comando) {
      case 'gerarTarefas':
        return {
          command: comandoIngles,
          specText: (comando as any).textoEspecificacao,
          projectId: (comando as any).idProjeto,
        };

      case 'listarTarefas':
        return {
          command: comandoIngles,
          status: this.traduzirStatusPtParaEn((comando as any).status),
          limit: (comando as any).limite,
          offset: (comando as any).offset,
        };

      case 'detalhesTarefa':
        return {
          command: comandoIngles,
          taskId: (comando as any).idTarefa,
        };

      case 'iniciarTarefa':
        return {
          command: comandoIngles,
          taskId: (comando as any).idTarefa,
        };

      case 'concluirTarefa':
        return {
          command: comandoIngles,
          taskId: (comando as any).idTarefa,
          actualMinutes: (comando as any).minutosReais,
        };

      case 'proximaTarefa':
        return {
          command: comandoIngles,
          excludeIds: (comando as any).excluirIds,
        };

      case 'reflexaoTarefa':
        return {
          command: comandoIngles,
          taskId: (comando as any).idTarefa,
          note: (comando as any).nota,
        };

      case 'gerarEstructura':
        return {
          command: comandoIngles,
          taskId: (comando as any).idTarefa,
        };

      case 'buscaHibrida':
        return {
          command: comandoIngles,
          query: (comando as any).consulta,
          k: (comando as any).limite,
        };

      case 'armazenarDocumento':
        return {
          command: comandoIngles,
          title: (comando as any).titulo,
          content: (comando as any).conteudo,
          tags: (comando as any).tags,
        };

      case 'recuperarContexto':
        return {
          command: comandoIngles,
          query: (comando as any).consulta,
          limit: (comando as any).limite,
        };

      default:
        return {
          command: comandoIngles,
          ...comando,
        } as any;
    }
  }

  private traduzirRespostaEnParaPt(resposta: MCPResponse): RespostaMCP {
    const respostaPortugues: RespostaMCP = {
      sucesso: resposta.success,
      erro: resposta.error,
    };

    if (resposta.data) {
      respostaPortugues.dados = this.traduzirDadosEnParaPt(resposta.data);
    }

    return respostaPortugues;
  }

  private traduzirDadosEnParaPt(dados: any): any {
    if (!dados) return dados;

    // Se é uma tarefa individual
    if (dados.task && typeof dados.task === 'object') {
      dados.tarefa = this.traduzirTarefaEnParaPt(dados.task);
      delete dados.task;
    }

    // Se é uma lista de tarefas
    if (dados.tasks && Array.isArray(dados.tasks)) {
      dados.tarefas = dados.tasks.map((task: TaskNode) => this.traduzirTarefaEnParaPt(task));
      delete dados.tasks;
    }

    // Se é resultado de busca híbrida
    if (dados.results && Array.isArray(dados.results)) {
      dados.resultados = dados.results.map((result: any) => ({
        ...result,
        tarefa: result.task ? this.traduzirTarefaEnParaPt(result.task) : result.tarefa,
        pontuacoes: result.scores ? {
          similaridade: result.scores.similarity,
          grafo: result.scores.graph,
          final: result.scores.final,
        } : result.pontuacoes,
      }));
      delete dados.results;
    }

    // Traduzir campos comuns
    const traducoesCampos = {
      'totalFound': 'totalEncontrado',
      'searchType': 'tipoDebusca',
      'query': 'consulta',
      'tasksCreated': 'tarefasCriadas',
      'dependenciesCreated': 'dependenciasCriadas',
      'projectId': 'idProjeto',
      'taskId': 'idTarefa',
      'estimatedCompletionTime': 'tempoEstimadoConclusao',
      'startedAt': 'iniciadoEm',
      'variance': 'variancia',
      'learningStats': 'estatisticasAprendizado',
      'currentFactor': 'fatorAtual',
      'totalCompletedTasks': 'totalTarefasConcluidas',
      'averageVariance': 'varianciaMedia',
      'scaffoldPath': 'caminhoEstrutura',
      'files': 'arquivos',
      'readme': 'leiame',
      'implementation': 'implementacao',
      'test': 'teste',
    };

    // Aplicar traduções de campos
    Object.keys(traducoesCampos).forEach(chavIngles => {
      const chavPortugues = traducoesCampos[chavIngles as keyof typeof traducoesCampos];
      if (dados[chavIngles] !== undefined) {
        dados[chavPortugues] = dados[chavIngles];
        delete dados[chavIngles];
      }
    });

    return dados;
  }

  private traduzirTarefaEnParaPt(task: TaskNode): NodeTarefa {
    return {
      id: task.id,
      titulo: task.title,
      descricao: task.description,
      tipo: TIPOS_PT[task.type] as any,
      status: STATUS_PT[task.status] as any,
      estimativaMinutos: task.estimateMinutes,
      minutosReais: task.actualMinutes,
      prioridade: PRIORIDADES_PT[task.priority] as any,
      tags: task.tags,
      criadoEm: task.createdAt,
      atualizadoEm: task.updatedAt,
      iniciadoEm: task.startedAt,
      finalizadoEm: task.endedAt,
      idPai: task.parentId,
    };
  }

  private traduzirStatusPtParaEn(status?: string): string | undefined {
    if (!status) return undefined;
    
    const mapeamento = {
      'pendente': 'pending',
      'em-andamento': 'in-progress',
      'concluida': 'completed',
      'bloqueada': 'blocked',
    };
    
    return mapeamento[status as keyof typeof mapeamento] || status;
  }

  // Métodos de conveniência em português
  async proximaTarefa(): Promise<RespostaMCP> {
    return this.processarComando({ comando: 'proximaTarefa' });
  }

  async listarTarefasPendentes(): Promise<RespostaMCP> {
    return this.processarComando({ 
      comando: 'listarTarefas', 
      status: 'pendente' 
    });
  }

  async buscarTarefas(consulta: string, limite = 5): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'buscaHibrida',
      consulta,
      limite,
    });
  }

  async iniciarTarefa(idTarefa: string): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'iniciarTarefa',
      idTarefa,
    });
  }

  async concluirTarefa(idTarefa: string, minutosReais?: number): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'concluirTarefa',
      idTarefa,
      minutosReais,
    });
  }

  async adicionarReflexao(idTarefa: string, nota: string): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'reflexaoTarefa',
      idTarefa,
      nota,
    });
  }

  async gerarEstruturaCodigo(idTarefa: string): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'gerarEstructura',
      idTarefa,
    });
  }

  async obterDetalhesTarefa(idTarefa: string): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'detalhesTarefa',
      idTarefa,
    });
  }

  async planejarProjeto(textoEspecificacao: string, idProjeto?: string): Promise<RespostaMCP> {
    return this.processarComando({
      comando: 'gerarTarefas',
      textoEspecificacao,
      idProjeto,
    });
  }
}