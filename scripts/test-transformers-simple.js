// Teste simples do @xenova/transformers
const { pipeline } = require('@xenova/transformers');

async function testBasicTransformers() {
  console.log('🚀 Testando @xenova/transformers básico...');
  
  try {
    const startTime = Date.now();
    console.log('⏳ Inicializando pipeline...');
    
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true
    });
    
    const initTime = Date.now() - startTime;
    console.log(`✅ Pipeline inicializado em ${initTime}ms`);
    
    console.log('📊 Gerando embedding...');
    const embStartTime = Date.now();
    const output = await extractor('Hello world test', {
      pooling: 'mean',
      normalize: true
    });
    const embTime = Date.now() - embStartTime;
    
    const embedding = Array.from(output.data);
    
    console.log(`✅ Embedding gerado em ${embTime}ms`);
    console.log(`📏 Dimensões: ${embedding.length}`);
    console.log(`🔢 Primeiros 5 valores: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    console.log('\n📊 RESULTADOS:');
    console.log(`⏱️  Tempo de inicialização: ${initTime}ms (meta: <3000ms)`);
    console.log(`🚀 Tempo de embedding: ${embTime}ms (meta: <2ms)`);
    console.log(`📏 Dimensões corretas: ${embedding.length === 384 ? '✅' : '❌'}`);
    
    return { initTime, embTime, dimensions: embedding.length };
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

testBasicTransformers()
  .then(results => {
    console.log('\n🎉 Teste básico do Transformers.js PASSOU!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Teste falhou:', error.message);
    process.exit(1);
  }); 