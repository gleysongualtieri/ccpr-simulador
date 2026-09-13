import type {
  CategoriaReboque,
  Equipamento,
  ProblemaQualidade,
  RotaOperacional,
  TarifaTransporte,
  Transportadora,
} from "../domain/types.ts";
import { getEquipamento } from "../calculations/equipment.ts";

export const TRANSPORTADORAS_INICIAIS: Transportadora[] = [
  { sigla: "ACT", nome: "Actros", cnpjs: [], ativa: true },
  { sigla: "CMT", nome: "Coopmetro", cnpjs: [], ativa: true },
  { sigla: "DGQ", nome: "Deusael Gomes Queiroz", cnpjs: [], ativa: true },
  { sigla: "DMT", nome: "DM Transportes", cnpjs: [], ativa: true },
  { sigla: "MLK", nome: "Milk Log", cnpjs: [], ativa: true },
  { sigla: "SEB", nome: "Silva e Barros", cnpjs: [], ativa: true },
  { sigla: "VIA", nome: "Via Lácteos", cnpjs: [], ativa: true },
  { sigla: "WMT", nome: "Willian Mesquita", cnpjs: [], ativa: true },
  { sigla: "RGS", nome: "Raphael Guedes Simões", cnpjs: [], ativa: true },
  { sigla: "FER", nome: "Fergan", cnpjs: [], ativa: true },
  { sigla: "TRA", nome: "Transportes Paulista Eireli", cnpjs: [], ativa: true },
  { sigla: "MMI", nome: "Marcos de Miranda", cnpjs: [], ativa: true },
  { sigla: "LLM", nome: "Lazaro Lima Martins", cnpjs: [], ativa: true },
  { sigla: "PAS", nome: "Paulo Antônio Aparecido da Silva", cnpjs: [], ativa: true },
  { sigla: "GTA", nome: "Genilson Tomaz de Araujo", cnpjs: [], ativa: true },
  {
    sigla: "TFL",
    nome: "TRANSFREITAS LTDA - ME",
    cnpjs: ["04197002000173"],
    ativa: true,
  },
];

const TIPO_PARA_EQUIPAMENTO: Record<string, string> = {
  TOCO: "toco",
  TRUCK: "truck",
  BITRUCK: "bitruck",
  TOCO_REBOQUE: "toco_reboque",
  TOCO_REBOQUE_TRUCK: "toco_reboque",
  TRUCK_REBOQUE: "truck_reboque",
  TRUCK_REBOQUE_TRUCK: "truck_reboque",
  BITRUCK_REBOQUE: "bitruck_reboque",
  CAVALO_MOTOR_CARRETA: "carreta",
  CAVALO_MOTOR_VANDERLEIA: "vanderleia",
  CAVALO_MOTOR_BITREM: "bitrem",
};

function semAcentos(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function normalizarTipoTarifa(valor: unknown): string {
  return semAcentos(String(valor ?? "")).replace(/\s+/g, "_");
}

export function equipamentoIdPorTipoTarifa(valor: unknown): string | undefined {
  return TIPO_PARA_EQUIPAMENTO[normalizarTipoTarifa(valor)];
}

export function categoriaReboquePorTipoTarifa(valor: unknown): CategoriaReboque | undefined {
  const tipo = normalizarTipoTarifa(valor);
  if (tipo.endsWith("_REBOQUE_TRUCK")) return "trucado";
  if (tipo.endsWith("_REBOQUE")) return "comum";
  return undefined;
}

export function categoriaReboquePorCapacidade(
  capacidadeReboqueL: number | undefined,
): CategoriaReboque | undefined {
  if (capacidadeReboqueL === 12000 || capacidadeReboqueL === 15000) return "comum";
  if (capacidadeReboqueL === 18000 || capacidadeReboqueL === 21000) return "trucado";
  return undefined;
}

export function somenteDigitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function normalizarCnpj(valor: unknown): string {
  const digitos = somenteDigitos(
    typeof valor === "number" && Number.isFinite(valor) ? Math.trunc(valor) : valor,
  );
  return digitos ? digitos.padStart(14, "0") : "";
}

export function cnpjValido(valor: unknown): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const digitos = [...cnpj].map(Number);
  const calcular = (base: number[], pesos: number[]) => {
    const resto = base.reduce((total, digito, indice) => total + digito * pesos[indice]!, 0) % 11;
    const resultado = 11 - resto;
    return resultado >= 10 ? 0 : resultado;
  };
  return (
    digitos[12] === calcular(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    digitos[13] === calcular(digitos.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}

export function formatarCnpj(valor: string): string {
  const cnpj = normalizarCnpj(valor);
  return /^\d{14}$/.test(cnpj)
    ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : valor;
}

const ALIASES_NOME: Record<string, string[]> = {
  CMT: ["COOPMETRO"],
  DMT: ["DM TRANSPORTES", "DM ALVES TRANSPORTES"],
  MLK: ["MILK LOG"],
  SEB: ["SILVA E BARROS"],
  VIA: ["VIA LACTEOS"],
  RGS: ["RAPHAEL GUEDES SIMOES", "RG TRANSPORTES"],
  TFL: ["TRANSFREITAS"],
};

export function associarTransportadorasImportadas(
  atuais: Transportadora[],
  tarifas: TarifaTransporte[],
): Transportadora[] {
  const mapa = new Map(atuais.map((item) => [item.sigla, { ...item, cnpjs: [...item.cnpjs] }]));
  for (const tarifa of tarifas) {
    const nome = semAcentos(tarifa.transportadoraNome);
    const encontrada = [...mapa.values()].find((item) => {
      const aliases = ALIASES_NOME[item.sigla] ?? [semAcentos(item.nome)];
      return aliases.some((alias) => nome.includes(alias));
    });
    if (encontrada && !encontrada.cnpjs.includes(tarifa.cnpj)) encontrada.cnpjs.push(tarifa.cnpj);
  }
  return [...mapa.values()].sort((a, b) => a.sigla.localeCompare(b.sigla));
}

export function validarTransportadora(transportadora: Transportadora): ProblemaQualidade[] {
  const problemas: ProblemaQualidade[] = [];
  if (!/^[A-Z]{2,4}$/.test(transportadora.sigla)) {
    problemas.push({
      severidade: "erro",
      entidade: transportadora.sigla || "Nova transportadora",
      campo: "sigla",
      mensagem: "A sigla deve ter de 2 a 4 letras, igual ao código usado pelo Axiodis.",
    });
  }
  if (!transportadora.nome.trim()) {
    problemas.push({
      severidade: "erro",
      entidade: transportadora.sigla || "Nova transportadora",
      campo: "nome",
      mensagem: "Informe o nome da transportadora.",
    });
  }
  for (const cnpj of transportadora.cnpjs) {
    if (!cnpjValido(cnpj))
      problemas.push({
        severidade: "erro",
        entidade: transportadora.sigla || "Nova transportadora",
        campo: "CNPJ",
        mensagem: `CNPJ inválido: ${cnpj}.`,
      });
  }
  return problemas;
}

export interface TarifaResolvida {
  equipamento: Equipamento;
  tarifa?: TarifaTransporte | undefined;
  transportadora?: Transportadora | undefined;
}

export function resolverTarifaRota(
  rota: RotaOperacional,
  equipamentoId: string,
  tarifas: TarifaTransporte[],
  transportadoras: Transportadora[],
): TarifaResolvida | undefined {
  const base = getEquipamento(equipamentoId);
  if (!base) return undefined;
  const transportadora = transportadoras.find(
    (item) => item.ativa && item.sigla === rota.transportadora.toUpperCase(),
  );
  const data = rota.dataExecucao?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const cnpjs = new Set(transportadora?.cnpjs ?? []);
  const categoriaReboque =
    base.tipo === "reboque" ? categoriaReboquePorCapacidade(rota.capacidadeReboqueL) : undefined;
  const candidatas = tarifas
    .filter(
      (tarifa) =>
        tarifa.unidadeId === rota.unidadeId &&
        tarifa.equipamentoId === equipamentoId &&
        (base.tipo !== "reboque" ||
          (categoriaReboque !== undefined && tarifa.categoriaReboque === categoriaReboque)) &&
        cnpjs.has(tarifa.cnpj) &&
        tarifa.inicioVigencia <= data &&
        (!tarifa.fimVigencia || tarifa.fimVigencia >= data),
    )
    .sort(
      (a, b) =>
        b.inicioVigencia.localeCompare(a.inicioVigencia) ||
        b.atualizadaEm.localeCompare(a.atualizadaEm),
    );
  const tarifa = candidatas[0];
  return {
    equipamento: tarifa
      ? { ...base, diaria: tarifa.diaria ?? 0, custoKm: tarifa.custoKm ?? 0 }
      : rota.origem.mock
        ? base
        : { ...base, diaria: 0, custoKm: 0 },
    tarifa,
    transportadora,
  };
}
