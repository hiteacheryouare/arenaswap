---
sourceHash: '099498900e89'
title: ArenaSwap 疑難排解
description: 快速解決比賽列表是空的、切換從不發生、下拉選單裡找不到分頁，以及收不到通知的問題。
section: extension
order: 9
navLabel: 疑難排解
faq:
  - q: 為什麼 ArenaSwap 沒有顯示任何比賽？
    a: 如果你看到「選擇聯賽以開始使用」，代表還沒有開啟任何聯賽。點「在設定中選擇聯賽」，開啟幾個。如果已經開了聯賽，列表卻仍是空的，代表那些聯賽現在沒有直播。點「重新整理」，或試試示範模式。
  - q: 為什麼 ArenaSwap 不切換分頁？
    a: 檢查頂端列的「啟用自動切換」是否開著，以及是否至少有一場進行中的比賽已指派分頁。ArenaSwap 只會在你交給它的分頁之間切換。
---

大部分問題都出在某個設定關著，或是某個分頁從沒指派。先從聽起來最像你狀況的那一項開始。

## 比賽列表是空的

如果你看到 **選擇聯賽以開始使用**，代表還沒開啟任何聯賽。點 **在設定中選擇聯賽**，至少開啟一個。

如果你看到「今天體壇有點冷清。」這類訊息，代表你的聯賽現在沒有直播。點 **重新整理** 再查一次。或是開啟[示範模式](/arenaswap/docs/extension/demo-mode/)，有東西可以玩。

如果橫幅寫著 **我們的線人沒了動靜，比賽載入失敗。**，點 **重試**。如果一直發生，檢查你的網路連線。

## ArenaSwap 沒有切換分頁

依序檢查這幾項：

1. 頂端列的 **啟用自動切換** 是開著的。
2. 至少有一場進行中的比賽已指派分頁。用它卡片上的 **指派分頁** 下拉選單。
3. 你有指派第二場比賽。只有一場的話，ArenaSwap 可以從不是比賽的分頁把你帶到它，但沒有可以切換的對象。

還是沒動靜？可能是 **切換靈敏度** 設得太低，或 **切換冷卻** 或 **切換延遲** 設得太長。要改什麼，請見[控制 ArenaSwap 切換的時機](/arenaswap/docs/extension/switching-and-sensitivity/)。

## ArenaSwap 把我從正在做的事情拉走了

如果你所在的分頁沒有指派給任何比賽，ArenaSwap 會當你是自由的，一旦有已指派的比賽升溫，就會把你帶過去。想安心瀏覽，先關閉 **啟用自動切換**。

## 它一直在兩場比賽之間跳

你的兩場比賽勢均力敵，ArenaSwap 跟著每一次擺盪。在設定裡調高 **切換冷卻**，讓領先的一方要撐更久，才會有下一次切換。範圍請見[控制 ArenaSwap 切換的時機](/arenaswap/docs/extension/switching-and-sensitivity/)。

## 下拉選單裡缺了一個分頁，或是呈灰色

**指派分頁** 下拉選單列出的是你打開 ArenaSwap 的那個視窗裡開著的分頁。請先把串流開在自己的分頁。想用另一個視窗裡的分頁，就從那個視窗打開 ArenaSwap。彈出視窗顯示期間才開的分頁，要到下次打開時才會出現。

標示 **（使用中）** 的分頁已經指派給另一場比賽。請先在那邊取消指派。

## 比賽結束後，分頁被關掉或被釋放了

這是你的 **比賽結束時** 設定做的。它在設定的 **切換** 底下。把它設成 **保留分頁** 就不會再發生。選項請見[比賽結束時會怎麼處理](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends)。

## 我收到「即將開賽」通知，卻沒有切換

**比賽間歇再切換** 正在等一個暫停點，像是哨聲或打席結束。通知會說明它在等什麼。等比賽暫停，或稍等一下後，ArenaSwap 就會切換。想立刻切換，到設定關閉 **比賽間歇再切換**。更多說明請見[不在比賽進行到一半時被切走](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play)。

## Multiview 沒有開啟

[Multiview 頁面](/arenaswap/docs/extension/multiview/)有檢查清單。

## Standby Stream 沒有任何動作

Standby Stream 需要兩樣東西：

1. 在設定的 **Standby Stream** 底下，從 **待機分頁** 下拉選單挑一個分頁。如果還顯示 **選擇分頁**，就挑一個。
2. 至少有一場進行中的比賽已指派分頁。

當 **啟用自動切換** 關閉，或是 Multiview 開著時，它也會等待。完整步驟請見[如何設定 Standby Stream](/arenaswap/docs/extension/standby-stream/)。

## 收不到切換通知

到設定的 **切換** 底下，開啟 **切換通知**。如果已經開著，檢查你電腦的通知設定，確認瀏覽器被允許顯示通知。

## 相關內容

- [如何同時觀看多場比賽](/arenaswap/docs/extension/watching-multiple-games/)說明如何指派分頁。
- [如何控制 ArenaSwap 切換分頁的時機](/arenaswap/docs/extension/switching-and-sensitivity/)說明靈敏度、冷卻和延遲。
- [ArenaSwap 設定參考](/arenaswap/docs/extension/settings/)列出每一項設定的預設值和範圍。
- [常見問題](/arenaswap/faq/)說明聯賽、串流服務和資料來源。
