import { siteOrigin } from "./page.mjs";

function xml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[ch]));
}

export function renderFeed(items, lastBuild) {
  const body = items.map((item) => `    <item>
      <title>${xml(item.title)}</title>
      <link>${xml(item.link)}</link>
      <guid isPermaLink="true">${xml(item.link)}</guid>
      <description>${xml(item.description)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>嵌入式驿站</title>
    <link>${siteOrigin}/</link>
    <description>深圳嵌入式驿站的题签、专项柜台和书房。练习题不是公司真题，公式和工具台是同一套。</description>
    <language>zh-CN</language>
    <lastBuildDate>${xml(lastBuild.toUTCString())}</lastBuildDate>
${body}
  </channel>
</rss>
`;
}
