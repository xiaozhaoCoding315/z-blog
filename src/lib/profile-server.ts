import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  letters as lettersTable,
  posts as postsTable,
  songs as songsTable,
  users,
} from "@/db/schema";
import { formatDay } from "@/lib/life";
import {
  formatBirthday,
  genderLabel,
  profileDisplayName,
  type Gender,
} from "@/lib/profile-core";

export interface PublicProfile {
  id: number;
  login: string;
  displayName: string;
  role: "owner" | "visitor";
  avatarUrl: string | null;
  bio: string;
  gender: Gender | null;
  birthday: string | null;
  location: string;
  website: string | null;
  githubUrl: string | null;
  joined: string;
}

/**
 * 公开资料：生日与性别只有在本人明确公开时才离开数据库。
 * 读不到库 / 用户不存在都返回 null，页面据此 404 或显示 NOT AVAILABLE。
 */
export async function getPublicProfile(
  userId: number
): Promise<{ available: boolean; profile: PublicProfile | null }> {
  const db = getDb();
  if (!db) return { available: false, profile: null };

  try {
    const [row] = await db
      .select({
        id: users.id,
        login: users.login,
        displayName: users.displayName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        gender: users.gender,
        birthday: users.birthday,
        showBirthday: users.showBirthday,
        showGender: users.showGender,
        location: users.location,
        website: users.website,
        githubUrl: users.githubUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return { available: true, profile: null };

    const gender =
      row.showGender && row.gender
        ? (["male", "female", "other", "secret"] as const).find(
            (item) => item === row.gender
          ) ?? null
        : null;

    return {
      available: true,
      profile: {
        id: row.id,
        login: row.login,
        displayName: profileDisplayName(row.displayName, row.login),
        role: row.role === "owner" ? "owner" : "visitor",
        avatarUrl: row.avatarUrl,
        bio: row.bio,
        gender,
        birthday:
          row.showBirthday && row.birthday
            ? formatBirthday(row.birthday)
            : null,
        location: row.location,
        website: row.website,
        githubUrl: row.githubUrl,
        joined: formatDay(row.createdAt.toISOString()),
      },
    };
  } catch (err) {
    console.error("[profile] 读取失败：", err);
    return { available: false, profile: null };
  }
}

export interface OwnProfile {
  displayName: string | null;
  bio: string;
  gender: Gender | null;
  birthday: string | null;
  location: string;
  website: string | null;
  githubUrl: string | null;
  avatarUrl: string | null;
  showBirthday: boolean;
  showGender: boolean;
}

/** 编辑页读原始值：隐私开关未打开时也要能看到自己填过的生日与性别。 */
export async function getOwnProfile(
  userId: number
): Promise<{ available: boolean; profile: OwnProfile | null }> {
  const db = getDb();
  if (!db) return { available: false, profile: null };

  try {
    const [row] = await db
      .select({
        displayName: users.displayName,
        bio: users.bio,
        gender: users.gender,
        birthday: users.birthday,
        location: users.location,
        website: users.website,
        githubUrl: users.githubUrl,
        avatarUrl: users.avatarUrl,
        showBirthday: users.showBirthday,
        showGender: users.showGender,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return { available: true, profile: null };
    const gender = (["male", "female", "other", "secret"] as const).find(
      (item) => item === row.gender
    ) ?? null;
    return {
      available: true,
      profile: { ...row, gender },
    };
  } catch (err) {
    console.error("[profile] 读取本人资料失败：", err);
    return { available: false, profile: null };
  }
}

export interface ProfileLetter {
  id: number;
  body: string;
  songTitle: string | null;
  songArtist: string | null;
  date: string;
}

export interface ProfileComment {
  id: number;
  body: string;
  date: string;
  targetType: string;
  targetTitle: string;
  href: string;
}

export interface ProfileSong {
  id: number;
  title: string;
  artist: string;
  note: string;
  date: string;
}

export interface ProfileActivity {
  available: boolean;
  letters: ProfileLetter[];
  comments: ProfileComment[];
  recommendations: ProfileSong[];
}

/**
 * 个人主页的公开活动：已通过的留言、可见评论、已通过的推荐。
 * 这是「社区」最实在的一面——点进一个人，能看到他确实留下过什么。
 */
export async function getProfileActivity(
  userId: number
): Promise<ProfileActivity> {
  const db = getDb();
  if (!db) return { available: false, letters: [], comments: [], recommendations: [] };

  try {
    const [letters, comments, recommendations] = await Promise.all([
      db
        .select({
          id: lettersTable.id,
          body: lettersTable.body,
          songTitle: lettersTable.songTitle,
          songArtist: lettersTable.songArtist,
          createdAt: lettersTable.createdAt,
        })
        .from(lettersTable)
        .where(
          and(
            eq(lettersTable.userId, userId),
            eq(lettersTable.status, "approved")
          )
        )
        .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id))
        .limit(20),
      db
        .select({
          id: commentsTable.id,
          body: commentsTable.body,
          targetType: commentsTable.targetType,
          targetId: commentsTable.targetId,
          title: postsTable.title,
          createdAt: commentsTable.createdAt,
        })
        .from(commentsTable)
        .leftJoin(postsTable, eq(postsTable.slug, commentsTable.targetId))
        .where(
          and(
            eq(commentsTable.userId, userId),
            eq(commentsTable.status, "visible")
          )
        )
        .orderBy(desc(commentsTable.createdAt), desc(commentsTable.id))
        .limit(30),
      db
        .select({
          id: songsTable.id,
          title: songsTable.title,
          artist: songsTable.artist,
          note: songsTable.note,
          createdAt: songsTable.createdAt,
        })
        .from(songsTable)
        .where(
          and(
            eq(songsTable.userId, userId),
            eq(songsTable.status, "approved"),
            eq(songsTable.source, "visitor")
          )
        )
        .orderBy(desc(songsTable.createdAt), desc(songsTable.id))
        .limit(20),
    ]);

    return {
      available: true,
      letters: letters.map((row) => ({
        id: row.id,
        body: row.body,
        songTitle: row.songTitle,
        songArtist: row.songArtist,
        date: formatDay(row.createdAt.toISOString()),
      })),
      comments: comments.map((row) => ({
        id: row.id,
        body: row.body,
        date: formatDay(row.createdAt.toISOString()),
        targetType: row.targetType,
        targetTitle:
          row.targetType === "note"
            ? row.title ?? `笔记 / ${row.targetId}`
            : `动态 / ${row.targetId}`,
        href: row.targetType === "note" ? `/notes/${row.targetId}` : "/life",
      })),
      recommendations: recommendations.map((row) => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        note: row.note,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch (err) {
    console.error("[profile] 活动读取失败：", err);
    return { available: false, letters: [], comments: [], recommendations: [] };
  }
}

export interface MemberView {
  id: number;
  login: string;
  displayName: string;
  role: "owner" | "visitor";
  avatarUrl: string | null;
  bio: string;
}

/**
 * 最近活跃成员：只列有邮箱的正式账号（GitHub 老用户没有资料页入口），
 * 不返回邮箱本身。留言板用它把「人」放到页面最前面。
 */
export async function getRecentMembers(limit = 8): Promise<{
  available: boolean;
  members: MemberView[];
}> {
  const db = getDb();
  if (!db) return { available: false, members: [] };

  try {
    const rows = await db
      .select({
        id: users.id,
        login: users.login,
        displayName: users.displayName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
      })
      .from(users)
      .where(sql`${users.email} IS NOT NULL`)
      .orderBy(desc(users.lastSeenAt), desc(users.id))
      .limit(limit);

    return {
      available: true,
      members: rows.map((row) => ({
        id: row.id,
        login: row.login,
        displayName: profileDisplayName(row.displayName, row.login),
        role: row.role === "owner" ? "owner" : "visitor",
        avatarUrl: row.avatarUrl,
        bio: row.bio,
      })),
    };
  } catch (err) {
    console.error("[profile] 成员读取失败：", err);
    return { available: false, members: [] };
  }
}

/** 资料页/账号菜单共用的公开标签。 */
export function publicProfileMeta(profile: PublicProfile): string[] {
  return [
    profile.role === "owner" ? "站长" : "访客",
    profile.location,
    profile.gender ? genderLabel(profile.gender) ?? "" : "",
    profile.birthday ?? "",
  ].filter(Boolean);
}