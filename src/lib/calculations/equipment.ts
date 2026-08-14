import type { Equipamento } from "@/lib/domain/types";

/**
 * Tabela de referência de equipamentos — fonte única do motor de cálculo
 * (PRD Módulo 1, seção 6.1). Valores de diária e R$/km são parametrizáveis:
 * a Tabela de Tarifas real ainda está pendente de confirmação (PRD 13.6).
 */
export const EQUIPAMENTOS: Equipamento[] = [
  {
    id: "toco",
    nome: "Toco",
    tipo: "solteiro",
    capacidadeL: 8000,
    diaria: 450,
    custoKm: 3.2,
    siglas: ["TO"],
  },
  {
    id: "truck",
    nome: "Truck",
    tipo: "solteiro",
    capacidadeL: 12000,
    diaria: 560,
    custoKm: 4.1,
    siglas: ["TR"],
  },
  {
    id: "bitruck",
    nome: "Bitruck",
    tipo: "solteiro",
    capacidadeL: 18000,
    diaria: 640,
    custoKm: 4.6,
    siglas: ["BT"],
  },
  {
    id: "toco_reboque",
    nome: "Toco + Reboque",
    tipo: "reboque",
    capacidadeL: 16000,
    diaria: 700,
    custoKm: 5.1,
    siglas: ["TO+RB"],
  },
  {
    id: "truck_reboque",
    nome: "Truck + Reboque",
    tipo: "reboque",
    capacidadeL: 24000,
    diaria: 780,
    custoKm: 5.6,
    siglas: ["TR+RB"],
  },
  {
    id: "bitruck_reboque",
    nome: "Bitruck + Reboque",
    tipo: "reboque",
    capacidadeL: 30000,
    diaria: 860,
    custoKm: 6.1,
    siglas: ["BT+RB"],
  },
  {
    id: "carreta",
    nome: "Carreta",
    tipo: "especial",
    capacidadeL: 30000,
    diaria: 900,
    custoKm: 6.3,
    siglas: ["CA"],
  },
  {
    id: "bitrem",
    nome: "Bitrem",
    tipo: "especial",
    capacidadeL: 45000,
    diaria: 1050,
    custoKm: 7.2,
    siglas: ["BI"],
  },
  {
    id: "vanderleia",
    nome: "Vanderleia",
    tipo: "especial",
    capacidadeL: 38000,
    diaria: 980,
    custoKm: 6.8,
    siglas: ["VA"],
  },
];

export function getEquipamento(id: string): Equipamento | undefined {
  return EQUIPAMENTOS.find((e) => e.id === id);
}

/** Resolve um equipamento a partir da sigla presente no código do veículo. */
export function equipamentoPorSigla(sigla: string): Equipamento | undefined {
  const s = sigla.trim().toUpperCase();
  return EQUIPAMENTOS.find((e) => e.siglas.includes(s));
}

/**
 * Decodifica o código bruto do veículo do Axiodis.
 * Ex.: "0081VIA18BT10" -> unidade 0081, transportadora VIA,
 * capacidade nominal 18 (18.000 L), sigla de equipamento BT.
 */
export function decodificarVeiculo(codigo: string): {
  unidade: string;
  transportadora: string;
  capacidadeNominalL: number | null;
  sigla: string | null;
} {
  const match = /^(\d{4})([A-Z]{2,4})(\d{2})([A-Z]{2})/.exec(codigo.trim().toUpperCase());
  if (!match) {
    return { unidade: "", transportadora: "", capacidadeNominalL: null, sigla: null };
  }
  return {
    unidade: match[1]!,
    transportadora: match[2]!,
    capacidadeNominalL: Number(match[3]) * 1000,
    sigla: match[4]!,
  };
}
