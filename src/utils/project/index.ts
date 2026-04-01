import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import type { NovelProject } from "../../types.js";
import {
  NOVELS_ROOT,
  projectPaths,
  ensureDirs,
  getActiveProjectName,
  setActiveProjectName,
} from "./paths.js";
import { createDefaultOutline, saveOutlineData, loadOutline } from "./outline-manager.js";
import { listAllChapters } from "./chapter-manager.js";

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

  ensureDirs(projectName);
  const paths = projectPaths(projectName);

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

  saveOutlineData(project.outline, projectName);

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

  setActiveProjectName(projectName);

  return projectName;
}

export function openProject(projectName: string): NovelProject {
  const paths = projectPaths(projectName);
  if (!existsSync(paths.config)) {
    throw new Error(`项目「${projectName}」不存在`);
  }

  setActiveProjectName(projectName);
  return JSON.parse(readFileSync(paths.config, "utf-8")) as NovelProject;
}

export function listProjects(): string[] {
  if (!existsSync(NOVELS_ROOT)) return [];
  return readdirSync(NOVELS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function getActiveProject(): string | null {
  return getActiveProjectName();
}

export function setActiveProject(name: string): void {
  setActiveProjectName(name);
}

export function exportNovel(format: "markdown" | "txt" = "markdown"): string {
  const paths = projectPaths();
  const chapters = listAllChapters();
  const outline = loadOutline();
  const name = getActiveProjectName() || "novel";

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

export {
  loadOutline,
  saveOutlineData,
  renderOutlineText,
  findOutlineNode,
  addOutlineChild,
  updateOutlineNode,
  removeOutlineNode,
} from "./outline-manager.js";

export {
  saveChapter,
  createChapter,
  listAllChapters,
  getRecentContext,
  archiveDraft,
} from "./chapter-manager.js";

export {
  saveInspiration,
  saveStyleAnalysis,
  saveReference,
  updateCharacterSettings,
  updateWorldSettings,
  readSettings,
} from "./material-manager.js";
