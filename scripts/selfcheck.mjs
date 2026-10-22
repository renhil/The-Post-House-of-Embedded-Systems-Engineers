import assert from "node:assert/strict";
import {
  bandsFromOhms,
  baudSTM32,
  bitsOf,
  dbmToMw,
  formatOhms,
  i2cPullup,
  ledResistor,
  localDayNumber,
  pickIndex,
  pwmCompare,
  rcLowpass,
  resistorValue,
  timerForward,
  timerSolve,
  voltageDivider,
  vrmsFromMw,
} from "../assets/calc.js";

function close(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} 不接近 ${expected}`);
}

const fourK = bandsFromOhms(4700, 4);
assert.equal(fourK.ok, true);
assert.equal(fourK.exact, true);
assert.deepEqual(fourK.digits, ["yellow", "violet"]);
assert.equal(fourK.mult, "red");
assert.equal(resistorValue(["yellow", "violet"], "red"), 4700);

const oneOhm = bandsFromOhms(1, 4);
assert.deepEqual(oneOhm.digits, ["brown", "black"]);
assert.equal(oneOhm.mult, "gold");

const five = bandsFromOhms(10000, 5);
assert.deepEqual(five.digits, ["brown", "black", "black"]);
assert.equal(five.mult, "red");

assert.equal(formatOhms(4700), "4.7 kΩ");

const exact = baudSTM32(72e6, 115200, 16);
assert.equal(exact.mantissa, 39);
assert.equal(exact.fraction, 1);
assert.equal(exact.brr, (39 << 4) | 1);
close(exact.actual, 115200, 1e-6);
close(exact.errorPct, 0, 1e-6);

const slow = baudSTM32(72e6, 9600, 16);
assert.equal(slow.mantissa, 468);
assert.equal(slow.fraction, 12);
assert.equal(slow.brr, 0x1d4c);
close(slow.actual, 9600, 1e-6);

const ugly = baudSTM32(8e6, 115200, 16);
assert.equal(ugly.fraction, 5);
assert.equal(ugly.mantissa, 4);
close(ugly.errorPct, ((8000000 / 69 - 115200) / 115200) * 100, 1e-8);

const over8 = baudSTM32(16e6, 115200, 8);
assert.equal(over8.over, 8);
assert.ok(over8.fraction <= 7);
assert.equal(over8.brr & 0x8, 0);

const fwd = timerForward(72e6, 71, 999);
close(fwd.freq, 1000, 1e-6);

const solved = timerSolve(72e6, 1000, 16);
assert.equal((solved.psc + 1) * (solved.arr + 1), 72000);
close(solved.freq, 1000, 1e-6);
assert.ok(solved.arr >= solved.psc);

const pwm = pwmCompare(999, 50);
assert.equal(pwm.ccr, 500);
close(pwm.duty, 50, 1e-9);

const div = voltageDivider(3.3, 20000, 10000);
close(div.vout, 1.1, 1e-9);

const led = ledResistor(5, 2, 10);
close(led.resistance, 300, 1e-9);
close(led.power, 0.03, 1e-9);

const rc = rcLowpass(1000, 100e-9);
close(rc.tau, 1e-4, 1e-12);
close(rc.f3db, 1 / (2 * Math.PI * 1e-4), 1e-6);

close(dbmToMw(0).mw, 1, 1e-12);
close(dbmToMw(10).mw, 10, 1e-12);
close(vrmsFromMw(1, 50), Math.sqrt(0.001 * 50), 1e-12);

const i2c = i2cPullup({ vdd: 3.3, vol: 0.4, iolMa: 3, cbPf: 200, mode: "standard" });
close(i2c.rpMax, 1e-6 / (0.8473 * 200e-12), 1e-6);
close(i2c.rpMin, (3.3 - 0.4) / 0.003, 1e-6);
assert.equal(i2c.separable, true);

const bits = bitsOf(0xa5n, 8);
assert.deepEqual(bits.bits, [1, 0, 1, 0, 0, 1, 0, 1]);

const day = new Date(2026, 0, 1);
assert.equal(localDayNumber(day), 0);
assert.equal(pickIndex(day, 10), 0);
assert.equal(pickIndex(new Date(2026, 0, 2), 10), 1);
assert.equal(pickIndex(new Date(2025, 11, 31), 10), 9);

console.log("selfcheck ok");
