---
name: novels
description: Work with the local Chinese novel corpus as a Codex skill-style writing library. Use when the user asks Codex to continue, rewrite, outline, audit continuity, update canon, plan chapters, or reorganize files under the novels directory; especially when incremental context loading is needed for long-form fiction.
---

# Novels

Treat this directory as a skill package and fiction corpus, not a code project. Load context progressively: start with this file, then only the reference or work files needed for the task.

## First Read

For any task:

1. Read `references/context-loading.md`.
2. Read `references/file-layout.md`.
3. Choose the target work from `references/projects.md`.
4. Read the target work's `PROJECT.md`, `STATE.md`, `RULES.md`, and `workbench/TASK.md`.

For writing or rewriting prose, also read `references/writing-workflows.md`, the work's `CONTINUITY.md`, `CHAPTERS.md`, the relevant outline, and only the nearby manuscript chapters.

## Work Roots

- Works live in `works/<title>/`.
- The current work is `works/魔女之剑/`.
- Do not load full manuscripts unless explicitly requested. Use indexes to locate the minimal chapter set.

## Update Contract

After changing prose, outline, or canon, update the smallest relevant state files:

- `STATE.md` for current progress and open threads.
- `CHAPTERS.md` when adding, renaming, or materially changing chapters.
- `workbench/CHANGELOG.md` with a short dated note.

## Safety

Never delete manuscript, canon, or outline files unless the user explicitly asks for that destructive edit and confirms it. Prefer adding indexes, summaries, and task files over merging everything into a single large file.
