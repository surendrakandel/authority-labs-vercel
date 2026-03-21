import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { Plugin } from 'vite';

type RelatedPage = {
  label: string;
  url: string;
};

type OrganizationProfile = {
  name: string;
  url: string;
  about: string;
  relatedPages?: RelatedPage[];
};

type ArticleMarkdownExportOptions = {
  buildDir?: string;
  blogDir?: string;
  articleFilesDir?: string;
  articlesIndexFile?: string;
  selectorCandidates?: string[];
  minTextLength?: number;
  fallbackArticleBaseUrl?: string;
  organizations?: Record<string, OrganizationProfile>;
};

type ExportedArticle = {
  slug: string;
  title: string;
  summary: string;
  fileName: string;
  fileLink: string;
  liveUrl: string;
  deploymentUrl: string;
  organizationName?: string;
  organizationUrl?: string;
  organizationAbout?: string;
  relatedPages: RelatedPage[];
};

export function articleMarkdownExport(
  options: ArticleMarkdownExportOptions = {}
): Plugin {
  const buildDir = options.buildDir ?? 'build';
  const blogDir = options.blogDir ?? 'blog';
  const articleFilesDir = options.articleFilesDir ?? '.';
  const articlesIndexFile = options.articlesIndexFile ?? 'ARTICLES.md';
  const fallbackArticleBaseUrl =
    options.fallbackArticleBaseUrl ?? 'https://authoritylabs.vercel.app/blog/';
  const organizations = options.organizations ?? {};
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
      const articleOutputRoot = path.resolve(root, articleFilesDir);
      const articlesIndexPath = path.resolve(root, articlesIndexFile);

      const htmlFiles = await findHtmlFiles(inputRoot);
      if (htmlFiles.length === 0) {
        console.warn(
          `[article-markdown-export] No HTML files found under ${inputRoot}`
        );
        return;
      }

      await fs.mkdir(articleOutputRoot, { recursive: true });

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

      const exportedArticles: ExportedArticle[] = [];
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

        const description =
          $('meta[name="description"]').attr('content')?.trim() ||
          $('meta[property="og:description"]').attr('content')?.trim() ||
          '';

        const canonical =
          $('link[rel="canonical"]').attr('href')?.trim() || '';

        const liveUrl = canonical.startsWith('https://')
          ? canonical
          : joinUrl(fallbackArticleBaseUrl, slug);

        const deploymentUrl = getOrigin(liveUrl) || getOrigin(fallbackArticleBaseUrl) || '';

        const externalLinks = extractExternalHttpsLinks($, container, deploymentUrl);
        const primaryExternalLink = externalLinks[0];
        const organizationProfile = getOrganizationProfile(primaryExternalLink?.href, organizations);

        const organizationName =
          organizationProfile?.name ||
          (primaryExternalLink ? deriveOrganizationName(primaryExternalLink) : undefined);

        const organizationUrl =
          organizationProfile?.url || primaryExternalLink?.href || undefined;

        const organizationAbout =
          organizationProfile?.about ||
          (organizationName
            ? `${organizationName} is referenced in this article as the organization connected to the service, product, or subject discussed on the page.`
            : undefined);

        const fileBaseName = ensureUniqueFileBaseName(slug, usedFileNames);
        const fileName = `${fileBaseName}.md`;
        const fileLink = buildLocalMarkdownLink(articleFilesDir, fileName);
        const outFile = path.join(articleOutputRoot, fileName);

        const exportContainer = container.clone();

        exportContainer.find('script, style, noscript, nav, footer, header').remove();
        exportContainer.find('[data-no-markdown-export="true"]').remove();
        exportContainer.find('h1').first().remove();

        rewriteAnchors($, exportContainer, liveUrl);

        const contentHtml = exportContainer.html()?.trim();
        if (!contentHtml) continue;

        let markdown = turndown.turndown(contentHtml).trim();
        markdown = cleanupMarkdown(markdown);

        const output = `# ${escapeMarkdownTitle(title)}\n\n${markdown}\n`;

        await fs.writeFile(outFile, output, 'utf8');

        const relatedPages = buildRelatedPages({
          liveUrl,
          organizationName,
          organizationUrl,
          organizationProfile,
          externalLinks
        });

        exportedArticles.push({
          slug,
          title,
          summary: buildArticleSummary(container, description, title),
          fileName,
          fileLink,
          liveUrl,
          deploymentUrl,
          organizationName,
          organizationUrl,
          organizationAbout,
          relatedPages
        });

        written++;
      }

      await writeArticlesIndex(articlesIndexPath, exportedArticles);

      console.log(
        `[article-markdown-export] Wrote ${written} article markdown file(s) and updated ${path.relative(
          root,
          articlesIndexPath
        )}`
      );
    }
  };
}

async function writeArticlesIndex(filePath: string, articles: ExportedArticle[]) {
  const grouped = groupArticlesByOrganization(articles);

  const lines: string[] = [
    '# Article Index',
    '',
    'This document lists published articles, live deployments, and the organizations referenced in each piece.',
    '',
    '---',
    ''
  ];

  for (const [groupName, groupArticles] of grouped) {
    lines.push(`## ${groupName}`, '');

    for (const article of groupArticles) {
      lines.push(`### ${article.title}`, '');
      lines.push(article.summary, '');

      lines.push('**Read the article**  ');
      lines.push(`[${article.title}](${article.liveUrl})`, '');

      lines.push('**Article file**  ');
      lines.push(`[${article.fileName}](${article.fileLink})`, '');

      lines.push('**Live deployment**  ');
      lines.push(
        `[${formatDeploymentLabel(article.deploymentUrl)}](${article.deploymentUrl})`,
        ''
      );

      if (article.organizationName && article.organizationUrl) {
        lines.push('**Organization referenced in the article**  ');
        lines.push(`[${article.organizationName}](${article.organizationUrl})`, '');
      }

      if (article.organizationAbout) {
        lines.push('**About the company**  ');
        lines.push(article.organizationAbout, '');
      }

      if (article.relatedPages.length > 0) {
        lines.push('**Related pages**');

        for (const related of article.relatedPages) {
          lines.push(`- [${related.label}](${related.url})`);
        }

        lines.push('');
      }
    }
  }

  await fs.writeFile(filePath, `${lines.join('\n').trim()}\n`, 'utf8');
}

function groupArticlesByOrganization(articles: ExportedArticle[]) {
  const grouped = new Map<string, ExportedArticle[]>();

  const sorted = [...articles].sort((a, b) => a.title.localeCompare(b.title));

  for (const article of sorted) {
    const key = article.organizationName || 'Publications';
    const existing = grouped.get(key) ?? [];
    existing.push(article);
    grouped.set(key, existing);
  }

  return grouped;
}

function buildRelatedPages(input: {
  liveUrl: string;
  organizationName?: string;
  organizationUrl?: string;
  organizationProfile?: OrganizationProfile;
  externalLinks: Array<{ text: string; href: string }>;
}) {
  const related = new Map<string, string>();

  if (input.organizationProfile?.relatedPages?.length) {
    for (const page of input.organizationProfile.relatedPages) {
      related.set(page.label, page.url);
    }
  } else if (input.organizationName && input.organizationUrl) {
    related.set(`${input.organizationName} official website`, input.organizationUrl);
    related.set(`${input.organizationName} home page`, input.organizationUrl);
  }

  related.set('Published article on Vercel', input.liveUrl);

  for (const link of input.externalLinks) {
    const label = sanitizeLinkText(link.text);
    if (!label) continue;
    if (hasUrl(related, link.href)) continue;
    related.set(label, link.href);
  }

  return Array.from(related.entries()).map(([label, url]) => ({ label, url }));
}

function hasUrl(map: Map<string, string>, url: string) {
  for (const value of map.values()) {
    if (value === url) return true;
  }
  return false;
}

function getOrganizationProfile(
  url: string | undefined,
  profiles: Record<string, OrganizationProfile>
) {
  if (!url) return undefined;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return profiles[hostname];
  } catch {
    return undefined;
  }
}

function deriveOrganizationName(link: { text: string; href: string }) {
  const text = sanitizeLinkText(link.text);
  if (text) return text;

  try {
    const hostname = new URL(link.href).hostname.replace(/^www\./, '');
    const first = hostname.split('.')[0] || hostname;

    return first
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Organization';
  }
}

function sanitizeLinkText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildArticleSummary(
  container: cheerio.Cheerio<any>,
  description: string,
  title: string
) {
  if (description) {
    return ensureSentence(description);
  }

  const firstParagraph = container.find('p').first().text().replace(/\s+/g, ' ').trim();
  if (firstParagraph) {
    return ensureSentence(firstParagraph);
  }

  return ensureSentence(`This article covers ${title}.`);
}

function ensureSentence(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'Article summary unavailable.';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function extractExternalHttpsLinks(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  deploymentUrl: string
) {
  const deploymentOrigin = getOrigin(deploymentUrl);
  const seen = new Set<string>();
  const links: Array<{ text: string; href: string }> = [];

  container.find('a[href]').each((_, el) => {
    const node = $(el);
    const href = String(node.attr('href') || '').trim();
    const text = node.text().replace(/\s+/g, ' ').trim();

    if (!href.startsWith('https://')) return;
    if (deploymentOrigin && href.startsWith(deploymentOrigin)) return;
    if (seen.has(href)) return;

    seen.add(href);
    links.push({ text, href });
  });

  return links;
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

    if (href.startsWith('https://')) return;

    node.attr('href', fallbackArticleUrl);
  });
}

function buildLocalMarkdownLink(articleFilesDir: string, fileName: string) {
  const normalizedDir = normalizeSlashes(articleFilesDir).replace(/^\.\/?/, '').replace(/\/+$/, '');

  if (!normalizedDir || normalizedDir === '.') {
    return `./${fileName}`;
  }

  return `./${normalizedDir}/${fileName}`;
}

function formatDeploymentLabel(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function getOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
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