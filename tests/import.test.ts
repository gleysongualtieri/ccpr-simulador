import assert from "node:assert/strict";
import test from "node:test";

import {
  auditarBase,
  identificarTipoArquivo,
  importarProdutoresRotas,
  importarRouteNow,
} from "../src/lib/data/import.ts";
import { calcularJornada } from "../src/lib/calculations/routeJourney.ts";
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

test("ausência de Balanza é erro bloqueante", () => {
  const resultado = importarRouteNow(
    routeNow([
      "0081VIA09TO01;;2783R;Saída;0081;BASE;;0;09/09 01:31;-18,8;-48,3",
      "0081VIA09TO01;1;2783R;Coleta;123456789;PRODUTOR;1.000;165;09/09 04:35;-19,8;-47,6",
      "0081VIA09TO01;;2783R;Descarrega;123456789;PRODUTOR;1.000;417;09/09 13:20;-18,8;-48,3",
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
