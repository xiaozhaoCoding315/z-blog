import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
import { chatEnabled, chatModel } from "@/lib/ai";
import { getInterviewQuestion } from "@/lib/interview-core";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 120;

/**
 * POST /api/interview —— AI 面试官追问：
 * 以该题的参考答案为知识基座，GLM 扮演资深面试官，
 * 针对用户的回答进行连环追问与点评。
 */
export async function POST(request: Request) {
  if (!chatEnabled) {
    return NextResponse.json(
      { error: "AI 功能未启用：请在 .env 中配置 AI_API_KEY" },
      { status: 503 }
    );
  }

  if (!rateLimit(`itv:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "提问太频繁" }, { status: 429 });
  }

  const body = (await request.json()) as {
    slug?: string;
    messages?: UIMessage[];
  };
  const question = body.slug ? getInterviewQuestion(body.slug) : null;
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const systemPrompt = `你是一位资深的技术面试官，正在就下面这道面试题对候选人进行深挖追问。

面试题：${question.question}
分类：${question.category}
参考答案（你的知识基座，追问不要超出其延伸范围太远）：
${question.answer.slice(0, 2000)}

规则：
- 每轮只问一个追问，追问要像真实面试官：由浅入深、抓对方回答里的模糊点或错误继续挖
- 候选人答得好，先简短肯定（一两句，指出答对的关键），再换角度追问
- 候选人答错或含糊，先温和点出问题所在并给出正确要点，再问相关的更基础或更深入的问题
- 候选人明确说不清楚时，给出参考答案的对应要点讲解，然后转向相关联的新角度
- 语言用中文，简洁口语化，单次回复不超过 120 字
- 当对话自然收尾（对方说了谢谢/结束等）时，给出一段总体点评（优点/不足/建议）`;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const modelMessages = await convertToModelMessages(body.messages ?? []);
      const result = streamText({
        model: chatModel,
        system: systemPrompt,
        messages: modelMessages,
      });
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
