import type { Equipamento, RotaOperacional } from "@/lib/domain/types";
import { getEquipamento } from "./equipment";
import { isCompativel } from "./compatibility";
import { indicadoresRota, type IndicadoresRota } from "./routeCost";
import { validarCapacidade, type ResultadoCapacidade } from "./capacity";
import { compararIndicadores, type Comparacao } from "./comparison";

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
}

export function simularRota(
  rota: RotaOperacional,
  entrada: EntradaSimulacao,
): ResultadoSimulacao | null {
  const equipamentoAtual = getEquipamento(rota.equipamentoId);
  const equipamentoSimulado = getEquipamento(entrada.equipamentoIdSimulado);
  if (!equipamentoAtual || !equipamentoSimulado) return null;

  const atual = indicadoresRota(equipamentoAtual, rota.volumeL, rota.km);

  const novoVolume = rota.volumeL + entrada.aumentoVolumeL;
  const novoKm = rota.km + entrada.aumentoKm;
  const simulado = indicadoresRota(equipamentoSimulado, novoVolume, novoKm);

  return {
    rota,
    equipamentoAtual,
    equipamentoSimulado,
    atual,
    simulado,
    comparacao: compararIndicadores(atual, simulado),
    capacidade: validarCapacidade(equipamentoSimulado, novoVolume),
    compativel: isCompativel(rota.sufixoTipo, equipamentoSimulado.id),
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
