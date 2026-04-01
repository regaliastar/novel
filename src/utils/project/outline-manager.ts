import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { OutlineNode } from "../../types.js";
import { projectPaths } from "./paths.js";

export function createDefaultOutline(title: string): OutlineNode {
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

export function loadOutline(projectName?: string): OutlineNode | null {
  const paths = projectPaths(projectName);
  if (!existsSync(paths.outlineData)) return null;
  return JSON.parse(readFileSync(paths.outlineData, "utf-8")) as OutlineNode;
}

export function saveOutlineData(
  outline: OutlineNode,
  projectName?: string
): void {
  const paths = projectPaths(projectName);

  if (!existsSync(paths.outlineDir)) {
    mkdirSync(paths.outlineDir, { recursive: true });
  }

  writeFileSync(paths.outlineData, JSON.stringify(outline, null, 2), "utf-8");

  const overviewMd = renderOutlineOverview(outline);
  writeFileSync(paths.outlineOverview, overviewMd, "utf-8");

  for (const volume of outline.children) {
    const volumeMd = renderVolumeOutline(volume);
    const safeTitle = volume.title.replace(/[\\/:*?"<>|]/g, "_");
    const volumePath = join(paths.outlineDir, `${safeTitle}.md`);
    writeFileSync(volumePath, volumeMd, "utf-8");
  }
}

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
    const statusIcon = getStatusIcon(volume.status);
    md += `- ${statusIcon} **${volume.title}**`;
    if (volume.summary) {
      md += `：${volume.summary.slice(0, 50)}${volume.summary.length > 50 ? "..." : ""}`;
    }
    md += ` (${volume.children.length}章)\n`;
  }

  return md;
}

function renderVolumeOutline(node: OutlineNode): string {
  const statusIcon = getStatusIcon(node.status);

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
    const chStatusIcon = getStatusIcon(chapter.status);
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

function getStatusIcon(status: string | undefined): string {
  switch (status) {
    case "written":
      return "✅";
    case "writing":
      return "✍️";
    case "approved":
      return "👍";
    default:
      return "📝";
  }
}

export function renderOutlineText(node: OutlineNode, depth = 0): string {
  const indent = "  ".repeat(depth);
  const statusIcon = getStatusIcon(node.status);

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

export function findOutlineNode(
  root: OutlineNode,
  nodeIdOrTitle: string
): OutlineNode | null {
  if (root.id === nodeIdOrTitle) return root;

  if ((nodeIdOrTitle === "root" || nodeIdOrTitle === "根节点") && root.id) {
    return root;
  }

  if (root.title === nodeIdOrTitle) return root;

  for (const child of root.children) {
    const found = findOutlineNode(child, nodeIdOrTitle);
    if (found) return found;
  }
  return null;
}

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

export function removeOutlineNode(
  root: OutlineNode,
  nodeIdOrTitle: string
): boolean {
  for (let i = 0; i < root.children.length; i++) {
    if (
      root.children[i].id === nodeIdOrTitle ||
      root.children[i].title === nodeIdOrTitle
    ) {
      root.children.splice(i, 1);
      return true;
    }
    if (removeOutlineNode(root.children[i], nodeIdOrTitle)) return true;
  }
  return false;
}
