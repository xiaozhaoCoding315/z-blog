import type { TrackView } from "./songs-server";

/**
 * 小元点歌的纯逻辑：识别「推荐/来/放一首歌」这类短句，并从候选里挑一首。
 *
 * 只拦截短句，避免把「帮我写个歌单接口」当成点歌；排除刚放过的那首，
 * 让连续点歌不会一直重复。候选为空时返回 null，由调用方说明原因。
 */

export interface PetMusicCandidate {
  track: TrackView;
  playlistId: number | null;
  playlistTitle: string;
  playlistCover: string | null;
}

export function isSongRecommendationRequest(text: string): boolean {
  const value = text.trim().replace(/\s+/g, "");
  if (!value || value.length > 40) return false;
  const mentionsMusic = /歌|音乐|曲子/.test(value);
  const asksForMusic =
    /推荐|来(?:一)?首|来点|放(?:一)?首|放点|换(?:一)?首|听点|整(?:一)?首/.test(
      value
    );
  return mentionsMusic && asksForMusic;
}

export function pickPetMusicCandidate(
  candidates: readonly PetMusicCandidate[],
  excludeId: number | null | undefined,
  random: () => number = Math.random
): PetMusicCandidate | null {
  if (candidates.length === 0) return null;
  const pool =
    excludeId === null || excludeId === undefined
      ? candidates
      : candidates.filter((item) => item.track.id !== excludeId);
  const list = pool.length > 0 ? pool : candidates;
  const index = Math.min(
    list.length - 1,
    Math.max(0, Math.floor(random() * list.length))
  );
  return list[index] ?? null;
}