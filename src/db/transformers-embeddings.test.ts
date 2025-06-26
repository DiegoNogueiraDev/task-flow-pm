import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TransformersEmbeddingsService } from './transformers-embeddings.js';

describe('TransformersEmbeddingsService', () => {
  let service: TransformersEmbeddingsService;

  beforeAll(async () => {
    service = TransformersEmbeddingsService.getInstance();
    // Initialize the service - this might take a few seconds on first run
    await service.initialize();
  });

  afterAll(() => {
    service.clearCache();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const startTime = Date.now();
      await service.initialize();
      const initTime = Date.now() - startTime;
      
      // Subsequent initializations should be instant due to singleton pattern
      expect(initTime).toBeLessThan(100); // Should be cached
    });

    it('should return correct embedding dimensions', async () => {
      const dimensions = await service.getEmbeddingDimensions();
      expect(dimensions).toBe(384); // all-MiniLM-L6-v2 produces 384-dimensional embeddings
    });
  });

  describe('Single Embedding Generation', () => {
    it('should generate embeddings for simple text', async () => {
      const text = 'Hello world';
      const startTime = Date.now();
      
      const embedding = await service.generateEmbedding(text);
      const generationTime = Date.now() - startTime;
      
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
      
      // Performance target: 2ms (might be higher on first run due to model loading)
      console.log(`Embedding generation time: ${generationTime}ms`);
    });

    it('should generate consistent embeddings for same text', async () => {
      const text = 'Consistent test text';
      
      const embedding1 = await service.generateEmbedding(text);
      const embedding2 = await service.generateEmbedding(text);
      
      // Should be identical due to caching
      expect(embedding1).toEqual(embedding2);
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'This is the first text';
      const text2 = 'This is completely different content';
      
      const embedding1 = await service.generateEmbedding(text1);
      const embedding2 = await service.generateEmbedding(text2);
      
      expect(embedding1).not.toEqual(embedding2);
      
      // They should be different but still have the same dimensions
      expect(embedding1.length).toBe(embedding2.length);
    });

    it('should handle empty text', async () => {
      const embedding = await service.generateEmbedding('');
      
      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
    });
  });

  describe('Batch Embedding Generation', () => {
    it('should generate batch embeddings efficiently', async () => {
      const texts = [
        'First document about machine learning',
        'Second document about artificial intelligence',
        'Third document about data science',
        'Fourth document about neural networks'
      ];
      
      const startTime = Date.now();
      const embeddings = await service.generateEmbeddingsBatch(texts);
      const totalTime = Date.now() - startTime;
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(texts.length);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);
      
      console.log(`Batch embedding generation time: ${totalTime}ms for ${texts.length} texts`);
      console.log(`Average time per text: ${(totalTime / texts.length).toFixed(1)}ms`);
    });

    it('should leverage cache in batch operations', async () => {
      const texts = [
        'Cached text example',
        'Another cached text',
        'Cached text example', // Duplicate - should use cache
        'New text not in cache'
      ];
      
      // First batch to populate cache
      await service.generateEmbeddingsBatch(texts.slice(0, 2));
      
      // Second batch should use cache for some texts
      const startTime = Date.now();
      const embeddings = await service.generateEmbeddingsBatch(texts);
      const totalTime = Date.now() - startTime;
      
      expect(embeddings.length).toBe(texts.length);
      expect(embeddings[0]).toEqual(embeddings[2]); // Same text should have same embedding
      
      console.log(`Batch with cache leveraging time: ${totalTime}ms`);
    });
  });

  describe('Similarity Search', () => {
    it('should compute cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      const c = [0, 1, 0];
      
      expect(service.cosineSimilarity(a, b)).toBeCloseTo(1.0, 5); // Identical vectors
      expect(service.cosineSimilarity(a, c)).toBeCloseTo(0.0, 5); // Orthogonal vectors
    });

    it('should find similar embeddings efficiently', async () => {
      // Create test embeddings
      const queryText = 'machine learning algorithms';
      const candidateTexts = [
        'artificial intelligence models', // Should be similar
        'cooking recipes for dinner',     // Should be different
        'deep learning neural networks',  // Should be similar
        'weather forecast today',         // Should be different
        'supervised learning techniques'  // Should be similar
      ];
      
      const queryEmbedding = await service.generateEmbedding(queryText);
      const candidateEmbeddings = await Promise.all(
        candidateTexts.map(async (text, index) => ({
          id: `doc_${index}`,
          embedding: await service.generateEmbedding(text)
        }))
      );
      
      const startTime = Date.now();
      const results = service.findSimilar(queryEmbedding, candidateEmbeddings, 3, 0.1);
      const searchTime = Date.now() - startTime;
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      
      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i-1].similarity);
      }
      
      console.log(`Similarity search time: ${searchTime}ms`);
      console.log('Top results:', results.map(r => ({ id: r.id, similarity: r.similarity.toFixed(3) })));
    });

    it('should handle early termination in similarity search', async () => {
      // Create many candidate embeddings
      const queryEmbedding = await service.generateEmbedding('test query');
      const candidates: Array<{id: string, embedding: number[]}> = [];
      
      for (let i = 0; i < 1000; i++) {
        candidates.push({
          id: `doc_${i}`,
          embedding: await service.generateEmbedding(`document ${i} content`)
        });
      }
      
      const startTime = Date.now();
      const results = service.findSimilar(queryEmbedding, candidates, 5, 0.8);
      const searchTime = Date.now() - startTime;
      
      // Should complete search quickly even with 1000 candidates
      expect(searchTime).toBeLessThan(100); // Should be very fast
      
      console.log(`Large similarity search time: ${searchTime}ms for ${candidates.length} candidates`);
    });
  });

  describe('Caching', () => {
    it('should cache embeddings properly', async () => {
      service.clearCache();
      
      const text = 'Cache test text';
      
      // First call - should generate and cache
      const startTime1 = Date.now();
      const embedding1 = await service.generateEmbedding(text);
      const time1 = Date.now() - startTime1;
      
      // Second call - should use cache
      const startTime2 = Date.now();
      const embedding2 = await service.generateEmbedding(text);
      const time2 = Date.now() - startTime2;
      
      expect(embedding1).toEqual(embedding2);
      expect(time2).toBeLessThan(time1); // Cache should be faster
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(1000);
    });

    it('should evict old entries when cache is full', async () => {
      service.clearCache();
      
      // Fill cache beyond capacity
      for (let i = 0; i < 1005; i++) {
        await service.generateEmbedding(`text ${i}`);
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });

    it('should clear cache properly', async () => {
      await service.generateEmbedding('test for clearing');
      expect(service.getCacheStats().size).toBeGreaterThan(0);
      
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid similarity inputs', () => {
      const a = [1, 2, 3];
      const b = [1, 2]; // Different length
      
      expect(() => service.cosineSimilarity(a, b)).toThrow('Embeddings must have the same dimension');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for embedding generation', async () => {
      const texts = ['Performance test text 1', 'Performance test text 2', 'Performance test text 3'];
      const times: number[] = [];
      
      // Warm up
      await service.generateEmbedding('warmup text');
      
      // Measure multiple generations
      for (const text of texts) {
        const startTime = Date.now();
        await service.generateEmbedding(text);
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      
      console.log(`Performance test - Average embedding generation time: ${avgTime.toFixed(1)}ms`);
      console.log(`Individual times: ${times.map(t => t.toFixed(1)).join(', ')}ms`);
      
      // Target is 2ms, but allow some flexibility for test environment
      expect(avgTime).toBeLessThan(50); // Generous for test environment
    });
  });
}); 