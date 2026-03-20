import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { Plugin } from 'vite';

type ArticleMarkdownExportOptions = {
  buildDir?: string;
  blogDir?: string;
  outputDir?: string;
  selectorCandidates?: string[];
  minTextLength?: number;
  fallbackArticleBaseUrl?: string;
};

export function articleMarkdownExport(
  options: ArticleMarkdownExportOptions = {}
): Plugin {
  const buildDir = options.buildDir ?? 'build';
  const blogDir = options.blogDir ?? 'blog';
  const outputDir = options.outputDir ?? 'article-md';
  const fallbackArticleBaseUrl =
    options.fallbackArticleBaseUrl ?? 'https://authority-labs-vercel.vercel.app/blog/';
  const selectorCandidates = options.selectorCandidates ?? [
    '[data-article-body]',
    'main article',
    'article',
    'main .prose',
    'main'
  ];
  const minTextLength = options.minTextLength ?? 300;

  return {
    name: 'vite-plugin-svelte-article-markdown-export',
    apply: 'build',

    async closeBundle() {
      const root = process.cwd();
      const inputRoot = path.resolve(root, buildDir, blogDir);
      const outRoot = path.resolve(root, outputDir);

      const htmlFiles = await findHtmlFiles(inputRoot);
      if (htmlFiles.length === 0) {
        console.warn(
          `[article-markdown-export] No HTML files found under ${inputRoot}`
        );
        return;
      }

      await fs.mkdir(outRoot, { recursive: true });

      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
        strongDelimiter: '**',
        linkStyle: 'inlined'
      });

      turndown.remove(['script', 'style', 'noscript', 'iframe']);

      turndown.addRule('images-with-alt-fallback', {
        filter: 'img',
        replacement(_content, node) {
          const el = node as unknown as {
            getAttribute?: (name: string) => string | null;
          };

          const alt = String(el.getAttribute?.('alt') || '').replace(/\|/g, '\\|');
          const src = String(el.getAttribute?.('src') || '');
          const title = el.getAttribute?.('title');

          if (!src) return '';

          return title
            ? `![${alt}](${src} "${String(title).replace(/"/g, '\\"')}")`
            : `![${alt}](${src})`;
        }
      });

      const usedFileNames = new Set<string>();
      let written = 0;

      for (const filePath of htmlFiles) {
        const rel = path.relative(inputRoot, filePath);

        if (normalizeSlashes(rel) === 'index.html') continue;

        const html = await fs.readFile(filePath, 'utf8');
        const $ = cheerio.load(html);

        const container = pickBestContainer($, selectorCandidates, minTextLength);
        if (!container) {
          console.warn(
            `[article-markdown-export] No suitable article container found in ${rel}`
          );
          continue;
        }

        const rawSlug = slugFromRelativeHtmlPath(rel);
        const slug = sanitizeSlug(rawSlug);

        const title =
          $('meta[property="og:title"]').attr('content')?.trim() ||
          $('meta[name="twitter:title"]').attr('content')?.trim() ||
          $('h1').first().text().trim() ||
          $('title').text().trim() ||
          slug;

        const fileBaseName = ensureUniqueFileBaseName(slug, usedFileNames);
        const fileName = `${fileBaseName}.md`;
        const outFile = path.join(outRoot, fileName);
        const fallbackArticleUrl = joinUrl(fallbackArticleBaseUrl, slug);

        container.find('script, style, noscript, nav, footer, header').remove();
        container.find('[data-no-markdown-export="true"]').remove();

        container.find('h1').first().remove();

        rewriteAnchors($, container, fallbackArticleUrl);

        const contentHtml = container.html()?.trim();
        if (!contentHtml) continue;

        let markdown = turndown.turndown(contentHtml).trim();
        markdown = cleanupMarkdown(markdown);

        const output = `# ${escapeMarkdownTitle(title)}\n\n${markdown}\n`;

        await fs.writeFile(outFile, output, 'utf8');
        written++;
      }

      console.log(
        `[article-markdown-export] Wrote ${written} markdown file(s) to ${path.relative(
          root,
          outRoot
        )}`
      );
    }
  };
}

function rewriteAnchors(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  fallbackArticleUrl: string
) {
  container.find('a').each((_, el) => {
    const node = $(el);
    const href = String(node.attr('href') || '').trim();

    if (!href) {
      node.attr('href', fallbackArticleUrl);
      return;
    }

    if (href.startsWith('https://')) {
      return;
    }

    node.attr('href', fallbackArticleUrl);
  });
}

function joinUrl(base: string, slug: string) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${slug}/`;
}

function escapeMarkdownTitle(value: string) {
  return String(value).replace(/\r?\n/g, ' ').trim();
}

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/');
}

function slugFromRelativeHtmlPath(relPath: string) {
  const normalized = normalizeSlashes(relPath)
    .replace(/\/index\.html$/i, '')
    .replace(/\.html$/i, '');

  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'index';
}

function sanitizeSlug(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'article';
}

function ensureUniqueFileBaseName(base: string, used: Set<string>) {
  let candidate = base;
  let counter = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }

  used.add(candidate);
  return candidate;
}

async function findHtmlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function pickBestContainer(
  $: cheerio.CheerioAPI,
  selectors: string[],
  minTextLength: number
) {
  for (const selector of selectors) {
    const match = $(selector).first();
    if (!match.length) continue;

    const textLength = match.text().replace(/\s+/g, ' ').trim().length;
    if (textLength >= minTextLength) {
      return match;
    }
  }

  let best: { node: cheerio.Cheerio<any>; len: number } | undefined;

  $('body *').each((_, el) => {
    const node = $(el);
    const tag = el.tagName?.toLowerCase();
    if (!tag || !['article', 'main', 'section', 'div'].includes(tag)) return;

    const len = node.text().replace(/\s+/g, ' ').trim().length;
    if (len < minTextLength) return;

    if (!best || len > best.len) {
      best = { node, len };
    }
  });

  return best?.node;
}

function cleanupMarkdown(markdown: string) {
  return markdown
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
}