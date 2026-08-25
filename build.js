import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, 'posts');
const DIST_DIR = path.join(__dirname, 'dist');

// Language configuration. zh lives at the site root; en lives under /en/.
const LANGS = {
  zh: {
    pathPrefix: '',
    templateIndex: 'index-template.html',
    templatePost: 'template.html',
    templateRecommended: 'recommended-template.html',
    homeHref: '/',
    backHomeText: '返回首页',
    tocHeader: '目录',
    recommendedSectionTitle: 'Recommended Reading / Viewing',
    recommendedMore: 'More recommended reading/viewing →',
    recommendedPageTitle: '推荐阅读 / 观看 — Vinen',
    recommendedPageDescription: '我看过并推荐的文章和视频。',
    recommendedUpdated: '最后更新：',
    myComment: '我的评论：',
  },
  en: {
    pathPrefix: 'en/',
    templateIndex: 'index-template-en.html',
    templatePost: 'template-en.html',
    templateRecommended: 'recommended-template-en.html',
    homeHref: '/en/',
    backHomeText: 'Back to home',
    tocHeader: 'Table of Contents',
    recommendedSectionTitle: 'Recommended Reading / Viewing',
    recommendedMore: 'More recommended reading/viewing →',
    recommendedPageTitle: 'Recommended Reading / Viewing — Vinen',
    recommendedPageDescription: 'Articles and videos I\'ve read and recommend.',
    recommendedUpdated: 'Last updated: ',
    myComment: 'My comment: ',
  },
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Build the <language-toggle> element for a given page. The component
 * shows "中文 / EN" and links to the alternate-language version of the page.
 */
function langToggleHtml(lang, zhUrl, enUrl) {
  return `<language-toggle data-lang="${lang}" data-en-url="${enUrl}" data-zh-url="${zhUrl}"></language-toggle>`;
}

/**
 * Pre-process markdown content to handle custom containers
 * before passing to markdown-it.
 */
function preprocessContent(content, postDir) {
  const lines = content.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const evidenceMatch = lines[i].match(/^:::\s*evidence\s+(\S+)\s+"([^"]+)"$/);
    const calloutMatch = lines[i].match(/^:::\s*callout\s*$/);
    const diagramMatch = lines[i].match(/^:::\s*diagram\s+(.+)$/);

    if (evidenceMatch) {
      const filename = evidenceMatch[1];
      const stat = evidenceMatch[2];
      i++;
      const introLines = [];
      while (i < lines.length && lines[i].trim() !== ':::') {
        introLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::

      const introMd = introLines.join('\n').trim();
      const introRenderer = new MarkdownIt({ html: true });
      const introHtml = introRenderer.renderInline(introMd);

      // Read the evidence file
      const evidencePath = path.join(postDir, filename);
      let evidenceHtml = '';
      if (fs.existsSync(evidencePath)) {
        const evidenceMd = fs.readFileSync(evidencePath, 'utf-8');
        const evidenceRenderer = new MarkdownIt({ html: true });
        evidenceHtml = evidenceRenderer.render(evidenceMd);
      } else {
        evidenceHtml = `<p><!-- File not found: ${filename} --></p>`;
      }

      // Render evidence content inline, just like regular markdown
      output.push(`<!-- evidence: ${escapeHtml(filename)} -->`);
      if (introHtml) {
        output.push(`<p>${introHtml}</p>`);
      }
      output.push(evidenceHtml);
      output.push(`<!-- end evidence -->`);
    } else if (calloutMatch) {
      i++;
      const calloutLines = [];
      while (i < lines.length && lines[i].trim() !== ':::') {
        calloutLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      const calloutMd = calloutLines.join('\n').trim();
      const calloutRenderer = new MarkdownIt({ html: true });
      const calloutHtml = calloutRenderer.render(calloutMd);
      output.push(`<div class="callout">`);
      output.push(calloutHtml);
      output.push(`</div>`);
    } else if (diagramMatch) {
      // Diagram: skip since we render SVG inline which is project-specific
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        i++;
      }
      i++; // skip closing :::
      // Just output a placeholder
      output.push(`<!-- diagram omitted -->`);
    } else {
      output.push(lines[i]);
      i++;
    }
  }

  return output.join('\n');
}

function renderPost(postDir, lang) {
  const mdPath = lang === 'en'
    ? path.join(postDir, 'index.en.md')
    : path.join(postDir, 'index.md');
  if (!fs.existsSync(mdPath)) return;

  const langConf = LANGS[lang];

  const raw = fs.readFileSync(mdPath, 'utf-8');
  const { data: fm, content: mdContent } = matter(raw);

  const slug = path.basename(postDir);
  const postDate = fm.date || '';

  // Preprocess custom containers
  const processed = preprocessContent(mdContent, postDir);

  // Render markdown
  const md = new MarkdownIt({
    html: true,
    typographer: true,
    linkify: true,
  });

  // Split processed content into HTML blocks (already rendered) and markdown blocks
  const segments = splitHtmlAndMd(processed);
  let rendered = '';
  for (const seg of segments) {
    if (seg.type === 'html') {
      rendered += seg.content;
    } else {
      rendered += md.render(seg.content);
    }
  }

  // Add IDs to h2/h3 headings for TOC
  let headingCounter = 0;
  rendered = rendered.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/g, (match, level, attrs, content) => {
    // Don't add ID if one already exists
    if (/id="/.test(attrs)) return match;
    const id = `toc_${headingCounter++}`;
    return `<h${level} id="${id}">${content}</h${level}>`;
  });

  // Build TOC from h2/h3 headings
  const tocItems = [];
  const tocRegex = /<h([23])\s+id="([^"]+)"[^>]*>(.*?)<\/h[23]>/g;
  let match;
  while ((match = tocRegex.exec(rendered)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, '');
    tocItems.push({ level, id, text });
  }

  let tocHtml = '';
  if (tocItems.length > 0) {
    tocHtml = `
      <h1 class="toc-header">${langConf.tocHeader}</h1>
      <div class="toc">
        <ul>
          ${tocItems.map(item => {
            if (item.level === 2) {
              return `<li class="h2"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`;
            } else {
              return `<li><ul><li class="h3"><a href="#${item.id}">${escapeHtml(item.text)}</a></li></ul></li>`;
            }
          }).join('\n')}
        </ul>
      </div>`;
  }

  const shortDate = formatDateShort(postDate);

  // Build content
  const content = `
    <h1 style="margin-top: 0rem;">${escapeHtml(fm.title || slug)}</h1>
    <p class="text-xs italic" style="color: var(--dimmed-text-color);">${shortDate}</p>
    ${tocHtml}
    ${rendered}
  `;

  // Read template
  let template = fs.readFileSync(path.join(__dirname, langConf.templatePost), 'utf-8');
  const zhUrl = `/${slug}/`;
  const enUrl = `/en/${slug}/`;
  template = template.replaceAll('{{title}}', escapeHtml(fm.title || slug));
  template = template.replaceAll('{{description}}', escapeHtml(fm.lede || fm.title || slug));
  template = template.replaceAll('{{content}}', content);
  template = template.replaceAll('{{slug}}', slug);
  template = template.replaceAll('{{footerLine}}', escapeHtml(fm.footerLine || `${fm.title || slug} — ${shortDate}`));
  template = template.replaceAll('{{homeHref}}', langConf.homeHref);
  template = template.replaceAll('{{backHomeText}}', langConf.backHomeText);
  template = template.replaceAll('{{langToggle}}', langToggleHtml(lang, zhUrl, enUrl));
  template = template.replaceAll('{{canonicalUrl}}', `https://vinen.dev/${langConf.pathPrefix}${slug}/`);

  // Write output
  const outDir = path.join(DIST_DIR, langConf.pathPrefix, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf-8');
  console.log(`  built: dist/${langConf.pathPrefix}${slug}/index.html`);

  // Copy assets (image directories)
  copyAssets(postDir, outDir);

  return { slug, title: fm.title || slug, date: postDate, lede: fm.lede || '' };
}

function extractHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function splitHtmlAndMd(content) {
  const segments = [];
  const lines = content.split('\n');
  let current = { type: 'md', lines: [] };

  let htmlDepth = 0;
  for (const line of lines) {
    if (htmlDepth === 0 && line.match(/^<div class="(evidence-section|callout)">/)) {
      if (current.lines.length > 0) {
        segments.push({ type: current.type, content: current.lines.join('\n') });
      }
      current = { type: 'html', lines: [line] };
      htmlDepth = 1;
    } else if (htmlDepth > 0) {
      current.lines.push(line);
      const opens = (line.match(/<div[\s>]/g) || []).length;
      const closes = (line.match(/<\/div>/g) || []).length;
      htmlDepth += opens - closes;
      if (htmlDepth <= 0) {
        segments.push({ type: 'html', content: current.lines.join('\n') });
        current = { type: 'md', lines: [] };
        htmlDepth = 0;
      }
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) {
    segments.push({ type: current.type, content: current.lines.join('\n') });
  }
  return segments;
}

function copyAssets(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && (entry.name.endsWith('.assets') || entry.name === 'media' || entry.name === 'assets')) {
      const src = path.join(srcDir, entry.name);
      const dest = path.join(destDir, entry.name);
      fs.cpSync(src, dest, { recursive: true });
      console.log(`  copied: ${path.relative(path.join(__dirname, 'dist'), destDir)}/${entry.name}/`);
    }
  }
}

function normalizeDate(dateStr) {
  const chineseMatch = String(dateStr).match(/(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (chineseMatch) {
    return `${chineseMatch[1]}-${chineseMatch[2].padStart(2, '0')}-${chineseMatch[3].padStart(2, '0')}`;
  }

  const isoMatch = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  return String(dateStr);
}

function formatDateShort(dateStr) {
  const normalized = normalizeDate(dateStr);
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return normalized;
  return `${isoMatch[1]}-${parseInt(isoMatch[2], 10)}-${parseInt(isoMatch[3], 10)}`;
}

/**
 * Pick the language-appropriate value for a recommendation field.
 */
function pick(item, baseKey, lang) {
  if (lang === 'en') {
    return item[baseKey + 'En'] != null && item[baseKey + 'En'] !== '' ? item[baseKey + 'En'] : item[baseKey];
  }
  return item[baseKey];
}

function renderRecommendedCard(item, lang) {
  const langConf = LANGS[lang];
  const site = item.site || extractHostname(item.url);
  const thumbnail = item.thumbnail
    ? `<img class="recommendation-thumb" loading="lazy" src="${escapeHtml(item.thumbnail)}" alt="">`
    : '';
  const title = pick(item, 'title', lang);
  const notes = pick(item, 'notes', lang);
  const commentTitle = pick(item, 'commentTitle', lang);
  const commentUrl = lang === 'en'
    ? (item.commentUrlEn || item.commentUrl)
    : item.commentUrl;
  const notesHtml = notes
    ? `<p class="recommendation-note">${escapeHtml(notes)}</p>`
    : '';
  const commentLink = commentUrl
    ? `<p class="recommendation-note">${langConf.myComment}<a href="${escapeHtml(commentUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(commentTitle || commentUrl)}</a></p>`
    : '';
  const description = item.description
    ? `<p class="recommendation-description">${escapeHtml(item.description)}</p>`
    : '';
  const hasAnnotations = notesHtml || commentLink;

  return `
    <article class="recommendation">
      ${thumbnail}
      <div class="recommendation-header">
        <span class="recommendation-date">${escapeHtml(item.date)}</span>
        <span class="recommendation-sep">·</span>
        <span class="recommendation-kind">${escapeHtml(item.kind)}</span>
        <span class="recommendation-sep">·</span>
        <span class="recommendation-site">${escapeHtml(site)}</span>
      </div>
      <h4 class="recommendation-title">
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
      </h4>
      ${description}
      ${hasAnnotations ? `<div class="recommendation-thread">${notesHtml}${commentLink}</div>` : ''}
    </article>
  `;
}

function buildIndex(posts, recommended, lang) {
  const langConf = LANGS[lang];

  // Sort by date descending
  posts.sort((a, b) => {
    if (normalizeDate(a.date) < normalizeDate(b.date)) return 1;
    if (normalizeDate(a.date) > normalizeDate(b.date)) return -1;
    return 0;
  });

  const postListHtml = posts.map(p => {
    const href = `./${p.slug}/`;
    return `<a href="${href}" class="recommended-link">
      <div class="recommended-row">
        <span class="recommended-date text-sm text-muted italic whitespace-nowrap">${escapeHtml(formatDateShort(p.date))}</span>
        <span class="recommended-title">${escapeHtml(p.title)}</span>
      </div>
    </a>`;
  }).join('\n');

  // Recommended reading / viewing — homepage teaser (max 5 items)
  const homepageRecommended = recommended.slice(0, 5);
  const recommendedHtml = homepageRecommended.length > 0
    ? `<div class="recommended-section">
        <h4 class="mb-4">${langConf.recommendedSectionTitle}</h4>
        <div class="flex flex-col gap-3">
          ${homepageRecommended.map(r => {
            const href = escapeHtml(r.url);
            const title = pick(r, 'title', lang);
            return `<a href="${href}" target="_blank" rel="noopener" class="recommended-link">
              <div class="recommended-row">
                <span class="recommended-date text-sm text-muted italic whitespace-nowrap">${escapeHtml(r.date)}</span>
                <span class="recommended-title">${escapeHtml(title)}</span>
              </div>
            </a>`;
          }).join('\n')}
          <a href="/${langConf.pathPrefix}recommended-reading/" class="recommended-more-link">${langConf.recommendedMore}</a>
        </div>
      </div>`
    : '';

  let template = fs.readFileSync(path.join(__dirname, langConf.templateIndex), 'utf-8');
  template = template.replaceAll('{{postList}}', postListHtml);
  template = template.replaceAll('{{recommended}}', recommendedHtml);
  template = template.replaceAll('{{langToggle}}', langToggleHtml(lang, '/', '/en/'));
  template = template.replaceAll('{{homeHref}}', langConf.homeHref);
  template = template.replaceAll('{{urlBase}}', langConf.pathPrefix);

  const outDir = path.join(DIST_DIR, langConf.pathPrefix);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf-8');
  console.log(`  built: dist/${langConf.pathPrefix}index.html`);
}

function buildRecommendedPage(recommended, lang) {
  const langConf = LANGS[lang];
  const listHtml = recommended.map(r => renderRecommendedCard(r, lang)).join('\n');

  const now = new Date();
  const updatedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  let template = fs.readFileSync(path.join(__dirname, langConf.templateRecommended), 'utf-8');
  template = template.replaceAll('{{pageTitle}}', langConf.recommendedPageTitle);
  template = template.replaceAll('{{pageDescription}}', langConf.recommendedPageDescription);
  template = template.replaceAll('{{recommendedList}}', listHtml);
  template = template.replaceAll('{{updatedDate}}', updatedDate);
  template = template.replaceAll('{{langToggle}}', langToggleHtml(lang, '/recommended-reading/', '/en/recommended-reading/'));
  template = template.replaceAll('{{homeHref}}', langConf.homeHref);
  template = template.replaceAll('{{backHomeText}}', langConf.backHomeText);
  template = template.replaceAll('{{canonicalUrl}}', `https://vinen.dev/${langConf.pathPrefix}recommended-reading/`);

  const outDir = path.join(DIST_DIR, langConf.pathPrefix, 'recommended-reading');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf-8');
  console.log(`  built: dist/${langConf.pathPrefix}recommended-reading/index.html`);
}

// Main
console.log('Building site...');

if (!fs.existsSync(POSTS_DIR)) {
  console.log('No posts/ directory found.');
  process.exit(0);
}

const postDirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.'))
  .map(d => path.join(POSTS_DIR, d.name));

if (postDirs.length === 0) {
  console.log('No posts found.');
  process.exit(0);
}

fs.mkdirSync(DIST_DIR, { recursive: true });

const postsZh = [];
const postsEn = [];
for (const dir of postDirs) {
  const pZh = renderPost(dir, 'zh');
  if (pZh) postsZh.push(pZh);
  const pEn = renderPost(dir, 'en');
  if (pEn) postsEn.push(pEn);
}

// Recommended reading / viewing
// NOTE: `date` must be the original publication date of the recommended
//       article, not the date of the blog post that mentions it.
//       Always fetch the actual publish date from the source URL.
const recommended = [
  {
    date: "2026-8-3",
    recommendedAt: "2026-08-10T10:35:56+08:00",
    title: "Don't be a meat proxy",
    url: "https://gruhn.me/blog/2026-08-03/",
    kind: "Reading",
    site: "gruhn.me",
    description: "",
    thumbnail: "",
    notes: "推荐这一篇blog。这篇blog 挺短的，很快就可以看完。\n\n讲的是 不要去当 AI的传话筒。就是我们看到Claude Code给出了回答以后，我们不要直接复制粘贴Claude Code的回答，而是真正的去看Claude Code的回答是什么，然后思考Agent为什么会这样说，最后再用自己的理解自己的话，把Claude的东西表达一遍。\n\n大概这样子做能够降低 听 的成本，让别人更容易理解。\n\nBlog 举了一个 代码 review 的例子。\n\n就是当写代码的成本足够低的时候，我们可以轻松的给一个项目贡献 PR。我们跟 Claude Code 说想做的，然后也不需要看 Claude Code 给的代码。\n\n如果 reviewer（审核的人） 给了一些意见 就把这些意见 复制给 Claude，这样反复迭代几轮。最终写代码的人是 reviewer 和 Claude Code，我们成了中间的传话筒。",
    notesEn: "I recommend this blog post. It's quite short and quick to read.\n\nIt's about not being a mouthpiece for AI. When we see Claude Code give an answer, we shouldn't just copy-paste it. Instead, we should actually look at what Claude Code's answer is, think about why the Agent said that, and then express what Claude said in our own words based on our own understanding.\n\nDoing this can lower the cost of listening and make it easier for others to understand.\n\nThe blog gives an example of code review.\n\nWhen the cost of writing code is low enough, we can easily contribute PRs to a project. We tell Claude Code what we want, without even looking at the code Claude Code produces.\n\nIf a reviewer gives feedback, just copy that feedback to Claude and iterate a few rounds. In the end, the people writing the code are the reviewer and Claude Code, and we've become the middleman mouthpiece.",
  },
  {
    date: "2026-7-22",
    recommendedAt: "2026-08-03T22:23:41+08:00",
    title: "Prompt Caching In Agents",
    url: "https://earendil.com/posts/prompt-caching/",
    kind: "Reading",
    site: "Earendil",
    description: "",
    thumbnail: "https://earendil.com/static/og/posts/prompt-caching.png",
    notes: "原来如此 reasoning level changes 也会导致缓存丢失",
    notesEn: "I see — reasoning level changes also cause the cache to be lost.",
  },
  {
    date: "2026-7-13",
    recommendedAt: "2026-07-20T11:42:32+08:00",
    title: "State of Agentic Coding #8 with Mario, Armin, and Ben",
    url: "https://www.youtube.com/watch?v=_lfpEy_9vf0",
    kind: "Video",
    site: "YouTube",
    description: "",
    thumbnail: "https://i.ytimg.com/vi/_lfpEy_9vf0/hqdefault.jpg",
    notes: "I can't see the future",
    notesEn: "I can't see the future",
  },
  {
    date: "2026-7-8",
    recommendedAt: "2026-07-13T11:14:50+08:00",
    title: "I rebuilt Posia using the Pi Agent SDK",
    url: "https://x.com/jasonzhou1993/status/2074811444038894078?s=20",
    kind: "Video",
    site: "x.com",
    description: "",
    thumbnail: "",
    notes: "recommend reading! give a brief introduction about pi agent sdk, great!",
    notesEn: "recommend reading! give a brief introduction about pi agent sdk, great!",
  },
  {
    date: "2026-7-4",
    recommendedAt: "2026-07-13T11:14:49+08:00",
    title: "Better Models: Worse Tools",
    url: "https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/",
    kind: "Reading",
    site: "Armin Ronacher's Thoughts and Writings",
    description: "",
    thumbnail: "",
    notes: "",
    notesEn: "",
    commentTitle: "《Harness 会退化模型能力》",
    commentTitleEn: "Harness Can Degrade Model Capability",
    commentUrl: "https://zwrong.github.io/2026-07-harness-degrades-model-capability/",
    commentUrlEn: "https://zwrong.github.io/en/2026-07-harness-degrades-model-capability/",
  },
  {
    date: "2026-7-4",
    recommendedAt: "2026-07-07T23:29:00+08:00",
    title: "Harness Engineering for Self-Improvement",
    url: "https://lilianweng.github.io/posts/2026-07-04-harness/",
    kind: "Reading",
    site: "Lil'Log",
    description: "",
    thumbnail: "/recommended-reading/media/lilian-weng-harness-engineering.png",
    notes: "简单明了讲解了 Harness 的各种尝试",
    notesEn: "A clear and simple explanation of the various Harness attempts.",
  },
  {
    date: "2026-6-5",
    recommendedAt: "2026-07-05T23:24:05+08:00",
    title: "PI Architecture EXPLAINED | Agent Loop, Tools, TUI and More",
    url: "https://www.youtube.com/watch?v=gTeujlv8qK0",
    kind: "Video",
    site: "YouTube",
    description: "",
    thumbnail: "https://i.ytimg.com/vi/gTeujlv8qK0/hqdefault.jpg",
    notes: "Alejandro讲解tree的那一段的时候讲挺清晰的，用白板做笔记，画思维导图的方式娓娓道来。",
    notesEn: "The part where Alejandro explains the tree is quite clear — he takes notes on a whiteboard and draws mind maps, explaining it step by step.",
  },
  {
    date: "2026-6-25",
    recommendedAt: "2026-07-05T23:13:25+08:00",
    title: "How to Build a Coding Agent | 3-Layer Architecture",
    url: "https://www.youtube.com/watch?v=5duo9qHw660&t=18s",
    kind: "Video",
    site: "YouTube",
    description: "",
    thumbnail: "https://i.ytimg.com/vi/5duo9qHw660/hqdefault.jpg",
    notes: "用白板的形式，清晰讲解了coding agent的架构",
    notesEn: "Explains the coding agent architecture clearly with a whiteboard.",
  },
  {
    date: "2023-7-27",
    recommendedAt: "2026-07-03T12:13:30+08:00",
    title: "Will Depue: 20 Year Old OpenAI Researcher Shares The Secret To Building Anything | EP26",
    url: "https://www.youtube.com/watch?v=q0cjcw3af_k&t=71s",
    kind: "Video",
    site: "YouTube",
    description: "",
    thumbnail: "https://i.ytimg.com/vi/q0cjcw3af_k/hqdefault.jpg",
    notes: "这个播客给我一些信心：personal brand compounds，在早期会比较慢，突破了一个点后就会持续带来收益。“And I know I'm capable of sxxx.” 能够清晰地、有自信地认识到自己能做成事情。",
    notesEn: "This podcast gave me some confidence: personal brand compounds. It's slow early on, but once you break through a point it keeps paying off. \"And I know I'm capable of sxxx.\" Being able to clearly and confidently recognize that I can get things done.",
  },
  {
    date: "2026-5-11",
    recommendedAt: "2026-07-03T10:11:00+08:00",
    title: "Harness不是目的，知识才是护城河 —— 一个AI工程交付团队的知识沉淀实践",
    titleEn: "Harness Isn't the Goal, Knowledge Is the Moat — Knowledge Practices of an AI Engineering Delivery Team",
    url: "https://mp.weixin.qq.com/s/JV4-oPP0jjsBCZ4tW3Gy1g?click_id=5&scene=1",
    kind: "Reading",
    site: "mp.weixin.qq.com",
    description: "",
    thumbnail: "/recommended-reading/media/tencent-tech-engineer-knowledge-moat.png",
    notes: "认同文章的核心观点，领域知识是团队的核心资产，再聪明的模型也没办法提前知道团队在什么地方踩了坑。对文章中“上下文效率提升了一个数量级”有存疑，文章没有对上下文效率进行定义。",
    notesEn: "I agree with the article's core point: domain knowledge is the team's core asset. No matter how smart the model, it can't know in advance where the team has stepped on a landmine. I'm skeptical of the article's claim that \"context efficiency improved by an order of magnitude,\" since it never defines context efficiency.",
  },
  {
    date: "2026-6-24",
    recommendedAt: "2026-07-03T10:10:00+08:00",
    title: "Linus's opinion on coding in the AI Era",
    url: "https://x.com/IntCyberDigest/status/2069512370217488423",
    kind: "Video",
    site: "x.com",
    description: "",
    thumbnail: "/recommended-reading/media/linus-opinion-ai.png",
    notes: "",
    notesEn: "",
  },
  {
    date: "2026-5-18",
    recommendedAt: "2026-07-03T10:09:00+08:00",
    title: "Harnesses in AI: A Deep Dive — Tejas Kumar, IBM",
    url: "https://www.youtube.com/watch?v=C_GG5g38vLU",
    kind: "Video",
    site: "YouTube",
    description: "",
    thumbnail: "https://i.ytimg.com/vi/C_GG5g38vLU/hqdefault.jpg",
    notes: "20分钟内讲清楚了什么是Harness，为什么需要Harness，如何构建Harness，我希望我也能做到！",
    notesEn: "In 20 minutes he clearly explained what a Harness is, why we need one, and how to build one. I hope I can do the same!",
  },
  {
    date: "2025-11-30",
    recommendedAt: "2026-07-03T10:08:00+08:00",
    title: "What I learned building an opinionated and minimal coding agent",
    url: "https://mariozechner.at/posts/2025-11-30-pi-coding-agent/",
    kind: "Reading",
    site: "Mario's Musings",
    description: "",
    thumbnail: "https://mariozechner.at/posts/2025-11-30-pi-coding-agent/media/header.png",
    notes: "原来Pi默认YOLO的原因是这个。",
    notesEn: "So this is the reason Pi defaults to YOLO.",
  },
  {
    date: "2026-3-29",
    recommendedAt: "2026-07-03T10:07:00+08:00",
    title: "从 Claude Code 看 Harness Engineer 的设计",
    titleEn: "Harness Engineer Design as Seen from Claude Code",
    url: "https://zhuanlan.zhihu.com/p/2021603278606087058",
    kind: "Reading",
    site: "zhuanlan.zhihu.com",
    description: "",
    thumbnail: "",
    notes: "",
    notesEn: "",
  },
  {
    date: "2026-1-17",
    recommendedAt: "2026-07-03T10:06:00+08:00",
    title: "The Shorthand Guide to Everything Claude Code",
    url: "https://x.com/affaan/status/2012378465664745795",
    kind: "Reading",
    site: "x.com",
    description: "",
    thumbnail: "/recommended-reading/media/claude-code-shorthand.png",
    notes: "系统讲解了 Claude Code 的组成。用 tmux 的 hook 跑长时间的任务让我印象深刻。",
    notesEn: "A systematic explanation of how Claude Code is composed. Using a tmux hook to run long-running tasks left a strong impression on me.",
  },
  {
    date: "2026-3-25",
    recommendedAt: "2026-07-03T10:05:00+08:00",
    title: "Thoughts on Slowing the Fuck Down",
    url: "https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/",
    kind: "Reading",
    site: "Mario's Musings",
    description: "",
    thumbnail: "https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/media/header.png",
    notes: "我时常困惑AI生成的代码这么快，人一行一行review不过来该怎么办？于是遇到了这篇文章。",
    notesEn: "I'm often puzzled: AI generates code so fast that I can't review it line by line. Then I came across this article.",
  },
];
recommended.sort((a, b) => new Date(b.recommendedAt).getTime() - new Date(a.recommendedAt).getTime());

buildIndex(postsZh, recommended, 'zh');
buildIndex(postsEn, recommended, 'en');
buildRecommendedPage(recommended, 'zh');
buildRecommendedPage(recommended, 'en');

// Copy recommended media files
const recommendedMediaSrc = path.join(__dirname, 'recommended-media');
const recommendedMediaDest = path.join(DIST_DIR, 'recommended-reading', 'media');
if (fs.existsSync(recommendedMediaSrc)) {
  fs.cpSync(recommendedMediaSrc, recommendedMediaDest, { recursive: true });
  console.log('  copied: dist/recommended-reading/media/');
}

// Copy static files
for (const file of ['style.css', 'components.js', 'favicon.svg', 'og-image.png']) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(DIST_DIR, file));
  }
}

console.log('Done.');
