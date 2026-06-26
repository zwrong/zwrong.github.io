---
name: blog-publish
description: >-
  Publish a new blog post to the Mario Zechner-style static site. Given a markdown file and optional images, this skill sets up the post directory, processes custom containers (callout, evidence, diagram), handles image paths, builds the site, launches a preview, and commits to git. Use this whenever the user says "publish this post", "add a new article", "发一篇博客", "发布新文章", or hands you a markdown file for their blog.
read_when:
  - User provides a markdown file and asks to publish it as a blog post
  - User says "发一篇博客", "发布新文章", "publish post", "add new article"
  - User wants to convert a markdown file into a fully rendered blog page
  - User asks to add a new post to their personal blog
  - User references "发布流程" or "博客" in context of adding content
---

# blog-publish — Publish a blog post to the Mario Zechner-style static site

## Project root
```
/Users/vinen/Documents/Vscode_Homepage/Blog/mariozechner/
```

## Directory structure
```
mariozechner/
├── build.js             # Static site generator (Node.js)
├── package.json         # Dependencies: gray-matter, markdown-it
├── style.css            # Site styles (VS2015 code theme, Claude warm bg)
├── template.html        # Post page template
├── index-template.html  # Homepage template
├── components.js        # Theme toggle web component
├── posts/               # ← Post content goes here
│   └── YYYY-MM-slug-name/
│       ├── index.md         # Post content + frontmatter
│       ├── agent-trace-rounds.md  # Optional: evidence file
│       └── media/           # Images referenced in the post
└── dist/                # Built output (auto-generated)
    ├── index.html
    └── YYYY-MM-slug-name/
        ├── index.html
        └── media/
```

## Frontmatter format

Every `index.md` MUST start with this frontmatter:

```yaml
---
title: "文章标题"
date: 2026 年 6 月
footerLine: "Vinen's Blog — 描述 · 写于 2026 年 6 月"
---
```

Only these three fields are required. Do NOT add extra frontmatter fields.

## Full publish workflow

### Step 1: Choose the slug

Pick a short English kebab-case slug that summarizes the post topic. Format: `YYYY-MM-slug-name` (use the current month/year).

**Examples:**
- `2026-06-harness-solve-problems`
- `2026-07-agent-hallucination`
- `2026-07-obelisk-execution-memory`

### Step 2: Create the post directory

```bash
cd /Users/vinen/Documents/Vscode_Homepage/Blog/mariozechner
mkdir -p posts/YYYY-MM-slug-name/
```

### Step 3: Write index.md with correct frontmatter

- Copy the user's markdown content into `posts/YYYY-MM-slug-name/index.md`
- Prepend proper frontmatter (title, date, footerLine)
- Preserve ALL original markdown content — do not edit, summarize, or improve the writing

### Step 4: Handle images

If the markdown contains image references like `![alt](./path/to/image.png)`:

1. Find the actual image files — they may be at the path given, or alongside the markdown file the user provided
2. Create `posts/YYYY-MM-slug-name/media/` directory
3. Copy images into `posts/YYYY-MM-slug-name/media/`
4. **Update ALL image paths** in `index.md` from `./xxx/xxx.png` to `./media/xxx.png`

**Important:** Use `sed` or search-and-replace to batch-update paths. Do NOT manually rewrite paths.

### Step 5: Handle custom containers

The user's markdown may contain special containers. Handle them as follows:

#### `::: callout`
```markdown
::: callout
Quote text here
:::
```

These render as blockquotes with a left border. **Leave them as-is** in the markdown — the build script handles them.

#### `::: evidence filename.md "description"`
```markdown
::: evidence agent-trace-rounds.md "4 轮 Agent 运行轨迹"
Intro text here
:::
```

These reference an external markdown file that should be rendered inline as regular content.
1. Locate `filename.md` — should be alongside the main markdown file
2. Copy it into `posts/YYYY-MM-slug-name/` (same directory as index.md)
3. **Leave the evidence container as-is** in index.md — the build script handles it
4. If the evidence file contains images, update their paths to `./media/xxx.png` too

#### `::: diagram filename.svg`
```markdown
::: diagram schema.svg
Caption text
:::
```

These are **ignored** — the build script skips them. Leave as-is.

### Step 6: Verify media directory

After copying images, verify the media folder has all referenced files:

```bash
ls posts/YYYY-MM-slug-name/media/
```

Then verify image paths in index.md reference `./media/`:

```bash
grep '\./media/' posts/YYYY-MM-slug-name/index.md
```

### Step 7: Build

```bash
cd /Users/vinen/Documents/Vscode_Homepage/Blog/mariozechner
node build.js
```

Check for errors. If the build fails, debug and fix before proceeding.

### Step 8: Preview (optional)

Start a local HTTP server to preview:

```bash
cd dist && python3 -m http.server <port>
```

Open `http://localhost:<port>` in a browser. Check:
- Homepage shows the new post in the list
- Post page renders correctly
- Images load properly
- Code blocks have syntax highlighting
- TOC links work
- Tables look correct

### Step 9: Commit

```bash
git add -A
git commit -m "Add post: slug-name"
```

## Style reference

When previewing, verify these style details:

| Element | Style |
|---|---|
| Code blocks (TS/JS) | Dark background #1e1e1e, VS2015 syntax colors |
| Terminal/bash output | Light bg #f5f5f5, dark text |
| Tables | Centered, bottom border, 0.9em font |
| Blockquotes | 0.9rem font, 2px left border (`--border-color`) |
| Inline code | No border, subtle gray bg, 3px radius |
| Body text | letter-spacing: 0.008em, line-height: 1.85 |
| Headings | letter-spacing: -0.01em (h1/h2) |
| Body font | Times New Roman → Source Han Serif SC → serif |
| Dark bg | `--background-color: #222226` |
| Light bg | `--background-color: #faf9f5` (Claude warm cream) |
| Theme default | Dark mode |
| TOC | Heading is "目录", no underlines on links |

## Common pitfalls

1. **Image paths must be `./media/xxx.png`** — not absolute paths, not relative paths pointing elsewhere. The build script copies `media/` to `dist/` preserving the structure.
2. **Evidence files** (`::: evidence`) reference a separate `.md` file. This file must exist in the post directory. If the evidence file references images, those paths must also be updated.
3. **Do NOT modify the user's writing.** Only add frontmatter, fix image paths, and handle containers. The content itself should be preserved verbatim.
4. **The homepage auto-updates** — `build.js` scans `posts/` on every build, so new posts appear on the homepage automatically. No need to manually update index.html.
5. **If the user gives you a PDF** or other non-markdown format, extract the markdown content and convert images separately.
