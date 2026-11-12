// 展品資料：所有說明文字皆為原創撰寫，內容整理自遊戲世界觀（避開主線劇透）。
// 專有名詞採「英文原名＋中文說明」。

export const HALLS = [
  {
    id: 'h1',
    no: 'I',
    name: 'The World',
    zh: '世界：島嶼與灰域',
    zRange: [0, -22],
    palette: { wall: '#8e9aa3', accent: '#c9d3d6', floor: '#3b3630' },
    intro: '這個世界沒有連成一片的大陸，只有被灰域隔開的七座大島。',
  },
  {
    id: 'h2',
    no: 'II',
    name: 'History',
    zh: '歷史：無罪者與革命',
    zRange: [-22, -52],
    palette: { wall: '#8a4b38', accent: '#d9a066', floor: '#2f2420' },
    intro: '從「多洛雷斯時代」的大發現，到一場被外國聯軍終結的革命。',
  },
  {
    id: 'h3',
    no: 'III',
    name: 'Martinaise',
    zh: '馬汀內斯：此時此地',
    zRange: [-52, -74],
    palette: { wall: '#3f5a55', accent: '#c7b27a', floor: '#2a2a26' },
    intro: "'51 年，瑞瓦肖北岸一個破敗的港區。故事從這裡開始。",
  },
];

export const EXHIBITS = [
  // ───────────── 第一廳 ─────────────
  {
    id: '1-0', hall: 'h1', no: '01',
    title: 'Prologue', zh: '序言：歡迎來到 Elysium',
    kind: 'panel', art: 'prologue',
    pos: [-10.75, 2.3, -6], rotY: Math.PI / 2, size: [3.4, 2.4],
    body: [
      '《Disco Elysium》是 ZA/UM 於 2019 年推出的角色扮演遊戲。玩家扮演一名在旅館裡宿醉醒來、什麼都想不起來的警探，在一座傷痕累累的城市裡調查一樁命案。',
      '這款遊戲最迷人的地方之一，是它龐大而完整的世界觀：有自己的地理、物理法則、曆法、宗教與政治史。遊戲中的人物會不經意地提起這些事，玩家則像考古一樣，一點一點把世界拼回來。',
      '本展分為三個展廳：從「世界的結構」，到「瑞瓦肖的歷史」，最後抵達遊戲開始的地方「馬汀內斯」。展覽只介紹背景設定與開場資訊，不涉及主線劇情的真相。',
    ],
  },
  {
    id: '1-1', hall: 'h1', no: '02',
    title: 'The Isolas', zh: '七座島：Isola',
    kind: 'panel', art: 'isolas',
    pos: [10.75, 2.3, -6], rotY: -Math.PI / 2, size: [3.4, 2.4],
    body: [
      'Elysium 的陸地由數座巨大的「Isola（島陸）」組成，每一座的規模都相當於一塊大陸。目前已知的有七座：',
      'Mundi——最大的島陸，位於 Insulinde 北方，是古老文明的中心。\nGraad——位於東北方，以嚴寒與革命思想著稱。\nKatla——最北、最冷、也離 Insulinde 最遠。\nSeol——位於西方，封閉而神祕，外界所知甚少。\nSamara——位於東方。\nIilmaraa——擁有獨特的文化與生態，曾被稱為「新世界」。\nInsulinde——本作舞台，一座以海洋為主的島陸，約 380 年前才被發現，因此被稱為「新新世界」。',
      '※ 展板上的地圖為策展示意圖，僅表現相對方位，並非遊戲官方地圖。',
    ],
  },
  {
    id: '1-2', hall: 'h1', no: '03',
    title: 'The Pale', zh: '灰域：世界之間的虛無',
    kind: 'object', model: 'pale',
    pos: [0, 0, -11], radius: 2.6,
    body: [
      '島陸與島陸之間不是海洋，而是一片灰白、無色無味、像霧又像虛無的區域——「The Pale（灰域）」。它覆蓋了世界表面約 72%，面積大約是物質世界的兩倍。',
      '灰域最根本的特性，是讓「規則」失效：物理定律、語言、時間在其中逐漸瓦解；越往深處，連數學都不再可靠。因此它常被形容為「物質與生命的敵人」。',
      '沒有人能確定灰域究竟是什麼。有學者認為它造成的是極端的感官剝奪；也有人主張，灰域是由「逐漸崩解的過去資訊」所構成，會讓穿越者的心智超載。',
      '本展中央的模型，以漂浮的島嶼與流動的灰色粒子，表現這種「島與島之間什麼都沒有」的孤立感。',
    ],
  },
  {
    id: '1-3', hall: 'h1', no: '04',
    title: 'Pale Exposure', zh: '灰域曝露',
    kind: 'panel', art: 'exposure',
    pos: [-10.75, 2.3, -16], rotY: Math.PI / 2, size: [3.4, 2.4],
    body: [
      '人可以穿越灰域，但必須付出代價。短暫的曝露可能只會帶來頭痛與不適；長時間的曝露則可能造成失眠、精神不穩、感官受損，嚴重時甚至致命。',
      '為此，國際標準規定：一般平民每年在灰域中的停留時間上限為「6 天」；受過特殊訓練的商務旅客（Entroponetic Business Class）則可放寬至 22 天。',
      '一個連「出國」都要被計算曝露天數的世界——灰域讓每座島陸都更像一個孤立的宇宙。',
    ],
  },
  {
    id: '1-4', hall: 'h1', no: '05',
    title: 'Aerostatics', zh: '飛行器：穿越灰域的方法',
    kind: 'object', model: 'aerostat',
    pos: [6, 0, -16.5], radius: 1.2,
    body: [
      '要在島陸之間往來，必須搭乘稱為「Aerostatic」的混合式飛行器——介於飛船與飛機之間的交通工具。',
      '一般的旋翼與噴射引擎，在離開「近灰域」進入「遠灰域」後就會失去推力。因此穿越的關鍵是：以高速衝入灰域，盡可能縮短停留時間。',
      '灰域交通的進步，幾乎都來自同一件事——讓飛行器更快地通過，讓乘客承受更少的曝露。',
    ],
  },
  {
    id: '1-5', hall: 'h1', no: '06',
    title: 'Entroponetics', zh: '灰域學與無線電中繼站',
    kind: 'panel', art: 'radio',
    pos: [10.75, 2.3, -16], rotY: -Math.PI / 2, size: [3.4, 2.4],
    body: [
      '研究灰域的學問稱為「Entroponetics（灰域學）」，起源可追溯至約六千年前，現代的灰域學則是一門以 Graad 為中心的學科。進展一直很緩慢。',
      '為了讓通訊跨越灰域，人們建造了「Pale Latitude Compressor（灰域緯度壓縮器）」，以高功率發射器與無線電訊號網格，「壓縮」需要穿越的距離。',
      '支撐這套系統的，是漂浮在灰域中的浮標中繼站。駐守站上的人員長期與世隔絕，許多人在幾年內便失去理智。靠近壓縮器的人，據說會感到劇痛，並聽見無數重疊的無線電人聲。',
    ],
  },

  // ───────────── 第二廳：年表 ─────────────
  {
    id: '2-T1', hall: 'h2', no: '07',
    title: 'The Dolorian Century', zh: '約 380 年前｜多洛雷斯·迪與新新世界',
    kind: 'timeline', year: '≈ 380 年前', art: 'tl-dolores',
    pos: [-10.75, 2.4, -25.5], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      'Dolores Dei（多洛雷斯·迪）原是 Suresne 王國女王 Irene La Navigateur（領航者伊琳）的顧問。她說服女王派遣遠征隊深入灰域——當時多數人認為灰域無法穿越。',
      '遠征隊的旗艦 Lysergique 帶回了驚人的消息：灰域彼端還有一座未知的島陸，也就是 Insulinde。這場發現開啟了被後世視為人類黃金時代的「多洛雷斯世紀（Dolorian Century）」。',
      'Dolores Dei 後來被冊封為「Innocence（無罪者）」，被視為「島際旅行」的化身。她的形象至今仍在 Revachol 各處可見。',
    ],
  },
  {
    id: '2-T2', hall: 'h2', no: '08',
    title: 'The Colony & the Suzerain', zh: '殖民地與王國',
    kind: 'timeline', year: '殖民時代', art: 'tl-crown',
    pos: [-10.75, 2.4, -28.6], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      'Revachol（瑞瓦肖）最初是 Suresne 王國在新發現的 Insulinde 上建立的殖民地，位於 Caillou 島。來自西方的殖民者在此建城，城市的建設則大量仰賴外來移工的勞力。',
      '這座城市後來成為一個獨立的君主國，鼎盛時期甚至被稱為「世界之都」。',
      '然而王朝逐漸衰敗。據記載，國王 Filippe III 的統治揮霍了國庫，王國從此走下坡。',
    ],
  },
  {
    id: '2-T3', hall: 'h2', no: '09',
    title: 'Le Décret de Mars', zh: "'02｜三月法令與公社",
    kind: 'timeline', year: "'02", art: 'tl-decree',
    pos: [-10.75, 2.4, -31.7], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      'Elysium 的年份用「撇號＋兩位數」書寫，例如 \'02 代表「本世紀（Current Century）」的第 2 年。世紀沒有編號，只有名字。',
      '上個世紀末到本世紀初，一場跨越多座島陸的共產革命爆發，後世稱為「世紀前革命（Antecentennial Revolution）」。Revachol 陷入保皇派與共產派之間的內戰。',
      "'02 年 3 月 7 日，革命者以「Le Décret de Mars（三月法令）」宣告「Revachol 公社（Commune of Revachol）」成立。君主制在這場內戰中走向終結。",
    ],
  },
  {
    id: '2-T4', hall: 'h2', no: '10',
    title: 'Operation Death Blow', zh: "'08｜致命一擊行動",
    kind: 'timeline', year: "'08", art: 'tl-deathblow',
    pos: [-10.75, 2.4, -34.8], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      '公社的存在，讓周邊的強國感到威脅。由數個國家組成的「Coalition（聯軍）」決定出兵。',
      "'08 年 5 月 13 日，聯軍發動大規模兩棲登陸作戰「Operation Death Blow（致命一擊行動）」，從海上攻入 Revachol。",
      '這場戰役的傷亡數字至今眾說紛紜，有說法誇張到難以置信。可以確定的是：它徹底改變了這座城市的命運。',
    ],
  },
  {
    id: '2-T5', hall: 'h2', no: '11',
    title: 'The Surrender', zh: "約 '10｜投降",
    kind: 'timeline', year: "≈ '10", art: 'tl-surrender',
    pos: [-10.75, 2.4, -37.9], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      "登陸之後，戰事又持續了大約兩年。最終，公社的武裝力量簽署了「Revachol 投降書（Revacholian Instrument of Surrender）」。",
      '值得注意的是：共產黨本身從未正式投降。',
      '革命失敗後，許多參與者遭到處決。半個世紀過去，城裡仍到處是那場戰爭留下的彈痕與廢墟。',
    ],
  },
  {
    id: '2-T6', hall: 'h2', no: '12',
    title: 'Zone of Control', zh: "'20s–'40s｜佔領區",
    kind: 'timeline', year: "'20s – '40s", art: 'tl-zones',
    pos: [-10.75, 2.4, -41], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      'Revachol 從此成為由聯軍管理的「Zone of Control（控制區）」。到了 \'20 年代，城市被劃分為三個區域、二十一個稱為「cordon」的行政區，分別由六個聯軍成員國治理。',
      "'30 年代被稱為「the New」，城市迎來一段看似繁榮的時期；'40 年代則陷入經濟衰退。",
      '名義上，臨時委員會計畫分階段讓 Revachol「民主化」——但這個「之後」始終沒有到來。',
    ],
  },
  {
    id: '2-T7', hall: 'h2', no: '13',
    title: "'51 — The Present", zh: "'51｜現在",
    kind: 'timeline', year: "'51", art: 'tl-present',
    pos: [-10.75, 2.4, -44.1], rotY: Math.PI / 2, size: [3, 2.6],
    body: [
      "遊戲的故事發生在 '51 年。距離革命失敗已近半個世紀。",
      '城市依然由聯軍掌控，大公司與外國資本主導經濟，維持治安的是由市民組成的民兵組織。革命的記憶，則以塗鴉、紀念碑、老人的回憶與政治口號的形式，散落在城市各處。',
      '下一個展廳，我們將進入這座城市北岸的一個角落：Martinaise。',
    ],
  },

  // ───────────── 第二廳：右側展品 ─────────────
  {
    id: '2-1', hall: 'h2', no: '14',
    title: 'The Innocences', zh: '無罪者：歷史的化身',
    kind: 'object', model: 'innocence',
    pos: [5, 0, -27.5], radius: 1.6,
    body: [
      '「Innocence（無罪者）」是 Elysium 對歷史人物的最高稱號——被視為「世界精神」的人格化身。他們的決定被當作歷史的必然；但也有批評者認為，其中不乏戰犯與暴君。',
      '無罪者由「創建黨（Founding Party）」選出並正式冊封，在歷史上只發生過寥寥數次。本展的六座方尖碑，代表六位重要的無罪者：',
      'The Perikarnassian——約三千年前，第一位無罪者。\nPolycarp of Perikarnassis——兩千多年前。\nErnö Pasternak——五百多年前，常被稱為「counter-innocence（對立的無罪者）」。\nFranconegro——約五百年前，軍事主義的無罪者。\nDolores Dei——約三百八十年前，島際旅行的無罪者。\nSola——上個世紀末，一位都市規劃者，常被稱為「anti-innocence（反無罪者）」。',
      '中央懸浮的光，代表 Dolores Dei 在這座城市中特殊的地位。',
    ],
  },
  {
    id: '2-2', hall: 'h2', no: '15',
    title: 'Dolores Dei', zh: '多洛雷斯·迪',
    kind: 'panel', art: 'dolores',
    pos: [10.75, 2.4, -33], rotY: -Math.PI / 2, size: [2.6, 3.2],
    body: [
      'Dolores Dei 是 Revachol 最重要的歷史象徵之一。她推動了灰域遠征，間接促成了 Revachol 這座城市的誕生。',
      '在她之後展開的「多洛雷斯世紀」，被普遍視為人類的黃金時代：探索、發明與科學革命接連發生。至今城裡仍有以她為名的信仰與教會，她的肖像與象徵隨處可見。',
      '※ 本展板畫面為策展人原創的抽象詮釋，並非遊戲中的人物形象。',
    ],
  },
  {
    id: '2-3', hall: 'h2', no: '16',
    title: 'The Commune', zh: '公社的旗幟',
    kind: 'object', model: 'banner',
    pos: [5, 0, -38.5], radius: 1.2,
    body: [
      'Revachol 公社只存在了短短數年，卻是這座城市至今最深的傷口與最強烈的記憶。',
      '這面殘破的旗幟是策展人的原創裝置，象徵一場失敗的革命：它被打倒了，卻從未真正被收起。',
      '在遊戲中，不同的人對這段歷史有截然不同的看法——懷念、仇恨、冷漠、或是將它當成商品。這種「同一段歷史，各自表述」，正是 Revachol 最真實的樣貌。',
    ],
  },
  {
    id: '2-4', hall: 'h2', no: '17',
    title: 'The Coalition', zh: '聯軍',
    kind: 'panel', art: 'coalition',
    pos: [10.75, 2.4, -45], rotY: -Math.PI / 2, size: [3.4, 2.4],
    body: [
      '「Coalition（聯軍）」是終結 Revachol 公社的國際聯盟，由數個奉行道德主義與資本主義的國家組成。',
      '戰後，聯軍並沒有離開。Revachol 被劃為受其管理的控制區，名義上是「過渡」，實際上已延續了數十年。',
      '在 Revachol 的天空中，聯軍的飛行器是一種日常風景——提醒著所有人，這座城市真正的主人是誰。',
    ],
  },

  // ───────────── 第三廳 ─────────────
  {
    id: '3-1', hall: 'h3', no: '18',
    title: 'Martinaise', zh: '馬汀內斯區',
    kind: 'panel', art: 'martinaise',
    pos: [-10.75, 2.3, -57], rotY: Math.PI / 2, size: [3.6, 2.5],
    body: [
      'Martinaise 位於 Revachol 西半部（Revachol West）的北岸，屬於 Jamrock 區的北端，也被稱為「北 Jamrock」或「狂野北方」。它被一條高架的 8/81 號公路與 Jamrock 其他地區隔開。',
      '這裡貧窮、殘破，許多建築至今仍是革命戰爭時留下的半毀狀態。主要道路 Rue de Saint-Ghislaine 沿著海濱延伸，一路通往港口。',
      '※ 展板地圖為策展示意圖，並非遊戲官方地圖。',
    ],
  },
  {
    id: '3-2', hall: 'h3', no: '19',
    title: 'Case File: The Hanged Man', zh: '案件檔案：後院的吊屍',
    kind: 'object', model: 'tree',
    pos: [-5, 0, -65], radius: 1.6,
    body: [
      '故事的起點：一名男子被吊死在旅館後院的一棵樹上，已經掛了好幾天。',
      '警方派來的警探本該負責調查此案——但他在旅館房間裡醒來時，連自己是誰都想不起來。',
      '案情的真相，請到遊戲中親自調查。本展只停在這裡。',
    ],
  },
  {
    id: '3-3', hall: 'h3', no: '20',
    title: 'The Detective & His Partner', zh: '警探與搭檔',
    kind: 'panel', art: 'detectives',
    pos: [10.75, 2.3, -57], rotY: -Math.PI / 2, size: [3.4, 2.4],
    body: [
      '主角是一名在宿醉中醒來、失去記憶的警探。他不記得自己的名字、案子、甚至這個世界——玩家與他一起，從零開始認識 Elysium。',
      'Kim Kitsuragi（金·曷城）是從第 57 分局派來協助辦案的警督（Lieutenant）。他冷靜、專業、一絲不苟，是主角在 Martinaise 最重要的同伴。',
      '※ 展板上的剪影為策展人原創的抽象詮釋。',
    ],
  },
  {
    id: '3-4', hall: 'h3', no: '21',
    title: 'Revachol Citizens Militia', zh: 'RCM：瑞瓦肖市民民兵',
    kind: 'object', model: 'badge',
    pos: [5, 0, -61], radius: 1.0,
    body: [
      'Revachol 沒有一般意義上的「警察」。維持治安的是「Revachol Citizens Militia（瑞瓦肖市民民兵，簡稱 RCM）」——一支由市民自行組織的民兵隊伍，後來逐漸成為城市的執法機構。',
      'RCM 的起源眾說紛紜：有人認為它承襲自公社時期的武裝力量，也有人認為是聯軍或市民所建立。答案至今沒有定論。',
      '這枚徽章是策展人原創設計，並非遊戲中的官方徽章。',
    ],
  },
  {
    id: '3-5', hall: 'h3', no: '22',
    title: 'The Strike', zh: '碼頭工會與罷工',
    kind: 'object', model: 'strike',
    pos: [5.5, 0, -68], radius: 1.8,
    body: [
      'Martinaise 緊鄰「大瑞瓦肖工業港（Greater Revachol Industrial Harbour）」。港口的 B 號碼頭屬於大企業 Wild Pines 集團。',
      '碼頭工會（Dockworkers\' Union）已經罷工約四個月，港口大門深鎖，貨車在路上塞成一片。公司也組織了一批反罷工人員，在門外抗議。',
      '由於兩個分局都不想管這塊地方，工會實際上成了 Martinaise 的「地下警察」。命案，就發生在這樣緊繃的氣氛裡。',
    ],
  },
  {
    id: '3-6', hall: 'h3', no: '23',
    title: 'Whirling-in-Rags', zh: '旋轉襤褸旅館',
    kind: 'object', model: 'hostel',
    pos: [0, 0, -73.2], radius: 2.5,
    body: [
      '「Whirling-in-Rags」是 Martinaise 的一間旅館兼餐館，也是警探醒來的地方——整個故事從這裡的一個房間開始。',
      '這座立面是策展人以油畫筆觸重新構想的致敬裝置，並非遊戲場景的還原。',
      '旅館的後院，就是那棵樹所在的地方。',
    ],
  },
];

// 對話模式：觀展時插話的「內心聲音」（對應 Disco Elysium / Speech Cabinet 四大技能色系與檢定格式）
export const VOICE_COLORS = {
  記憶: '#5CC1D7', // Intellect (Encyclopedia / Logic)
  直覺: '#CB476A', // Physique (Shivers / Half Light)
  懷疑: '#E3B734', // Motorics (Perception / Reaction Speed)
  想像: '#7556CF', // Psyche (Inland Empire / Empathy)
};

export const VOICE_META = {
  記憶: { en: 'ENCYCLOPEDIA', attr: 'intellect', portrait: 'public/portraits/Encyclopedia.png', sound: 'public/sounds/intellect.mp3' },
  直覺: { en: 'SHIVERS', attr: 'physique', portrait: 'public/portraits/Shivers.png', sound: 'public/sounds/physique.mp3' },
  懷疑: { en: 'RHETORIC', attr: 'motorics', portrait: 'public/portraits/Rhetoric.png', sound: 'public/sounds/motorics.mp3' },
  想像: { en: 'INLAND EMPIRE', attr: 'psyche', portrait: 'public/portraits/Inland empire.png', sound: 'public/sounds/psyche.mp3' },
};

// 各展品導覽員預設對應的 Speech Cabinet 肖像（百科全書、邏輯、概念化、視覺演算、共情等）
export const EXHIBIT_PORTRAITS = {
  '1-0': 'public/portraits/Conceptualization.png',
  '1-1': 'public/portraits/Encyclopedia.png',
  '1-2': 'public/portraits/Inland empire.png',
  '1-3': 'public/portraits/Volition.png',
  '1-4': 'public/portraits/Visual Calculus.png',
  '1-5': 'public/portraits/Shivers.png',
  '2-T1': 'public/portraits/Encyclopedia.png',
  '2-T2': 'public/portraits/Rhetoric.png',
  '2-T3': 'public/portraits/Rhetoric.png',
  '2-T4': 'public/portraits/Half Light.png',
  '2-T5': 'public/portraits/Volition.png',
  '2-T6': 'public/portraits/Logic.png',
  '2-T7': 'public/portraits/Shivers.png',
  '2-1': 'public/portraits/Encyclopedia.png',
  '2-2': 'public/portraits/Empathy.png',
  '2-3': 'public/portraits/Rhetoric.png',
  '2-4': 'public/portraits/Perception.png',
  '3-1': 'public/portraits/Shivers.png',
  '3-2': 'public/portraits/Visual Calculus.png',
  '3-3': 'public/portraits/Kim Kitsuragi.png',
  '3-4': 'public/portraits/Esprit de Corps.png',
  '3-5': 'public/portraits/Rhetoric.png',
  '3-6': 'public/portraits/Inland empire.png',
};

export const VOICES = {
  '1-0': ['想像', '一座你從沒去過、卻好像在哪裡見過的城市。你準備好了嗎？', 'Medium: Success'],
  '1-1': ['懷疑', '七座島。誰數的？灰域裡會不會還藏著第八座？', 'Challenging: Success'],
  '1-2': ['直覺', '別盯著那片灰色太久。它好像也在看你。', 'Formidable: Success'],
  '1-3': ['記憶', '六天。一年只能離開家六天——那還算是「世界」嗎？', 'Trivial: Success'],
  '1-4': ['想像', '坐在那艘飛船裡，窗外什麼都沒有。連「沒有」都沒有。', 'Medium: Success'],
  '1-5': ['直覺', '那些重疊的人聲……如果仔細聽，會不會有一個在叫你的名字？', 'Legendary: Success'],
  '2-T1': ['想像', '一個顧問說服了女王，世界就多了一塊大陸。歷史有時候就是一句話。', 'Easy: Success'],
  '2-T2': ['懷疑', '「世界之都」。每座城市在衰敗之前，大概都這麼稱呼過自己。', 'Medium: Success'],
  '2-T3': ['記憶', '三月七日。這個日期，會不會還有人記得？', 'Easy: Success'],
  '2-T4': ['直覺', '海面上的船越來越多。你知道接下來會發生什麼。', 'Challenging: Success'],
  '2-T5': ['懷疑', '簽字的是軍隊，不是黨。所以——它真的結束了嗎？', 'Formidable: Success'],
  '2-T6': ['想像', '二十一個 cordon，六面旗幟。一座城市被切成了拼圖。', 'Medium: Success'],
  '2-T7': ['記憶', '半個世紀。夠讓一場革命變成一則笑話，或一首老歌。', 'Easy: Success'],
  '2-1': ['懷疑', '「無罪」。能被這樣稱呼的人，手上通常最不乾淨。', 'Challenging: Success'],
  '2-2': ['想像', '她的光照了三百八十年，到現在還沒熄。', 'Heroic: Success'],
  '2-3': ['直覺', '它還在飄。沒有人敢把它真正收起來。', 'Medium: Success'],
  '2-4': ['記憶', '抬頭看。天上那個影子，在你出生之前就在那裡了。', 'Formidable: Success'],
  '3-1': ['直覺', '海風、柴油，還有某種腐爛的味道。歡迎來到馬汀內斯。', 'Easy: Success'],
  '3-2': ['懷疑', '一個人在樹上掛了好幾天，整區的人卻都「沒看見」？', 'Medium: Success'],
  '3-3': ['記憶', '你是誰？……這個問題，你得花上整個故事來回答。', 'Impossible: Failure'],
  '3-4': ['懷疑', '一座沒有自己國家的城市，由市民自己當警察。這要怎麼運作？', 'Challenging: Success'],
  '3-5': ['直覺', '空氣裡有火藥味。這裡隨時都可能出事。', 'Formidable: Success'],
  '3-6': ['想像', '推開那扇門，一切就要開始了。', 'Trivial: Success'],
};
