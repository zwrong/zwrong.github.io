---
title: "A Good Prompt Isn't as Good as a Good Harness"
date: 2026 年 5 月 26 日
footerLine: "Vinen's Blog — About Agent, Harness"
lede: "Prompt is a soft constraint; Harness is a hard constraint. From Claude Code to Opencode, see how a Hook stops an Agent from making a mistake at the critical moment."
---

My need was this: I wanted to use the Deepseek V4 Pro model inside OpenCode, but that model doesn't support reading images, so whenever I used Deepseek in OpenCode I couldn't see images — it would say the image couldn't be processed. My idea was to use Gemini and hand off image understanding to Gemini.

In my experience with Claude Code, there are two ways an Agent reads images:

1. By calling the Read tool to read the image.
2. The user pastes the image into the input box and sends it to the model.

The difference is that "calling the Read tool" is the Agent acting on its own; "pasting the image" is the user actively showing it to the Agent, so the Agent is passive.

When does the Agent use the Read tool to read an image? When the image is in the filesystem and the Agent needs to read it, it calls the Read tool. (This is my personal experience with Claude Code.)

But when I paste an image into the input box and send it to the model, the Agent doesn't call the Read tool.

> Ps: When the image shows up in the input box, how does the model actually receive it? Why doesn't the model use the Read tool to read it? What's the difference between reading via Read and reading via the clipboard? Would it be better if coding Agents were all unified to read images via Read?

## Reading Images in Claude Code

So my earlier approach in Claude Code was to set up a ToolBeforeUseHook, a hook that intercepts before a tool is called. The hook was designed so that whenever the Agent used the Read tool on an image file suffix like PNG, JPG, it would intercept and refuse to let the Agent call the Read tool, hinting that the model needs to read the image via Gemini -p to understand it.

But this approach can't intercept the case where you copy an image onto the clipboard and hand it to Claude Code. And Claude Code doesn't provide a hook like AgentUserPromptHook either (which can modify the Prompt after the user enters it), so this need was shelved for the time being. The workaround was to paste the image into the current workspace directory and tell the model to read it.

## Reading Images in Opencode

Switching models in Opencode is so easy that I started trying to use Deepseek there. Deepseek can't read images, so I had the same need to use Gemini to read them.

Reading an image with Read can obviously be done with a ToolBeforeUseHook, but is there a way to solve clipboard image reading? So I started researching what Hooks Opencode has.

## Why Not Solve It With a Prompt?

At the time there was an even simpler solution:

Just write a rule in opencode's `AGENTS.md`:

> If you hit an image, use the Gemini CLI to read the image path; don't let the current model process the image directly.

This reminded me of Huang Chao's point: "If you can solve a problem with one Prompt, that's the most impressive." But the problem with a Prompt is that it offers no guarantee.

`AGENTS.md` is still essentially a Prompt. It may work in short tasks, because the context is still small and the Agent can reliably stay aware of it. But once a task grows long and the context grows, this rule easily gets forgotten by the Agent.

That's why I insisted on using a Hook. A Hook doesn't ask the model "remember to do this" — it directly refuses to let an image into the Context.

The two are very different. `AGENTS.md` is a soft constraint at the Prompt level. A Hook is a hard constraint at the Harness level.

If you rely only on `AGENTS.md`, the image can still be sent directly to the Agent. After the Agent sees it, it might try to process it directly, might fail, or might produce an answer that looks like it handled the image but actually has no evidence behind it.

A Hook does two harder things before sending:

1. Writes the image to disk and generates a stable path.
2. Injects a Gemini instruction for understanding the current image.

This way the Agent isn't recalling "what the system said before" from a long Context — it directly sees it in the current message:

```text
Image cache files:
  [Image 1] /Users/.../image-cache/ses_xxx/msg_xxx-image-1.png

To analyze these images, use Gemini CLI with the absolute path in the prompt:
  gemini -p "Describe this image /Users/.../msg_xxx-image-1.png" -o text
```

This instruction is generated dynamically, carries the real path, and appears at the exact moment it's needed most.

I think this is the essential advantage of a Hook over `AGENTS.md`:

It's not about writing the rule more clearly — it's about not letting the Agent make a mistake in the first place, never giving it the chance to.

In long-horizon tasks, reliability can't rely on model memory alone. Especially for a task like image understanding where the capability boundary is clear — if the current model can't see images, you shouldn't give it the chance to pretend it did.

So this Hook is really intercepting a kind of Agent behavior: don't read images directly, don't treat an image as native input the current model can handle — instead turn it into an explicit external tool call.

## Opencode's Plugins

Interestingly, Hooks in Opencode aren't called Hooks — they're called plugins. But here I'll keep calling them Hooks.

In Opencode there's a Hook called chat.message. From what I remember, this hook fires after the user enters their Prompt, before the user's Prompt is assembled with the historical conversation messages. This timing matters to us, because it lets us make the Agent stop at a critical moment.

Once it stops, we need to think about what the Agent should do right then. For Gemini to read an image, it needs the image's storage location — but if the image is on the clipboard, how do we hand it to Gemini? With that in mind, we need to dig into what actually happens at the moment we paste an image into Opencode's input box, and why the input box shows 【Image 1】.

While researching, I found that Opencode uses osascript to read the clipboard contents of the Mac system at that moment, grabs the image, and stores it in RAM. So my first thought was to mimic Opencode — use osascript to read the image, save the current image somewhere, and let Gemini read it. But the problem is that when I paste multiple images into the input box, osascript only keeps the last one. Say I type this Prompt into Opencode's input box: "Please identify the contents of 【Image 1】, 【Image 2】, and 【Image 3】." In that case osascript can only get 【Image 3】, not 【Image 1】 or 【Image 2】.

But when Opencode sends the images to the model, it's definitely sending all three together, so I wondered whether I could use the mechanism OpenCode itself uses to store images. Then I tried handing the OpenCode source to the Agent and letting it explore. In the end I found OpenCode does have such a mechanism — it stores images as FilePart.

## What Is a FilePart?

```typescript
  export type FilePart = {
    id: string              // Unique ID assigned by the framework, e.g. "prt_xxx"
    sessionID: string       // Session ID, e.g. "ses_xxx"
    messageID: string       // Message ID, e.g. "msg_xxx"
    type: "file"            // Fixed value
    mime: string            // MIME type, "image/png" / "image/jpeg" / ...
    filename?: string       // Source filename; clipboard images are "clipboard"
    url: string             // Image data, format: "data:image/png;base64,iVBORw0KGgo..."
    source?: FilePartSource // Records the position info in the input box
  }
```

In Opencode, every image sent to the model is managed with this `FilePart`.

### Why Do We Need FilePart?

It's exactly to solve the problem I mentioned earlier — you paste three images into Opencode's input box and see [Image 1] [Image 2] [Image 3], but where are those three stored? FilePart is the data structure Opencode uses internally to "remember" an image.

Since Opencode "remembers", the Hook doesn't need to read the clipboard again — FilePart already grabbed the data at paste time and stored it in `url`. The Hook just needs to find the FilePart and it gets all the images.

## Pitfalls I Hit Along the Way

### Evaluation Still Needs a Human to Define It

I tried to have the Agent write unit tests itself, and required the Agent to finish the Hook's development only when all tests passed. But what actually happened was that the Hook was done and the tests passed, yet it still couldn't be used. Reflecting on it, the acceptance criteria I gave the Agent weren't specific enough. I should have clearly told the Agent that success meant actually being in Opencode, the Agent successfully invoking Gemini for image understanding, and producing a reply about the image.
