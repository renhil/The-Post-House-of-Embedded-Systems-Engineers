import { escapeHtml, renderPage, siteOrigin } from "./page.mjs";

const relatedByTag = [
  { tags: ["UART", "时钟"], href: "stm32-baud.html", label: "STM32 波特率柜台" },
  { tags: ["I2C"], href: "i2c-pullup.html", label: "I²C 上拉柜台" },
];

function clip(text, max) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

function related(tags) {
  return relatedByTag.filter((item) => item.tags.some((tag) => tags.includes(tag)));
}

export function questionArchiveHtml(items, openId) {
  return items.map((item) => `
      <details${item.id === openId ? " open" : ""}>
        <summary><span class="tag">${escapeHtml(item.level)}</span>${escapeHtml(item.q)}</summary>
        <p>${escapeHtml(item.a)}</p>
        <p class="fine">${item.tags.map(escapeHtml).join(" · ")} · <a href="q/${escapeHtml(item.id)}.html">固定页</a></p>
      </details>`).join("");
}

export function renderQuestionPage(item, index, items) {
  if (!/^[a-z0-9-]+$/.test(item.id)) throw new Error(`题目 id 不合法：${item.id}`);
  const prev = items[(index - 1 + items.length) % items.length];
  const next = items[(index + 1) % items.length];
  const links = related(item.tags);
  const description = `${clip(item.a, 120)} 驿站练习题，不是任何公司的真题。`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: item.q,
      text: item.q,
      answerCount: 1,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    },
  }).replace(/</g, "\\u003c");
  const body = `      <header class="page-head">
        <p class="eyebrow">题签 · ${escapeHtml(item.level)}</p>
        <h1>${escapeHtml(item.q)}</h1>
        <p class="fine">${item.tags.map(escapeHtml).join(" · ")}</p>
      </header>
      <p class="note">这是题库里的固定页，答案直接写在下面，方便检索和转发。每日一题那页会先把答案盖住。这些题是驿站写的练习，不是任何公司的真题。芯片行为以手册为准。</p>
      <section class="sheet">
        <h2>驿站的说法</h2>
        <p>${escapeHtml(item.a)}</p>
      </section>
      ${links.length ? `<section class="sheet">
        <h2>相关柜台</h2>
        <ul>
          ${links.map((link) => `<li><a href="../${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`).join("\n          ")}
        </ul>
      </section>` : ""}
      <p class="fine"><a href="../q/${escapeHtml(prev.id)}.html">上一题</a> · <a href="../daily.html">回题库</a> · <a href="../q/${escapeHtml(next.id)}.html">下一题</a></p>`;
  return renderPage({
    title: `${clip(item.q, 42)} · 嵌入式驿站`,
    description,
    canonicalPath: `q/${item.id}.html`,
    body,
    depth: 1,
    extraHead: `<script type="application/ld+json">${jsonLd}</script>`,
  });
}

export function questionFeedItems(items) {
  return items.map((item) => ({
    title: item.q,
    link: `${siteOrigin}/q/${item.id}.html`,
    description: item.a,
  }));
}
