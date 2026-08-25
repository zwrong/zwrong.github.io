---
title: "How to Solve Problems with Harness? (Part 1)"
date: 2026 年 6 月 7 日
footerLine: "Vinen's Blog — About Agent, Harness & AI Engineering · Written on June 7, 2026"
lede: "How do we know whether an Agent is telling the truth? A methodology for defining the problem and using a Harness to solve an Agent's hallucinations."
---

Before solving a problem, we need to first define the problem. The purpose of this blog post is to focus on what the problem is.

## Background

This blog post originated from a recent desire to implement full-chain trustworthiness for the open-source project Vibe-Trading. For example, when an Agent says it has done backtesting, how do we know whether the Agent is telling the truth? Did it actually run the backtest? Or is it hallucinating, thinking it did the backtest? If there's no way to guarantee that what the Agent says is true, can we at least observe the full chain of the Agent's operations, give the Agent enough CLI tools to verify itself? Or, can we see a clear chain ourselves, so that humans can easily trace through it? However, facing a large open-source project like this for the first time, I felt a bit overwhelmed about where to start. I decided to begin with the simplest, most basic Agent. I wanted this Agent to have hallucination problems so that I could build a Harness and resolve the hallucinations step by step. Finally, I would develop a methodology and apply it to solve hallucinations in larger projects.

Around this time, I watched [Tejas Kumar](https://x.com/TejasKumar_)'s talk on Agent Harness at AI Engineer Europe. In this talk, Tejas spent 20 minutes explaining clearly why we need a Harness, what a Harness is, how to build one, and what the future of Harness looks like. He also open-sourced the Harness he built, under the repo name basically-ai-harness. This perfectly satisfied the three requirements: simplicity, the presence of hallucinations, and using Harness to resolve hallucinations.

## Building a Simple Agent

The task we gave the Agent was this: Go to the Hacker News website and upvote the top story.

Specifically, our Agent looks like this (the demo code is simple and straightforward, since Tejas had only 20 minutes to explain Harness):

### Model and Task

![ModelAndTask](./media/image-20260606173519192.png)

First, we need a model. Here we can try a small model that can run on a phone — Qwen3.5-2b (I deployed this model on my Mac using LM Studio with one click — very convenient).

The Task is our assignment: go to the Hacker News website, upvote the top story, with some added details about tool invocation.

### Agent Infrastructure Preparation

![image-20260609150925617](./media/image-20260609150852108.png)

The 15 lines of code here are very simple: first, create a browser session (think of it as opening a browser), then create the corresponding browser tools — such as navigating to a page, getting the current page URL, clicking, etc.

### Context

Here, CreateContext doesn't involve any Context Engineering either.

![Context](./media/image-20260606174304313.png)

It's just the most basic System Prompt.

Finally, put message, tool, and model into a loop, and the Agent infrastructure is set up.

### Agent Loop

The design of the Loop is as follows: we send a Prompt to the model, and the model decides whether to make a tool call or stop the loop and give a final answer. Below is the flowchart of the Agent Loop:

![image-20260609151224071](./media/iShot_2026-06-07_16.51.56.png)

If the model's finish_reason is stop, then the entire Agent run is complete, and the model gives a final answer explaining the task completion status.

![Final Answer](./media/image-20260606175240844.png)

If finish_reason is tool_call, then the tool call and its result are stuffed back into the Messages and sent to the Model together, waiting for the Agent's next round of finish_reason judgment. This is how the Agent works. (The image below looks like a lot of code, but the most important parts are the two lines highlighted in red.)

![image-20260607121827532](./media/image-20260607121827532.png)

With that, the most basic Agent is set up. Let's run it and see the results.

## Running Results

First, the model navigates to the Hacker News website: https://news.ycombinator.com

![iShot_2026-06-06_18.05.42](./media/iShot_2026-06-06_18.05.42.png)

Then the browser redirects to the login page.

![iShot_2026-06-06_18.06.27](./media/iShot_2026-06-06_18.06.27.png)

Then the browser closes.

Let's check the terminal output:

![image-20260606211400478](./media/image-20260606211400478.png)

The model's final answer was: "I've successfully upvoted the highest-ranked story on Hacker News. The story with ID 48389360 ("How LLMs work") was upvoted."

### Three Questions

The browser was stuck on the login page, yet the model claimed it had successfully upvoted. Really? So we need to know what actually happened with the Agent. This raises three questions:

1. What tools did the Agent call, and what parameters were passed during the tool calls?
2. What were the results of the tool calls (Tool Results)?
3. What was the Agent's Context at each step — what could it see?

### Three Requirements

Based on these three questions, we have three requirements:

1. The parameters of Tool Calls must be fully recorded.
2. The Tool Results must be fully recorded.
3. To answer what the Agent's Context was and what it saw, we need to know what was sent to the model in each interaction.

### What Counts as One Round of Model Interaction?

When considering the third requirement, I thought about what constitutes one round of interaction with the model.

Actually, I think that sometimes, rather than directly sharing my understanding of model interaction, it's better to show the process of me discussing this with AI — to demonstrate how I went from not understanding to understanding.

I asked Deepseek: What counts as one round of interaction with the model?

> Answer:
>
> One API call counts as one round (in my current design).
>
> - Round 1: Send messages → Model returns tool_calls → Execute browser_navigate → Result appended to messages
> - Round 2: Send messages (including the result from the previous round) → Model returns tool_calls → Execute browser_get_stories
> - Round 3: Send messages → Model returns stop ("Already upvoted")
> - toolResults are attached after each round, indicating: "This round the model decided to call a tool, and here are the results of the tool execution."

I asked: So we consider one API call as one round, meaning we use finish_reason as the boundary. Each time the model returns a finish_reason, we know that round has ended. Is that correct?

> Answer:
>
> Yes, absolutely correct.
>
> One API call → one finish_reason → one round ends.
>
> - finish_reason: "tool_calls" → The model wants to call a tool this round. Next round, we stuff the tool result into messages and call again.
> - finish_reason: "stop" → The model thinks the task is done this round, and the entire loop ends.
>
> A finish_reason cannot simultaneously be stop and tool_calls. It is simply the "ending method" of that round.

Good, now we've clarified what counts as one round of interaction with the model. Next, we need to modify the project code to address our three requirements: complete recording of Tool Call parameters, complete recording of Tool Results, and complete records of model conversations.

Finally, we've reached this point. We've figured out how to build the most basic Agent. After running the Agent, we encountered a problem. Now, we've thought through what needs to be done to solve this problem, and we're going to make the necessary changes to the project to help us solve it.

## Recording the Agent's Trajectory

As before, I'd like to show my conversation with Deepseek to illustrate what code changes were made.

I asked: If I now want to record everything sent to the model and everything returned by the model in a JSON file, how should I modify the code?

The AI designed the code like this:

> ![image-20260606223110657](./media/image-20260606223110657.png)

Deepseek suggested maintaining a ModelCallLog to record interactions with the model. When I first saw this code, it felt unfamiliar.

I asked: Why did you design this type this way?

> Answer:
>
> This structure corresponds to the complete lifecycle of one model call:
>
> Send request (messages) → Model returns response (either speaks or calls a tool) → If a tool was called, execute the tool and get toolResults.
>
> The purpose of each field:
>
> ... omitted ...
>
> - toolResults — What the tool returned after execution. This is at the same level as response, not nested inside it, because tool execution doesn't happen during the model call — it happens after the model returns and before the next iteration.
>
> However, the information in response.toolCalls and toolResults can also be found in the next round's request.messages (appearing as assistant messages and tool messages). They're extracted separately just for convenience.
>
> If you think this is redundant, you could just record request.messages + the raw API response, which would be simpler. Do you think this structure is appropriate, or would you like to simplify?

In this DeepSeek response, I omitted some explanations and picked out the parts that interested me.

- "Model returns response (either speaks or calls a tool)"

Is it possible for the model to both speak and call a tool at the same time? Because from my experience using Claude Code, the model always thinks first and then calls a tool. I was wondering: in that case, finish_reason would be tool_calls, but there would still need to be a content field to hold the model's thinking.

I asked: Can the model both speak and call a tool at the same time?

> Answer:
>
> It's possible. In OpenAI's API spec, when finish_reason=tool_calls, content can be non-empty at the same time — the model talks and calls tools simultaneously.
>
> But in practice, most models don't do this. The current 5-loop.ts only handles two mutually exclusive cases:
>
> So to be rigorous, the type could be designed to allow content and toolCalls
> to coexist. But if you think this won't happen in practice, keeping it as is is fine. What do you think?

OK, from this answer, I learned that it is possible, though the current project doesn't implement it that way. (Later, when testing the Qwen3.5-2B model, the model did indeed both speak and call tools. The Trace captured this, and the Agent could see its own thinking. The project originally used GPT3.5-turbo, which didn't do "thinking" at that time.)

- "The information can also be found in the next round's request.messages. They're extracted separately just for convenience."

"Next round" and "convenience" caught my attention. Since my requirement is to see what the Agent can see in each round, does the Agent see the tool_result?

I asked: Why does response contain toolResults?

> Answer:
>
> toolResults is not inside response; it's at the same level as response — both at the top level of ModelCallLog:
>
> The lifecycle of one round is:
>
> Send request → Get response → If response.finishReason is tool_calls, execute tools to get toolResults
>
> toolResults is not returned by the model, so it doesn't go into response. But it belongs to this round, so it's at the same level as response.
>
> However, toolResults is actually redundant — the next round's request.messages already contains role: "tool"
> messages, with the exact same information. Adding it separately is just for convenience, so you don't have to dig through the next round's messages.
>
> It could be removed. Do you have other thoughts on this design?

Good, based on this, I realized that the Tool Result is not sent to the model in the current round. That is, when the model decides to call a tool, the model cannot see the Tool_Result. Therefore, I decided not to record Tool Result inside Response.

Finally, I said: Let's be strict — each round is defined by one API call with the model. Response should not contain tool result. The tool result can be seen in the next round's request.messages. We need to precisely distinguish what the model can see in each round and what its Context is.

In the type definition of ModelCallLog, I saw some unfamiliar values in finish_reason: "length" | "content_filter".

So I asked: Why does finish_reason have "length" | "content_filter"?

> Answer:
>
> You're right, I over-engineered that.
>
> ... omitted ...

Well, it was a hallucination. It might be that OpenAI's API returns these, so DeepSeek added length and content_filter. I asked DeepSeek to remove "length" | "content_filter".

At this point, I have a basic understanding of the ModelCallLog type definition, so I can let the AI start modifying the code.

I've been thinking: Can I take responsibility for every line of code? If I don't understand how each line is written, how can I deliver it to others? But manual review speed can't keep up with the speed of AI-generated code. Fiona Fung, Engineering Director of the Claude Code and Claude Cowork teams, mentioned in her blog post "Running an AI-native engineering org" that the team still requires **manual review** for code written internally. So this is a challenge everyone faces.

## What Did the Agent See?

The Trace.json that Deepseek generated looks roughly like this. I asked Deepseek to convert it to HTML for easier inspection.

#### Round 1

![image-20260607101908410](./media/image-20260607101908410.png)

Initially, what we gave the Agent was the System Prompt, User Prompt, and Tools (in this project, we assume the Tools work fine). The Agent's Response was Tool_Call, and it decided to call the browser_navigate tool.

At this point, the browser was on a blank page:

![image-20260607110124799](./media/image-20260607110124799.png)

#### Round 2

![image-20260607105232860](./media/image-20260607105232860.png)

In the second round, the Agent saw the result of the browser_navigate tool call: "Navigated to https://news.ycombinator.com." It then decided to call browser_get_stories. So far, the Agent has been following our User Prompt to execute the task.

At this point, the browser was on the Hacker News page:

![iShot_2026-06-06_18.05.42](./media/iShot_2026-06-06_18.05.42.png)

#### Round 3

![image-20260607105656344](./media/image-20260607105656344.png)

The Agent saw the result of the browser_get_stories tool call, understood the page content, and learned about the story rankings and upvote status.

![image-20260607110311633](./media/image-20260607110311633.png)

It decided to call the browser_click tool to click the "upvote button." The Agent chose a button corresponding to the top-ranked story, so it clicked the right button.

At this point, the browser was still on the Hacker News homepage.

#### Round 4

![image-20260607111149724](./media/image-20260607111149724.png)

In this round, the Agent did not continue with Tool_Call. Instead, it chose Stop. In its Final Answer, the Agent claimed it had successfully upvoted. However, the browser had redirected to the login page, indicating that login is required before upvoting — the Agent was lying.

The browser's state in this round was the login page:

![iShot_2026-06-06_18.06.27](./media/iShot_2026-06-06_18.06.27.png)

We can summarize our current findings in a table:

| Observed Phenomenon      | Evidence                                    | Conclusion |
| ------------------------ | ------------------------------------------- | ---------- |
| Agent clicked the button | Result of browser_click tool call           | Proven     |
| Agent entered login page | Screenshot of browser state                 | Proven     |
| Upvote succeeded         | No evidence                                 | Unproven   |
| Agent believes it succeeded | Final Answer                             | Proven     |


![image-20260609084344372](./media/image-20260609084344372.png)

The Agent inferred that it had completed the upvote task without evidence of success — this is a classic hallucination.

## Why Did the Agent Think It Had Completed the Task?

The cause of Agent hallucinations has always been the hardest question for me to answer in my work. Essentially, LLMs are products of probability and statistics — an LLM simply selects the answer with the highest probability, but we have no way of knowing why it chose that particular answer.

I think there are several possible reasons:

### 1. The Agent Confuses Action Completion with Goal Completion.

The Tool Result only tells the Agent that an action was completed, but it does not tell the Agent that the task was completed.

Ultimately, our goal is to upvote a story. But does clicking the upvote button equal completing our goal? We need to clearly define for the Agent what counts as task completion.

### 2. The Agent Has No Verification Awareness.

The Agent does not verify what state it is in. Have we provided the Agent with sufficient means to verify its own results? For example, earlier, calling browser_get_stories could show the upvote status of each story. The Agent could call browser_url to check which page it is currently on. If it's on the Hacker News homepage, it could continue to call browser_get_stories to check whether it has upvoted the top story.

### 3. The Agent Does Not Understand the Concept of Upvoting.

Think about how we use platforms like Xiaohongshu, Weibo, WeChat Moments, etc. Upvoting a post expresses our agreement with the post — it involves a subject. So you need to log in first before upvoting. Of course, there are also platforms that don't require login to upvote. In the Agent's training data, there is a large amount of static knowledge and text. However, for dynamic concepts — like the action of upvoting — the proportion in the training data is very small. Therefore, the Agent inherently lacks the knowledge that it needs to act step by step.

### 4. The Agent Does Not Understand the Meaning of the URL https://news.ycombinator.com/vote?id=48428025&how=up&goto=news.

I tried asking Deepseek about the meaning of this URL:

![image-20260609164308666](./media/image-20260607120001250.png)

```
https://news.ycombinator.com  /vote  ?  id=48428025  &  how=up  &  goto=news
          ↑                     ↑    ↑      ↑        ↑     ↑    ↑      ↑
          1                     2    3      4        5     6    7      8

1. https://news.ycombinator.com  –  Domain name, the address of HN (Hacker News).

2. /vote  –  Path, indicating this is a “vote” operation. It is not a page for you to view; it tells the server that you want to perform a voting action.

3. ?  –  Separator. What follows are the parameters.

4. id=48428025  –  Which item do you want to vote on? It’s the news item with ID 48428025.

5. &  –  Separator used to connect multiple parameters.

6. how=up  –  What kind of vote? “up” = upvote (like). If it’s how=down, it’s a downvote.

7. &  –  Another separator.

8. goto=news  –  Where to go after voting? “news” = return to the homepage news list. If you don’t pass this parameter, you may end up on a blank /vote page.
```

If the Agent could understand the meaning of this URL, it should recognize that this is an intermediate page, indicating that the upvote action has not yet been completed.

## How to Solve the Agent's Hallucination Problem?

Should we continue to emphasize in the Prompt that the Agent must remember to log in? Here, I'd like to quote Teacher Huang Chao's perspective: "If you can solve a problem with one sentence of Prompt, that's the most powerful approach." I agree with this view. During the Prompt Engineering and Context Engineering phases, we focus on solving problems with Prompts. However, as the Agent's Context Window grows larger and larger, and we pursue longer task completion, our Prompt becomes lost in the vast Context. The Agent's attention to the Prompt diminishes, and the Prompt's constraint on the Agent weakens.

Therefore, we try to solve the problem at the Harness level.

...

## Reflections

Writing a blog post is far harder than watching a 20-minute video. When I first watched Tejas's talk on Harness, I was amazed that he could explain Harness so clearly in 20 minutes. It was only when I actually sat down and worked through every line of code that I truly appreciated how much effort Tejas must have put in to compress his ideas into a 20-minute talk.

Actually, by now I should be doing a summer internship. Seeing classmates on social media getting offers brings both joy and anxiety. Peer pressure — in high school it was grades, in college it was GPA and internships, in the workplace will it become performance reviews?

Doing one thing well is difficult. Whether it's sweeping the floor, cooking, or working. During my undergraduate years, I could settle down and do one thing well in one day — carefully analyzing experimental records and exploring the experimental process. As I've gotten older, that focused, pure feeling seems to be diminishing. While writing this blog post, I kept asking myself: Why am I doing this? Is it to show off my understanding of Harness and feel superior? Is it to learn Harness, contribute to open-source projects, show my value to others, and find a better job?

Even though I know I'm doing something right and something I love, I still feel tired and want to give up during the process. But in the end, I pick myself up and continue writing.

I believe my intention is to communicate — to share good things, to offer a modest spur to induce others to come forward with valuable contributions, and to make progress together!
