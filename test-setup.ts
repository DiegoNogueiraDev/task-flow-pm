// Setup global para testes
import { vi } from 'vitest';

// Mock logger para testes
vi.mock('./src/services/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock para Elasticsearch quando não disponível
const originalFetch = global.fetch;
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('localhost:9200') || url.includes('elasticsearch')) {
    return Promise.reject(new Error('Elasticsearch não disponível em ambiente de teste'));
  }
  return originalFetch(url);
});
