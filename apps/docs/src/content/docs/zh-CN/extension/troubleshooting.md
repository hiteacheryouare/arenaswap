---
sourceHash: '099498900e89'
title: ArenaSwap 故障排除
description: 比赛列表为空、切换始终没发生、下拉菜单里缺少标签页、收不到通知，这些问题的快速解决办法。
section: extension
order: 9
navLabel: 故障排除
faq:
  - q: 为什么 ArenaSwap 不显示任何比赛？
    a: 如果您看到“选择联赛以开始使用”，说明还没有开启任何联赛。点击“在设置中选择联赛”，开启几个。如果已经开了联赛，列表仍然是空的，说明这些联赛此刻没有直播。点击“刷新”，或者试试演示模式。
  - q: 为什么 ArenaSwap 不切换标签页？
    a: 请检查顶部栏里的“启用自动切换”是否开着，并且至少有一场直播比赛分配了标签页。ArenaSwap 只会在您交给它的标签页之间切换。
---

大多数问题，归根结底是某项设置没开，或者某个标签页从没分配过。从听起来最像您遇到的那一条开始看。

## 比赛列表是空的

如果您看到**选择联赛以开始使用**，说明还没有开启任何联赛。点击**在设置中选择联赛**，至少开启一个。

如果看到类似“今天体育圈比较冷清。”的提示，说明您的联赛此刻没有直播。点击**刷新**再查一次。也可以打开[演示模式](/arenaswap/docs/extension/demo-mode/)，有点东西可玩。

如果横幅写着**我们的线人没了动静，比赛加载失败。**，点击**重试**。如果一直这样，请检查您的网络连接。

## ArenaSwap 没有切换标签页

请按顺序检查：

1. 顶部栏里的**启用自动切换**是开着的。
2. 至少有一场直播比赛分配了标签页。用它卡片上的**分配标签页**下拉菜单分配。
3. 您分配了第二场比赛。只有一场时，ArenaSwap 可以把您从一个不是比赛的标签页带到它那里，但没有可供切换的对象。

还是没动静？可能是**切换灵敏度**设得很低，或者**切换冷却**或**切换延迟**设得很长。要改什么，见[控制 ArenaSwap 何时切换](/arenaswap/docs/extension/switching-and-sensitivity/)。

## ArenaSwap 把我从正在做的事情上拉走了

如果您所在的标签页没有分配给任何比赛，ArenaSwap 会认为您有空，一旦有比赛升温，就把您带到分配过的最好的那场比赛。想安心浏览，请先关闭**启用自动切换**。

## 它总在两场比赛之间来回跳

您的两场比赛不相上下，ArenaSwap 跟着每一次摆动走。在设置里调高**切换冷却**，让领先的一场在下一次切换前必须撑得更久。取值范围见[控制 ArenaSwap 何时切换](/arenaswap/docs/extension/switching-and-sensitivity/)。

## 下拉菜单里缺少某个标签页，或者它是灰色的

**分配标签页**下拉菜单列出的，是您打开 ArenaSwap 的那个窗口里的标签页。请先把直播在它自己的标签页里打开。其他窗口里的标签页，请在那个窗口里打开 ArenaSwap。弹窗显示期间新开的标签页，下次打开弹窗时才会出现。

标有**（已占用）**的标签页已分配给另一场比赛。请先在那边取消分配。

## 比赛结束后，一个标签页被关闭或释放了

这是您的**比赛结束时**设置在起作用。您可以在设置的**切换**下找到它。把它设为**保留标签页**就不会再这样了。各个选项见[比赛结束时会发生什么](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends)。

## 我收到了“即将开赛”通知，却没有切换

**比赛间歇再切换**正在等一个比赛间歇，比如一声哨响，或者一个打席结束。通知里会说它在等什么。比赛一停，或者稍等片刻后，ArenaSwap 就会切换。想立刻切换，请在设置里关闭**比赛间歇再切换**。更多内容见[别在回合中途被打断](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play)。

## Multiview 没有打开

[Multiview 页面](/arenaswap/docs/extension/multiview/)里有检查清单。

## Standby Stream 没有任何反应

Standby Stream 需要两样东西：

1. 在设置的 **Standby Stream** 下，**待机标签页**下拉菜单里选好一个标签页。如果仍然显示**选择标签页**，请选一个。
2. 至少有一场分配了标签页的直播比赛。

当**启用自动切换**关着，以及 Multiview 打开时，它也会等着。完整步骤见[如何设置 Standby Stream](/arenaswap/docs/extension/standby-stream/)。

## 没有切换通知

在设置的**切换**下，打开**切换通知**。如果已经开着，请检查电脑的通知设置，确认允许您的浏览器显示通知。

## 相关内容

- [如何同时观看多场比赛](/arenaswap/docs/extension/watching-multiple-games/)介绍如何分配标签页。
- [如何控制 ArenaSwap 何时切换标签页](/arenaswap/docs/extension/switching-and-sensitivity/)介绍灵敏度、冷却和延迟。
- [ArenaSwap 设置参考](/arenaswap/docs/extension/settings/)列出了每项设置的默认值和范围。
- [常见问题](/arenaswap/faq/)介绍联赛、流媒体服务和数据。
