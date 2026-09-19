import { litrosPrecisos } from "../format.ts";
import { getEquipamento } from "./equipment.ts";
import { minutosEntre, formatarHoras } from "./routeJourney.ts";
import { categoriaReboquePorCapacidade } from "../data/tariffs.ts";
import type {
  Equipamento,
  RotaOperacional,
  TarifaTransporte,
  Transportadora,
} from "@/lib/domain/types";
import { isCompativel } from "./compatibility.ts";
import { indicadoresRota, type IndicadoresRota } from "./routeCost.ts";
import { validarCapacidade, type ResultadoCapacidade } from "./capacity.ts";
import { compararIndicadores, type Comparacao } from "./comparison.ts";
import { resolverTarifaRota } from "../data/tariffs.ts";

/**
 * Motor de simulação (PRD 6.1/6.2, RF03/RF04/RF05).
 * Uma simulação é sempre uma CAMADA sobre o dado real — nunca o altera.
 */

export interface EntradaSimulacao {
  capacidadeVeiculoSimuladaL?: number | undefined;
  capacidadeReboqueSimuladaL?: number | undefined;
  categoriaReboqueSimulada?: "comum" | "trucado" | undefined;

  aumentoVolumeL: number;
  aumentoKm: number;
  equipamentoIdSimulado: string;
}

export interface ResultadoSimulacao {
  motivosBloqueio: string[];
  viavel: boolean;
  rota: RotaOperacional;
  equipamentoAtual: Equipamento;
  equipamentoSimulado: Equipamento;
  atual: IndicadoresRota;
  simulado: IndicadoresRota;
  comparacao: Comparacao;
  capacidadeInformada: boolean;
  capacidade: ResultadoCapacidade;
  compativel: boolean;
  tarifaAtualEncontrada: boolean;
  tarifaSimuladaEncontrada: boolean;
}

export function simularRota(
  rota: RotaOperacional,
  entrada: EntradaSimulacao,
  tarifas: TarifaTransporte[] = [],
  transportadoras: Transportadora[] = [],
): ResultadoSimulacao | null {
  const projetada = projetarRota(rota, entrada);
  const motivosBloqueio: string[] = [];
  const valido = (n: number | undefined) => Number.isFinite(n) && n! > 0 && n! <= 100000;
  const conjunto = getEquipamento(entrada.equipamentoIdSimulado)?.tipo === "reboque";
  if (!valido(projetada.capacidadeVeiculoInformadaL))
    motivosBloqueio.push("Informe uma capacidade válida para o veículo (1 a 100.000 L).");
  if (conjunto && !valido(projetada.capacidadeReboqueL))
    motivosBloqueio.push("Informe uma capacidade válida para o reboque (1 a 100.000 L).");
  if (
    conjunto &&
    !categoriaReboquePorCapacidade(projetada.capacidadeReboqueL) &&
    !entrada.categoriaReboqueSimulada
  )
    motivosBloqueio.push("Informe a categoria do reboque para localizar a tarifa.");
  const jornada = minutosEntre(rota.inicioRota, rota.chegadaBase) / 60;
  if (jornada > 13)
    motivosBloqueio.push(
      `Jornada de ${formatarHoras(jornada)} entre Saída e Balanza excede o limite de 13h.`,
    );
  if (![entrada.aumentoVolumeL, entrada.aumentoKm].every((n) => Number.isFinite(n) && n >= 0))
    motivosBloqueio.push(
      "Volume e distância adicionais devem ser números válidos e não negativos.",
    );
  const atualResolvida = resolverTarifaRota(rota, rota.equipamentoId, tarifas, transportadoras);
  const simuladaResolvida = resolverTarifaRota(
    projetada,
    entrada.equipamentoIdSimulado,
    tarifas,
    transportadoras,
    entrada.categoriaReboqueSimulada,
  );
  if (!atualResolvida || !simuladaResolvida) return null;
  const equipamentoAtual = atualResolvida.equipamento;
  const equipamentoSimulado = {
    ...simuladaResolvida.equipamento,
    capacidadeL: projetada.capacidadeRealL ?? 0,
  };

  const atual = indicadoresRota(equipamentoAtual, rota.volumeL, rota.km, rota.capacidadeRealL);

  const novoVolume = rota.volumeL + entrada.aumentoVolumeL;
  const novoKm = rota.km + entrada.aumentoKm;
  const capacidadeSimuladaL = projetada.capacidadeRealL;
  const simulado = indicadoresRota(equipamentoSimulado, novoVolume, novoKm, capacidadeSimuladaL);
  const capacidade = validarCapacidade(equipamentoSimulado, novoVolume, capacidadeSimuladaL);
  const compativel = isCompativel(rota.sufixoTipo, equipamentoSimulado.id);
  if (!compativel) motivosBloqueio.push("Equipamento incompatível com o tipo da rota.");
  const capacidadeInformada = capacidadeSimuladaL !== undefined && capacidadeSimuladaL > 0;
  if (!capacidadeInformada) {
    capacidade.excedida = false;
    capacidade.excedenteL = 0;
  }
  if (capacidade.excedida)
    motivosBloqueio.push(`Capacidade excedida em ${litrosPrecisos(capacidade.excedenteL)}.`);
  if (!rota.origem.mock && !atualResolvida.tarifa)
    motivosBloqueio.push("Tarifa da operação atual ausente.");
  if (!rota.origem.mock && !simuladaResolvida.tarifa)
    motivosBloqueio.push("Tarifa ausente para a composição simulada.");

  return {
    motivosBloqueio,
    viavel: motivosBloqueio.length === 0,
    rota,
    equipamentoAtual,
    equipamentoSimulado,
    atual,
    simulado,
    comparacao: compararIndicadores(atual, simulado),
    capacidadeInformada,
    capacidade,
    compativel,
    tarifaAtualEncontrada: rota.origem.mock || Boolean(atualResolvida.tarifa),
    tarifaSimuladaEncontrada: rota.origem.mock || Boolean(simuladaResolvida.tarifa),
  };
}

/** Rota resultante da simulação, usada na agregação regional (não persiste). */
export function projetarRota(rota: RotaOperacional, entrada: EntradaSimulacao): RotaOperacional {
  const mesmo = entrada.equipamentoIdSimulado === rota.equipamentoId;
  const conjunto = getEquipamento(entrada.equipamentoIdSimulado)?.tipo === "reboque";
  const veiculo =
    entrada.capacidadeVeiculoSimuladaL ??
    (mesmo
      ? (rota.capacidadeVeiculoInformadaL ??
        rota.capacidadeNominalL ??
        (conjunto ? undefined : rota.capacidadeRealL))
      : undefined);
  const reboque = conjunto
    ? (entrada.capacidadeReboqueSimuladaL ?? (mesmo ? rota.capacidadeReboqueL : undefined))
    : undefined;
  const valido = (n: number | undefined) => Number.isFinite(n) && n! > 0 && n! <= 100000;
  return {
    ...rota,
    volumeL: rota.volumeL + entrada.aumentoVolumeL,
    km: rota.km + entrada.aumentoKm,
    equipamentoId: entrada.equipamentoIdSimulado,
    capacidadeVeiculoInformadaL: veiculo,
    capacidadeReboqueL: reboque,
    capacidadeRealL:
      valido(veiculo) && (!conjunto || valido(reboque)) ? veiculo! + (reboque ?? 0) : undefined,
  };
}
