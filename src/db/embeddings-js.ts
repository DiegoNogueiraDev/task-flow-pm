/**
 * Pure JavaScript embeddings service (no Python required)
 * Uses simple TF-IDF like approach + hashing for consistent vectors
 */

export class JSEmbeddingsService {
    private vectorDimension = 384;
    private vocabulary: Map<string, number> = new Map();
    private idfScores: Map<string, number> = new Map();
    private documentCount = 0;
  
    constructor() {
      // Initialize with common technical vocabulary
      this.initializeVocabulary();
    }
  
    private initializeVocabulary(): void {
      const techTerms = [
        // Programming
        'function', 'class', 'method', 'variable', 'array', 'object', 'string', 'number',
        'boolean', 'async', 'await', 'promise', 'callback', 'event', 'handler',
        
        // Web Development
        'api', 'endpoint', 'request', 'response', 'http', 'https', 'rest', 'graphql',
        'json', 'xml', 'html', 'css', 'javascript', 'typescript', 'react', 'vue',
        'angular', 'node', 'express', 'server', 'client', 'frontend', 'backend',
        
        // Database
        'database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'sqlite',
        'table', 'column', 'row', 'index', 'query', 'join', 'schema', 'migration',
        
        // Authentication & Security
        'auth', 'authentication', 'authorization', 'login', 'password', 'hash',
        'jwt', 'token', 'session', 'oauth', 'ssl', 'tls', 'security', 'encrypt',
        
        // Testing
        'test', 'testing', 'unit', 'integration', 'e2e', 'mock', 'stub', 'assert',
        'expect', 'vitest', 'jest', 'cypress', 'playwright',
        
        // DevOps
        'docker', 'container', 'deploy', 'deployment', 'ci', 'cd', 'pipeline',
        'github', 'gitlab', 'aws', 'azure', 'cloud', 'kubernetes',
        
        // UI/UX
        'ui', 'ux', 'design', 'component', 'layout', 'responsive', 'mobile',
        'desktop', 'interface', 'user', 'experience', 'accessibility',
        
        // Project Management
        'task', 'project', 'requirement', 'feature', 'bug', 'issue', 'milestone',
        'sprint', 'agile', 'scrum', 'kanban', 'backlog', 'story', 'epic'
      ];
  
      techTerms.forEach((term, index) => {
        this.vocabulary.set(term, index);
        this.idfScores.set(term, 1.0); // Initialize with neutral IDF
      });
    }
  
    async generateEmbedding(text: string): Promise<number[]> {
      const tokens = this.tokenize(text);
      const tfVector = this.calculateTF(tokens);
      const tfidfVector = this.calculateTFIDF(tfVector);
      
      // Pad or truncate to desired dimension
      const embedding = new Array(this.vectorDimension).fill(0);
      
      // Fill with TF-IDF scores
      for (let i = 0; i < Math.min(tfidfVector.length, this.vectorDimension); i++) {
        embedding[i] = tfidfVector[i];
      }
      
      // Add positional and semantic features
      this.addSemanticFeatures(embedding, tokens, text);
      
      // Normalize the vector
      return this.normalizeVector(embedding);
    }
  
    private tokenize(text: string): string[] {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 2);
    }
  
    private calculateTF(tokens: string[]): Map<string, number> {
      const tf = new Map<string, number>();
      const totalTokens = tokens.length;
  
      tokens.forEach(token => {
        tf.set(token, (tf.get(token) || 0) + 1);
      });
  
      // Normalize by total tokens
      tf.forEach((count, token) => {
        tf.set(token, count / totalTokens);
      });
  
      return tf;
    }
  
    private calculateTFIDF(tfVector: Map<string, number>): number[] {
      const vector: number[] = [];
      
      // Use vocabulary order for consistent dimensions
      for (const [term, index] of this.vocabulary) {
        const tf = tfVector.get(term) || 0;
        const idf = this.idfScores.get(term) || 1.0;
        vector[index] = tf * idf;
      }
  
      return vector;
    }
  
    private addSemanticFeatures(embedding: number[], tokens: string[], originalText: string): void {
      const features = this.extractSemanticFeatures(tokens, originalText);
      const startIndex = Math.max(0, this.vectorDimension - 50); // Last 50 dimensions for features
      
      Object.entries(features).forEach(([key, value], index) => {
        const position = startIndex + index;
        if (position < this.vectorDimension) {
          embedding[position] = value;
        }
      });
    }
  
    private extractSemanticFeatures(tokens: string[], text: string): Record<string, number> {
      return {
        // Length features
        textLength: Math.min(text.length / 1000, 1), // Normalized text length
        tokenCount: Math.min(tokens.length / 100, 1), // Normalized token count
        
        // Type indicators (presence of certain patterns)
        hasNumbers: /\d/.test(text) ? 1 : 0,
        hasCode: /[{}()[\];]/.test(text) ? 1 : 0,
        hasUrls: /https?:\/\//.test(text) ? 1 : 0,
        
        // Domain-specific features
        isApiRelated: this.hasTerms(tokens, ['api', 'endpoint', 'request', 'response']) ? 1 : 0,
        isDatabaseRelated: this.hasTerms(tokens, ['database', 'sql', 'table', 'query']) ? 1 : 0,
        isUIRelated: this.hasTerms(tokens, ['ui', 'interface', 'component', 'design']) ? 1 : 0,
        isTestRelated: this.hasTerms(tokens, ['test', 'testing', 'unit', 'integration']) ? 1 : 0,
        isAuthRelated: this.hasTerms(tokens, ['auth', 'login', 'user', 'password', 'token']) ? 1 : 0,
        
        // Priority/urgency indicators
        hasPriorityTerms: this.hasTerms(tokens, ['urgent', 'critical', 'important', 'asap']) ? 1 : 0,
        hasTimeTerms: this.hasTerms(tokens, ['minute', 'hour', 'day', 'week', 'deadline']) ? 1 : 0,
        
        // Complexity indicators
        hasComplexTerms: this.hasTerms(tokens, ['complex', 'difficult', 'challenge', 'integration']) ? 1 : 0,
        hasSimpleTerms: this.hasTerms(tokens, ['simple', 'easy', 'basic', 'straightforward']) ? 1 : 0,
        
        // Task type features
        isImplementation: this.hasTerms(tokens, ['implement', 'create', 'build', 'develop']) ? 1 : 0,
        isDesign: this.hasTerms(tokens, ['design', 'architecture', 'plan', 'structure']) ? 1 : 0,
        isFixing: this.hasTerms(tokens, ['fix', 'bug', 'issue', 'problem', 'error']) ? 1 : 0,
        isDocumentation: this.hasTerms(tokens, ['document', 'readme', 'guide', 'manual']) ? 1 : 0,
        
        // Sentiment/tone
        isPositive: this.hasTerms(tokens, ['good', 'great', 'excellent', 'perfect']) ? 1 : 0,
        isNegative: this.hasTerms(tokens, ['bad', 'poor', 'broken', 'failing']) ? 1 : 0,
      };
    }
  
    private hasTerms(tokens: string[], searchTerms: string[]): boolean {
      return searchTerms.some(term => tokens.includes(term));
    }
  
    private normalizeVector(vector: number[]): number[] {
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      
      if (magnitude === 0) {
        // Return random normalized vector if all zeros
        return this.generateRandomNormalizedVector();
      }
      
      return vector.map(val => val / magnitude);
    }
  
    private generateRandomNormalizedVector(): number[] {
      const vector: number[] = [];
      let sumSquares = 0;
  
      // Generate random components
      for (let i = 0; i < this.vectorDimension; i++) {
        const component = (Math.random() - 0.5) * 2; // Range [-1, 1]
        vector.push(component);
        sumSquares += component * component;
      }
  
      // Normalize
      const magnitude = Math.sqrt(sumSquares);
      return vector.map(component => component / magnitude);
    }
  
    async generateMultipleEmbeddings(texts: string[]): Promise<number[][]> {
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      }
      
      return embeddings;
    }
  
    getVectorDimension(): number {
      return this.vectorDimension;
    }
  
    async testConnection(): Promise<boolean> {
      try {
        await this.generateEmbedding('test');
        return true;
      } catch {
        return false;
      }
    }
  
    // Update vocabulary based on processed documents (simple learning)
    updateVocabulary(texts: string[]): void {
      const allTokens: string[] = [];
      texts.forEach(text => {
        allTokens.push(...this.tokenize(text));
      });
  
      // Calculate document frequencies for IDF
      const documentFrequencies = new Map<string, number>();
      
      texts.forEach(text => {
        const uniqueTokens = new Set(this.tokenize(text));
        uniqueTokens.forEach(token => {
          documentFrequencies.set(token, (documentFrequencies.get(token) || 0) + 1);
        });
      });
  
      // Update IDF scores
      const totalDocs = texts.length;
      documentFrequencies.forEach((df, term) => {
        const idf = Math.log(totalDocs / df);
        this.idfScores.set(term, idf);
        
        // Add new terms to vocabulary if not present
        if (!this.vocabulary.has(term) && this.vocabulary.size < this.vectorDimension - 50) {
          this.vocabulary.set(term, this.vocabulary.size);
        }
      });
  
      this.documentCount += texts.length;
    }
  
    // Get similarity between two texts
    async getSimilarity(text1: string, text2: string): Promise<number> {
      const embedding1 = await this.generateEmbedding(text1);
      const embedding2 = await this.generateEmbedding(text2);
      
      return this.cosineSimilarity(embedding1, embedding2);
    }
  
    private cosineSimilarity(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0;
      
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
  }