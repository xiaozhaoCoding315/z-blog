"use server";

import type { ParsedLyrics } from "@/lib/lyrics-core";
import { fetchNeteaseLyrics } from "@/lib/lyrics-server";

export interface SongLyricsState {
  ok: boolean;
  lyrics?: ParsedLyrics;
  error?: string;
}

/** 歌词页打开时按需读取；公开内容，不要求登录，也不带任何访客身份。 */
export async function loadSongLyrics(
  platform: string,
  externalId: string
): Promise<SongLyricsState> {
  if (platform !== "netease") {
    return { ok: false, error: "这首歌来自平台外链，站内没有歌词" };
  }
  return fetchNeteaseLyrics(externalId);
}