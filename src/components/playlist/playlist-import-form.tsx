"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  importPlaylist,
  type PlaylistImportState,
} from "@/app/(site)/(apps)/playlist/import-actions";

const initialState: PlaylistImportState = {};

/**
 * 导入表单：一个链接就能建歌单；平台接口失联时，同一张表下半截的手动曲目
 * 仍能把它建出来。两个入口共用一个提交按钮，避免用户还要判断「该用哪种导入」。
 */
export function PlaylistImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [manual, setManual] = useState("");
  const [state, formAction, pending] = useActionState(
    (prev: PlaylistImportState, formData: FormData) =>
      importPlaylist(prev, formData),
    initialState
  );

  useEffect(() => {
    if (state.ok && state.playlistId) {
      const params = new URLSearchParams();
      if (state.importedCount !== undefined) {
        params.set("imported", String(state.importedCount));
      }
      if (state.skippedCount) params.set("skipped", String(state.skippedCount));
      if (state.playableChecked) params.set("checked", "1");
      const query = params.toString();
      router.push(`/playlist/${state.playlistId}${query ? `?${query}` : ""}`);
      router.refresh();
    }
  }, [
    router,
    state.ok,
    state.playlistId,
    state.importedCount,
    state.skippedCount,
    state.playableChecked,
  ]);

  return (
    <form className="playlist-import-form" action={formAction} data-reveal>
      <div className="playlist-import-block">
        <p className="playlist-import-step">01 / 分享文案</p>
        <label htmlFor="playlist-url">网易云或 QQ 音乐分享文案 / 歌单链接</label>
        <input
          id="playlist-url"
          name="url"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="直接把 App 里「分享歌单」的整段文字粘进来…"
        />
        <p className="playlist-import-hint">
          整段文案就行，服务端会自动取出里面的链接；短链也会跟随跳转再解析。
          导入时会校验匿名可播性，VIP 与版权受限曲目会被跳过，并告诉你跳过了几首。
        </p>
      </div>

      <div className="playlist-import-block">
        <p className="playlist-import-step">02 / 覆盖信息（可选）</p>
        <div className="playlist-import-grid">
          <div>
            <label htmlFor="playlist-title">歌单标题</label>
            <input
              id="playlist-title"
              name="title"
              type="text"
              maxLength={120}
              placeholder="留空就用平台上的标题"
            />
          </div>
          <div>
            <label htmlFor="playlist-cover">封面地址</label>
            <input
              id="playlist-cover"
              name="coverUrl"
              type="text"
              maxLength={500}
              placeholder="留空就用平台封面"
            />
          </div>
        </div>
        <div>
          <label htmlFor="playlist-description">歌单介绍</label>
          <textarea
            id="playlist-description"
            name="description"
            rows={3}
            maxLength={500}
            placeholder="留空就用平台简介；手动导入时建议写一句。"
          />
        </div>
      </div>

      <div className="playlist-import-block">
        <p className="playlist-import-step">03 / 手动曲目（接口失败时的退路）</p>
        <div className="playlist-import-grid">
          <div>
            <label htmlFor="playlist-platform">手动曲目的平台</label>
            <select id="playlist-platform" name="platform" defaultValue="netease">
              <option value="netease">网易云音乐</option>
              <option value="qq">QQ 音乐</option>
              <option value="other">其他 / 只有链接</option>
            </select>
          </div>
          <div>
            <label htmlFor="playlist-manual">每行一首：歌名 - 歌手</label>
            <span className="playlist-import-hint">
              只有链接导入失败时才会用到这部分。
            </span>
          </div>
        </div>
        <textarea
          id="playlist-manual"
          name="manualTracks"
          rows={8}
          maxLength={200_000}
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder={"晴天 - 周杰伦\n海阔天空 - Beyond\n平凡之路 - 朴树"}
        />
      </div>

      {state.error && (
        <p className="playlist-import-message is-error" role="alert">
          {state.error}
        </p>
      )}

      <div className="playlist-import-actions">
        <button type="submit" disabled={pending}>
          {pending ? "导入中…（最长约 12 秒）" : "导入歌单"}
        </button>
        <Link href="/playlist">返回歌单页</Link>
        <span>导入后曲目直接公开；网易云会排除 VIP / 版权受限曲目，QQ 音乐跳转官方页面。</span>
      </div>
    </form>
  );
}