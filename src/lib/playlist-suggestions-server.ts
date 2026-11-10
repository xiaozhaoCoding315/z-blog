import { cacheLife, cacheTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playlistSuggestions as suggestionsTable,
  users,
} from "@/db/schema";
import { formatDay } from "@/lib/life";
import { profileDisplayName } from "@/lib/profile-core";
import type { PlaylistSuggestionView } from "@/lib/songs-server";

function toView(row: {
  id: number;
  platform: string;
  externalId: string;
  title: string;
  coverUrl: string | null;
  note: string;
  status: string;
  playlistId: number | null;
  createdAt: Date;
  userId: number;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
}): PlaylistSuggestionView {
  return {
    id: row.id,
    platform:
      row.platform === "netease" || row.platform === "qq"
        ? row.platform
        : "other",
    externalId: row.externalId,
    title: row.title,
    coverUrl: row.coverUrl,
    note: row.note,
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
    playlistId: row.playlistId,
    date: formatDay(row.createdAt.toISOString()),
    suggester: {
      id: row.userId,
      name: profileDisplayName(row.displayName, row.login),
      avatarUrl: row.avatarUrl,
    },
  };
}

/**
 * 待审队列：只有站长需要看全部；访客只看自己提交过的，
 * 避免「别人的建议」在公开页面上变成一份可窥探的名单。
 */
export async function getPlaylistSuggestions(viewer: {
  id: number;
  role: "owner" | "visitor";
}): Promise<{ available: boolean; suggestions: PlaylistSuggestionView[] }> {
  return getPlaylistSuggestionsCached(viewer.id, viewer.role);
}

async function getPlaylistSuggestionsCached(
  viewerId: number,
  role: "owner" | "visitor"
): Promise<{ available: boolean; suggestions: PlaylistSuggestionView[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) return { available: false, suggestions: [] };

  try {
    const rows = await db
      .select({
        id: suggestionsTable.id,
        platform: suggestionsTable.platform,
        externalId: suggestionsTable.externalId,
        title: suggestionsTable.title,
        coverUrl: suggestionsTable.coverUrl,
        note: suggestionsTable.note,
        status: suggestionsTable.status,
        playlistId: suggestionsTable.playlistId,
        createdAt: suggestionsTable.createdAt,
        userId: suggestionsTable.userId,
        login: users.login,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(suggestionsTable)
      .innerJoin(users, eq(users.id, suggestionsTable.userId))
      .where(
        role === "owner"
          ? eq(suggestionsTable.status, "pending")
          : eq(suggestionsTable.userId, viewerId)
      )
      .orderBy(desc(suggestionsTable.createdAt), desc(suggestionsTable.id))
      .limit(50);

    return { available: true, suggestions: rows.map(toView) };
  } catch {
    return { available: false, suggestions: [] };
  }
}