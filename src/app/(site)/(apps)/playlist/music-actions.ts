"use server";

import { refresh, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { musicAccounts } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/session";
import {
  decryptMusicCookie,
  encryptMusicCookie,
  pollNeteaseQr,
  requestNeteaseQrKey,
} from "@/lib/music-auth";
import {
  getLinkedNeteaseAccount,
  getLinkedNetease,
} from "@/lib/music-server";
import { fetchPlaylistImport } from "@/lib/playlist-import";
import { saveImportedPlaylist } from "@/lib/playlist-save";

export interface QrStartState {
  ok: boolean;
  /** 加密后的扫码票：key / device / Cookie 罐 / 过期时间，服务端才能解开 */
  ticket?: string;
  qrDataUrl?: string;
  error?: string;
}

export interface QrPollState {
  status: "waiting" | "scanned" | "success" | "expired" | "error";
  nickname?: string;
  error?: string;
}

export interface LinkedImportState {
  ok?: boolean;
  error?: string;
  imported?: number;
  failed?: number;
  skipped?: number;
}

function ownerOnly(user: SessionUser | null): SessionUser | null {
  return user?.role === "owner" ? user : null;
}

/** 生成网易云扫码登录二维码；只有站长能绑定，避免访客把第三方会话塞进站点。 */
export async function startNeteaseQr(): Promise<QrStartState> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return { ok: false, error: "只有站长能绑定网易云账号" };

  const result = await requestNeteaseQrKey();
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const qrDataUrl = await QRCode.toDataURL(result.qrContent, {
      width: 240,
      margin: 1,
      color: { dark: "#12302c", light: "#f4f1e7" },
      errorCorrectionLevel: "M",
    });
    // key / device / Cookie 罐不能交给浏览器；加密后只回一张不可读的票
    const ticket = encryptMusicCookie(
      JSON.stringify({
        key: result.key,
        device: result.device,
        jar: result.jar,
        exp: Date.now() + 10 * 60_000,
      })
    );
    if (!ticket) {
      return { ok: false, error: "服务器没有配置会话密钥，无法保存扫码状态" };
    }
    return { ok: true, ticket, qrDataUrl };
  } catch {
    return { ok: false, error: "二维码生成失败，稍后再试" };
  }
}

interface QrTicket {
  key: string;
  device: string;
  jar: Record<string, string>;
  exp: number;
}

/** 解票并校验；票由服务端 AES-GCM 加密，浏览器只能原样带回，读不到也改不了 */
function readQrTicket(ticket: string): QrTicket | null {
  if (!ticket || ticket.length > 4000) return null;
  const decoded = decryptMusicCookie(ticket);
  if (!decoded) return null;
  let value: unknown;
  try {
    value = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const { key, device, jar: jarRaw, exp } = raw;
  if (typeof key !== "string" || key.length === 0 || key.length > 80) return null;
  if (typeof device !== "string" || !/^[0-9A-F]{32}$/.test(device)) return null;
  if (
    typeof exp !== "number" ||
    !Number.isSafeInteger(exp) ||
    exp < Date.now() ||
    exp > Date.now() + 15 * 60_000
  ) {
    return null;
  }
  if (!jarRaw || typeof jarRaw !== "object" || Array.isArray(jarRaw)) return null;
  const jar: Record<string, string> = {};
  for (const [name, item] of Object.entries(jarRaw)) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) return null;
    if (typeof item !== "string" || item.length > 1024) return null;
    jar[name] = item;
  }
  return { key, device, jar, exp };
}

/**
 * 轮询扫码结果。803 时把 cookie 加密入库；
 * 任何一步失败都保留「粘贴分享文案」这条退路，不把绑定失败说成歌单没了。
 */
export async function pollNeteaseQrStatus(
  ticket: string
): Promise<QrPollState> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return { status: "error", error: "登录状态失效，请重新登录" };
  const parsed = readQrTicket(ticket);
  if (!parsed) {
    return { status: "error", error: "二维码状态已失效，请重新生成" };
  }

  const result = await pollNeteaseQr(parsed.key, parsed.device, parsed.jar);
  if (result.code === 801) return { status: "waiting" };
  if (result.code === 802) return { status: "scanned" };
  if (result.code === 800) return { status: "expired" };
  if (result.code !== 803) {
    return { status: "error", error: result.message || "扫码失败，请重试" };
  }

  const profile = result.profile;
  if (!profile?.userId || !result.cookie) {
    return { status: "error", error: "登录成功但没拿到会话，请重新扫码" };
  }

  const encrypted = encryptMusicCookie(result.cookie);
  if (!encrypted) {
    return {
      status: "error",
      error: "服务器没有配置会话密钥，无法安全保存音乐账号",
    };
  }

  const db = getDb();
  if (!db) return { status: "error", error: "数据库暂时不可用" };

  try {
    await db
      .insert(musicAccounts)
      .values({
        userId: user.id,
        provider: "netease",
        externalUserId: String(profile.userId),
        nickname: profile.nickname || "网易云用户",
        avatarUrl: profile.avatarUrl,
        cookieEnc: encrypted,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: musicAccounts.userId,
        set: {
          provider: "netease",
          externalUserId: String(profile.userId),
          nickname: profile.nickname || "网易云用户",
          avatarUrl: profile.avatarUrl,
          cookieEnc: encrypted,
          updatedAt: new Date(),
        },
      });
    refresh();
    return { status: "success", nickname: profile.nickname };
  } catch (err) {
    console.error("[music-auth] 保存绑定失败：", err);
    return { status: "error", error: "保存绑定失败，稍后再试" };
  }
}

/** 解除绑定：删掉加密 cookie，歌单本身不受影响。 */
export async function unlinkNetease(): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;
  const db = getDb();
  if (!db) return;
  await db.delete(musicAccounts).where(eq(musicAccounts.userId, user.id));
  refresh();
}

/** 从已绑定账号一键导入一张歌单（私有歌单也能读，因为请求带了账号 cookie）。 */
export async function importLinkedPlaylist(
  _prev: LinkedImportState,
  formData: FormData
): Promise<LinkedImportState> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return { error: "只有站长能导入歌单" };

  const rawId = String(formData.get("externalId") ?? "");
  if (!/^\d{1,20}$/.test(rawId)) return { error: "歌单 id 无效" };

  const linked = await getLinkedNeteaseAccount(user.id);
  if (!linked) return { error: "先扫码绑定网易云账号" };

  const result = await fetchPlaylistImport(
    `https://music.163.com/playlist?id=${rawId}`,
    { neteaseCookie: linked.cookie }
  );
  if (!result.ok) return { error: result.error };

  const saved = await saveImportedPlaylist({
    userId: user.id,
    imported: result.playlist,
  });
  if (!saved.ok) return { error: saved.error };

  updateTag("songs");
  refresh();
  return { ok: true, imported: 1 };
}

/**
 * 一键导入绑定账号里最近的几张歌单。
 * 顺序请求平台接口，最多 8 张、90 秒内收工——不为一屏歌单把请求拖到失控。
 */
export async function importAllLinkedPlaylists(
  _prev: LinkedImportState,
  _formData: FormData
): Promise<LinkedImportState> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return { error: "只有站长能导入歌单" };

  const linked = await getLinkedNetease(user.id);
  if (!linked) return { error: "先扫码绑定网易云账号" };

  const queue = linked.playlists.filter((item) => item.trackCount > 0).slice(0, 8);
  if (queue.length === 0) return { error: "这个账号下没有可导入的歌单" };

  const deadline = Date.now() + 90_000;
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of queue) {
    if (Date.now() > deadline) break;
    const result = await fetchPlaylistImport(
      `https://music.163.com/playlist?id=${item.externalId}`,
      { neteaseCookie: linked.cookie }
    );
    if (!result.ok) {
      failed += 1;
      continue;
    }
    const saved = await saveImportedPlaylist({
      userId: user.id,
      imported: result.playlist,
    });
    if (saved.ok) imported += 1;
    else failed += 1;
  }

  skipped = queue.length - imported - failed;
  updateTag("songs");
  refresh();

  if (imported === 0) {
    return {
      error: failed > 0 ? "这几张歌单都没能导入，稍后再试" : "没有可导入的歌单",
    };
  }
  return { ok: true, imported, failed, skipped };
}