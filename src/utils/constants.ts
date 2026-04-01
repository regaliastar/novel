import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { NovelGraphState } from "../types.js";

export const novelsRoot = join(process.cwd(), "novels");
if (!existsSync(novelsRoot)) mkdirSync(novelsRoot, { recursive: true });

export const intentLabels: Record<string, string> = {
  write: "✍️  写作",
  adjust: "🔧 调整",
  outline: "📋 大纲",
  inspire: "💡 灵感",
  read_novel: "📖 阅读分析",
  chat: "💬 对话",
};

export function getIntentLabel(intent: NovelGraphState["intent"]): string {
  if (!intent) return "未知";
  return intentLabels[intent] || intent;
}

export function getNextThought(intent: NovelGraphState["intent"]): string {
  switch (intent) {
    case "write":
      return "正在读取大纲和上下文，准备开始写作";
    case "adjust":
      return "正在读取相关内容和编辑意见，准备修改文本";
    case "outline":
      return "正在检查当前大纲并准备执行大纲操作";
    case "inspire":
      return "正在读取大纲和前文，准备生成灵感建议";
    case "read_novel":
      return "正在抓取小说内容并准备分析风格与结构";
    case "chat":
    default:
      return "正在组织回复内容";
  }
}

export const BANNER = `
╔═══════════════════════════════════════════════════╗
║       Multi-Agent 木木小助手                        ║
║                                                   ║
║  小说保存在 novels/<小说名>/ 文件夹中                 ║
║  包含：大纲 · 设定 · 素材 · 正文 · 废稿               ║
║                                                   ║
║  命令:                                            ║
║    /help        → 列出所有命令                     ║
║    /new         → 创建新项目                      ║
║    /open <名>   → 打开项目                        ║
║    /list        → 列出所有项目                    ║
║    /outline     → 查看大纲                        ║
║    /chapters    → 查看章节列表                    ║
║    /export      → 导出小说                        ║
║    /quit        → 退出                            ║
╚═══════════════════════════════════════════════════╝
`;
