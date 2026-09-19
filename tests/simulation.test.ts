import test from "node:test";
import assert from "node:assert/strict";
import { simularRota, projetarRota } from "../src/lib/calculations/simulation.ts";
import { lerEstadoPersistido } from "../src/lib/data/persistence.ts";
import type { RotaOperacional, TarifaTransporte } from "../src/lib/domain/types.ts";
const rota: RotaOperacional = {
  codigo: "2801R",
  sufixoTipo: "R",
  unidadeId: "0081",
  regiao: "860",
  ciclo: "impar",
  veiculo: "0081VIA18BT06",
  transportadora: "VIA",
  equipamentoId: "bitruck_reboque",
  volumeL: 33090,
  km: 283,
  inicioRota: "06:00",
  chegadaBase: "16:25",
  capacidadeNominalL: 18000,
  capacidadeVeiculoInformadaL: 18500,
  capacidadeReboqueL: 15000,
  capacidadeRealL: 33500,
  dataExecucao: "2026-09-14",
  origem: { mock: false, arquivo: "Route_now.csv", importadoEm: "2026-09-14" },
};
const entrada = { aumentoVolumeL: 0, aumentoKm: 0, equipamentoIdSimulado: rota.equipamentoId };
const carriers = [{ sigla: "VIA", nome: "Via", cnpjs: ["07031916000239"], ativa: true }];
const tarifa = (id: string, categoria: "comum" | "trucado", diaria: number): TarifaTransporte => ({
  id: id + categoria,
  unidadeId: "0081",
  localNome: "Uberlandia",
  cnpj: "07031916000239",
  transportadoraNome: "Via",
  codigoTarifa: "1",
  tipoOrigem: id,
  equipamentoId: id,
  categoriaReboque: categoria,
  inicioVigencia: "2026-01-01",
  diaria,
  custoKm: 4,
  atualizadaEm: "2026-01-01",
  origemArquivo: "tarifas.xlsx",
});
const tarifas = [
  tarifa("bitruck_reboque", "comum", 1600),
  tarifa("toco_reboque", "comum", 1000),
  tarifa("toco_reboque", "trucado", 1200),
];
const sim = (e = entrada, r = rota) => simularRota(r, e, tarifas, carriers)!;
test("preserva capacidade real e bloqueia exatamente acima do limite", () => {
  assert.equal(sim().simulado.capacidadeL, 33500);
  assert.equal(sim({ ...entrada, aumentoVolumeL: 410 }).viavel, true);
  const excedida = sim({ ...entrada, aumentoVolumeL: 500 });
  assert.equal(excedida.capacidade.excedenteL, 90);
  assert.equal(excedida.viavel, false);
  assert.equal(rota.capacidadeRealL, 33500);
});
test("troca de equipamento exige capacidade explícita e não usa catálogo fictício", () => {
  const e = { ...entrada, equipamentoIdSimulado: "toco_reboque" };
  assert.equal(sim(e).simulado.capacidadeL, 0);
  assert.equal(sim(e).viavel, false);
  const s = sim({
    ...e,
    capacidadeVeiculoSimuladaL: 9000,
    capacidadeReboqueSimuladaL: 15000,
  } as typeof e);
  assert.equal(s.simulado.capacidadeL, 24000);
  assert.equal(s.capacidade.excedenteL, 9090);
});
test("reboque simulado define a categoria tarifária, incluindo capacidade futura", () => {
  const e = {
    ...entrada,
    equipamentoIdSimulado: "toco_reboque",
    capacidadeVeiculoSimuladaL: 9000,
    capacidadeReboqueSimuladaL: 18000,
  };
  assert.equal(sim(e).equipamentoSimulado.diaria, 1200);
  assert.equal(sim({ ...e, capacidadeReboqueSimuladaL: 15000 }).equipamentoSimulado.diaria, 1000);
  assert.equal(sim({ ...e, capacidadeReboqueSimuladaL: 22000 }).tarifaSimuladaEncontrada, false);
  assert.equal(
    sim({
      ...e,
      capacidadeReboqueSimuladaL: 22000,
      categoriaReboqueSimulada: "trucado",
    } as typeof e).equipamentoSimulado.diaria,
    1200,
  );
});
test("jornada acima de 13h bloqueia mesmo com mudança válida e tarifa", () => {
  assert.equal(
    sim({ ...entrada, aumentoKm: 1 }, { ...rota, inicioRota: "06:32", chegadaBase: "19:32" })
      .viavel,
    true,
  );
  const s = sim(
    { ...entrada, aumentoKm: 1 },
    { ...rota, inicioRota: "06:32", chegadaBase: "21:24" },
  );
  assert.equal(s.viavel, false);
  assert.match(s.motivosBloqueio.join(" "), /14h52/);
});
test("T2 não soma reboque; capacidades inválidas e incompatibilidade bloqueiam", () => {
  const e = {
    ...entrada,
    equipamentoIdSimulado: "vanderleia",
    capacidadeVeiculoSimuladaL: 38000,
    capacidadeReboqueSimuladaL: 15000,
  };
  assert.equal(projetarRota(rota, e).capacidadeRealL, 38000);
  assert.equal(sim({ ...e, capacidadeVeiculoSimuladaL: NaN }).viavel, false);
  assert.equal(sim({ ...e, equipamentoIdSimulado: "toco" }).compativel, false);
});
test("novos parâmetros sobrevivem à persistência e recompõem o cálculo", () => {
  const e = {
    ...entrada,
    capacidadeVeiculoSimuladaL: 21000,
    capacidadeReboqueSimuladaL: 15000,
    categoriaReboqueSimulada: "comum" as const,
  };
  const saved = {
    ...e,
    id: "s1",
    rotaCodigo: rota.codigo,
    rotaCiclo: rota.ciclo,
    criadaEm: "2026-09-14",
    aplicado: false,
  };
  const restored = lerEstadoPersistido(JSON.stringify({ simulacoes: [saved] }))!.simulacoes![0]!;
  assert.equal(sim(restored).simulado.capacidadeL, 36000);
});
