---
title: "Teardown Skill Progressive Loading"
date: 2026 年 9 月 25 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "An interview once asked me about the principle behind Skill progressive loading: why does the LLM know, after reading the description, that there is still the Skill's original text to go read? So I went and explored how Pi and DeepSeek Harness load their Skills."
---

<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 1.5rem;">
<iframe src="https://www.youtube.com/embed/4kbqfCJlkgI" title="Teardown Skill Progressive Loading" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>

## Inspiration

An interview once asked me about the principle behind Skill progressive loading: &quot;Why does the LLM know, after reading the description, that there is still the Skill's original text to go read?&quot; For a moment I realized I couldn't explain the details with 100% certainty, so I went and explored how Pi and DeepSeek Harness load their Skills.

## Two Harness designs

I think Pi's design is fairly clean — you can read a Skill with the `read` tool. DeepSeek Harness is a Harness that emphasizes plugins, hot loading, and frequent dynamic change, so it has a dedicated skill tool for reading a Skill. Changes to Skills — additions or removals — can also be discovered in real time in every round of the conversation, and appended to the end of the conversation, so it doesn't hurt the cache hit rate.

## Agent video editing

This video was made with the official DeepSeek Harness client plus DeepSeek V4.1. I feel that Agent video editing is getting more and more convenient. Even though DeepSeek V4.1 can't generate images, it can grab frames from the video for me and tell me how it looked before the change and how it looks after, while I'm adjusting the subtitles. That makes me think of how Jianying is also working on Agent video editing — what it gives users is no longer a timeline, that kind of professional interface, but just a simple chat box, lowering the barrier to video editing.

## Feeling

Making this video lets me feel clearly that I'm doing the right thing, and it eases some of my anxiety. I'm actually also wondering whether I pay too much attention to doing the right thing itself — do I really need to be doing the right thing at every moment? I need to think about it from more angles.

Happy Mid-Autumn Festival, everyone!
