# ELYSIUM：一座世界的背景故事

以《Disco Elysium》世界觀為主題的 3D 網頁虛擬策展（課堂作業）。

- **HALL I 世界：島嶼與灰域**：Isola、The Pale、灰域曝露、Aerostatic、灰域學
- **HALL II 歷史：無罪者與革命**：瑞瓦肖年表（多洛雷斯世紀 → '51）、無罪者、公社、聯軍
- **HALL III 馬汀內斯：此時此地**：Martinaise、吊屍案（僅開場資訊）、警探與搭檔、RCM、罷工、Whirling-in-Rags

只介紹世界觀與開場資訊，不涉及主線劇透。

## 版權與授權

- 本專案為大學課程期末成果作業，非商業用途。
- 展場、展品模型、展板畫面與展品文字為策展人原創。
- 對話介面的肖像、邊框、檢定特效與音效（`public/`）引用自 [Speech Cabinet](https://github.com/tm-a-t/speech-cabinet)。其中 **Disco Elysium 之美術與音效版權歸 ZA/UM 所有**，不適用本專案的授權。
- Speech Cabinet 程式碼採 AGPL-3.0 授權；本專案沿用其部分程式碼，因此同樣以 AGPL-3.0 釋出。特此致謝與引用。

## 操作

拖曳滑鼠環顧 · WASD / 方向鍵移動 · Shift 加速 · 點擊展品對話 · 點小地圖瞬移 · 「自動導覽」依序參觀全部 23 件展品 · **V 切換第一人稱／2.5D**（或網址加 `?view=iso`）

## 本機預覽

因為使用 ES modules，需要用本機伺服器開啟（直接雙擊 index.html 不行）：

```bash
python3 -m http.server 8000
```

然後開啟 http://localhost:8000

## 發佈到 GitHub Pages

Settings → Pages → Source 選 **Deploy from a branch** → 選分支與 `/ (root)` → Save。
幾分鐘後網址會是 `https://<帳號>.github.io/3d-exhibition/`。

## 檔案結構

| 檔案 | 內容 |
|---|---|
| `index.html` / `style.css` | 介面（開場、展品說明、列表、小地圖） |
| `js/exhibits.js` | **展品文字與位置**——要改內容改這裡 |
| `js/art.js` | 程序化油畫筆觸材質與展板畫面 |
| `js/models.js` | 立體展品模型 |
| `js/main.js` | 場景、移動、導覽、小地圖 |
