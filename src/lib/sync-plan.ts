/**
 * 同步增量判定。
 *
 * contentHash 只代表「元数据已同步」；向量是否追平要看 embeddingHash。
 * 这样 embedding 服务暂时不可用、或上次中途失败时，下一次仍会补向量，
 * 而不是因为正文没变就永远跳过。
 */
export interface SyncState {
  contentHash: string;
  embeddingHash: string | null;
}

export function needsSync(
  prev: SyncState | null | undefined,
  contentHash: string,
  embeddingEnabled: boolean,
  force = false
): boolean {
  if (force || !prev) return true;
  if (prev.contentHash !== contentHash) return true;
  return embeddingEnabled && prev.embeddingHash !== contentHash;
}