import { cacheLife, cacheTag } from "next/cache";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { friends as friendsTable } from "@/db/schema";
import type { FriendLink, FriendsResult } from "@/lib/friends-core";

/**
 * 公开友链：后台加一条，首页与 /friends 共用同一份缓存。
 * 读不到库时返回 available: false，让页面显示 NOT AVAILABLE，不拿空数组冒充「还没添加」。
 */
export async function getFriends(): Promise<FriendsResult> {
  return getFriendsCached();
}

async function getFriendsCached(): Promise<FriendsResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("friends");

  const db = getDb();
  if (!db) return { available: false, friends: [] };

  try {
    const rows = await db
      .select({
        id: friendsTable.id,
        name: friendsTable.name,
        url: friendsTable.url,
        description: friendsTable.description,
        avatar: friendsTable.avatar,
        tags: friendsTable.tags,
      })
      .from(friendsTable)
      .orderBy(desc(friendsTable.createdAt), desc(friendsTable.id));

    return {
      available: true,
      friends: rows.map(
        (row): FriendLink => ({
          id: row.id,
          name: row.name,
          url: row.url,
          description: row.description,
          avatar: row.avatar,
          tags: row.tags ?? [],
        })
      ),
    };
  } catch (err) {
    console.error("[friends] 读取失败：", err);
    return { available: false, friends: [] };
  }
}

/** 后台管理用：直接读库，不走缓存，站长添加或修改后立即看到真实结果。 */
export async function listFriendsForAdmin(): Promise<FriendsResult> {
  const db = getDb();
  if (!db) return { available: false, friends: [] };

  try {
    const rows = await db
      .select({
        id: friendsTable.id,
        name: friendsTable.name,
        url: friendsTable.url,
        description: friendsTable.description,
        avatar: friendsTable.avatar,
        tags: friendsTable.tags,
      })
      .from(friendsTable)
      .orderBy(desc(friendsTable.createdAt), desc(friendsTable.id));

    return {
      available: true,
      friends: rows.map(
        (row): FriendLink => ({
          id: row.id,
          name: row.name,
          url: row.url,
          description: row.description,
          avatar: row.avatar,
          tags: row.tags ?? [],
        })
      ),
    };
  } catch (err) {
    console.error("[friends] 后台读取失败：", err);
    return { available: false, friends: [] };
  }
}

