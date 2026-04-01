// ==========================================
//  LLM 配置 - 支持多种模型供应商
// ==========================================

import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ModelConfig {
  provider: "deepseek" | "openai" | "anthropic";
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 创建 LLM 实例
 * DeepSeek / Qwen 通过 OpenAI 兼容接口调用
 */
export function createLLM(config: ModelConfig): BaseChatModel {
  switch (config.provider) {
    case "anthropic":
      return new ChatAnthropic({
        model: config.modelName,
        anthropicApiKey: config.apiKey,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 8192,
      });

    case "deepseek":
    case "openai":
    default:
      return new ChatOpenAI({
        model: config.modelName,
        apiKey: config.apiKey,
        configuration: {
          baseURL: config.baseUrl,
        },
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 8192,
      });
  }
}

/** 从环境变量加载作者模型配置 */
export function getAuthorModelConfig(): ModelConfig {
  return {
    provider: (process.env.AUTHOR_MODEL_PROVIDER as ModelConfig["provider"]) || "deepseek",
    modelName: process.env.AUTHOR_MODEL_NAME || "deepseek-chat",
    apiKey: process.env.AUTHOR_API_KEY || "",
    baseUrl: process.env.AUTHOR_BASE_URL || "https://api.deepseek.com",
    temperature: 0.8,  // 作者需要更多创造力
    maxTokens: 8192,
  };
}

/** 从环境变量加载编辑模型配置 */
export function getEditorModelConfig(): ModelConfig {
  return {
    provider: (process.env.EDITOR_MODEL_PROVIDER as ModelConfig["provider"]) || "deepseek",
    modelName: process.env.EDITOR_MODEL_NAME || "deepseek-chat",
    apiKey: process.env.EDITOR_API_KEY || "",
    baseUrl: process.env.EDITOR_BASE_URL || "https://api.deepseek.com",
    temperature: 0.5,  // 编辑需要更理性
    maxTokens: 4096,
  };
}
