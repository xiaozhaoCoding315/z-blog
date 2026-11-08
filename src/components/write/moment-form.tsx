"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "./image-picker";
import { createMoment, type MomentFormState } from "@/app/(site)/(apps)/write/actions";

const KINDS = [
  { value: "text", label: "短记" },
  { value: "photo", label: "图文" },
  { value: "song", label: "在听" },
  { value: "shelf", label: "书影音" },
  { value: "quote", label: "摘录" },
  { value: "link", label: "链接" },
] as const;

const CARD_KINDS = new Set(["song", "shelf", "quote", "link"]);

const initialState: MomentFormState = {};

/**
 * 发布表单。
 *
 * 图片先走 /api/uploads 拿到站内路径，再把路径放进隐藏字段跟着 Action 提交——
 * 图片不走 Action 的请求体（Action 默认 1MB 上限，一张图就能顶爆）。
 */
export function MomentForm() {
  const [state, formAction, pending] = useActionState(createMoment, initialState);
  const [kind, setKind] = useState<string>("text");
  const [images, setImages] = useState<string[]>([]);
  // 文本字段受控：Action 返回错误时 React 会重置非受控字段，草稿不能丢
  const [draft, setDraft] = useState({
    body: "",
    cardTitle: "",
    cardMeta: "",
    cardNote: "",
    cardHref: "",
    mood: "",
    weather: "",
    place: "",
  });
  const bind = (name: keyof typeof draft) => ({
    value: draft[name],
    onChange: (v: string) => setDraft((d) => ({ ...d, [name]: v })),
  });
  const isCard = CARD_KINDS.has(kind);

  // React 19 会在 Action 结束后自动 form.reset()。文字字段是受控的所以不怕，
  // 但受控 radio 的 checked 不会被 React 同步回默认值——重试时形态会悄悄退回「短记」，
  // 卡片标题被丢掉。reset 事件可取消，直接拦掉，整张表单保持原样。
  return (
    <form
      action={formAction}
      onReset={(e) => e.preventDefault()}
      className="divide-y divide-rule border-y border-rule"
    >
      <fieldset className="py-4">
        <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          形态
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k.value}
              className={`cursor-pointer border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                kind === k.value
                  ? "border-data text-data"
                  : "border-rule text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      {isCard ? (
        <div className="space-y-4 py-4">
          <Field
            label="标题 / 曲名"
            name="cardTitle"
            maxLength={120}
            {...bind("cardTitle")}
          />
          <Field
            label="作者 / 艺人 / 出处"
            name="cardMeta"
            maxLength={120}
            {...bind("cardMeta")}
          />
          <Field
            label="一句推荐（可选）"
            name="cardNote"
            maxLength={400}
            {...bind("cardNote")}
          />
          <Field
            label="外链（可选，https://）"
            name="cardHref"
            type="url"
            maxLength={500}
            {...bind("cardHref")}
          />
        </div>
      ) : null}

      <div className="py-4">
        <label
          htmlFor="body"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {isCard ? "正文（可选）" : "正文"}
        </label>
        <Textarea
          id="body"
          name="body"
          rows={5}
          maxLength={2000}
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          className="mt-2 min-h-28 rounded-none border-rule bg-transparent font-heading text-[16px] leading-[1.7]"
          placeholder="一两句话就够。"
        />
      </div>

      {kind === "photo" && (
        <div className="py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            图片
          </p>
          <div className="mt-3">
            <ImagePicker value={images} onChange={setImages} />
            {images.map((src) => (
              <input key={src} type="hidden" name="images" value={src} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 py-4 sm:grid-cols-3">
        <Field label="心情（可选）" name="mood" maxLength={20} {...bind("mood")} />
        <Field
          label="天气（可选）"
          name="weather"
          maxLength={20}
          {...bind("weather")}
        />
        <Field label="地点（可选）" name="place" maxLength={40} {...bind("place")} />
      </div>

      {state.error && (
        <p className="py-3 font-mono text-[11px] text-alert" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 py-4">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none border border-data bg-transparent px-4 font-mono text-[12px] text-data hover:border-foreground hover:bg-transparent hover:text-foreground"
        >
          {pending ? "发布中…" : "发布"}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          发布后立刻出现在首页
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
        className="mt-2 h-9 rounded-none border-rule bg-transparent font-mono text-[13px]"
      />
    </div>
  );
}
