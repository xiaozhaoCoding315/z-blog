import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * AI 服务封装（双供应商，均走 OpenAI 兼容协议）：
 * - 聊天/摘要：智谱 GLM（AI_API_KEY）
 * - 向量化：阿里云百炼 text-embedding-v3（EMBEDDING_API_KEY，默认 1024 维）
 * RAG 问答需要两路同时可用；任一缺失时对应功能自动降级。
 */

// ---- 聊天：智谱 GLM ----
export const chatModelId = process.env.CHAT_MODEL ?? "glm-4.6";
const chatApiKey = process.env.AI_API_KEY ?? process.env.ZHIPU_API_KEY;
export const chatEnabled = Boolean(chatApiKey);

const chatProvider = createOpenAICompatible({
  name: "zhipu",
  baseURL: process.env.AI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
  apiKey: chatApiKey ?? "",
});
export const chatModel = chatProvider.chatModel(chatModelId);

// ---- 向量：阿里云百炼 ----
export const embeddingModelId =
  process.env.EMBEDDING_MODEL ?? "text-embedding-v3";
export const embeddingDims = Number(process.env.EMBEDDING_DIMS ?? 1024);
const embeddingApiKey =
  process.env.EMBEDDING_API_KEY ?? process.env.DASHSCOPE_API_KEY;
export const embeddingEnabled = Boolean(embeddingApiKey);

const embedProvider = createOpenAICompatible({
  name: "dashscope",
  baseURL:
    process.env.EMBEDDING_BASE_URL ??
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: embeddingApiKey ?? "",
});
// 百炼 text-embedding-v3 默认输出 1024 维，与表结构 vector(1024) 一致；
// 若更换 embedding 模型，注意同步调整 src/db 中两处 vector 维度定义
export const embeddingModel = embedProvider.textEmbeddingModel(embeddingModelId);

/** RAG 问答 = 检索(向量) + 生成(聊天)，两路都要就绪 */
export const aiEnabled = chatEnabled && embeddingEnabled;
