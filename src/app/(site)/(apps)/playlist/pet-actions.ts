"use server";

import { getPetMusicCandidates } from "@/lib/songs-server";
import {
  pickPetMusicCandidate,
  type PetMusicCandidate,
} from "@/lib/pet-music";

export interface PetSongRecommendation {
  ok: boolean;
  candidate?: PetMusicCandidate;
  error?: string;
}

/**
 * 小元随手点一首能站内播放的歌。
 *
 * 候选走歌单的缓存查询，挑歌在缓存外做，所以连续点歌能换到不同的曲子；
 * 传上一首的 id 让随机尽量避开刚放过的那首。没有可播曲目时明确说明原因，
 * 而不是让面板静默什么都不发生。
 */
export async function recommendSongForPet(
  excludeId?: number
): Promise<PetSongRecommendation> {
  const result = await getPetMusicCandidates();
  if (!result.available) {
    return { ok: false, error: "歌单暂时读不到，稍后再试" };
  }

  const exclude =
    typeof excludeId === "number" &&
    Number.isSafeInteger(excludeId) &&
    excludeId > 0
      ? excludeId
      : null;
  const candidate = pickPetMusicCandidate(result.candidates, exclude);
  if (!candidate) {
    return { ok: false, error: "歌单里还没有能站内播放的歌" };
  }

  return { ok: true, candidate };
}