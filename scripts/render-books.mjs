const site = "https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers";

const requiredArrays = ["era", "why", "pace", "figures", "themes", "questions", "engineer", "sources"];

export function assertBooks(books) {
  if (!Array.isArray(books.items) || books.items.length < 12) {
    throw new Error("书房至少要有 12 本书。");
  }
  const ids = new Set();
  for (const book of books.items) {
    if (!book.id || !/^[a-z0-9-]+$/.test(book.id)) throw new Error(`书的 id 不合法：${book.id || ""}`);
    if (ids.has(book.id)) throw new Error(`书的 id 重复：${book.id}`);
    ids.add(book.id);
    for (const key of ["title", "originalTitle", "author", "published", "language", "oneLiner"]) {
      if (!book[key]) throw new Error(`${book.id} 缺少 ${key}`);
    }
    for (const key of requiredArrays) {
      if (!Array.isArray(book[key]) || book[key].length === 0) {
        throw new Error(`${book.id} 的 ${key} 不能空`);
      }
    }
    for (const figure of book.figures) {
      if (!figure.name || !figure.note) throw new Error(`${book.id} 的人物缺少 name 或 note`);
    }
    for (const source of book.sources) {
      if (!source.label || !source.access) throw new Error(`${book.id} 的全文链接缺少说明`);
      let url;
      try {
        url = new URL(source.url);
      } catch {
        throw new Error(`${book.id} 的链接不是 URL`);
      }
      if (url.protocol !== "https:") throw new Error(`${book.id} 的全文链接要用 https`);
    }
    if (book.quote) {
      if (!book.quote.text || !book.quote.note) throw new Error(`${book.id} 的短引文缺少出处说明`);
      if (book.quote.text.length > 280) throw new Error(`${book.id} 的引文太长，只保留短引`);
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function paragraphs(list) {
  return list.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n");
}

function layout({ title, description, canonicalPath, body }) {
  const canonical = `${site}/${canonicalPath}`;
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
  <meta property="og:image" content="${site}/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${site}/assets/og.png">
  <meta name="theme-color" content="#12100e">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="../assets/apple-touch.png">
  <link rel="stylesheet" href="../assets/site.css">
</head>
<body data-page="books">
  <a class="skip" href="#main">跳到正文</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="../index.html"><span class="seal" aria-hidden="true">驿</span><span class="brand-text"><strong>嵌入式驿站</strong><small>THE POST HOUSE</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">菜单</button>
      <nav class="nav" id="site-nav">
        <a data-nav="home" href="../index.html">首页</a>
        <a data-nav="tools" href="../tools.html">工具</a>
        <a data-nav="cheats" href="../cheats.html">速查</a>
        <a data-nav="books" href="../books.html">书房</a>
        <a data-nav="market" href="../market.html">华强北</a>
        <a data-nav="daily" href="../daily.html">每日题</a>
        <a data-nav="jokes" href="../jokes.html">段子</a>
        <a data-nav="board" href="../board.html">告示</a>
        <a data-nav="about" href="../about.html">关于</a>
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
      <p>嵌入式驿站 · 书房</p>
      <p class="fine">过客 <span id="busuanzi_container_site_uv"><span id="busuanzi_value_site_uv">…</span></span> · 翻阅 <span id="busuanzi_container_site_pv"><span id="busuanzi_value_site_pv">…</span></span> · 目标 1000</p>
      <p class="fine"><a href="../books.html">回书房</a> · <a href="../index.html">回柜台</a></p>
    </div>
  </footer>
  <script defer src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <script type="module" src="../assets/site.js"></script>
</body>
</html>
`;
}

export function renderBookPage(book) {
  const description = `${book.oneLiner} ${book.author}《${book.title}》导读：时代、读法和留给读者的问题。`;
  const quote = book.quote
    ? `<blockquote class="pullquote"><p>${escapeHtml(book.quote.text)}</p><p class="fine">${escapeHtml(book.quote.note)}</p></blockquote>`
    : "";
  const body = `      <header class="page-head">
        <p class="eyebrow">驿站书房</p>
        <h1>${escapeHtml(book.title)}</h1>
        <p class="lede">${escapeHtml(book.originalTitle)}</p>
        <p class="fine">${escapeHtml(book.author)} · ${escapeHtml(book.authorOriginal || "")} · ${escapeHtml(book.published)} · ${escapeHtml(book.language)}</p>
      </header>
      <p class="note">这篇导读是驿站写的。短引文只取公有领域原文。这里不收录仍受版权保护的中文译本。</p>
      ${quote}
      <section class="sheet">
        <h2>作者和时代</h2>
        ${paragraphs(book.era)}
      </section>
      <section class="sheet">
        <h2>一句话</h2>
        <p>${escapeHtml(book.oneLiner)}</p>
      </section>
      <section class="sheet">
        <h2>为什么值得读</h2>
        ${paragraphs(book.why)}
      </section>
      <section class="sheet">
        <h2>怎么读</h2>
        ${paragraphs(book.pace)}
      </section>
      <section class="sheet">
        <h2>人物</h2>
        <ul>
          ${book.figures.map((item) => `<li><strong>${escapeHtml(item.name)}</strong>　${escapeHtml(item.note)}</li>`).join("\n          ")}
        </ul>
      </section>
      <section class="sheet">
        <h2>主题</h2>
        <ul>
          ${book.themes.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
      </section>
      <section class="sheet">
        <h2>留给你的问题</h2>
        <ol>
          ${book.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ol>
      </section>
      <section class="sheet">
        <h2>工程师视角</h2>
        ${paragraphs(book.engineer)}
      </section>
      <section class="sheet">
        <h2>公有领域全文</h2>
        <ul>
          ${book.sources.map((item) => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>　${escapeHtml(item.access)}</li>`).join("\n          ")}
        </ul>
      </section>`;
  return layout({
    title: `${book.title} · 驿站书房`,
    description,
    canonicalPath: `books/${book.id}.html`,
    body,
  });
}
