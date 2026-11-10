"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlaylistSuggestionView } from "@/lib/songs-server";
import type { NeteasePlaylistSummary } from "@/lib/music-auth";
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

/**
 * 推荐歌单面板：不再要求访客先复制一条 http 链接。
 *
 * 粘贴分享文案会直接从整段话里取链接；只写歌单名则在站内搜索，
 * 搜到后点选一张再提交。采纳前只存元数据，不抓曲目。
 */
export function PlaylistSuggestPanel({
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
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [candidates, setCandidates] = useState<NeteasePlaylistSummary[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const pendingCount = suggestions.filter((item) => item.status === "pending").length;

  const resetFeedback = () => {
    setMessage("");
    setError("");
  };

  const find = () => {
    resetFeedback();
    setCandidates([]);
    const trimmed = query.trim();
    if (!trimmed) {
      setError("粘贴歌单分享文案，或输入歌单名");
      return;
    }
    startTransition(async () => {
      const data = new FormData();
      data.set("query", trimmed);
      if (/https?:\/\//i.test(trimmed)) {
        data.set("note", note);
        const result = await submitPlaylistSuggestion({}, data);
        if (result.ok) {
          setMessage(result.message ?? "已提交");
          setQuery("");
          setNote("");
          router.refresh();
        } else {
          setError(result.error ?? "提交失败");
        }
        return;
      }

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

  const recommend = (candidate: NeteasePlaylistSummary) => {
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
        setQuery("");
        setNote("");
        router.refresh();
      } else {
        setError(result.error ?? "提交失败");
      }
    });
  };

  return (
    <section className="playlist-suggest-panel" id="recommend" data-reveal>
      <header className="playlist-suggest-head">
        <div>
          <p className="playlist-page-eyebrow">RECOMMEND · 大家的歌单</p>
          <h2>推荐一张歌单</h2>
          <p>
            不用找链接：直接粘贴网易云 / QQ 音乐分享出来的整段文字，或者只写歌单名。
            站长采纳后会出现在「大家推荐」里，并署上你的名字。
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
          <span>推荐需要登录；采纳后公开署名，待审时只有你和站长看得到</span>
        </div>
      ) : (
        <div className="playlist-suggest-form">
          <label htmlFor="playlist-suggest-query" className="sr-only">
            歌单分享文案或歌单名
          </label>
          <div className="playlist-suggest-input">
            <input
              id="playlist-suggest-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={1000}
              placeholder="粘贴分享文案，或输入歌单名，例如：夜航西飞"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  find();
                }
              }}
            />
            <button type="button" onClick={find} disabled={busy}>
              {busy ? "处理中…" : "找这张歌单"}
            </button>
          </div>
          <input
            className="playlist-suggest-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            placeholder="一句推荐语（可选）：为什么想让大家听这张？"
            aria-label="推荐语"
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
                  <button type="button" onClick={() => recommend(candidate)} disabled={busy}>
                    推荐这张
                  </button>
                </li>
              ))}
            </ul>
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