import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

const qIds = new Set();
if (!Array.isArray(questions.items) || questions.items.length < 30) {
  throw new Error("题库至少要有 30 道题。");
}
for (const item of questions.items) {
  if (!item.id || !item.q || !item.a || !item.level || !Array.isArray(item.tags)) {
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
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

const urls = pages
  .filter((page) => page !== "404.html")
  .map((page) => `  <url><loc>${page === "index.html" ? `${site}/` : `${site}/${page}`}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(dist, "robots.txt"), robots);
fs.writeFileSync(path.join(root, "robots.txt"), robots);

console.log(`build ok → ${dist}`);
