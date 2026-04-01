import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { join, basename } from "path";
import type { Chapter } from "../../types.js";
import { projectPaths } from "./paths.js";

function volumeDirName(volumeIndex: number, volumeTitle?: string): string {
  const idx = String(volumeIndex).padStart(2, "0");
  return volumeTitle ? `第${idx}卷-${volumeTitle}` : `第${idx}卷`;
}

function chapterFileName(chapterIndex: number, title: string): string {
  const idx = String(chapterIndex).padStart(3, "0");
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  return `第${idx}章-${safeTitle}.md`;
}

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

export function saveChapter(chapter: Chapter, volumeTitle?: string): string {
  const paths = projectPaths();
  const volDir = join(
    paths.chapters,
    volumeDirName(chapter.volumeIndex, volumeTitle)
  );

  if (!existsSync(volDir)) mkdirSync(volDir, { recursive: true });

  const fileName = chapterFileName(chapter.chapterIndex, chapter.title);
  const filePath = join(volDir, fileName);

  chapter.updatedAt = new Date().toISOString();
  chapter.wordCount = chapter.content.length;

  writeFileSync(filePath, chapterToMarkdown(chapter), "utf-8");
  return filePath;
}

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

export function archiveDraft(chapter: Chapter, version: number): string {
  const paths = projectPaths();
  const safeTitle = chapter.title.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `第${String(chapter.chapterIndex).padStart(3, "0")}章-${safeTitle}-v${version}.md`;
  const filePath = join(paths.trash, fileName);

  writeFileSync(filePath, chapterToMarkdown(chapter), "utf-8");
  return filePath;
}
