---
title: "Why Can't Agents Compress Proactively?"
date: 2026 年 5 月 5 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "Does a 200K window actually outperform a 1M one? An Agent's context anxiety, and the hypothesis of proactive compression."
---

Context compression is always treated as an obstacle to an Agent finishing its task, and I felt the same in practice. In one test I accidentally forgot to turn on Claude Opus 4.6's 1M context window, and let the model run the test with a 200K window. The result was unexpected: with a 200K window the Agent performed excellently, with no false-positive problems. Why?

Let's first look at what my task was.

My task was to have the Agent test, per keyboard accessibility rules, whether every element on a web page can be reached via the keyboard. For example, can the "Login" button on a page be selected with the keyboard and activated with Enter to complete login? This used to be a human job; now I wanted to try having the Agent do it automatically.

What capabilities does this task need?

1. A 1M context window. Because if the Agent's context window fills up and auto-compresses mid-test, the test fails.
2. Instruction following. The whole testing task has multiple stages, each with tasks the Agent has to complete. For such a cross-stage long-horizon task, the Agent's instruction-following declines as the context grows. Say the testing task has five stages — when the Agent reaches the fourth, can it still keep following the rules it set at the start?

In practice, the Agent always hallucinates at the hardest stage. First, what "hard" means here: one, under the existing Context pressure, the Agent keeps completing the test step by step according to the rules set at the start, without skipping; two, in a long-horizon task the Agent still persists after one or two failed attempts; three, any conclusion the Agent draws needs concrete experiment records as evidence — it can't just infer a conclusion out of thin air. And "hallucinate" here means the Agent decides the information it has is enough, that no further experiments are needed, and just draws a conclusion. My definition of an Agent here: an Agent is a combination of a model and a framework.

In the end, the reason the Agent could complete the test reliably was that I handed the Agent the "answer", giving it enough domain knowledge about the test pages, reducing wrong attempts and therefore the hallucinations those wrong attempts produce. I was happy the Agent got the "answer" and could finish the test consistently. But I was also sad. Because I'd always hoped that through a simple, general approach, an Agent could complete most testing tasks without much manual tuning — that the Agent would have this thing called "generalization". But for this single test case I'd already slipped the Agent some "cheat sheets" so it could finish. So what next — do I keep feeding it more cheat sheets? Every gain has a loss: I think the more you give an Agent, the more it becomes redundant as model capability grows, and the more it limits the Agent's overall capability.

But, as I mentioned at the start, Opus 4.6 with a 200K context window actually performed better. Why? At the time, the Agent's context window happened to fill up right before the hardest stage and auto-compressed. After compression, the Agent wrote out a more detailed task checklist (To Do List) for the current stage. For the first time, facing the hardest stage, the Agent wrote detailed execution steps. And it went through the whole test step by step according to the checklist, without skipping. I think there are two possible reasons. First, the Agent's context anxiety was relieved. When the Agent's context window is close to full, or when a long-horizon task is near its end (here we'd need to define what a long-horizon task is), the Agent gets very anxious to wrap up. It shows up as the Agent always saying it already has enough information and doesn't need to keep running more experiments, when in fact the conclusion has no experimental support and isn't convincing. I first learned that models get context anxiety from an interview with Ji Yichao; this was my first time feeling it in practice. Second, the Agent had a more detailed task checklist. This reminded me of how Spec works — agreeing on a task plan with the Agent in advance and laying out a detailed checklist to execute.

So if an Agent never does all that well on long-horizon tasks — skipping steps, looking for loopholes — is it possible to compress proactively once when facing a harder problem or stage, and raise the probability the Agent completes the task?
