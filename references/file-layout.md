# File Layout

```text
novels/
├─ SKILL.md
├─ references/
│  ├─ context-loading.md
│  ├─ file-layout.md
│  ├─ projects.md
│  └─ writing-workflows.md
└─ works/
   └─ <title>/
      ├─ PROJECT.md
      ├─ STATE.md
      ├─ RULES.md
      ├─ CONTINUITY.md
      ├─ CHAPTERS.md
      ├─ outline/
      ├─ canon/
      ├─ manuscript/
      ├─ materials/
      ├─ workbench/
      └─ drafts/
```

## Work Files

- `PROJECT.md`: stable project overview and navigation.
- `STATE.md`: current progress, latest position, next direction.
- `RULES.md`: prose rules and file-maintenance rules.
- `CONTINUITY.md`: characters, factions, locations, unresolved threads.
- `CHAPTERS.md`: compact chapter map for selecting nearby files.
- `outline/`: volume and chapter planning.
- `canon/`: characters, world, style, rules.
- `manuscript/`: prose chapters.
- `materials/`: references, inspirations, briefings.
- `workbench/`: active task, next chapter brief, changelog.
- `drafts/`: discarded or alternate prose.

## Naming

- Volumes: keep sortable prefixes such as `第01卷-灰烬启程`.
- Chapters: keep sortable prefixes such as `第001章-灰烬里的名字.md`.
- Task files use stable English names: `TASK.md`, `NEXT.md`, `CHANGELOG.md`.

## Generated Files

Do not keep large exported full manuscripts in the active context tree unless the user asks for export artifacts. They duplicate manuscript chapters and increase accidental context load.
