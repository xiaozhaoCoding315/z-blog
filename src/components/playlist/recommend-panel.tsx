"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { PlaylistSuggestionView } from "@/lib/songs-server";
import type { NeteasePlaylistSummary } from "@/lib/music-auth";
import { parseSongShareText } from "@/lib/song-share";
import { submitSong } from "@/app/(site)/(apps)/playlist/actions";
import {
  approvePlaylistSuggestion,
  rejectPlaylistSuggestion,
  searchSuggestionPlaylists,
  submitPlaylistSuggestion,
} from "@/app/(site)/(apps)/playlist/suggestion-actions";
import { UserAvatar } from "@/components/site/user-avatar";
import { profileHref } from "@/lib/profile-core";

const STATUS_LABEL = {
  pending: "待站长处理",
  approved: "已采纳",
  rejected: "未采纳",
} as const;

const NOTE_MAX = 200;

type Mode = "song" | "playlist";

/**
 * 推荐入口：单曲与歌单共用「粘贴分享文案」这一个动作。
 *
 * 访客不用先想清楚自己推的是歌还是歌单——粘贴后由 `parseSongShareText`
 * 认出类型与曲名/艺人，再让人确认或改两笔。只写歌单名时走站内搜索；
 * 手动填歌名、艺人、链接始终留在折叠区，作为识别失败时的退路。
 *
 * 登录、限额与审核规则只在提交按钮旁说一次，不铺满页面。
 */
export function RecommendPanel({
  loggedIn,
  ready,
  suggestions,
  suggestionsAvailable,
  isOwner,
}: {
  loggedIn: boolean;
  ready: boolean;
  suggestions: PlaylistSuggestionView[];
  suggestionsAvailable: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("song");
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState("");
  const [fields, setFields] = useState({ title: "", artist: "", url: "" });
  const [manualOpen, setManualOpen] = useState(false);
  const [candidates, setCandidates] = useState<NeteasePlaylistSummary[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const pendingCount = suggestions.filter((item) => item.status === "pending").length;

  const guess = useMemo(() => {
    if (!paste.trim()) return null;
    return parseSongShareText(paste);
  }, [paste]);

  const guessedSong =
    guess?.ok && guess.value.kind === "song" ? guess.value : null;
  const guessedPlaylist =
    guess?.ok && guess.value.kind === "playlist" ? guess.value : null;

  // 粘贴内容一变就重算字段：改过分享文案，说明想推荐的是另一首。
  // 手填字段只对当前这条文案有效，避免上一首的曲名混进下一次提交。
  // 用「渲染期校正」而不是 effect：少一次级联渲染，也不会闪一帧旧值。
  const [fieldsFor, setFieldsFor] = useState("");
  if (fieldsFor !== paste) {
    setFieldsFor(paste);
    setFields({
      title: guessedSong?.title ?? "",
      artist: guessedSong?.artist ?? "",
      url: guessedSong?.url ?? "",
    });
  }

  const resetFeedback = () => {
    setMessage("");
    setError("");
  };

  const clearSongDraft = () => {
    setPaste("");
    setNote("");
    setFields({ title: "", artist: "", url: "" });
    setManualOpen(false);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    resetFeedback();
    setCandidates([]);
    setMode(next);
  };

  const submitSongNow = () => {
    resetFeedback();
    // 粘的是歌单链接时不能当单曲提交：那会把一张歌单的地址写进 songs 表
    if (guessedPlaylist) {
      setError("这是一张歌单，切到「一张歌单」再提交");
      return;
    }
    const title = (fields.title || guessedSong?.title || "").trim();
    const artist = (fields.artist || guessedSong?.artist || "").trim();
    const url = (fields.url || guessedSong?.url || "").trim();
    if (!title || !artist) {
      setManualOpen(true);
      setError("还差歌名或艺人：在下面补一下，或换一条完整的分享文案");
      return;
    }
    if (!url) {
      setManualOpen(true);
      setError("还差一个链接：在下面补上，或重新粘贴分享文案");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.set("title", title);
      data.set("artist", artist);
      data.set("url", url);
      data.set("note", note.slice(0, NOTE_MAX));
      const result = await submitSong({}, data);
      if (result.ok) {
        clearSongDraft();
        setMessage("收到，等站长听过再挂出来");
        router.refresh();
      } else {
        setError(result.error ?? "提交失败");
      }
    });
  };

  const submitPlaylistUrl = () => {
    resetFeedback();
    if (!paste.trim()) {
      setError("先粘贴歌单分享文案");
      return;
    }
    startTransition(async () => {
      const data = new FormData();
      data.set("query", paste.trim());
      data.set("note", note);
      const result = await submitPlaylistSuggestion({}, data);
      if (result.ok) {
        setMessage(result.message ?? "已提交");
        setPaste("");
        setNote("");
        setCandidates([]);
        router.refresh();
      } else {
        setError(result.error ?? "提交失败");
      }
    });
  };

  const findPlaylist = () => {
    resetFeedback();
    setCandidates([]);
    const trimmed = paste.trim();
    if (!trimmed) {
      setError("粘贴歌单分享文案，或输入歌单名");
      return;
    }
    startTransition(async () => {
      const data = new FormData();
      data.set("query", trimmed);
      const result = await searchSuggestionPlaylists({}, data);
      if (result.ok && result.candidates) {
        setCandidates(result.candidates);
        if (result.candidates.length === 0) {
          setError("没搜到同名歌单，可以直接粘贴分享文案");
        }
      } else {
        setError(result.error ?? "搜索失败");
      }
    });
  };

  const recommendCandidate = (candidate: NeteasePlaylistSummary) => {
    resetFeedback();
    startTransition(async () => {
      const data = new FormData();
      data.set("externalId", candidate.externalId);
      data.set("platform", "netease");
      data.set("title", candidate.title);
      data.set("coverUrl", candidate.coverUrl ?? "");
      data.set("note", note);
      const result = await submitPlaylistSuggestion({}, data);
      if (result.ok) {
        setMessage(result.message ?? "已提交");
        setCandidates([]);
        setPaste("");
        setNote("");
        router.refresh();
      } else {
        setError(result.error ?? "提交失败");
      }
    });
  };

  const status = guess?.ok ? guess.value : null;

  return (
    <section className="playlist-recommend" id="recommend" data-reveal>
      <header className="playlist-recommend-head">
        <div>
          <p className="playlist-page-eyebrow">RECOMMEND · 一起听</p>
          <h2>推荐一首歌，或一张歌单</h2>
          <p>
            在网易云 / QQ 音乐点「分享」，把整段文字粘进来就行——
            单曲和歌单会自己认出来。站长听过、采纳后署上你的名字。
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="playlist-suggest-count">
            {isOwner ? `${pendingCount} 张待处理` : `${pendingCount} 张待站长处理`}
          </span>
        )}
      </header>

      {!ready ? (
        <p className="playlist-empty">
          服务器还没配置会话密钥或发信账号，暂时收不了推荐。浏览不受影响。
        </p>
      ) : !loggedIn ? (
        <div className="playlist-login-cta">
          <Link href="/login?next=/playlist">去登录</Link>
          <span>推荐需要登录；提交后待审，只有你和站长看得到</span>
        </div>
      ) : (
        <div className="playlist-recommend-body">
          {/* 两个互斥按钮而不是 tablist：只有一个面板在场，不需要方向键切换。 */}
          <div className="playlist-recommend-tabs" role="group" aria-label="推荐类型">
            <button
              type="button"
              aria-pressed={mode === "song"}
              className="playlist-recommend-tab"
              onClick={() => switchMode("song")}
            >
              一首歌
            </button>
            <button
              type="button"
              aria-pressed={mode === "playlist"}
              className="playlist-recommend-tab"
              onClick={() => switchMode("playlist")}
            >
              一张歌单
            </button>
          </div>

          <label htmlFor="recommend-paste" className="sr-only">
            分享文案
          </label>
          <textarea
            id="recommend-paste"
            className="playlist-recommend-paste"
            rows={2}
            maxLength={1000}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder={
              mode === "song"
                ? "粘贴单曲分享文案，例如：分享吴若希的单曲《越难越爱》https://music.163.com/song?id=…"
                : "粘贴歌单分享文案；只写歌单名也可以，例如：夜航西飞"
            }
          />

          {status && (
            <p className="playlist-recommend-guess" data-kind={status.kind}>
              {status.kind === "song" && (
                <>
                  认出单曲
                  {status.title ? `《${status.title}》` : ""}
                  {status.artist ? ` · ${status.artist}` : ""}
                  {mode === "playlist" && (
                    <button type="button" onClick={() => switchMode("song")}>
                      切到单曲推荐
                    </button>
                  )}
                </>
              )}
              {status.kind === "playlist" && (
                <>
                  认出歌单{status.title ? `《${status.title}》` : ""}
                  {mode === "song" && (
                    <button type="button" onClick={() => switchMode("playlist")}>
                      切到歌单推荐
                    </button>
                  )}
                </>
              )}
              {status.kind === "unknown" && (
                <>认不出这是单曲还是歌单页；可以手动填下面的字段</>
              )}
            </p>
          )}

          {mode === "song" ? (
            <div className="playlist-recommend-panel">
              <label htmlFor="recommend-note" className="sr-only">
                推荐语
              </label>
              <input
                id="recommend-note"
                className="playlist-recommend-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={NOTE_MAX}
                placeholder="一句推荐语（可选）：为什么想让大家听？"
              />

              <details
                className="playlist-recommend-manual"
                open={manualOpen}
                onToggle={(event) => {
                  const open = (event.currentTarget as HTMLDetailsElement).open;
                  setManualOpen(open);
                }}
              >
                <summary>
                  <span>手动填写 / 修改歌名、艺人与链接</span>
                  <small>识别不准时用</small>
                </summary>
                <div className="playlist-recommend-fields">
                  <label>
                    <span>歌名</span>
                    <input
                      value={fields.title}
                      maxLength={120}
                      onChange={(event) =>
                        setFields((d) => ({ ...d, title: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>艺人</span>
                    <input
                      value={fields.artist}
                      maxLength={120}
                      onChange={(event) =>
                        setFields((d) => ({ ...d, artist: event.target.value }))
                      }
                    />
                  </label>
                  <label className="playlist-recommend-field-wide">
                    <span>链接</span>
                    <input
                      type="url"
                      value={fields.url}
                      maxLength={500}
                      placeholder="https://music.163.com/song?id=…"
                      onChange={(event) =>
                        setFields((d) => ({ ...d, url: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </details>

              {message && (
                <p className="playlist-suggest-message is-ok" role="status">
                  {message}
                </p>
              )}
              {error && (
                <p className="playlist-suggest-message is-error" role="alert">
                  {error}
                </p>
              )}

              <div className="playlist-recommend-actions">
                <button
                  type="button"
                  className="playlist-recommend-submit"
                  onClick={submitSongNow}
                  disabled={busy}
                >
                  {busy ? "提交中…" : "提交单曲"}
                </button>
                <span>每天最多三首；提交后待审，只有你和站长看得到</span>
              </div>
            </div>
          ) : (
            <div className="playlist-recommend-panel">
              <label htmlFor="recommend-playlist-note" className="sr-only">
                推荐语
              </label>
              <input
                id="recommend-playlist-note"
                className="playlist-recommend-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="一句推荐语（可选）：为什么想让大家听这张？"
              />

              {message && (
                <p className="playlist-suggest-message is-ok" role="status">
                  {message}
                </p>
              )}
              {error && (
                <p className="playlist-suggest-message is-error" role="alert">
                  {error}
                </p>
              )}

              {candidates.length > 0 && (
                <ul className="playlist-suggest-results" aria-label="搜索结果">
                  {candidates.map((candidate) => (
                    <li key={candidate.externalId}>
                      <span className="playlist-suggest-cover">
                        {candidate.coverUrl ? (
                          <img
                            src={candidate.coverUrl}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span aria-hidden="true">{candidate.title.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className="playlist-suggest-result-copy">
                        <strong>{candidate.title}</strong>
                        <small>
                          {candidate.creator || "网易云歌单"} · {candidate.trackCount} 首
                        </small>
                      </span>
                      <button
                        type="button"
                        onClick={() => recommendCandidate(candidate)}
                        disabled={busy}
                      >
                        推荐这张
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="playlist-recommend-actions">
                {guessedPlaylist ? (
                  <button
                    type="button"
                    className="playlist-recommend-submit"
                    onClick={submitPlaylistUrl}
                    disabled={busy}
                  >
                    {busy ? "提交中…" : "提交这张歌单"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="playlist-recommend-submit"
                    onClick={findPlaylist}
                    disabled={busy}
                  >
                    {busy ? "搜索中…" : "按名字找歌单"}
                  </button>
                )}
                <span>采纳前只记歌单信息；待审时只有你和站长看得到</span>
              </div>
            </div>
          )}
        </div>
      )}

      {suggestionsAvailable && suggestions.length > 0 && (
        <div className="playlist-suggest-queue">
          <h3>{isOwner ? "待处理的推荐" : "我推荐过的"}</h3>
          <ul>
            {suggestions.map((item) => (
              <li key={item.id} className="playlist-suggest-item" data-status={item.status}>
                <SuggestionCover suggestion={item} />
                <div className="playlist-suggest-item-copy">
                  <strong>{item.title}</strong>
                  <small>
                    <Link href={profileHref(item.suggester.id) ?? "/playlist"}>
                      <UserAvatar
                        name={item.suggester.name}
                        avatarUrl={item.suggester.avatarUrl}
                        size="sm"
                      />
                      {item.suggester.name}
                    </Link>
                    {" · "}
                    {item.date}
                    {" · "}
                    {isOwner && item.status === "pending"
                      ? "待处理"
                      : STATUS_LABEL[item.status]}
                  </small>
                  {item.note && <p>「{item.note}」</p>}
                  {item.playlistId && (
                    <Link href={`/playlist/${item.playlistId}`} className="playlist-suggest-open">
                      去听这张 →
                    </Link>
                  )}
                </div>
                {isOwner && item.status === "pending" ? (
                  <div className="playlist-suggest-actions">
                    <form action={approvePlaylistSuggestion}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="is-approve">
                        采纳并导入
                      </button>
                    </form>
                    <form action={rejectPlaylistSuggestion}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="is-reject">
                        不采纳
                      </button>
                    </form>
                  </div>
                ) : (
                  <span className="playlist-suggest-status" data-status={item.status}>
                    {STATUS_LABEL[item.status]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SuggestionCover({ suggestion }: { suggestion: PlaylistSuggestionView }) {
  return (
    <span className="playlist-suggest-item-cover">
      {suggestion.coverUrl ? (
        <img src={suggestion.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span aria-hidden="true">{suggestion.title.slice(0, 1)}</span>
      )}
    </span>
  );
}
