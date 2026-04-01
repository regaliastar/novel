// ==========================================
//  作者 Agent - 重构：使用统一工具
// ==========================================

import { createLLM, getAuthorModelConfig } from "../config/llm.js";
import { AUTHOR_SYSTEM_PROMPT } from "./prompts.js";
import { authorTools } from "../skills/index.js";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createToolCallbackHandler, getProjectContext } from "../utils/common.js";
import type { NovelGraphState } from "../types.js";

/** 创建作者 Agent */
export function createAuthorAgent() {
  const llm = createLLM(getAuthorModelConfig());
  const systemPrompt = AUTHOR_SYSTEM_PROMPT + getProjectContext();
  
  return createReactAgent({
    llm,
    tools: authorTools,
    messageModifier: systemPrompt,
  });
}

/** 作者 Node */
export async function authorNode(
  state: NovelGraphState
): Promise<Partial<NovelGraphState>> {
  const agent = createAuthorAgent();
  const callbackHandler = createToolCallbackHandler("作者Agent");

  let prompt = "";

  if (state.intent === "write") {
    prompt = `请撰写小说章节。

用户指示：${state.userInput}

${state.inspiration ? `编辑提供的灵感：\n${state.inspiration}\n` : ""}
${state.editorFeedback && state.revisionCount > 0 ? `编辑反馈（第${state.revisionCount}轮修改）：\n${state.editorFeedback}\n\n请根据反馈修改。` : ""}

请先用 view_outline 查看大纲，用 get_recent_context 获取前文，用 read_settings 了解角色和世界观设定，然后开始写作。
写完后用 write_chapter 保存（章节会自动保存为 Markdown 文件到项目的 正文/ 目录）。`;
  } else if (state.intent === "adjust") {
    prompt = `用户想调整小说内容。

用户指示：${state.userInput}
${state.editorFeedback ? `编辑建议：\n${state.editorFeedback}` : ""}

修改后用 write_chapter 保存（旧版会自动存入废稿）。`;
  } else {
    prompt = state.userInput;
  }

  try {
    const result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    }, {
      recursionLimit: 50,
      callbacks: [callbackHandler],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const draft =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return { draft, revisionCount: state.revisionCount + 1, error: null };
  } catch (error) {
    return { error: `作者 Agent 出错: ${String(error)}` };
  }
}
