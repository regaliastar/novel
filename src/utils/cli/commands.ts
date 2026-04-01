import { colors, colorize } from "../common.js";
import { listProjects, getActiveProject, openProject } from "../project/index";
import { createProjectFlow } from "./project-flow";
import type { Interface } from "readline";

const clr = colorize;

export const HELP_TEXT = `
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
  /help              显示此帮助信息
  /quit              退出程序

${clr("📁 文件存储:", colors.dim)}
  novels/<小说名>/大纲.md       可读大纲
  novels/<小说名>/设定/         角色·世界观·风格
  novels/<小说名>/素材/         灵感·参考·风格分析
  novels/<小说名>/正文/第01卷/  章节 Markdown 文件
  novels/<小说名>/废稿/         旧版本自动归档
`;

export function handleListCommand(): void {
  const all = listProjects();
  const active = getActiveProject();
  if (all.length === 0) {
    console.log(clr("📂 暂无项目", colors.yellow));
  } else {
    console.log(clr("\n📂 小说项目:", colors.bold));
    all.forEach((p) => console.log(`  ${p === active ? "👉" : "  "} ${p}`));
  }
}

export function handleOpenCommand(name: string): void {
  try {
    openProject(name);
    console.log(clr(`✅ 已打开「${name}」`, colors.green));
  } catch (e) {
    console.log(clr(`❌ ${String(e)}`, colors.red));
  }
}

export async function handleNewCommand(
  rl: Interface,
  presetTitle?: string
): Promise<void> {
  await createProjectFlow(rl, presetTitle);
}

export function getPromptTag(): string {
  const activeProject = getActiveProject();
  return activeProject
    ? clr(`[${activeProject}]`, colors.blue)
    : clr("[未选择项目]", colors.red);
}

export function translateShortcutCommand(input: string): string {
  if (input === "/outline") return "查看大纲";
  if (input === "/chapters") return "列出所有章节";
  if (input === "/export") return "导出小说为 markdown 格式";
  return input;
}
