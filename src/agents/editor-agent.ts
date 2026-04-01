// ==========================================
//  编辑 Agent - 重构：使用统一工具
// ==========================================

import { createLLM, getEditorModelConfig } from "../config/llm.js";
import { EDITOR_SYSTEM_PROMPT } from "./prompts.js";
import { editorTools } from "../skills/index.js";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createToolCallbackHandler, getProjectContext } from "../utils/common.js";
import type { NovelGraphState } from "../types.js";

/** 创建编辑 Agent */
export function createEditorAgent() {
  const llm = createLLM(getEditorModelConfig());
  const systemPrompt = EDITOR_SYSTEM_PROMPT + getProjectContext();
  
  return createReactAgent({
    llm,
    tools: editorTools,
    messageModifier: systemPrompt,
  });
}

/** 编辑 - 审阅模式 */
export async function editorReviewNode(
  state: NovelGraphState
): Promise<Partial<NovelGraphState>> {
  const agent = createEditorAgent();
  const callbackHandler = createToolCallbackHandler("编辑Agent-审阅");

  const prompt = `请审阅以下草稿：\n\n---\n${state.draft}\n---\n\n这是第 ${state.revisionCount} 版。请评价并给出修改建议。质量达标请写"通过"。`;

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

/** 编辑 - 灵感模式 */
export async function editorInspireNode(
  state: NovelGraphState
): Promise<Partial<NovelGraphState>> {
  const agent = createEditorAgent();
  const callbackHandler = createToolCallbackHandler("编辑Agent-灵感");

  const prompt = `用户需要灵感。

用户说：${state.userInput}

请先查看大纲和最近章节，然后提供 2-3 个有创意的方向。
如果用户想学习网文，使用 read_web_novel 工具。
灵感生成后用 save_inspiration 保存到项目的素材文件夹。`;

  try {
    const result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    }, {
      recursionLimit: 50,
      callbacks: [callbackHandler],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    const inspiration =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    return { inspiration, finalOutput: inspiration, error: null };
  } catch (error) {
    return { error: `编辑 Agent (灵感) 出错: ${String(error)}` };
  }
}

/** 编辑 - 网文阅读模式 */
export async function editorReadNovelNode(
  state: NovelGraphState
): Promise<Partial<NovelGraphState>> {
  const agent = createEditorAgent();
  const callbackHandler = createToolCallbackHandler("编辑Agent-阅读");

  const prompt = `用户想阅读和分析网络小说。

用户说：${state.userInput}

请使用 read_web_novel 抓取内容，从风格、情节、角色等维度分析。
分析完成后用 save_style_analysis 保存到项目的素材/风格参考文件夹。`;

  try {
    const result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    }, {
      recursionLimit: 50,
      callbacks: [callbackHandler],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    const output =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    return { finalOutput: output, error: null };
  } catch (error) {
    return { error: `编辑 Agent (阅读) 出错: ${String(error)}` };
  }
}
