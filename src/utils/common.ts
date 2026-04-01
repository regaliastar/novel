// ==========================================
//  共享工具模块 - 颜色、回调处理器等
// ==========================================

import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";
import { getActiveProject, loadOutline } from "./project-manager.js";

// ==========================================
//  ANSI 颜色常量
// ==========================================

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

/** 给文本添加颜色 */
export const colorize = (text: string, color: string): string =>
  `${color}${text}${colors.reset}`;

// ==========================================
//  工具调用回调处理器
// ==========================================

/** 创建工具调用打印回调处理器 */
export function createToolCallbackHandler(agentName: string) {
  return BaseCallbackHandler.fromMethods({
    handleToolStart(tool: Serialized, input: string) {
      const toolName = tool.name || tool.id?.[tool.id.length - 1] || "unknown";
      console.log(
        `\n${colorize(`[${agentName}]`, colors.magenta)} ${colorize(`🔧 调用工具: ${toolName}`, colors.cyan)}`
      );
      try {
        const parsed = JSON.parse(input);
        const paramsStr = JSON.stringify(parsed, null, 2);
        console.log(`${colors.dim}     参数:${colors.reset}`);
        paramsStr.split("\n").slice(0, 10).forEach((line) => {
          console.log(`${colors.dim}       ${line}${colors.reset}`);
        });
        if (paramsStr.split("\n").length > 10) {
          console.log(`${colors.dim}       ...${colors.reset}`);
        }
      } catch {
        console.log(`${colors.dim}     参数: ${input.slice(0, 200)}${colors.reset}`);
      }
    },
    handleToolEnd(output: unknown) {
      let outputStr: string;
      if (typeof output === "string") {
        outputStr = output;
      } else if (output && typeof output === "object") {
        if ("content" in output && typeof (output as any).content === "string") {
          outputStr = (output as any).content;
        } else {
          outputStr = JSON.stringify(output);
        }
      } else {
        outputStr = String(output);
      }
      const preview =
        outputStr.length > 150 ? outputStr.slice(0, 150) + "..." : outputStr;
      console.log(`${colorize("  ✅ 工具返回:", colors.green)} ${preview}\n`);
    },
  });
}

// ==========================================
//  项目上下文
// ==========================================

/** 获取当前项目上下文（用于 Agent 系统提示） */
export function getProjectContext(): string {
  const projectName = getActiveProject();
  if (!projectName) {
    return "\n\n⚠️ 当前没有打开任何项目，请先创建或打开一个项目。";
  }

  const outline = loadOutline();
  let context = `\n\n## 当前项目信息\n- 项目名称：${projectName}`;
  
  if (outline) {
    context += `\n- 小说标题：${outline.title}`;
    if (outline.summary) {
      context += `\n- 小说概要：${outline.summary}`;
    }
  }
  
  context += `\n\n所有文件操作都会保存到 novels/${projectName}/ 目录下。`;
  return context;
}
