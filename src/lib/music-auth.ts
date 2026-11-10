import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionSecret } from "@/lib/auth";
import {
  cookieHeader,
  eapiRequest,
  mergeSetCookies,
  neteaseQrContent,
  newDeviceId,
  newQrCookieJar,
  type EapiCookieJar,
} from "@/lib/netease-eapi";

/**
 * 网易云扫码绑定与会话调用。
 *
 * 扫码走官方 PC 客户端的 eapi 形态（见 netease-eapi.ts），不是网页端明文接口：
 * 明文接口扫码后会被风控以 8821 拒绝。绑定成功后拿到 MUSIC_U cookie，
 * 只存在服务端、加密后入库，永远不下发到浏览器。
 *
 * 接口随时可能被平台收紧；所有失败都返回明确原因，页面同时保留
 * 「粘贴分享文案」这条退路，不把绑定失败说成歌单不存在。
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const NET_EASE_HEADERS = {
  "User-Agent": UA,
  Referer: "https://music.163.com/",
  Accept: "application/json,text/plain,*/*",
};

export interface NeteaseProfile {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
}

export interface NeteaseQrPoll {
  code: number;
  message: string;
  cookie: string | null;
  profile: NeteaseProfile | null;
}

export interface NeteasePlaylistSummary {
  externalId: string;
  title: string;
  description: string;
  coverUrl: string | null;
  trackCount: number;
  creator: string;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 状态码可能是负数（-462 等），不能用 positiveInt */
function integer(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^http:\/\//i, "https://");
}

/* ------------------------------ 加密存储 ------------------------------ */

/**
 * 第三方 cookie 用 AUTH_SECRET / SYNC_SECRET 派生出的 AES-256-GCM 密钥加密。
 * 密钥没有配置时返回 null，调用方必须拒绝绑定（而不是明文落库）。
 */
function encryptionKey(): Buffer | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHash("sha256").update(`music-cookie:${secret}`).digest();
}

export function encryptMusicCookie(plain: string): string | null {
  const key = encryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMusicCookie(payload: string): string | null {
  const key = encryptionKey();
  if (!key) return null;
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ------------------------------ 扫码登录 ------------------------------ */

function qrRefusal(code: number, message: string): string {
  const reason = message ? `${code}：${message}` : String(code);
  if (code === 8821) {
    return `网易云风控拒绝了这次扫码登录（${reason}）。可以改用「粘贴分享文案」导入，或稍后重新生成二维码。`;
  }
  return `网易云拒绝了扫码登录（${reason}）。可以改用「粘贴分享文案」导入。`;
}

/**
 * 二维码凭证 + 本次登录专属的 deviceId / Cookie 罐。
 * 轮询必须带同一个 deviceId 与 Cookie（尤其是 unikey 响应下发的 NMTID）。
 */
export async function requestNeteaseQrKey(): Promise<
  | {
      ok: true;
      key: string;
      device: string;
      jar: EapiCookieJar;
      qrContent: string;
    }
  | { ok: false; error: string }
> {
  try {
    const device = newDeviceId();
    const now = Date.now();
    const jar = newQrCookieJar(now);
    const request = eapiRequest(
      "/api/login/qrcode/unikey",
      { type: 3 },
      device,
      now,
      jar
    );
    const res = await fetch(request.url, {
      method: "POST",
      cache: "no-store",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(10_000),
    });
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    mergeSetCookies(jar, setCookies);
    if (!res.ok) return { ok: false, error: "网易云没有响应，稍后再试" };
    const body = objectValue(await res.json());
    const code = integer(body?.code) ?? 0;
    if (code !== 200) {
      const message = text(body?.message ?? body?.msg, 80);
      return { ok: false, error: qrRefusal(code, message) };
    }
    const key = text(body?.unikey, 80);
    if (!key) return { ok: false, error: "网易云没有返回二维码凭证" };
    // chainId 把这次扫码绑到同一设备；少了它，手机确认后仍会被风控拒绝
    return {
      ok: true,
      key,
      device,
      jar,
      qrContent: neteaseQrContent(key, device, now),
    };
  } catch {
    return { ok: false, error: "连不上网易云，稍后再试" };
  }
}

/**
 * 轮询扫码状态：
 *   800 过期 / 801 等待扫码 / 802 已扫码待确认 / 803 授权成功。
 * 803 时把 Set-Cookie 里的键值拼成请求头，交给上层加密存储。
 */
export async function pollNeteaseQr(
  key: string,
  device: string,
  jar: EapiCookieJar
): Promise<NeteaseQrPoll> {
  try {
    const request = eapiRequest(
      "/api/login/qrcode/client/login",
      { key, type: 3 },
      device,
      Date.now(),
      jar
    );
    const res = await fetch(request.url, {
      method: "POST",
      cache: "no-store",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(10_000),
    });
    const body = objectValue(await res.json());
    const code = integer(body?.code) ?? 800;
    const rawMessage = text(body?.message ?? body?.msg, 80);
    const message =
      code >= 800 && code <= 803
        ? rawMessage || "等待扫码"
        : qrRefusal(code, rawMessage);

    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    mergeSetCookies(jar, setCookies);
    // 只有 MUSIC_U 才是真正的登录会话；NMTID 等匿名 Cookie 不算
    const cookie = code === 803 && jar.MUSIC_U ? cookieHeader(jar) : null;
    if (code === 803 && !jar.MUSIC_U) {
      // 只记录 Cookie 名，不落任何会话值；万一平台再收紧，日志能直接看出缺了什么
      console.warn(
        "[music-auth] 803 未返回 MUSIC_U，Set-Cookie：",
        setCookies.map((entry) => entry.split("=")[0])
      );
    }

    const profile: NeteaseProfile | null =
      code === 803
        ? {
            userId: positiveInt(body?.userId) ?? 0,
            nickname: text(body?.nickname, 80),
            avatarUrl: httpsUrl(body?.avatarUrl),
          }
        : null;

    if (code === 803 && profile && (!profile.userId || !profile.nickname)) {
      console.info("[music-auth] 803 响应字段：", Object.keys(body ?? {}));
      const account = cookie ? await fetchNeteaseProfile(jar, device) : null;
      if (account) {
        profile.userId = account.userId;
        profile.nickname = account.nickname;
        profile.avatarUrl = account.avatarUrl;
      }
    }

    return {
      code,
      message,
      cookie,
      profile,
    };
  } catch {
    return { code: -1, message: "轮询失败，稍后再试", cookie: null, profile: null };
  }
}

/** account 对象用 id/userName，profile 对象用 userId/nickname；两种都接住 */
function profileFromBody(body: Record<string, unknown> | null): NeteaseProfile | null {
  const data = objectValue(body?.data);
  const profile =
    objectValue(body?.profile) ??
    objectValue(data?.profile) ??
    objectValue(body?.account) ??
    objectValue(data?.account);
  if (!profile) return null;
  const userId = positiveInt(profile.userId) ?? positiveInt(profile.id);
  const nickname = text(profile.nickname ?? profile.userName, 80);
  if (!userId || !nickname) return null;
  return {
    userId,
    nickname,
    avatarUrl: httpsUrl(profile.avatarUrl ?? profile.avatarImgUrl),
  };
}

/**
 * 扫码成功后取账号资料。
 *
 * 网页的 GET /api/user/account 现在直接返回 404「接口未找到」，
 * 改用 PC 客户端的 eapi /api/nuser/account/get；失败再用
 * 仍可用的 /api/w/nuser/account/get 兜底，两条路都不行就返回 null。
 */
export async function fetchNeteaseProfile(
  jar: EapiCookieJar,
  device: string
): Promise<NeteaseProfile | null> {
  try {
    const request = eapiRequest(
      "/api/nuser/account/get",
      {},
      device,
      Date.now(),
      jar
    );
    const res = await fetch(request.url, {
      method: "POST",
      cache: "no-store",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const profile = profileFromBody(objectValue(await res.json()));
      if (profile) return profile;
    }
  } catch {
    // 继续走网页端兜底
  }

  try {
    const res = await fetch("https://music.163.com/api/w/nuser/account/get", {
      cache: "no-store",
      headers: { ...NET_EASE_HEADERS, Cookie: cookieHeader(jar) },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return profileFromBody(objectValue(await res.json()));
  } catch {
    return null;
  }
}

/** 已登录账号的歌单列表；私有歌单也能读到，因为请求带了账号 cookie。 */
export async function fetchNeteaseUserPlaylists(
  cookie: string,
  userId: number
): Promise<NeteasePlaylistSummary[]> {
  try {
    const res = await fetch(
      `https://music.163.com/api/user/playlist/?offset=0&limit=200&uid=${userId}`,
      { cache: "no-store", headers: { ...NET_EASE_HEADERS, Cookie: cookie }, signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) return [];
    const body = objectValue(await res.json());
    const list = Array.isArray(body?.playlist) ? body.playlist : [];
    return list
      .map((raw) => {
        const item = objectValue(raw);
        if (!item) return null;
        const externalId = positiveInt(item.id);
        const title = text(item.name, 120);
        if (!externalId || !title) return null;
        const creator = objectValue(item.creator);
        return {
          externalId: String(externalId),
          title,
          description: text(item.description, 500),
          coverUrl: httpsUrl(item.coverImgUrl ?? item.picUrl),
          trackCount: positiveInt(item.trackCount) ?? 0,
          creator: text(creator?.nickname, 80),
        } satisfies NeteasePlaylistSummary;
      })
      .filter((item): item is NeteasePlaylistSummary => item !== null);
  } catch {
    return [];
  }
}

/** 站内按歌单名搜索：给「不贴链接」的推荐入口用。 */
export async function searchNeteasePlaylists(
  query: string
): Promise<NeteasePlaylistSummary[]> {
  const keyword = query.trim().slice(0, 80);
  if (!keyword) return [];
  try {
    const res = await fetch(
      `https://music.163.com/api/search/get/web?s=${encodeURIComponent(
        keyword
      )}&type=1000&offset=0&limit=8&total=true`,
      { cache: "no-store", headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) return [];
    const body = objectValue(await res.json());
    const result = objectValue(body?.result);
    const list = Array.isArray(result?.playlists) ? result.playlists : [];
    return list
      .map((raw) => {
        const item = objectValue(raw);
        if (!item) return null;
        const externalId = positiveInt(item.id);
        const title = text(item.name, 120);
        if (!externalId || !title) return null;
        const creator = objectValue(item.creator);
        return {
          externalId: String(externalId),
          title,
          description: text(item.description, 500),
          coverUrl: httpsUrl(item.coverImgUrl ?? item.picUrl),
          trackCount: positiveInt(item.trackCount) ?? 0,
          creator: text(creator?.nickname, 80),
        } satisfies NeteasePlaylistSummary;
      })
      .filter((item): item is NeteasePlaylistSummary => item !== null);
  } catch {
    return [];
  }
}