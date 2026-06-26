#### 第一轮

![image-20260607101908410](./media/image-20260607101908410.png)

最开始我们给到Agent的就是 System Prompt, User Prompt 还有 Tool（在这个项目里，我们假设Tool没有问题）。Agent 给出的 Response 是 Tool_Call, 并决定调用 browser_navigate 的工具。

此时浏览器的状态是空白页：

![image-20260607110124799](./media/image-20260607110124799.png)


#### 第二轮

![image-20260607105232860](./media/image-20260607105232860.png)

第二轮，Agent 看到了 调用 brwoser_navigate 工具的结果：Navigated to https://news.ycombinator.com. 并决定继续调用 browser_get_stories. 目前Agent都是在按照着我们的 User Prompt 执行任务。

此时浏览器在Hacker News 的页面：

![iShot_2026-06-06_18.05.42](./media/iShot_2026-06-06_18.05.42.png)


#### 第三轮

![image-20260607105656344](./media/image-20260607105656344.png)

Agent 看到了 brwoser_get_stories 的工具调用结果，了解了网页的内容，知道了故事的排名和点赞状态。

![image-20260607110311633](./media/image-20260607110311633.png)

决定调用 browser_click 工具去点击"点赞按钮"。可以看到Agent决定点击的按钮跟排名在第一名的故事是对应的。Agent 在这里点对了按钮。

此时浏览器的状态仍然在 Hacker News 的首页。


#### 第四轮

![image-20260607111149724](./media/image-20260607111149724.png)

这一轮 Agent 没有继续 Tool_Call，而是选择了 Stop. 并且在 Final Answer 中 Agent 认为自己已经成功点赞。然而浏览器的跳转到了登录界面，说明点赞前需要登录，Agent在撒谎。

这一轮浏览器的状态在登录界面：

![iShot_2026-06-06_18.06.27](./media/iShot_2026-06-06_18.06.27.png)
