# RFC 003: Knowledge Graph Schema

**Status:** Draft
**Author:** make-laten team
**Date:** 2026-07-22
**Depends on:** [RFC 001: Architecture](./001-architecture.md)

---

## Summary

Define the Knowledge Graph schema and query patterns for make-laten's persistent memory system.

---

## Motivation

AI coding agents need to remember:
1. **What was accessed** — files, commands, web content
2. **How it was compressed** — strategies, confidence, savings
3. **What patterns exist** — command sequences, file relationships
4. **What failed** — errors, resolutions, fixes
5. **What learned** — auto-corrections, rule updates

A knowledge graph provides:
- **Relationships** between entities (file → depends_on → file)
- **Traversal** for pattern discovery
- **Semantic search** for similar content
- **Persistence** across sessions

---

## Schema Design

### Nodes

```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- file, command, ir, pattern, session, agent, cache, semantic
  content TEXT NOT NULL,        -- compressed content or reference
  original TEXT,                -- original content for retrieval
  embedding BLOB,              -- vector embedding for semantic search
  metadata JSON NOT NULL,      -- structured metadata
  created_at INTEGER NOT NULL,
  accessed_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_created ON nodes(created_at);
CREATE INDEX idx_nodes_accessed ON nodes(accessed_at);
```

### Node Types

| Type | Description | Example |
|------|-------------|---------|
| `file` | File content (compressed) | `file:src/payment.ts` |
| `command` | Command output (compressed) | `command:git diff` |
| `ir` | Intermediate representation | `ir:payment-compact` |
| `pattern` | Learned pattern | `pattern:payment-workflow` |
| `session` | Session metadata | `session:abc123` |
| `agent` | Agent metadata | `agent:claude-code` |
| `cache` | Cached result | `cache:a1b2c3d4` |
| `semantic` | Semantic content | `semantic:payment-processing` |

### Edges

```sql
CREATE TABLE edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  metadata JSON,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (source) REFERENCES nodes(id),
  FOREIGN KEY (target) REFERENCES nodes(id)
);

CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);
CREATE INDEX idx_edges_type ON edges(type);
```

### Edge Types

| Type | Description | Example |
|------|-------------|---------|
| `compressed_to` | Content was compressed to IR | `file:payment.ts` → `ir:payment-compact` |
| `depends_on` | File depends on another | `file:payment.ts` → `file:stripe.ts` |
| `related_to` | Files are related | `file:payment.ts` → `file:billing.ts` |
| `used_by` | Content used by session | `file:payment.ts` → `session:abc123` |
| `followed_by` | Command followed by another | `cmd:git status` → `cmd:git add` |
| `pattern` | Node is part of pattern | `file:payment.ts` → `pattern:payment-workflow` |
| `cached` | Content is cached | `file:payment.ts` → `cache:a1b2c3d4` |

---

## Query Patterns

### Direct Retrieval

```typescript
// Get node by ID
async function getNode(id: string): Promise<GraphNode | null> {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id)
  return node ? this.hydrateNode(node) : null
}

// Get edges from node
async function getEdges(nodeId: string, edgeType?: string): Promise<GraphEdge[]> {
  const query = edgeType
    ? 'SELECT * FROM edges WHERE source = ? AND type = ?'
    : 'SELECT * FROM edges WHERE source = ?'
  const params = edgeType ? [nodeId, edgeType] : [nodeId]
  return db.prepare(query).all(...params)
}
```

### Relationship Traversal

```typescript
// Traverse graph from node
async function traverse(
  startId: string, 
  edgeType: string, 
  maxDepth: number = 2
): Promise<GraphNode[]> {
  const visited = new Set<string>()
  const results: GraphNode[] = []
  
  const queue = [{ id: startId, depth: 0 }]
  
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id) || depth > maxDepth) continue
    
    visited.add(id)
    const node = await this.getNode(id)
    if (node) results.push(node)
    
    const edges = await this.getEdges(id, edgeType)
    for (const edge of edges) {
      queue.push({ id: edge.target, depth: depth + 1 })
    }
  }
  
  return results
}
```

### Pattern Discovery

```typescript
// Find patterns from node
async function findPatterns(nodeId: string): Promise<Pattern[]> {
  // 1. Find all pattern nodes connected to this node
  const patternEdges = await db.prepare(`
    SELECT e.*, n.content, n.metadata
    FROM edges e
    JOIN nodes n ON e.target = n.id
    WHERE e.source = ? AND e.type = 'pattern' AND n.type = 'pattern'
  `).all(nodeId)
  
  // 2. Also check reverse edges
  const reversePatternEdges = await db.prepare(`
    SELECT e.*, n.content, n.metadata
    FROM edges e
    JOIN nodes n ON e.source = n.id
    WHERE e.target = ? AND e.type = 'pattern' AND n.type = 'pattern'
  `).all(nodeId)
  
  // 3. Combine and deduplicate
  const patterns = [...patternEdges, ...reversePatternEdges]
    .map(e => this.hydratePattern(e))
    .filter(p => p.confidence > 0.5)
  
  return patterns
}

// Discover new patterns from command sequences
async function discoverPatterns(sessionId: string): Promise<Pattern[]> {
  // 1. Get all commands in session, ordered by time
  const commands = await db.prepare(`
    SELECT n.*, e.metadata as edge_metadata
    FROM nodes n
    JOIN edges e ON n.id = e.source
    WHERE e.target LIKE 'session:%'
    ORDER BY n.created_at ASC
  `).all()
  
  // 2. Find frequent sequences (n-grams)
  const sequences = this.findFrequentSequences(commands, 2, 4)
  
  // 3. Convert to patterns
  return sequences.map(seq => ({
    id: `pattern:${this.hash(seq)}`,
    type: 'sequence',
    trigger: seq[0],
    actions: seq.slice(1),
    confidence: seq.count / commands.length,
    occurrences: seq.count
  }))
}
```

### Semantic Search

```typescript
// Search by embedding similarity
async function searchByEmbedding(
  queryEmbedding: number[], 
  options: { threshold?: number; limit?: number } = {}
): Promise<GraphNode[]> {
  const { threshold = 0.8, limit = 10 } = options
  
  // 1. Get all nodes with embeddings
  const nodes = db.prepare(`
    SELECT * FROM nodes WHERE embedding IS NOT NULL
  `).all()
  
  // 2. Calculate cosine similarity
  const scored = nodes.map(node => ({
    node,
    similarity: this.cosineSimilarity(queryEmbedding, node.embedding)
  }))
  
  // 3. Filter by threshold and sort
  return scored
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(s => this.hydrateNode(s.node))
}

// Semantic search with text query
async function search(query: string, options?: SearchOptions): Promise<GraphNode[]> {
  // 1. Embed query
  const embedding = await this.embed(query)
  
  // 2. Search by embedding
  const results = await this.searchByEmbedding(embedding, options)
  
  // 3. Also search by text (fallback)
  const textResults = await this.searchByText(query, options)
  
  // 4. Merge and deduplicate
  return this.mergeResults(results, textResults)
}
```

### Compression Recommendation

```typescript
// Recommend compression strategy based on history
async function recommendCompression(nodeId: string): Promise<CompressionRecommendation> {
  const node = await this.getNode(nodeId)
  if (!node) return { strategy: 'default', confidence: 0.5 }
  
  // 1. Check if this file was compressed before
  const compressionEdges = await this.getEdges(nodeId, 'compressed_to')
  if (compressionEdges.length > 0) {
    const lastCompression = compressionEdges[compressionEdges.length - 1]
    const irNode = await this.getNode(lastCompression.target)
    
    return {
      strategy: irNode.metadata.strategy,
      confidence: irNode.metadata.confidence,
      reason: `Previously compressed with ${irNode.metadata.strategy}`
    }
  }
  
  // 2. Check similar files
  const similarFiles = await this.findSimilarFiles(nodeId)
  if (similarFiles.length > 0) {
    const bestStrategy = this.mostFrequentStrategy(similarFiles)
    return {
      strategy: bestStrategy.strategy,
      confidence: bestStrategy.confidence,
      reason: `Similar files use ${bestStrategy.strategy}`
    }
  }
  
  // 3. Use default based on file type
  return {
    strategy: this.defaultStrategy(node.type),
    confidence: 0.7,
    reason: 'Default strategy for file type'
  }
}
```

---

## Metadata Schema

### File Node Metadata

```typescript
interface FileMetadata {
  filePath: string
  language: string
  lines: number
  size: number
  lastModified: number
  compressionStrategy?: string
  compressionConfidence?: number
}
```

### Command Node Metadata

```typescript
interface CommandMetadata {
  command: string
  args: string[]
  exitCode: number
  duration: number
  outputSize: number
  compressionStrategy?: string
}
```

### Pattern Node Metadata

```typescript
interface PatternMetadata {
  type: 'sequence' | 'related' | 'error_fix' | 'workflow'
  trigger: string
  actions: string[]
  confidence: number
  occurrences: number
  lastSeen: number
}
```

---

## Performance Considerations

### Indexes

```sql
-- Primary lookups
CREATE INDEX idx_nodes_id ON nodes(id);
CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);

-- Type filtering
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_edges_type ON edges(type);

-- Temporal queries
CREATE INDEX idx_nodes_created ON nodes(created_at);
CREATE INDEX idx_nodes_accessed ON nodes(accessed_at);

-- Semantic search (for vector similarity)
-- Note: SQLite doesn't have native vector search
-- We'll use in-memory computation for small datasets
-- or consider sqlite-vss extension for large datasets
```

### Query Optimization

1. **Batch operations:** Use transactions for multiple inserts/updates
2. **Lazy loading:** Only load node content when needed
3. **Cache hot nodes:** Keep frequently accessed nodes in memory
4. **Periodic cleanup:** Remove old, unused nodes

---

## Migration Strategy

### v1 Schema

```sql
-- Initial schema
CREATE TABLE nodes (...);
CREATE TABLE edges (...);
-- Indexes
```

### Future Migrations

```sql
-- v2: Add vector search support
-- v3: Add team sharing fields
-- v4: Add compression history tracking
```

---

## Open Questions

1. How to handle graph conflicts in team scenarios?
2. Should we use sqlite-vss for vector search at scale?
3. How to backup/restore the knowledge graph?
4. Should graph be encrypted at rest?
