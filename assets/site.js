import { formatDate, pickIndex } from "./calc.js";

const SITE = "https://renhil.github.io/The-Post-House-of-Embedded-Systems-Engineers/";
const page = document.body.dataset.page || "";

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

document.querySelectorAll("[data-nav]").forEach((link) => {
  if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
});

function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("is-on"), 1800);
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

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

async function loadJson(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`打不开 ${path}`);
  return response.json();
}

async function bootToday() {
  const qRoot = document.querySelector("#today-question");
  const jRoot = document.querySelector("#today-joke");
  const dailyRoot = document.querySelector("#daily-root");
  const jokeRoot = document.querySelector("#joke-root");
  const archive = document.querySelector("#q-archive");
  const jokeList = document.querySelector("#joke-list");
  if (!qRoot && !jRoot && !dailyRoot && !jokeRoot && !archive && !jokeList) return;

  const [questions, jokes] = await Promise.all([
    loadJson("data/questions.json"),
    loadJson("data/jokes.json"),
  ]);
  const today = new Date();
  const qIndex = pickIndex(today, questions.items.length);
  const jIndex = pickIndex(today, jokes.items.length);
  const question = questions.items[qIndex];
  const joke = jokes.items[jIndex];
  const dateText = formatDate(today);

  if (qRoot) {
    qRoot.querySelector("[data-field=date]").textContent = dateText;
    qRoot.querySelector("[data-field=title]").textContent = question.q;
    qRoot.querySelector("[data-field=meta]").textContent = `${question.level} · ${question.tags.join(" / ")}`;
  }
  if (jRoot) {
    jRoot.querySelector("[data-field=date]").textContent = dateText;
    jRoot.querySelector("[data-field=text]").textContent = joke.text;
  }

  const copyToday = document.querySelector("#copy-today");
  if (copyToday) {
    copyToday.addEventListener("click", async () => {
      await copyText(`【嵌入式驿站 · ${dateText}】\n题目：${question.q}\n段子：${joke.text}\n${SITE}`);
      toast("今日卡片已抄好，可以贴到群里");
    });
  }

  if (dailyRoot) {
    dailyRoot.querySelector("[data-field=date]").textContent = dateText;
    dailyRoot.querySelector("[data-field=level]").textContent = question.level;
    dailyRoot.querySelector("[data-field=tags]").textContent = question.tags.join(" / ");
    dailyRoot.querySelector("[data-field=q]").textContent = question.q;
    dailyRoot.querySelector("[data-field=a]").textContent = question.a;
    document.querySelector("#reveal").addEventListener("click", () => {
      document.querySelector("[data-field=a]").hidden = false;
      document.querySelector("#reveal").hidden = true;
    });
    document.querySelector("#copy-q").addEventListener("click", async () => {
      await copyText(`【嵌入式驿站每日一题 · ${dateText}】\n${question.q}\n\n${SITE}daily.html`);
      toast("题目已抄好");
    });
  }

  if (archive) {
    archive.innerHTML = questions.items.map((item, index) => `
      <details${index === qIndex ? " open" : ""}>
        <summary><span class="tag">${escapeHtml(item.level)}</span>${escapeHtml(item.q)}</summary>
        <p>${escapeHtml(item.a)}</p>
        <p class="fine">${item.tags.map(escapeHtml).join(" · ")}</p>
      </details>
    `).join("");
  }

  if (jokeRoot) {
    jokeRoot.querySelector("[data-field=date]").textContent = dateText;
    jokeRoot.querySelector("[data-field=text]").textContent = joke.text;
    document.querySelector("#copy-joke").addEventListener("click", async () => {
      await copyText(`${joke.text}\n——嵌入式驿站 · ${dateText}\n${SITE}jokes.html`);
      toast("段子已抄好");
    });
  }

  if (jokeList) {
    jokeList.innerHTML = jokes.items.map((item, index) => `
      <li class="joke-item${index === jIndex ? " is-today" : ""}">
        <p>${escapeHtml(item.text)}</p>
        ${index === jIndex ? '<span class="tag">今日</span>' : ""}
      </li>
    `).join("");
  }
}

function bootCounter() {
  const uv = document.getElementById("busuanzi_value_site_uv");
  const state = document.getElementById("counter-state");
  const bar = document.getElementById("goal-bar");
  if (!uv) return;

  const apply = () => {
    const count = Number.parseInt(String(uv.textContent).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(count)) return false;
    if (bar) bar.style.width = `${Math.max(2, Math.min(100, (count / 1000) * 100))}%`;
    if (state) {
      state.textContent = count >= 1000 ? "一千位过客到齐了" : `距 1000 还差 ${1000 - count}`;
    }
    return true;
  };

  const observer = new MutationObserver(() => apply());
  observer.observe(uv, { childList: true, characterData: true, subtree: true });
  window.setTimeout(() => {
    if (!apply() && state) state.textContent = "计数暂时没连上，过一会儿再刷新";
  }, 5000);
}

function bootBoard() {
  const root = document.querySelector("#event-list");
  if (!root) return;
  loadJson("data/events.json").then((data) => {
    const events = (data.events || []).filter((item) => item && item.example !== true && item.title && item.date);
    if (!events.length) {
      root.innerHTML = `<p class="empty">告示板是空的。这是故意的：没核实过的时间、地点、主办方不会被写在这里。确认过的活动可以加进 <code>data/events.json</code> 的 events 数组。</p>`;
    } else {
      root.innerHTML = events.map((item) => {
        const href = item.url ? safeUrl(item.url) : "";
        const title = href ? `<a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
        const tags = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(" ");
        return `<article class="paper card"><p class="kicker">${escapeHtml(item.date)} ${escapeHtml(item.time || "")}</p><h3>${title}</h3><p>${escapeHtml(item.place || "")}</p><p>${escapeHtml(item.note || "")}</p><p>${tags}</p></article>`;
      }).join("");
    }
    const example = document.querySelector("#event-example");
    if (example) example.textContent = JSON.stringify(data.examples?.[0] ?? {}, null, 2);
  }).catch(() => {
    root.textContent = "告示没有加载出来。";
  });
}

function bootMarkets() {
  const root = document.querySelector("#area-list");
  if (!root) return;
  loadJson("data/markets.json").then((data) => {
    root.innerHTML = (data.areas || []).map((area) => `
      <article class="paper card">
        <p class="kicker">${escapeHtml(area.district || "")}</p>
        <h3>${escapeHtml(area.name || "")}</h3>
        <p>${escapeHtml(area.summary || "")}</p>
        <div class="split">
          <div><p class="fine">比较适合</p><ul>${(area.goodFor || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
          <div><p class="fine">别指望在这里解决</p><ul>${(area.notFor || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        </div>
      </article>
    `).join("");

    const stalls = (data.stalls || []).filter((item) => item.example !== true);
    const stallRoot = document.querySelector("#stall-list");
    if (stallRoot) {
      stallRoot.innerHTML = stalls.length
        ? stalls.map((item) => `
          <article class="paper card">
            <h3>${escapeHtml(item.name || "")}</h3>
            <p>${escapeHtml(item.sells || "")}</p>
            <p class="fine">${escapeHtml(item.area || "")} · 记录于 ${escapeHtml(item.asOf || "未知")} · 来源：${escapeHtml(item.source || "未注明")}</p>
            <p>${escapeHtml(item.note || "")}</p>
          </article>
        `).join("")
        : `<p class="empty">还没有收录真实档口。确认对方还在营业、并写上日期和来源之后，再放进 <code>data/markets.json</code> 的 stalls，同时把 example 设为 false。</p>`;
    }
    const example = document.querySelector("#stall-example");
    if (example) {
      example.textContent = JSON.stringify((data.stalls || []).find((item) => item.example) ?? {}, null, 2);
    }
  }).catch(() => {
    root.textContent = "地点数据没有加载出来。";
  });
}

bootToday().catch(() => {
  document.querySelectorAll("[data-field=title], [data-field=q], [data-field=text]").forEach((node) => {
    node.textContent = "内容没加载出来。请用本地服务器打开（npm run preview），不要直接双击 html 文件。";
  });
});
bootCounter();
bootBoard();
bootMarkets();
