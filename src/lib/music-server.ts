import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { musicAccounts } from "@/db/schema";
import {
  decryptMusicCookie,
  fetchNeteaseUserPlaylists,
  type NeteasePlaylistSummary,
} from "@/lib/music-auth";

export interface LinkedMusicAccount {
  provider: "netease";
  externalUserId: string;
  nickname: string;
  avatarUrl: string | null;
  updatedAt: Date;
}

export interface LinkedNetease {
  account: LinkedMusicAccount;
  playlists: NeteasePlaylistSummary[];
  cookie: string;
}

/** 只读绑定账号与解密后的 cookie，不额外请求歌单列表。 */
export async function getLinkedNeteaseAccount(userId: number): Promise<{
  account: LinkedMusicAccount;
  cookie: string;
} | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [row] = await db
      .select({
        provider: musicAccounts.provider,
        externalUserId: musicAccounts.externalUserId,
        nickname: musicAccounts.nickname,
        avatarUrl: musicAccounts.avatarUrl,
        cookieEnc: musicAccounts.cookieEnc,
        updatedAt: musicAccounts.updatedAt,
      })
      .from(musicAccounts)
      .where(eq(musicAccounts.userId, userId))
      .limit(1);
    if (!row || row.provider !== "netease") return null;

    const cookie = decryptMusicCookie(row.cookieEnc);
    if (!cookie) return null;

    return {
      account: {
        provider: "netease",
        externalUserId: row.externalUserId,
        nickname: row.nickname,
        avatarUrl: row.avatarUrl,
        updatedAt: row.updatedAt,
      },
      cookie,
    };
  } catch {
    return null;
  }
}

/** 读出当前用户绑定的音乐账号并拉取歌单列表；cookie 解密失败按未绑定处理。 */
export async function getLinkedNetease(userId: number): Promise<LinkedNetease | null> {
  const linked = await getLinkedNeteaseAccount(userId);
  if (!linked) return null;

  const externalUserId = Number(linked.account.externalUserId);
  const playlists =
    Number.isSafeInteger(externalUserId) && externalUserId > 0
      ? await fetchNeteaseUserPlaylists(linked.cookie, externalUserId)
      : [];

  return { ...linked, playlists };
}