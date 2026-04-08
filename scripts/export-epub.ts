import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { basename, join, resolve } from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";

interface ChapterSource {
  title: string;
  body: string;
  chapterLabel: string;
  volumeLabel: string;
  volumeTitle: string;
  volumeOrder: number;
  chapterOrder: number;
}

interface ProjectConfig {
  title?: string;
}

const collator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

function fail(message: string): never {
  throw new Error(message);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

function parseOrder(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseVolumeName(volumeName: string, fallbackOrder: number): {
  volumeLabel: string;
  volumeTitle: string;
  volumeOrder: number;
} {
  const matched = volumeName.match(/^第(\d+)卷(?:-(.+))?$/);

  if (!matched) {
    return {
      volumeLabel: volumeName,
      volumeTitle: volumeName,
      volumeOrder: fallbackOrder,
    };
  }

  const volumeOrder = parseOrder(matched[1], fallbackOrder);
  const volumeTitle = (matched[2] || "").trim();
  const volumeLabel = volumeTitle
    ? `第${volumeOrder}卷 ${volumeTitle}`
    : `第${volumeOrder}卷`;

  return {
    volumeLabel,
    volumeTitle: volumeTitle || volumeLabel,
    volumeOrder,
  };
}

function parseChapterFileName(fileName: string, fallbackOrder: number): {
  chapterLabel: string;
  chapterTitle: string;
  chapterOrder: number;
} {
  const rawName = basename(fileName, ".md").trim();
  const matched = rawName.match(/^第(\d+)章-(.+)$/);

  if (!matched) {
    const chapterTitle = rawName;
    return {
      chapterLabel: `第${fallbackOrder}章 ${chapterTitle}`,
      chapterTitle,
      chapterOrder: fallbackOrder,
    };
  }

  const chapterOrder = parseOrder(matched[1], fallbackOrder);
  const chapterTitle = matched[2].trim();

  return {
    chapterLabel: `第${chapterOrder}章 ${chapterTitle}`,
    chapterTitle,
    chapterOrder,
  };
}

function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, "");
}

function extractTitleAndBody(markdown: string, fallbackTitle: string): Pick<ChapterSource, "title" | "body"> {
  const normalized = stripFrontMatter(markdown).trim();
  const headingMatch = normalized.match(/^#\s+(.+?)\r?\n+/);

  if (headingMatch) {
    return {
      title: headingMatch[1].trim(),
      body: normalized.slice(headingMatch[0].length).trim(),
    };
  }

  return {
    title: fallbackTitle,
    body: normalized,
  };
}

function guessTitleFromFileName(fileName: string): string {
  return basename(fileName, ".md").replace(/^第\d+章-/, "").trim();
}

function markdownToXhtmlBody(markdown: string): string {
  const content = markdown.trim();

  if (!content) {
    return "<p></p>";
  }

  return content
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeXml(block).replace(/\r?\n/g, "<br />")}</p>`)
    .join("\n");
}

function readProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = join(projectRoot, "项目配置.json");

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as ProjectConfig;
  } catch {
    return {};
  }
}

function collectChapters(projectRoot: string): ChapterSource[] {
  const chaptersRoot = join(projectRoot, "正文");

  if (!existsSync(chaptersRoot)) {
    fail(`未找到正文章节目录: ${chaptersRoot}`);
  }

  const volumeDirs = readdirSync(chaptersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => collator.compare(a, b));

  const chapters: ChapterSource[] = [];

  for (const volumeName of volumeDirs) {
    const volumePath = join(chaptersRoot, volumeName);
    const volumeMeta = parseVolumeName(volumeName, chapters.length + 1);
    const files = readdirSync(volumePath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => collator.compare(a, b));

    for (const fileName of files) {
      const chapterMeta = parseChapterFileName(fileName, chapters.length + 1);
      const raw = readFileSync(join(volumePath, fileName), "utf-8");
      const parsed = extractTitleAndBody(raw, guessTitleFromFileName(fileName));

      chapters.push({
        title: parsed.title || chapterMeta.chapterTitle,
        body: parsed.body,
        chapterLabel: `第${chapterMeta.chapterOrder}章 ${parsed.title || chapterMeta.chapterTitle}`,
        volumeLabel: volumeMeta.volumeLabel,
        volumeTitle: volumeMeta.volumeTitle,
        volumeOrder: volumeMeta.volumeOrder,
        chapterOrder: chapterMeta.chapterOrder,
      });
    }
  }

  if (chapters.length === 0) {
    fail("正文目录中没有可导出的章节");
  }

  return chapters;
}

interface BookPage {
  id: string;
  href: string;
  navLabel: string;
  content: string;
  kind: "title" | "nav" | "volume" | "chapter";
}

function createChapterPage(chapter: ChapterSource): string {
  const title = escapeXml(chapter.chapterLabel);
  const body = markdownToXhtmlBody(chapter.body);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN" xml:lang="zh-CN">
  <head>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <section epub:type="chapter">
      <header>
        <h1>${title}</h1>
      </header>
      ${body}
    </section>
  </body>
</html>
`;
}

function createVolumePage(volumeLabel: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN" xml:lang="zh-CN">
  <head>
    <title>${escapeXml(volumeLabel)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <section epub:type="part" class="volume-page">
      <h1>${escapeXml(volumeLabel)}</h1>
    </section>
  </body>
</html>
`;
}

function createTitlePage(bookTitle: string, chapterCount: number): string {
  const safeTitle = escapeXml(bookTitle);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN" xml:lang="zh-CN">
  <head>
    <title>${safeTitle}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <section class="title-page">
      <h1>${safeTitle}</h1>
    </section>
  </body>
</html>
`;
}

function createNavPage(bookTitle: string, pages: BookPage[]): string {
  const items = pages
    .filter((page) => page.kind === "volume" || page.kind === "chapter")
    .map((page) => {
      return `        <li><a href="${page.href}">${escapeXml(page.navLabel)}</a></li>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN" xml:lang="zh-CN">
  <head>
    <title>目录</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeXml(bookTitle)}</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>
`;
}

function createNcx(bookTitle: string, pages: BookPage[], bookId: string): string {
  const navPoints = pages
    .filter((page) => page.kind === "volume" || page.kind === "chapter")
    .map((page, index) => {
      const order = index + 1;
      return `    <navPoint id="nav-${order}" playOrder="${order}">
      <navLabel><text>${escapeXml(page.navLabel)}</text></navLabel>
      <content src="${page.href}" />
    </navPoint>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookId)}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle>
    <text>${escapeXml(bookTitle)}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`;
}

function createOpf(bookTitle: string, pages: BookPage[], bookId: string, modifiedAt: string): string {
  const pageManifest = pages
    .map((page) => {
      return `    <item id="${page.id}" href="${page.href}" media-type="application/xhtml+xml" />`;
    })
    .join("\n");

  const pageSpine = pages
    .map((page) => `    <itemref idref="${page.id}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="zh-CN">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(bookId)}</dc:identifier>
    <dc:title>${escapeXml(bookTitle)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:creator>mumu</dc:creator>
    <meta property="dcterms:modified">${modifiedAt}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="styles" href="styles.css" media-type="text/css" />
${pageManifest}
  </manifest>
  <spine toc="toc">
${pageSpine}
  </spine>
</package>
`;
}

function createStyles(): string {
  return `body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.85;
  margin: 5%;
}

h1 {
  margin: 0 0 1.2em;
  text-align: left;
}

.title-page,
.volume-page,
nav {
  margin-top: 20vh;
}

.title-page h1,
.volume-page h1,
nav h1 {
  text-align: center;
}

.title-page p {
  text-align: center;
  text-indent: 0;
}

.volume-page {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 60vh;
  page-break-before: always;
}

.volume-page h1 {
  margin: 0;
}

section[epub\\:type="chapter"] {
  page-break-before: always;
}

p {
  margin: 0 0 1em;
  text-indent: 2em;
}

hr {
  margin: 2em 0;
}
`;
}

function writeEpubStructure(workDir: string, bookTitle: string, chapters: ChapterSource[]): void {
  const metaInfDir = join(workDir, "META-INF");
  const oebpsDir = join(workDir, "OEBPS");
  mkdirSync(metaInfDir, { recursive: true });
  mkdirSync(oebpsDir, { recursive: true });

  const bookId = `urn:uuid:${randomUUID()}`;
  const modifiedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const pages: BookPage[] = [
    {
      id: "title",
      href: "title.xhtml",
      navLabel: bookTitle,
      content: createTitlePage(bookTitle, chapters.length),
      kind: "title",
    },
    {
      id: "nav",
      href: "nav.xhtml",
      navLabel: "目录",
      content: "",
      kind: "nav",
    },
  ];

  let currentVolumeLabel = "";

  chapters.forEach((chapter, index) => {
    if (chapter.volumeLabel !== currentVolumeLabel) {
      currentVolumeLabel = chapter.volumeLabel;
      pages.push({
        id: `volume-${chapter.volumeOrder}`,
        href: `volume-${String(chapter.volumeOrder).padStart(2, "0")}.xhtml`,
        navLabel: chapter.volumeLabel,
        content: createVolumePage(chapter.volumeLabel),
        kind: "volume",
      });
    }

    pages.push({
      id: `chapter-${index + 1}`,
      href: `chapter-${String(index + 1).padStart(3, "0")}.xhtml`,
      navLabel: chapter.chapterLabel,
      content: createChapterPage(chapter),
      kind: "chapter",
    });
  });

  const navPage = createNavPage(bookTitle, pages);
  pages[1].content = navPage;

  writeFileSync(join(workDir, "mimetype"), "application/epub+zip", "utf-8");
  writeFileSync(
    join(metaInfDir, "container.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`,
    "utf-8"
  );

  writeFileSync(join(oebpsDir, "styles.css"), createStyles(), "utf-8");
  writeFileSync(join(oebpsDir, "toc.ncx"), createNcx(bookTitle, pages, bookId), "utf-8");
  writeFileSync(join(oebpsDir, "content.opf"), createOpf(bookTitle, pages, bookId, modifiedAt), "utf-8");

  pages.forEach((page) => {
    writeFileSync(join(oebpsDir, page.href), page.content, "utf-8");
  });
}

function runZip(args: string[], cwd: string): void {
  const result = spawnSync("zip", args, {
    cwd,
    encoding: "utf-8",
  });

  if (result.error) {
    fail(`调用 zip 命令失败，请确认系统已安装 zip: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(result.stderr.trim() || result.stdout.trim() || "zip 打包失败");
  }
}

function buildEpub(projectRoot: string, outputPath?: string): string {
  if (!existsSync(projectRoot)) {
    fail(`项目不存在: ${projectRoot}`);
  }

  const config = readProjectConfig(projectRoot);
  const chapters = collectChapters(projectRoot);
  const bookTitle = config.title?.trim() || basename(projectRoot);
  const finalPath = outputPath
    ? resolve(outputPath)
    : join(projectRoot, `${sanitizeFileName(bookTitle)}.epub`);

  const tempDir = mkdtempSync(join(tmpdir(), "novel-epub-"));

  try {
    writeEpubStructure(tempDir, bookTitle, chapters);

    if (existsSync(finalPath)) {
      unlinkSync(finalPath);
    }

    runZip(["-X0q", finalPath, "mimetype"], tempDir);
    runZip(["-Xr9Dq", finalPath, "META-INF", "OEBPS"], tempDir);

    return finalPath;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function printUsage(): void {
  console.log("用法:");
  console.log('  npm run export:epub -- "<项目名>"');
  console.log('  npm run export:epub -- "<项目名>" "<输出文件路径>"');
}

function main(): void {
  const [, , projectName, outputPath] = process.argv;

  if (!projectName) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const projectRoot = resolve(process.cwd(), "novels", projectName);
  const epubPath = buildEpub(projectRoot, outputPath);

  console.log(`已导出 EPUB: ${epubPath}`);
}

main();
