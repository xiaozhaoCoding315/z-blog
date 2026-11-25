import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * 邮箱验证码的全部纯逻辑。
 *
 * 没有 import 任何 `@/` 模块——`node --test` 解析不了路径别名，
 * 只有这种零依赖的纯函数才测得到。
 */

/** 验证码有效期：10 分钟 */
export const CODE_TTL_MS = 10 * 60_000;
/** 同一条码最多试 5 次，超过作废 */
export const MAX_ATTEMPTS = 5;
/** 同一邮箱 60 秒内只能申请一次 */
export const RESEND_COOLDOWN_MS = 60_000;
/** 同一邮箱每小时最多 5 次 */
export const HOURLY_EMAIL_LIMIT = 5;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * 只做形状判断，不做 DNS 校验：验证码本身就是最强的验证——
 * 发不出去就登不上，没必要在这里猜域名存不存在。
 */
export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 6 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** 六位数字，允许前导 0（randomInt 上界不含，所以是 0–999999） */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * 验证码只存哈希。加的是 AUTH_SECRET 这类密钥，
 * 库被拖走也换不出能用的码（六位数空间只有一百万，纯 SHA-256 挡不住彩虹表）。
 */
export function hashCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function codeMatches(
  code: string,
  hash: string,
  secret: string
): boolean {
  const actual = Buffer.from(hashCode(code, secret), "hex");
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function codeExpiry(now: number): Date {
  return new Date(now + CODE_TTL_MS);
}
