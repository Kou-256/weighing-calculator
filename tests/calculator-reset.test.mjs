import test from "node:test";
import assert from "node:assert/strict";
import { resetWeighingStockWorkspace } from "../src/lib/calculator-reset.mjs";

test("result reset clears only pending aliquots, retaining stock selections and permanent records", () => {
  const data = { schema: 1, stocks: [{ id: "eu" }], records: [{ id: "record" }], delivery: { "1:Eu₂O₃": { mode: "stock" } }, drafts: { "1:Eu₂O₃": { value: "500" } }, extra: "keep" };
  const snapshot = structuredClone(data);
  const result = resetWeighingStockWorkspace(data);
  assert.deepEqual(result, { ...data, drafts: {} });
  assert.deepEqual(data, snapshot);
  assert.equal(result.stocks, data.stocks);
  assert.equal(result.records, data.records);
});

test("all-input reset clears selections and pending aliquots, never the stock ledger", () => {
  const data = { stocks: [{ id: "bi" }], records: [{ id: "record" }], delivery: { legacy: { mode: "stock" } }, drafts: { pending: {} } };
  assert.deepEqual(resetWeighingStockWorkspace(data, true), { ...data, delivery: {}, drafts: {} });
  assert.deepEqual(data.delivery, { legacy: { mode: "stock" } });
});
