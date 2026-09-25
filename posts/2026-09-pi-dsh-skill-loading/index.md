---
title: "手撕 Skill 渐进式加载"
date: 2026 年 9 月 25 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "有一次面试问到了 Skill 的渐进式加载原理：为什么 LLM 读了 description 以后，知道还有 Skill 的原文要去读？顺着这个问题，我探索了 Pi 和 DeepSeek Harness 的 Skill 加载原理。"
---

<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 1.5rem;">
<iframe src="https://player.bilibili.com/player.html?bvid=BV1PrhU6tEcZ&autoplay=0&high_quality=1&danmaku=0" title="手撕 Skill 渐进式加载" frameborder="0" scrolling="no" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>

## 启发

有一次面试问到了 Skill 的渐进式加载原理：「面试官问说为什么 LLM 读了 description 以后，知道还有 Skill 的原文要去读？」一时间发现自己并不是能够 100% 完全理解细节地答出来，于是就去探索一下 Pi 和 DeepSeek Harness 他们的 Skill 加载原理。

## 两个 Harness 的设计

我觉得 Pi 它的设计是比较简洁的，使用 `read` tool 就可以去读取 Skill.

DeepSeek Harness 因为主打的是插件化、热加载、经常动态变化的一个 Harness，所以说它会有专门的一个 Skill 的工具去读取这个 Skill。同时 Skill 的变化、增加或者减少，也是实时可以在每一轮的对话里面发现的，同时可以追加到对话的末尾，这样就不会影响缓存的命中率。

## Agent 剪视频

这次的视频是通过 DeepSeek Harness 的官方客户端搭配 DeepSeek V4.1 做的。

我觉得 Agent 剪视频越来越方便了。即便 DeepSeek V4.1 它不能够生成图片，但它可以帮我截取视频的图片，然后告诉我修改前是怎么样，修改后是怎么样，就在我调整字幕的时候。

让我想到最近剪映也在做 Agent 剪视频，给到用户的不再是一个时间轴，那种专业的界面，而是就是一个简单的对话框，降低视频剪辑的门槛。

## 感受

做这个视频能够让我明确的感觉到在做正确的事情，能够缓解一些焦虑。其实也在思考自己是不是有点过于关注做对的事情本身了，实际上也不一定需要时时刻刻都在做自己喜欢的正确的事情？需要多角度想想。

祝大家中秋节快乐！
