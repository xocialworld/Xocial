import type { SupabaseClient } from '@supabase/supabase-js';

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const VECTOR_SIZE = 64;

function tokenize(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9#@]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .slice(0, 400);
}

function hashToken(token: string) {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function buildLexicalEmbedding(value: unknown) {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  tokenize(value).forEach((token) => {
    const index = hashToken(token) % VECTOR_SIZE;
    vector[index] += 1;
  });
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => Number((item / magnitude).toFixed(6)));
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let index = 0; index < length; index += 1) {
    dot += Number(a[index] || 0) * Number(b[index] || 0);
    aMag += Number(a[index] || 0) ** 2;
    bMag += Number(b[index] || 0) ** 2;
  }
  if (!aMag || !bMag) return 0;
  return dot / Math.sqrt(aMag * bMag);
}

export function chunkKnowledgeText(content: string) {
  const normalized = content.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(normalized.length, cursor + CHUNK_SIZE);
    const slice = normalized.slice(cursor, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    cursor = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

export function rankKnowledgeRows<T extends { content?: string | null; embedding?: unknown; title?: string | null }>(
  rows: T[],
  query: string,
  limit = 8
) {
  const queryEmbedding = buildLexicalEmbedding(query);
  const queryTokens = new Set(tokenize(query));

  return rows
    .map((row) => {
      const content = String(row.content || '');
      const rowEmbedding = Array.isArray(row.embedding)
        ? (row.embedding as number[])
        : buildLexicalEmbedding(`${row.title || ''}\n${content}`);
      const lexicalMatches = tokenize(content).filter((token) => queryTokens.has(token)).length;
      const score = cosineSimilarity(queryEmbedding, rowEmbedding) + lexicalMatches * 0.03;
      return { ...row, relevanceScore: Number(score.toFixed(4)) };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

function isMissingKnowledgeTable(error: any) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('Could not find');
}

export async function syncKnowledgeDocumentChunks(
  supabase: SupabaseClient,
  document: {
    id: string;
    workspace_id: string;
    title?: string | null;
    document_type?: string | null;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const chunks = chunkKnowledgeText(String(document.content || ''));
  if (chunks.length === 0) return { chunksWritten: 0 };

  const { error: deleteError } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('document_id', document.id);

  if (deleteError && !isMissingKnowledgeTable(deleteError)) {
    throw new Error(deleteError.message);
  }

  const rows = chunks.map((chunk, index) => ({
    workspace_id: document.workspace_id,
    document_id: document.id,
    chunk_index: index,
    content: chunk,
    embedding: buildLexicalEmbedding(`${document.title || ''}\n${chunk}`),
    metadata: {
      title: document.title || 'Knowledge source',
      documentType: document.document_type || 'note',
      sourceMetadata: document.metadata || {},
      embeddingMethod: 'lexical_hash_v1',
    },
  }));

  const { error } = await supabase.from('knowledge_chunks').insert(rows);
  if (error && !isMissingKnowledgeTable(error)) {
    throw new Error(error.message);
  }

  return { chunksWritten: error ? 0 : rows.length };
}

export async function syncWorkspaceKnowledgeChunks(
  supabase: SupabaseClient,
  workspaceId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, workspace_id, title, document_type, content, metadata')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (!isMissingKnowledgeTable(error)) throw new Error(error.message);
    return { documentsProcessed: 0, chunksWritten: 0 };
  }

  let chunksWritten = 0;
  for (const document of data || []) {
    const result = await syncKnowledgeDocumentChunks(supabase, document as any);
    chunksWritten += result.chunksWritten;
  }

  return { documentsProcessed: data?.length || 0, chunksWritten };
}
