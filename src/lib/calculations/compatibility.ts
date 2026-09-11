import type { Equipamento, SufixoRota } from "../domain/types.ts";
import { EQUIPAMENTOS } from "./equipment.ts";

/**
 * Regra de compatibilidade Rota × Equipamento (PRD 6.4).
 * Regra de negócio do motor — a interface apenas reflete o resultado daqui.
 */
const REGRA: Record<SufixoRota, string[]> = {
  D: ["toco", "bitoco", "truck", "bitruck"],
  R: [
    "toco_reboque",
    "bitoco_reboque",
    "truck_reboque",
    "bitruck_reboque",
    "carreta",
    "bitrem",
    "vanderleia",
  ],
  A: ["toco", "bitoco", "truck", "bitruck"],
  B: ["toco", "bitoco", "truck", "bitruck"],
  C: ["toco", "bitoco", "truck", "bitruck"],
  E: ["toco", "bitoco", "truck", "bitruck"],
  S: ["carreta", "bitrem", "vanderleia"],
};

export const DESCRICAO_SUFIXO: Record<SufixoRota, string> = {
  D: "Rota direta — equipamento solteiro",
  R: "Rota com conjunto (veículo + reboque) ou equipamento T2",
  A: "Rota de apoio — equipamento solteiro",
  B: "Rota de apoio — equipamento solteiro",
  C: "Rota de apoio — equipamento solteiro",
  E: "Rota externa (cooperativa parceira) — equipamento solteiro",
  S: "Segundo percurso — Carreta, Bitrem ou Vanderleia",
};

export const SUFIXOS_VALIDOS: SufixoRota[] = ["D", "R", "A", "B", "C", "E", "S"];

export function extrairSufixo(codigoRota: string): SufixoRota | null {
  const letra = codigoRota.trim().toUpperCase().slice(-1);
  return (SUFIXOS_VALIDOS as string[]).includes(letra) ? (letra as SufixoRota) : null;
}

export function equipamentosCompativeis(sufixo: SufixoRota): Equipamento[] {
  const ids = REGRA[sufixo] ?? [];
  return EQUIPAMENTOS.filter((e) => ids.includes(e.id));
}

export function isCompativel(sufixo: SufixoRota, equipamentoId: string): boolean {
  return (REGRA[sufixo] ?? []).includes(equipamentoId);
}
