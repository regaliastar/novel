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
//  按角色分组导出
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
  createProjectTool,
  openProjectTool,
  listProjectsTool,
  viewOutlineTool,
  addOutlineNodeTool,
  updateOutlineNodeTool,
  deleteOutlineNodeTool,
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
