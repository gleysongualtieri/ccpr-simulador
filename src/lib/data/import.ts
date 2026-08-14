import type {
  OrigemDado,
  Produtor,
  ProblemaQualidade,
  RotaOperacional,
} from "@/lib/domain/types";
import { equipamentoPorSigla, decodificarVeiculo, getEquipamento } from "@/lib/calculations/equipment";
import { extrairSufixo, isCompativel } from "@/lib/calculations/compatibility";

/**
 * Leitura, validação e transformação dos arquivos exportados do Axiodis
 * (Route_now e Produtores_Rotas) — PRD RF01/RF10, seções 39/40/41.
 * Nada é persistido aqui: a persistência só ocorre após confirmação do usuário.
 */

export type TipoArquivo = "route_now" | "produtores_rotas";

export function parseDelimitado(texto: string): string[][] {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return [];
  const delimitador = (linhas[0]!.match(/;/g)?.length ?? 0) >= (linhas[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  return linhas.map((l) => l.split(delimitador).map((c) => c.trim().replace(/^"|"$/g, "")));
}

function indice(cabecalho: string[], ...nomes: string[]): number {
  const normal = cabecalho.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const nome of nomes) {
    const alvo = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
    const i = normal.indexOf(alvo);
    if (i >= 0) return i;
  }
  return -1;
}

function numero(valor: string | undefined): number {
  if (!valor) return NaN;
  const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  return limpo === "" ? NaN : Number(limpo);
}

const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export interface PreviaImportacao {
  rotas: RotaOperacional[];
  produtores: Produtor[];
  problemas: ProblemaQualidade[];
  linhasLidas: number;
}

export function importarRouteNow(
  texto: string,
  arquivo: string,
  unidadeIdPadrao: string,
): PreviaImportacao {
  const linhas = parseDelimitado(texto);
  const problemas: ProblemaQualidade[] = [];
  const rotas: RotaOperacional[] = [];
  if (linhas.length < 2) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "arquivo",
      mensagem: "Arquivo vazio ou sem linhas de dados.",
    });
    return { rotas, produtores: [], problemas, linhasLidas: 0 };
  }

  const cab = linhas[0]!;
  const iRota = indice(cab, "rota", "codigo_rota", "route");
  const iVeiculo = indice(cab, "veiculo", "vehicle", "codigo_veiculo");
  const iVolume = indice(cab, "volume", "volume_l", "litros");
  const iKm = indice(cab, "km", "distancia", "km_total");
  const iCiclo = indice(cab, "ciclo", "dia", "paridade");
  const iInicio = indice(cab, "inicio", "inicio_rota", "hora_inicio");
  const iChegada = indice(cab, "chegada", "chegada_base", "balanza", "pesagem");
  const iUnidade = indice(cab, "unidade", "filial");
  const iRegiao = indice(cab, "regiao", "linha");

  if (iRota < 0) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "rota",
      mensagem: "Coluna obrigatória 'Rota' não encontrada no cabeçalho.",
    });
    return { rotas, produtores: [], problemas, linhasLidas: linhas.length - 1 };
  }

  const origem: OrigemDado = {
    arquivo,
    importadoEm: new Date().toISOString(),
    mock: false,
  };

  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]!;
    const codigo = (l[iRota] ?? "").toUpperCase();
    if (!codigo) continue;

    const sufixo = extrairSufixo(codigo);
    if (!sufixo) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "codigo",
        mensagem: "Código de rota inválido: sufixo não reconhecido (esperado D/R/A/B/C/E/S).",
      });
      continue;
    }

    const veiculo = (l[iVeiculo] ?? "").toUpperCase();
    const decodificado = decodificarVeiculo(veiculo);
    const equipamento = decodificado.sigla ? equipamentoPorSigla(decodificado.sigla) : undefined;
    if (!equipamento) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "veiculo",
        mensagem: `Equipamento desconhecido no código de veículo "${veiculo || "—"}".`,
      });
      continue;
    }
    if (!isCompativel(sufixo, equipamento.id)) {
      problemas.push({
        severidade: "alerta",
        entidade: codigo,
        campo: "equipamento",
        mensagem: `Equipamento ${equipamento.nome} não é compatível com rota de sufixo ${sufixo}.`,
      });
    }

    const volumeL = numero(l[iVolume]);
    const kmRota = numero(l[iKm]);
    if (!Number.isFinite(volumeL) || volumeL <= 0) {
      problemas.push({ severidade: "erro", entidade: codigo, campo: "volume", mensagem: "Rota sem volume válido." });
      continue;
    }
    if (!Number.isFinite(kmRota) || kmRota <= 0) {
      problemas.push({ severidade: "erro", entidade: codigo, campo: "km", mensagem: "Rota sem km válido." });
      continue;
    }

    const cicloBruto = (l[iCiclo] ?? "").toLowerCase();
    let ciclo: "par" | "impar" | null = null;
    if (cicloBruto.startsWith("par")) ciclo = "par";
    else if (cicloBruto.startsWith("imp") || cicloBruto.startsWith("ímp")) ciclo = "impar";
    if (!ciclo) {
      problemas.push({ severidade: "erro", entidade: codigo, campo: "ciclo", mensagem: "Rota sem ciclo par/ímpar identificado." });
      continue;
    }

    const inicioRota = l[iInicio] ?? "";
    const chegadaBase = l[iChegada] ?? "";
    if (!HORA_RE.test(inicioRota) || !HORA_RE.test(chegadaBase)) {
      problemas.push({
        severidade: "alerta",
        entidade: codigo,
        campo: "horario",
        mensagem: "Horário inválido — jornada não poderá ser calculada para esta rota.",
      });
    }

    rotas.push({
      codigo,
      sufixoTipo: sufixo,
      unidadeId: ((l[iUnidade] ?? "") || decodificado.unidade || unidadeIdPadrao).trim(),
      regiao: (l[iRegiao] ?? "").trim() || "—",
      ciclo,
      veiculo,
      transportadora: decodificado.transportadora,
      equipamentoId: equipamento.id,
      volumeL,
      km: kmRota,
      inicioRota: HORA_RE.test(inicioRota) ? inicioRota : "00:00",
      chegadaBase: HORA_RE.test(chegadaBase) ? chegadaBase : "00:00",
      origem,
    });
  }

  return { rotas, produtores: [], problemas, linhasLidas: linhas.length - 1 };
}

export function importarProdutoresRotas(texto: string, arquivo: string): PreviaImportacao {
  const linhas = parseDelimitado(texto);
  const problemas: ProblemaQualidade[] = [];
  const produtores: Produtor[] = [];
  if (linhas.length < 2) {
    problemas.push({ severidade: "erro", entidade: arquivo, campo: "arquivo", mensagem: "Arquivo vazio ou sem linhas de dados." });
    return { rotas: [], produtores, problemas, linhasLidas: 0 };
  }

  const cab = linhas[0]!;
  const iCodigo = indice(cab, "codigo", "codigo_produtor", "produtor");
  const iNome = indice(cab, "nome", "razao_social", "produtor_nome");
  const iVolume = indice(cab, "volume", "volume_l", "litros");
  const iRota = indice(cab, "rota", "codigo_rota");

  if (iCodigo < 0 || iRota < 0) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "cabecalho",
      mensagem: "Colunas obrigatórias 'Código do produtor' e 'Rota' não encontradas.",
    });
    return { rotas: [], produtores, problemas, linhasLidas: linhas.length - 1 };
  }

  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]!;
    const codigo = (l[iCodigo] ?? "").replace(/\D/g, "");
    if (!codigo) continue;
    if (codigo.length < 9) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "codigo",
        mensagem: "Código de produtor inválido — esperado Cooperativa(3) + Linha(3) + Matrícula(3).",
      });
      continue;
    }
    const volumeL = numero(l[iVolume]);
    if (!Number.isFinite(volumeL) || volumeL <= 0) {
      problemas.push({ severidade: "alerta", entidade: codigo, campo: "volume", mensagem: "Produtor sem volume informado." });
    }

    // Região extraída do segmento "Linha" do código (PRD 6.6 / RF10)
    produtores.push({
      codigo,
      nome: (l[iNome] ?? "").trim() || codigo,
      cooperativa: codigo.slice(0, 3),
      linha: codigo.slice(3, 6),
      matricula: codigo.slice(6),
      volumeL: Number.isFinite(volumeL) ? volumeL : 0,
      rotaCodigo: (l[iRota] ?? "").toUpperCase(),
    });
  }

  return { rotas: [], produtores, problemas, linhasLidas: linhas.length - 1 };
}

/** Aplica a região (linha do produtor) sobre as rotas importadas — RF10. */
export function aplicarRegiaoDosProdutores(
  rotas: RotaOperacional[],
  produtores: Produtor[],
): RotaOperacional[] {
  return rotas.map((rota) => {
    const doGrupo = produtores.filter((p) => p.rotaCodigo === rota.codigo);
    if (doGrupo.length === 0) return rota;
    const contagem = new Map<string, number>();
    for (const p of doGrupo) contagem.set(p.linha, (contagem.get(p.linha) ?? 0) + 1);
    const dominante = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return dominante ? { ...rota, regiao: dominante } : rota;
  });
}

/** Checagens de qualidade sobre a base consolidada (PRD seção 40). */
export function auditarBase(rotas: RotaOperacional[], produtores: Produtor[]): ProblemaQualidade[] {
  const problemas: ProblemaQualidade[] = [];
  for (const rota of rotas) {
    const equipamento = getEquipamento(rota.equipamentoId);
    if (!equipamento) {
      problemas.push({ severidade: "erro", entidade: rota.codigo, campo: "equipamento", mensagem: "Rota sem equipamento cadastrado." });
      continue;
    }
    if (equipamento.capacidadeL <= 0) {
      problemas.push({ severidade: "erro", entidade: rota.codigo, campo: "capacidade", mensagem: "Capacidade desconhecida para o equipamento da rota." });
    }
    if (!isCompativel(rota.sufixoTipo, equipamento.id)) {
      problemas.push({ severidade: "alerta", entidade: rota.codigo, campo: "equipamento", mensagem: `Equipamento ${equipamento.nome} incompatível com o sufixo ${rota.sufixoTipo}.` });
    }
    if (rota.km <= 0) {
      problemas.push({ severidade: "erro", entidade: rota.codigo, campo: "km", mensagem: "Rota sem km." });
    }
    if (!HORA_RE.test(rota.inicioRota) || !HORA_RE.test(rota.chegadaBase)) {
      problemas.push({ severidade: "alerta", entidade: rota.codigo, campo: "horario", mensagem: "Horário inválido — jornada não calculada." });
    }
    if (rota.volumeL > equipamento.capacidadeL) {
      problemas.push({ severidade: "alerta", entidade: rota.codigo, campo: "capacidade", mensagem: "Volume real acima da capacidade do equipamento." });
    }
    if (!produtores.some((p) => p.rotaCodigo === rota.codigo)) {
      problemas.push({ severidade: "alerta", entidade: rota.codigo, campo: "produtores", mensagem: "Rota sem produtores vinculados." });
    }
  }
  for (const p of produtores) {
    if (p.volumeL <= 0) {
      problemas.push({ severidade: "alerta", entidade: p.codigo, campo: "volume", mensagem: "Produtor sem volume." });
    }
  }
  return problemas;
}
