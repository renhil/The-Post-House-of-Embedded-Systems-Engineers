/**
 * 纯计算，不碰 DOM。页面和 node 自检共用。
 * 器件参数公式只覆盖常见教材 / 参考手册里的定义，具体芯片以手册为准。
 */

export const DIGIT_COLORS = [
  { key: "black", name: "黑", digit: 0, hex: "#161616" },
  { key: "brown", name: "棕", digit: 1, hex: "#6b3a1f" },
  { key: "red", name: "红", digit: 2, hex: "#c0392b" },
  { key: "orange", name: "橙", digit: 3, hex: "#e67e22" },
  { key: "yellow", name: "黄", digit: 4, hex: "#d4a017" },
  { key: "green", name: "绿", digit: 5, hex: "#1e8449" },
  { key: "blue", name: "蓝", digit: 6, hex: "#2471a3" },
  { key: "violet", name: "紫", digit: 7, hex: "#7d3c98" },
  { key: "grey", name: "灰", digit: 8, hex: "#7f8c8d" },
  { key: "white", name: "白", digit: 9, hex: "#f7f9f9" },
];

export const MULT_COLORS = [
  ...DIGIT_COLORS.map((c, i) => ({ ...c, exp: i })),
  { key: "gold", name: "金", exp: -1, hex: "#d4af37" },
  { key: "silver", name: "银", exp: -2, hex: "#c5ccd6" },
];

export const TOL_COLORS = [
  { key: "brown", name: "棕", tol: 1, hex: "#6b3a1f" },
  { key: "red", name: "红", tol: 2, hex: "#c0392b" },
  { key: "green", name: "绿", tol: 0.5, hex: "#1e8449" },
  { key: "blue", name: "蓝", tol: 0.25, hex: "#2471a3" },
  { key: "violet", name: "紫", tol: 0.1, hex: "#7d3c98" },
  { key: "grey", name: "灰", tol: 0.05, hex: "#7f8c8d" },
  { key: "gold", name: "金", tol: 5, hex: "#d4af37" },
  { key: "silver", name: "银", tol: 10, hex: "#c5ccd6" },
  { key: "none", name: "无", tol: 20, hex: "#e7dfd0" },
];

const EPOCH_UTC = Date.UTC(2026, 0, 1);

export function colorByKey(list, key) {
  return list.find((c) => c.key === key) || null;
}

export function resistorValue(digitKeys, multKey) {
  const digits = digitKeys.map((key) => {
    const color = colorByKey(DIGIT_COLORS, key);
    if (!color) throw new Error(`无效数字色环：${key}`);
    return color.digit;
  });
  const mult = colorByKey(MULT_COLORS, multKey);
  if (!mult) throw new Error(`无效倍乘色环：${multKey}`);
  const significand = digits.reduce((acc, digit) => acc * 10 + digit, 0);
  return significand * 10 ** mult.exp;
}

export function bandsFromOhms(ohms, bandCount) {
  if (!Number.isFinite(ohms) || ohms < 0) {
    return { ok: false, reason: "阻值要是非负实数。" };
  }
  const sig = bandCount === 5 ? 3 : 2;
  if (ohms === 0) {
    return {
      ok: true,
      exact: true,
      note: "0 Ω 常用单黑环。下面是按色环位数凑出来的写法。",
      digits: Array.from({ length: sig }, () => "black"),
      mult: "black",
      value: 0,
    };
  }

  const minD = 10 ** (sig - 1);
  const maxD = 10 ** sig;
  let best = null;
  for (let exp = -2; exp <= 9; exp += 1) {
    const scale = 10 ** exp;
    const raw = ohms / scale;
    if (raw < minD * 0.999999 || raw >= maxD) continue;
    const rounded = Math.round(raw);
    if (rounded < minD || rounded >= maxD) continue;
    const value = rounded * scale;
    const err = Math.abs(value - ohms);
    if (!best || err < best.err) {
      const digits = String(rounded)
        .padStart(sig, "0")
        .split("")
        .map((ch) => DIGIT_COLORS[Number(ch)].key);
      const mult = MULT_COLORS.find((c) => c.exp === exp);
      best = {
        err,
        value,
        digits,
        mult: mult.key,
        exact: err <= Math.max(1e-9, ohms * 1e-9),
      };
    }
  }
  if (!best) {
    return { ok: false, reason: "这个阻值落不进常用色环倍乘（10⁻² 到 10⁹）。" };
  }
  return { ok: true, ...best };
}

export function formatOhms(ohms) {
  if (!Number.isFinite(ohms)) return "—";
  if (ohms === 0) return "0 Ω";
  const abs = Math.abs(ohms);
  const units = [
    [1e9, "GΩ"],
    [1e6, "MΩ"],
    [1e3, "kΩ"],
    [1, "Ω"],
    [1e-3, "mΩ"],
  ];
  for (const [scale, unit] of units) {
    if (abs >= scale) return `${trimNumber(ohms / scale)} ${unit}`;
  }
  return `${ohms.toExponential(3)} Ω`;
}

export function formatHz(hz) {
  if (!Number.isFinite(hz)) return "—";
  const abs = Math.abs(hz);
  if (abs >= 1e6) return `${trimNumber(hz / 1e6)} MHz`;
  if (abs >= 1e3) return `${trimNumber(hz / 1e3)} kHz`;
  if (abs >= 1) return `${trimNumber(hz)} Hz`;
  if (abs >= 1e-3) return `${trimNumber(hz * 1e3)} mHz`;
  return `${hz.toExponential(3)} Hz`;
}

export function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const abs = Math.abs(seconds);
  if (abs >= 1) return `${trimNumber(seconds)} s`;
  if (abs >= 1e-3) return `${trimNumber(seconds * 1e3)} ms`;
  if (abs >= 1e-6) return `${trimNumber(seconds * 1e6)} µs`;
  return `${trimNumber(seconds * 1e9)} ns`;
}

export function formatPct(value) {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)} %`;
}

function trimNumber(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 6 : abs >= 1 ? 6 : 4;
  return String(Number(value.toPrecision(digits)));
}

/**
 * STM32 参考手册里的 USART 分频。
 * 过采样 16：USARTDIV = fCK / (16 × Baud)，小数部分 4 bit。
 * 过采样 8：USARTDIV = fCK / (8 × Baud)，小数部分 3 bit，BRR[3] 保持 0。
 * 不同系列 OVER8 的位置可能不同，写入前对照手头那颗芯片。
 */
export function baudSTM32(fclk, baud, oversampling) {
  if (!(fclk > 0) || !(baud > 0) || !Number.isFinite(fclk) || !Number.isFinite(baud)) {
    throw new Error("时钟和波特率要是大于 0 的数。");
  }
  const over = oversampling === 8 ? 8 : 16;
  const usartdiv = fclk / (over * baud);
  let mantissa = Math.floor(usartdiv + 1e-10);
  const fracDiv = over === 16 ? 16 : 8;
  let fraction = Math.round((usartdiv - mantissa) * fracDiv);
  if (fraction >= fracDiv) {
    mantissa += 1;
    fraction = 0;
  }
  const brr = (mantissa << 4) | fraction;
  const actualDiv = mantissa + fraction / fracDiv;
  if (actualDiv === 0) throw new Error("分频结果为 0，时钟相对波特率太低。");
  const actual = fclk / (over * actualDiv);
  const errorPct = ((actual - baud) / baud) * 100;
  return { over, usartdiv, mantissa, fraction, brr, actual, errorPct };
}

export function timerForward(fclk, psc, arr) {
  if (!(fclk > 0) || !Number.isFinite(fclk)) throw new Error("定时器时钟要大于 0。");
  if (!Number.isInteger(psc) || !Number.isInteger(arr) || psc < 0 || arr < 0) {
    throw new Error("PSC 和 ARR 要是非负整数。");
  }
  const freq = fclk / ((psc + 1) * (arr + 1));
  return { freq, period: 1 / freq };
}

/**
 * 边沿对齐计数：f = fCLK / ((PSC+1)×(ARR+1))。
 * 在较小的那个因子不超过 sqrt(比值) 的范围内找误差最小的一对，并让 ARR 不小于 PSC，方便 PWM 分辨率。
 */
export function timerSolve(fclk, target, bits = 16) {
  if (!(fclk > 0) || !(target > 0)) throw new Error("时钟和目标频率要大于 0。");
  if (target > fclk) throw new Error("目标频率不能高于定时器时钟。");
  if (fclk > 1e9 || target < 0.01) {
    throw new Error("先把时钟放在 1 GHz 以内、目标频率放在 0.01 Hz 以上。");
  }
  const max = bits === 32 ? 2 ** 32 : 65536;
  const ratio = fclk / target;
  if (ratio > max * max) {
    throw new Error("当前位宽盖不住这么低的频率。换 32 位定时器，或先分频。");
  }
  const upper = Math.min(max, Math.ceil(Math.sqrt(ratio)) + 1);
  let best = null;
  for (let a = 1; a <= upper; a += 1) {
    const b = Math.round(ratio / a);
    if (b < 1 || b > max) continue;
    const actual = fclk / (a * b);
    const err = Math.abs(actual - target) / target;
    if (
      !best ||
      err < best.err - 1e-15 ||
      (Math.abs(err - best.err) <= 1e-15 && a + b < best.sum)
    ) {
      best = { a, b, actual, err, sum: a + b };
    }
  }
  if (!best) throw new Error("这个位宽里找不到合适的 PSC / ARR。");
  let pscDiv = best.a;
  let arrDiv = best.b;
  if (pscDiv > arrDiv) {
    const swap = pscDiv;
    pscDiv = arrDiv;
    arrDiv = swap;
  }
  return {
    psc: pscDiv - 1,
    arr: arrDiv - 1,
    freq: best.actual,
    period: 1 / best.actual,
    errorPct: ((best.actual - target) / target) * 100,
  };
}

/** 边沿对齐 PWM 模式 1 的常见关系：占空比 ≈ CCR / (ARR+1)。中心对齐不要用这个式子。 */
export function pwmCompare(arr, dutyPct) {
  if (!Number.isInteger(arr) || arr < 0) throw new Error("ARR 要是非负整数。");
  const duty = Math.min(100, Math.max(0, dutyPct));
  const ccr = Math.round(((arr + 1) * duty) / 100);
  return {
    ccr,
    duty: (ccr / (arr + 1)) * 100,
    note: ccr > arr ? "100% 时 CCR 会等于 ARR+1。有的定时器 CCR 最大只能到 ARR，请按手册夹住。" : "",
  };
}

export function voltageDivider(vin, rTop, rBottom) {
  if (![vin, rTop, rBottom].every(Number.isFinite)) throw new Error("有空着的数。");
  if (rTop < 0 || rBottom < 0 || rTop + rBottom === 0) throw new Error("两个电阻不能都是 0，也不能是负的。");
  const vout = (vin * rBottom) / (rTop + rBottom);
  const current = vin / (rTop + rBottom);
  return {
    vout,
    current,
    pTop: current * current * rTop,
    pBottom: current * current * rBottom,
  };
}

export function ledResistor(vSource, vf, ifMa) {
  if (![vSource, vf, ifMa].every(Number.isFinite)) throw new Error("有空着的数。");
  const current = ifMa / 1000;
  if (!(vSource > vf) || !(current > 0)) {
    throw new Error("电源要高于正向压降，电流要大于 0。");
  }
  const resistance = (vSource - vf) / current;
  return { resistance, power: current * current * resistance, current };
}

export function rcLowpass(resistance, capacitance) {
  if (!(resistance > 0) || !(capacitance > 0)) throw new Error("R 和 C 要大于 0。");
  const tau = resistance * capacitance;
  return { tau, f3db: 1 / (2 * Math.PI * tau) };
}

export function dbmToMw(dbm) {
  if (!Number.isFinite(dbm)) throw new Error("dBm 不是个数。");
  const mw = 10 ** (dbm / 10);
  return { mw, w: mw / 1000 };
}

export function vrmsFromMw(mw, resistance = 50) {
  if (!(mw >= 0) || !(resistance > 0)) throw new Error("功率或电阻不合法。");
  return Math.sqrt((mw / 1000) * resistance);
}

/**
 * I²C 总线规范里的上拉估算：
 * Rp(max) = tr / (0.8473 × Cb)，Rp(min) = (VDD − VOL) / IOL。
 * 这是估算，边沿以示波器为准。
 */
export function i2cPullup({ vdd, vol = 0.4, iolMa = 3, cbPf = 200, mode = "standard" }) {
  const rise = { standard: 1000e-9, fast: 300e-9, fastPlus: 120e-9 };
  const tr = rise[mode];
  if (!tr) throw new Error("未知的 I²C 模式。");
  const cb = cbPf * 1e-12;
  const iol = iolMa / 1000;
  if (!(vdd > vol) || !(iol > 0) || !(cb > 0)) throw new Error("电压、电流或总线电容不合法。");
  const rpMax = tr / (0.8473 * cb);
  const rpMin = (vdd - vol) / iol;
  return { rpMax, rpMin, tr, separable: rpMax > rpMin };
}

export function parseBitword(text) {
  const raw = String(text).trim().replace(/_/g, "");
  if (!raw) throw new Error("先写一个数。");
  if (/^0x[0-9a-f]+$/i.test(raw)) return BigInt(raw);
  if (/^0b[01]+$/i.test(raw)) return BigInt(raw);
  if (/^[0-9]+$/.test(raw)) return BigInt(raw);
  throw new Error("用十进制、0x 开头的十六进制，或 0b 开头的二进制。");
}

export function bitsOf(value, width = 32) {
  const mask = (1n << BigInt(width)) - 1n;
  const word = BigInt(value) & mask;
  const bits = [];
  for (let i = width - 1; i >= 0; i -= 1) {
    bits.push(Number((word >> BigInt(i)) & 1n));
  }
  return {
    value: word,
    bits,
    hex: `0x${word.toString(16).toUpperCase()}`,
    dec: word.toString(10),
  };
}

export function localDayNumber(date) {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day - EPOCH_UTC) / 86400000);
}

export function pickIndex(date, length) {
  if (length <= 0) return 0;
  const n = localDayNumber(date);
  return ((n % length) + length) % length;
}

export function formatDate(date) {
  const week = "日一二三四五六"[date.getDay()];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 周${week}`;
}

export function scaleByUnit(value, unit) {
  const scale = { Hz: 1, kHz: 1e3, MHz: 1e6, "Ω": 1, "kΩ": 1e3, "MΩ": 1e6, F: 1, µF: 1e-6, nF: 1e-9, pF: 1e-12 };
  if (!(unit in scale)) throw new Error(`不认识的单位：${unit}`);
  if (!Number.isFinite(value)) throw new Error("数字空了。");
  return value * scale[unit];
}
