import test from "node:test";
import assert from "node:assert/strict";
import { custoRota } from "../src/lib/calculations/routeCost.ts";
import type { Equipamento } from "../src/lib/domain/types.ts";

test("custo final concilia centavos da tela, exportação e soma das rotas", () => {
  const equipamento = { diaria: 0, custoKm: 1 } as Equipamento;
  const custo = custoRota(equipamento, 1820.215);
  assert.equal(custo, 1820.22);
  assert.equal(custo.toFixed(2), "1820.22");
  const a = custoRota(equipamento, 3061.876);
  const b = custoRota(equipamento, 2983.606);
  assert.equal((a + b).toFixed(2), "6045.49");
});

test("tarifas mantêm precisão até o cálculo do custo final", () => {
  const equipamento = { diaria: 100.1234, custoKm: 2.3456 } as Equipamento;
  assert.equal(custoRota(equipamento, 10), 123.58);
  assert.equal(equipamento.custoKm, 2.3456);
});
