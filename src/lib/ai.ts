import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * AI 服务封装：默认接智谱 GLM（OpenAI 兼容协议）。
 * 换供应商只需改环境变量：AI_BASE_URL / AI_API_KEY / CHAT_MODEL / EMBEDDING_MODEL。
 */

export const chatModelId = process.env.CHAT_MODEL ?? "glm-4.6";
export const embeddingModelId = process.env.EMBEDDING_MODEL ?? "embedding-3";
export const embeddingDims = Number(process.env.EMBEDDING_DIMS ?? 1024);

export const aiEnabled = Boolean(
  process.env.AI_API_KEY ?? process.env.ZHIPU_API_KEY
);

const provider = createOpenAICompatible({
  name: "zhipu",
  baseURL:
    process.env.AI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.AI_API_KEY ?? process.env.ZHIPU_API_KEY ?? "",
});

export const chatModel = provider.chatModel(chatModelId);
export const embeddingModel = provider.textEmbeddingModel(embeddingModelId);
