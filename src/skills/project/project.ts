import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  createProject,
  openProject,
  listProjects,
  getActiveProject,
} from "../../utils/project/index.js";

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

export const projectTools = [createProjectTool, openProjectTool, listProjectsTool];
