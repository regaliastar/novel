import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  loadOutline,
  saveOutlineData,
  renderOutlineText,
  addOutlineChild,
  updateOutlineNode,
  removeOutlineNode,
} from "../../utils/project/index.js";

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

export const outlineTools = [
  viewOutlineTool,
  addOutlineNodeTool,
  updateOutlineNodeTool,
  deleteOutlineNodeTool,
];
