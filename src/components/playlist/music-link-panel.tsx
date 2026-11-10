"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  importAllLinkedPlaylists,
  importLinkedPlaylist,
  pollNeteaseQrStatus,
  startNeteaseQr,
  unlinkNetease,
  type LinkedImportState,
  type QrStartState,
} from "@/app/(site)/(apps)/playlist/music-actions";
import type { NeteasePlaylistSummary } from "@/lib/music-auth";

export interface LinkedAccountSummary {
  nickname: string;
  avatarUrl: string | null;
  externalUserId: string;
}

/**
 * 二维码绑定面板：扫码 → 手机确认 → 加密保存会话 → 列出账号里的歌单。
 *
 * QQ 音乐没有公开的扫码登录入口，这里不画一个假按钮；
 * 它的导入走「粘贴分享文案」，和访客推荐共用同一条链。
 */
export function MusicLinkPanel({
  linked,
  playlists,
}: {
  linked: LinkedAccountSummary | null;
  playlists: NeteasePlaylistSummary[];
}) {
  const router = useRouter();
  const [qr, setQr] = useState<QrStartState | null>(null);
  const [status, setStatus] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const begin = async () => {
    stopPolling();
    setStarting(true);
    setStatus("");
    setSuccess("");
    const result = await startNeteaseQr();
    setStarting(false);
    setQr(result);
    if (!result.ok || !result.ticket) {
      setStatus(result.error ?? "二维码生成失败");
      return;
    }
    setStatus("用网易云音乐 App 扫码，确认后会自动完成绑定");

    pollRef.current = setInterval(async () => {
      const state = await pollNeteaseQrStatus(result.ticket!);
      if (state.status === "waiting") return;
      if (state.status === "scanned") {
        setStatus("已扫码，请在手机上确认");
        return;
      }
      stopPolling();
      if (state.status === "success") {
        setQr(null);
        setSuccess(`已绑定 ${state.nickname ?? "网易云账号"}`);
        setStatus("");
        router.refresh();
        return;
      }
      if (state.status === "expired") {
        setQr(null);
        setStatus("二维码过期了，点「重新生成」再扫一次");
        return;
      }
      setQr(null);
      setStatus(state.error ?? "扫码失败，请重试");
    }, 2200);
  };

  return (
    <section className="music-link-panel" data-reveal>
      <header className="music-link-head">
        <div>
          <p className="playlist-page-eyebrow">MUSIC ACCOUNT · 扫码绑定</p>
          <h2>{linked ? `已绑定 ${linked.nickname}` : "绑定网易云，一键搬歌单"}</h2>
          <p>
            扫码后读取你账号里的歌单，点一张就能整张导入；歌单里的曲目在站内直接播放。
            登录会话只加密存在服务器，不会发到浏览器。
          </p>
        </div>
        {linked ? (
          <div className="music-link-account">
            {linked.avatarUrl ? (
              <img src={linked.avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden="true">{linked.nickname.slice(0, 1)}</span>
            )}
            <div>
              <strong>{linked.nickname}</strong>
              <small>网易云 UID {linked.externalUserId}</small>
            </div>
            <form
              action={unlinkNetease}
              onSubmit={(event) => {
                if (!window.confirm("解除绑定后需要重新扫码，已导入的歌单不受影响。继续？")) {
                  event.preventDefault();
                }
              }}
            >
              <button type="submit">解除绑定</button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            className="music-link-start"
            onClick={begin}
            disabled={starting}
          >
            {starting ? "正在生成二维码…" : "扫码登录网易云"}
          </button>
        )}
      </header>

      <AnimatePresence>
        {qr?.ok && qr.qrDataUrl && (
          <motion.div
            className="music-link-qr"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="music-link-qr-frame">
              <img src={qr.qrDataUrl} alt="网易云扫码登录二维码" />
              <span className="music-link-qr-scan" aria-hidden="true" />
            </div>
            <div className="music-link-qr-copy">
              <p>{status}</p>
              <small>二维码约 5 分钟内有效；过期后重新生成即可。</small>
              <button type="button" onClick={begin}>
                重新生成二维码
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!qr?.ok && status && <p className="music-link-status">{status}</p>}
      {success && <p className="music-link-success">{success}</p>}

      {linked && (
        <div className="music-link-library">
          <div className="music-link-library-head">
            <div>
              <h3>账号里的歌单</h3>
              <p>
                {playlists.length > 0
                  ? `${playlists.length} 张，点「导入」整张搬进站内。`
                  : "没读到歌单。会话可能过期了，解除绑定后重新扫码。"}
              </p>
            </div>
            {playlists.length > 0 && <ImportAllButton />}
          </div>
          {playlists.length > 0 && (
            <ul className="music-link-playlist-list">
              {playlists.map((item) => (
                <LinkedPlaylistRow key={item.externalId} item={item} />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="music-link-note">
        QQ 音乐没有公开的扫码登录接口，支持直接粘贴它的分享文案导入；
        网易云分享文案同样不用手动挑链接。
      </p>
    </section>
  );
}

function LinkedPlaylistRow({ item }: { item: NeteasePlaylistSummary }) {
  const [state, setState] = useState<LinkedImportState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const data = new FormData();
      data.set("externalId", item.externalId);
      const result = await importLinkedPlaylist({}, data);
      setState(result);
    });
  };

  return (
    <li className="music-link-playlist">
      <span className="music-link-playlist-cover">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{item.title.slice(0, 1)}</span>
        )}
      </span>
      <span className="music-link-playlist-copy">
        <strong>{item.title}</strong>
        <small>
          {item.trackCount} 首{item.creator ? ` · ${item.creator}` : ""}
        </small>
        {state?.error && <em className="music-link-error">{state.error}</em>}
        {state?.ok && <em className="music-link-ok">已导入</em>}
      </span>
      <button type="button" onClick={run} disabled={pending || Boolean(state?.ok)}>
        {pending ? "导入中…" : state?.ok ? "已导入" : "导入"}
      </button>
    </li>
  );
}

function ImportAllButton() {
  const [state, setState] = useState<LinkedImportState | null>(null);
  const [pending, startTransition] = useTransition();

  if (state?.ok) {
    return (
      <span className="music-link-all-state">
        已导入 {state.imported} 张
        {state.failed ? ` · ${state.failed} 张失败` : ""}
        {state.skipped ? ` · 超过时限跳过 ${state.skipped} 张` : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="music-link-all"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await importAllLinkedPlaylists({}, new FormData());
          setState(result);
        })
      }
    >
      {pending ? "批量导入中…" : "一键导入最近 8 张"}
      {state?.error && <small>{state.error}</small>}
    </button>
  );
}