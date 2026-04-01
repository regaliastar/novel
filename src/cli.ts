import { createInterface } from "readline";
import { buildNovelGraph } from "./graph/novel-graph.js";
import { listProjects, openProject } from "./utils/project/index.js";
import { colors, colorize } from "./utils/common.js";
import { BANNER } from "./utils/constants.js";
import { runGraphWithStreaming } from "./utils/cli/streaming.js";
import {
  HELP_TEXT,
  handleListCommand,
  handleOpenCommand,
  handleNewCommand,
  getPromptTag,
  translateShortcutCommand,
} from "./utils/cli/commands.js";
import "dotenv/config";

import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 20;

const clr = colorize;

console.log(clr(BANNER, colors.cyan));

console.log(clr("⏳ 正在初始化 Agent Graph...", colors.dim));
const graph = buildNovelGraph();
console.log(clr("✅ Agent Graph 已就绪", colors.green));

const projects = listProjects();
if (projects.length > 0) {
  console.log(clr(`\n📂 已有项目: ${projects.join(", ")}`, colors.yellow));
  const firstProject = projects[0];
  try {
    openProject(firstProject);
    console.log(clr(`✅ 已自动打开第一个项目「${firstProject}」`, colors.green));
  } catch (e) {
    console.log(clr(`❌ 自动打开项目失败: ${String(e)}`, colors.red));
    console.log(
      clr("   输入 /open <项目名> 打开，或 /new 创建新项目\n", colors.dim)
    );
  }
} else {
  console.log(
    clr("\n📂 暂无项目，输入 /new 或直接描述你的小说来创建\n", colors.yellow)
  );
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
let isReadlineClosed = false;

rl.on("close", () => {
  isReadlineClosed = true;
});

function prompt(): void {
  if (isReadlineClosed) return;

  const projectTag = getPromptTag();

  rl.question(`\n${projectTag} ${clr("🖊️  你: ", colors.bold)}`, async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      if (!isReadlineClosed) prompt();
      return;
    }

    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log(clr("\n👋 再见！\n", colors.cyan));
      rl.close();
      process.exit(0);
    }

    if (trimmed === "/help") {
      console.log(HELP_TEXT);
      prompt();
      return;
    }

    if (trimmed === "/list") {
      handleListCommand();
      prompt();
      return;
    }

    if (trimmed.startsWith("/open ")) {
      const name = trimmed.slice(6).trim();
      handleOpenCommand(name);
      prompt();
      return;
    }

    if (trimmed === "/new" || trimmed.startsWith("/new ")) {
      const presetTitle = trimmed.startsWith("/new ")
        ? trimmed.slice(5).trim()
        : undefined;
      await handleNewCommand(rl, presetTitle);
      prompt();
      return;
    }

    const userInput = translateShortcutCommand(trimmed);

    console.log(clr("\n⏳ Agent 思考中...\n", colors.dim));

    try {
      await runGraphWithStreaming(graph, userInput);
    } catch (error) {
      console.log(clr(`\n❌ 执行出错: ${String(error)}`, colors.red));
    }

    if (!isReadlineClosed) prompt();
  });
}

prompt();
