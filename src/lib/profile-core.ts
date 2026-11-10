/**
 * 个人资料的纯校验层。
 *
 * 只依赖 zod，不 import 任何 `@/` 模块——`node --test` 直接跑这个文件。
 * 访客和站长共用同一套字段；邮箱永远不从这里出入。
 */
import { z } from "zod";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const GENDERS = ["male", "female", "other", "secret"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABEL: Record<Gender, string> = {
  male: "男",
  female: "女",
  other: "其他",
  secret: "不便透露",
};

export interface ProfileInput {
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

const httpUrl = z
  .string()
  .trim()
  .max(300, "链接太长了")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "链接必须是 http(s) 地址");

// 头像只认本站上传：外链既不经过尺寸/格式检查，也会把访客的 IP 送给第三方。
const avatarUrl = z
  .string()
  .trim()
  .max(500, "头像地址太长")
  .refine(
    (value) =>
      /^\/media\/(?!.*\.\.)[A-Za-z0-9/_-]+\.(webp|jpe?g|png)$/.test(value),
    "头像必须先用「上传本地图片」传到本站"
  );

const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "生日格式应为 YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    if (date.toISOString().slice(0, 10) !== value) return false;
    if (date.getTime() > Date.now()) return false;
    return value >= "1900-01-01";
  }, "生日不是一个有效日期");

function optional(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkbox(fd: FormData, key: string): boolean {
  return fd.get(key) === "on";
}

export function parseProfileInput(fd: FormData): ParseResult<ProfileInput> {
  const displayName = optional(fd, "displayName");
  if ([...displayName].length > 24) {
    return { ok: false, error: "昵称最多 24 个字" };
  }

  const bio = optional(fd, "bio");
  if ([...bio].length > 160) {
    return { ok: false, error: "个性签名最多 160 个字" };
  }

  const location = optional(fd, "location");
  if ([...location].length > 40) {
    return { ok: false, error: "所在地最多 40 个字" };
  }

  const rawGender = optional(fd, "gender");
  const gender =
    rawGender === ""
      ? null
      : (GENDERS as readonly string[]).includes(rawGender)
        ? (rawGender as Gender)
        : undefined;
  if (gender === undefined) {
    return { ok: false, error: "性别选项不合法" };
  }

  const rawBirthday = optional(fd, "birthday");
  if (rawBirthday && !birthdaySchema.safeParse(rawBirthday).success) {
    return { ok: false, error: "生日不是一个有效日期" };
  }

  const rawWebsite = optional(fd, "website");
  if (rawWebsite && !httpUrl.safeParse(rawWebsite).success) {
    return { ok: false, error: "个人网站必须是 http(s) 地址" };
  }

  const rawGithub = optional(fd, "githubUrl");
  if (rawGithub && !httpUrl.safeParse(rawGithub).success) {
    return { ok: false, error: "GitHub 链接必须是 http(s) 地址" };
  }

  const rawAvatar = optional(fd, "avatarUrl");
  if (rawAvatar && !avatarUrl.safeParse(rawAvatar).success) {
    return { ok: false, error: "头像必须先用「上传本地图片」传到本站" };
  }

  return {
    ok: true,
    value: {
      displayName: displayName || null,
      bio,
      gender,
      birthday: rawBirthday || null,
      location,
      website: rawWebsite || null,
      githubUrl: rawGithub || null,
      avatarUrl: rawAvatar || null,
      // 生日默认不公开：不勾选就不进公开主页
      showBirthday: checkbox(fd, "showBirthday"),
      showGender: checkbox(fd, "showGender"),
    },
  };
}

/** 没填昵称就用登录名，任何地方显示名字都走这里。 */
export function profileDisplayName(
  displayName: string | null | undefined,
  login: string
): string {
  const trimmed = displayName?.trim();
  return trimmed || login;
}

/** 头像缺省时的字形：取名字第一个字符，emoji 也不会被切半。 */
export function profileInitial(name: string): string {
  const first = [...name.trim()][0];
  return (first ?? "?").toUpperCase();
}

/** 1998-03-12 → 1998.03.12；公开页不显示具体年龄，只给日期。 */
export function formatBirthday(birthday: string): string {
  return birthday.replaceAll("-", ".");
}

export function genderLabel(gender: Gender | null | undefined): string | null {
  return gender ? GENDER_LABEL[gender] : null;
}

/** 站内资料页地址；旧用户或匿名没有 id 时返回 null。 */
export function profileHref(userId: number | null | undefined): string | null {
  return typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0
    ? `/u/${userId}`
    : null;
}