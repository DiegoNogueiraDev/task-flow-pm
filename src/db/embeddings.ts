import { spawn } from 'child_process';
import { JSEmbeddingsService } from './embeddings-js';

export class EmbeddingsService {
  private modelName: string;
  private vectorDimension = 384; // MiniLM default dimension
  private jsEmbeddings: JSEmbeddingsService;
  private pythonAvailable: boolean | null = null;

  constructor(modelName = 'all-MiniLM-L6-v2') {
    this.modelName = modelName;
    this.jsEmbeddings = new JSEmbeddingsService();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Check if Python is available (only check once)
    if (this.pythonAvailable === null) {
      this.pythonAvailable = await this.checkPythonAvailability();
    }

    if (this.pythonAvailable) {
      try {
        return await this.generateWithPython(text);
      } catch (error) {
        console.warn('Python embeddings failed, falling back to JS implementation:', error);
        this.pythonAvailable = false; // Don't try Python again this session
      }
    }

    // Use JavaScript implementation
    return await this.jsEmbeddings.generateEmbedding(text);
  }

  private async checkPythonAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn('python3', ['-c', 'import sentence_transformers; print("OK")']);
      
      let hasOutput = false;
      
      python.stdout.on('data', (data) => {
        if (data.toString().trim() === 'OK') {
          hasOutput = true;
        }
      });

      python.on('close', (code) => {
        resolve(code === 0 && hasOutput);
      });

      python.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        python.kill();
        resolve(false);
      }, 5000);
    });
  }

  private async generateWithPython(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
try:
    from sentence_transformers import SentenceTransformer
    import json
    
    model = SentenceTransformer('${this.modelName}')
    text = sys.argv[1]
    embedding = model.encode([text])[0].tolist()
    print(json.dumps(embedding))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
      `;

      const python = spawn('python3', ['-c', pythonScript, text]);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const embedding = JSON.parse(stdout.trim());
            resolve(embedding);
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e}`));
          }
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        python.kill();
        reject(new Error('Python embedding generation timed out'));
      }, 30000);
    });
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

  // Get which implementation is being used
  async getImplementationType(): Promise<'python' | 'javascript'> {
    if (this.pythonAvailable === null) {
      this.pythonAvailable = await this.checkPythonAvailability();
    }
    return this.pythonAvailable ? 'python' : 'javascript';
  }

  // Update JS embeddings vocabulary (useful for learning)
  updateVocabulary(texts: string[]): void {
    this.jsEmbeddings.updateVocabulary(texts);
  }
}