---
title: "好 Prompt 不如好 Harness"
date: 2026 年 5 月 26 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "Prompt 是软约束，Harness 是硬约束。从 Claude Code 到 Opencode，看 Hook 如何在关键时刻阻止 Agent 犯错。"
---

我的需求是这样的，我需要在 OpenCode 里面使用 Deepseek V4 Pro 的模型，但是这个模型不支持读图片，所以导致我在 OpenCode 里面使用 Deepseek 的时候，总是看不了图片，显示图片无法处理。我的想法是我可以用 Gemini，我可以把图片的理解交给 Gemini.

在我使用Claude Code的过程中，我熟知的Agent读图的方式有两种：

1. 通过调用Read工具读取图片
2. 用户在输入框中粘贴图片发给模型。

这两种方式的区别在于"调用Read工具"是Agent主动的；"粘贴图片"是用户主动给Agent看的，Agent是被动的。

什么时候Agent会用Read工具读图？当图片在文件系统中，Agent要去读取的时候就会调用Read工具。（这是我个人使用Claude Code时的体验）

但是当我在输入框中粘贴图片发给模型的时候，这时Agent不会调用Read工具。

> Ps: 当图片出现在输入框的时候，模型是怎么收到图片的？为什么模型不用Read工具读图？通过Read读图和通过剪贴板读图有什么区别？是不是Coding Agent可以统一成Read读图会更好？

## Claude Code中读图

所以，之前我在 Claude Code 上的方案是设置一个 ToolBeforeUseHook 在调用工具前进行拦截的Hook。这个Hook是这样设计的，只要Agent使用Read工具读PNG, JPG 等图片文件后缀的时候就进行拦截，拒绝让 Agent 调用 Read 工具。提示模型需要 Gemini -p 的方式去读取图片进行理解。

但是在这种方式没办法拦截在剪贴板复制图片给 Claude Code 的方式。而 Claude Code 也没有提供类似于 AgentUserPromptHook 这样的 Hook（在用户输入 Prompt 以后，对 Prompt 可以进行再修改），这个需求就被暂时搁置了。替代方案就是把图片粘贴到当前工作区目录下，提示模型去读。

## 在Opencode中读图

因为在Opencode中切换模型实在是太方便了，于是开始尝试在Opencode中使用 Deepseek。 Deepseek不能读取图片，所以同样有用Gemini读取图片的需求。

Read读图显然可以用ToolBeforeUseHook，但是剪贴板读图有办法能解决吗？于是我开始研究Opencode中有哪些Hook可以使用。

## 为什么不用 Prompt 解决？

当时有一个更简单的方案：

直接在 opencode 的 `AGENTS.md` 里写一条规则：

> 如果遇到图片，就用 Gemini CLI 读取图片路径，不要让当前模型直接处理图片。

这让我想起了黄超老师的观点："如果能用一句Prompt解决问题是最厉害的。"但 Prompt 的问题是，它没有任何保障。

`AGENTS.md` 本质上还是一段Prompt。它在短任务里可能有效，因为上下文还小，Agent还能稳定注意到它。但一旦任务变长，上下文开始增长，这条规则就容易被 Agent 遗忘。

这就是我一定要用 Hook 的原因。Hook 不是在请求模型"你记得要这样做"，而是直接拒绝图片进入 Context。

这两者差别很大。`AGENTS.md` 是Prompt层面的弱约束。 Hook 是 Harness 层面的强约束。

如果只靠 `AGENTS.md`，图片仍然可能被直接发给Agent。当前Agent看到它之后，可能尝试直接处理，也可能失败，也可能产生一个看起来像处理过但其实没有证据的回答。

而 Hook 会在发送前做两件更硬的事情：

1. 把图片写到磁盘，生成稳定路径
2. 注入一段当前对于图片理解的 Gemini 指令

这样 Agent 不是在很长的 Context 里回忆"以前系统说过什么"，而是在当前这条消息里直接看到：

```text
Image cache files:
  [Image 1] /Users/.../image-cache/ses_xxx/msg_xxx-image-1.png

To analyze these images, use Gemini CLI with the absolute path in the prompt:
  gemini -p "描述这张图片 /Users/.../msg_xxx-image-1.png" -o text
```

这条指令是动态生成的，带着真实路径，出现在最需要它的那一刻。

我觉得这就是 Hook 相比 `AGENTS.md` 的本质优势：

不是把规则写得更清楚，而是让Agent不要犯错误，不给Agent犯错误的机会。

长程任务里，可靠性不能只依赖模型记忆。尤其是图片理解这种能力边界明确的任务，如果当前模型不能看图，就不应该让它有机会假装自己看了图。

所以这个 Hook 其实也在拦截一种 agent 行为：不要直接读图片，不要把图片当成当前模型原生可处理的输入，而是把它转成一个明确的外部工具调用。

## Opencode 的插件

有趣的是 Opencode 中的 Hook 不叫 Hook，叫 plugin 插件。但在这里我们先继续叫它 Hook。

在 Opencode 中有一个 Hook 叫 chat.message 印象里这个 Hook 的触发时机是在将用户的 Prompt 跟历史对话消息组装之前，在用户输入Prompt以后。这个时机对我们来说很重要，因为它可以帮助我们让Agent在关键的时刻停下来。

停下来以后，我们需要思考 Agent 在此刻要做什么。Gemini读图片需要把图片的存储位置给它，而图片在剪贴板里要怎么把图片给到Gemini？ 基于这一点，我们需要深入研究当我们在 Opencode 输入框粘贴图片的那一刻发生了什么，为什么输入框会显示【Image 1】？

在研究过程中，发现Opencode是使用 osascript 读取了Mac系统中当时剪贴板的内容，获取到图片，把图片存到 RAM 中。所以，当时的第一个想法是跟Opencode一样使用 osascript 读取图片，把当前图片存到某个地方，让 Gemini 去读。但这样的问题在于，当我在输入框中粘贴了多张照片，osascript 只保存了最后一张图片。比如说我们在 Opencode 的输入框中输入了这样一段Prompt："请帮我识别【Image 1】【Image 2】和【Image 3】的内容。"这时，通过 osascript 只能获取到【Image 3】这张图片，不能获取到【Image 1】和【Image 2】。

但是 Opencode 在发给模型的时候肯定是三张图片一起发过去的，所以我在思考有没有可能利用上 OpenCode 本身存储图片的一些机制去做这个事情。接着我尝试把 OpenCode 的源码发给 Agent，让 Agent 去探索。最后发现OpenCode 确实有这种机制，它是把图片按照 FilePart 的形式存储起来的。

## FilePart是什么？

```typescript
  export type FilePart = {
    id: string              // 框架分配的唯一 ID，如 "prt_xxx"
    sessionID: string       // 会话 ID，如 "ses_xxx"
    messageID: string       // 消息 ID，如 "msg_xxx"
    type: "file"            // 固定值
    mime: string            // MIME 类型，"image/png" / "image/jpeg" / ...
    filename?: string       // 来源文件名，剪贴板图片为 "clipboard"
    url: string             // 图片数据，格式: "data:image/png;base64,iVBORw0KGgo..."
    source?: FilePartSource // 记录在输入框中的位置信息
  }
```

在 Opencode 中，每一个发给模型的图片都会用这种 `FilePart`来维护

### 为什么会需要FilePart？

正是为了解决我在前文中提到的问题——在 Opencode 输入框粘贴了三张图片，看到 [Image 1] [Image 2] [Image3]，这三张图存在哪里？FilePart 是 Opencode 内部用来"记住"一张图片的数据结构。

既然Opencode会"记住"，那么在Hook里面就不需要再去读剪贴板，FilePart 已经在粘贴的那一刻帮我们抓取了数据，存在 url 里。Hook 只需要找到 FilePart 就能拿到了所有图片。

## 在这个过程中我踩了哪些坑

### 评估仍然需要人来界定

我尝试让Agent自己写单元测试，并要求Agent只有测试都通过了才能完成Hook的开发。然而实际情况是，Hook开发完了，测试也通过了，但仍然不能使用。我反思原因是我给Agent定的验收方案不够明确。我应该明确告诉Agent必须要亲自在Opencode中，Agent成功调用了Gemini进行图片理解，并且对图片给出回复才算是成功。
