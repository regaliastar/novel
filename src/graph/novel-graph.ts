// ==========================================
//  LangGraph 核心图 - 重构：使用统一工具
// ==========================================

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { authorNode } from "../agents/author-agent.js";
import {
  editorReviewNode,
  editorInspireNode,
  editorReadNovelNode,
  createEditorAgent,
} from "../agents/editor-agent.js";
import { createLLM, getEditorModelConfig } from "../config/llm.js";
import { ROUTER_SYSTEM_PROMPT } from "../agents/prompts.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { loadOutline } from "../utils/project/index.js";
import { createToolCallbackHandler } from "../utils/common.js";
import type { NovelGraphState, AgentMessage } from "../types.js";

// ==========================================
//  State 定义
// ==========================================

const GraphState = Annotation.Root({
  messages: Annotation<AgentMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  intent: Annotation<NovelGraphState["intent"]>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  userInput: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  currentChapterId: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  outline: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  draft: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  editorFeedback: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  inspiration: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  revisionCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  maxRevisions: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 3,
  }),
  finalOutput: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

type GraphStateType = typeof GraphState.State;

// ==========================================
//  Router Node
// ==========================================

async function routerNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const llm = createLLM(getEditorModelConfig());

  const response = await llm.invoke([
    new SystemMessage(ROUTER_SYSTEM_PROMPT),
    new HumanMessage(state.userInput),
  ]);

  const content =
    typeof response.content === "string"
      ? response.content.trim().toLowerCase()
      : "";

  let intent: NovelGraphState["intent"] = "chat";
  const intentMap: Record<string, NovelGraphState["intent"]> = {
    write: "write",
    adjust: "adjust",
    outline: "outline",
    inspire: "inspire",
    read_novel: "read_novel",
    chat: "chat",
  };

  for (const [key, value] of Object.entries(intentMap)) {
    if (content.includes(key)) {
      intent = value;
      break;
    }
  }

  let outline: any = null;
  try {
    outline = loadOutline();
  } catch {
    outline = null;
  }

  return {
    intent,
    outline,
    revisionCount: 0,
    draft: null,
    editorFeedback: null,
    inspiration: null,
    finalOutput: null,
    error: null,
  };
}

// ==========================================
//  大纲 Node
// ==========================================

async function outlineNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const agent = createEditorAgent();
  const callbackHandler = createToolCallbackHandler("编辑Agent-大纲");

  const prompt = `用户想操作大纲。

用户说：${state.userInput}

请按以下步骤操作：
1. 使用 view_outline 工具获取当前大纲结构
2. 使用 update_outline_node 工具更新根节点的 summary（如果需要）
3. 使用 add_outline_node 工具添加新的卷/章节点（如果需要）
4. 最后再次使用 view_outline 工具展示完整大纲

重要：必须使用上述工具进行操作，否则大纲不会被保存到文件。`;

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
    return { error: `大纲操作出错: ${String(error)}` };
  }
}

// ==========================================
//  聊天 Node
// ==========================================

async function chatNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const llm = createLLM(getEditorModelConfig());

  const response = await llm.invoke([
    new SystemMessage(
      "你是一个友好的小说创作助手。你可以回答写作技巧、角色塑造、情节构思等方面的问题。"
    ),
    new HumanMessage(state.userInput),
  ]);

  const output =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return { finalOutput: output, error: null };
}

// ==========================================
//  输出 Node
// ==========================================

async function outputNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  if (state.error) {
    return { finalOutput: `❌ ${state.error}` };
  }

  if (state.intent === "write" || state.intent === "adjust") {
    if (!state.finalOutput) {
      const output = [
        "📖 章节已完成！",
        "",
        state.editorFeedback ? `📝 编辑评价：\n${state.editorFeedback}` : "",
        "",
        `共经过 ${state.revisionCount} 轮写作/审阅`,
      ]
        .filter(Boolean)
        .join("\n");
      return { finalOutput: output };
    }
  }

  return {};
}

// ==========================================
//  条件路由
// ==========================================

function routeByIntent(state: GraphStateType): string {
  switch (state.intent) {
    case "write":
    case "adjust":
      return "author";
    case "inspire":
      return "editor_inspire";
    case "outline":
      return "outline_ops";
    case "read_novel":
      return "editor_read_novel";
    case "chat":
    default:
      return "chat";
  }
}

function shouldRevise(state: GraphStateType): string {
  if (state.revisionCount >= state.maxRevisions) return "output";
  if (state.editorFeedback?.includes("通过")) return "output";
  if (state.error) return "output";
  return "author";
}

// ==========================================
//  构建 Graph
// ==========================================

export function buildNovelGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("router", routerNode)
    .addNode("author", authorNode as any)
    .addNode("editor_review", editorReviewNode as any)
    .addNode("editor_inspire", editorInspireNode as any)
    .addNode("editor_read_novel", editorReadNovelNode as any)
    .addNode("outline_ops", outlineNode)
    .addNode("chat", chatNode)
    .addNode("output", outputNode)

    .addEdge(START, "router")

    .addConditionalEdges("router", routeByIntent, {
      author: "author",
      editor_inspire: "editor_inspire",
      outline_ops: "outline_ops",
      editor_read_novel: "editor_read_novel",
      chat: "chat",
    })

    .addEdge("author", "editor_review")
    .addConditionalEdges("editor_review", shouldRevise, {
      author: "author",
      output: "output",
    })

    .addEdge("editor_inspire", "output")
    .addEdge("editor_read_novel", "output")
    .addEdge("outline_ops", "output")
    .addEdge("chat", "output")

    .addEdge("output", END);

  return graph.compile();
}
