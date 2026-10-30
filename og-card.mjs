// Generate 1200x630 social preview cards for every post.
//
// Usage:
//   node og-card.mjs            # all posts, both languages
//   node og-card.mjs <slug>     # one post
//
// Output: og-media/<slug>.png (zh) and og-media/en/<slug>.png (en)
// Requires Google Chrome (headless screenshot). Override with CHROME_BIN.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, 'posts');
const OUT_DIR = path.join(__dirname, 'og-media');

const CHROME = process.env.CHROME_BIN
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Author shown at the bottom right of every card.
const AUTHOR_NAME = 'Vinen';
const AVATAR_FILE = path.join(__dirname, 'og-avatar.png');

const WIDTH = 1200;
const HEIGHT = 630;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Rough display width in em: CJK is full width, latin about half.
function displayUnits(text) {
  let units = 0;
  for (const ch of text) {
    if (/[\u3000-\u9fff\uff00-\uffef]/.test(ch)) units += 1;
    else if (ch === ' ') units += 0.28;
    else if (/[A-Z]/.test(ch)) units += 0.62;
    else units += 0.52;
  }
  return units;
}

// First body paragraph, used as summary when the post has no lede.
function firstParagraph(markdown) {
  const blocks = markdown.split(/\n\s*\n/);
  for (const block of blocks) {
    const text = block.trim();
    if (!text) continue;
    if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|\||<|```)/.test(text)) continue;
    return text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

// Cut text to a display budget, at a word boundary when possible, with an ellipsis.
function truncate(text, maxUnits) {
  if (displayUnits(text) <= maxUnits) return text;
  const chars = [...text];
  let units = 0;
  let cut = chars.length;
  for (let i = 0; i < chars.length; i++) {
    const u = displayUnits(chars[i]);
    if (units + u > maxUnits - 2.2) { cut = i; break; }
    units += u;
  }
  let out = chars.slice(0, cut).join('');
  const lastSpace = out.lastIndexOf(' ');
  if (lastSpace > out.length * 0.6) out = out.slice(0, lastSpace);
  return `${out.trimEnd()}…`;
}

// Pick the largest title size that still fits in at most maxLines lines.
function fitTitleSize(title, maxWidth, maxLines) {
  const sizes = [78, 72, 66, 60, 54, 48, 44];
  for (const size of sizes) {
    const lines = Math.ceil((displayUnits(title) * size) / maxWidth);
    if (lines <= maxLines) return size;
  }
  return sizes[sizes.length - 1];
}

function renderCard({ title, lede }) {
  const padX = 84;
  const usable = WIDTH - padX * 2;
  const titleSize = fitTitleSize(title, usable, 3);
  // Two lines of summary, cut at a word boundary so latin text is not chopped.
  const ledeText = lede ? truncate(lede, (usable / 30) * 2) : '';
  const hasAvatar = fs.existsSync(AVATAR_FILE);
  const avatarSrc = hasAvatar
    ? `data:image/png;base64,${fs.readFileSync(AVATAR_FILE).toString('base64')}`
    : '';

  const avatar = hasAvatar
    ? `<img class="avatar" src="${avatarSrc}" alt="" />`
    : `<div class="avatar fallback">${escapeHtml(AUTHOR_NAME.charAt(0))}</div>`;

  return `<!doctype html>
<html lang="zh">
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
  body {
    background:
      radial-gradient(120% 100% at 85% 0%, #2b2b31 0%, rgba(43,43,49,0) 55%),
      linear-gradient(160deg, #26262b 0%, #1c1c20 100%);
    font-family: "Times New Roman", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", Georgia, serif;
    color: #e8e8ea;
    position: relative;
    overflow: hidden;
  }
  .body { position: absolute; left: ${padX}px; right: ${padX}px; top: 148px; }
  h1 {
    font-size: ${titleSize}px;
    line-height: 1.28;
    font-weight: 400;
    letter-spacing: -0.4px;
    color: #ececee;
  }
  .lede {
    margin-top: 26px;
    font-size: 30px;
    line-height: 1.55;
    color: #a4a4ac;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .who {
    position: absolute;
    right: ${padX}px;
    bottom: 62px;
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .avatar {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.18);
    display: block;
  }
  .avatar.fallback {
    background: rgba(255, 255, 255, 0.10);
    font-size: 38px;
    line-height: 76px;
    text-align: center;
    color: #d8d8dc;
  }
  .name {
    font-family: "Times New Roman", "Songti SC", Georgia, serif;
    font-size: 29px;
    color: #d5d5da;
  }
</style>
<div class="body">
  <h1>${escapeHtml(title)}</h1>
  ${ledeText ? `<p class="lede">${escapeHtml(ledeText)}</p>` : ''}
</div>
<div class="who">
  ${avatar}
  <span class="name">${escapeHtml(AUTHOR_NAME)}</span>
</div>
</html>`;
}

function shoot(html, outFile) {
  const base = `${path.basename(outFile, '.png')}-${process.pid}-${Date.now()}`;
  const tmpHtml = path.join(os.tmpdir(), `og-${base}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf-8');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // A fresh profile per shot keeps Chrome from waiting on another instance.
  // Chrome occasionally hangs on start, so retry a few times.
  const attempts = 3;
  try {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'og-profile-'));
      try {
        execFileSync(CHROME, [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          `--user-data-dir=${profile}`,
          '--force-device-scale-factor=1',
          `--window-size=${WIDTH},${HEIGHT}`,
          `--screenshot=${outFile}`,
          `file://${tmpHtml}`,
        ], { stdio: 'ignore', timeout: 45000 });
        return;
      } catch (err) {
        if (attempt === attempts) throw err;
        console.warn(`  retry ${attempt}: ${path.basename(outFile)}`);
      } finally {
        fs.rmSync(profile, { recursive: true, force: true });
      }
    }
  } finally {
    fs.rmSync(tmpHtml, { force: true });
  }
}

const only = process.argv[2];
let count = 0;

for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  if (only && slug !== only) continue;
  const dir = path.join(POSTS_DIR, slug);

  for (const [file, sub] of [['index.md', ''], ['index.en.md', 'en']]) {
    const mdPath = path.join(dir, file);
    if (!fs.existsSync(mdPath)) continue;
    const parsed = matter(fs.readFileSync(mdPath, 'utf-8'));
    const fm = parsed.data;
    const title = fm.title || slug;
    const lede = fm.lede || firstParagraph(parsed.content);
    const outFile = path.join(OUT_DIR, sub, `${slug}.png`);
    shoot(renderCard({ title, lede }), outFile);
    count++;
    console.log(`  card: ${path.relative(__dirname, outFile)}`);
  }
}

console.log(`Done. ${count} card(s).`);
