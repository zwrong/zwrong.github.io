---
title: "Progressive Loading for Skills: How Pi and DeepSeek Harness Do It"
date: 2026 年 9 月 25 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "In an interview I was asked: after an LLM reads a skill's description, why does it know it should go read the full skill text? Chasing that question, I took apart how Pi and DeepSeek Harness actually load skills."
---

<!-- Video placeholder: once the YouTube upload is done, swap the div below for an iframe
<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 1.5rem;">
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Skill 渐进式加载是怎么做的" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>
-->

<div style="border: 1px dashed var(--border-color); border-radius: 10px; padding: 2.5rem 1rem; text-align: center; color: var(--dimmed-text-color); margin-bottom: 1.5rem;">
The video is uploading to YouTube — the link is coming soon.
</div>

## A Question That Came Up in an Interview

In an interview once, the interviewer asked me about the principle behind progressive loading for Skills: after an LLM reads a skill's description, why does it know there's a full skill file it still needs to read?

At the time, I couldn't honestly say I understood the details 100%. After the interview I went through the skill-loading logic of both Pi and DeepSeek Harness, wanting to actually answer that "why".

## What Progressive Loading Is Actually Doing

Let's break the question down. A skill is really two parts:

1. Some metadata: `name`, `description`, and where it lives on disk, `location`.
2. The body: the full text of `SKILL.md`.

Progressive loading means splitting those two parts and feeding them into the model's context at different moments:

1. **Discovery**: the Harness scans the working directory (say `.agents/skills`; Pi also reads directories like `.pi`) and pulls out each skill's `name` and `description`.
2. **Trigger**: only when the current task matches a `description` does the model go read that skill's full text, i.e. `SKILL.md`.
3. **Deeper still**: `SKILL.md` can reference other instruction files (like `references/translate-guide.md`), which the model reads when it thinks it's necessary.

In other words, the first layer always costs "a few dozen tokens per skill", while the second and third layers only cost you when you actually use them. This post focuses on the first two layers.

The crux is the jump from the first layer to the second — **how does the model know it should go read the full text?** The answer isn't really in the model. It's in the instruction the Harness hands it.

## How Pi Does It: Everything Goes Into the System Prompt

Pi's design is fairly simple:

1. The first step is the same: read `.agents/skills` in the current working directory (and not only `.agents` — it also reads folders like `.pi`).
2. The second step: put each skill's `name`, `description`, and `location` into the **system prompt**.
3. Then attach a paragraph of instructions about skills.

That instruction is the key to the whole thing. Roughly:

> The skills that follow provide specialized instructions for specific tasks. When a task matches a skill's description, **use the read tool to load the skill's file**.

So the answer to "why does it know to read the full text after reading the description" is quite plain: because we wrote that line in the system prompt. Once the task description matches some skill's description, the model goes and reads that file with the `read` tool.

Pi's skill list looks roughly like this (wrapped in `/`, and it does have `location`):

```
available_skills

/skill
  name: translate
  description: ...
  location: .../.agents/skills/translate/SKILL.md
/skill
```

Pi uses the general-purpose `read` tool — simple and universal, with no need to invent anything special for skills.

## How DeepSeek Harness Does It: A User Message Plus a Skill Tool

DeepSeek Harness's first step is of course the same: go look for skills under `.agents`. From the second step on, the two designs diverge:

1. It puts the skill's `name` and `description` into the **context** in the form of a **user message** (not into the system prompt).
2. Then it adds an instruction: when a task matches, **use the skill tool to load that skill** and read its original text.
3. The skill tool takes one parameter — the skill's `name` — and returns the skill's `name`, its `location`, and the contents of `SKILL.md`.

Those differences grow out of where the list is placed:

- Pi writes the list into the system prompt, so it **must have `location`** for the model to read it directly with `read`.
- DeepSeek Harness goes through the skill tool, so the model only needs a `name` to fetch it back, and the **list doesn't need `location`** — the tool resolves the path itself.

|  | Pi | DeepSeek Harness |
|---|---|---|
| Where the skill list lives | system prompt | a user message (context) |
| What's in the list | `name`, `description`, `location` | `name`, `description` |
| What reads the full text | the general-purpose `read` tool | a dedicated skill tool |
| Dynamic changes | the list is built together with the system prompt | changes can be appended to the end of the conversation |

I won't judge which is better or worse here — just laying out the differences. One point is worth spelling out, though: DeepSeek Harness is built around plugins, hot loading, and constant dynamic change, so skills being added or removed can be discovered live in every round of the conversation. Because it keeps the list in a user message rather than the system prompt, that change can be **appended to the end of the conversation** instead of rewriting what came before — which means it doesn't hurt cache hit rates.

## Editing This Video With an Agent

This video was made with DeepSeek Harness's official client paired with DeepSeek V4.1.

Editing video with an Agent keeps getting more convenient. Even though DeepSeek V4.1 can't generate images, it can still grab frames out of the video for me and show me what something looked like before the change and after it — while I was adjusting the subtitles, that before/after comparison helped a lot.

It also made me think about how Jianying has been building Agent-based video editing too: what it hands the user is no longer a timeline and a professional interface, but simply a chat box. The barrier is lower, and that's a good thing.

## Some Reflections

Making this video let me feel fairly clearly that I'm doing the right thing, and it eased some anxiety.

But I've also been reflecting: am I paying too much attention to "doing the right thing" itself? Maybe I don't need to be doing things I like and believe are right every single moment? That's something I should think about from more angles.

Happy Mid-Autumn Festival, everyone!
