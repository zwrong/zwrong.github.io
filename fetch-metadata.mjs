import { readFileSync, writeFileSync } from 'fs';

// The 5 recommended URLs to fetch metadata from
const urls = [
  {
    label: "Linus's opinion on coding in the AI Era",
    url: "https://x.com/IntCyberDigest/status/2069512370217488423",
  },
  {
    label: "What I learned building an opinionated and minimal coding agent",
    url: "https://mariozechner.at/posts/2025-11-30-pi-coding-agent/",
  },
  {
    label: "从 Claude Code 看 Harness Engineer 的设计",
    url: "https://zhuanlan.zhihu.com/p/2021603278606087058",
  },
  {
    label: "The Shorthand Guide to Everything Claude Code",
    url: "https://x.com/affaan/status/2012378465664745795",
  },
  {
    label: "Thoughts on Slowing the Fuck Down",
    url: "https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/",
  },
];

async function fetchMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetadataFetcher/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i);
    const ogImageMatch2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*\/?>/i);

    // Extract twitter:image
    const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i);

    // Extract og:site_name
    const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i);

    const image = ogImageMatch?.[1] || ogImageMatch2?.[1] || twitterImageMatch?.[1] || '';
    const siteName = siteNameMatch?.[1] || '';

    return { image, siteName };
  } catch (err) {
    return { error: err.message };
  }
}

async function main() {
  console.log('Fetching metadata for', urls.length, 'URLs...\n');

  const results = [];
  for (const item of urls) {
    process.stdout.write(`  ${item.label}... `);
    const meta = await fetchMetadata(item.url);
    console.log(meta.error ? `❌ ${meta.error}` : '✅');
    results.push({
      label: item.label,
      url: item.url,
      thumbnail: meta.image || '',
      siteName: meta.siteName || '',
      error: meta.error || null,
    });
  }

  console.log('\n--- Results ---\n');
  for (const r of results) {
    console.log(`\n${r.label}`);
    console.log(`  URL:       ${r.url}`);
    if (r.thumbnail) console.log(`  Thumbnail: ${r.thumbnail}`);
    if (r.siteName) console.log(`  Site:      ${r.siteName}`);
    if (r.error) console.log(`  Error:     ${r.error}`);
  }
}

main().catch(console.error);
