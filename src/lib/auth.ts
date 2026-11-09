/**
 * GitHub OAuth（授权码流程）——只用来确认「你是你」。
 *
 * 刻意不引入 next-auth 这类库：这里只需要一次 code → token → user 的往返，
 * 一个文件就能写完，也少一层自己不完全理解的抽象。
 *
 * 需要的环境变量（到 https://github.com/settings/developers 建 OAuth App）：
 *   GITHUB_OAUTH_CLIENT_ID
 *   GITHUB_OAUTH_CLIENT_SECRET
 *   NEXT_PUBLIC_SITE_URL（回调用，必须与实际访问地址一致）
 *
 * 未配置时整个登录功能自动降级：题库仍可用，掌握度退回浏览器本地存储。
 */

export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_USER_URL = "https://api.github.com/user";

export function oauthConfig() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "";
  return {
    clientId,
    clientSecret,
    /** 两个都配了才算可用 */
    enabled: Boolean(clientId && clientSecret),
  };
}

/** 回调地址：必须与 GitHub OAuth App 里登记的完全一致 */
export function callbackUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/api/auth/github/callback`;
}

/** 登录会话 cookie 名 */
export const SESSION_COOKIE = "dsh_blog_session";

/** 会话有效期：30 天 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface GithubUser {
  id: number;
  login: string;
  avatar_url: string | null;
}

/**
 * 用 code 换 access_token。
 * GitHub 默认返回 form-encoded，必须显式要求 JSON。
 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; error?: string };
  return data.access_token ?? null;
}

/** 取当前 token 对应的用户 */
export async function fetchGithubUser(
  accessToken: string
): Promise<GithubUser | null> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "z-blog",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<GithubUser>;
  if (typeof data.id !== "number" || typeof data.login !== "string") return null;
  return {
    id: data.id,
    login: data.login,
    avatar_url: data.avatar_url ?? null,
  };
}

/**
 * 会话令牌：HMAC-SHA256 签名的 `userId.expiry`。
 *
 * 不用数据库存 session：个人站的会话量极小，无状态令牌让登出/过期处理都更简单，
 * 也避免了「session 表要不要清理」这个问题。
 */
export async function signSession(
  userId: number,
  secret: string,
  maxAgeSec = SESSION_MAX_AGE
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${userId}.${expiry}`;
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

/** 校验并解出 userId；无效/过期/签名不符一律返回 null */
export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<number | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawId, rawExpiry, sig] = parts;
  const userId = Number(rawId);
  const expiry = Number(rawExpiry);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isFinite(expiry) || expiry * 1000 < Date.now()) return null;

  const expected = await hmac(`${rawId}.${rawExpiry}`, secret);
  // 定长比较，避免时序侧信道
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0 ? userId : null;
}

/**
 * 会话签名密钥。
 * 优先用专用变量；没有就退到 SYNC_SECRET——总比硬编码一个默认值安全。
 * 两者都没有时返回 null，登录功能整体不可用（而不是用一个弱密钥签名）。
 */
export function sessionSecret(): string | null {
  // 用 || 而不是 ??：compose 会把未填的 AUTH_SECRET 定义成空字符串，
  // 空串在 ?? 下算「有值」，文档里写的 SYNC_SECRET 回退就永远不会发生
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.SYNC_SECRET?.trim() ||
    null
  );
}

/**
 * 只接受站内相对路径，防止 `next` 参数被当成开放重定向
 * （`//evil.com`、`https://evil.com` 都是常见绕过手法；
 * `/\evil.com` 也会被 URL 规范化成 `https://evil.com/`，所以反斜杠一律拒绝）。
 */
export function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  // 反斜杠和控制字符都是 URL 解析器的坑，出现任何一个都不放行
  const unsafe = [...raw].some((ch) => {
    const code = ch.charCodeAt(0);
    return ch === "\\" || code < 0x20 || code === 0x7f;
  });
  if (!raw.startsWith("/") || raw.startsWith("//") || unsafe) return "/";
  return raw;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
