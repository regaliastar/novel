import { tool } from "@langchain/core/tools";
import { z } from "zod";

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

export const webNovelTools = [readWebNovelTool];
