# Novel Agent 🖊️

> 基于 LangGraph 的多 Agent 小说创作系统

## 特性

- **双 Agent 协作**：作者 Agent 负责撰写，编辑 Agent 负责灵感和审阅
- **自动审阅循环**：写作 → 审阅 → 修改 → 再审阅，直到编辑满意
- **Skill 系统**：支持网文阅读与风格分析
- **大纲管理**：树形结构大纲，支持完整 CRUD
- **多模型支持**：DeepSeek / Qwen / Claude / GPT 灵活切换
- **对话式交互**：通过自然语言控制写作流程

## 架构

```
用户输入 → Router(意图识别) → 分发到对应流程
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             写作流程       灵感/阅读       大纲管理
          作者→编辑→循环    编辑Agent       编辑Agent
                 │              │              │
                 └──────────────┼──────────────┘
                                ▼
                            输出结果
```

## 快速开始

### 1. 安装依赖

```bash
cd novel-agent
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

**推荐使用 DeepSeek（国内直连、性价比高）：**
```env
AUTHOR_MODEL_PROVIDER=deepseek
AUTHOR_MODEL_NAME=deepseek-chat
AUTHOR_API_KEY=your-api-key
AUTHOR_BASE_URL=https://api.deepseek.com
```

### 3. 启动

```bash
npm run chat
```

## 使用指南

### 写作
```
你: 创建大纲，小说名叫《星辰大海》，是一部科幻冒险小说
你: 写第一章，主角在太空站醒来，发现所有人都消失了
你: 把开头改得更紧张一些，加入警报声
```

### 灵感
```
你: 给第二章提供一些灵感
你: 帮我分析一下这部小说 https://xxx.com/novel/123
```

### 大纲
```
你: 查看大纲
你: 在第一卷后面添加第二卷，主题是"深空探索"
你: 修改第三章的大纲，加入一个反转
```

## 项目结构

```
novel-agent/
├── src/
│   ├── agents/
│   │   ├── author-agent.ts    # 作者 Agent
│   │   ├── editor-agent.ts    # 编辑 Agent
│   │   └── prompts.ts         # System Prompt 模板
│   ├── graph/
│   │   └── novel-graph.ts     # LangGraph 核心图定义
│   ├── skills/
│   │   ├── web-novel-reader.ts # 网文阅读 Skill
│   │   ├── outline-tools.ts    # 大纲操作 Tools
│   │   └── chapter-tools.ts    # 章节操作 Tools
│   ├── utils/
│   │   ├── outline-manager.ts  # 大纲数据管理
│   │   └── chapter-manager.ts  # 章节数据管理
│   ├── config/
│   │   └── llm.ts             # LLM 配置
│   ├── types.ts               # 类型定义
│   ├── index.ts               # 模块导出
│   └── cli.ts                 # CLI 交互界面
├── package.json
├── tsconfig.json
└── .env.example
```

## 扩展指南

### 添加新 Skill

1. 在 `src/skills/` 下创建新文件
2. 使用 `@langchain/core/tools` 的 `tool()` 函数定义工具
3. 在对应 Agent 中注册工具

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const myNewTool = tool(
  async ({ param1 }) => {
    // 工具逻辑
    return "result";
  },
  {
    name: "my_new_tool",
    description: "工具描述",
    schema: z.object({
      param1: z.string().describe("参数描述"),
    }),
  }
);
```

### 切换模型

编辑 `.env` 文件即可切换，支持任何 OpenAI 兼容接口。

### 添加 Web UI

推荐使用 Next.js + `@langchain/langgraph` 的 streaming 能力：

```typescript
import { buildNovelGraph } from "novel-agent";

// 在 API Route 中
const graph = buildNovelGraph();
const stream = await graph.stream({ userInput: "写第一章" });
for await (const chunk of stream) {
  // 流式输出到前端
}
```

## License

MIT
