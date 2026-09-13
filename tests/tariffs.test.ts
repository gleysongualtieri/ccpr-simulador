import test from "node:test";
import assert from "node:assert/strict";
import { importarMatrizTarifas } from "../src/lib/data/tariffImport.ts";
import {
  associarTransportadorasImportadas,
  cnpjValido,
  resolverTarifaRota,
  TRANSPORTADORAS_INICIAIS,
} from "../src/lib/data/tariffs.ts";
import type { RotaOperacional } from "../src/lib/domain/types.ts";

const CABECALHO = [
  "Local",
  "CNPJ",
  "TRANSPORTADORA",
  "COD_TARIFA",
  "TIPO",
  "DATA_INICIO",
  "DAT_FIM_VIGENCIA",
  "DIÁRIA",
  "KM",
  "VAL_KM_INICIO",
  "VAL_KM_FIM",
  "VAL_ADC_NOTURNO",
  "MOT_EXTRA",
  "DAT_ATUALIZACAO",
];
function linha(
  tipo: string,
  inicio: string,
  diaria: number,
  km: number,
  atualizacao: string,
): unknown[] {
  return [
    "0081 - POSTO DE UBERLANDIA",
    7031916000239,
    "077 - VIA LÁCTEOS TRANSPORTES - EIRELI",
    3,
    tipo,
    inicio,
    null,
    diaria,
    km,
    null,
    null,
    null,
    null,
    atualizacao,
  ];
}
const rotaBase: RotaOperacional = {
  codigo: "2783R",
  sufixoTipo: "R",
  unidadeId: "0081",
  regiao: "500",
  ciclo: "impar",
  veiculo: "0081VIA09TO01",
  transportadora: "VIA",
  equipamentoId: "toco",
  volumeL: 8000,
  km: 200,
  inicioRota: "01:00",
  chegadaBase: "10:00",
  dataExecucao: "2026-09-01T01:00:00.000Z",
  origem: { arquivo: "Route_now.csv", importadoEm: "2026-09-02T00:00:00.000Z", mock: false },
};

test("valida CNPJ com zero à esquerda", () => {
  assert.equal(cnpjValido(7031916000239), true);
  assert.equal(cnpjValido("04.197.002/0001-73"), true);
  assert.equal(cnpjValido("00.000.000/0000-00"), false);
});

test("consolida duplicata pela atualização mais recente", () => {
  const r = importarMatrizTarifas(
    [
      CABECALHO,
      linha("TOCO", "2026-06-01 00:00:00", 1000, 2.5, "2026-06-10 08:00:00"),
      linha("TOCO", "2026-06-01 00:00:00", 1143.0366, 2.8694, "2026-06-15 19:51:45"),
    ],
    "tarifas.xlsx",
  );
  assert.equal(r.tarifas.length, 1);
  assert.equal(r.duplicatasSubstituidas, 1);
  assert.equal(r.tarifas[0]?.equipamentoId, "toco");
  assert.equal(r.tarifas[0]?.diaria, 1143.0366);
});

test("mantém tipo ambíguo sem aplicar a equipamento", () => {
  const r = importarMatrizTarifas(
    [
      CABECALHO,
      linha("TOCO_REBOQUE TRUCK", "2026-06-01 00:00:00", 1500, 4.3, "2026-06-15 20:00:00"),
    ],
    "tarifas.xlsx",
  );
  assert.equal(r.tarifas[0]?.equipamentoId, undefined);
  assert.ok(r.problemas.some((p) => p.campo === "TIPO"));
});

test("resolve tarifa da Via por unidade, CNPJ, equipamento e vigência", () => {
  const r = importarMatrizTarifas(
    [CABECALHO, linha("TOCO", "2026-06-01 00:00:00", 1143.0366, 2.8694, "2026-06-15 19:51:45")],
    "tarifas.xlsx",
  );
  const transportadoras = associarTransportadorasImportadas(TRANSPORTADORAS_INICIAIS, r.tarifas);
  const resolvida = resolverTarifaRota(rotaBase, "toco", r.tarifas, transportadoras);
  assert.equal(resolvida?.tarifa?.cnpj, "07031916000239");
  assert.equal(resolvida?.equipamento.diaria, 1143.0366);
});

test("não inventa tarifa ausente para a TFL", () => {
  const r = importarMatrizTarifas(
    [CABECALHO, linha("TOCO", "2026-06-01 00:00:00", 1143.0366, 2.8694, "2026-06-15 19:51:45")],
    "tarifas.xlsx",
  );
  const resolvida = resolverTarifaRota(
    { ...rotaBase, veiculo: "0081TFL09TO01", transportadora: "TFL" },
    "toco",
    r.tarifas,
    TRANSPORTADORAS_INICIAIS,
  );
  assert.equal(resolvida?.tarifa, undefined);
  assert.equal(resolvida?.equipamento.diaria, 0);
});
