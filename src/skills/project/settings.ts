import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  readSettings,
  updateCharacterSettings,
  updateWorldSettings,
} from "../../utils/project/index.js";

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

export const settingsTools = [readSettingsTool, updateCharactersTool, updateWorldTool];
