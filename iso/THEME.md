# 2.5D 版介面主題說明

介面外觀全部在 `theme.css`，可以自由修改；`base.css` 負責位置與開關邏輯，盡量不要改。

## 色彩變數（`theme.css` 最上方 `:root`）

| 變數 | 用途 |
|---|---|
| `--ink` | 主要文字 |
| `--ink-old` | 已讀、往上捲的舊對話 |
| `--muted` | 次要文字（編號、副標） |
| `--choice` / `--choice-hover` | 選項文字 / 滑過時 |
| `--hall-accent` | **程式自動設定**，隨所在展廳變色（世界灰藍、歷史赭紅、馬汀內斯金黃） |

## 元素對照

```
┌─ .topbar（左上按鈕列）──────┐           ┌─ .dlg（右側敘事欄）────────┐
│ .btn  .btn.is-on（導覽中）   │           │ .dlg-head                    │
└──────────────────────────────┘           │   .dlg-hall   .dlg-close     │
                                            │ .dlg-subject                 │
    .list（展品列表，點「展品」打開）        │   .dlg-title  .dlg-sub       │
      .list-hall / .list-item / .list-no    │ .dlg-log（對話紀錄）         │
                                            │   .sep（換展品的分隔）       │
                                            │   .line（每一句）            │
                                            │     .who  .dash  .text       │
                                            │ .dlg-choices                 │
┌─ .status-card（左下狀態卡）─┐           │   .choice                    │
│ .status-portrait             │           │     .choice-key .choice-text │
│ .status-name .status-hall    │           └──────────────────────────────┘
│ .status-hall-zh .status-clock│
└──────────────────────────────┘
```

## 對話的四種句子

每一句都是 `<p class="line line--類型">`，可分別設計：

| class | 是誰 | 例子 |
|---|---|---|
| `.line--docent` | 導覽員 | 導覽員 – 島陸與島陸之間不是海洋…… |
| `.line--voice` | 內心聲音（記憶／直覺／懷疑／想像） | 直覺 – 別盯著那片灰色太久。 |
| `.line--you` | 你選的回應 | 你 – 「繼續說。」 |
| `.line--narration` | 旁白（沒有說話者） | 你在展板前停下。 |

狀態 class：`.is-in`（剛出現，用來做淡入）、`.is-old`（已經不是最新一句）。

說話者名字的顏色由程式透過 `--who` 變數傳入（內心聲音各有顏色，定義在 `js/exhibits.js` 的 `VOICE_COLORS`）。

## 換成背景圖

例如讓敘事欄使用你自己做的紋理圖：

```css
.dlg { background: url("my-panel.png") center / cover; }
```

圖片放在 `iso/` 資料夾裡即可。
