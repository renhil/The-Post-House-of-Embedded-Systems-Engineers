import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { formatDate, pickIndex, pickWeekIndex, shanghaiDate } from "../assets/calc.js";
import { baiduHmSrc, injectBaiduAnalytics } from "./baidu.mjs";
import { indexNowKey } from "./indexnow.mjs";
import { escapeHtml } from "./page.mjs";
import { assertBooks, renderBookPage } from "./render-books.mjs";
import { assertCounters, counterFeedItems, renderCounterPage } from "./render-counters.mjs";
import { renderFeed } from "./render-feed.mjs";
import { questionArchiveHtml, questionFeedItems, renderQuestionPage } from "./render-questions.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const site = "https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers";

const check = spawnSync(process.execPath, [path.join(root, "scripts/selfcheck.mjs")], { stdio: "inherit" });
if (check.status !== 0) process.exit(check.status ?? 1);

function readJson(name) {
  const file = path.join(root, "data", name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${name} 不是合法 JSON：${error.message}`);
  }
}

const questions = readJson("questions.json");
const jokes = readJson("jokes.json");
const events = readJson("events.json");
const markets = readJson("markets.json");
const books = readJson("books.json");
const counters = readJson("counters.json");
assertBooks(books);
assertCounters(counters);

const qIds = new Set();
if (!Array.isArray(questions.items) || questions.items.length < 30) {
  throw new Error("题库至少要有 30 道题。");
}
for (const item of questions.items) {
  if (!item.id || !/^[a-z0-9-]+$/.test(item.id) || !item.q || !item.a || !item.level || !Array.isArray(item.tags)) {
    throw new Error(`题目字段不完整：${item.id || "(无 id)"}`);
  }
  if (qIds.has(item.id)) throw new Error(`题目 id 重复：${item.id}`);
  qIds.add(item.id);
}
if (!Array.isArray(jokes.items) || jokes.items.length < 15) throw new Error("段子至少 15 条。");
for (const item of jokes.items) {
  if (!item.id || !item.text) throw new Error("段子字段不完整。");
}
for (const item of events.events || []) {
  if (item.example === true) throw new Error("示例活动不要放进 events，放进 examples。");
  if (!item.title || !item.date) throw new Error("真实活动要有 title 和 date。");
}
for (const item of markets.stalls || []) {
  if (item.example === true) continue;
  if (!item.name || !item.asOf || !item.source) {
    throw new Error("真实档口必须写 name、asOf 和 source。");
  }
}

const pages = [
  "index.html",
  "tools.html",
  "cheats.html",
  "market.html",
  "daily.html",
  "jokes.html",
  "board.html",
  "books.html",
  "counters.html",
  "about.html",
  "404.html",
];

const banned = /fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare|unpkg\.com|jsdelivr|ajax\.googleapis/i;
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  if (banned.test(html)) throw new Error(`${page} 引用了国内可能打不开的外部资源。`);
  if (page === "404.html") continue;
  for (const needle of ["<title>", 'name="description"', 'property="og:title"', 'rel="canonical"', "assets/og.png"]) {
    if (!html.includes(needle)) throw new Error(`${page} 缺少 ${needle}`);
  }
}

const toolIds = [
  "band-row", "resistor-out", "rev-form", "rev-value", "rev-unit", "rev-bands", "rev-out",
  "baud-clk", "baud-clk-unit", "baud-rate", "baud-over", "baud-out",
  "tim-clk", "tim-clk-unit", "tim-bits", "tim-psc", "tim-arr", "tim-duty",
  "tim-forward", "pwm-out", "tim-target", "tim-target-unit", "tim-solve", "tim-solve-out",
  "div-vin", "div-r1", "div-r1-unit", "div-r2", "div-r2-unit",
  "led-vs", "led-vf", "led-if", "rc-r", "rc-r-unit", "rc-c", "rc-c-unit",
  "dbm", "dbm-r", "i2c-vdd", "i2c-vol", "i2c-iol", "i2c-cb", "i2c-mode", "bench-out",
  "bit-in", "bit-error", "bit-meta", "bit-grid",
];
const toolsHtml = fs.readFileSync(path.join(root, "tools.html"), "utf8");
for (const id of toolIds) {
  if (!toolsHtml.includes(`id="${id}"`)) throw new Error(`tools.html 缺少 #${id}`);
}
for (const asset of ["assets/og.png", "assets/favicon.png", "assets/favicon.svg", "assets/apple-touch.png"]) {
  if (!fs.existsSync(path.join(root, asset))) throw new Error(`缺少 ${asset}`);
}

const css = fs.readFileSync(path.join(root, "assets/site.css"), "utf8");
if (banned.test(css) || /@import\s+url\(/i.test(css)) {
  throw new Error("样式表里有外部字体或样式。");
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyInto(relative) {
  const from = path.join(root, relative);
  const to = path.join(dist, relative);
  fs.cpSync(from, to, { recursive: true });
}

for (const page of pages) copyInto(page);
copyInto("assets");
copyInto("data");
fs.mkdirSync(path.join(dist, "books"), { recursive: true });
const bookPages = books.items.map((book) => {
  const relative = `books/${book.id}.html`;
  const html = renderBookPage(book);
  if (!html.includes("<title>") || !html.includes('rel="canonical"') || !html.includes("assets/og.png")) {
    throw new Error(`${relative} 缺少 SEO 标记`);
  }
  fs.writeFileSync(path.join(dist, relative), html);
  return relative;
});

fs.mkdirSync(path.join(dist, "q"), { recursive: true });
const questionPages = questions.items.map((item, index) => {
  const relative = `q/${item.id}.html`;
  const html = renderQuestionPage(item, index, questions.items);
  if (!html.includes("<title>") || !html.includes('rel="canonical"') || !html.includes("assets/og.png")) {
    throw new Error(`${relative} 缺少 SEO 标记`);
  }
  fs.writeFileSync(path.join(dist, relative), html);
  return relative;
});

const counterPages = counters.items.map((item) => {
  const relative = `${item.id}.html`;
  const html = renderCounterPage(item);
  if (!html.includes("<title>") || !html.includes('rel="canonical"') || !html.includes("assets/og.png")) {
    throw new Error(`${relative} 缺少 SEO 标记`);
  }
  fs.writeFileSync(path.join(dist, relative), html);
  return relative;
});

const today = shanghaiDate();
const question = questions.items[pickIndex(today, questions.items.length)];
const joke = jokes.items[pickIndex(today, jokes.items.length)];
const book = books.items[pickWeekIndex(today, books.items.length)];
const dateText = formatDate(today);

function fill(relative, pairs) {
  const file = path.join(dist, relative);
  let text = fs.readFileSync(file, "utf8");
  for (const [token, value] of pairs) {
    if (!text.includes(token)) throw new Error(`${relative} 缺少 ${token}`);
    text = text.replaceAll(token, value);
  }
  fs.writeFileSync(file, text);
}

fill("index.html", [
  ["<!-- build:today-date -->", escapeHtml(dateText)],
  ["<!-- build:today-q -->", escapeHtml(question.q)],
  ["<!-- build:today-meta -->", escapeHtml(`${question.level} · ${question.tags.join(" / ")}`)],
  ["<!-- build:today-href -->", `q/${question.id}.html`],
  ["<!-- build:today-joke-date -->", escapeHtml(dateText)],
  ["<!-- build:today-joke -->", escapeHtml(joke.text)],
  ["<!-- build:week-title -->", escapeHtml(`《${book.title}》`)],
  ["<!-- build:week-line -->", escapeHtml(book.oneLiner)],
  ["<!-- build:week-meta -->", escapeHtml(`${book.author} · ${book.published}`)],
  ["<!-- build:week-href -->", `books/${book.id}.html`],
]);
fill("daily.html", [
  ["<!-- build:q-archive -->", questionArchiveHtml(questions.items, question.id)],
  ["<!-- build:today-slip -->", `q/${question.id}.html`],
]);
fill("counters.html", [
  ["<!-- build:counter-list -->", counters.items.map((item, index) => `
      <a class="book-card" href="${item.id}.html">
        <span class="num">${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="blurb">${escapeHtml(item.description)}</span>
      </a>`).join("")],
]);

const feed = renderFeed([
  ...questionFeedItems(questions.items),
  ...counterFeedItems(counters.items),
  ...books.items.map((item) => ({
    title: `《${item.title}》`,
    link: `${site}/books/${item.id}.html`,
    description: item.oneLiner,
  })),
], new Date());
fs.writeFileSync(path.join(dist, "feed.xml"), feed);
fs.writeFileSync(path.join(root, "feed.xml"), feed);

fs.writeFileSync(path.join(dist, ".nojekyll"), "");

function htmlFilesUnder(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFilesUnder(full, found);
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

const htmlFiles = htmlFilesUnder(dist);
if (htmlFiles.length < pages.length + books.items.length) {
  throw new Error(`输出页面太少：${htmlFiles.length}`);
}
for (const file of htmlFiles) {
  const relative = path.relative(dist, file);
  const before = fs.readFileSync(file, "utf8");
  const hadBusuanzi = before.includes("busuanzi.pure.mini.js");
  const next = injectBaiduAnalytics(before, relative);
  if (hadBusuanzi && !next.includes("busuanzi.pure.mini.js")) {
    throw new Error(`${relative} 丢失了不蒜子`);
  }
  if (!next.includes(baiduHmSrc)) throw new Error(`${relative} 没有写入百度统计`);
  fs.writeFileSync(file, next);
}
console.log(`baidu analytics → ${htmlFiles.length} pages`);

const urls = [...pages.filter((page) => page !== "404.html"), ...bookPages, ...questionPages, ...counterPages, "feed.xml"]
  .map((page) => `  <url><loc>${page === "index.html" ? `${site}/` : `${site}/${page}`}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(dist, "robots.txt"), robots);
fs.writeFileSync(path.join(root, "robots.txt"), robots);

if (!/^[A-Za-z0-9-]{8,128}$/.test(indexNowKey)) throw new Error("IndexNow 密钥不合法");
fs.writeFileSync(path.join(dist, `${indexNowKey}.txt`), indexNowKey);

console.log(`build ok → ${dist}`);
