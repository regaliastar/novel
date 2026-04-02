import { colors, colorize } from "../common.js";
import type { NovelGraphState, ChatHistoryItem } from "../../types.js";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { getIntentLabel, getNextThought } from "../constants.js";

const clr = colorize;

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function streamText(text: string): Promise<void> {
  const chars = Array.from(text);
  let chunkSize = 2;
  let delay = 18;

  if (chars.length > 4000) {
    chunkSize = 20;
    delay = 1;
  } else if (chars.length > 2000) {
    chunkSize = 12;
    delay = 2;
  } else if (chars.length > 1000) {
    chunkSize = 8;
    delay = 5;
  } else if (chars.length > 400) {
    chunkSize = 4;
    delay = 10;
  }

  for (let i = 0; i < chars.length; i += chunkSize) {
    process.stdout.write(chars.slice(i, i + chunkSize).join(""));
    await sleep(delay);
  }

  process.stdout.write("\n");
}

export function printThought(text: string): void {
  console.log(clr(`  · ${text}`, colors.dim));
}

let chatHistory: ChatHistoryItem[] = [];

export function getChatHistory(): ChatHistoryItem[] {
  return chatHistory;
}

export function clearChatHistory(): void {
  chatHistory = [];
}

export async function runGraphWithStreaming(
  graph: CompiledStateGraph<NovelGraphState, Partial<NovelGraphState>, string>,
  userInput: string
): Promise<NovelGraphState["intent"]> {
  const stream = await graph.stream(
    { userInput, messages: [], chatHistory },
    { streamMode: "updates" }
  );

  let currentIntent: NovelGraphState["intent"] = null;
  let revisionCount = 0;
  let finalRendered = false;
  let thoughtStarted = false;
  let latestError: string | null = null;

  for await (const chunk of stream) {
    const updates = chunk as Record<string, Partial<NovelGraphState>>;

    for (const [nodeName, update] of Object.entries(updates)) {
      if (!update || typeof update !== "object") continue;

      if (!thoughtStarted) {
        console.log(clr("[思考过程]", colors.dim));
        thoughtStarted = true;
      }

      if (update.intent) {
        currentIntent = update.intent;
        console.log(clr(`[${getIntentLabel(currentIntent)}]`, colors.magenta));
        printThought(`已识别用户意图：${getIntentLabel(currentIntent)}`);
        printThought(getNextThought(currentIntent));
      }

      if (typeof update.revisionCount === "number") {
        revisionCount = update.revisionCount;
      }

      if (update.chatHistory && update.chatHistory.length > 0) {
        chatHistory = [...chatHistory, ...update.chatHistory];
      }

      if (nodeName === "author") {
        printThought(`作者已完成第 ${revisionCount} 版草稿，正在交给编辑审阅`);
      }

      if (nodeName === "editor_review") {
        if (update.editorFeedback?.includes("通过")) {
          printThought("编辑审阅通过，正在整理最终结果");
        } else {
          printThought("编辑给出了修改意见，正在继续下一轮润色");
        }
      }

      if (nodeName === "outline_ops") {
        printThought("大纲操作已完成，正在整理输出");
      }

      if (nodeName === "settings_ops") {
        printThought("设定操作已完成，正在整理输出");
      }

      if (nodeName === "inspire_ops") {
        printThought("灵感建议已生成，正在流式输出");
      }

      if (nodeName === "read_novel_ops") {
        printThought("小说分析已完成，正在流式输出");
      }

      if (nodeName === "chat") {
        printThought("回复已生成，正在流式输出");
      }

      if (nodeName === "output" && update.finalOutput) {
        printThought("最终结果已整理完成，开始输出");
      }

      if (update.error) {
        latestError = update.error;
        console.log(clr(`\n❌ ${update.error}`, colors.red));
      }

      if (update.finalOutput && !finalRendered) {
        console.log(clr("\n🤖 Agent:", colors.green));
        await streamText(update.finalOutput);
        finalRendered = true;
      }
    }
  }

  if (!finalRendered && latestError) return currentIntent;

  if (
    (currentIntent === "write" || currentIntent === "adjust") &&
    revisionCount > 0
  ) {
    console.log(clr(`\n📊 经过 ${revisionCount} 轮写作/审阅`, colors.dim));
  }

  return currentIntent;
}
