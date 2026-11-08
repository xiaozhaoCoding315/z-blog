"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  submitComment,
  type CommentFormState,
} from "@/app/(site)/life/[id]/actions";

const initialState: CommentFormState = {};

/**
 * 评论表单：动态与笔记共用。
 *
 * 正文受控并拦掉 `onReset`：React 19 在 Action 结束后会自动 `form.reset()`，
 * 服务端校验失败时草稿不能跟着消失。发送成功后主动清空，
 * 避免同一段话被手滑再发一遍。
 */
export function CommentForm({
  targetType,
  targetId,
}: {
  targetType: "moment" | "note";
  targetId: string;
}) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: CommentFormState, formData: FormData) => {
      const result = await submitComment(prev, formData);
      // 成功后清空草稿，避免同一段话被手滑再发一遍
      if (result.ok) setBody("");
      return result;
    },
    initialState
  );

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <label
        htmlFor="comment-body"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        评论
      </label>
      <Textarea
        id="comment-body"
        name="body"
        rows={3}
        required
        maxLength={500}
        placeholder="写两句，别太用力。"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-2 min-h-20 rounded-none border-rule bg-transparent font-mono text-[13px] focus-visible:ring-1 focus-visible:ring-ring"
      />

      {state.error && (
        <p className="mt-3 font-mono text-[11px] text-alert" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="mt-3 font-mono text-[11px] text-ok" role="status">
          评论已发出
        </p>
      )}

      <div className="mt-4">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-data px-4 font-mono text-[12px] text-background hover:bg-data/90"
        >
          {pending ? "发送中…" : "写评论"}
        </Button>
      </div>
    </form>
  );
}
