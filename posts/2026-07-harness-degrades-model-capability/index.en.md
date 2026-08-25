---
title: "Harnesses Can Degrade Model Capability"
date: 2026 年 7 月 11 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "Better models and better harnesses should reinforce each other, but when a model overfits to one harness, its capability on other harnesses actually degrades."
---

The author of Flask (who also maintains Pi) published a blog post, [Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/). He found that Opus 4.8 frequently failed to call the Edit tool when used on Pi. I think this is a counterintuitive phenomenon in an era when harnesses and models are trained together and improve together. Harness progress can train better models, and better models can drive better harnesses. That ideal has a cost: a model may overfit to one harness and degrade in its performance on other harnesses.

## Why Does Model Capability Degrade?

Across large-scale training on agent traces, models also learn from erroneous tool calls. Claude Code has fault-tolerance and repair mechanisms for bad tool calls, which creates an illusion for the model: "I don't need to follow the tool-calling rules that strictly. I can write it this way or that way, and the task still gets done." This means that during RL training, the model isn't penalized enough for incorrect tool calls.

So could we reduce the distribution of erroneous tool-call data in agent traces to ease the problem? But similar to [Manus's practice on Context Engineering](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus), which keeps the agent's failure experiences in the Context, I think simply reducing such data won't be enough — we need to penalize the model.

## What Makes a Good Harness?

What makes a good harness? For the user, if I see the model get the job done, then the model is impressive — I don't care much about the bumps along the way. So from a user-experience perspective, a harness with fault-tolerance and repair mechanisms is good. It lets the model always call tools correctly, complete tasks smoothly, and reduces the cost of exploring wrong paths.

For the model, a model that calls tools correctly and follows the Tool Schema is a good model. If during training a model learns that it can successfully call tools without strictly following the Tool Schema, that experience is bad for it — it will stop obeying the Tool Schema. So under these conditions, a harness's fault-tolerance and repair mechanisms are bad for the model.

## The Authority of SOTA Models

Anthropic's models and its harness (Claude Code) are both closed-source, so we can't know whether Anthropic let this happen deliberately or by accident. What is certain is that it's bad news for other harnesses. To get the best out of Anthropic's models, other harnesses could adapt to Claude Code's Tool Schema — but we don't know how Claude Code's Tool Schema is designed. When we're forced to use the same company's model and harness, we end up in a passive position. That company gains the power to control what people do. This is the authority of SOTA models.
