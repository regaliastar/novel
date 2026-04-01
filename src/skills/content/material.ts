import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  saveInspiration,
  saveStyleAnalysis,
} from "../../utils/project/index.js";

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

export const materialTools = [saveInspirationTool, saveStyleAnalysisTool];
