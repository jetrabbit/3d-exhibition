# ELYSIUM：一座世界的背景故事

以《Disco Elysium》世界觀為主題的 3D 網頁虛擬策展（課堂作業）。

- **HALL I 世界：島嶼與灰域**：Isola、The Pale、灰域曝露、Aerostatic、灰域學
- **HALL II 歷史：無罪者與革命**：瑞瓦肖年表（多洛雷斯世紀 → '51）、無罪者、公社、聯軍
- **HALL III 馬汀內斯：此時此地**：Martinaise、吊屍案（僅開場資訊）、警探與搭檔、RCM、罷工、Whirling-in-Rags

只介紹世界觀與開場資訊，不涉及主線劇透。所有畫面、模型與文字皆為原創詮釋，未使用遊戲素材。
《Disco Elysium》© ZA/UM，本作為非營利二次創作。

## 操作

拖曳滑鼠環顧 · WASD / 方向鍵移動 · Shift 加速 · 點擊展品閱讀 · 點小地圖瞬移 · 「自動導覽」依序參觀全部 23 件展品

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
