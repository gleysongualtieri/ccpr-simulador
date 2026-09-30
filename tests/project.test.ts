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
import { lerEstadoPersistido, gravarEstadoPersistido } from "../src/lib/data/persistence.ts";

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
      atividadeFimJornada: "descarregamento",
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

test("Lactalis e pontos operacionais sobrevivem ao F5 e ao arquivo de projeto", () => {
  const comPontos: DadosProjeto = {
    ...dados,
    produtores: [
      {
        ...dados.produtores[0]!,
        codigo: "000123",
        origemCadastro: "lactalis",
        cooperativa: "",
        linha: "",
        matricula: "",
      },
    ],
    rotas: [
      {
        ...dados.rotas[0]!,
        pontosOperacionais: [
          {
            codigo: "J0604",
            nome: "POSTO",
            atividade: "Transvaso",
            hora: "08:00",
            dataHora: "2026-09-28T11:00:00.000Z",
            volumeInformadoL: 500,
            origemArquivo: "Route_now.csv",
          },
        ],
      },
    ],
  };
  const aberto = lerProjeto(serializarProjeto(criarProjeto(comPontos, "Teste J", "Analista")));
  assert.deepEqual(aberto.dados, comPontos);
  assert.deepEqual(lerEstadoPersistido(JSON.stringify(comPontos)), comPontos);
});

test("recusa versões incompatíveis, arquivo parcial, dados inválidos e JSON corrompido", () => {
  const projeto = criarProjeto(dados, "Estudo", "Analista");
  for (const valor of [
    { ...projeto, versao: 99 },
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

// Duas bases podem compartilhar códigos de rota e identificadores de simulação.
import {
  criarProjetoUnidade,
  incorporarProjeto,
  dadosDaUnidade,
  unidadeDaSimulacao,
} from "../src/lib/data/project.ts";

function duasUnidades(): DadosProjeto {
  return {
    ...dados,
    unidades: [...dados.unidades, { id: "0002", nome: "Conselheiro Lafaiete" }],
    rotas: [...dados.rotas, { ...dados.rotas[0]!, unidadeId: "0002", km: 99 }],
    produtores: [...dados.produtores, { ...dados.produtores[0]!, unidadeId: "0002" }],
    simulacoes: [
      { ...dados.simulacoes[0]!, unidadeId: "0081" },
      { ...dados.simulacoes[0]!, id: "sim-outra", unidadeId: "0002" },
    ],
    tarifas: [...dados.tarifas, { ...dados.tarifas[0]!, id: "t2", unidadeId: "0002", diaria: 321 }],
  };
}

test("salvar unidade não exporta rotas, produtores, tarifas ou simulações de outra base", () => {
  const projeto = lerProjeto(
    serializarProjeto(criarProjetoUnidade(duasUnidades(), "Uberlândia", "Gleyson")),
  );
  assert.equal(projeto.versao, 2);
  for (const itens of [
    projeto.dados.rotas,
    projeto.dados.produtores,
    projeto.dados.tarifas,
    projeto.dados.simulacoes,
  ]) {
    assert.equal(itens.length, 1);
    assert.equal(itens[0]!.unidadeId, "0081");
  }
});

test("abrir unidade preserva integralmente outra base com o mesmo código de rota", () => {
  const atual = duasUnidades();
  const novo = criarProjetoUnidade(
    { ...dados, rotas: [{ ...dados.rotas[0]!, km: 284 }] },
    "Novo",
    "Gleyson",
  );
  const resultado = incorporarProjeto(atual, novo, "0081");
  assert.deepEqual(dadosDaUnidade(resultado, "0002"), dadosDaUnidade(atual, "0002"));
  assert.equal(resultado.rotas.find((r) => r.unidadeId === "0081")!.km, 284);
  assert.equal(atual.rotas[0]!.km, 283);
  assert.equal(
    resultado.simulacoes.filter((s) => unidadeDaSimulacao(s, resultado.rotas) === "0081").length,
    1,
  );
});

test("legado migra simulação inequívoca; associação ambígua nunca é adivinhada", () => {
  const legado = lerProjeto(serializarProjeto(criarProjeto(dados, "Legado", "Gleyson")));
  assert.equal(dadosDaUnidade(legado.dados, "0081").simulacoes[0]!.unidadeId, "0081");
  const ambiguo = { ...duasUnidades(), simulacoes: dados.simulacoes };
  assert.throws(() => dadosDaUnidade(ambiguo, "0081"), /sem unidade/);
});

test("cadastro conflitante de transportadora compartilhada bloqueia abertura sem mutação", () => {
  const atual = duasUnidades();
  const antes = JSON.stringify(atual);
  const novo = criarProjetoUnidade(
    { ...dados, transportadoras: [{ ...dados.transportadoras[0]!, cnpjs: ["12345678000199"] }] },
    "Novo",
    "Gleyson",
  );
  assert.throws(() => incorporarProjeto(atual, novo, "0081"), /conflita/);
  assert.equal(JSON.stringify(atual), antes);
});

test("nome e responsável de cada unidade sobrevivem à persistência", () => {
  const projetos = [
    {
      unidadeId: "0081",
      nome: "Estudo Uberlândia",
      autor: "Gleyson",
      salvoEm: "2026-09-27T21:00:00.000Z",
    },
    {
      unidadeId: "0002",
      nome: "Estudo Lafaiete",
      autor: "Analista",
      salvoEm: "2026-09-27T21:00:00.000Z",
    },
  ];
  assert.deepEqual(
    lerEstadoPersistido(JSON.stringify({ ...duasUnidades(), projetos }))?.projetos,
    projetos,
  );
});

test("identificadores repetidos são separados sem afetar simulações de outra unidade", () => {
  const atual = duasUnidades();
  atual.simulacoes = [
    { ...dados.simulacoes[0]!, unidadeId: "0002", id: "x".repeat(100) },
    { ...dados.simulacoes[0]!, unidadeId: "0002", id: `importado-1-${"x".repeat(65)}` },
  ];
  const novo = criarProjetoUnidade(
    {
      ...dados,
      simulacoes: [
        { ...dados.simulacoes[0]!, id: "x".repeat(100) },
        { ...dados.simulacoes[0]!, id: "x".repeat(100) },
      ],
    },
    "Estudo",
    "Gleyson",
  );
  const resultado = incorporarProjeto(atual, novo, "0081");
  assert.equal(new Set(resultado.simulacoes.map((s) => s.id)).size, 4);
  assert.deepEqual(resultado.simulacoes.slice(0, 2), atual.simulacoes);
  assert.ok(lerEstadoPersistido(JSON.stringify(resultado)));
});

test("limite de simulações não substitui a sessão anterior por dados que não poderiam reabrir", () => {
  let salvo = JSON.stringify(dados);
  const antes = salvo;
  assert.throws(
    () =>
      gravarEstadoPersistido(
        {
          ...dados,
          simulacoes: Array.from({ length: 10_001 }, (_, i) => ({
            ...dados.simulacoes[0]!,
            id: String(i),
          })),
        },
        (texto) => {
          salvo = texto;
        },
      ),
    /limites/,
  );
  assert.equal(salvo, antes);
  assert.throws(
    () =>
      gravarEstadoPersistido(dados, () => {
        throw new Error("QuotaExceededError");
      }),
    /sessão anterior foi mantida/,
  );
});
