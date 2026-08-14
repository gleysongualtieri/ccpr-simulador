import type { Equipamento } from "@/lib/domain/types";

/**
 * Fórmulas de custo — fonte única (PRD Módulo 1, seções 6.1/6.7).
 * Nenhuma tela pode reimplementar estas contas.
 */

export function custoRota(equipamento: Equipamento, km: number): number {
  return equipamento.diaria + km * equipamento.custoKm;
}

export function custoPorLitro(custo: number, volumeL: number): number {
  return volumeL > 0 ? custo / volumeL : 0;
}

export function densidade(volumeL: number, km: number): number {
  return km > 0 ? volumeL / km : 0;
}

export interface IndicadoresRota {
  volumeL: number;
  km: number;
  custo: number;
  custoLitro: number;
  densidade: number;
  ocupacao: number;
  capacidadeL: number;
}

export function indicadoresRota(
  equipamento: Equipamento,
  volumeL: number,
  km: number,
): IndicadoresRota {
  const custo = custoRota(equipamento, km);
  return {
    volumeL,
    km,
    custo,
    custoLitro: custoPorLitro(custo, volumeL),
    densidade: densidade(volumeL, km),
    ocupacao: equipamento.capacidadeL > 0 ? volumeL / equipamento.capacidadeL : 0,
    capacidadeL: equipamento.capacidadeL,
  };
}
