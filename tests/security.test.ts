import test from "node:test";
import assert from "node:assert/strict";
import { celulaCsv, linhaCsv } from "../src/lib/data/csv.ts";
import { lerEstadoPersistido } from "../src/lib/data/persistence.ts";
import { importarProdutoresRotas, LIMITE_REGISTROS_POR_ARQUIVO } from "../src/lib/data/import.ts";

test("neutraliza fórmulas e escapa delimitadores na exportação CSV", () => {
  assert.equal(celulaCsv("=1+1"), "'=1+1");
  assert.equal(linhaCsv(["rota;injetada", "normal"]), '"rota;injetada";normal');
});

test("descarta estado local corrompido ou estruturalmente inválido", () => {
  assert.equal(lerEstadoPersistido("não é JSON"), null);
  assert.equal(lerEstadoPersistido(JSON.stringify({ rotas: [{}] })), null);
  assert.deepEqual(lerEstadoPersistido(JSON.stringify({ unidadeAtivaId: "0081" })), {
    unidadeAtivaId: "0081",
  });
});

test("bloqueia arquivo com registros acima do limite", () => {
  const cabecalho = "Código;Nome;Rota;Volume/coleta;Veículo;Dt / Hr Coleta";
  const registro = "123;PRODUTOR;2783R;1000;0081VIA09TO01;09/09 04:35";
  const arquivo = [
    cabecalho,
    ...Array.from({ length: LIMITE_REGISTROS_POR_ARQUIVO + 1 }, () => registro),
  ].join("\n");
  const resultado = importarProdutoresRotas(arquivo, "grande.csv", 2026);

  assert.equal(resultado.produtores.length, 0);
  assert.ok(resultado.problemas.some((problema) => problema.campo === "arquivo"));
});
