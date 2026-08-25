---
title: "Constraints Aren't Flaws — They're the Source of Reliability"
date: 2026 年 3 月 31 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "Capability boundaries are architecture boundaries. A Subagent with five tools is more reliable than one with fifty."
---

Sharing a worthwhile article.

Excerpts from "[How Claude Code Shapes Harness Engineer Design](https://zhuanlan.zhihu.com/p/2021603278606087058)":

The more counterintuitive side is that the design of an MCP toolset is also actively limiting Claude's range of action. Claude doesn't have a `delete_user_data` tool, so that operation is technically impossible — not because you wrote "don't delete user data" in the Prompt, but because that capability simply doesn't exist in the toolset. **Capability boundaries are architecture boundaries.** This is the same thing as the principle of least privilege in software engineering, just applied to an Agent's tool design.

Good MCP tools filter information on the server side, returning only what Claude actually needs this time. **A tool's output design matters as much as its input design.**

But you'll still occasionally hit this: Claude says "done", yet when you check, the tests didn't run, or it ran the wrong test suite.

The reason: **"please make sure the tests pass" is a linguistic request, not a mechanical constraint.** The reliability of a linguistic request is probabilistic. At the end of a long task, after a lot of context has been consumed, its weight gets diluted. Claude isn't deliberately disobeying — at the end of a complex reasoning chain it just "feels" fine and declares the task complete.

Hook solves this.

Lately at work I keep running into Claude thinking the task is done when it isn't. When things get hard it wants to take a shortcut and rush through. Every time the context window nears its limit it starts to panic and wants to end the task quickly. Reading this article made me realize Hook might be the answer.

Of course, the line that stuck with me most is: "Constraints aren't flaws — constraints are the source of reliability."

A Subagent with a toolset of five tools is more reliable than one with a toolset of fifty — not because it's less capable, but because there are fewer paths where things can go wrong.

I often want to give Agents more tools, more vision. But I have to deeply realize that every capability I add forces a tradeoff in task completion time and token (keeping up with current events) consumption. What I should focus on more is: which tools in the Agent right now are truly necessary? If I remove that capability, can the Agent still run normally? (Recalling [the interview between Zhang Xiaojun and Peak Ji](https://www.bilibili.com/video/BV1knvYBDEjs/?share_source=copy_web))
