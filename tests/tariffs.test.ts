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
import { recalcularCapacidadeRota } from "../src/lib/data/routeCapacity.ts";
import { auditarBase } from "../src/lib/data/import.ts";
import { lerEstadoPersistido } from "../src/lib/data/persistence.ts";

test("Bitruck 18.500 + reboque 15.000 preserva origem, capacidade e tarifa comum", () => {
  const rota = recalcularCapacidadeRota({
    ...rotaBase,
    equipamentoId: "bitruck_reboque",
    capacidadeNominalL: 18000,
    capacidadeVeiculoInformadaL: 18500,
    capacidadeReboqueL: 15000,
    volumeL: 33110,
  });
  assert.equal(rota.capacidadeRealL, 33500);
  assert.equal(rota.capacidadeNominalL, 18000);
  assert.ok(!auditarBase([rota], []).some((p) => p.campo === "capacidade"));
  assert.ok(auditarBase([{ ...rota, volumeL: 33501 }], []).some((p) => p.campo === "capacidade"));
  assert.equal(
    lerEstadoPersistido(JSON.stringify({ rotas: [rota] }))?.rotas?.[0]?.capacidadeVeiculoInformadaL,
    18500,
  );
  const tarifas = importarMatrizTarifas(
    [CABECALHO, linha("BITRUCK_REBOQUE", "2026-06-01", 1677.47, 4.89, "2026-06-15 20:00:00")],
    "tarifas.xlsx",
  ).tarifas;
  const carriers = associarTransportadorasImportadas(TRANSPORTADORAS_INICIAIS, tarifas);
  const resolver = (r: RotaOperacional) =>
    resolverTarifaRota(r, r.equipamentoId, tarifas, carriers);
  assert.equal(resolver(rota)?.tarifa?.categoriaReboque, "comum");
  assert.equal(
    resolver(recalcularCapacidadeRota({ ...rota, capacidadeVeiculoInformadaL: 21000 }))?.tarifa?.id,
    resolver(rota)?.tarifa?.id,
  );
  assert.equal(
    recalcularCapacidadeRota({ ...rota, capacidadeReboqueL: undefined }).capacidadeRealL,
    undefined,
  );
  assert.equal(
    recalcularCapacidadeRota({ ...rota, capacidadeVeiculoInformadaL: undefined }).capacidadeRealL,
    33000,
  );
});

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

test("mapeia reboque trucado para o conjunto e registra sua categoria", () => {
  const r = importarMatrizTarifas(
    [
      CABECALHO,
      linha("TOCO_REBOQUE TRUCK", "2026-06-01 00:00:00", 1500, 4.3, "2026-06-15 20:00:00"),
    ],
    "tarifas.xlsx",
  );
  assert.equal(r.tarifas[0]?.equipamentoId, "toco_reboque");
  assert.equal(r.tarifas[0]?.categoriaReboque, "trucado");
  assert.ok(!r.problemas.some((p) => p.campo === "TIPO"));
});

test("seleciona tarifa de reboque comum ou trucado pela capacidade informada", () => {
  const r = importarMatrizTarifas(
    [
      CABECALHO,
      linha("TOCO_REBOQUE", "2026-06-01 00:00:00", 1300, 3.5, "2026-06-15 20:00:00"),
      linha("TOCO_REBOQUE TRUCK", "2026-06-01 00:00:00", 1500, 4.3, "2026-06-15 20:00:00"),
    ],
    "tarifas.xlsx",
  );
  const transportadoras = associarTransportadorasImportadas(TRANSPORTADORAS_INICIAIS, r.tarifas);
  const rotaComum = {
    ...rotaBase,
    equipamentoId: "toco_reboque",
    capacidadeReboqueL: 15000,
  };
  const rotaTrucada = { ...rotaComum, capacidadeReboqueL: 18000 };

  assert.equal(
    resolverTarifaRota(rotaComum, "toco_reboque", r.tarifas, transportadoras)?.tarifa
      ?.categoriaReboque,
    "comum",
  );
  assert.equal(
    resolverTarifaRota(rotaTrucada, "toco_reboque", r.tarifas, transportadoras)?.tarifa
      ?.categoriaReboque,
    "trucado",
  );
});

test("não escolhe tarifa de conjunto antes de informar o reboque", () => {
  const r = importarMatrizTarifas(
    [
      CABECALHO,
      linha("TRUCK_REBOQUE", "2026-06-01 00:00:00", 1300, 3.5, "2026-06-15 20:00:00"),
      linha("TRUCK_REBOQUE TRUCK", "2026-06-01 00:00:00", 1500, 4.3, "2026-06-15 20:00:00"),
    ],
    "tarifas.xlsx",
  );
  const transportadoras = associarTransportadorasImportadas(TRANSPORTADORAS_INICIAIS, r.tarifas);

  assert.equal(
    resolverTarifaRota(
      { ...rotaBase, equipamentoId: "truck_reboque" },
      "truck_reboque",
      r.tarifas,
      transportadoras,
    )?.tarifa,
    undefined,
  );
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
