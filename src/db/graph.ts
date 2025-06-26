import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { TaskNode, TaskEdge, EmbeddingRecord, TaskReflection, SystemSetting, HybridSearchResult } from '../mcp/schema';

export class GraphDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    try {
      // Ensure directory exists
      const dir = dirname(dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(dbPath);
      this.migrate();
    } catch (error) {
      throw new Error(`Failed to initialize database at ${dbPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private migrate(): void {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('epic', 'story', 'task', 'subtask')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'in-progress', 'completed', 'blocked')),
        estimate_minutes INTEGER DEFAULT 0,
        actual_minutes INTEGER DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        parent_id TEXT,
        FOREIGN KEY (parent_id) REFERENCES nodes(id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('depends_on', 'blocks', 'child_of', 'related_to')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (from_id) REFERENCES nodes(id),
        FOREIGN KEY (to_id) REFERENCES nodes(id),
        UNIQUE(from_id, to_id, type)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        text TEXT NOT NULL,
        vector TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflections (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        note TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES nodes(id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes for better performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_embeddings_node ON embeddings(node_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_reflections_task ON reflections(task_id)`);

    // Migrate existing tables (add new columns if they don't exist)
    this.addColumnIfNotExists('nodes', 'started_at', 'TEXT');
    this.addColumnIfNotExists('nodes', 'ended_at', 'TEXT');
  }

  private addColumnIfNotExists(table: string, column: string, type: string): void {
    try {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (error) {
      // Column already exists, ignore error
    }
  }

  addNode(node: Omit<TaskNode, 'createdAt' | 'updatedAt'>): TaskNode {
    try {
      const now = new Date().toISOString();
      const fullNode: TaskNode = {
        ...node,
        createdAt: now,
        updatedAt: now,
      };

      const stmt = this.db.prepare(`
        INSERT INTO nodes (
          id, title, description, type, status, estimate_minutes, actual_minutes,
          priority, tags, created_at, updated_at, started_at, ended_at, parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        fullNode.id,
        fullNode.title,
        fullNode.description,
        fullNode.type,
        fullNode.status,
        fullNode.estimateMinutes,
        fullNode.actualMinutes,
        fullNode.priority,
        JSON.stringify(fullNode.tags),
        fullNode.createdAt,
        fullNode.updatedAt,
        fullNode.startedAt || null,
        fullNode.endedAt || null,
        fullNode.parentId || null
      );

      return fullNode;
    } catch (error) {
      throw new Error(`Failed to add node ${node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  updateNode(id: string, updates: Partial<TaskNode>): TaskNode | null {
    const node = this.getNode(id);
    if (!node) return null;

    const updatedNode = {
      ...node,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE nodes SET
        title = ?, description = ?, type = ?, status = ?,
        estimate_minutes = ?, actual_minutes = ?, priority = ?,
        tags = ?, updated_at = ?, started_at = ?, ended_at = ?, parent_id = ?
      WHERE id = ?
    `);

    stmt.run(
      updatedNode.title,
      updatedNode.description,
      updatedNode.type,
      updatedNode.status,
      updatedNode.estimateMinutes,
      updatedNode.actualMinutes,
      updatedNode.priority,
      JSON.stringify(updatedNode.tags),
      updatedNode.updatedAt,
      updatedNode.startedAt || null,
      updatedNode.endedAt || null,
      updatedNode.parentId || null,
      id
    );

    return updatedNode;
  }

  getNode(id: string): TaskNode | null {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      estimateMinutes: row.estimate_minutes,
      actualMinutes: row.actual_minutes,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      parentId: row.parent_id,
    };
  }

  addEdge(edge: Omit<TaskEdge, 'createdAt'>): TaskEdge {
    const now = new Date().toISOString();
    const fullEdge: TaskEdge = {
      ...edge,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO edges (id, from_id, to_id, type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullEdge.id,
      fullEdge.fromId,
      fullEdge.toId,
      fullEdge.type,
      fullEdge.createdAt
    );

    return fullEdge;
  }

  getChildren(parentId: string): TaskNode[] {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE parent_id = ? ORDER BY created_at');
    const rows = stmt.all(parentId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      estimateMinutes: row.estimate_minutes,
      actualMinutes: row.actual_minutes,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      parentId: row.parent_id,
    }));
  }

  getBlocking(taskId: string): TaskNode[] {
    const stmt = this.db.prepare(`
      SELECT n.* FROM nodes n
      JOIN edges e ON n.id = e.from_id
      WHERE e.to_id = ? AND e.type = 'blocks'
      ORDER BY n.priority DESC, n.created_at
    `);
    const rows = stmt.all(taskId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      estimateMinutes: row.estimate_minutes,
      actualMinutes: row.actual_minutes,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      parentId: row.parent_id,
    }));
  }

  getDependencies(taskId: string): TaskNode[] {
    const stmt = this.db.prepare(`
      SELECT n.* FROM nodes n
      JOIN edges e ON n.id = e.to_id
      WHERE e.from_id = ? AND e.type = 'depends_on'
      ORDER BY n.priority DESC, n.created_at
    `);
    const rows = stmt.all(taskId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      estimateMinutes: row.estimate_minutes,
      actualMinutes: row.actual_minutes,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      parentId: row.parent_id,
    }));
  }

  listTasks(filters: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): TaskNode[] {
    let query = 'SELECT * FROM nodes WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY priority DESC, created_at';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      estimateMinutes: row.estimate_minutes,
      actualMinutes: row.actual_minutes,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      parentId: row.parent_id,
    }));
  }

  addEmbedding(embedding: Omit<EmbeddingRecord, 'createdAt'>): EmbeddingRecord {
    const now = new Date().toISOString();
    const fullEmbedding: EmbeddingRecord = {
      ...embedding,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO embeddings (id, node_id, text, vector, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullEmbedding.id,
      fullEmbedding.nodeId,
      fullEmbedding.text,
      JSON.stringify(fullEmbedding.vector),
      fullEmbedding.createdAt
    );

    return fullEmbedding;
  }

  searchEmbeddings(queryVector: number[], limit: number = 10): Array<EmbeddingRecord & { similarity: number }> {
    // Simple vector similarity search (cosine similarity)
    const stmt = this.db.prepare('SELECT * FROM embeddings');
    const rows = stmt.all() as any[];
    
    const results = rows.map(row => {
      const vector = JSON.parse(row.vector);
      const similarity = this.cosineSimilarity(queryVector, vector);
      
      return {
        id: row.id,
        nodeId: row.node_id,
        text: row.text,
        vector,
        createdAt: row.created_at,
        similarity,
      };
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
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

  close(): void {
    this.db.close();
  }

  // 🔍 Hybrid Search Implementation
  hybridSearch(query: string, k: number = 5): HybridSearchResult[] {
    // Get embeddings similarity scores
    const queryEmbedding = this.generateFallbackEmbedding(); // Fallback for now
    const embeddingResults = this.searchEmbeddings(queryEmbedding, k * 2);

    const results: HybridSearchResult[] = [];

    for (const embResult of embeddingResults) {
      const node = this.getNode(embResult.nodeId);
      if (!node) continue;

      const simScore = embResult.similarity;
      const graphScore = this.calculateGraphScore(embResult.nodeId);
      const finalScore = (simScore * 0.7) + (graphScore * 0.3);

      results.push({
        node,
        simScore,
        graphScore,
        finalScore,
      });
    }

    return results
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, k);
  }

  private calculateGraphScore(nodeId: string): number {
    // Simple graph score: connected nodes get higher scores
    const connections = this.getConnectedNodes(nodeId);
    const pathLength = Math.max(1, connections.length);
    return 1 / (pathLength + 1);
  }

  private getConnectedNodes(nodeId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT CASE 
        WHEN from_id = ? THEN to_id 
        ELSE from_id 
      END as connected_id
      FROM edges 
      WHERE from_id = ? OR to_id = ?
    `);
    
    const rows = stmt.all(nodeId, nodeId, nodeId) as any[];
    return rows.map(row => row.connected_id);
  }

  private generateFallbackEmbedding(): number[] {
    // Generate normalized random vector for fallback
    const vector: number[] = [];
    let sumSquares = 0;

    for (let i = 0; i < 384; i++) {
      const component = (Math.random() - 0.5) * 2;
      vector.push(component);
      sumSquares += component * component;
    }

    const magnitude = Math.sqrt(sumSquares);
    return vector.map(component => component / magnitude);
  }

  // 🪞 Reflection System
  addReflection(reflection: Omit<TaskReflection, 'timestamp'>): TaskReflection {
    const fullReflection: TaskReflection = {
      ...reflection,
      timestamp: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      INSERT INTO reflections (id, task_id, note, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      fullReflection.id,
      fullReflection.taskId,
      fullReflection.note,
      fullReflection.timestamp
    );

    return fullReflection;
  }

  getReflections(taskId: string): TaskReflection[] {
    const stmt = this.db.prepare('SELECT * FROM reflections WHERE task_id = ? ORDER BY timestamp DESC');
    const rows = stmt.all(taskId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      note: row.note,
      timestamp: row.timestamp,
    }));
  }

  getAllReflections(limit: number = 100): TaskReflection[] {
    const stmt = this.db.prepare('SELECT * FROM reflections ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      note: row.note,
      timestamp: row.timestamp,
    }));
  }

  // ⚙️ Settings System
  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(key, value, new Date().toISOString());
  }

  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as any;
    
    return row ? row.value : null;
  }

  getAllSettings(): SystemSetting[] {
    const stmt = this.db.prepare('SELECT * FROM settings ORDER BY key');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    }));
  }

  // 📊 Analytics for Effort Estimation
  getEstimationVariances(limit: number = 20): Array<{
    taskId: string;
    estimate: number;
    actual: number;
    variance: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, estimate_minutes, actual_minutes
      FROM nodes 
      WHERE status = 'completed' 
        AND estimate_minutes > 0 
        AND actual_minutes > 0
      ORDER BY updated_at DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => {
      const estimate = row.estimate_minutes;
      const actual = row.actual_minutes;
      const variance = estimate > 0 ? ((actual - estimate) / estimate) * 100 : 0;
      
      return {
        taskId: row.id,
        estimate,
        actual,
        variance,
      };
    });
  }
}