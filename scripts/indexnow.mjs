import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pickIndex, shanghaiDate } from "../assets/calc.js";

export const indexNowKey = "49bb1fc2ecf85db30268665865266a4a";
export const siteOrigin = "https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers";
export const indexNowHost = "renhil.github.io";

export function keyLocation() {
  return `${siteOrigin}/${indexNowKey}.txt`;
}

export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
}

export function scheduleUrls(questions) {
  const item = questions.items[pickIndex(shanghaiDate(), questions.items.length)];
  return [
    `${siteOrigin}/`,
    `${siteOrigin}/daily.html`,
    `${siteOrigin}/q/${item.id}.html`,
  ];
}

export function indexNowPayload(urls) {
  return {
    host: indexNowHost,
    key: indexNowKey,
    keyLocation: keyLocation(),
    urlList: urls,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForKey() {
  const url = keyLocation();
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      const text = (await response.text()).replace(/\s+/g, "");
      if (response.status === 200 && text === indexNowKey) return;
      console.log(`密钥文件第 ${attempt} 次还没就绪：HTTP ${response.status}`);
    } catch (error) {
      console.log(`密钥文件第 ${attempt} 次打不开：${error.message}`);
    }
    await sleep(10_000);
  }
  throw new Error("密钥文件没有按原样公开，IndexNow 不会收下");
}

async function urlsToSubmit(schedule) {
  if (schedule) {
    const questions = JSON.parse(fs.readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));
    return scheduleUrls(questions);
  }
  const response = await fetch(`${siteOrigin}/sitemap.xml`);
  if (!response.ok) throw new Error(`站点地图打不开：HTTP ${response.status}`);
  return parseSitemap(await response.text()).filter((url) => url.startsWith(`${siteOrigin}/`) || url === `${siteOrigin}/`);
}

async function postUrls(urls) {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(urls)),
  });
  const body = await response.text();
  console.log(`IndexNow ${response.status} ${body}`);
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow 返回 ${response.status}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const schedule = process.argv.includes("--schedule");
  let urls;
  if (dryRun && !schedule) {
    urls = parseSitemap(fs.readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8"));
  } else if (dryRun && schedule) {
    const questions = JSON.parse(fs.readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));
    urls = scheduleUrls(questions);
  } else {
    urls = await urlsToSubmit(schedule);
  }
  urls = [...new Set(urls)].filter((url) => url.startsWith(siteOrigin));
  if (!urls.length) throw new Error("没有要通知的网址");
  console.log(`${dryRun ? "演练" : "提交"} ${urls.length} 条`);
  if (dryRun) {
    console.log(JSON.stringify(indexNowPayload(urls.slice(0, 3)), null, 2));
    console.log(urls.slice(0, 8).join("\n"));
    return;
  }
  await waitForKey();
  await postUrls(urls);
}

const calledDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (calledDirectly) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
