/**
 * check-images.mjs — 验证所有文章引用的图片文件是否存在
 *
 * 检查项：
 *   1. 每篇 posts/ 下 index.md 中引用的 ./media/xxx 文件必须存在
 *   2. 构建后（dist/）中对应的图片也必须存在
 *   3. 警告：media/ 目录中有未被引用的多余文件
 *
 * 用法：
 *   node check-images.mjs              # 只检查源文件
 *   node check-images.mjs --dist       # 同时检查 dist 目录
 *   node check-images.mjs --fix        # 检查后输出修复命令（如果 Blog/mariozechner 存在）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, 'posts');
const DIST_DIR = path.join(__dirname, 'dist');
const RECOMMENDED_MEDIA_DIR = path.join(__dirname, 'recommended-media');
const RECOMMENDED_DIST_MEDIA_DIR = path.join(DIST_DIR, 'recommended-reading', 'media');
const MARIOZECHNER_DIR = '/Users/vinen/Documents/Vscode_Homepage/Blog/mariozechner';

const args = process.argv.slice(2);
const checkDist = args.includes('--dist');
const showFix = args.includes('--fix');

let hasError = false;
let warnings = [];

function error(msg) {
  console.error(`  ✗  ${msg}`);
  hasError = true;
}

function warn(msg) {
  warnings.push(msg);
}

/** 从 markdown 中提取所有图片引用路径 */
function extractImageRefs(mdContent) {
  // 匹配 ![](./media/xxx) 或 ![](media/xxx) 模式
  const refs = [];
  const regex = /\]\(\.?\/?media\/([^)]+)\)/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)]; // 去重
}

function extractRecommendedLocalThumbnails(source) {
  const refs = [];
  const regex = /thumbnail:\s*["'`]\/recommended-reading\/media\/([^"'`]+)["'`]/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

function extractEvidenceFiles(mdContent) {
  const refs = [];
  const regex = /^:::\s*evidence\s+(\S+)/gm;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

function collectPostImageRefs(postDir, entryFile = 'index.md', visited = new Set()) {
  const entryPath = path.join(postDir, entryFile);
  const visitKey = path.resolve(entryPath);
  if (visited.has(visitKey) || !fs.existsSync(entryPath)) {
    return [];
  }

  visited.add(visitKey);

  const mdContent = fs.readFileSync(entryPath, 'utf-8');
  const refs = new Set(extractImageRefs(mdContent));

  for (const evidenceFile of extractEvidenceFiles(mdContent)) {
    const nestedRefs = collectPostImageRefs(postDir, evidenceFile, visited);
    for (const ref of nestedRefs) {
      refs.add(ref);
    }
  }

  return [...refs];
}

function checkRecommendedThumbnails() {
  const buildSource = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf-8');
  const refs = extractRecommendedLocalThumbnails(buildSource);
  if (refs.length === 0) return;

  console.log('\n🖼️ Recommended thumbnails');

  if (!fs.existsSync(RECOMMENDED_MEDIA_DIR)) {
    for (const ref of refs) {
      error(`引用了 /recommended-reading/media/${ref}，但 recommended-media/ 目录不存在`);
    }
    return;
  }

  const sourceFiles = new Set(fs.readdirSync(RECOMMENDED_MEDIA_DIR));
  for (const ref of refs) {
    if (sourceFiles.has(ref)) {
      console.log(`  ✅ ${ref}`);
    } else {
      error(`recommended-media/ 缺少 ${ref}（build.js 引用了但目录中没有）`);
    }
  }

  for (const file of sourceFiles) {
    if (!refs.includes(file)) {
      warn(`📦 recommended-media: 有未引用的文件: ${file}`);
    }
  }

  if (!checkDist) return;

  if (!fs.existsSync(RECOMMENDED_DIST_MEDIA_DIR)) {
    for (const ref of refs) {
      error(`dist/recommended-reading/media/ 目录不存在，请重新 npm run build`);
    }
    return;
  }

  const distFiles = new Set(fs.readdirSync(RECOMMENDED_DIST_MEDIA_DIR));
  for (const ref of refs) {
    if (!distFiles.has(ref)) {
      error(`dist/recommended-reading/media/ 缺少 ${ref}（重新 npm run build 可解决）`);
    }
  }
}

/** 检查单个文章 */
function checkPost(postDir, postName) {
  const mdFile = path.join(postDir, 'index.md');
  const mediaDir = path.join(postDir, 'media');

  if (!fs.existsSync(mdFile)) return;

  const refs = collectPostImageRefs(postDir);
  if (refs.length === 0) return;

  console.log(`\n📄 ${postName}`);

  // 检查 1：引用的图片在源 media/ 目录中是否存在
  if (!fs.existsSync(mediaDir)) {
    for (const ref of refs) {
      error(`引用了 ./media/${ref}，但 media/ 目录不存在`);
    }
    return;
  }

  const mediaFiles = new Set(fs.readdirSync(mediaDir));

  for (const ref of refs) {
    if (mediaFiles.has(ref)) {
      console.log(`  ✅ ${ref}`);
    } else {
      error(`缺少 ${ref}（文章内容引用了但 media/ 目录中没有）`);
    }
  }

  // 检查 3：media/ 中有但未引用的文件
  for (const file of mediaFiles) {
    if (!refs.includes(file)) {
      warn(`📦 ${postName}: media/ 中有未引用的文件: ${file}`);
    }
  }
}

// ─── 主流程 ───────────────────────────────────────

console.log('🔍 检查文章图片完整性...\n');

// 检查源文件
const postDirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true });
let checkedCount = 0;
for (const entry of postDirs) {
  if (entry.isDirectory()) {
    checkPost(path.join(POSTS_DIR, entry.name), entry.name);
    checkedCount++;
  }
}

console.log(`\n📊 共检查 ${checkedCount} 篇文章`);
checkRecommendedThumbnails();

// 检查 dist（可选）
if (checkDist) {
  console.log('\n📦 检查 dist 目录...');
  const hadErrorBeforeDistCheck = hasError;

  for (const entry of postDirs) {
    if (!entry.isDirectory()) continue;
    const postName = entry.name;
    const distMedia = path.join(DIST_DIR, postName, 'media');
    const mdFile = path.join(POSTS_DIR, postName, 'index.md');

    if (!fs.existsSync(mdFile)) continue;
    const refs = collectPostImageRefs(path.join(POSTS_DIR, postName));
    if (refs.length === 0) continue;

    if (!fs.existsSync(distMedia)) {
      for (const ref of refs) {
        error(`dist/${postName}/media/ 目录不存在，请重新 npm run build`);
      }
      continue;
    }

    const distFiles = new Set(fs.readdirSync(distMedia));
    for (const ref of refs) {
      if (!distFiles.has(ref)) {
        error(`dist/${postName}/media/ 缺少 ${ref}（重新 npm run build 可解决）`);
      }
    }
  }

  if (hasError === hadErrorBeforeDistCheck) {
    console.log('  ✅ dist 目录检查通过');
  }
}

// 警告汇总
if (warnings.length > 0) {
  console.log(`\n⚠️  警告（${warnings.length} 条）:`);
  for (const w of warnings) {
    console.log(`  ${w}`);
  }
}

// 检查 Blog/mariozechner 中有但这里没有的文件（fix 模式）
if (showFix && fs.existsSync(MARIOZECHNER_DIR)) {
  console.log('\n🔧 检查可从 Blog/mariozechner 补充的文件...');
  for (const entry of postDirs) {
    if (!entry.isDirectory()) continue;
    const postName = entry.name;
    const localMedia = path.join(POSTS_DIR, postName, 'media');
    const remoteMedia = path.join(MARIOZECHNER_DIR, 'posts', postName, 'media');

    if (!fs.existsSync(remoteMedia)) continue;
    if (!fs.existsSync(localMedia)) continue;

    const localFiles = new Set(fs.readdirSync(localMedia));
    for (const f of fs.readdirSync(remoteMedia)) {
      if (!localFiles.has(f)) {
        console.log(`  补充: cp "${remoteMedia}/${f}" "${localMedia}/"`);
      }
    }
  }
}

console.log(''); // 空行
if (hasError) {
  console.log('❌ 图片检查失败');
} else if (warnings.length > 0) {
  console.log(`✅ 图片检查通过（有 ${warnings.length} 条警告）`);
} else {
  console.log('✅ 图片检查通过');
}
process.exit(hasError ? 1 : 0);
