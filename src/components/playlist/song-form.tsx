"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitSong, type SongFormState } from "@/app/(site)/playlist/actions";

const initialState: SongFormState = {};

const emptyDraft = { title: "", artist: "", url: "", note: "" };

/**
 * 推荐歌表单。
 *
 * 四个字段都受控，并拦掉 `onReset`：React 19 在 Action 结束后会自动
 * `form.reset()`，服务端校验失败时草稿不能跟着消失；成功后主动清空，
 * 避免同一首歌被手滑再推一遍。`type="url"` 只是浏览器提示，
 * http(s) 的严格校验在服务端的 `parseSongInput` 里。
 */
export function SongForm() {
  const [draft, setDraft] = useState(emptyDraft);
  const [state, formAction, pending] = useActionState(
    async (prev: SongFormState, formData: FormData) => {
      const result = await submitSong(prev, formData);
      if (result.ok) setDraft(emptyDraft);
      return result;
    },
    initialState
  );

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="歌名"
          name="title"
          maxLength={120}
          value={draft.title}
          onChange={(value) => setDraft((d) => ({ ...d, title: value }))}
        />
        <Field
          label="艺人"
          name="artist"
          maxLength={120}
          value={draft.artist}
          onChange={(value) => setDraft((d) => ({ ...d, artist: value }))}
        />
      </div>
      <div className="mt-4">
        <Field
          label="链接（https://）"
          name="url"
          type="url"
          maxLength={500}
          value={draft.url}
          onChange={(value) => setDraft((d) => ({ ...d, url: value }))}
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="note"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          推荐语（可选）
        </label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          maxLength={200}
          placeholder="为什么想推荐这首？一句就够。"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          className="mt-2 min-h-20 rounded-none border-rule bg-transparent font-mono text-[13px] focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {state.error && (
        <p className="mt-4 font-mono text-[11px] text-alert" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="mt-4 font-mono text-[11px] text-ok" role="status">
          收到，等站长听过再挂出来
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-data px-4 font-mono text-[12px] text-background hover:bg-data/90"
        >
          {pending ? "提交中…" : "推荐一首"}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          每天最多三首；提交后待审，只有你和站长看得到
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
      <label
        htmlFor={name}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        maxLength={maxLength}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-9 rounded-none border-rule bg-transparent font-mono text-[13px] focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
