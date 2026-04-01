import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { exportNovel } from "../../utils/project/index.js";

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

export const exportTools = [exportNovelTool];
