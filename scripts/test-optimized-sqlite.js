// Teste das otimizações SQLite WAL mode e performance
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

async function testSQLiteOptimizations() {
  console.log('🚀 Testando otimizações SQLite...');
  
  const dbPath = 'data/test-optimized.db';
  
  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  
  try {
    console.log('⏳ Aplicando otimizações de performance...');
    const startTime = Date.now();
    
    // Apply all documented optimizations
    db.pragma('journal_mode = WAL');
    db.pragma('wal_autocheckpoint = 1000');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('mmap_size = 1073741824'); // 1GB memory mapping
    db.pragma('temp_store = MEMORY');
    db.pragma('synchronous = NORMAL');
    db.pragma('optimize');
    
    const optimizationTime = Date.now() - startTime;
    console.log(`✅ Otimizações aplicadas em ${optimizationTime}ms`);
    
    // Verify optimizations
    console.log('📊 Verificando configurações...');
    const journalMode = db.pragma('journal_mode', { simple: true });
    const cacheSize = db.pragma('cache_size', { simple: true });
    const mmapSize = db.pragma('mmap_size', { simple: true });
    const tempStore = db.pragma('temp_store', { simple: true });
    
    console.log(`- Journal Mode: ${journalMode} (esperado: wal)`);
    console.log(`- Cache Size: ${Math.abs(cacheSize)}KB = ${Math.abs(cacheSize)/1024}MB (esperado: 64MB)`);
    console.log(`- Memory Map: ${mmapSize/1024/1024}MB (esperado: 1024MB)`);
    console.log(`- Temp Store: ${tempStore} (esperado: 2=MEMORY)`);
    
    // Create test tables with optimized structure
    console.log('🏗️ Criando estrutura otimizada...');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        estimate_minutes INTEGER DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        parent_id TEXT,
        depth INTEGER DEFAULT 0,
        path TEXT DEFAULT ''
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        created_at TEXT NOT NULL
      )
    `);
    
    // Create specialized indices
    console.log('🔧 Criando índices especializados...');
    const indexStartTime = Date.now();
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_depth ON nodes(depth)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_path ON nodes(path)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_status_type ON nodes(status, type)',
      'CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id)',
      'CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id)',
      'CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type)',
      'CREATE INDEX IF NOT EXISTS idx_edges_from_type ON edges(from_id, type)'
    ];
    
    for (const indexSql of indices) {
      db.exec(indexSql);
    }
    
    const indexTime = Date.now() - indexStartTime;
    console.log(`✅ ${indices.length} índices criados em ${indexTime}ms`);
    
    // Performance test: bulk insert
    console.log('⚡ Testando performance de escrita (bulk insert)...');
    
    const insertStartTime = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO nodes (id, title, description, type, status, estimate_minutes, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((nodes) => {
      for (const node of nodes) insertStmt.run(node);
    });
    
    // Create 1000 test nodes
    const testNodes = [];
    for (let i = 1; i <= 1000; i++) {
      testNodes.push([
        `test${i}`,
        `Test Task ${i}`,
        `Description for task ${i}`,
        'task',
        'pending',
        Math.floor(Math.random() * 120) + 30,
        'medium',
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }
    
    insertMany(testNodes);
    const insertTime = Date.now() - insertStartTime;
    console.log(`✅ 1000 registros inseridos em ${insertTime}ms (${(1000/insertTime*1000).toFixed(0)} registros/segundo)`);
    
    // Performance test: complex query
    console.log('🔍 Testando performance de consulta complexa...');
    
    const queryStartTime = Date.now();
    const complexQuery = `
      WITH RECURSIVE hierarchy AS (
        SELECT id, title, parent_id, 0 as level
        FROM nodes 
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT n.id, n.title, n.parent_id, h.level + 1
        FROM nodes n
        JOIN hierarchy h ON n.parent_id = h.id
        WHERE h.level < 10
      )
      SELECT 
        h.*,
        COUNT(child.id) as child_count
      FROM hierarchy h
      LEFT JOIN nodes child ON child.parent_id = h.id
      GROUP BY h.id
      ORDER BY h.level, h.title
      LIMIT 100
    `;
    
    const result = db.prepare(complexQuery).all();
    const queryTime = Date.now() - queryStartTime;
    console.log(`✅ Consulta hierárquica complexa executada em ${queryTime}ms (${result.length} resultados)`);
    
    // Dijkstra test
    console.log('🎯 Testando algoritmo Dijkstra...');
    
    // First create some test edges
    const edgeStmt = db.prepare(`
      INSERT OR IGNORE INTO edges (id, from_id, to_id, type, weight, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (let i = 1; i < 50; i++) {
      const nextNode = i + 1;
      if (nextNode <= 1000) {
        edgeStmt.run(
          `edge${i}_${nextNode}`,
          `test${i}`,
          `test${nextNode}`,
          'depends_on',
          1.0,
          new Date().toISOString()
        );
      }
    }
    
    const dijkstraStartTime = Date.now();
    const dijkstraQuery = `
      WITH RECURSIVE dijkstra AS (
        SELECT 
          ? as node_id,
          0 as distance,
          ? as path
        
        UNION ALL
        
        SELECT 
          e.to_id as node_id,
          d.distance + COALESCE(e.weight, 1) as distance,
          d.path || ',' || e.to_id as path
        FROM dijkstra d
        JOIN edges e ON d.node_id = e.from_id
        WHERE e.type = 'depends_on'
          AND e.to_id NOT LIKE '%' || d.path || '%'
          AND d.distance < 50
      )
      SELECT node_id, MIN(distance) as distance
      FROM dijkstra
      GROUP BY node_id
      ORDER BY distance
      LIMIT 100
    `;
    
    const dijkstraResult = db.prepare(dijkstraQuery).all('test1', 'test1');
    const dijkstraTime = Date.now() - dijkstraStartTime;
    console.log(`✅ Dijkstra executado em ${dijkstraTime}ms (${dijkstraResult.length} nós encontrados)`);
    
    // Results summary
    console.log('\n📊 RESULTADOS DOS TESTES:');
    console.log(`⚙️  Otimizações: ${optimizationTime}ms`);
    console.log(`📚 Índices: ${indexTime}ms`);
    console.log(`✍️  Bulk Insert: ${insertTime}ms (${(1000/insertTime*1000).toFixed(0)} ops/sec)`);
    console.log(`🔍 Query Complexa: ${queryTime}ms`);
    console.log(`🎯 Dijkstra: ${dijkstraTime}ms`);
    
    // Validation against markdown targets
    console.log('\n🎯 ADERÊNCIA AO MARKDOWN:');
    console.log(`- WAL Mode: ${journalMode === 'wal' ? '✅' : '❌'}`);
    console.log(`- Cache 64MB: ${Math.abs(cacheSize) >= 64000 ? '✅' : '❌'}`);
    console.log(`- Memory Map 1GB: ${mmapSize >= 1073741824 ? '✅' : '❌'}`);
    console.log(`- Dijkstra <100ms: ${dijkstraTime < 100 ? '✅' : '❌'} (${dijkstraTime}ms)`);
    console.log(`- Complex Query <100ms: ${queryTime < 100 ? '✅' : '❌'} (${queryTime}ms)`);
    
    const passed = journalMode === 'wal' && 
                   Math.abs(cacheSize) >= 64000 &&
                   mmapSize >= 1073741824 &&
                   dijkstraTime < 100 &&
                   queryTime < 100;
    
    console.log(`\n🏆 RESULTADO GERAL: ${passed ? '✅ PASSOU' : '❌ FALHOU'}`);
    
    return {
      optimizationTime,
      insertTime,
      queryTime,
      dijkstraTime,
      passed,
      config: {
        journalMode,
        cacheSize: Math.abs(cacheSize),
        mmapSize
      }
    };
    
  } finally {
    db.close();
  }
}

testSQLiteOptimizations()
  .then(results => {
    console.log('\n🎉 Teste das otimizações SQLite CONCLUÍDO!');
    process.exit(results.passed ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Teste falhou:', error.message);
    process.exit(1);
  }); 