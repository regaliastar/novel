// ==========================================
//  类型定义 - 小说 Agent 核心数据结构
// ==========================================

/** 大纲节点 */
export interface OutlineNode {
  id: string;
  title: string;
  summary: string;
  keyEvents: string[];
  characters: string[];
  children: OutlineNode[];
  status: "draft" | "approved" | "writing" | "written";
  notes?: string;
}

/** 角色定义 */
export interface Character {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  personality: string;
  background: string;
  relationships: { characterId: string; relation: string }[];
  arc: string;
}

/** 世界观设定 */
export interface WorldBuilding {
  name: string;
  era: string;
  geography: string;
  powerSystem?: string;
  factions: { name: string; description: string }[];
  rules: string[];
  lore: string;
}

/** 章节 */
export interface Chapter {
  id: string;
  volumeIndex: number;
  chapterIndex: number;
  title: string;
  outlineNodeId: string;
  content: string;
  wordCount: number;
  status: "draft" | "reviewed" | "revised" | "final";
  createdAt: string;
  updatedAt: string;
}

/** 写作风格配置 */
export interface StyleGuide {
  tone: string;
  pov: string;
  pacing: string;
  vocabulary: string;
  influences: string[];
  taboos: string[];
  customRules: string[];
}

/** 小说项目全局配置 */
export interface NovelProject {
  title: string;
  genre: string;
  synopsis: string;
  targetWordCount: number;
  outline: OutlineNode;
  characters: Character[];
  worldBuilding: WorldBuilding;
  styleGuide: StyleGuide;
}

/** Agent 间消息 */
export interface AgentMessage {
  from: "author" | "editor" | "user" | "system";
  to: "author" | "editor" | "user";
  type: "instruction" | "draft" | "feedback" | "inspiration" | "approval";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/** LangGraph 状态定义 */
export interface NovelGraphState {
  // 用户消息
  messages: AgentMessage[];
  // 当前意图
  intent:
    | "write"
    | "adjust"
    | "outline"
    | "inspire"
    | "read_novel"
    | "chat"
    | null;
  // 用户原始输入
  userInput: string;
  // 当前操作的章节 ID
  currentChapterId: string | null;
  // 大纲
  outline: OutlineNode | null;
  // 作者输出的草稿
  draft: string | null;
  // 编辑的反馈
  editorFeedback: string | null;
  // 编辑的灵感
  inspiration: string | null;
  // 修改轮次
  revisionCount: number;
  // 最大修改轮次
  maxRevisions: number;
  // 最终输出
  finalOutput: string | null;
  // 错误信息
  error: string | null;
}
