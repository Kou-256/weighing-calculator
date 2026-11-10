import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONCENTRATION_STEP, validConcentrationStep, concentrationPrecision, shiftConcentration } from "../src/lib/concentration-step.mjs";

test("concentration default is 0.01 percent independent of display precision", () => {
  assert.equal(DEFAULT_CONCENTRATION_STEP, "0.01");
  assert.equal(shiftConcentration("0", "0.01", 1, 4), "0.01");
  assert.equal(shiftConcentration("0", "0.01", 1, 0), "0.01");
  assert.equal(concentrationPrecision("0.0001", 2), 4);
});

test("custom concentration steps work in both directions without floating point drift", () => {
  assert.equal(shiftConcentration("0.02", "0.1", 1, 4), "0.12");
  assert.equal(shiftConcentration("0.12", "0.1", -1, 4), "0.02");
  assert.equal(shiftConcentration("0.1", "0.2", 1, 4), "0.3");
  assert.equal(shiftConcentration("0", "0.00000001", 1, 0), "0.00000001");
});

test("concentration steps retain 0–100 limits and reject invalid settings", () => {
  for (const step of ["0", "", ".", "-1", "101", "Infinity", "NaN", "1e-3", "0.000000001", null]) {
    assert.equal(validConcentrationStep(step), false);
    assert.equal(shiftConcentration("0", step, 1, 4), "0.01");
  }
  assert.equal(validConcentrationStep("100"), true);
  assert.equal(shiftConcentration("99.99", "0.1", 1, 4), "100");
  assert.equal(shiftConcentration("0.01", "0.1", -1, 4), "0");
});

test("removes only fractional padding and preserves significant zeros", () => {
  assert.equal(shiftConcentration("99", "1", 1, 0), "100");
  assert.equal(shiftConcentration("9", "1", 1, 4), "10");
  assert.equal(shiftConcentration("0", "0.0100", 1, 8), "0.01");
  assert.equal(shiftConcentration("0.1000", "0.0001", 1, 4), "0.1001");
});
