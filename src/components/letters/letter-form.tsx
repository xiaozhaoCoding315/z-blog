"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLetter, type LetterFormState } from "@/app/(site)/(apps)/letters/actions";

const initialState: LetterFormState = {};

/**
 * 投递表单。
 *
 * 四个字段都受控，并拦掉 `onReset`：React 19 在 Action 结束后会自动
 * `form.reset()`，服务端校验失败时草稿不能跟着消失。
 * 三个歌曲字段可以全空（等于不推荐歌）；只填一部分交给 Action 校验并返回错误，
 * 客户端不做联动禁用——用户填到一半时把输入框锁掉只会更烦。
 */
export function LetterForm() {
  const [draft, setDraft] = useState({
    body: "",
    songTitle: "",
    songArtist: "",
    songUrl: "",
  });
  const [state, formAction, pending] = useActionState(
    async (prev: LetterFormState, formData: FormData) => {
      const result = await submitLetter(prev, formData);
      // 成功后主动清空，避免同一段话被手滑再投一次
      if (result.ok) {
        setDraft({ body: "", songTitle: "", songArtist: "", songUrl: "" });
      }
      return result;
    },
    initialState
  );
  const bind = (name: keyof typeof draft) => ({
    value: draft[name],
    onChange: (value: string) =>
      setDraft((d) => ({ ...d, [name]: value })),
  });

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()}>
      <div>
        <label
          htmlFor="body"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          留言
        </label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          required
          maxLength={1000}
          placeholder="一两句话就够。"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          className="mt-2 min-h-24 rounded-none border-rule bg-transparent font-mono text-[13px] focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <fieldset className="mt-6">
        <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          顺手推荐一首歌（可选）
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
            label="链接（可选，https://）"
            name="songUrl"
            type="url"
            maxLength={500}
            {...bind("songUrl")}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          三项都空着就是不推荐；只填一部分保存不了。
        </p>
      </fieldset>

      {state.error && (
        <p className="mt-4 font-mono text-[11px] text-alert" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="mt-4 font-mono text-[11px] text-ok" role="status">
          已放进信箱，等站长看过
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none border border-data bg-transparent px-4 font-mono text-[12px] text-data hover:border-foreground hover:bg-transparent hover:text-foreground"
        >
          {pending ? "投递中…" : "投进信箱"}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          提交后待审，只有你和站长看得到
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-9 rounded-none border-rule bg-transparent font-mono text-[13px] focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
