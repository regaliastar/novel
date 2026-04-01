import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createChapter,
  saveChapter,
  listAllChapters,
  getRecentContext,
  archiveDraft,
} from "../../utils/project/index.js";

export const createChapterTool = tool(
  async ({ volumeIndex, chapterIndex, title, outlineNodeId, volumeTitle }) => {
    const chapter = createChapter(
      volumeIndex,
      chapterIndex,
      title,
      outlineNodeId,
      volumeTitle ?? undefined
    );
    return `✅ 已创建：第${volumeIndex}卷 第${chapterIndex}章「${title}」(ID: ${chapter.id})`;
  },
  {
    name: "create_chapter",
    description: "创建一个新的空白章节",
    schema: z.object({
      volumeIndex: z.number().describe("卷号"),
      chapterIndex: z.number().describe("章节号"),
      title: z.string().describe("章节标题"),
      outlineNodeId: z.string().describe("对应的大纲节点ID"),
      volumeTitle: z.string().nullable().describe("卷标题，用于文件夹名；不需要时传 null"),
    }),
  }
);

export const writeChapterTool = tool(
  async ({ chapterId, content, status, volumeTitle }) => {
    const chapters = listAllChapters();
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return `❌ 找不到章节 ${chapterId}`;

    if (chapter.content.length > 0) {
      const version = parseInt(String(Date.now()).slice(-4));
      archiveDraft(chapter, version);
    }

    chapter.content = content;
    if (status != null) chapter.status = status;
    const filePath = saveChapter(chapter, volumeTitle ?? undefined);

    return `✅ 已写入「${chapter.title}」\n字数: ${content.length}\n保存至: ${filePath}`;
  },
  {
    name: "write_chapter",
    description: "写入或更新章节内容（旧版自动存入废稿）",
    schema: z.object({
      chapterId: z.string().describe("章节ID"),
      content: z.string().describe("章节正文"),
      status: z.enum(["draft", "reviewed", "revised", "final"]).nullable().describe("章节状态；不修改时传 null"),
      volumeTitle: z.string().nullable().describe("卷标题；不需要时传 null"),
    }),
  }
);

export const listChaptersTool = tool(
  async () => {
    const chapters = listAllChapters();
    if (chapters.length === 0) return "当前没有任何章节。";
    return chapters
      .map(
        (ch) =>
          `[${ch.status}] 第${ch.volumeIndex}卷 第${ch.chapterIndex}章「${ch.title}」- ${ch.wordCount}字 (ID: ${ch.id})`
      )
      .join("\n");
  },
  {
    name: "list_chapters",
    description: "列出所有章节",
    schema: z.object({}),
  }
);

export const getContextTool = tool(
  async ({ count }) => getRecentContext(count ?? 2),
  {
    name: "get_recent_context",
    description: "获取最近几章内容作为写作上下文",
    schema: z.object({
      count: z.number().nullable().describe("获取最近几章；不指定时传 null，默认 2"),
    }),
  }
);

export const chapterTools = [
  createChapterTool,
  writeChapterTool,
  listChaptersTool,
  getContextTool,
];
