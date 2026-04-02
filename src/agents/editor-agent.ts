// ==========================================
//  编辑 Agent - 审阅模式（只读权限）
// ==========================================

import { createLLM, getEditorModelConfig } from "../config/llm.js";
import { EDITOR_SYSTEM_PROMPT } from "./prompts.js";
import { editorReviewTools } from "../skills/index.js";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createToolCallbackHandler, getProjectContext } from "../utils/common.js";
import type { NovelGraphState } from "../types.js";

/** 创建编辑 Agent（审阅模式，只读） */
export function createEditorAgent() {
  const llm = createLLM(getEditorModelConfig());
  const systemPrompt = EDITOR_SYSTEM_PROMPT + getProjectContext();
  
  return createReactAgent({
    llm,
    tools: editorReviewTools,
    messageModifier: systemPrompt,
  });
}

/** 编辑 - 审阅模式 */
export async function editorReviewNode(
  state: NovelGraphState
): Promise<Partial<NovelGraphState>> {
  const agent = createEditorAgent();
  const callbackHandler = createToolCallbackHandler("编辑Agent-审阅");

  const prompt = `请审阅以下草稿：\n\n---\n${state.draft}\n---\n\n这是第 ${state.revisionCount} 版。请评价并给出修改建议。质量达标请写"通过"。

注意：审阅时请检查内容是否与设定文件一致。`;

  try {
    const result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    }, {
      recursionLimit: 50,
      callbacks: [callbackHandler],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    const feedback =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    return { editorFeedback: feedback, error: null };
  } catch (error) {
    return { error: `编辑 Agent 出错: ${String(error)}` };
  }
}
