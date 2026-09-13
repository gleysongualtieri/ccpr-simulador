import type {
  Equipamento,
  RotaOperacional,
  TarifaTransporte,
  Transportadora,
} from "@/lib/domain/types";
import { isCompativel } from "./compatibility";
import { indicadoresRota, type IndicadoresRota } from "./routeCost";
import { validarCapacidade, type ResultadoCapacidade } from "./capacity";
import { compararIndicadores, type Comparacao } from "./comparison";
import { resolverTarifaRota } from "../data/tariffs";

/**
 * Motor de simulação (PRD 6.1/6.2, RF03/RF04/RF05).
 * Uma simulação é sempre uma CAMADA sobre o dado real — nunca o altera.
 */

export interface EntradaSimulacao {
  aumentoVolumeL: number;
  aumentoKm: number;
  equipamentoIdSimulado: string;
}

export interface ResultadoSimulacao {
  rota: RotaOperacional;
  equipamentoAtual: Equipamento;
  equipamentoSimulado: Equipamento;
  atual: IndicadoresRota;
  simulado: IndicadoresRota;
  comparacao: Comparacao;
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
  const atualResolvida = resolverTarifaRota(rota, rota.equipamentoId, tarifas, transportadoras);
  const simuladaResolvida = resolverTarifaRota(
    rota,
    entrada.equipamentoIdSimulado,
    tarifas,
    transportadoras,
  );
  if (!atualResolvida || !simuladaResolvida) return null;
  const equipamentoAtual = atualResolvida.equipamento;
  const equipamentoSimulado = simuladaResolvida.equipamento;

  const atual = indicadoresRota(equipamentoAtual, rota.volumeL, rota.km, rota.capacidadeRealL);

  const novoVolume = rota.volumeL + entrada.aumentoVolumeL;
  const novoKm = rota.km + entrada.aumentoKm;
  // Mantendo o mesmo equipamento, a capacidade real do veículo (cavalo + reboque) continua valendo.
  const capacidadeSimuladaL =
    equipamentoSimulado.id === rota.equipamentoId ? rota.capacidadeRealL : undefined;
  const simulado = indicadoresRota(equipamentoSimulado, novoVolume, novoKm, capacidadeSimuladaL);

  return {
    rota,
    equipamentoAtual,
    equipamentoSimulado,
    atual,
    simulado,
    comparacao: compararIndicadores(atual, simulado),
    capacidade: validarCapacidade(equipamentoSimulado, novoVolume, capacidadeSimuladaL),
    compativel: isCompativel(rota.sufixoTipo, equipamentoSimulado.id),
    tarifaAtualEncontrada: rota.origem.mock || Boolean(atualResolvida.tarifa),
    tarifaSimuladaEncontrada: rota.origem.mock || Boolean(simuladaResolvida.tarifa),
  };
}

/** Rota resultante da simulação, usada na agregação regional (não persiste). */
export function projetarRota(rota: RotaOperacional, entrada: EntradaSimulacao): RotaOperacional {
  return {
    ...rota,
    volumeL: rota.volumeL + entrada.aumentoVolumeL,
    km: rota.km + entrada.aumentoKm,
    equipamentoId: entrada.equipamentoIdSimulado,
  };
}
