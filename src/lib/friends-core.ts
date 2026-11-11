import { z } from "zod";

/**
 * 友链的纯校验层与公共类型。
 *
 * 只 import zod，不引 `@/` 别名：`scripts/friends-core.test.mjs` 直接跑这个文件。
 */

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  description: string;
  avatar: string | null;
  tags: string[];
}

export interface FriendsResult {
  available: boolean;
  friends: FriendLink[];
}

export interface FriendInput {
  name: string;
  url: string;
  description: string;
  avatar: string | null;
  tags: string[];
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const httpUrl = z
  .string()
  .trim()
  .max(500, "链接太长")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "链接必须是 http(s) 地址");

const avatar = z
  .string()
  .trim()
  .max(500, "头像地址太长")
  .refine(
    (value) => /^https?:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//")),
    "头像必须是 http(s) 地址或站内路径"
  );

function optional(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseTags(fd: FormData): ParseResult<string[]> {
  const raw = String(fd.get("tags") ?? "").trim();
  if (!raw) return { ok: true, value: [] };

  const tags = [...new Set(raw.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 3) return { ok: false, error: "标签最多 3 个" };
  if (tags.some((tag) => [...tag].length > 12)) {
    return { ok: false, error: "单个标签最多 12 字" };
  }
  return { ok: true, value: tags };
}

export function parseFriendInput(fd: FormData): ParseResult<FriendInput> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "站点名要填" };
  if ([...name].length > 40) return { ok: false, error: "站点名最多 40 字" };

  const url = String(fd.get("url") ?? "").trim();
  if (!httpUrl.safeParse(url).success) {
    return { ok: false, error: "链接必须是 http(s) 地址" };
  }

  const description = String(fd.get("description") ?? "").trim();
  if ([...description].length > 160) {
    return { ok: false, error: "介绍最多 160 字" };
  }

  const rawAvatar = optional(fd, "avatar");
  if (rawAvatar && !avatar.safeParse(rawAvatar).success) {
    return { ok: false, error: "头像必须是 http(s) 地址或站内路径" };
  }

  const tags = parseTags(fd);
  if (!tags.ok) return tags;

  return {
    ok: true,
    value: {
      name,
      url,
      description,
      avatar: rawAvatar ?? null,
      tags: tags.value,
    },
  };
}