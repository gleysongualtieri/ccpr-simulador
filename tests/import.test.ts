import assert from "node:assert/strict";
import test from "node:test";

import {
  auditarBase,
  identificarTipoArquivo,
  importarArquivosAxiodis,
  aplicarRegiaoDosProdutores,
  importarProdutoresRotas,
  importarRouteNow,
} from "../src/lib/data/import.ts";
import { calcularJornada, rotuloFimJornada } from "../src/lib/calculations/routeJourney.ts";
import { lerEstadoPersistido } from "../src/lib/data/persistence.ts";
import { decodificarVeiculo, equipamentoPorSigla } from "../src/lib/calculations/equipment.ts";
import type { Produtor, RotaOperacional } from "../src/lib/domain/types.ts";
import {
  chaveRota,
  encontrarRotaPorIdentificador,
  identificadorRotaUrl,
} from "../src/lib/data/identity.ts";

const CABECALHO_ROUTE_NOW =
  "Veículo;Ordem;Rota;Atividde;Matricula;Descrição;Volume;Km etapa;Dt/Hr coleta;Latitude;Longitude";

function routeNow(linhas: string[]): string {
  return [CABECALHO_ROUTE_NOW, ...linhas].join("\r\n");
}

function rotaImportada(texto: string): RotaOperacional {
  const resultado = importarRouteNow(texto, "Route_now_teste.csv", "0081", 2026);
  assert.deepEqual(resultado.problemas, []);
  assert.equal(resultado.rotas.length, 1);
  return resultado.rotas[0]!;
}

test("RouteNow usa o km acumulado, a data sem ano e somente volumes de coleta", () => {
  const rota = rotaImportada(
    routeNow([
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 01:31;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 04:35;-19,8;-47,6",
      "0081VIA09TO01;2;2783R;Coleta;123456780;PRODUTOR;2.000;220;09/09 05:35;-19,7;-47,5",
      "0081VIA09TO01;;2783R;Descarrega;123456789;PRODUTOR;1.000;417;09/09 13:20;-18,8;-48,3",
      "0081VIA09TO01;;2783R;Balanza;0081;BASE;;417;09/09 13:16;-18,8;-48,3",
      "0081VIA09TO01;;2783R;Regresso;0081;BASE;;418;09/09 14:07;-18,8;-48,3",
    ]),
  );

  assert.equal(rota.km, 418);
  assert.equal(rota.volumeL, 3000);
  assert.equal(rota.ciclo, "impar");
  assert.equal(rota.inicioRota, "01:31");
  assert.equal(rota.chegadaBase, "13:16");
  assert.equal(rota.equipamentoId, "toco_reboque");
  assert.equal(rota.capacidadeNominalL, 9000);
  assert.equal(rota.capacidadeReboqueL, undefined);
  assert.equal(rota.capacidadeRealL, undefined);
  assert.match(rota.dataExecucao ?? "", /^2026-09-09T/);
});

test("tipo de arquivo é identificado pelo cabeçalho, não pelo nome", () => {
  const route = routeNow(["0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 01:31;-18,8;-48,3"]);
  const produtores = [
    "Código;Nome;Rota;Volume/coleta;Veículo;Dt / Hr Coleta",
    "123456789;PRODUTOR;2783R;1.000;0081VIA09TO01;09/09 04:35",
  ].join("\r\n");

  assert.equal(identificarTipoArquivo(route), "route_now");
  assert.equal(identificarTipoArquivo(produtores), "produtores_rotas");
  assert.equal(identificarTipoArquivo("coluna;desconhecida\n1;2"), null);
});

test("ciclo é derivado do dia de saída, não do número da rota", () => {
  const rota = rotaImportada(
    routeNow([
      "0081VIA15TR02;;2822R;Saída;0081;BASE;;0;09/09 06:32;-18,8;-48,3",
      "0081VIA15TR02;1;2822R;Coleta;123456789;PRODUTOR;1.000;200;09/09 10:00;-19,8;-47,6",
      "0081VIA15TR02;;2822R;Balanza;0081;BASE;;410;09/09 21:24;-18,8;-48,3",
      "0081VIA15TR02;;2822R;Regresso;0081;BASE;;521;09/09 22:15;-18,8;-48,3",
    ]),
  );

  assert.equal(rota.codigo, "2822R");
  assert.equal(rota.ciclo, "impar");
});

test("Vanderleia T2 em rota R usa a capacidade do código sem reboque adicional", () => {
  const rota = rotaImportada(
    routeNow([
      "0081VIA38VA01;;2720R;Saída;0081;BASE;;0;10/09 04:59;-18,8;-48,3",
      "0081VIA38VA01;1;2720R;Coleta;123456789;PRODUTOR;38.000;35;10/09 06:00;-19,8;-47,6",
      "0081VIA38VA01;;2720R;Balanza;0081;BASE;;70;10/09 08:34;-18,8;-48,3",
      "0081VIA38VA01;;2720R;Regresso;0081;BASE;;71;10/09 09:15;-18,8;-48,3",
    ]),
  );

  assert.equal(rota.equipamentoId, "vanderleia");
  assert.equal(rota.capacidadeNominalL, 38000);
  assert.equal(rota.capacidadeRealL, 38000);
  assert.equal(rota.capacidadeReboqueL, undefined);
});

test("Bitoco e Bitrem usam as siglas Axiodis e Rodotrem fica desativado", () => {
  assert.equal(decodificarVeiculo("0081VIA13BC01").sigla, "BC");
  assert.equal(equipamentoPorSigla("BC")?.id, "bitoco");
  assert.equal(equipamentoPorSigla("BR")?.id, "bitrem");
  assert.equal(equipamentoPorSigla("RT"), undefined);
});

test("Produtores_Rotas agrupa tanques do mesmo produtor, rota e ciclo", () => {
  const texto = [
    "Código;Nome;Rota;Volume/coleta;Veículo;Dt / Hr Coleta",
    "123456789;PRODUTOR A;2783R;552;0081VIA09TO01;09/09 04:35",
    "123456789;PRODUTOR A;2783R;1;0081VIA09TO01;09/09 04:35",
    "123456789;PRODUTOR A;2783R;482;0081VIA09TO01;09/09 04:35",
  ].join("\r\n");

  const resultado = importarProdutoresRotas(texto, "Produtores_Rotas_teste.csv", 2026);
  assert.deepEqual(resultado.problemas, []);
  assert.equal(resultado.produtores.length, 1);
  assert.equal(resultado.produtores[0]!.volumeL, 1035);
  assert.equal(resultado.produtores[0]!.ciclo, "impar");
});

test("rota R com veículo-base bloqueia até informar reboque e bloqueia excesso", () => {
  const rota = rotaImportada(
    routeNow([
      "0081VIA18BT06;;2800R;Saída;0081;BASE;;0;10/09 05:45;-18,8;-48,3",
      "0081VIA18BT06;1;2800R;Coleta;123456789;PRODUTOR;33.110;130;10/09 09:00;-19,8;-47,6",
      "0081VIA18BT06;;2800R;Balanza;0081;BASE;;266;10/09 15:36;-18,8;-48,3",
      "0081VIA18BT06;;2800R;Regresso;0081;BASE;;267;10/09 16:17;-18,8;-48,3",
    ]),
  );
  const produtor: Produtor = {
    codigo: "123456789",
    nome: "PRODUTOR",
    cooperativa: "123",
    linha: "456",
    matricula: "789",
    volumeL: 33110,
    rotaCodigo: "2800R",
    ciclo: "par",
  };

  assert.ok(auditarBase([rota], [produtor]).some((p) => p.campo === "reboque"));

  const com15 = { ...rota, capacidadeReboqueL: 15000, capacidadeRealL: 33000 };
  assert.ok(auditarBase([com15], [produtor]).some((p) => p.campo === "capacidade"));

  const com18 = { ...rota, capacidadeReboqueL: 18000, capacidadeRealL: 36000 };
  assert.ok(!auditarBase([com18], [produtor]).some((p) => p.campo === "capacidade"));
});

test("jornada é medida entre Saída e Balanza com limite de 13 horas", () => {
  const base: RotaOperacional = {
    codigo: "TESTED",
    sufixoTipo: "D",
    unidadeId: "0081",
    regiao: "000",
    ciclo: "par",
    veiculo: "0081VIA09TO01",
    transportadora: "VIA",
    equipamentoId: "toco",
    volumeL: 8000,
    km: 100,
    inicioRota: "04:00",
    chegadaBase: "17:00",
    origem: { arquivo: "teste.csv", importadoEm: "2026-09-11T00:00:00.000Z", mock: false },
  };

  assert.equal(calcularJornada(base).critica, false);
  assert.equal(calcularJornada({ ...base, chegadaBase: "17:01" }).critica, true);
});

test("rotas com o mesmo código permanecem distintas por ciclo", () => {
  const base: RotaOperacional = {
    codigo: "2783R",
    sufixoTipo: "R",
    unidadeId: "0081",
    regiao: "404",
    ciclo: "par",
    veiculo: "0081VIA09TO01",
    transportadora: "VIA",
    equipamentoId: "toco_reboque",
    volumeL: 20000,
    km: 418,
    inicioRota: "01:31",
    chegadaBase: "13:16",
    origem: { arquivo: "teste.csv", importadoEm: "2026-09-11T00:00:00.000Z", mock: false },
  };
  const impar = { ...base, ciclo: "impar" as const };

  assert.notEqual(chaveRota(base), chaveRota(impar));
  assert.equal(identificadorRotaUrl(impar), "2783R--impar");
  assert.equal(encontrarRotaPorIdentificador([base, impar], "2783R--impar"), impar);
});

test("sem pesagem ou Serviço, Descarrega/Descarregamento encerra a jornada", () => {
  for (const atividade of ["Descarrega", "Descarregamento"]) {
    const rota = rotaImportada(
      routeNow([
        "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 22:00;-18,8;-48,3",
        "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 23:00;-19,8;-47,6",
        `0081VIA09TO01;;2783R;${atividade};123456789;PRODUTOR;600;417;10/09 02:15;-18,8;-48,3`,
        `0081VIA09TO01;;2783R;${atividade};123456789;PRODUTOR;400;417;10/09 02:15;-18,8;-48,3`,
        "0081VIA09TO01;;2783R;Regresso;0081;BASE;;418;10/09 04:00;-18,8;-48,3",
      ]),
    );
    assert.equal(rota.chegadaBase, "02:15");
    assert.equal(rota.atividadeFimJornada, "descarregamento");
    assert.equal(rotuloFimJornada(rota), "Descarregamento");
    assert.equal(calcularJornada(rota).horasBrutas, 4.25);
    assert.equal(rota.ciclo, "impar");
    assert.equal(rota.volumeL, 1000);
    assert.equal(rota.km, 418);
    assert.equal(
      lerEstadoPersistido(JSON.stringify({ rotas: [rota] }))?.rotas?.[0]?.atividadeFimJornada,
      "descarregamento",
    );
  }
});

test("Balanza, Balança e Serviço têm prioridade mesmo se houver descarga anterior", () => {
  for (const atividade of ["Balanza", "Balança", "Serviço"]) {
    const rota = rotaImportada(
      routeNow([
        "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 01:31;-18,8;-48,3",
        "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 04:35;-19,8;-47,6",
        "0081VIA09TO01;;2783R;Descarrega;123456789;PRODUTOR;1.000;410;09/09 12:00;-18,8;-48,3",
        `0081VIA09TO01;;2783R;${atividade};0081;BASE;;417;09/09 13:16;-18,8;-48,3`,
      ]),
    );
    assert.equal(rota.chegadaBase, "13:16");
    assert.equal(rota.atividadeFimJornada, atividade === "Serviço" ? "servico" : "balanca");
  }
});

test("escolha do fim da jornada é independente para cada execução da rota", () => {
  const resultado = importarRouteNow(
    routeNow([
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 06:00;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 07:00;-19,8;-47,6",
      "0081VIA09TO01;;2783R;Balanza;0081;BASE;;417;09/09 13:00;-18,8;-48,3",
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;10/09 06:00;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;10/09 07:00;-19,8;-47,6",
      "0081VIA09TO01;;2783R;Descarrega;123456789;PRODUTOR;1.000;417;10/09 14:00;-18,8;-48,3",
    ]),
    "duas_execucoes.csv",
    "0081",
    2026,
  );
  assert.deepEqual(resultado.problemas, []);
  assert.deepEqual(
    resultado.rotas.map((r) => [r.ciclo, r.chegadaBase, r.atividadeFimJornada]),
    [
      ["impar", "13:00", "balanca"],
      ["par", "14:00", "descarregamento"],
    ],
  );
});

test("ausência de pesagem, Serviço e Descarregamento continua bloqueando jornada", () => {
  const resultado = importarRouteNow(
    routeNow([
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 01:31;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 04:35;-19,8;-47,6",
      "0081VIA09TO01;;2783R;Regresso;0081;BASE;;418;09/09 15:20;-18,8;-48,3",
    ]),
    "Route_now_sem_balanza.csv",
    "0081",
    2026,
  );

  assert.equal(resultado.rotas.length, 0);
  assert.ok(resultado.problemas.some((p) => p.campo === "balanza" && p.severidade === "erro"));
});

test("data impossível é rejeitada", () => {
  const resultado = importarRouteNow(
    routeNow([
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;31/02 01:31;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;31/02 04:35;-19,8;-47,6",
      "0081VIA09TO01;;2783R;Balanza;0081;BASE;;417;31/02 13:16;-18,8;-48,3",
    ]),
    "Route_now_data_invalida.csv",
    "0081",
    2026,
  );

  assert.equal(resultado.rotas.length, 0);
  assert.ok(resultado.problemas.some((p) => p.campo === "data_hora"));
});

function eventosCooperativa(unidade = "0077", dia = "28", km = "0", codigo = "2094E") {
  const veiculo = `${unidade}COO09TO01`;
  return [
    `${veiculo};;${codigo};Saída;${unidade};BASE;;0;${dia}/09 07:59;;`,
    `${veiculo};1;${codigo};Coleta;123456789;COOPERATIVA;50,000;${km};${dia}/09 08:00;;`,
    `${veiculo};;${codigo};Descarrega;${unidade};BASE;50,000;${km};${dia}/09 08:06;;`,
  ];
}

const CABECALHO_PRODUTORES = "Código;Nome;Rota;Volume/coleta;Veículo;Dt / Hr Coleta";

test("rota E com zero km e seus vínculos ficam fora da análise em qualquer ordem dos arquivos", () => {
  const arquivos = [
    { nome: "route.csv", texto: routeNow(eventosCooperativa()) },
    {
      nome: "produtores.csv",
      texto: [
        CABECALHO_PRODUTORES,
        "123456789;COOPERATIVA;2094E;50,000;0077COO09TO01;28/09 08:00",
        // Até códigos ainda não suportados ficam fora, pois o vínculo pertence à rota ignorada.
        "603165;COOPERATIVA;2094E;50,000;0077COO09TO01;28/09 08:00",
      ].join("\n"),
    },
  ];
  for (const ordem of [arquivos, [...arquivos].reverse()]) {
    const resultado = importarArquivosAxiodis(ordem, "0081", 2026);
    assert.deepEqual(resultado.rotas, []);
    assert.deepEqual(resultado.produtores, []);
    assert.deepEqual(resultado.rotasIgnoradas, [
      { unidadeId: "0077", codigo: "2094E", ciclo: "par" },
    ]);
    assert.equal(resultado.problemas.length, 1);
    assert.equal(resultado.problemas[0]!.severidade, "alerta");
    assert.match(resultado.problemas[0]!.mensagem, /ignorada temporariamente/);
    assert.deepEqual(auditarBase(resultado.rotas, resultado.produtores), []);
  }
});

test("exclusão E zero não exige descarga, mas precisa de data e zero informado", () => {
  const semDescarga = importarRouteNow(
    routeNow(eventosCooperativa().slice(0, 2)),
    "route.csv",
    "0077",
    2026,
  );
  assert.equal(semDescarga.rotasIgnoradas?.length, 1);
  assert.deepEqual(semDescarga.problemas, []);
  for (const km of ["", "inválido", "-1"]) {
    const resultado = importarRouteNow(
      routeNow(eventosCooperativa("0077", "28", km)),
      "route.csv",
      "0077",
      2026,
    );
    assert.deepEqual(resultado.rotasIgnoradas, []);
    assert.ok(resultado.problemas.some((p) => p.campo === "km" && p.severidade === "erro"));
  }
  const semData = importarRouteNow(
    routeNow(eventosCooperativa().map((linha) => linha.replace(/28\/09 \d{2}:\d{2}/, ""))),
    "route.csv",
    "0077",
    2026,
  );
  assert.equal(semData.rotasIgnoradas?.length, 0);
  assert.ok(semData.problemas.some((p) => p.campo === "data_hora"));
});

test("km zero em outros sufixos continua bloqueado e E com percurso continua importada", () => {
  for (const codigo of ["2094D", "2094R", "2094A", "2094S"]) {
    const resultado = importarRouteNow(
      routeNow(eventosCooperativa("0077", "28", "0", codigo)),
      "route.csv",
      "0077",
      2026,
    );
    assert.deepEqual(resultado.rotasIgnoradas, []);
    assert.ok(resultado.problemas.some((p) => p.campo === "km" && p.severidade === "erro"));
  }
  const rota = rotaImportada(routeNow(eventosCooperativa("0077", "28", "10")));
  assert.equal(rota.codigo, "2094E");
  assert.equal(rota.km, 10);
  assert.equal(rota.volumeL, 50);
});

test("exclusão respeita unidade e ciclo, inclusive com códigos iguais num único RouteNow", () => {
  const resultado = importarArquivosAxiodis(
    [
      {
        nome: "route.csv",
        texto: routeNow([
          ...eventosCooperativa("0077", "28"),
          ...eventosCooperativa("0081", "28", "10"),
          ...eventosCooperativa("0077", "29", "20"),
        ]),
      },
      {
        nome: "produtores.csv",
        texto: [
          CABECALHO_PRODUTORES,
          "123456789;COOPERATIVA;2094E;50;0077COO09TO01;28/09 08:00",
          "123456789;COOPERATIVA;2094E;50;0081COO09TO01;28/09 08:00",
          "123456789;COOPERATIVA;2094E;50;0077COO09TO01;29/09 08:00",
        ].join("\n"),
      },
    ],
    "0077",
    2026,
  );
  assert.equal(resultado.rotas.length, 2);
  assert.equal(resultado.produtores.length, 2);
  assert.deepEqual(resultado.rotas.map(chaveRota).sort(), ["0077|2094E|impar", "0081|2094E|par"]);
  assert.deepEqual(
    resultado.produtores.map((p) => `${p.unidadeId}|${p.rotaCodigo}|${p.ciclo}`).sort(),
    ["0077|2094E|impar", "0081|2094E|par"],
  );
  assert.equal(
    resultado.rotas.reduce((s, r) => s + r.volumeL, 0),
    100,
  );
  assert.equal(
    resultado.produtores.reduce((s, p) => s + p.volumeL, 0),
    100,
  );
  assert.deepEqual(auditarBase(resultado.rotas, resultado.produtores), []);
});

test("arquivos conflitantes não descartam vínculos da rota com percurso", () => {
  const resultado = importarArquivosAxiodis(
    [
      { nome: "route_zero.csv", texto: routeNow(eventosCooperativa()) },
      { nome: "route_km.csv", texto: routeNow(eventosCooperativa("0077", "28", "10")) },
      {
        nome: "produtores.csv",
        texto: `${CABECALHO_PRODUTORES}\n123456789;COOPERATIVA;2094E;50;0077COO09TO01;28/09 08:00`,
      },
    ],
    "0077",
    2026,
  );
  assert.equal(resultado.rotas.length, 1);
  assert.equal(resultado.produtores.length, 1);
  assert.deepEqual(resultado.rotasIgnoradas, []);
  assert.ok(resultado.problemas.some((p) => p.campo === "km" && p.severidade === "erro"));
});

test("Lactalis preserva seis dígitos e zeros iniciais, soma tanques e não inventa linha ou matrícula", () => {
  const resultado = importarProdutoresRotas(
    [
      CABECALHO_PRODUTORES,
      "000123;PRODUTOR LACTALIS;2000D;100;0077VIA09TO01;28/09 08:00",
      "000123;PRODUTOR LACTALIS;2000D;200;0077VIA09TO01;28/09 08:00",
      "603165;OUTRO PRODUTOR;2000D;50;0077VIA09TO01;28/09 09:00",
      "123456789;PRODUTOR CCPR;2000D;100;0077VIA09TO01;28/09 10:00",
    ].join("\n"),
    "produtores.csv",
    2026,
  );
  assert.deepEqual(resultado.problemas, []);
  assert.equal(resultado.produtores.length, 3);
  const lactalis = resultado.produtores[0]!;
  assert.equal(lactalis.codigo, "000123");
  assert.equal(lactalis.volumeL, 300);
  assert.equal(lactalis.origemCadastro, "lactalis");
  assert.equal(lactalis.cooperativa, "");
  assert.equal(lactalis.linha, "");
  assert.equal(lactalis.matricula, "");
  const ccpr = resultado.produtores[2]!;
  assert.equal(ccpr.cooperativa, "123");
  assert.equal(ccpr.linha, "456");
  assert.equal(ccpr.matricula, "789");
  const rota = rotaImportada(routeNow(eventosCooperativa("0077", "28", "10", "2000D")));
  assert.equal(aplicarRegiaoDosProdutores([rota], resultado.produtores)[0]!.regiao, "456");
  assert.equal(aplicarRegiaoDosProdutores([rota], [lactalis])[0]!.regiao, "—");
  assert.equal(
    aplicarRegiaoDosProdutores([{ ...rota, regiao: "777" }], [lactalis])[0]!.regiao,
    "777",
  );
});

test("outros códigos inválidos não viram produtor por remoção de letras ou preenchimento", () => {
  for (const codigo of ["ABC123456789", "12345", "1234567", "12345678"]) {
    const resultado = importarProdutoresRotas(
      `${CABECALHO_PRODUTORES}\n${codigo};PRODUTOR;2000D;10;0077VIA09TO01;28/09 08:00`,
      "produtores.csv",
      2026,
    );
    assert.equal(resultado.produtores.length, 0);
    assert.ok(resultado.problemas.some((p) => p.campo === "codigo" && p.severidade === "erro"));
  }
});

test("pontos J preservam eventos e jornada sem inflar produtores, volume ou região", () => {
  const arquivos = [
    {
      nome: "produtores.csv",
      texto: [
        CABECALHO_PRODUTORES,
        "603165;PRODUTOR LACTALIS;2000D;500;0077VIA09TO01;28/09 08:00",
        "J0604;POSTO;2000D;1;0077VIA09TO01;28/09 09:00",
      ].join("\n"),
    },
    {
      nome: "route.csv",
      texto: routeNow([
        "0077VIA09TO01;;2000D;Saída;J0604;POSTO;;0;28/09 06:00;;",
        "0077VIA09TO01;1;2000D;Coleta;603165;PRODUTOR LACTALIS;500;50;28/09 08:00;;",
        "0077VIA09TO01;2;2000D;Coleta;j0604;POSTO;1,000;60;28/09 09:00;;",
        "0077VIA09TO01;;2000D;Transvaso;J0604;POSTO;500;60;28/09 09:05;;",
        "0077VIA09TO01;;2000D;Descarregamento;J0515;PONTO;500;80;28/09 12:00;;",
        "0077VIA09TO01;;2000D;Serviço;J0515;LAVADOR;;90;28/09 13:00;;",
        "0077VIA09TO01;;2000D;Regresso;J0604;POSTO;;100;28/09 14:00;;",
      ]),
    },
  ];
  for (const ordem of [arquivos, [...arquivos].reverse()]) {
    const resultado = importarArquivosAxiodis(ordem, "0077", 2026);
    assert.equal(resultado.produtores.length, 1);
    assert.equal(resultado.produtores[0]!.codigo, "603165");
    const rota = resultado.rotas[0]!;
    assert.equal(rota.volumeL, 500);
    assert.equal(rota.km, 100);
    assert.equal(rota.inicioRota, "06:00");
    assert.equal(rota.chegadaBase, "13:00");
    assert.equal(rota.atividadeFimJornada, "servico");
    assert.equal(rota.pontosOperacionais?.length, 6);
    assert.equal(rota.pontosOperacionais?.[0]?.volumeInformadoL, undefined);
    assert.equal(rota.pontosOperacionais?.[1]?.codigo, "J0604");
    assert.equal(rota.pontosOperacionais?.[1]?.volumeInformadoL, 1);
    assert.equal(rota.pontosOperacionais?.[2]?.volumeInformadoL, 500);
    assert.deepEqual(auditarBase([rota], resultado.produtores), []);
    assert.equal(resultado.problemas.filter((p) => p.severidade === "erro").length, 0);
    assert.ok(resultado.problemas.some((p) => p.campo === "regiao"));
  }
});

test("J no cadastro sem evento correspondente é mantido na rota; vínculo órfão é indicado", () => {
  const resultado = importarArquivosAxiodis(
    [
      { nome: "route.csv", texto: routeNow(eventosCooperativa("0077", "28", "10")) },
      {
        nome: "produtores.csv",
        texto: [
          CABECALHO_PRODUTORES,
          "123456789;PRODUTOR;2094E;50;0077COO09TO01;28/09 08:00",
          "JXXXX;PONTO;2094E;;0077COO09TO01;28/09 08:00",
          "J0804;OUTRO PONTO;2094E;1;0081COO09TO01;28/09 08:00",
          "J0804;OUTRO CICLO;2094E;1;0077COO09TO01;29/09 08:00",
        ].join("\n"),
      },
    ],
    "0077",
    2026,
  );
  assert.equal(resultado.produtores.length, 1);
  assert.equal(resultado.rotas[0]!.pontosOperacionais?.length, 1);
  assert.equal(resultado.rotas[0]!.pontosOperacionais?.[0]?.codigo, "JXXXX");
  assert.equal(
    resultado.problemas.filter((p) => p.campo === "rota" && p.severidade === "erro").length,
    2,
  );
  assert.ok(!resultado.problemas.some((p) => p.campo === "codigo" || p.campo === "volume"));
});

test("coleta após meia-noite usa ciclo da saída quando informado no cadastro", () => {
  const resultado = importarProdutoresRotas(
    [
      `${CABECALHO_PRODUTORES};Hr Início Rota`,
      "603165;PRODUTOR;2000D;100;0077VIA09TO01;29/09 00:30;28/09 20:00",
      "J0604;PONTO;2000D;1;0077VIA09TO01;29/09 01:00;28/09 20:00",
    ].join("\n"),
    "produtores.csv",
    2026,
  );
  assert.equal(resultado.produtores[0]!.ciclo, "par");
  assert.equal(resultado.pontosOperacionais?.[0]?.ciclo, "par");
});
