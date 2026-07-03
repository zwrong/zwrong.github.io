import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, 'posts');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(__dirname, 'template.html');
const INDEX_TEMPLATE_PATH = path.join(__dirname, 'index-template.html');
const RECOMMENDED_TEMPLATE_PATH = path.join(__dirname, 'recommended-template.html');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function renderPost(postDir) {
  const mdPath = path.join(postDir, 'index.md');
  if (!fs.existsSync(mdPath)) return;

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
      <h1 class="toc-header">目录</h1>
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
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  template = template.replaceAll('{{title}}', escapeHtml(fm.title || slug));
  template = template.replace('{{description}}', escapeHtml(fm.lede || fm.title || slug));
  template = template.replace('{{content}}', content);
  template = template.replace('{{slug}}', slug);
  template = template.replace('{{footerLine}}', escapeHtml(fm.footerLine || `${fm.title || slug} — ${shortDate}`));

  // Write output
  const outDir = path.join(DIST_DIR, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf-8');
  console.log(`  built: dist/${slug}/index.html`);

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
      console.log(`  copied: dist/${path.basename(destDir)}/${entry.name}/`);
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

function renderRecommendedCard(item) {
  const site = item.site || extractHostname(item.url);
  const thumbnail = item.thumbnail
    ? `<img class="recommendation-thumb" loading="lazy" src="${escapeHtml(item.thumbnail)}" alt="">`
    : '';
  const notes = item.notes
    ? `<p class="recommendation-note">${escapeHtml(item.notes)}</p>`
    : '';
  const description = item.description
    ? `<p class="recommendation-description">${escapeHtml(item.description)}</p>`
    : '';
  const hasAnnotations = notes;

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
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h4>
      ${description}
      ${hasAnnotations ? `<div class="recommendation-thread">${notes}</div>` : ''}
    </article>
  `;
}

function buildIndex(posts, recommended) {
  // Sort by date descending
  posts.sort((a, b) => {
    if (normalizeDate(a.date) < normalizeDate(b.date)) return 1;
    if (normalizeDate(a.date) > normalizeDate(b.date)) return -1;
    return 0;
  });

  const postListHtml = posts.map(p => {
    const href = `./${p.slug}/`;
    return `<a href="${href}" class="flex gap-4 items-center">
      <div class="flex row gap-4 items-baseline">
        <span class="text-sm text-muted italic whitespace-nowrap">${escapeHtml(formatDateShort(p.date))}</span>
        <span>${escapeHtml(p.title)}</span>
      </div>
    </a>`;
  }).join('\n');

  // Recommended reading / viewing — homepage teaser (max 5 items)
  const homepageRecommended = recommended.slice(0, 5);
  const recommendedHtml = homepageRecommended.length > 0
    ? `<div class="recommended-section">
        <h4 class="mb-4">Recommended Reading / Viewing</h4>
        <div class="flex flex-col gap-3">
          ${homepageRecommended.map(r => {
            const href = escapeHtml(r.url);
            return `<a href="${href}" target="_blank" rel="noopener" class="recommended-link">
              <div class="flex row gap-4 items-baseline">
                <span class="text-sm text-muted italic whitespace-nowrap">${escapeHtml(r.date)}</span>
                <span class="recommended-title">${escapeHtml(r.title)}</span>
              </div>
            </a>`;
          }).join('\n')}
          <a href="/recommended-reading/" class="recommended-more-link">More recommended reading/viewing &rarr;</a>
        </div>
      </div>`
    : '';

  let template = fs.readFileSync(INDEX_TEMPLATE_PATH, 'utf-8');
  template = template.replace('{{postList}}', postListHtml);
  template = template.replace('{{recommended}}', recommendedHtml);

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), template, 'utf-8');
  console.log('  built: dist/index.html');
}

function buildRecommendedPage(recommended) {
  const listHtml = recommended.map(renderRecommendedCard).join('\n');

  const now = new Date();
  const updatedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  let template = fs.readFileSync(RECOMMENDED_TEMPLATE_PATH, 'utf-8');
  template = template.replaceAll('{{pageTitle}}', 'Recommended Reading / Viewing — Vinen');
  template = template.replace('{{pageDescription}}', 'Articles and videos I\'ve read and recommend.');
  template = template.replace('{{recommendedList}}', listHtml);
  template = template.replace('{{updatedDate}}', updatedDate);

  const outDir = path.join(DIST_DIR, 'recommended-reading');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf-8');
  console.log('  built: dist/recommended-reading/index.html');
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

const posts = [];
for (const dir of postDirs) {
  const post = renderPost(dir);
  if (post) posts.push(post);
}

// Recommended reading / viewing
// NOTE: `date` must be the original publication date of the recommended
//       article, not the date of the blog post that mentions it.
//       Always fetch the actual publish date from the source URL.
const recommended = [
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
  },
  {
    date: "2026-5-11",
    recommendedAt: "2026-07-03T10:11:00+08:00",
    title: "Harness不是目的，知识才是护城河 —— 一个AI工程交付团队的知识沉淀实践",
    url: "https://mp.weixin.qq.com/s/JV4-oPP0jjsBCZ4tW3Gy1g?click_id=5&scene=1",
    kind: "Reading",
    site: "mp.weixin.qq.com",
    description: "",
    thumbnail: "/recommended-reading/media/tencent-tech-engineer-knowledge-moat.png",
    notes: "认同文章的核心观点，领域知识是团队的核心资产，再聪明的模型也没办法提前知道团队在什么地方踩了坑。对文章中“上下文效率提升了一个数量级”有存疑，文章没有对上下文效率进行定义。",
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
  },
  {
    date: "2026-3-29",
    recommendedAt: "2026-07-03T10:07:00+08:00",
    title: "从 Claude Code 看 Harness Engineer 的设计",
    url: "https://zhuanlan.zhihu.com/p/2021603278606087058",
    kind: "Reading",
    site: "zhuanlan.zhihu.com",
    description: "",
    thumbnail: "",
    notes: "",
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
  },
];
recommended.sort((a, b) => new Date(b.recommendedAt).getTime() - new Date(a.recommendedAt).getTime());

buildIndex(posts, recommended);
buildRecommendedPage(recommended);

// Copy recommended media files
const recommendedMediaSrc = path.join(__dirname, 'recommended-media');
const recommendedMediaDest = path.join(DIST_DIR, 'recommended-reading', 'media');
if (fs.existsSync(recommendedMediaSrc)) {
  fs.cpSync(recommendedMediaSrc, recommendedMediaDest, { recursive: true });
  console.log('  copied: dist/recommended-reading/media/');
}

// Copy static files
for (const file of ['style.css', 'components.js', 'favicon.svg']) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(DIST_DIR, file));
  }
}

console.log('Done.');
