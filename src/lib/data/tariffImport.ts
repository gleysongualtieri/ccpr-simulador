import type { ProblemaQualidade, TarifaTransporte } from "../domain/types.ts";
import {
  cnpjValido,
  equipamentoIdPorTipoTarifa,
  normalizarCnpj,
  normalizarTipoTarifa,
} from "./tariffs.ts";

export interface ResultadoImportacaoTarifas {
  tarifas: TarifaTransporte[];
  problemas: ProblemaQualidade[];
  totalLinhas: number;
  duplicatasSubstituidas: number;
}

const CAMPOS = {
  local: ["LOCAL"],
  cnpj: ["CNPJ"],
  transportadora: ["TRANSPORTADORA"],
  codigoTarifa: ["COD TARIFA"],
  tipo: ["TIPO"],
  inicio: ["DATA INICIO"],
  fim: ["DAT FIM VIGENCIA", "DATA FIM VIGENCIA"],
  diaria: ["DIARIA"],
  km: ["KM"],
  kmInicio: ["VAL KM INICIO"],
  kmFim: ["VAL KM FIM"],
  noturno: ["VAL ADC NOTURNO"],
  motoristaExtra: ["MOT EXTRA"],
  atualizacao: ["DAT ATUALIZACAO", "DATA ATUALIZACAO"],
} as const;

function cabecalho(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}
function indiceDe(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}
function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}
function numero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || texto(valor) === "") return undefined;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : undefined;
  const bruto = texto(valor).replace(/\s/g, "");
  const resultado = Number(
    bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto,
  );
  return Number.isFinite(resultado) ? resultado : undefined;
}
function dataIso(valor: unknown): string | undefined {
  if (valor instanceof Date && !Number.isNaN(valor.getTime()))
    return valor.toISOString().slice(0, 10);
  if (typeof valor === "number" && Number.isFinite(valor))
    return new Date(Date.UTC(1899, 11, 30) + Math.trunc(valor) * 86400000)
      .toISOString()
      .slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(texto(valor));
  if (!match) return undefined;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const data = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : undefined;
}
function dataHoraIso(valor: unknown): string | undefined {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString();
  const bruto = texto(valor).replace(" ", "T");
  const data = new Date(bruto.endsWith("Z") ? bruto : `${bruto}Z`);
  return bruto && !Number.isNaN(data.getTime()) ? data.toISOString() : undefined;
}
function idTarifa(tarifa: Omit<TarifaTransporte, "id">): string {
  return [
    tarifa.unidadeId,
    tarifa.cnpj,
    normalizarTipoTarifa(tarifa.tipoOrigem),
    tarifa.inicioVigencia,
  ].join("|");
}

export function importarMatrizTarifas(
  linhas: unknown[][],
  arquivo: string,
): ResultadoImportacaoTarifas {
  const problemas: ProblemaQualidade[] = [];
  if (!linhas.length)
    return {
      tarifas: [],
      problemas: [
        {
          severidade: "erro",
          entidade: arquivo,
          campo: "arquivo",
          mensagem: "A planilha está vazia.",
        },
      ],
      totalLinhas: 0,
      duplicatasSubstituidas: 0,
    };
  const headers = (linhas[0] ?? []).map(cabecalho);
  const indices = Object.fromEntries(
    Object.entries(CAMPOS).map(([campo, aliases]) => [campo, indiceDe(headers, aliases)]),
  ) as Record<keyof typeof CAMPOS, number>;
  const obrigatorios: (keyof typeof CAMPOS)[] = [
    "local",
    "cnpj",
    "transportadora",
    "codigoTarifa",
    "tipo",
    "inicio",
    "diaria",
    "km",
    "atualizacao",
  ];
  const ausentes = obrigatorios.filter((campo) => indices[campo] < 0);
  if (ausentes.length)
    return {
      tarifas: [],
      problemas: [
        {
          severidade: "erro",
          entidade: arquivo,
          campo: "cabeçalho",
          mensagem: `Colunas obrigatórias ausentes: ${ausentes.join(", ")}.`,
        },
      ],
      totalLinhas: Math.max(0, linhas.length - 1),
      duplicatasSubstituidas: 0,
    };

  const mapa = new Map<string, TarifaTransporte>();
  const tiposNaoMapeados = new Map<string, number>();
  let duplicatasSubstituidas = 0;
  linhas.slice(1).forEach((linha, deslocamento) => {
    if (!linha.some((valor) => valor !== null && valor !== undefined && texto(valor) !== ""))
      return;
    const numeroLinha = deslocamento + 2;
    const entidade = `Linha ${numeroLinha}`;
    const local = texto(linha[indices.local]);
    const unidadeId = /^(\d{4})\b/.exec(local)?.[1] ?? "";
    const cnpj = normalizarCnpj(linha[indices.cnpj]);
    const transportadoraNome = texto(linha[indices.transportadora]);
    const tipoOrigem = texto(linha[indices.tipo]);
    const inicioVigencia = dataIso(linha[indices.inicio]);
    const fimBruto = indices.fim >= 0 ? linha[indices.fim] : undefined;
    const fimVigencia = dataIso(fimBruto);
    const atualizadaEm = dataHoraIso(linha[indices.atualizacao]);
    const diaria = numero(linha[indices.diaria]);
    const custoKm = numero(linha[indices.km]);
    const erros: string[] = [];
    if (!unidadeId) erros.push("local sem código de unidade com quatro dígitos");
    if (!cnpjValido(cnpj)) erros.push("CNPJ inválido");
    if (!transportadoraNome) erros.push("transportadora não informada");
    if (!tipoOrigem) erros.push("tipo não informado");
    if (!inicioVigencia) erros.push("data inicial inválida");
    if (fimBruto != null && texto(fimBruto) && !fimVigencia) erros.push("data final inválida");
    if (inicioVigencia && fimVigencia && fimVigencia < inicioVigencia)
      erros.push("vigência final anterior à inicial");
    if (!atualizadaEm) erros.push("data de atualização inválida");
    if (diaria !== undefined && diaria < 0) erros.push("diária negativa");
    if (custoKm !== undefined && custoKm < 0) erros.push("valor por km negativo");
    if (erros.length) {
      problemas.push({
        severidade: "erro",
        entidade,
        campo: "registro",
        mensagem: `${erros.join("; ")}.`,
      });
      return;
    }

    const equipamentoId = equipamentoIdPorTipoTarifa(tipoOrigem);
    const tipoNormalizado = normalizarTipoTarifa(tipoOrigem);
    if (!equipamentoId && !["MOTORISTA_EXTRA", "ADICIONAL_NOTURNO"].includes(tipoNormalizado))
      tiposNaoMapeados.set(tipoOrigem, (tiposNaoMapeados.get(tipoOrigem) ?? 0) + 1);
    if ((diaria ?? 0) > 10000 || (custoKm ?? 0) > 100)
      problemas.push({
        severidade: "alerta",
        entidade,
        campo: "tarifa",
        mensagem: "Valor muito acima do padrão. Revise a linha antes de usar essa vigência.",
      });

    const semId: Omit<TarifaTransporte, "id"> = {
      unidadeId,
      localNome: local.includes(" - ") ? local.split(" - ").slice(1).join(" - ").trim() : local,
      cnpj,
      transportadoraNome,
      codigoTarifa: texto(linha[indices.codigoTarifa]),
      tipoOrigem,
      ...(equipamentoId ? { equipamentoId } : {}),
      inicioVigencia: inicioVigencia!,
      ...(fimVigencia ? { fimVigencia } : {}),
      ...(diaria !== undefined ? { diaria } : {}),
      ...(custoKm !== undefined ? { custoKm } : {}),
      ...(indices.kmInicio >= 0 && numero(linha[indices.kmInicio]) !== undefined
        ? { valorKmInicio: numero(linha[indices.kmInicio]) }
        : {}),
      ...(indices.kmFim >= 0 && numero(linha[indices.kmFim]) !== undefined
        ? { valorKmFim: numero(linha[indices.kmFim]) }
        : {}),
      ...(indices.noturno >= 0 && numero(linha[indices.noturno]) !== undefined
        ? { adicionalNoturno: numero(linha[indices.noturno]) }
        : {}),
      ...(indices.motoristaExtra >= 0 && numero(linha[indices.motoristaExtra]) !== undefined
        ? { motoristaExtra: numero(linha[indices.motoristaExtra]) }
        : {}),
      atualizadaEm: atualizadaEm!,
      origemArquivo: arquivo,
    };
    const id = idTarifa(semId);
    const anterior = mapa.get(id);
    if (anterior) {
      duplicatasSubstituidas += 1;
      if (anterior.atualizadaEm > semId.atualizadaEm) return;
    }
    mapa.set(id, { id, ...semId });
  });

  if (duplicatasSubstituidas)
    problemas.push({
      severidade: "alerta",
      entidade: arquivo,
      campo: "duplicidade",
      mensagem: `${duplicatasSubstituidas} registro(s) repetido(s) foram consolidados pela atualização mais recente.`,
    });
  for (const [tipo, quantidade] of tiposNaoMapeados)
    problemas.push({
      severidade: "alerta",
      entidade: arquivo,
      campo: "TIPO",
      mensagem: `${quantidade} registro(s) do tipo “${tipo}” foram importados, mas ainda não serão usados no cálculo porque a equivalência com o equipamento não foi confirmada.`,
    });
  return {
    tarifas: [...mapa.values()],
    problemas,
    totalLinhas: Math.max(0, linhas.length - 1),
    duplicatasSubstituidas,
  };
}
