import test from "node:test";
import assert from "node:assert/strict";
import {
  criarProjeto,
  lerProjeto,
  serializarProjeto,
  nomeArquivoProjeto,
  LIMITE_PROJETO_BYTES,
  type DadosProjeto,
} from "../src/lib/data/project.ts";
import { lerEstadoPersistido } from "../src/lib/data/persistence.ts";

const dados: DadosProjeto = {
  unidades: [{ id: "0081", nome: "Uberlândia" }],
  unidadeAtivaId: "0081",
  rotas: [
    {
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
      inicioRota: "05:45",
      chegadaBase: "16:10",
      capacidadeVeiculoInformadaL: 18500,
      capacidadeReboqueL: 15000,
      capacidadeRealL: 33500,
      origem: { arquivo: "Route_now.csv", importadoEm: "2026-09-27T20:00:00.000Z", mock: false },
    },
  ],
  produtores: [
    {
      codigo: "123",
      nome: "Produtor teste",
      cooperativa: "1",
      linha: "860",
      matricula: "23",
      volumeL: 33090,
      rotaCodigo: "2801R",
      unidadeId: "0081",
      ciclo: "impar",
    },
  ],
  simulacoes: [
    {
      id: "sim-1",
      rotaCodigo: "2801R",
      rotaCiclo: "impar",
      criadaEm: "2026-09-27T20:00:00.000Z",
      aumentoVolumeL: 0,
      aumentoKm: 1,
      equipamentoIdSimulado: "bitruck_reboque",
      aplicado: true,
      capacidadeVeiculoSimuladaL: 18500,
      capacidadeReboqueSimuladaL: 15000,
      categoriaReboqueSimulada: "comum",
    },
  ],
  tarifas: [
    {
      id: "t1",
      unidadeId: "0081",
      localNome: "Uberlândia",
      cnpj: "07031916000239",
      transportadoraNome: "Via",
      codigoTarifa: "10",
      tipoOrigem: "BITRUCK_REBOQUE",
      equipamentoId: "bitruck_reboque",
      inicioVigencia: "2026-06-01",
      diaria: 1677.49,
      custoKm: 4.8912,
      atualizadaEm: "2026-06-01",
      origemArquivo: "tarifas.xlsx",
    },
  ],
  transportadoras: [{ sigla: "VIA", nome: "Via", cnpjs: ["07031916000239"], ativa: true }],
};

test("projeto transporta integralmente capacidades, tarifas precisas, vínculos e simulações", () => {
  const projeto = criarProjeto(dados, "Estudo Uberlândia", "Analista");
  const aberto = lerProjeto(serializarProjeto(projeto));
  assert.deepEqual(aberto.dados, dados);
  assert.deepEqual(lerEstadoPersistido(JSON.stringify(aberto.dados)), dados);
  assert.equal(aberto.autor, "Analista");
  assert.match(nomeArquivoProjeto(aberto), /^0081_Estudo_Uberlandia_.*\.ccpr$/);
});

test("recusa versões incompatíveis, arquivo parcial, dados inválidos e JSON corrompido", () => {
  const projeto = criarProjeto(dados, "Estudo", "Analista");
  for (const valor of [
    { ...projeto, versao: 2 },
    { ...projeto, dados: { rotas: [] } },
    { ...projeto, dados: { ...dados, rotas: [{ ...dados.rotas[0], km: -1 }] } },
  ]) {
    assert.throws(() => lerProjeto(JSON.stringify(valor)));
  }
  assert.throws(() => lerProjeto("arquivo quebrado"));
  assert.throws(() => lerProjeto(" ".repeat(LIMITE_PROJETO_BYTES + 1)), /8 MB/);
  assert.equal(dados.rotas[0]?.km, 283);
});

test("recusa unidade ativa inexistente e rotas de unidades ausentes", () => {
  assert.throws(() => criarProjeto({ ...dados, unidadeAtivaId: "0002" }, "Estudo", "Analista"));
  assert.throws(() =>
    criarProjeto(
      { ...dados, unidades: [{ id: "0002", nome: "Outra" }], unidadeAtivaId: "0002" },
      "Estudo",
      "Analista",
    ),
  );
});
