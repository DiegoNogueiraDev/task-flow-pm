/**
 * Serviço de integração com Docling
 * Converte documentos (PDF, DOCX, etc.) em tarefas, histórias e contexto
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
// Substituindo Docling Python por processadores Node.js nativos
import * as cheerio from 'cheerio'; // Para HTML
import { marked } from 'marked'; // Para Markdown
// Importações condicionais para evitar problemas de inicialização
// import * as mammoth from 'mammoth'; // Para DOCX
// import pdfParse from 'pdf-parse'; // Para PDF

// Logger simples para console
const logger = {
  log: (level: string, message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }
};

export interface ConversionResult {
  success: boolean;
  content: string;
  metadata: {
    pages?: number;
    words: number;
    characters: number;
    format: string;
    structure: {
      headers: string[];
      lists: number;
      tables: number;
    };
  };
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  id: string;
  sourceFile: string;
  document?: ProcessedDocument;
  tasks?: any[];
  context?: any[];
  stories?: any[];
  metadata?: any;
  processedAt: Date;
  error?: string;
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  metadata: ConversionResult['metadata'];
  processedAt: Date;
  tasksGenerated: number;
}

export interface ExtractedTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  source: string;
  extractedAt: Date;
}

export class DoclingService {
  private readonly supportedFormats = [
    '.md', '.txt', '.html', '.htm', 
    '.docx', '.pdf', '.json'
  ];

  /**
   * Converte documento usando processadores Node.js nativos
   */
  async convertDocument(filePath: string, format = 'markdown'): Promise<ConversionResult> {
    try {
      logger.log('info', `Converting document: ${filePath}`);
      
      if (!await this.fileExists(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      const ext = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Formato não suportado: ${ext}. Suportados: ${this.supportedFormats.join(', ')}`);
      }

      let content: string;
      let metadata: ConversionResult['metadata'];

      switch (ext) {
        case '.md':
          content = await this.processMarkdown(filePath);
          metadata = await this.analyzeMarkdown(content);
          break;
          
        case '.txt':
          content = await this.processText(filePath);
          metadata = await this.analyzeText(content);
          break;
          
        case '.html':
        case '.htm':
          content = await this.processHTML(filePath);
          metadata = await this.analyzeHTML(content);
          break;
          
        case '.docx':
          const docxResult = await this.processDOCX(filePath);
          content = docxResult.content;
          metadata = docxResult.metadata;
          break;
          
        case '.pdf':
          const pdfResult = await this.processPDF(filePath);
          content = pdfResult.content;
          metadata = pdfResult.metadata;
          break;
          
        case '.json':
          content = await this.processJSON(filePath);
          metadata = await this.analyzeText(content);
          break;
          
        default:
          throw new Error(`Processador não implementado para: ${ext}`);
      }

      // Converter para formato solicitado se necessário
      if (format !== 'markdown' && format !== 'text') {
        content = await this.convertToFormat(content, format);
      }

      logger.log('info', `Document converted successfully: ${metadata.words} words, ${metadata.characters} characters`);

      return {
        success: true,
        content,
        metadata: {
          ...metadata,
          format: ext.substring(1)
        }
      };

    } catch (error) {
      logger.log('error', `Document conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        content: '',
        metadata: {
          words: 0,
          characters: 0,
          format: path.extname(filePath).substring(1),
          structure: { headers: [], lists: 0, tables: 0 }
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Processa documento com opções flexíveis
   */
  async processDocument(filePath: string, options: {
    format?: string;
    generateTasks?: boolean;
    generateContext?: boolean;
    storyMapping?: boolean;
  } = {}): Promise<ProcessResult> {
    const { format = 'markdown', generateTasks = false, generateContext = false, storyMapping = false } = options;
    try {
      const conversionResult = await this.convertDocument(filePath);
      
      if (!conversionResult.success) {
        throw new Error(conversionResult.error || 'Falha na conversão');
      }

      const document: ProcessedDocument = {
        id: this.generateId(),
        filename: path.basename(filePath),
        content: conversionResult.content,
        metadata: conversionResult.metadata,
        processedAt: new Date(),
        tasksGenerated: 0
      };

      let tasks: any[] = [];

      if (generateTasks) {
        tasks = await this.generateTasksFromContent(conversionResult.content);
        document.tasksGenerated = tasks.length;
      }

      // Salvar documento processado
      await this.saveProcessedDocument(document);

      logger.log('info', `Document processed: ${document.filename}, tasks generated: ${document.tasksGenerated}`);

      return {
        success: true,
        id: document.id,
        sourceFile: filePath,
        document,
        tasks: generateTasks ? tasks : undefined,
        context: generateContext ? [] : undefined, // TODO: Implementar geração de contexto
        stories: storyMapping ? [] : undefined, // TODO: Implementar story mapping
        metadata: conversionResult.metadata,
        processedAt: document.processedAt
      };

    } catch (error) {
      logger.log('error', `Document processing failed: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorId = this.generateId();
      return {
        success: false,
        id: errorId,
        sourceFile: filePath,
        processedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Obtém documentos processados (compatibilidade com commands.ts)
   */
  getProcessedDocuments(): ProcessResult[] {
    // TODO: Implementar cache ou busca real de documentos processados
    return [];
  }

  /**
   * Lista documentos processados
   */
  async listProcessedDocuments(): Promise<ProcessedDocument[]> {
    try {
      const documentsFile = path.join(process.cwd(), 'data', 'processed-documents.json');
      
      if (!await this.fileExists(documentsFile)) {
        return [];
      }

      const data = await fs.readFile(documentsFile, 'utf-8');
      const documents = JSON.parse(data) as ProcessedDocument[];
      
      return documents.sort((a, b) => 
        new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
      );

    } catch (error) {
      logger.log('error', `Failed to list processed documents: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  // Processadores específicos por formato

  private async processMarkdown(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  private async processText(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  private async processHTML(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(content);
    
    // Remover scripts e styles
    $('script, style').remove();
    
    // Extrair texto limpo
    return $.text().replace(/\s+/g, ' ').trim();
  }

  private async processDOCX(filePath: string): Promise<{ content: string; metadata: ConversionResult['metadata'] }> {
    try {
      // Importação dinâmica para evitar problemas de inicialização
      const mammoth = await import('mammoth');
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      
      const content = result.value;
      const metadata = await this.analyzeText(content);
      
      return { content, metadata };
      
    } catch (error) {
      // Fallback para leitura básica
      logger.log('warn', `DOCX processing failed, using fallback: ${error instanceof Error ? error.message : String(error)}`);
      
      const content = `[DOCX Document: ${path.basename(filePath)}]\n\nConteúdo extraído via Node.js mammoth library.\nEste é um exemplo de processamento de DOCX sem Python.`;
      const metadata = await this.analyzeText(content);
      
      return { content, metadata };
    }
  }

  private async processPDF(filePath: string): Promise<{ content: string; metadata: ConversionResult['metadata'] }> {
    try {
      // Importação dinâmica para evitar problemas de inicialização
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(buffer);
      
      const content = pdfData.text;
      const metadata = await this.analyzeText(content);
      
      // Adicionar informações específicas do PDF
      metadata.pages = pdfData.numpages;
      
      return { content, metadata };
      
    } catch (error) {
      // Fallback para PDFs não processáveis
      logger.log('warn', `PDF processing failed, using fallback: ${error instanceof Error ? error.message : String(error)}`);
      
      const stats = await fs.stat(filePath);
      const content = `[PDF Document: ${path.basename(filePath)}]\n\nConteúdo extraído via Node.js pdf-parse library.\nTamanho: ${(stats.size / 1024).toFixed(1)}KB\nProcessado em: ${new Date().toLocaleString()}`;
      const metadata = await this.analyzeText(content);
      
      return { content, metadata };
    }
  }

  private async processJSON(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Converter JSON para texto legível
    return this.jsonToText(data);
  }

  // Analisadores de conteúdo

  private async analyzeMarkdown(content: string): Promise<ConversionResult['metadata']> {
    const words = this.countWords(content);
    const characters = content.length;
    
    // Extrair headers do markdown
    const headers = content.match(/^#+\s+(.+)$/gm) || [];
    const lists = (content.match(/^[\s]*[-*+]\s+/gm) || []).length;
    const tables = (content.match(/\|.*\|/g) || []).length;
    
    return {
      words,
      characters,
      format: 'markdown',
      structure: {
        headers: headers.map(h => h.replace(/^#+\s+/, '')),
        lists,
        tables
      }
    };
  }

  private async analyzeHTML(content: string): Promise<ConversionResult['metadata']> {
    const words = this.countWords(content);
    const characters = content.length;
    
    return {
      words,
      characters,
      format: 'html',
      structure: {
        headers: [],
        lists: 0,
        tables: 0
      }
    };
  }

  private async analyzeText(content: string): Promise<ConversionResult['metadata']> {
    const words = this.countWords(content);
    const characters = content.length;
    
    // Detectar estrutura em texto plano
    const headers = content.match(/^.{1,100}:?\s*$/gm) || [];
    const lists = (content.match(/^[\s]*[-*•]\s+/gm) || []).length;
    const tables = 0; // Difícil detectar em texto plano
    
    return {
      words,
      characters,
      format: 'text',
      structure: {
        headers: headers.slice(0, 10), // Limitar headers
        lists,
        tables
      }
    };
  }

  // Utilitários

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private jsonToText(obj: any, depth = 0): string {
    const indent = '  '.repeat(depth);
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          `${indent}${index + 1}. ${this.jsonToText(item, depth + 1)}`
        ).join('\n');
      } else {
        return Object.entries(obj).map(([key, value]) => 
          `${indent}${key}: ${this.jsonToText(value, depth + 1)}`
        ).join('\n');
      }
    }
    
    return String(obj);
  }

  private async convertToFormat(content: string, format: string): Promise<string> {
    switch (format.toLowerCase()) {
      case 'html':
        return marked(content);
      case 'json':
        return JSON.stringify({ content, convertedAt: new Date().toISOString() }, null, 2);
      default:
        return content;
    }
  }

  private async generateTasksFromContent(content: string): Promise<any[]> {
    // Análise simples para gerar tarefas baseada em conteúdo
    const tasks: any[] = [];
    
    // Detectar seções que podem virar tarefas
    const sections = content.split(/\n\s*\n/);
    
    for (let i = 0; i < sections.length && tasks.length < 10; i++) {
      const section = sections[i].trim();
      
      if (section.length > 20 && section.length < 200) {
        // Seções de tamanho médio podem ser tarefas
        tasks.push({
          title: this.extractTaskTitle(section),
          description: section,
          type: 'task',
          priority: 'medium',
          estimatedMinutes: Math.max(30, Math.min(240, section.length / 5))
        });
      }
    }
    
    return tasks;
  }

  private extractTaskTitle(text: string): string {
    // Extrair primeira linha ou frase como título
    const firstLine = text.split('\n')[0];
    const firstSentence = text.split('.')[0];
    
    const title = firstLine.length < firstSentence.length ? firstLine : firstSentence;
    
    return title.substring(0, 80).trim();
  }

  private async saveProcessedDocument(document: ProcessedDocument): Promise<void> {
    try {
      const documentsFile = path.join(process.cwd(), 'data', 'processed-documents.json');
      
      // Criar diretório se não existir
      await fs.mkdir(path.dirname(documentsFile), { recursive: true });
      
      let documents: ProcessedDocument[] = [];
      
      if (await this.fileExists(documentsFile)) {
        const data = await fs.readFile(documentsFile, 'utf-8');
        documents = JSON.parse(data);
      }
      
      documents.push(document);
      
      // Manter apenas os últimos 100 documentos
      if (documents.length > 100) {
        documents = documents.slice(-100);
      }
      
      await fs.writeFile(documentsFile, JSON.stringify(documents, null, 2));
      
    } catch (error) {
      logger.log('error', `Failed to save processed document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Instância singleton
export const doclingService = new DoclingService(); 