import {
  DIGIT_COLORS,
  MULT_COLORS,
  TOL_COLORS,
  bandsFromOhms,
  baudSTM32,
  bitsOf,
  colorByKey,
  dbmToMw,
  formatHz,
  formatOhms,
  formatPct,
  formatSeconds,
  i2cPullup,
  ledResistor,
  parseBitword,
  pwmCompare,
  rcLowpass,
  resistorValue,
  scaleByUnit,
  timerForward,
  timerSolve,
  voltageDivider,
  vrmsFromMw,
} from "./calc.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function options(list, selected, labelOf) {
  return list.map((item) => {
    const selectedAttr = item.key === selected ? " selected" : "";
    return `<option value="${item.key}"${selectedAttr}>${labelOf(item)}</option>`;
  }).join("");
}

const tabs = document.querySelectorAll("[data-tool]");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.setAttribute("aria-selected", item === tab ? "true" : "false"));
    document.querySelectorAll(".tool-panel").forEach((panel) => {
      panel.hidden = panel.id !== `tool-${tab.dataset.tool}`;
    });
  });
});

document.querySelectorAll(".chips").forEach((box) => {
  box.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const input = $(box.dataset.fill);
    input.value = button.dataset.value;
    if (button.dataset.unit && box.dataset.unit) $(box.dataset.unit).value = button.dataset.unit;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

let bandMode = 4;
const bandState = {
  4: ["yellow", "violet", "red", "gold"],
  5: ["brown", "black", "black", "brown", "brown"],
};

function currentBands() {
  return [...document.querySelectorAll("#band-row select")].map((node) => node.value);
}

function paintResistor(values) {
  const body = $("resistor-body");
  const palette = [...DIGIT_COLORS, ...MULT_COLORS, ...TOL_COLORS];
  body.innerHTML = values.map((key) => {
    const color = palette.find((item) => item.key === key);
    const hex = color?.hex || "#ccc";
    return `<i style="background:${hex}" title="${color?.name || ""}"></i>`;
  }).join("");
}

function readForward() {
  const values = currentBands();
  const digitCount = bandMode === 5 ? 3 : 2;
  const digits = values.slice(0, digitCount);
  const mult = values[digitCount];
  const tol = colorByKey(TOL_COLORS, values[digitCount + 1]);
  const ohms = resistorValue(digits, mult);
  const tolText = tol ? `±${tol.tol}%` : "";
  $("resistor-out").innerHTML = `${formatOhms(ohms)} <small>${tolText} · 色环 ${digits.map((key) => colorByKey(DIGIT_COLORS, key).name).join("")} × ${colorByKey(MULT_COLORS, mult).name}${tol ? tol.name : ""}</small>`;
  paintResistor(values);
  bandState[bandMode] = values;
}

function renderBandRow() {
  const digitCount = bandMode === 5 ? 3 : 2;
  const saved = bandState[bandMode];
  const fields = [];
  for (let i = 0; i < digitCount; i += 1) {
    fields.push({ label: `数字 ${i + 1}`, list: DIGIT_COLORS, value: saved[i], kind: "digit" });
  }
  fields.push({ label: "倍乘", list: MULT_COLORS, value: saved[digitCount], kind: "mult" });
  fields.push({ label: "误差", list: TOL_COLORS, value: saved[digitCount + 1], kind: "tol" });
  $("band-row").innerHTML = fields.map((field) => `
    <label class="band">${field.label}
      <span class="swatch"></span>
      <select data-kind="${field.kind}">${options(field.list, field.value, (item) => item.name)}</select>
    </label>
  `).join("");
  document.querySelectorAll("#band-row select").forEach((select) => {
    const paint = () => {
      const color = [...DIGIT_COLORS, ...MULT_COLORS, ...TOL_COLORS].find((item) => item.key === select.value);
      select.previousElementSibling.style.background = color?.hex || "#ccc";
    };
    select.addEventListener("change", () => {
      paint();
      readForward();
    });
    paint();
  });
  readForward();
}

document.querySelectorAll("[data-bands]").forEach((button) => {
  button.addEventListener("click", () => {
    bandMode = Number(button.dataset.bands);
    document.querySelectorAll("[data-bands]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    renderBandRow();
  });
});

$("rev-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const box = $("rev-out");
  try {
    const ohms = scaleByUnit(Number($("rev-value").value), $("rev-unit").value);
    const count = Number($("rev-bands").value);
    const found = bandsFromOhms(ohms, count);
    if (!found.ok) {
      box.innerHTML = `<span class="bad">${escapeHtml(found.reason)}</span>`;
      return;
    }
    const names = [
      ...found.digits.map((key) => colorByKey(DIGIT_COLORS, key).name),
      colorByKey(MULT_COLORS, found.mult).name,
    ];
    const exact = found.exact ? "刚好能用色环表示" : `最接近的是 ${formatOhms(found.value)}`;
    box.innerHTML = `${names.join(" · ")} <small>${exact}${found.note ? `。${found.note}` : ""}。误差环自己选，色环不编码具体精度以外的信息。</small>`;
    bandMode = count;
    document.querySelectorAll("[data-bands]").forEach((item) => {
      item.setAttribute("aria-pressed", Number(item.dataset.bands) === count ? "true" : "false");
    });
    const tol = bandState[count].at(-1);
    bandState[count] = [...found.digits, found.mult, tol];
    renderBandRow();
  } catch (error) {
    box.innerHTML = `<span class="bad">${escapeHtml(error.message)}</span>`;
  }
});

function bindRefresh(ids, fn) {
  ids.forEach((id) => {
    const node = $(id);
    node.addEventListener("input", fn);
    node.addEventListener("change", fn);
  });
  fn();
}

function tidy(value, digits = 4) {
  return String(Number(Number(value).toFixed(digits)));
}

function table(rows) {
  return `<table class="out-table">${rows.map(([name, value]) => `<tr><th>${name}</th><td>${value}</td></tr>`).join("")}</table>`;
}

function refreshBaud() {
  const box = $("baud-out");
  try {
    const fclk = scaleByUnit(Number($("baud-clk").value), $("baud-clk-unit").value);
    const baud = Number($("baud-rate").value);
    const over = Number($("baud-over").value);
    const result = baudSTM32(fclk, baud, over);
    const abs = Math.abs(result.errorPct);
    const tone = abs < 2 ? "ok" : abs < 3 ? "warn" : "bad";
    const word = abs < 2 ? "单边 2% 以内，经验上通常还能对上。" : abs < 3 ? "接近常用裕量，两边时钟一起偏就会不稳。" : "误差偏大，换时钟或换一个能整除的波特率。";
    box.innerHTML = table([
      ["USARTDIV", result.usartdiv.toFixed(6)],
      ["整数 / 小数", `${result.mantissa} / ${result.fraction}`],
      ["BRR", `0x${result.brr.toString(16).toUpperCase()}`],
      ["实际波特率", `${Math.round(result.actual)}（${formatHz(result.actual)}）`],
      ["误差", `<span class="${tone}">${formatPct(result.errorPct)}</span>`],
    ]) + `<p class="${tone}">${word} 这是 STM32 参考手册那套过采样 8/16 的算法，别的系列先对一下 BRR 位定义。</p>`;
  } catch (error) {
    box.innerHTML = `<p class="bad">${escapeHtml(error.message)}</p>`;
  }
}

function refreshTimer() {
  const forward = $("tim-forward");
  const pwm = $("pwm-out");
  try {
    const fclk = scaleByUnit(Number($("tim-clk").value), $("tim-clk-unit").value);
    const psc = Number($("tim-psc").value);
    const arr = Number($("tim-arr").value);
    const result = timerForward(fclk, psc, arr);
    forward.innerHTML = table([
      ["输出频率", formatHz(result.freq)],
      ["周期", formatSeconds(result.period)],
    ]);
    const duty = pwmCompare(arr, Number($("tim-duty").value));
    pwm.innerHTML = table([
      ["CCR", String(duty.ccr)],
      ["实际占空比", `${duty.duty.toFixed(2)} %`],
    ]) + (duty.note ? `<p class="warn">${duty.note}</p>` : "");
  } catch (error) {
    forward.innerHTML = `<p class="bad">${escapeHtml(error.message)}</p>`;
    pwm.textContent = "";
  }
}

$("tim-solve").addEventListener("click", () => {
  const box = $("tim-solve-out");
  try {
    const fclk = scaleByUnit(Number($("tim-clk").value), $("tim-clk-unit").value);
    const target = scaleByUnit(Number($("tim-target").value), $("tim-target-unit").value);
    const solved = timerSolve(fclk, target, Number($("tim-bits").value));
    $("tim-psc").value = String(solved.psc);
    $("tim-arr").value = String(solved.arr);
    box.innerHTML = table([
      ["PSC", String(solved.psc)],
      ["ARR", String(solved.arr)],
      ["实际频率", formatHz(solved.freq)],
      ["误差", formatPct(solved.errorPct)],
    ]) + `<p class="fine">已把 PSC / ARR 填回上面。算法让 ARR 不小于 PSC，方便边沿对齐 PWM 的分辨率。中心对齐的定时器不要直接套这个频率公式。</p>`;
    refreshTimer();
  } catch (error) {
    box.innerHTML = `<p class="bad">${escapeHtml(error.message)}</p>`;
  }
});

function refreshBench() {
  const box = $("bench-out");
  const blocks = [];
  try {
    const divider = voltageDivider(
      Number($("div-vin").value),
      scaleByUnit(Number($("div-r1").value), $("div-r1-unit").value),
      scaleByUnit(Number($("div-r2").value), $("div-r2-unit").value),
    );
    blocks.push(`<h3>分压</h3>` + table([
      ["Vout", `${tidy(divider.vout)} V`],
      ["电流", `${tidy(divider.current * 1000, 3)} mA`],
      ["上臂功耗", `${tidy(divider.pTop * 1000, 3)} mW`],
      ["下臂功耗", `${tidy(divider.pBottom * 1000, 3)} mW`],
    ]));
  } catch (error) {
    blocks.push(`<h3>分压</h3><p class="bad">${escapeHtml(error.message)}</p>`);
  }
  try {
    const led = ledResistor(Number($("led-vs").value), Number($("led-vf").value), Number($("led-if").value));
    blocks.push(`<h3>LED 限流电阻</h3>` + table([
      ["电阻", formatOhms(led.resistance)],
      ["电阻功耗", `${tidy(led.power * 1000, 2)} mW`],
    ]) + `<p class="fine">选电阻时留一点功率余量。正向压降用灯的典型值，颜色不同差很多。</p>`);
  } catch (error) {
    blocks.push(`<h3>LED 限流电阻</h3><p class="bad">${escapeHtml(error.message)}</p>`);
  }
  try {
    const rc = rcLowpass(
      scaleByUnit(Number($("rc-r").value), $("rc-r-unit").value),
      scaleByUnit(Number($("rc-c").value), $("rc-c-unit").value),
    );
    blocks.push(`<h3>RC 低通</h3>` + table([
      ["时间常数 τ", formatSeconds(rc.tau)],
      ["−3 dB", formatHz(rc.f3db)],
    ]));
  } catch (error) {
    blocks.push(`<h3>RC 低通</h3><p class="bad">${escapeHtml(error.message)}</p>`);
  }
  try {
    const power = dbmToMw(Number($("dbm").value));
    const vrms = vrmsFromMw(power.mw, Number($("dbm-r").value));
    blocks.push(`<h3>dBm</h3>` + table([
      ["功率", `${power.mw.toPrecision(6)} mW`],
      [`${$("dbm-r").value} Ω 上的 Vrms`, `${vrms.toPrecision(4)} V`],
    ]) + `<p class="fine">电压只在纯电阻匹配的假设下成立，天线和功放不要直接拿这个数当结论。</p>`);
  } catch (error) {
    blocks.push(`<h3>dBm</h3><p class="bad">${escapeHtml(error.message)}</p>`);
  }
  try {
    const pull = i2cPullup({
      vdd: Number($("i2c-vdd").value),
      vol: Number($("i2c-vol").value),
      iolMa: Number($("i2c-iol").value),
      cbPf: Number($("i2c-cb").value),
      mode: $("i2c-mode").value,
    });
    const tone = pull.separable ? "ok" : "bad";
    blocks.push(`<h3>I²C 上拉估算</h3>` + table([
      ["Rp(min)", formatOhms(pull.rpMin)],
      ["Rp(max)", formatOhms(pull.rpMax)],
      ["上升时间上限", formatSeconds(pull.tr)],
    ]) + `<p class="${tone}">${pull.separable ? "最小和最大之间还有空档，可以在这个区间里选一档。" : "这个窗口是空的：总线电容、速度或灌电流配不到一起。"} 公式来自 I²C 总线规范的估算，波形以示波器为准。</p>`);
  } catch (error) {
    blocks.push(`<h3>I²C 上拉估算</h3><p class="bad">${escapeHtml(error.message)}</p>`);
  }
  box.innerHTML = blocks.join("");
}

let bitWord = 0xa5n;

function renderBits() {
  const view = bitsOf(bitWord, 32);
  $("bit-meta").innerHTML = table([
    ["十六进制", view.hex],
    ["十进制", view.dec],
    ["置位", view.bits.map((bit, index) => (bit ? 31 - index : null)).filter((bit) => bit !== null).join(", ") || "无"],
  ]);
  $("bit-grid").innerHTML = view.bits.map((bit, index) => {
    const position = 31 - index;
    return `<button type="button" class="${bit ? "is-on" : ""}" data-bit="${position}" aria-pressed="${bit ? "true" : "false"}">${bit}<small>${position}</small></button>`;
  }).join("");
}

$("bit-grid").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const position = Number(button.dataset.bit);
  bitWord = bitsOf(bitWord ^ (1n << BigInt(position)), 32).value;
  $("bit-in").value = `0x${bitsOf(bitWord, 32).value.toString(16).toUpperCase()}`;
  renderBits();
});

$("bit-in").addEventListener("input", () => {
  try {
    bitWord = parseBitword($("bit-in").value);
    $("bit-error").textContent = "";
    renderBits();
  } catch (error) {
    $("bit-error").textContent = error.message;
  }
});

bindRefresh(["baud-clk", "baud-clk-unit", "baud-rate", "baud-over"], refreshBaud);
bindRefresh(["tim-clk", "tim-clk-unit", "tim-psc", "tim-arr", "tim-duty"], refreshTimer);
bindRefresh([
  "div-vin", "div-r1", "div-r1-unit", "div-r2", "div-r2-unit",
  "led-vs", "led-vf", "led-if",
  "rc-r", "rc-r-unit", "rc-c", "rc-c-unit",
  "dbm", "dbm-r",
  "i2c-vdd", "i2c-vol", "i2c-iol", "i2c-cb", "i2c-mode",
], refreshBench);
renderBandRow();
renderBits();
