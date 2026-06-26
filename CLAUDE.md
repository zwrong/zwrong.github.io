# Workflow

After every code change:
1. Run `npm run build` to rebuild the static site
2. Run `npm test` to verify all referenced images exist in source and dist
3. Stage changed files and commit with a descriptive message

# Recommended Reading / Viewing

- `date` must be the original publication date of the recommended article, not the date of the blog post that mentions it. Always fetch the actual publish date from the source URL.
- Sort: newest first (already handled by code).
- Thumbnail images go in `recommended-media/` with clean lowercase kebab-case names (e.g. `linus-opinion-ai.png`). Reference as `/recommended-reading/media/filename.png`.
- After adding/modifying thumbnails, run `npm run build` — the `recommended-media/` directory is automatically copied to `dist/recommended-reading/media/`.
- For remote thumbnails (external URLs), use the full URL directly in the `thumbnail` field.
