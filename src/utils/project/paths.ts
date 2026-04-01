import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export const NOVELS_ROOT = join(process.cwd(), "novels");

let activeProjectName: string | null = null;

export function getActiveProjectName(): string | null {
  return activeProjectName;
}

export function setActiveProjectName(name: string | null): void {
  activeProjectName = name;
}

export function requireActiveProject(): string {
  if (!activeProjectName) {
    throw new Error("未选择小说项目，请先创建或打开一个项目");
  }
  return activeProjectName;
}

export function projectRoot(projectName?: string): string {
  const name = projectName || requireActiveProject();
  return join(NOVELS_ROOT, name);
}

export interface ProjectPaths {
  root: string;
  config: string;
  outlineDir: string;
  outlineOverview: string;
  outlineData: string;
  settings: string;
  characters: string;
  worldbuilding: string;
  styleGuide: string;
  materials: string;
  styleRef: string;
  inspirations: string;
  references: string;
  chapters: string;
  trash: string;
}

export function projectPaths(projectName?: string): ProjectPaths {
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

export function ensureDirs(projectName?: string): void {
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
