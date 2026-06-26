---
title: "一篇学习 Claude Code 的好文章"
date: 2026 年 3 月 21 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "《The Shorthand Guide to Everything Claude Code》— 用最简单的语言解释 Claude Code 的各个部分。"
---

![59bc1c4af968410b7cb0703c28c03390](./media/59bc1c4af968410b7cb0703c28c03390.png)

作者致力于用最简单的言语解释Claude Code的各个部分。即使是英文，也能够流畅阅读。有时候一个句子第一遍看不明白，尝试把网页放大，让屏幕只剩下这一个句子。然后一个词一个词的读，又有豁然开朗的感觉。

最近在听谢赛宁的播客，播客中提到，恺明一个人搭起了TPU的脚手架，让整个实验室的人能够在TPU上做实验。让赛宁学习到了工欲善其事，必先利其器。最近在工作中，每天都在使用Claude Code，这句话让我意识到，我对Claude Code还不够了解，需要进一步的了解。

这段时间，Claude Code 的 Bypass Permission 是对工作效率提升最大的功能。只要开起来这个模式，Claude Code 就可以不用一直按 Enter。当然，权限越大的同时，风险也越大。有时Claude Code 会没有经过你的允许就Commit 或者 Push，所以在提示词中要多注意。

Hook 功能早有耳闻，一直没有去了解，通过这篇文章了解到了 Hook 的一些使用场景。比如说PreToolUse, PostToolUse. 从去年10月接触Claude Code到现在，终于使用上了Hook。我使用的 Hook 阻止Claude 使用 Read 读取 PDF，而是使用 PDF Skill 去读取。因为我的 Claude 模型没办法直接读取 PDF，所以每次 Read PDF 的时候模型都会卡住。因此，我经常使用 Claude Code 的 PDF Skill 去读PDF，Claude 会用 Python 的办法把 PDF 的内容抽取出来，再进行阅读。

/insight 功能 总结了我在使用 Claude Code 过程中的一些经验。它会自己归纳出我工作中的workflow，并建议我将这一部分workflow归纳为 Skill 避免重复，这一点带给我一些启发。

文章中提到一点 Commands are skills executed via slash commands. 这句话我读了几遍一直没明白。Commands 是 Skills 通过 slash commands 执行的东西？或者说 一些Commands的集合 or 一些Prompt 的集合 是 Skills 通过 slash commands？作者在这里用这句话去解释 Commnads 和 Skills 的关系。还需要看作者的详细版 Claude Code 去一探究竟。

@数字生命卡兹克 的文章《分享10个你可能不知道的Claude Code隐藏命令。》提到 /simplify. 这个功能实际体验下来不错，启用3个 subAgent 从 代码复用、质量和效率 三个方面 去 review 当前和上一次 Commit 的代码（资料来源 Claude Code 官方文章 Extend Claude with skills）。实际用下来，确实帮助我发现了不够完善的地方。

资料来源

[《The Shorthand Guide to Everything Claude Code》](https://x.com/affaan/status/2012378465664745795) -- @cogsec

[《分享10个你不知道的Claude Code隐藏命令。》](https://www.xiaohongshu.com/discovery/item/69bcd41a000000001f0025d1?source=webshare&xhsshare=pc_web&xsec_token=ABpCWE-0c4xWSHWLGqYGHQXZ08d1saDBPOJis3z6nZpfc=&xsec_source=pc_share) -- @数字生命卡兹克

[《Extend Claude with skills》](https://code.claude.com/docs/en/skills) -- Anthropic
