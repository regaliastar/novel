// ==========================================
//  小说项目管理器 - 统一管理小说项目文件夹
// ==========================================
//
//  项目文件夹结构:
//  novels/
//  └── 星辰大海/                    ← 以小说名命名的项目文件夹
//      ├── 项目配置.json             ← 小说元信息
//      ├── 大纲/                    ← 大纲文件夹（与正文同级）
//      │   ├── 大纲数据.json        ← 程序用的结构化大纲
//      │   ├── 总览.md              ← 小说总览
//      │   ├── 第一卷-起源.md       ← 按卷分文件
//      │   ├── 第二卷-深渊.md
//      │   └── ...
//      ├── 设定/
//      │   ├── 角色设定.md
//      │   ├── 世界观设定.md
//      │   ├── 力量体系.md
//      │   └── 势力关系.md
//      ├── 素材/
//      │   ├── 风格参考/
//      │   │   └── 诡秘之主-风格分析.md
//      │   ├── 灵感记录/
//      │   │   └── 2026-03-31-第三章灵感.md
//      │   └── 参考资料/
//      │       └── xxx.md
//      ├── 正文/
//      │   ├── 第一卷-起源/
//      │   │   ├── 第001章-星辰坠落.md
//      │   │   ├── 第002章-废墟之城.md
//      │   │   └── ...
//      │   └── 第二卷-深渊/
//      │       ├── 第001章-暗流涌动.md
//      │       └── ...
//      └── 废稿/
//          └── 第001章-星辰坠落-v1.md
//

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  cpSync,
} from "fs";
import { join, basename } from "path";
import type {
  OutlineNode,
  Character,
  WorldBuilding,
  StyleGuide,
  NovelProject,
  Chapter,
} from "../types.js";

// ==========================================
//  路径管理
// ==========================================

/** 小说项目根目录 */
const NOVELS_ROOT = join(process.cwd(), "novels");

/** 当前活跃项目名（运行时确定） */
let activeProjectName: string | null = null;

/** 获取项目根路径 */
function projectRoot(projectName?: string): string {
  const name = projectName || activeProjectName;
  if (!name) throw new Error("未选择小说项目，请先创建或打开一个项目");
  return join(NOVELS_ROOT, name);
}

/** 项目内各目录路径 */
function projectPaths(projectName?: string) {
  const root = projectRoot(projectName);
  return {
    root,
    config: join(root, "项目配置.json"),
    outlineDir: join(root, "大纲"),
    outlineOverview: join(root, "大纲", "总览.md"),
    outlineData: join(root, "大纲", "大纲数据.json"),
    settings: join(root, "设定"),
    characters: join(root, "设定", "角色设定.md"),
    worldbuilding: join(root, "设定", "世界观设定.md"),
    styleGuide: join(root, "设定", "风格指南.md"),
    materials: join(root, "素材"),
    styleRef: join(root, "素材", "风格参考"),
    inspirations: join(root, "素材", "灵感记录"),
    references: join(root, "素材", "参考资料"),
    chapters: join(root, "正文"),
    trash: join(root, "废稿"),
  };
}

/** 确保目录存在 */
function ensureDirs(projectName?: string): void {
  const paths = projectPaths(projectName);
  const dirs = [
    paths.root,
    paths.outlineDir,
    paths.settings,
    paths.materials,
    paths.styleRef,
    paths.inspirations,
    paths.references,
    paths.chapters,
    paths.trash,
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

// ==========================================
//  项目生命周期
// ==========================================

/** 创建新的小说项目 */
export function createProject(config: {
  title: string;
  genre: string;
  synopsis: string;
  targetWordCount?: number;
}): string {
  const projectName = config.title;

  if (existsSync(join(NOVELS_ROOT, projectName))) {
    throw new Error(`项目「${projectName}」已存在`);
  }

  // 创建目录结构
  ensureDirs(projectName);
  const paths = projectPaths(projectName);

  // 写入项目配置
  const project: NovelProject = {
    title: config.title,
    genre: config.genre,
    synopsis: config.synopsis,
    targetWordCount: config.targetWordCount || 500000,
    outline: createDefaultOutline(config.title),
    characters: [],
    worldBuilding: {
      name: "",
      era: "",
      geography: "",
      factions: [],
      rules: [],
      lore: "",
    },
    styleGuide: {
      tone: "",
      pov: "第三人称限知视角",
      pacing: "",
      vocabulary: "",
      influences: [],
      taboos: [],
      customRules: [],
    },
  };

  writeFileSync(paths.config, JSON.stringify(project, null, 2), "utf-8");

  // 写入初始大纲
  saveOutlineData(project.outline, projectName);

  // 写入设定模板
  writeFileSync(
    paths.characters,
    `# 角色设定 - ${config.title}\n\n> 在此添加角色设定\n\n## 主角\n\n- **姓名**：\n- **年龄**：\n- **性格**：\n- **背景**：\n- **目标**：\n- **外貌特征**：\n\n## 配角\n\n（待添加）\n`,
    "utf-8"
  );

  writeFileSync(
    paths.worldbuilding,
    `# 世界观设定 - ${config.title}\n\n> 在此添加世界观设定\n\n## 世界概述\n\n## 时代背景\n\n## 地理环境\n\n## 力量体系\n\n## 主要势力\n\n## 历史大事件\n`,
    "utf-8"
  );

  writeFileSync(
    paths.styleGuide,
    `# 风格指南 - ${config.title}\n\n## 基调\n${config.genre}风格\n\n## 叙事视角\n第三人称限知视角\n\n## 节奏\n\n## 语言风格\n\n## 参考作品\n\n## 禁忌\n\n## 自定义规则\n`,
    "utf-8"
  );

  // 设为当前活跃项目
  activeProjectName = projectName;

  return projectName;
}

/** 打开已有项目 */
export function openProject(projectName: string): NovelProject {
  const paths = projectPaths(projectName);
  if (!existsSync(paths.config)) {
    throw new Error(`项目「${projectName}」不存在`);
  }

  activeProjectName = projectName;
  return JSON.parse(readFileSync(paths.config, "utf-8")) as NovelProject;
}

/** 列出所有项目 */
export function listProjects(): string[] {
  if (!existsSync(NOVELS_ROOT)) return [];
  return readdirSync(NOVELS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** 获取当前项目名 */
export function getActiveProject(): string | null {
  return activeProjectName;
}

/** 设置当前活跃项目 */
export function setActiveProject(name: string): void {
  activeProjectName = name;
}

// ==========================================
//  大纲管理
// ==========================================

function createDefaultOutline(title: string): OutlineNode {
  return {
    id: `node_${Date.now()}_root`,
    title,
    summary: "在此填写小说总体概要",
    keyEvents: [],
    characters: [],
    children: [
      {
        id: `node_${Date.now()}_v1`,
        title: "第一卷",
        summary: "",
        keyEvents: [],
        characters: [],
        status: "draft",
        children: [
          {
            id: `node_${Date.now()}_c1`,
            title: "第一章",
            summary: "",
            keyEvents: [],
            characters: [],
            status: "draft",
            children: [],
          },
        ],
      },
    ],
    status: "draft",
  };
}

/** 加载大纲（结构化数据） */
export function loadOutline(projectName?: string): OutlineNode | null {
  const paths = projectPaths(projectName);
  if (!existsSync(paths.outlineData)) return null;
  return JSON.parse(readFileSync(paths.outlineData, "utf-8")) as OutlineNode;
}

/** 保存大纲（同时写入 JSON 和按卷分 Markdown 文件） */
export function saveOutlineData(
  outline: OutlineNode,
  projectName?: string
): void {
  const paths = projectPaths(projectName);

  // 确保大纲目录存在
  if (!existsSync(paths.outlineDir)) {
    mkdirSync(paths.outlineDir, { recursive: true });
  }

  // 保存结构化数据
  writeFileSync(paths.outlineData, JSON.stringify(outline, null, 2), "utf-8");

  // 保存总览文件
  const overviewMd = renderOutlineOverview(outline);
  writeFileSync(paths.outlineOverview, overviewMd, "utf-8");

  // 按卷保存大纲文件
  for (const volume of outline.children) {
    const volumeMd = renderVolumeOutline(volume);
    const safeTitle = volume.title.replace(/[\\/:*?"<>|]/g, "_");
    const volumePath = join(paths.outlineDir, `${safeTitle}.md`);
    writeFileSync(volumePath, volumeMd, "utf-8");
  }
}

/** 渲染大纲总览 */
function renderOutlineOverview(node: OutlineNode): string {
  let md = `# ${node.title} - 大纲总览\n\n`;
  
  if (node.summary) {
    md += `## 故事概要\n\n${node.summary}\n\n`;
  }
  
  if (node.keyEvents.length > 0) {
    md += `## 关键事件\n\n`;
    node.keyEvents.forEach((e) => (md += `- ${e}\n`));
    md += "\n";
  }

  md += `## 卷次列表\n\n`;
  for (const volume of node.children) {
    const statusIcon =
      volume.status === "written"
        ? "✅"
        : volume.status === "writing"
          ? "✍️"
          : volume.status === "approved"
            ? "👍"
            : "📝";
    md += `- ${statusIcon} **${volume.title}**`;
    if (volume.summary) {
      md += `：${volume.summary.slice(0, 50)}${volume.summary.length > 50 ? "..." : ""}`;
    }
    md += ` (${volume.children.length}章)\n`;
  }

  return md;
}

/** 渲染单卷大纲 */
function renderVolumeOutline(node: OutlineNode): string {
  const statusIcon =
    node.status === "written"
      ? "✅"
      : node.status === "writing"
        ? "✍️"
        : node.status === "approved"
          ? "👍"
          : "📝";

  let md = `# ${statusIcon} ${node.title}\n\n`;
  
  if (node.summary) {
    md += `## 卷概要\n\n${node.summary}\n\n`;
  }
  
  if (node.keyEvents.length > 0) {
    md += `## 关键事件\n\n`;
    node.keyEvents.forEach((e) => (md += `- ${e}\n`));
    md += "\n";
  }
  
  if (node.characters.length > 0) {
    md += `## 涉及角色\n\n${node.characters.join("、")}\n\n`;
  }

  md += `## 章节列表\n\n`;
  
  for (const chapter of node.children) {
    const chStatusIcon =
      chapter.status === "written"
        ? "✅"
        : chapter.status === "writing"
          ? "✍️"
          : chapter.status === "approved"
            ? "👍"
            : "📝";
    md += `### ${chStatusIcon} ${chapter.title}\n\n`;
    if (chapter.summary) {
      md += `${chapter.summary}\n\n`;
    }
    if (chapter.keyEvents.length > 0) {
      md += `**关键事件：**\n`;
      chapter.keyEvents.forEach((e) => (md += `- ${e}\n`));
      md += "\n";
    }
    if (chapter.characters.length > 0) {
      md += `**涉及角色：** ${chapter.characters.join("、")}\n\n`;
    }
  }

  return md;
}

/** 渲染大纲为纯文本（供 CLI 显示） */
export function renderOutlineText(node: OutlineNode, depth = 0): string {
  const indent = "  ".repeat(depth);
  const statusIcon =
    node.status === "written"
      ? "✅"
      : node.status === "writing"
        ? "✍️"
        : node.status === "approved"
          ? "👍"
          : "📝";

  let text = `${indent}${statusIcon} ${node.title} [ID: ${node.id}]`;
  if (node.summary) text += `\n${indent}   ${node.summary}`;
  if (node.keyEvents.length > 0) {
    text += `\n${indent}   关键事件: ${node.keyEvents.join(", ")}`;
  }
  text += "\n";

  for (const child of node.children) {
    text += renderOutlineText(child, depth + 1);
  }
  return text;
}

/** 查找大纲节点（支持 ID 和标题匹配） */
export function findOutlineNode(
  root: OutlineNode,
  nodeIdOrTitle: string
): OutlineNode | null {
  // 先尝试精确匹配 ID
  if (root.id === nodeIdOrTitle) return root;
  
  // 特殊处理：root 或 根节点 指向根节点
  if ((nodeIdOrTitle === "root" || nodeIdOrTitle === "根节点") && root.id) {
    return root;
  }
  
  // 尝试标题匹配
  if (root.title === nodeIdOrTitle) return root;
  
  for (const child of root.children) {
    const found = findOutlineNode(child, nodeIdOrTitle);
    if (found) return found;
  }
  return null;
}

/** 添加子节点 */
export function addOutlineChild(
  root: OutlineNode,
  parentId: string,
  newNode: Partial<OutlineNode>
): OutlineNode | null {
  const parent = findOutlineNode(root, parentId);
  if (!parent) return null;

  const node: OutlineNode = {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: newNode.title || "新章节",
    summary: newNode.summary || "",
    keyEvents: newNode.keyEvents || [],
    characters: newNode.characters || [],
    children: [],
    status: "draft",
  };

  parent.children.push(node);
  return node;
}

/** 更新大纲节点 */
export function updateOutlineNode(
  root: OutlineNode,
  nodeId: string,
  updates: Partial<OutlineNode>
): boolean {
  const node = findOutlineNode(root, nodeId);
  if (!node) return false;
  Object.assign(node, updates);
  return true;
}

/** 删除大纲节点 */
export function removeOutlineNode(
  root: OutlineNode,
  nodeIdOrTitle: string
): boolean {
  for (let i = 0; i < root.children.length; i++) {
    // 支持 ID 匹配和标题匹配
    if (root.children[i].id === nodeIdOrTitle || root.children[i].title === nodeIdOrTitle) {
      root.children.splice(i, 1);
      return true;
    }
    if (removeOutlineNode(root.children[i], nodeIdOrTitle)) return true;
  }
  return false;
}

// ==========================================
//  章节管理（存为可读的 Markdown 文件）
// ==========================================

/** 获取卷目录名 */
function volumeDirName(volumeIndex: number, volumeTitle?: string): string {
  const idx = String(volumeIndex).padStart(2, "0");
  return volumeTitle ? `第${idx}卷-${volumeTitle}` : `第${idx}卷`;
}

/** 获取章节文件名 */
function chapterFileName(chapterIndex: number, title: string): string {
  const idx = String(chapterIndex).padStart(3, "0");
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  return `第${idx}章-${safeTitle}.md`;
}

/** 章节元数据（嵌在 Markdown frontmatter 中） */
function chapterToMarkdown(chapter: Chapter): string {
  return `---
id: ${chapter.id}
volume: ${chapter.volumeIndex}
chapter: ${chapter.chapterIndex}
title: "${chapter.title}"
outline_node: ${chapter.outlineNodeId}
word_count: ${chapter.wordCount}
status: ${chapter.status}
created: ${chapter.createdAt}
updated: ${chapter.updatedAt}
---

# ${chapter.title}

${chapter.content}
`;
}

/** 从 Markdown 解析章节 */
function parseChapterMarkdown(md: string, filePath: string): Chapter {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
  const meta: Record<string, string> = {};

  if (fmMatch) {
    fmMatch[1].split("\n").forEach((line) => {
      const [key, ...rest] = line.split(": ");
      if (key && rest.length) {
        meta[key.trim()] = rest.join(": ").replace(/^"|"$/g, "");
      }
    });
  }

  const content = md.replace(/^---\n[\s\S]*?\n---\n\n# .*\n\n/, "");

  return {
    id: meta.id || `ch_${Date.now()}`,
    volumeIndex: parseInt(meta.volume) || 1,
    chapterIndex: parseInt(meta.chapter) || 1,
    title: meta.title || basename(filePath, ".md"),
    outlineNodeId: meta.outline_node || "",
    content: content.trim(),
    wordCount: parseInt(meta.word_count) || content.trim().length,
    status: (meta.status as Chapter["status"]) || "draft",
    createdAt: meta.created || new Date().toISOString(),
    updatedAt: meta.updated || new Date().toISOString(),
  };
}

/** 保存章节 */
export function saveChapter(
  chapter: Chapter,
  volumeTitle?: string
): string {
  const paths = projectPaths();
  const volDir = join(paths.chapters, volumeDirName(chapter.volumeIndex, volumeTitle));

  if (!existsSync(volDir)) mkdirSync(volDir, { recursive: true });

  const fileName = chapterFileName(chapter.chapterIndex, chapter.title);
  const filePath = join(volDir, fileName);

  chapter.updatedAt = new Date().toISOString();
  chapter.wordCount = chapter.content.length;

  writeFileSync(filePath, chapterToMarkdown(chapter), "utf-8");
  return filePath;
}

/** 创建新章节 */
export function createChapter(
  volumeIndex: number,
  chapterIndex: number,
  title: string,
  outlineNodeId: string,
  volumeTitle?: string
): Chapter {
  const chapter: Chapter = {
    id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    volumeIndex,
    chapterIndex,
    title,
    outlineNodeId,
    content: "",
    wordCount: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveChapter(chapter, volumeTitle);
  return chapter;
}

/** 列出所有章节 */
export function listAllChapters(): Chapter[] {
  const paths = projectPaths();
  const chapters: Chapter[] = [];

  if (!existsSync(paths.chapters)) return [];

  const volumes = readdirSync(paths.chapters, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const vol of volumes) {
    const volPath = join(paths.chapters, vol.name);
    const files = readdirSync(volPath)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      const md = readFileSync(join(volPath, file), "utf-8");
      chapters.push(parseChapterMarkdown(md, file));
    }
  }

  return chapters;
}

/** 获取最近章节内容作为上下文 */
export function getRecentContext(count = 2): string {
  const chapters = listAllChapters();
  const recent = chapters.slice(-count);
  if (recent.length === 0) return "（尚无已写章节）";

  return recent
    .map((ch) => {
      const preview =
        ch.content.length > 2000
          ? "..." + ch.content.slice(-2000)
          : ch.content;
      return `### ${ch.title}\n${preview}`;
    })
    .join("\n\n");
}

// ==========================================
//  素材管理
// ==========================================

/** 保存灵感记录 */
export function saveInspiration(title: string, content: string): string {
  const paths = projectPaths();
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${date}-${safeTitle}.md`;
  const filePath = join(paths.inspirations, fileName);

  writeFileSync(
    filePath,
    `# 💡 ${title}\n\n> 生成时间：${new Date().toISOString()}\n\n${content}\n`,
    "utf-8"
  );

  return filePath;
}

/** 保存风格分析 */
export function saveStyleAnalysis(
  novelTitle: string,
  dimension: string,
  content: string
): string {
  const paths = projectPaths();
  const safeTitle = novelTitle.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeTitle}-${dimension}分析.md`;
  const filePath = join(paths.styleRef, fileName);

  writeFileSync(
    filePath,
    `# 📖 ${novelTitle} - ${dimension}分析\n\n> 分析时间：${new Date().toISOString()}\n\n${content}\n`,
    "utf-8"
  );

  return filePath;
}

/** 保存参考资料 */
export function saveReference(title: string, content: string): string {
  const paths = projectPaths();
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeTitle}.md`;
  const filePath = join(paths.references, fileName);

  writeFileSync(filePath, `# ${title}\n\n${content}\n`, "utf-8");
  return filePath;
}

/** 更新角色设定文件 */
export function updateCharacterSettings(content: string): string {
  const paths = projectPaths();
  writeFileSync(paths.characters, content, "utf-8");
  return paths.characters;
}

/** 更新世界观设定文件 */
export function updateWorldSettings(content: string): string {
  const paths = projectPaths();
  writeFileSync(paths.worldbuilding, content, "utf-8");
  return paths.worldbuilding;
}

/** 读取设定文件 */
export function readSettings(): {
  characters: string;
  worldbuilding: string;
  styleGuide: string;
} {
  const paths = projectPaths();
  return {
    characters: existsSync(paths.characters)
      ? readFileSync(paths.characters, "utf-8")
      : "",
    worldbuilding: existsSync(paths.worldbuilding)
      ? readFileSync(paths.worldbuilding, "utf-8")
      : "",
    styleGuide: existsSync(paths.styleGuide)
      ? readFileSync(paths.styleGuide, "utf-8")
      : "",
  };
}

// ==========================================
//  废稿管理
// ==========================================

/** 将旧版章节移入废稿 */
export function archiveDraft(
  chapter: Chapter,
  version: number
): string {
  const paths = projectPaths();
  const safeTitle = chapter.title.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `第${String(chapter.chapterIndex).padStart(3, "0")}章-${safeTitle}-v${version}.md`;
  const filePath = join(paths.trash, fileName);

  writeFileSync(filePath, chapterToMarkdown(chapter), "utf-8");
  return filePath;
}

// ==========================================
//  导出
// ==========================================

/** 导出完整小说为单个 Markdown 文件 */
export function exportNovel(format: "markdown" | "txt" = "markdown"): string {
  const paths = projectPaths();
  const chapters = listAllChapters();
  const outline = loadOutline();
  const name = activeProjectName || "novel";

  let output = "";

  if (format === "markdown") {
    output += `# ${name}\n\n`;
    if (outline?.summary) output += `> ${outline.summary}\n\n---\n\n`;
    output += chapters
      .map((ch) => `## ${ch.title}\n\n${ch.content}`)
      .join("\n\n---\n\n");
  } else {
    output += `${name}\n${"=".repeat(name.length)}\n\n`;
    output += chapters
      .map((ch) => `${ch.title}\n\n${ch.content}`)
      .join("\n\n---\n\n");
  }

  const ext = format === "markdown" ? "md" : "txt";
  const exportPath = join(paths.root, `${name}-完整版.${ext}`);
  writeFileSync(exportPath, output, "utf-8");
  return exportPath;
}
