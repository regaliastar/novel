// ==========================================
//  Skills: 重构后的项目级工具
//  统一使用 project-manager 作为存储后端
// ==========================================

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createProject,
  openProject,
  listProjects,
  getActiveProject,
  setActiveProject,
  loadOutline,
  saveOutlineData,
  renderOutlineText,
  findOutlineNode,
  addOutlineChild,
  updateOutlineNode,
  removeOutlineNode,
  createChapter,
  saveChapter,
  listAllChapters,
  getRecentContext,
  saveInspiration,
  saveStyleAnalysis,
  saveReference,
  readSettings,
  updateCharacterSettings,
  updateWorldSettings,
  archiveDraft,
  exportNovel,
} from "../utils/project-manager.js";

// ==========================================
//  项目管理工具
// ==========================================

export const createProjectTool = tool(
  async ({ title, genre, synopsis }) => {
    try {
      const name = createProject({ title, genre, synopsis });
      return `✅ 小说项目「${name}」已创建！\n\n项目文件夹: novels/${name}/\n\n已自动生成：\n- 大纲模板\n- 角色设定模板\n- 世界观设定模板\n- 风格指南模板\n\n你可以开始编写大纲和设定了。`;
    } catch (e) {
      return `❌ 创建失败: ${String(e)}`;
    }
  },
  {
    name: "create_project",
    description: "创建一个新的小说项目，自动生成完整的项目文件夹结构",
    schema: z.object({
      title: z.string().describe("小说标题（同时作为文件夹名）"),
      genre: z.string().describe("小说类型（玄幻/科幻/都市/历史等）"),
      synopsis: z.string().describe("小说简介"),
    }),
  }
);

export const openProjectTool = tool(
  async ({ title }) => {
    try {
      const project = openProject(title);
      return `✅ 已打开项目「${project.title}」\n类型: ${project.genre}\n简介: ${project.synopsis}`;
    } catch (e) {
      return `❌ 打开失败: ${String(e)}`;
    }
  },
  {
    name: "open_project",
    description: "打开一个已有的小说项目",
    schema: z.object({
      title: z.string().describe("项目名称"),
    }),
  }
);

export const listProjectsTool = tool(
  async () => {
    const projects = listProjects();
    const active = getActiveProject();
    if (projects.length === 0) return "当前没有任何小说项目。请使用 create_project 创建。";
    return projects
      .map((p) => `${p === active ? "👉 " : "   "}${p}`)
      .join("\n");
  },
  {
    name: "list_projects",
    description: "列出所有小说项目",
    schema: z.object({}),
  }
);

// ==========================================
//  大纲工具
// ==========================================

export const viewOutlineTool = tool(
  async () => {
    const outline = loadOutline();
    if (!outline) return "当前项目没有大纲。请先创建项目。";
    return renderOutlineText(outline);
  },
  {
    name: "view_outline",
    description: "查看当前小说项目的完整大纲，显示每个节点的ID和标题。修改大纲时需要使用这些ID或标题。",
    schema: z.object({}),
  }
);

export const addOutlineNodeTool = tool(
  async ({ parentId, title, summary, keyEvents }) => {
    const outline = loadOutline();
    if (!outline) return "❌ 大纲不存在";

    const node = addOutlineChild(outline, parentId, {
      title,
      summary: summary ?? undefined,
      keyEvents: keyEvents ?? undefined,
    });
    if (!node) return `❌ 找不到父节点「${parentId}」。请先用 view_outline 查看大纲获取正确的节点ID或标题。`;

    saveOutlineData(outline);
    return `✅ 已添加「${title}」(ID: ${node.id})\n\n${renderOutlineText(outline)}`;
  },
  {
    name: "add_outline_node",
    description: "在大纲中添加新的卷/章节点。父节点可以是节点ID、节点标题，或使用 'root' 表示根节点。",
    schema: z.object({
      parentId: z.string().describe("父节点ID、标题，或 'root' 表示根节点"),
      title: z.string().describe("节点标题"),
      summary: z.string().nullable().describe("概要；不需要时传 null"),
      keyEvents: z.array(z.string()).nullable().describe("关键事件；不需要时传 null"),
    }),
  }
);

export const updateOutlineNodeTool = tool(
  async ({ nodeId, title, summary, keyEvents, status }) => {
    const outline = loadOutline();
    if (!outline) return "❌ 大纲不存在";

    const updates: any = {};
    if (title != null) updates.title = title;
    if (summary != null) updates.summary = summary;
    if (keyEvents != null) updates.keyEvents = keyEvents;
    if (status != null) updates.status = status;

    if (!updateOutlineNode(outline, nodeId, updates))
      return `❌ 找不到节点「${nodeId}」。请先用 view_outline 查看大纲获取正确的节点ID或标题。`;

    saveOutlineData(outline);
    return `✅ 已更新\n\n${renderOutlineText(outline)}`;
  },
  {
    name: "update_outline_node",
    description: "修改大纲中某个节点。节点标识可以是节点ID、节点标题，或使用 'root' 表示根节点。",
    schema: z.object({
      nodeId: z.string().describe("节点ID、标题，或 'root' 表示根节点"),
      title: z.string().nullable().describe("新标题；不修改时传 null"),
      summary: z.string().nullable().describe("新概要；不修改时传 null"),
      keyEvents: z.array(z.string()).nullable().describe("新的关键事件列表；不修改时传 null"),
      status: z.enum(["draft", "approved", "writing", "written"]).nullable().describe("新状态；不修改时传 null"),
    }),
  }
);

export const deleteOutlineNodeTool = tool(
  async ({ nodeId }) => {
    const outline = loadOutline();
    if (!outline) return "❌ 大纲不存在";
    if (!removeOutlineNode(outline, nodeId))
      return `❌ 找不到节点「${nodeId}」。请先用 view_outline 查看大纲获取正确的节点ID或标题。`;
    saveOutlineData(outline);
    return `✅ 已删除\n\n${renderOutlineText(outline)}`;
  },
  {
    name: "delete_outline_node",
    description: "删除大纲中的节点。节点标识可以是节点ID或节点标题。",
    schema: z.object({
      nodeId: z.string().describe("节点ID或标题"),
    }),
  }
);

// ==========================================
//  章节工具
// ==========================================

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

    // 如果有旧内容，先存入废稿
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

// ==========================================
//  设定工具
// ==========================================

export const readSettingsTool = tool(
  async () => {
    const settings = readSettings();
    return `## 角色设定\n${settings.characters}\n\n## 世界观设定\n${settings.worldbuilding}\n\n## 风格指南\n${settings.styleGuide}`;
  },
  {
    name: "read_settings",
    description: "读取当前项目的所有设定（角色、世界观、风格）",
    schema: z.object({}),
  }
);

export const updateCharactersTool = tool(
  async ({ content }) => {
    const path = updateCharacterSettings(content);
    return `✅ 角色设定已更新: ${path}`;
  },
  {
    name: "update_characters",
    description: "更新角色设定文件",
    schema: z.object({
      content: z.string().describe("完整的角色设定 Markdown 内容"),
    }),
  }
);

export const updateWorldTool = tool(
  async ({ content }) => {
    const path = updateWorldSettings(content);
    return `✅ 世界观设定已更新: ${path}`;
  },
  {
    name: "update_world",
    description: "更新世界观设定文件",
    schema: z.object({
      content: z.string().describe("完整的世界观设定 Markdown 内容"),
    }),
  }
);

// ==========================================
//  素材工具
// ==========================================

export const saveInspirationTool = tool(
  async ({ title, content }) => {
    const path = saveInspiration(title, content);
    return `✅ 灵感已保存: ${path}`;
  },
  {
    name: "save_inspiration",
    description: "保存灵感记录到素材文件夹",
    schema: z.object({
      title: z.string().describe("灵感标题"),
      content: z.string().describe("灵感内容"),
    }),
  }
);

export const saveStyleAnalysisTool = tool(
  async ({ novelTitle, dimension, content }) => {
    const path = saveStyleAnalysis(novelTitle, dimension, content);
    return `✅ 风格分析已保存: ${path}`;
  },
  {
    name: "save_style_analysis",
    description: "保存网文风格分析结果到素材/风格参考",
    schema: z.object({
      novelTitle: z.string().describe("分析的小说名"),
      dimension: z.string().describe("分析维度"),
      content: z.string().describe("分析内容"),
    }),
  }
);

// ==========================================
//  导出工具
// ==========================================

export const exportNovelTool = tool(
  async ({ format }) => {
    const path = exportNovel(format ?? "markdown");
    return `✅ 小说已导出: ${path}`;
  },
  {
    name: "export_novel",
    description: "将小说导出为完整的 Markdown 或 TXT 文件",
    schema: z.object({
      format: z.enum(["markdown", "txt"]).nullable().describe("导出格式；不指定时传 null，默认 markdown"),
    }),
  }
);

// ==========================================
//  网文阅读工具（保持不变）
// ==========================================

export const readWebNovelTool = tool(
  async ({ url, maxChars }) => {
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const response = await fetch(jinaUrl, {
        headers: {
          Accept: "text/plain",
          ...(process.env.JINA_API_KEY
            ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` }
            : {}),
        },
      });
      if (!response.ok) throw new Error(`请求失败: ${response.status}`);
      let content = await response.text();
      const resolvedMaxChars = maxChars ?? 50000;
      if (content.length > resolvedMaxChars) content = content.slice(0, resolvedMaxChars);
      return JSON.stringify({ success: true, url, contentLength: content.length, content });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
  {
    name: "read_web_novel",
    description: "从URL抓取网络小说内容，用于学习和分析",
    schema: z.object({
      url: z.string().describe("网络小说URL"),
      maxChars: z.number().nullable().describe("最大抓取字符数；不指定时传 null，默认 50000"),
    }),
  }
);

// ==========================================
//  按角色分组导出
// ==========================================

/** 作者 Agent 可用的工具 */
export const authorTools = [
  viewOutlineTool,
  createChapterTool,
  writeChapterTool,
  listChaptersTool,
  getContextTool,
  readSettingsTool,
];

/** 编辑 Agent 可用的工具 */
export const editorTools = [
  // 项目
  createProjectTool,
  openProjectTool,
  listProjectsTool,
  // 大纲
  viewOutlineTool,
  addOutlineNodeTool,
  updateOutlineNodeTool,
  deleteOutlineNodeTool,
  // 章节（只读）
  listChaptersTool,
  getContextTool,
  // 设定
  readSettingsTool,
  updateCharactersTool,
  updateWorldTool,
  // 素材
  saveInspirationTool,
  saveStyleAnalysisTool,
  readWebNovelTool,
  // 导出
  exportNovelTool,
];

/** 全部工具 */
export const allTools = [
  createProjectTool,
  openProjectTool,
  listProjectsTool,
  viewOutlineTool,
  addOutlineNodeTool,
  updateOutlineNodeTool,
  deleteOutlineNodeTool,
  createChapterTool,
  writeChapterTool,
  listChaptersTool,
  getContextTool,
  readSettingsTool,
  updateCharactersTool,
  updateWorldTool,
  saveInspirationTool,
  saveStyleAnalysisTool,
  readWebNovelTool,
  exportNovelTool,
];
