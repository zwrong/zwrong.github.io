---
title: "Skill 的渐进式加载：Pi 和 DeepSeek Harness 是怎么做的"
date: 2026 年 9 月 25 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "一次面试里被问到：为什么大模型读过 Skill 的 description 之后，就知道还该去读 Skill 的全文？顺着这个问题，我把 Pi 和 DeepSeek Harness 的 Skill 加载原理拆开看了一遍。"
---

<!-- 视频占位：YouTube 上传完成后，把下面的 div 换成 iframe 即可
<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 1.5rem;">
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Skill 渐进式加载是怎么做的" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>
-->

<div style="border: 1px dashed var(--border-color); border-radius: 10px; padding: 2.5rem 1rem; text-align: center; color: var(--dimmed-text-color); margin-bottom: 1.5rem;">
视频正在上传到 YouTube，链接稍后补上。
</div>

## 一次面试问出来的问题

有一次面试，面试官问到了 Skill 的渐进式加载原理：为什么大模型读了 Skill 的 description 之后，就知道还有 Skill 的原文需要去读？

当时我的回答并不能说 100% 完全理解细节。面试结束以后，我就去把 Pi 和 DeepSeek Harness 的 Skill 加载原理都翻了一遍，想把这个「为什么」真正回答清楚。

## 渐进式加载到底在做什么

先把这个问题拆开。一个 Skill 其实是两部分：

1. 一份元信息：`name`、`description`，还有它在磁盘上的位置 `location`。
2. 正文：`SKILL.md` 的全文。

所谓的渐进式加载，就是把这两部分分开、分时机地送进模型的上下文：

1. **发现**：Harness 扫描工作目录（比如 `.agents/skills`，Pi 还会读 `.pi` 之类的目录），把每个 Skill 的 `name` 和 `description` 找出来。
2. **触发**：只有当当前任务和某个 `description` 匹配时，模型才去读这个 Skill 的全文，也就是 `SKILL.md`。
3. **再往下**：`SKILL.md` 里还可以引用别的指导文件（比如 `references/translate-guide.md`），模型觉得有必要时再去读。

也就是说，第一层永远是「每个 Skill 花几十个 token」，第二层和第三层才是「用到才付钱」。今天这篇主要说清楚前两层。

关键在于第一层到第二层的那一跳——**模型凭什么知道该去读全文？** 答案其实不在模型身上，而在 Harness 塞给它的那段指示里。

## Pi 的做法：一切装进 system prompt

Pi 的设计比较简洁：

1. 第一步是一样的，读取当前工作目录下的 `.agents/skills`（不止 `.agents`，它还会读 `.pi` 之类的文件夹）。
2. 第二步，把每个 Skill 的 `name`、`description`、`location` 装进 **system prompt**。
3. 然后附上一段关于 Skill 的指示。

那段指示是整件事的关键，大意是：

> 接下来的这些 skills 为特定任务提供专门的指导。当任务匹配某个 skill 的 description 时，**使用 read 工具去加载 skill 的文件**。

所以「读了 description 之后为什么知道要去读全文」这个问题的答案就很直白了：因为我们在 system prompt 里写了这句话。任务的描述和某个 Skill 的 description 匹配上了，模型就去用 `read` 工具把那个文件读出来。

Pi 的 Skill 清单大致长这样（用 `/` 包起来，`location` 是有的）：

```
available_skills

/skill
  name: translate
  description: ...
  location: .../.agents/skills/translate/SKILL.md
/skill
```

Pi 用的是通用的 `read` 工具，简单、通用，也不需要为 Skill 单独发明什么。

## DeepSeek Harness 的做法：一条 user message 加一个 skill 工具

DeepSeek Harness 的第一步当然也是一样的，去 `.agents` 下面发现有没有 skills。从第二步开始，两者的设计就不一样了：

1. 它把 Skill 的 `name` 和 `description` 以一条 **user message** 的形式装进 **context**（不是装进 system prompt）。
2. 后面再跟一条指示：任务匹配的时候，**使用 skill 工具去加载这个 skill**，去读它的原文。
3. skill 工具接收一个参数——Skill 的 `name`；返回的内容则是 Skill 的 `name`、`location`，以及 `SKILL.md` 的内容。

差异其实是从「装在哪里」这一层长出来的：

- Pi 把清单写进 system prompt，所以**必须有 `location`**，模型才能直接用 `read` 去读。
- DeepSeek Harness 走的是 skill 工具，模型只需要 `name` 就能把东西取回来，**清单里不需要 `location`**，路径由工具自己去解析。

|  | Pi | DeepSeek Harness |
|---|---|---|
| Skill 清单放在哪 | system prompt | 一条 user message（context） |
| 清单里有什么 | `name`、`description`、`location` | `name`、`description` |
| 用什么读全文 | 通用的 `read` 工具 | 专门的 skill 工具 |
| 动态变化 | 清单随 system prompt 一起构建 | 变化可以追加到对话末尾 |

这里不评判谁优谁劣，只是把两者的不同点摆出来。不过有一点值得多说一句：DeepSeek Harness 主打的是插件化、热加载，Skill 的增加或减少是可以在每一轮对话里实时发现的。因为它把清单放在 user message 而不是 system prompt 里，这份变化可以**追加到对话的末尾**，而不必回头改动前面的内容——这样也就不会影响缓存的命中率。

## 用 Agent 剪这次的视频

这次的视频是用 DeepSeek Harness 的官方客户端搭配 DeepSeek V4.1 做的。

我感觉 Agent 剪视频越来越方便了。即便 DeepSeek V4.1 不能生成图片，它也能帮我截取视频里的帧，然后告诉我修改前是什么样、修改后是什么样——我调字幕的时候，这个「前后对比」帮了很大的忙。

这也让我想到剪映最近也在做 Agent 剪视频：交给用户的不再是一个时间轴、一套专业界面，而就是一个简单的对话框。门槛被拉低了，这是好事。

## 一点感受

做这个视频的过程，让我比较明确地感觉到自己是在做正确的事情，也缓解了一些焦虑。

不过我也在反思：自己是不是有点过于关注「做对的事情」本身了？是不是并不需要时时刻刻都在做自己喜欢的、正确的事情？可能需要多角度再想想。

祝大家中秋节快乐！
