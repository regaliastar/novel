// ==========================================
//  LangGraph 核心图 - 按意图分配工具
// ==========================================

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { authorNode } from "../agents/author-agent.js";
import { editorReviewNode } from "../agents/editor-agent.js";
import { createLLM, getEditorModelConfig } from "../config/llm.js";
import {
  ROUTER_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  OUTLINE_AGENT_PROMPT,
  SETTINGS_AGENT_PROMPT,
  INSPIRE_AGENT_PROMPT,
  READ_NOVEL_AGENT_PROMPT,
} from "../agents/prompts.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { loadOutline } from "../utils/project/index.js";
import { createToolCallbackHandler, getProjectContext } from "../utils/common.js";
import { getToolsByIntent, IntentType } from "../skills/index.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { NovelGraphState, AgentMessage, ChatHistoryItem } from "../types.js";

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
  chatHistory: Annotation<ChatHistoryItem[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
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
    settings: "settings",
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
//  通用意图处理 Node
// ==========================================

function createIntentAgent(intent: IntentType) {
  const { tools } = getToolsByIntent(intent);
  const llm = createLLM(getEditorModelConfig());

  let systemPrompt = "";
  switch (intent) {
    case "outline":
      systemPrompt = OUTLINE_AGENT_PROMPT;
      break;
    case "settings":
      systemPrompt = SETTINGS_AGENT_PROMPT;
      break;
    case "inspire":
      systemPrompt = INSPIRE_AGENT_PROMPT;
      break;
    case "read_novel":
      systemPrompt = READ_NOVEL_AGENT_PROMPT;
      break;
    default:
      systemPrompt = "";
  }

  return createReactAgent({
    llm,
    tools,
    messageModifier: systemPrompt + getProjectContext(),
  });
}

async function outlineNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const agent = createIntentAgent("outline");
  const callbackHandler = createToolCallbackHandler("大纲编辑");

  const prompt = `用户想操作大纲。

用户说：${state.userInput}

请根据用户需求操作大纲。操作前先查看当前大纲结构。`;

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

async function settingsNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const agent = createIntentAgent("settings");
  const callbackHandler = createToolCallbackHandler("设定编辑");

  const prompt = `用户想操作设定。

用户说：${state.userInput}

请根据用户需求操作角色设定或世界观设定。操作前先查看当前设定内容。`;

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
    return { error: `设定操作出错: ${String(error)}` };
  }
}

async function inspireNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const agent = createIntentAgent("inspire");
  const callbackHandler = createToolCallbackHandler("灵感生成");

  const prompt = `用户需要灵感。

用户说：${state.userInput}

请先查看大纲和最近章节，然后提供 2-3 个有创意的方向。
灵感生成后用 save_inspiration 保存到项目的素材文件夹。`;

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
    return { error: `灵感生成出错: ${String(error)}` };
  }
}

async function readNovelNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const agent = createIntentAgent("read_novel");
  const callbackHandler = createToolCallbackHandler("网文分析");

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
    return { error: `网文分析出错: ${String(error)}` };
  }
}

// ==========================================
//  Chat Node（支持跨轮次记忆）
// ==========================================

async function chatNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const llm = createLLM(getEditorModelConfig());

  const messages: (SystemMessage | HumanMessage)[] = [
    new SystemMessage(CHAT_SYSTEM_PROMPT),
  ];

  for (const item of state.chatHistory) {
    if (item.role === "user") {
      messages.push(new HumanMessage(item.content));
    } else {
      messages.push(new SystemMessage(item.content));
    }
  }

  messages.push(new HumanMessage(state.userInput));

  const response = await llm.invoke(messages);

  const output =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const now = new Date().toISOString();
  const newHistory: ChatHistoryItem[] = [
    { role: "user", content: state.userInput, timestamp: now },
    { role: "assistant", content: output, timestamp: now },
  ];

  return {
    finalOutput: output,
    chatHistory: newHistory,
    error: null,
  };
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
    case "outline":
      return "outline_ops";
    case "settings":
      return "settings_ops";
    case "inspire":
      return "inspire_ops";
    case "read_novel":
      return "read_novel_ops";
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
    .addNode("outline_ops", outlineNode)
    .addNode("settings_ops", settingsNode)
    .addNode("inspire_ops", inspireNode)
    .addNode("read_novel_ops", readNovelNode)
    .addNode("chat", chatNode)
    .addNode("output", outputNode)

    .addEdge(START, "router")

    .addConditionalEdges("router", routeByIntent, {
      author: "author",
      outline_ops: "outline_ops",
      settings_ops: "settings_ops",
      inspire_ops: "inspire_ops",
      read_novel_ops: "read_novel_ops",
      chat: "chat",
    })

    .addEdge("author", "editor_review")
    .addConditionalEdges("editor_review", shouldRevise, {
      author: "author",
      output: "output",
    })

    .addEdge("outline_ops", "output")
    .addEdge("settings_ops", "output")
    .addEdge("inspire_ops", "output")
    .addEdge("read_novel_ops", "output")
    .addEdge("chat", "output")

    .addEdge("output", END);

  return graph.compile();
}
