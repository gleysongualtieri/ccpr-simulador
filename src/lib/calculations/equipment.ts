import type { Equipamento } from "../domain/types.ts";

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
    id: "bitoco",
    nome: "Bitoco",
    tipo: "solteiro",
    capacidadeL: 13000,
    diaria: 0,
    custoKm: 0,
    siglas: ["BC"],
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
    id: "bitoco_reboque",
    nome: "Bitoco + Reboque",
    tipo: "reboque",
    capacidadeL: 25000,
    diaria: 0,
    custoKm: 0,
    siglas: ["BC+RB"],
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
    capacidadeL: 36000,
    diaria: 1050,
    custoKm: 7.2,
    siglas: ["BR"],
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
 * Variações de sigla encontradas nas exportações do Axiodis, normalizadas
 * para a sigla canônica da tabela de equipamentos.
 */
const SIGLAS_ALTERNATIVAS: Record<string, string> = {
  TC: "TO",
  TK: "TR",
  BK: "BT",
  CR: "CA",
  VD: "VA",
};

/** Sugestões atuais; o campo de importação também aceita novas capacidades. */
export const CAPACIDADES_REBOQUE_INICIAIS_L = [12000, 15000, 18000, 21000] as const;

export interface VeiculoDecodificado {
  unidade: string;
  transportadora: string;
  capacidadeNominalL: number | null;
  /** Capacidade do reboque acoplado (notação "/R15" → 15.000 L). */
  capacidadeReboqueL: number | null;
  /** Cavalo + reboque, quando houver reboque. */
  capacidadeTotalL: number | null;
  comReboque: boolean;
  sigla: string | null;
}

const VAZIO: VeiculoDecodificado = {
  unidade: "",
  transportadora: "",
  capacidadeNominalL: null,
  capacidadeReboqueL: null,
  capacidadeTotalL: null,
  comReboque: false,
  sigla: null,
};

/**
 * Decodifica o código bruto do veículo do Axiodis.
 * Ex.: "0081VIA18BT10" -> unidade 0081, transportadora VIA,
 * capacidade nominal 18 (18.000 L), sigla de equipamento BT.
 * Aceita ainda o sufixo de reboque "/R15" e siglas alternativas (TC, TK, BK...).
 */
export function decodificarVeiculo(codigo: string | null | undefined): VeiculoDecodificado {
  const texto = (codigo ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!texto) return { ...VAZIO };

  const match = /^(\d{4})([A-Z]{2,4})(\d{1,3})([A-Z]{2,3})(\d*)(?:\/R(\d{1,3}))?$/.exec(texto);
  if (!match) return { ...VAZIO };

  const capacidadeNominalL = match[3] ? Number(match[3]) * 1000 : null;
  const capacidadeReboqueL = match[6] ? Number(match[6]) * 1000 : null;
  const siglaBruta = match[4]!;
  const sigla = SIGLAS_ALTERNATIVAS[siglaBruta] ?? siglaBruta;

  return {
    unidade: match[1]!,
    transportadora: match[2]!,
    capacidadeNominalL,
    capacidadeReboqueL,
    capacidadeTotalL: (capacidadeNominalL ?? 0) + (capacidadeReboqueL ?? 0) || null,
    comReboque: capacidadeReboqueL != null,
    sigla,
  };
}
