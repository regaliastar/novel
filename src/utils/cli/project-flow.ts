import { colors, colorize } from "../common.js";
import { createProject, openProject } from "../project/index";
import type { Interface } from "readline";

const clr = colorize;

function ask(rl: Interface, question: string): Promise<string> {
  return new Promise((resolve) =>
    rl.question(question, (ans) => resolve(ans.trim()))
  );
}

export async function createProjectFlow(
  rl: Interface,
  presetTitle?: string
): Promise<void> {
  const titleInput =
    presetTitle ??
    (await ask(rl, clr("📘 小说标题（将作为文件夹名）：", colors.bold)));
  const title = titleInput.trim();
  if (!title) {
    console.log(clr("❌ 标题不能为空，已取消创建。", colors.red));
    return;
  }

  const genreInput = await ask(
    rl,
    clr("🏷️  类型/题材（如：奇幻、科幻、都市）：", colors.bold)
  );
  const genre = genreInput.trim() || "未指定";

  const synopsisInput = await ask(
    rl,
    clr("🧾 简介（一两句话即可）：", colors.bold)
  );
  const synopsis = synopsisInput.trim() || "未指定";

  try {
    const name = createProject({ title, genre, synopsis });
    openProject(name);
    console.log(clr(`✅ 小说项目「${name}」已创建并已自动打开。`, colors.green));
    console.log(clr(`📁 路径：novels/${name}/`, colors.dim));
  } catch (e) {
    console.log(clr(`❌ 创建失败: ${String(e)}`, colors.red));
  }
}
