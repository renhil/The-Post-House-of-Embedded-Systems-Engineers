# 嵌入式驿站

The Post House of Embedded Systems Engineers。给深圳的嵌入式和硬件工程师留的一座静态夜班柜台：每日一题、段子、能算的小工具、协议速查，以及一份不编价格的华强北备忘。

全站中文。不加载 Google Fonts 或其他容易在国内打不开的 CDN。样式和脚本都在仓库里，只有访问计数用了不蒜子。

## 上线地址

合并到 `main` 且在仓库设置里启用 GitHub Pages 之后：

<https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers/>

## 启用 GitHub Pages

仓库主人需要在 GitHub 上做一次选择，Actions 才能把站点发布出去。

1. 打开仓库的 **Settings → Pages**。
2. 在 **Build and deployment** 里，把 **Source** 选成 **GitHub Actions**。
3. 把包含 `.github/workflows/pages.yml` 的改动合并到 `main`。
4. 打开 **Actions**，确认 **Deploy GitHub Pages** 成功。
5. 成功之后，Pages 页会显示上面的地址。首页柜台卡片上的「过客」就是不蒜子统计的独立访客，目标先看到 1000。

如果仓库是私有的，免费计划下的 GitHub Pages 可能无法对公众开放，需要把仓库设为 Public。第一次部署时 GitHub 会创建名为 `github-pages` 的环境；若部署任务提示环境或 Pages 未启用，回到第 2 步。

自定义域名以后，要同时改各页的 `canonical`、`og:url`，以及 `scripts/build.mjs` 和 `assets/site.js` 里的站点地址，再重新构建，否则分享卡片和 sitemap 仍指向 github.io。

## 本地预览

需要 Node.js 20 或更新版本。页面会用 `fetch` 读取 JSON，所以不要直接双击 html。

```bash
npm run preview
```

浏览器打开 <http://127.0.0.1:4173> 。`npm run build` 会先跑计算器自检，再把可部署的文件放进 `dist/`。`dist/` 不提交，上线时由 Actions 重新构建。

## 站点结构

| 页面 | 内容 |
| --- | --- |
| `index.html` | 柜台、今日题、今日段子、访问进度 |
| `tools.html` | 电阻色环、波特率、定时器、分压 / LED / RC / dBm / I²C 上拉、位查看 |
| `cheats.html` | 电平、阻容、UART、I²C、SPI、CAN、调试口、公式 |
| `market.html` | 华强北采购备忘。不写价格 |
| `daily.html` | 按本地日期轮换的练习题 |
| `jokes.html` | 按本地日期轮换的段子 |
| `board.html` | 线下活动告示。默认是空的 |
| `books.html` | 驿站书房。导读在 `data/books.json`，单页构建到 `dist/books/` |
| `about.html` | 计数、投稿约定、本地预览 |

计算器在 `assets/calc.js`，自检是 `npm run check`。

## 改内容

- 题目：`data/questions.json`
- 段子：`data/jokes.json`
- 活动：`data/events.json` 的 `events` 数组。`examples` 里的条目不会展示
- 区域和档口：`data/markets.json`。真实档口要写 `asOf` 和 `source`，并把 `example` 设为 `false`
- 书房：`data/books.json`。只收原文已进入公有领域的书，导读自己写，不要贴仍受版权保护的中文译本。`npm run build` 会生成 `dist/books/<id>.html` 并写进 sitemap

不要编造具体活动、商户和价格。器件参数以原厂手册为准，页面里的经验阈值都标了适用范围。

活动也可以用 Issues 里的「投稿一个线下活动」模板。

## 访问统计

首页和各页使用 [不蒜子](https://busuanzi.ibruce.info/)：

```html
<script defer src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
```

不需要注册。过客数是 `site_uv`，翻阅数是 `site_pv`。不蒜子是第三方，能看到访问；本站不设账号。脚本打不开时，其余页面仍然能用。

## 引流时可以怎么说

把「今日卡片」抄进群，比只丢一个首页链接更像一封信。比较对得上读者的地方：深圳嵌入式和硬件相关的微信群、即刻 / 小红书上的工程师账号、电子工程专辑和 21ic 一类论坛的深圳或华强北话题、以及线下活动开始前把告示板链接交给主办方。第一版没有编任何一场活动，所以群发时不要声称「本周六有局」，除非 `data/events.json` 里已经有核实过的条目。
