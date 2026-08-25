---
title: "A Great Article for Learning Claude Code"
date: 2026 年 3 月 21 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "\"The Shorthand Guide to Everything Claude Code\" — explaining Claude Code's parts in the simplest words."
---

![59bc1c4af968410b7cb0703c28c03390](./media/59bc1c4af968410b7cb0703c28c03390.png)

The author is committed to explaining Claude Code's parts in the simplest language. Even in English, it reads smoothly. Sometimes a sentence doesn't make sense on the first read — try zooming in on the page so only that sentence remains on the screen, then read it word by word. Suddenly it all becomes clear.

I've been listening to Xie Saining's podcast. He mentioned that Kaiming single-handedly set up the TPU scaffolding, letting everyone in the lab run experiments on TPUs. It taught Saining the principle: to do good work, you must first sharpen your tools. I use Claude Code every day at work, and this remark made me realize I don't understand Claude Code well enough yet and need to dig deeper.

Lately, Claude Code's Bypass Permission has been the biggest productivity boost. Once you turn this mode on, Claude Code no longer makes you keep pressing Enter. Of course, more permissions also mean more risk. Sometimes Claude Code will commit or push without your permission, so be careful with your prompts.

I'd heard of the Hook feature but never got around to learning about it. This article introduced me to some Hook use cases, such as PreToolUse and PostToolUse. I've been using Claude Code since last October, and I finally started using Hook. The Hook I use blocks Claude from reading PDFs with Read and instead makes it use the PDF Skill. Since my Claude model can't read PDFs directly, it gets stuck every time it tries to Read a PDF. So I often use Claude Code's PDF Skill to read PDFs — Claude extracts the PDF content with Python and then reads it.

The /insight feature summarized some of my experience using Claude Code. It worked out the workflow in my work on its own and suggested I condense that part of the workflow into a Skill to avoid repeating it. That gave me some inspiration.

The article mentions a point: Commands are skills executed via slash commands. I read that sentence several times and couldn't understand it. Are Commands things that Skills execute via slash commands? Or is a collection of Commands, or a collection of Prompts, what Skills execute via slash commands? The author uses this sentence to explain the relationship between Commands and Skills. I'll need to read the author's detailed Claude Code guide to figure it out.

@数字生命卡兹克's article "Share 10 hidden Claude Code commands you don't know" mentions /simplify. In practice, this feature works quite well. It launches 3 subAgents to review the current and previous commit's code from three aspects: code reuse, quality, and efficiency (source: Claude Code's official article Extend Claude with skills). Using it, it did help me find areas that weren't polished enough.

Sources

[《The Shorthand Guide to Everything Claude Code》](https://x.com/affaan/status/2012378465664745795) -- @cogsec

[《分享10个你不知道的Claude Code隐藏命令。》](https://www.xiaohongshu.com/discovery/item/69bcd41a000000001f0025d1?source=webshare&xhsshare=pc_web&xsec_token=ABpCWE-0c4xWSHWLGqYGHQXZ08d1saDBPOJis3z6nZpfc=&xsec_source=pc_share) -- @数字生命卡兹克

[《Extend Claude with skills》](https://code.claude.com/docs/en/skills) -- Anthropic
