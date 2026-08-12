---
title: "Reasoning Effort 学习过程"
date: 2026 年 8 月 11 日
footerLine: "Vinen's Blog — 关于 Agent、Harness"
lede: "久违地感受到学习的快乐。一开始只是看了一篇博客，跟同学分享了一下自己的收获，接着得到了一些回应，结合着自己的好奇心又一点一点地深入背后的原理。"
---

<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 1.5rem;">
<iframe src="https://www.youtube.com/embed/eSNGt5UlE_M" title="Reasoning Effort 学习过程" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"></iframe>
</div>

久违地感受到学习的快乐。一开始只是看了一篇博客，跟同学分享了一下自己的收获，接着得到了一些回应，结合着自己的好奇心又一点一点地深入背后的原理。

视频是用 [Cap](https://github.com/CapSoftware/Cap) 录制的，在字幕和进度条上花了比较多时间。字幕是用 Gemini 3.6 Flash 的 API（免费的）识别视频的声音，但是这样制作出来的时间轴不太对，有一些专业的术语，比如Grok，Reasoning Effort 这些要再用大模型处理一下（我用的是 Deepseek-v4-flash-Official）。用剪映识别出来的字幕，时间轴卡的特别好（感谢 [@肖恩君Sean](https://x.com/ShenSeanChen) 的指导，他在评论区告诉我视频的字幕是用剪映做的），再结合之前Gemini识别的字幕，优化一下就用上了。终于打通了字幕这个难关。

字幕的烧录是用 [Pi](https://pi.dev) 搭配 Deepseek-v4-flash-Official 模型 用 FFmpeg CLI 烧录的，但是一开始烧录出来的视频不仅内存大，还没有 [Cap](https://github.com/CapSoftware/Cap) 导出来的清晰，把 [Cap](https://github.com/CapSoftware/Cap) 的 Github 仓库复制给 Agent，Agent 就找到了最高清的导出参数，最后导出来的视频在画质和内存大小上就就跟 [Cap](https://github.com/CapSoftware/Cap) 导出来的一样好了。

进度条的制作参考了 [AI半山博士](https://xhslink.cn/m/3KavUUf8xu2) 的Github项目 [chapter-progress-bar-plus](https://github.com/DrBanshan/chapter-progress-bar-plus)，以及 [@张小珺商业访谈录](https://x.com/zhang_benita) 的进度条样式，用 Deepseek 调了几版后有了最终的效果。

视频的封面参考了 [@肖恩君Sean](https://x.com/ShenSeanChen) 的封面设计。用PPT给视频截图，加上白色透明的底，留出右下角的人头像。最后再给 Grok 根据把白色透明底把右下角的人头像包裹住。

总的来说，视频字幕和进度条的制作，以及整个烧录进视频的过程以及可以用AI来帮助。[Pi](https://pi.dev) 搭配 Deepseek-v4-flash-Official 可以满足我的需求，给 [Pi](https://pi.dev) 和 Deepseek 点赞！

感谢每一位给我回应和一起讨论的同学，让我有探索知识的动力。
