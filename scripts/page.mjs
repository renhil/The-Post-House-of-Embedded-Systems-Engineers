export const siteOrigin = "https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export function renderPage({ title, description, canonicalPath, body, depth = 0, extraHead = "" }) {
  const prefix = depth > 0 ? "../".repeat(depth) : "";
  const canonical = `${siteOrigin}/${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="嵌入式驿站">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${siteOrigin}/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${siteOrigin}/assets/og.png">
  <meta name="theme-color" content="#12100e">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${prefix}assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="${prefix}assets/apple-touch.png">
  <link rel="stylesheet" href="${prefix}assets/site.css">
  ${extraHead}
</head>
<body data-page="desk">
  <a class="skip" href="#main">跳到正文</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${prefix}index.html"><span class="seal" aria-hidden="true">驿</span><span class="brand-text"><strong>嵌入式驿站</strong><small>THE POST HOUSE</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">菜单</button>
      <nav class="nav" id="site-nav">
        <a data-nav="home" href="${prefix}index.html">首页</a>
        <a data-nav="tools" href="${prefix}tools.html">工具</a>
        <a data-nav="cheats" href="${prefix}cheats.html">速查</a>
        <a data-nav="books" href="${prefix}books.html">书房</a>
        <a data-nav="market" href="${prefix}market.html">华强北</a>
        <a data-nav="daily" href="${prefix}daily.html">每日题</a>
        <a data-nav="jokes" href="${prefix}jokes.html">段子</a>
        <a data-nav="board" href="${prefix}board.html">告示</a>
        <a data-nav="about" href="${prefix}about.html">关于</a>
      </nav>
    </div>
  </header>
  <main id="main">
    <div class="wrap">
${body}
    </div>
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>嵌入式驿站</p>
      <p class="fine">过客 <span id="busuanzi_container_site_uv"><span id="busuanzi_value_site_uv">…</span></span> · 翻阅 <span id="busuanzi_container_site_pv"><span id="busuanzi_value_site_pv">…</span></span> · 目标 1000</p>
      <p class="fine"><a href="${prefix}index.html">回柜台</a> · <a href="${prefix}counters.html">专项柜台</a> · <a href="${prefix}daily.html">题库</a></p>
    </div>
  </footer>
  <script defer src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <script type="module" src="${prefix}assets/site.js"></script>
</body>
</html>
`;
}
