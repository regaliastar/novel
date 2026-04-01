import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { projectPaths } from "./paths.js";

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

export function saveReference(title: string, content: string): string {
  const paths = projectPaths();
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeTitle}.md`;
  const filePath = join(paths.references, fileName);

  writeFileSync(filePath, `# ${title}\n\n${content}\n`, "utf-8");
  return filePath;
}

export function updateCharacterSettings(content: string): string {
  const paths = projectPaths();
  writeFileSync(paths.characters, content, "utf-8");
  return paths.characters;
}

export function updateWorldSettings(content: string): string {
  const paths = projectPaths();
  writeFileSync(paths.worldbuilding, content, "utf-8");
  return paths.worldbuilding;
}

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
