// ==========================================
//  CLI 交互界面 - 重构版
// ==========================================

import { createInterface } from "readline";
import { buildNovelGraph } from "./graph/novel-graph.js";
import {
  createProject,
  listProjects,
  getActiveProject,
  openProject,
} from "./utils/project-manager.js";
import { colors, colorize } from "./utils/common.js";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import "dotenv/config";

// 修复 MaxListenersExceededWarning
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 20;
import type { NovelGraphState } from "./types.js";

// 确保 novels 根目录存在
const novelsRoot = join(process.cwd(), "novels");
if (!existsSync(novelsRoot)) mkdirSync(novelsRoot, { recursive: true });

const clr = colorize;
const intentLabels: Record<string, string> = {
  write: "✍️  写作",
  adjust: "🔧 调整",
  outline: "📋 大纲",
  inspire: "💡 灵感",
  read_novel: "📖 阅读分析",
  chat: "💬 对话",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function streamText(text: string): Promise<void> {
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

function getIntentLabel(intent: NovelGraphState["intent"]): string {
  if (!intent) return "未知";
  return intentLabels[intent] || intent;
}

function getNextThought(intent: NovelGraphState["intent"]): string {
  switch (intent) {
    case "write":
      return "正在读取大纲和上下文，准备开始写作";
    case "adjust":
      return "正在读取相关内容和编辑意见，准备修改文本";
    case "outline":
      return "正在检查当前大纲并准备执行大纲操作";
    case "inspire":
      return "正在读取大纲和前文，准备生成灵感建议";
    case "read_novel":
      return "正在抓取小说内容并准备分析风格与结构";
    case "chat":
    default:
      return "正在组织回复内容";
  }
}

function printThought(text: string): void {
  console.log(clr(`  · ${text}`, colors.dim));
}

async function runGraphWithStreaming(userInput: string): Promise<void> {
  const stream = await graph.stream(
    { userInput, messages: [] },
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

      if (nodeName === "editor_inspire") {
        printThought("灵感建议已生成，正在流式输出");
      }

      if (nodeName === "editor_read_novel") {
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

  if (!finalRendered && latestError) return;

  if (
    (currentIntent === "write" || currentIntent === "adjust") &&
    revisionCount > 0
  ) {
    console.log(clr(`\n📊 经过 ${revisionCount} 轮写作/审阅`, colors.dim));
  }
}

// Banner
console.log(
  clr(
    `
╔═══════════════════════════════════════════════════╗
║       Multi-Agent 木木小助手                       ║
║                                                   ║
║  小说保存在 novels/<小说名>/ 文件夹中                ║
║  包含：大纲 · 设定 · 素材 · 正文 · 废稿              ║
║                                                  ║
║  命令:                                            ║
║    /new        → 创建新项目                        ║
║    /open <名>  → 打开项目                          ║
║    /list       → 列出所有项目                      ║
║    /outline    → 查看大纲                          ║
║    /chapters   → 查看章节                          ║
║    /export     → 导出完整小说                      ║
║    /help       → 帮助                             ║
║    /quit       → 退出                             ║
║                                                   ║
║  或直接用自然语言与 Agent 对话                       ║
╚═══════════════════════════════════════════════════╝
`,
    colors.cyan
  )
);

// 初始化
console.log(clr("⏳ 正在初始化 Agent Graph...", colors.dim));
const graph = buildNovelGraph();
console.log(clr("✅ Agent Graph 已就绪", colors.green));

// 显示已有项目
const projects = listProjects();
if (projects.length > 0) {
  console.log(clr(`\n📂 已有项目: ${projects.join(", ")}`, colors.yellow));
  // 自动打开第一个项目
  const firstProject = projects[0];
  try {
    openProject(firstProject);
    console.log(clr(`✅ 已自动打开第一个项目「${firstProject}」`, colors.green));
  } catch (e) {
    console.log(clr(`❌ 自动打开项目失败: ${String(e)}`, colors.red));
    console.log(clr('   输入 /open <项目名> 打开，或 /new 创建新项目\n', colors.dim));
  }
} else {
  console.log(clr("\n📂 暂无项目，输入 /new 或直接描述你的小说来创建\n", colors.yellow));
}

// Readline
const rl = createInterface({ input: process.stdin, output: process.stdout });
let isReadlineClosed = false;

rl.on("close", () => {
  isReadlineClosed = true;
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

async function createProjectFlow(presetTitle?: string): Promise<void> {
  const titleInput = presetTitle ?? (await ask(clr("📘 小说标题（将作为文件夹名）：", colors.bold)));
  const title = titleInput.trim();
  if (!title) {
    console.log(clr("❌ 标题不能为空，已取消创建。", colors.red));
    return;
  }

  const genreInput = await ask(clr("🏷️  类型/题材（如：奇幻、科幻、都市）：", colors.bold));
  const genre = genreInput.trim() || "未指定";

  const synopsisInput = await ask(clr("🧾 简介（一两句话即可）：", colors.bold));
  const synopsis = synopsisInput.trim() || "未指定";

  try {
    const name = createProject({ title, genre, synopsis });
    openProject(name);
    console.log(clr(`✅ 小说项目「${name}」已创建并已自动打开。`, colors.green));
    console.log(clr(`📁 路径：novels/${name}/`, colors.dim));
  } catch (e) {
    console.log(clr(`❌ 创建失败: ${String(e)}`, colors.red));
  }
}

function prompt(): void {
  if (isReadlineClosed) return;

  const projectTag = getActiveProject()
    ? clr(`[${getActiveProject()}]`, colors.blue)
    : clr("[未选择项目]", colors.red);

  rl.question(`\n${projectTag} ${clr("🖊️  你: ", colors.bold)}`, async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      if (!isReadlineClosed) prompt();
      return;
    }

    // 内置命令
    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log(clr("\n👋 再见！\n", colors.cyan));
      rl.close();
      process.exit(0);
    }

    if (trimmed === "/help") {
      console.log(`
${clr("📖 使用指南", colors.bold)}

${clr("项目管理:", colors.yellow)}
  /new              创建新的小说项目
  /open <项目名>     打开已有项目
  /list             列出所有项目

${clr("写作:", colors.yellow)}
  "写第一章"         根据大纲撰写
  "续写下一章"       继续撰写
  "把开头改成..."    调整已有内容

${clr("大纲:", colors.yellow)}
  /outline           查看大纲
  "创建大纲"         新建或修改
  "添加新章节到..."   添加大纲节点

${clr("灵感:", colors.yellow)}
  "给我一些灵感"      编辑Agent提供创意
  "分析一下 URL"     阅读网文并分析

${clr("其他:", colors.yellow)}
  /chapters          查看章节列表
  /export            导出完整小说
  /help              帮助
  /quit              退出

${clr("📁 文件存储:", colors.dim)}
  novels/<小说名>/大纲.md       可读大纲
  novels/<小说名>/设定/         角色·世界观·风格
  novels/<小说名>/素材/         灵感·参考·风格分析
  novels/<小说名>/正文/第01卷/  章节 Markdown 文件
  novels/<小说名>/废稿/         旧版本自动归档
`);
      prompt();
      return;
    }

    if (trimmed === "/list") {
      const all = listProjects();
      const active = getActiveProject();
      if (all.length === 0) {
        console.log(clr("📂 暂无项目", colors.yellow));
      } else {
        console.log(clr("\n📂 小说项目:", colors.bold));
        all.forEach((p) =>
          console.log(`  ${p === active ? "👉" : "  "} ${p}`)
        );
      }
      prompt();
      return;
    }

    if (trimmed.startsWith("/open ")) {
      const name = trimmed.slice(6).trim();
      try {
        openProject(name);
        console.log(clr(`✅ 已打开「${name}」`, colors.green));
      } catch (e) {
        console.log(clr(`❌ ${String(e)}`, colors.red));
      }
      prompt();
      return;
    }

    if (trimmed === "/new" || trimmed.startsWith("/new ")) {
      const presetTitle = trimmed.startsWith("/new ")
        ? trimmed.slice(5).trim()
        : undefined;
      await createProjectFlow(presetTitle);
      prompt();
      return;
    }

    // 快捷命令转自然语言
    let userInput = trimmed;
    if (trimmed === "/outline") userInput = "查看大纲";
    if (trimmed === "/chapters") userInput = "列出所有章节";
    if (trimmed === "/export") userInput = "导出小说为 markdown 格式";

    // 调用 Graph
    console.log(clr("\n⏳ Agent 思考中...\n", colors.dim));

    try {
      await runGraphWithStreaming(userInput);
    } catch (error) {
      console.log(clr(`\n❌ 执行出错: ${String(error)}`, colors.red));
    }

    if (!isReadlineClosed) prompt();
  });
}

prompt();
