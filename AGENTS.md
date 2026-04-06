# AGENTS.md

## 目标

这是一个面向中文小说创作场景的多 Agent 系统。你在这个仓库中的首要任务是：

1. 理解用户要改的是编排逻辑、工具权限、Prompt、CLI 交互，还是本地小说数据结构
2. 在尽量少改动的前提下复用现有模块完成修改
3. 保持 `novels/` 下已有项目数据可继续被读取和操作

默认工作目录是仓库根目录。小说业务数据不在 `src/`，而在 `novels/`。

## 快速判断改哪里

- 改 Agent 行为或人设：先看 `src/agents/` 和 `src/agents/prompts.ts`
- 改意图路由或流程编排：先看 `src/graph/novel-graph.ts`
- 改工具权限或给某个意图分配工具：先看 `src/skills/index.ts`
- 改章节、大纲、设定、素材的落盘逻辑：先看 `src/utils/project/`
- 改 CLI 指令、快捷命令、终端输出：先看 `src/cli.ts` 和 `src/utils/cli/`
- 改模型选择、Provider、实例化：先看 `src/config/llm.ts`

## 仓库地图

```text
novel/
├── src/
│   ├── agents/          # 作者/编辑 Agent 与 Prompt
│   ├── graph/           # LangGraph 编排
│   ├── skills/          # 工具定义与意图权限分配
│   ├── utils/           # CLI 与项目文件读写
│   ├── config/          # LLM 配置
│   ├── cli.ts           # 命令行入口
│   ├── index.ts         # 库导出入口
│   └── types.ts         # 类型定义
├── novels/              # 小说项目数据
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 核心架构

### Agent 层

- `src/agents/author-agent.ts`：负责写作和正文修改
- `src/agents/editor-agent.ts`：负责审阅、反馈、灵感与辅助分析
- `src/agents/prompts.ts`：集中放系统 Prompt，改行为时优先改这里，不要把大段 Prompt 分散到业务逻辑里

### Graph 层

- `src/graph/novel-graph.ts` 是主编排入口
- 当前流程是先做意图识别，再路由到写作、大纲、设定、灵感、网文分析或闲聊分支
- 写作链路是“作者生成 → 编辑审阅 → 视反馈循环修订”

### Skill 层

- `src/skills/content/`：章节、大纲、素材类工具
- `src/skills/project/`：项目和设定类工具
- `src/skills/io/`：导出与网文读取
- `src/skills/index.ts`：统一导出，并通过 `getToolsByIntent()` 控制不同意图能用哪些工具

这里的关键原则是“按意图授权”。如果你新增工具，通常不只要导出工具，还要决定它属于哪个意图。

### 项目读写层

`src/utils/project/` 是本仓库最重要的状态落盘层，负责：

- 管理当前激活项目
- 维护小说目录结构
- 读写大纲、正文、设定、素材
- 导出整本小说

若你要改本地文件结构、章节命名规则、设定文件位置，这一层是第一落点。

## 数据结构是另一套“源码”

每个小说项目位于 `novels/<项目名>/`，当前约定结构如下：

```text
novels/<项目名>/
├── 项目配置.json
├── 大纲/
│   ├── 总览.md
│   └── 大纲数据.json
├── 设定/
│   ├── 角色设定.md
│   ├── 世界观设定.md
│   └── 风格指南.md
├── 素材/
│   ├── 风格参考/
│   ├── 灵感记录/
│   └── 参考资料/
├── 正文/
└── 废稿/
```

只要你改了这个结构，至少同步检查下面这些文件：

- `src/utils/project/paths.ts`
- `src/utils/project/index.ts`
- `src/utils/project/chapter-manager.ts`
- `src/utils/project/outline-manager.ts`
- `src/utils/project/material-manager.ts`

不要轻易修改中文目录名或文件名，现有逻辑已经依赖它们。

## 修改时的硬规则

- 这是 ESM 项目，本地导入统一使用 `.js` 后缀
- 优先编辑已有文件，除非确实需要新增模块
- 优先复用现有 manager、tool、prompt，不要在 graph 或 agent 节点里直接堆文件系统逻辑
- 新功能要尽量挂到已有分层里，不要跨层乱放
- CLI 面向中文用户，新增交互文案优先保持中文语境
- 若只是调整行为表现，先改 Prompt，再考虑改流程代码
- 若只是调整工具权限，先改 `getToolsByIntent()`，不要直接改所有调用方

## 常见任务的推荐入口

### 1. 新增一个意图

通常需要同时改：

- `src/skills/index.ts`：扩展 `IntentType` 与工具权限
- `src/graph/novel-graph.ts`：增加节点、路由和输出处理
- `src/agents/prompts.ts`：补充该意图的系统 Prompt
- 必要时在 `src/skills/` 下新增对应工具

### 2. 新增一个工具

推荐顺序：

1. 先判断它属于 `content`、`project` 还是 `io`
2. 在对应目录实现工具
3. 在对应目录 `index.ts` 导出
4. 在 `src/skills/index.ts` 接入统一导出和意图分配
5. 如果模型需要更稳定地调用它，再补 Prompt 提示

### 3. 调整写作或审阅效果

优先检查：

- `src/agents/prompts.ts`
- `src/agents/author-agent.ts`
- `src/agents/editor-agent.ts`
- `src/graph/novel-graph.ts`

经验上，很多“效果不对”的问题先改 Prompt 就够，不需要先动工具层。

### 4. 调整小说项目目录或文件格式

推荐顺序：

1. 先改 `src/utils/project/paths.ts`
2. 再改对应 manager 的读写逻辑
3. 再检查 skills 是否依赖旧路径
4. 最后检查 CLI 与导出逻辑

这类改动要优先考虑兼容旧项目，而不是只让新项目可用。

## 运行方式

`package.json` 当前可用脚本：

- `npm run chat`：CLI 交互入口
- `npm run dev`：直接运行 `src/index.ts`
- `npm run build`：构建到 `dist/`
- `npm run start`：运行构建产物

仓库当前没有独立测试脚本，也没有明确的 lint 脚本。做代码改动时，基础验证方式是 `npm run build`。

## 环境变量

配置来源于 `.env`，示例见 `.env.example`。

重点变量：

- `AUTHOR_*`：作者 Agent 模型配置
- `EDITOR_*`：编辑 Agent 模型配置
- `JINA_API_KEY`：网文抓取相关能力

模型接入问题优先检查 `src/config/llm.ts`，不要在业务层分散写 Provider 逻辑。

## 给 AI 编码助手的工作建议

- 先定位层级，再动代码，不要一上来全局搜索后到处散改
- 把 `src/` 当作行为定义，把 `novels/` 当作状态数据
- 改 Prompt、工具、编排、存储时要分清职责边界
- 能在 `utils/project/` 解决的持久化问题，不要塞回 Agent 层
- 能在 `skills/index.ts` 解决的权限问题，不要绕过权限分配机制
- 涉及用户可见输出时，默认保持中文、简洁、创作助手风格
- 如果改动影响项目结构或文件命名，优先考虑已有项目数据的兼容性
