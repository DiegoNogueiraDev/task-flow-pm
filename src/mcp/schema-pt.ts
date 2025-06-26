// Schema em Português para MCP Local
export interface ComandoMCP {
    comando: string;
    [key: string]: any;
  }
  
  export interface RespostaMCP {
    sucesso: boolean;
    dados?: any;
    erro?: string;
  }
  
  // Comandos básicos em português
  export interface GerarTarefasRequest {
    comando: 'gerarTarefas';
    textoEspecificacao: string;
    idProjeto?: string;
  }
  
  export interface ListarTarefasRequest {
    comando: 'listarTarefas';
    status?: 'pendente' | 'em-andamento' | 'concluida' | 'bloqueada';
    limite?: number;
    offset?: number;
  }
  
  export interface DetalhesTarefaRequest {
    comando: 'detalhesTarefa';
    idTarefa: string;
  }
  
  export interface IniciarTarefaRequest {
    comando: 'iniciarTarefa';
    idTarefa: string;
  }
  
  export interface ConcluirTarefaRequest {
    comando: 'concluirTarefa';
    idTarefa: string;
    minutosReais?: number;
  }
  
  export interface ProximaTarefaRequest {
    comando: 'proximaTarefa';
    excluirIds?: string[];
  }
  
  export interface ReflexaoTarefaRequest {
    comando: 'reflexaoTarefa';
    idTarefa: string;
    nota: string;
  }
  
  export interface GerarEstructuraRequest {
    comando: 'gerarEstructura';
    idTarefa: string;
  }
  
  export interface BuscaHibridaRequest {
    comando: 'buscaHibrida';
    consulta: string;
    limite?: number;
  }
  
  export interface ArmazenarDocumentoRequest {
    comando: 'armazenarDocumento';
    titulo: string;
    conteudo: string;
    tags?: string[];
  }
  
  export interface RecuperarContextoRequest {
    comando: 'recuperarContexto';
    consulta: string;
    limite?: number;
  }
  
  export interface StatusProjetoRequest {
    comando: 'statusProjeto';
  }
  
  export interface EstatisticasRequest {
    comando: 'estatisticas';
  }
  
  // Node de tarefa em português
  export interface NodeTarefa {
    id: string;
    titulo: string;
    descricao: string;
    tipo: 'epico' | 'historia' | 'tarefa' | 'subtarefa';
    status: 'pendente' | 'em-andamento' | 'concluida' | 'bloqueada';
    estimativaMinutos: number;
    minutosReais: number;
    prioridade: 'baixa' | 'media' | 'alta' | 'critica';
    tags: string[];
    criadoEm: string;
    atualizadoEm: string;
    iniciadoEm?: string;
    finalizadoEm?: string;
    idPai?: string;
  }
  
  // Evento de métrica em português
  export interface EventoMetrica {
    tipo: 'tarefa_criada' | 'tarefa_iniciada' | 'tarefa_concluida' | 'mudanca_status' | 'reflexao_adicionada';
    idTarefa: string;
    statusAnterior?: string;
    novoStatus?: string;
    estimativa?: number;
    minutosReais?: number;
    timestamp: string;
    nota?: string;
  }
  
  // Mapeamento de comandos (inglês ↔ português)
  export const MAPEAMENTO_COMANDOS = {
    // Português → Inglês (para compatibilidade)
    'gerarTarefas': 'generateTasksFromSpec',
    'listarTarefas': 'listTasks',
    'detalhesTarefa': 'getTaskDetails',
    'iniciarTarefa': 'beginTask',
    'concluirTarefa': 'markTaskComplete',
    'proximaTarefa': 'getNextTask',
    'reflexaoTarefa': 'reflectTask',
    'gerarEstructura': 'generateScaffold',
    'buscaHibrida': 'hybridSearch',
    'armazenarDocumento': 'storeDocument',
    'recuperarContexto': 'retrieveContext',
    'statusProjeto': 'projectStatus',
    'estatisticas': 'statistics',
    
    // Inglês → Português (para tradução de respostas)
    'generateTasksFromSpec': 'gerarTarefas',
    'listTasks': 'listarTarefas',
    'getTaskDetails': 'detalhesTarefa',
    'beginTask': 'iniciarTarefa',
    'markTaskComplete': 'concluirTarefa',
    'getNextTask': 'proximaTarefa',
    'reflectTask': 'reflexaoTarefa',
    'generateScaffold': 'gerarEstructura',
    'hybridSearch': 'buscaHibrida',
    'storeDocument': 'armazenarDocumento',
    'retrieveContext': 'recuperarContexto',
    'projectStatus': 'statusProjeto',
    'statistics': 'estatisticas'
  };
  
  // Status em português
  export const STATUS_PT = {
    'pending': 'pendente',
    'in-progress': 'em-andamento', 
    'completed': 'concluida',
    'blocked': 'bloqueada'
  };
  
  // Tipos em português
  export const TIPOS_PT = {
    'epic': 'epico',
    'story': 'historia',
    'task': 'tarefa',
    'subtask': 'subtarefa'
  };
  
  // Prioridades em português
  export const PRIORIDADES_PT = {
    'low': 'baixa',
    'medium': 'media',
    'high': 'alta', 
    'critical': 'critica'
  };
  
  export type ComandosMCPPortugues = 
    | GerarTarefasRequest
    | ListarTarefasRequest
    | DetalhesTarefaRequest
    | IniciarTarefaRequest
    | ConcluirTarefaRequest
    | ProximaTarefaRequest
    | ReflexaoTarefaRequest
    | GerarEstructuraRequest
    | BuscaHibridaRequest
    | ArmazenarDocumentoRequest
    | RecuperarContextoRequest
    | StatusProjetoRequest
    | EstatisticasRequest;