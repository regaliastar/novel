// ==========================================
//  Skills: 统一导出入口
// ==========================================

// 项目管理工具
export {
  createProjectTool,
  openProjectTool,
  listProjectsTool,
  projectTools,
  readSettingsTool,
  updateCharactersTool,
  updateWorldTool,
  settingsTools,
} from "./project/index.js";

// 内容管理工具
export {
  viewOutlineTool,
  addOutlineNodeTool,
  updateOutlineNodeTool,
  deleteOutlineNodeTool,
  outlineTools,
  createChapterTool,
  writeChapterTool,
  listChaptersTool,
  getContextTool,
  chapterTools,
  saveInspirationTool,
  saveStyleAnalysisTool,
  materialTools,
} from "./content/index.js";

// 输入输出工具
export {
  exportNovelTool,
  exportTools,
  readWebNovelTool,
  webNovelTools,
} from "./io/index.js";

// ==========================================
//  按意图分组导出（权限控制）
// ==========================================

import { viewOutlineTool } from "./content/index.js";
import { createChapterTool, writeChapterTool, listChaptersTool, getContextTool } from "./content/index.js";
import { readSettingsTool } from "./project/index.js";
import { createProjectTool, openProjectTool, listProjectsTool } from "./project/index.js";
import { addOutlineNodeTool, updateOutlineNodeTool, deleteOutlineNodeTool } from "./content/index.js";
import { updateCharactersTool, updateWorldTool } from "./project/index.js";
import { saveInspirationTool, saveStyleAnalysisTool } from "./content/index.js";
import { readWebNovelTool } from "./io/index.js";
import { exportNovelTool } from "./io/index.js";

/** 意图类型 */
export type IntentType = "write" | "adjust" | "outline" | "settings" | "inspire" | "read_novel" | "chat";

/**
 * 按意图分配工具
 * 
 * 权限规则：
 * - write/adjust: 只能修改正文，可读设定和大纲
 * - outline: 只能修改大纲，可读设定
 * - settings: 只能修改设定
 * - inspire: 只能保存素材，可读设定、大纲、正文
 * - read_novel: 只能保存素材
 * - chat: 无工具权限
 */
export function getToolsByIntent(intent: IntentType) {
  switch (intent) {
    case "write":
    case "adjust":
      return {
        tools: [
          readSettingsTool,
          viewOutlineTool,
          getContextTool,
          listChaptersTool,
          createChapterTool,
          writeChapterTool,
        ],
        canWrite: ["chapters"],
        canRead: ["settings", "outline", "chapters"],
      };

    case "outline":
      return {
        tools: [
          readSettingsTool,
          viewOutlineTool,
          addOutlineNodeTool,
          updateOutlineNodeTool,
          deleteOutlineNodeTool,
        ],
        canWrite: ["outline"],
        canRead: ["settings", "outline"],
      };

    case "settings":
      return {
        tools: [
          readSettingsTool,
          updateCharactersTool,
          updateWorldTool,
        ],
        canWrite: ["settings"],
        canRead: ["settings"],
      };

    case "inspire":
      return {
        tools: [
          readSettingsTool,
          viewOutlineTool,
          getContextTool,
          listChaptersTool,
          saveInspirationTool,
        ],
        canWrite: ["materials"],
        canRead: ["settings", "outline", "chapters"],
      };

    case "read_novel":
      return {
        tools: [
          readWebNovelTool,
          saveStyleAnalysisTool,
        ],
        canWrite: ["materials"],
        canRead: [],
      };

    case "chat":
    default:
      return {
        tools: [],
        canWrite: [],
        canRead: [],
      };
  }
}

/** 作者 Agent 可用的工具（用于 write/adjust 意图） */
export const authorTools = [
  readSettingsTool,
  viewOutlineTool,
  getContextTool,
  listChaptersTool,
  createChapterTool,
  writeChapterTool,
];

/** 编辑 Agent 可用的工具（用于审阅，只读） */
export const editorReviewTools = [
  readSettingsTool,
  viewOutlineTool,
  getContextTool,
  listChaptersTool,
];

/** 项目管理工具（用于CLI命令） */
export const projectManagementTools = [
  createProjectTool,
  openProjectTool,
  listProjectsTool,
];

/** 全部工具（仅用于兼容） */
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
