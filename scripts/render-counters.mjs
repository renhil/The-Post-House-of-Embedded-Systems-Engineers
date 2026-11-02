import {
  baudSTM32,
  formatHz,
  formatOhms,
  formatPct,
  formatSeconds,
  i2cPullup,
  timerForward,
} from "../assets/calc.js";
import { escapeHtml, renderPage, siteOrigin } from "./page.mjs";

function lines(list) {
  return `<ul>\n${list.map((item) => `          <li>${escapeHtml(item)}</li>`).join("\n")}\n        </ul>`;
}

function resistorExample() {
  return [
    "四环从左到右是两位数字、倍乘、误差。黄、紫、红是 4、7、×100，阻值 4700 Ω，也就是 4.7 kΩ。",
    "误差环不参与阻值。金做误差是 ±5%，银做误差是 ±10%。金、银做倍乘时分别是 ×0.1 和 ×0.01，不能拿来当数字。",
    "五环多一位有效数字，读法和四环相同。这页不算温度系数环。",
  ];
}

function baudExample() {
  const exact = baudSTM32(72e6, 115200, 16);
  const ugly = baudSTM32(8e6, 115200, 16);
  const exactError = Math.abs(exact.errorPct) < 1e-6 ? "0" : formatPct(exact.errorPct);
  return [
    `过采样 16 时，USARTDIV = fCK / (16 × 波特率)。小数部分按 1/16 四舍五入，写进 BRR 的低 4 位。过采样 8 时除数改成 8，小数只有 3 位，BRR 的第 3 位保持 0。`,
    `72 MHz、115200、过采样 16：USARTDIV ${exact.usartdiv.toFixed(4)}，整数 ${exact.mantissa}，小数 ${exact.fraction}，BRR 0x${exact.brr.toString(16).toUpperCase()}，实际波特率 ${Math.round(exact.actual)}，误差 ${exactError}。`,
    `8 MHz、115200、过采样 16：整数 ${ugly.mantissa}，小数 ${ugly.fraction}，实际约 ${Math.round(ugly.actual)}，误差 ${formatPct(ugly.errorPct)}。单边大约 2% 以内通常还能对上，两边时钟一起偏就会不稳。`,
    "这是 STM32 参考手册那套算法。OVER8 在寄存器里的位置，不同系列可能不同，写入前对照手头那颗芯片。",
  ];
}

function timerExample() {
  const forward = timerForward(72e6, 71, 999);
  return [
    "边沿对齐时，输出频率 f = fCLK / ((PSC+1) × (ARR+1))。PSC 和 ARR 是寄存器里的数，分频比要再加 1。",
    `72 MHz、PSC 71、ARR 999：频率 ${formatHz(forward.freq)}，周期 ${formatSeconds(forward.period)}。`,
    "边沿对齐 PWM 模式 1 的占空比大约是 CCR / (ARR+1)。中心对齐的计数周期不一样，不要套这个式子。",
  ];
}

function i2cExample() {
  const pull = i2cPullup({ vdd: 3.3, vol: 0.4, iolMa: 3, cbPf: 200, mode: "standard" });
  return [
    "估算来自 I²C 总线规范：Rp(max) = tr / (0.8473 × Cb)，Rp(min) = (VDD − VOL) / IOL。tr 这里用该模式的上升时间上限：标准模式 1000 ns，快速模式 300 ns，快速模式 Plus 120 ns。",
    `一组标准模式的例子：VDD 3.3 V，VOL 0.4 V，IOL 3 mA，总线电容 200 pF。Rp(min) ${formatOhms(pull.rpMin)}，Rp(max) ${formatOhms(pull.rpMax)}，上升时间上限 ${formatSeconds(pull.tr)}。窗口${pull.separable ? "还在，电阻可以落在这两端之间" : "是空的，速度或电容需要放宽"}。`,
    "这是估算。线一长、从机一多，电容就不是纸面上的 200 pF。边沿以示波器为准。",
  ];
}

const examples = {
  resistor: resistorExample,
  baud: baudExample,
  timer: timerExample,
  i2c: i2cExample,
};

export function assertCounters(counters) {
  if (!Array.isArray(counters.items) || counters.items.length < 4) {
    throw new Error("专项柜台至少 4 个。");
  }
  const ids = new Set();
  for (const item of counters.items) {
    if (!item.id || !/^[a-z0-9-]+$/.test(item.id)) throw new Error(`柜台 id 不合法：${item.id || ""}`);
    if (ids.has(item.id)) throw new Error(`柜台 id 重复：${item.id}`);
    ids.add(item.id);
    for (const key of ["title", "description", "lead", "tool", "toolLabel", "example"]) {
      if (!item[key]) throw new Error(`${item.id} 缺少 ${key}`);
    }
    if (!["resistor", "baud", "timer", "bench"].includes(item.tool)) {
      throw new Error(`${item.id} 的工具页锚点不认识`);
    }
    if (!examples[item.example]) throw new Error(`${item.id} 没有对应的算例`);
    if (!Array.isArray(item.sections) || item.sections.length === 0) {
      throw new Error(`${item.id} 缺少说明`);
    }
  }
}

export function renderCounterPage(item) {
  const demo = examples[item.example]();
  const body = `      <header class="page-head">
        <p class="eyebrow">专项柜台</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="lede">${escapeHtml(item.lead)}</p>
      </header>
      ${item.sections.map((section) => `<section class="sheet">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
      </section>`).join("\n      ")}
      <section class="sheet">
        <h2>可以直接对的数</h2>
        ${lines(demo)}
        <p>数字由本站 <code>assets/calc.js</code> 在构建时算出来，和工具台上的是同一套式子。</p>
        <p><a class="btn btn-wax" href="tools.html#${escapeHtml(item.tool)}">${escapeHtml(item.toolLabel)}</a></p>
      </section>`;
  return renderPage({
    title: `${item.title} · 嵌入式驿站`,
    description: item.description,
    canonicalPath: `${item.id}.html`,
    body,
  });
}

export function counterFeedItems(items) {
  return items.map((item) => ({
    title: item.title,
    link: `${siteOrigin}/${item.id}.html`,
    description: item.description,
  }));
}
