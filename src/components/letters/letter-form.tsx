"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLetter, type LetterFormState } from "@/app/(site)/(apps)/letters/actions";

const initialState: LetterFormState = {};

/** 登录前后共用一份本地草稿；键名带版本，改结构时旧草稿自然失效。 */
const DRAFT_KEY = "z-blog:letter-draft:v1";

interface Draft {
  body: string;
  songTitle: string;
  songArtist: string;
  songUrl: string;
}

const emptyDraft: Draft = { body: "", songTitle: "", songArtist: "", songUrl: "" };

function readDraft(): Draft {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      body: typeof parsed.body === "string" ? parsed.body : "",
      songTitle: typeof parsed.songTitle === "string" ? parsed.songTitle : "",
      songArtist: typeof parsed.songArtist === "string" ? parsed.songArtist : "",
      songUrl: typeof parsed.songUrl === "string" ? parsed.songUrl : "",
    };
  } catch {
    return emptyDraft;
  }
}

/**
 * 投递表单。
 *
 * 访客路径优先：正文先写，歌曲推荐收进「可选」折叠区；
 * 未登录也能先写，草稿存 sessionStorage，登录回来仍在。
 * 登录与审核规则只在提交按钮旁说一次，不铺满页面。
 *
 * 四个字段都受控，并拦掉 `onReset`：React 19 在 Action 结束后会自动
 * `form.reset()`，服务端校验失败时草稿不能跟着消失。
 */
export function LetterForm({
  loggedIn,
  initialBody = "",
}: {
  loggedIn: boolean;
  initialBody?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft, body: initialBody }));
  const hydrated = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (prev: LetterFormState, formData: FormData) => {
      const result = await submitLetter(prev, formData);
      // 成功后主动清空，避免同一段话被手滑再投一次
      if (result.ok) {
        setDraft(emptyDraft);
        try {
          window.sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
      }
      return result;
    },
    initialState
  );

  // 首次挂载时恢复草稿；服务端渲染的 initialBody 优先于空草稿。
  // sessionStorage 只在浏览器里存在，服务端首帧必须是空表单，
  // 所以只能在挂载后补一次——这不是可派生的 state，是读外部存储。
  useEffect(() => {
    hydrated.current = true;
    const saved = readDraft();
    if (!saved.body && !saved.songTitle && !saved.songArtist && !saved.songUrl) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) =>
      current.body && current.body !== initialBody
        ? current
        : { ...saved, body: saved.body || current.body }
    );
  }, [initialBody]);

  // 草稿写入节流到每次变更后立即写，sessionStorage 很小，不会卡。
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const empty =
        !draft.body && !draft.songTitle && !draft.songArtist && !draft.songUrl;
      if (empty) window.sessionStorage.removeItem(DRAFT_KEY);
      else window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const bind = (name: keyof Draft) => ({
    value: draft[name],
    onChange: (value: string) => setDraft((d) => ({ ...d, [name]: value })),
  });

  return (
    <form
      id="letter-form"
      action={formAction}
      onReset={(e) => e.preventDefault()}
      className="letter-form"
    >
      <div>
        <label htmlFor="body" className="letter-form-label">
          想说的话
        </label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          required
          minLength={2}
          maxLength={1000}
          placeholder="一两句话就够。"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          className="letter-form-input mt-2 min-h-24"
        />
        <p className="letter-form-hint">
          {draft.body.length}/1000
          {!loggedIn && " · 先写着，登录后草稿还在"}
        </p>
      </div>

      <details className="letter-form-song">
        <summary>
          <span>顺便推荐一首歌</span>
          <small>可选</small>
        </summary>
        <div className="letter-form-song-body">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="歌名" name="songTitle" maxLength={120} {...bind("songTitle")} />
            <Field
              label="艺人"
              name="songArtist"
              maxLength={120}
              {...bind("songArtist")}
            />
          </div>
          <div className="mt-4">
            <Field
              label="链接（可选）"
              name="songUrl"
              type="url"
              maxLength={500}
              {...bind("songUrl")}
            />
          </div>
          <p className="letter-form-hint">
            三项都空着就是不推荐；填了歌名就要填艺人。
          </p>
        </div>
      </details>

      {state.error && (
        <p className="letter-form-status is-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="letter-form-status is-ok" role="status">
          已放进留言板，等站长看过
        </p>
      )}

      <div className="letter-form-actions">
        {loggedIn ? (
          <Button
            type="submit"
            disabled={pending}
            className="letter-form-submit tactile"
          >
            {pending ? "投递中…" : "写进留言板"}
          </Button>
        ) : (
          <Link
            href="/login?next=%2Fletters%23letter-form"
            className="letter-form-submit letter-form-login"
          >
            登录后投递
          </Link>
        )}
        <span className="letter-form-note">
          {loggedIn ? "提交后待审，只有你和站长看得到" : "邮箱验证码登录，不用密码"}
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  maxLength,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  maxLength?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="letter-form-label">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="letter-form-input mt-2 h-9"
      />
    </div>
  );
}
