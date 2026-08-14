import type { Equipamento } from "@/lib/domain/types";

/** Validação de capacidade excedida (PRD 6.3 / RF05). */
export interface ResultadoCapacidade {
  capacidadeL: number;
  volumeL: number;
  excedenteL: number;
  excedida: boolean;
  ocupacao: number;
}

export function validarCapacidade(
  equipamento: Equipamento,
  volumeL: number,
): ResultadoCapacidade {
  const capacidadeL = equipamento.capacidadeL;
  const excedenteL = Math.max(0, volumeL - capacidadeL);
  return {
    capacidadeL,
    volumeL,
    excedenteL,
    excedida: volumeL > capacidadeL,
    ocupacao: capacidadeL > 0 ? volumeL / capacidadeL : 0,
  };
}
