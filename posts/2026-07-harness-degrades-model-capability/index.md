---
title: "Harness 会退化模型能力"
date: 2026 年 7 月 11 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "更好的模型和更好的 Harness 本应互相促进，但模型过度适配一个 Harness 后，在其他 Harness 上的能力反而退化了。"
---

Flask 的作者（同时也是 Pi 的维护者），发布了一篇博客[《Better Models: Worse Tools》](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/)。他发现 Opus 4.8 在 Pi 上使用的时候经常会出现 Edit 工具的调用失败。我觉得这正是 Harness 和模型，共同训练，一起进步的今天，一个反直觉的现象。Harness 的进步能够训练出更好的模型，更好的模型能够促进 Harness 的发展。这样的理想是有代价的，模型可能会过多适配一个 Harness，而在其他 Harness 的表现上退化。

## 为什么模型的能力会退化？

在大量的 Agent 轨迹训练中，工具的错误调用也被模型学习到了。Claude Code 对工具的错误调用有容错修复的机制，这样会让模型产生一种幻觉，模型可能会觉得："原来我不用那么严格地去遵守工具的调用，我这样写，那样写，最终任务都能够完成。"这使得模型在 RL 训练中，对工具错误调用的惩罚不够。

所以是不是可以在 Agent 轨迹里面减少工具错误调用这部分数据的分布来缓解这个问题？但是类似于 [Manus 在 Context Engineering 上的实践](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)，他们在 Context 中保留了 Agent 的失败经验。我认为单纯的让这类数据减少可能还不足以解决问题，我们需要对模型进行惩罚。

## 什么是好的 Harness？

什么样的 Harness 是好的 Harness？对于用户来说，我看到模型帮我把事情做好了，那这个模型就是厉害的，至于模型中间经历了怎样的波折我并不会太关心。所以从用户体验的角度来看，Harness 有容错性修复机制是好的。因为这可以让模型总是能够正确地调用工具，流畅地完成任务，减少错误探索的成本。

对于模型来说，一个总是能够正确调用工具，遵守 Tool Schema 的模型是一个好的模型。模型在训练过程中，发现自己不用那么严格遵守 Tool Schema 也能够成功调用工具，这样的经验对模型是不好的，模型会不遵守 Tool Schema。所以 Harness 的容错性修复机制在这种条件下对模型来说是不好的。

## SOTA 模型的权威

Anthropic 的模型和 Harness （Claude Code）都是闭源的。我们无从得知 Anthropic 是有意还是无意地让模型出现这种情况。可以肯定的是，这对于其他 Harness 来说是一个坏消息。为了能让 Anthropic 的模型有更好的发挥，其他 Harness 可以选择适配 Claude Code 的 Tool Schema，但是我们却不知道 Claude Code 的 Tool Schema 是怎么设计的。当我们不得不用同一家的公司的模型和 Harness 时，我们就会处在一个被动的位置。这家公司就有权力去控制人们的行为，这是 SOTA 模型的权威。
