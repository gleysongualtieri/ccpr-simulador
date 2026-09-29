import type { OrigemDado, Produtor, ProblemaQualidade, RotaOperacional } from "../domain/types.ts";
import {
  CAPACIDADE_MAXIMA_REBOQUE_L,
  CAPACIDADES_REBOQUE_INICIAIS_L,
  equipamentoPorSigla,
  decodificarVeiculo,
  getEquipamento,
} from "../calculations/equipment.ts";
import { extrairSufixo, isCompativel } from "../calculations/compatibility.ts";
import { chaveRota } from "./identity.ts";

/**
 * Leitura, validação e transformação dos arquivos exportados do Axiodis
 * (Route_now e Produtores_Rotas) — PRD RF01/RF10, seções 39/40/41.
 * Nada é persistido aqui: a persistência só ocorre após confirmação do usuário.
 */

export type TipoArquivo = "route_now" | "produtores_rotas";
export const LIMITE_REGISTROS_POR_ARQUIVO = 20_000;

/** Identifica o arquivo pelo cabeçalho, sem depender do nome escolhido pelo usuário. */
export function identificarTipoArquivo(texto: string): TipoArquivo | null {
  const primeiraLinha = limparTexto(texto)
    .slice(0, 50_000)
    .split("\n")
    .find((linha) => linha.trim().length > 0);
  const cabecalho = primeiraLinha
    ? parseLinhaCsv(primeiraLinha, detectarDelimitador(primeiraLinha))
    : undefined;
  if (!cabecalho) return null;
  const tem = (...nomes: string[]) => indice(cabecalho, ...nomes) >= 0;
  if (tem("rota") && tem("atividade", "atividde") && tem("matricula") && tem("km etapa")) {
    return "route_now";
  }
  if (tem("codigo") && tem("rota") && tem("volume/coleta", "volume coleta")) {
    return "produtores_rotas";
  }
  return null;
}

/** Decodifica o buffer de um arquivo CSV/TXT, assumindo UTF-8 e caindo
 *  para ISO-8859-1 quando houver caracteres de substituição (arquivos
 *  do Axiodis geralmente vêm em Windows-1252/ISO-8859-1). */
export function decodeTextoDoArquivo(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
  return utf8;
}

/** Remove BOM e quebras de linha DOS. */
function limparTexto(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/** Escolhe o delimitador mais provável olhando as primeiras linhas. */
function detectarDelimitador(texto: string): string {
  const amostra = texto.slice(0, 50_000).split("\n").slice(0, 5).join("\n");
  const contadores = [
    { d: ";", n: (amostra.match(/;/g) ?? []).length },
    { d: ",", n: (amostra.match(/,/g) ?? []).length },
    { d: "\t", n: (amostra.match(/\t/g) ?? []).length },
    { d: "|", n: (amostra.match(/\|/g) ?? []).length },
  ];
  contadores.sort((a, b) => b.n - a.n);
  return contadores[0]!.n > 0 ? contadores[0]!.d : ";";
}

/** Parser CSV simples e tolerante: respeita campos entre aspas e
 *  remove aspas externas. Não explode quando o delimitador aparece
 *  dentro de um campo entre aspas. */
function parseLinhaCsv(linha: string, delimitador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]!;
    if (ch === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (ch === delimitador && !dentroAspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += ch;
    }
  }
  campos.push(atual.trim());
  return campos.map((c) => c.replace(/^"|"$/g, ""));
}

export function parseDelimitado(texto: string): string[][] {
  const limpo = limparTexto(texto);
  const linhas = limpo.split("\n").filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return [];
  const delimitador = detectarDelimitador(limpo);
  return linhas.map((l) => parseLinhaCsv(l, delimitador));
}

function excedeLimiteDeRegistros(texto: string): boolean {
  let linhasComConteudo = 0;
  for (const linha of limparTexto(texto).split("\n")) {
    if (!linha.trim()) continue;
    linhasComConteudo += 1;
    if (linhasComConteudo > LIMITE_REGISTROS_POR_ARQUIVO + 1) return true;
  }
  return false;
}

function problemaLimiteDeRegistros(arquivo: string): PreviaImportacao {
  return {
    rotas: [],
    produtores: [],
    problemas: [
      {
        severidade: "erro",
        entidade: arquivo,
        campo: "arquivo",
        mensagem: `Arquivo acima do limite de ${LIMITE_REGISTROS_POR_ARQUIVO.toLocaleString("pt-BR")} registros.`,
      },
    ],
    linhasLidas: 0,
  };
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function indice(cabecalho: string[], ...nomes: string[]): number {
  const normal = cabecalho.map((c) => normalizar(c));
  for (const nome of nomes) {
    const alvo = normalizar(nome);
    const i = normal.indexOf(alvo);
    if (i >= 0) return i;
  }
  return -1;
}

function numero(valor: string | undefined): number {
  if (!valor) return NaN;
  const limpo = valor
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return limpo === "" ? NaN : Number(limpo);
}

const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export interface PreviaImportacao {
  rotas: RotaOperacional[];
  produtores: Produtor[];
  problemas: ProblemaQualidade[];
  linhasLidas: number;
  rotasIgnoradas?: IdentidadeRota[];
}

type IdentidadeRota = Pick<RotaOperacional, "unidadeId" | "codigo" | "ciclo">;

const ATIVIDADES_CONHECIDAS = [
  "coleta",
  "descarrega",
  "saida",
  "regresso",
  "balanza",
  "pausa",
  "transvaso",
  "desengate",
  "engate",
  "espera",
  "descanso",
  "trocadem",
];

/** Aliases de atividade encontrados nas exportações (Serviço = Balanza). */
const MAPEAMENTO_ATIVIDADES: Record<string, string> = {
  balanca: "balanza",
  servico: "balanza",
  descarregamento: "descarrega",
};

interface EventoBruto {
  atividade: string;
  atividadeBruta: string;
  veiculo: string;
  km: number;
  volume: number;
  data: Date | null;
  hora: string;
  unidade: string;
  regiao: string;
}

/** Interpreta datas do Axiodis, inclusive o formato dd/mm hh:mm sem ano. */
function parseDataHora(valor: string | undefined, anoReferencia: number): Date | null {
  if (!valor) return null;
  const t = valor.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{2,4})[ T]?(\d{2})?:?(\d{2})?/.exec(t);
  if (br) {
    const ano = Number(br[3]!.length === 2 ? `20${br[3]}` : br[3]);
    return criarDataValida(
      ano,
      Number(br[2]),
      Number(br[1]),
      Number(br[4] ?? 0),
      Number(br[5] ?? 0),
    );
  }
  const brSemAno = /^(\d{2})\/(\d{2})[ T](\d{2}):?(\d{2})/.exec(t);
  if (brSemAno) {
    return criarDataValida(
      anoReferencia,
      Number(brSemAno[2]),
      Number(brSemAno[1]),
      Number(brSemAno[3]),
      Number(brSemAno[4]),
    );
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function criarDataValida(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
): Date | null {
  const data = new Date(ano, mes - 1, dia, hora, minuto);
  return data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia &&
    data.getHours() === hora &&
    data.getMinutes() === minuto
    ? data
    : null;
}

function horaDe(d: Date | null): string {
  if (!d) return "00:00";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function numeroOuZero(valor: string | undefined): number {
  const n = numero(valor);
  return Number.isFinite(n) ? n : 0;
}

function maisFrequente(valores: string[]): { valor: string; distintos: number } {
  const contagem = new Map<string, number>();
  for (const v of valores) if (v) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  return { valor: ordenado[0]?.[0] ?? "", distintos: contagem.size };
}

export function importarRouteNow(
  texto: string,
  arquivo: string,
  unidadeIdPadrao: string,
  anoReferencia = new Date().getFullYear(),
): PreviaImportacao {
  if (excedeLimiteDeRegistros(texto)) return problemaLimiteDeRegistros(arquivo);
  const linhas = parseDelimitado(texto);
  const problemas: ProblemaQualidade[] = [];
  const rotas: RotaOperacional[] = [];
  const rotasIgnoradas: IdentidadeRota[] = [];
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
  const iAtividade = indice(cab, "atividade", "atividde", "evento", "activity");
  const iVeiculo = indice(cab, "veiculo", "vehicle", "codigo_veiculo");
  const iVolume = indice(cab, "volume", "volume_l", "litros");
  const iKm = indice(cab, "km etapa", "kmetapa", "km", "distancia", "km_total");
  const iDataHora = indice(cab, "dt/hr coleta", "dthrcoleta", "data_hora", "datahora", "dt/hr");
  const iUnidade = indice(cab, "unidade", "filial");
  const iRegiao = indice(cab, "regiao", "linha");

  const colunasObrigatorias = [
    [iRota, "Rota"],
    [iAtividade, "Atividde"],
    [iVeiculo, "Veículo"],
    [iVolume, "Volume"],
    [iKm, "Km etapa"],
    [iDataHora, "Dt/Hr coleta"],
  ] as const;
  const ausentes = colunasObrigatorias.filter(([posicao]) => posicao < 0).map(([, nome]) => nome);
  if (ausentes.length > 0) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "cabecalho",
      mensagem: `Coluna(s) obrigatória(s) ausente(s): ${ausentes.join(", ")}.`,
    });
    return { rotas, produtores: [], problemas, linhasLidas: linhas.length - 1 };
  }

  const origem: OrigemDado = {
    arquivo,
    importadoEm: new Date().toISOString(),
    mock: false,
  };

  // O mesmo código pode existir em unidades diferentes no mesmo arquivo.
  const grupos = new Map<string, { codigo: string; eventos: EventoBruto[] }>();
  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]!;
    const codigo = (l[iRota] ?? "").trim().toUpperCase();
    if (!codigo) continue;
    const atividadeBruta = (l[iAtividade] ?? "").trim();
    const atividade =
      MAPEAMENTO_ATIVIDADES[normalizar(atividadeBruta)] ?? normalizar(atividadeBruta);
    const data = parseDataHora(l[iDataHora], anoReferencia);
    const evento: EventoBruto = {
      atividade,
      atividadeBruta,
      veiculo: (l[iVeiculo] ?? "").trim().toUpperCase(),
      km: numero(l[iKm]),
      volume: numeroOuZero(l[iVolume]),
      data,
      hora: horaDe(data),
      unidade: (l[iUnidade] ?? "").trim(),
      regiao: (l[iRegiao] ?? "").trim(),
    };
    if (atividadeBruta && !ATIVIDADES_CONHECIDAS.includes(evento.atividade)) {
      problemas.push({
        severidade: "alerta",
        entidade: codigo,
        campo: "atividade",
        mensagem: `Atividade não reconhecida "${atividadeBruta}" — evento mantido para revisão.`,
      });
    }
    const unidade = evento.unidade || decodificarVeiculo(evento.veiculo).unidade || unidadeIdPadrao;
    const chave = `${unidade}|${codigo}`;
    const grupo = grupos.get(chave) ?? { codigo, eventos: [] };
    grupo.eventos.push(evento);
    grupos.set(chave, grupo);
  }

  for (const { codigo, eventos: eventosBrutos } of grupos.values()) {
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

    // 1. Ordenar por Dt/Hr coleta
    const eventos = [...eventosBrutos].sort(
      (a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0),
    );

    // 2. Quebrar em execuções a cada "Saída"
    const execucoes: EventoBruto[][] = [];
    for (const ev of eventos) {
      if (ev.atividade === "saida" || execucoes.length === 0) {
        if (ev.atividade === "saida" || execucoes.length === 0) execucoes.push([]);
      }
      execucoes[execucoes.length - 1]!.push(ev);
    }

    for (const execucao of execucoes) {
      if (execucao.length === 0) continue;

      // 3. Derivações
      const saida = execucao.find((e) => e.atividade === "saida");
      const veiculosDistintos = maisFrequente(execucao.map((e) => e.veiculo));
      const veiculo = saida?.veiculo || veiculosDistintos.valor;
      if (veiculosDistintos.distintos > 1) {
        problemas.push({
          severidade: "alerta",
          entidade: codigo,
          campo: "veiculo",
          mensagem: "Veículo divergente entre eventos da rota.",
        });
      }

      // No RouteNow, "Km etapa" é a distância acumulada desde a saída.
      // O maior valor da execução coincide com "Distância Total" do Produtores_Rotas.
      const km = Math.max(0, ...execucao.map((e) => (Number.isFinite(e.km) ? e.km : 0)));
      const volumeL =
        Math.round(
          execucao.filter((e) => e.atividade === "coleta").reduce((s, e) => s + e.volume, 0) * 1000,
        ) / 1000;

      const comData = execucao.filter((e) => e.data);
      const primeiro = comData[0] ?? execucao[0]!;

      const eventoInicio = saida ?? primeiro;
      const dataExecucao = eventoInicio.data;
      if (!dataExecucao) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "data_hora",
          mensagem: "Data/hora inválida. Confira o ano de referência e o arquivo RouteNow.",
        });
        continue;
      }
      const ciclo: "par" | "impar" = dataExecucao.getDate() % 2 === 0 ? "par" : "impar";
      const decodificado = decodificarVeiculo(veiculo);
      const unidadeId = (
        execucao.find((e) => e.unidade)?.unidade ||
        decodificado.unidade ||
        unidadeIdPadrao
      ).trim();

      // Entrada administrativa de leite de cooperativa: exclusão temporária.
      // Exige zero informado em todos os eventos; ausência/erro de km não vale como zero.
      if (sufixo === "E" && execucao.every((e) => e.km === 0)) {
        rotasIgnoradas.push({ unidadeId, codigo, ciclo });
        continue;
      }
      if (!saida) {
        problemas.push({
          severidade: "alerta",
          entidade: codigo,
          campo: "inicio",
          mensagem: "Execução sem evento Saída.",
        });
      }

      const indiceInicio = execucao.indexOf(eventoInicio);
      const eventosAposInicio = execucao.slice(indiceInicio);
      const balanza = eventosAposInicio.find((e) => e.atividade === "balanza");
      // Pesagem/Serviço têm prioridade. Sem eles, usamos o horário do
      // descarregamento, sem somar novamente as linhas de descarga ao volume.
      const eventoChegada = balanza ?? eventosAposInicio.find((e) => e.atividade === "descarrega");

      if (!eventoChegada) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "balanza",
          mensagem:
            "Execução sem Balanza/Balança, Serviço ou Descarregamento — não é possível calcular a jornada.",
        });
        continue;
      }
      const atividadeFimJornada = balanza
        ? normalizar(balanza.atividadeBruta) === "servico"
          ? "servico"
          : "balanca"
        : "descarregamento";

      const inicioRota = eventoInicio.hora;
      const chegadaBase = eventoChegada.hora;
      if (!eventoChegada.data) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "data_hora",
          mensagem: "Data/hora inválida. Confira o ano de referência e o arquivo RouteNow.",
        });
        continue;
      }
      // 4. Compatibilidade uma vez por execução
      let equipamento = decodificado.sigla ? equipamentoPorSigla(decodificado.sigla) : undefined;
      if (!equipamento) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "veiculo",
          mensagem: `Equipamento desconhecido no código de veículo "${veiculo || "—"}".`,
        });
        continue;
      }

      // Sufixo "R" indica conjunto (caminhão + reboque acoplado). A sigla do veículo
      // continua solteira, então remapeamos para a versão com reboque antes de validar.
      const REMAPEAMENTO_REBOQUE: Record<string, string> = {
        toco: "toco_reboque",
        bitoco: "bitoco_reboque",
        truck: "truck_reboque",
        bitruck: "bitruck_reboque",
      };
      if ((sufixo === "R" || decodificado.comReboque) && equipamento.id in REMAPEAMENTO_REBOQUE) {
        const idReboque = REMAPEAMENTO_REBOQUE[equipamento.id]!;
        const equipamentoRemapeado = getEquipamento(idReboque);
        if (equipamentoRemapeado) equipamento = equipamentoRemapeado;
      }

      if (!isCompativel(sufixo, equipamento.id)) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "equipamento",
          mensagem: `Equipamento ${equipamento.nome} não é compatível com rota de sufixo ${sufixo}.`,
        });
      }

      // 5. Validações bloqueantes
      if (!(volumeL > 0)) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "volume",
          mensagem: "Execução sem volume válido.",
        });
        continue;
      }
      if (!(km > 0)) {
        problemas.push({
          severidade: "erro",
          entidade: codigo,
          campo: "km",
          mensagem: "Execução sem km válido.",
        });
        continue;
      }

      const exigeSelecaoReboque = sufixo === "R" && equipamento.tipo === "reboque";
      const capacidadeNominalL = decodificado.capacidadeNominalL ?? equipamento.capacidadeL;
      const capacidadeReboqueL = decodificado.capacidadeReboqueL ?? undefined;
      const capacidadeRealL = exigeSelecaoReboque
        ? capacidadeReboqueL
          ? capacidadeNominalL + capacidadeReboqueL
          : undefined
        : (decodificado.capacidadeTotalL ?? equipamento.capacidadeL);

      rotas.push({
        codigo,
        sufixoTipo: sufixo,
        unidadeId,
        regiao: execucao.find((e) => e.regiao)?.regiao || "—",
        ciclo,
        veiculo,
        transportadora: decodificado.transportadora,
        equipamentoId: equipamento.id,
        volumeL,
        km,
        inicioRota,
        chegadaBase,
        atividadeFimJornada,
        dataExecucao: dataExecucao ? dataExecucao.toISOString() : undefined,
        origem,
        capacidadeRealL,
        capacidadeNominalL,
        capacidadeReboqueL,
      });
    }
  }

  return { rotas, produtores: [], problemas, rotasIgnoradas, linhasLidas: linhas.length - 1 };
}

export function importarProdutoresRotas(
  texto: string,
  arquivo: string,
  anoReferencia = new Date().getFullYear(),
  rotasIgnoradas: IdentidadeRota[] = [],
): PreviaImportacao {
  if (excedeLimiteDeRegistros(texto)) return problemaLimiteDeRegistros(arquivo);
  const linhas = parseDelimitado(texto);
  const problemas: ProblemaQualidade[] = [];
  const produtores: Produtor[] = [];
  if (linhas.length < 2) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "arquivo",
      mensagem: "Arquivo vazio ou sem linhas de dados.",
    });
    return { rotas: [], produtores, problemas, linhasLidas: 0 };
  }

  const cab = linhas[0]!;
  const iCodigo = indice(cab, "codigo", "codigo_produtor", "produtor");
  const iNome = indice(cab, "nome", "razao_social", "produtor_nome");
  const iVolume = indice(cab, "volume", "volume_l", "litros", "volume/coleta", "volume coleta");
  const iRota = indice(cab, "rota", "codigo_rota");
  const iDataHora = indice(cab, "dt / hr coleta", "dt/hr coleta", "dthrcoleta", "data_hora");
  const iVeiculo = indice(cab, "veiculo", "vehicle", "codigo_veiculo");

  const ausentes = [
    [iCodigo, "Código"],
    [iRota, "Rota"],
    [iVolume, "Volume/coleta"],
    [iDataHora, "Dt / Hr Coleta"],
    [iVeiculo, "Veículo"],
  ] as const;
  const nomesAusentes = ausentes.filter(([posicao]) => posicao < 0).map(([, nome]) => nome);
  if (nomesAusentes.length > 0) {
    problemas.push({
      severidade: "erro",
      entidade: arquivo,
      campo: "cabecalho",
      mensagem: `Coluna(s) obrigatória(s) ausente(s): ${nomesAusentes.join(", ")}.`,
    });
    return { rotas: [], produtores, problemas, linhasLidas: linhas.length - 1 };
  }

  const agrupados = new Map<string, Produtor>();
  const chavesIgnoradas = new Set(rotasIgnoradas.map(chaveRota));
  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]!;
    const dataColeta = parseDataHora(l[iDataHora], anoReferencia);
    const ciclo = dataColeta ? (dataColeta.getDate() % 2 === 0 ? "par" : "impar") : undefined;
    const rotaCodigo = (l[iRota] ?? "").trim().toUpperCase();
    const unidadeId = decodificarVeiculo(l[iVeiculo]).unidade;
    if (
      unidadeId &&
      ciclo &&
      chavesIgnoradas.has(chaveRota({ unidadeId, codigo: rotaCodigo, ciclo }))
    )
      continue;

    const codigo = (l[iCodigo] ?? "").replace(/\D/g, "");
    if (!codigo) continue;
    if (codigo.length < 9) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "codigo",
        mensagem:
          "Código de produtor inválido — esperado Cooperativa(3) + Linha(3) + Matrícula(3).",
      });
      continue;
    }
    const volumeL = numero(l[iVolume]);
    if (!Number.isFinite(volumeL) || volumeL <= 0) {
      problemas.push({
        severidade: "alerta",
        entidade: codigo,
        campo: "volume",
        mensagem: "Produtor sem volume informado.",
      });
    }

    if (!dataColeta) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "data_hora",
        mensagem: "Data/hora da coleta inválida. Confira o ano de referência.",
      });
      continue;
    }
    if (!rotaCodigo) {
      problemas.push({
        severidade: "erro",
        entidade: codigo,
        campo: "rota",
        mensagem: "Produtor sem código de rota.",
      });
      continue;
    }
    const chave = `${unidadeId}|${codigo}|${rotaCodigo}|${ciclo ?? "sem-ciclo"}`;
    const existente = agrupados.get(chave);
    if (existente) {
      existente.volumeL =
        Math.round((existente.volumeL + (Number.isFinite(volumeL) ? volumeL : 0)) * 1000) / 1000;
      continue;
    }

    // Uma linha representa uma coleta/tanque. Agrupamos por produtor, rota e ciclo,
    // somando os volumes sem inflar a contagem de produtores.
    agrupados.set(chave, {
      codigo,
      nome: (l[iNome] ?? "").trim() || codigo,
      cooperativa: codigo.slice(0, 3),
      linha: codigo.slice(3, 6),
      matricula: codigo.slice(6),
      volumeL: Number.isFinite(volumeL) ? volumeL : 0,
      rotaCodigo,
      unidadeId,
      ciclo,
      dataColeta: dataColeta?.toISOString(),
    });
  }

  produtores.push(...agrupados.values());

  return { rotas: [], produtores, problemas, linhasLidas: linhas.length - 1 };
}

/** RouteNow define as exclusões antes da leitura dos vínculos, em qualquer ordem de seleção. */
export function importarArquivosAxiodis(
  arquivos: { nome: string; texto: string }[],
  unidadeIdPadrao: string,
  anoReferencia = new Date().getFullYear(),
): PreviaImportacao {
  const rotas: RotaOperacional[] = [];
  const produtores: Produtor[] = [];
  const problemas: ProblemaQualidade[] = [];
  const ignoradas = new Map<string, IdentidadeRota>();
  const classificados = arquivos.map((arquivo) => ({
    ...arquivo,
    tipo: identificarTipoArquivo(arquivo.texto),
  }));
  let linhasLidas = 0;

  for (const arquivo of classificados) {
    if (!arquivo.tipo) {
      problemas.push({
        severidade: "erro",
        entidade: arquivo.nome,
        campo: "cabecalho",
        mensagem: "Tipo de arquivo não reconhecido pelo cabeçalho.",
      });
    }
    if (arquivo.tipo !== "route_now") continue;
    const resultado = importarRouteNow(arquivo.texto, arquivo.nome, unidadeIdPadrao, anoReferencia);
    rotas.push(...resultado.rotas);
    problemas.push(...resultado.problemas);
    linhasLidas += resultado.linhasLidas;
    for (const rota of resultado.rotasIgnoradas ?? []) ignoradas.set(chaveRota(rota), rota);
  }

  // Arquivos conflitantes não podem excluir os vínculos de uma rota com percurso.
  for (const rota of rotas) {
    if (!ignoradas.delete(chaveRota(rota))) continue;
    problemas.push({
      severidade: "erro",
      entidade: `${rota.unidadeId} / ${rota.codigo} / ${rota.ciclo}`,
      campo: "km",
      mensagem:
        "Rota E com km zero e com percurso na mesma unidade e ciclo. Revise os arquivos selecionados.",
    });
  }
  const rotasIgnoradas = [...ignoradas.values()];
  for (const rota of rotasIgnoradas) {
    problemas.push({
      severidade: "alerta",
      entidade: `${rota.unidadeId} / ${rota.codigo} / ${rota.ciclo}`,
      campo: "rota ignorada",
      mensagem:
        "Rota E com 0 km ignorada temporariamente (entrada de leite de cooperativa). Seus volumes e vínculos de produtores ficam fora da análise.",
    });
  }
  for (const arquivo of classificados) {
    if (arquivo.tipo !== "produtores_rotas") continue;
    const resultado = importarProdutoresRotas(
      arquivo.texto,
      arquivo.nome,
      anoReferencia,
      rotasIgnoradas,
    );
    produtores.push(...resultado.produtores);
    problemas.push(...resultado.problemas);
    linhasLidas += resultado.linhasLidas;
  }
  for (const [tipo, nome] of [
    ["route_now", "RouteNow"],
    ["produtores_rotas", "Produtores_Rotas"],
  ] as const) {
    if (classificados.some((arquivo) => arquivo.tipo === tipo)) continue;
    problemas.push({
      severidade: "erro",
      entidade: "Importação",
      campo: "arquivo",
      mensagem: `Selecione pelo menos um arquivo ${nome}.`,
    });
  }
  return { rotas, produtores, problemas, rotasIgnoradas, linhasLidas };
}

/** Aplica a região (linha do produtor) sobre as rotas importadas — RF10. */
export function aplicarRegiaoDosProdutores(
  rotas: RotaOperacional[],
  produtores: Produtor[],
): RotaOperacional[] {
  return rotas.map((rota) => {
    const doGrupo = produtores.filter(
      (p) =>
        p.rotaCodigo === rota.codigo &&
        (!p.unidadeId || p.unidadeId === rota.unidadeId) &&
        (!p.ciclo || p.ciclo === rota.ciclo),
    );
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
  const chavesRotas = new Set<string>();
  for (const rota of rotas) {
    const chaveRota = `${rota.unidadeId}|${rota.codigo}|${rota.ciclo}`;
    if (chavesRotas.has(chaveRota)) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "duplicidade",
        mensagem: `Rota duplicada no ciclo ${rota.ciclo}.`,
      });
    }
    chavesRotas.add(chaveRota);
    const equipamento = getEquipamento(rota.equipamentoId);
    if (!equipamento) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "equipamento",
        mensagem: "Rota sem equipamento cadastrado.",
      });
      continue;
    }
    if (equipamento.capacidadeL <= 0) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "capacidade",
        mensagem: "Capacidade desconhecida para o equipamento da rota.",
      });
    }
    if (!isCompativel(rota.sufixoTipo, equipamento.id)) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "equipamento",
        mensagem: `Equipamento ${equipamento.nome} incompatível com o sufixo ${rota.sufixoTipo}.`,
      });
    }
    if (rota.km <= 0) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "km",
        mensagem: "Rota sem km.",
      });
    }
    if (!HORA_RE.test(rota.inicioRota) || !HORA_RE.test(rota.chegadaBase)) {
      problemas.push({
        severidade: "alerta",
        entidade: rota.codigo,
        campo: "horario",
        mensagem: "Horário inválido — jornada não calculada.",
      });
    }
    if (rota.sufixoTipo === "R" && equipamento.tipo === "reboque" && !rota.capacidadeReboqueL) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "reboque",
        mensagem: "Informe a capacidade do reboque desta rota R.",
      });
    }
    if (
      rota.capacidadeReboqueL !== undefined &&
      (!Number.isFinite(rota.capacidadeReboqueL) ||
        rota.capacidadeReboqueL <= 0 ||
        rota.capacidadeReboqueL > CAPACIDADE_MAXIMA_REBOQUE_L)
    ) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "reboque",
        mensagem: `A capacidade do reboque deve estar entre 1 e ${CAPACIDADE_MAXIMA_REBOQUE_L.toLocaleString("pt-BR")} L.`,
      });
    } else if (
      rota.capacidadeReboqueL !== undefined &&
      !(CAPACIDADES_REBOQUE_INICIAIS_L as readonly number[]).includes(rota.capacidadeReboqueL)
    ) {
      problemas.push({
        severidade: "alerta",
        entidade: rota.codigo,
        campo: "reboque",
        mensagem:
          "Capacidade de reboque fora das opções atuais. Confirme se existe tarifa oficial correspondente.",
      });
    }
    const capacidadeRealL = rota.capacidadeRealL;
    if (
      rota.capacidadeVeiculoInformadaL !== undefined &&
      (!Number.isFinite(rota.capacidadeVeiculoInformadaL) ||
        rota.capacidadeVeiculoInformadaL <= 0 ||
        rota.capacidadeVeiculoInformadaL > 100_000)
    ) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "capacidade",
        mensagem: "Informe uma capacidade válida do veículo sem reboque entre 1 e 100.000 L.",
      });
    }
    if (capacidadeRealL && rota.volumeL > capacidadeRealL) {
      problemas.push({
        severidade: "erro",
        entidade: rota.codigo,
        campo: "capacidade",
        mensagem: `Volume acima da capacidade total em ${Math.round(rota.volumeL - capacidadeRealL)} L.`,
      });
    }
    if (
      !produtores.some(
        (p) =>
          p.rotaCodigo === rota.codigo &&
          (!p.unidadeId || p.unidadeId === rota.unidadeId) &&
          (!p.ciclo || p.ciclo === rota.ciclo),
      )
    ) {
      problemas.push({
        severidade: "alerta",
        entidade: rota.codigo,
        campo: "produtores",
        mensagem: "Rota sem produtores vinculados.",
      });
    } else {
      const volumeProdutores = produtores
        .filter(
          (p) =>
            p.rotaCodigo === rota.codigo &&
            (!p.unidadeId || p.unidadeId === rota.unidadeId) &&
            (!p.ciclo || p.ciclo === rota.ciclo),
        )
        .reduce((soma, p) => soma + p.volumeL, 0);
      const toleranciaL = Math.max(5, rota.volumeL * 0.001);
      if (Math.abs(volumeProdutores - rota.volumeL) > toleranciaL) {
        problemas.push({
          severidade: "erro",
          entidade: rota.codigo,
          campo: "volume",
          mensagem: `Volume do RouteNow difere do Produtores_Rotas em ${Math.round(Math.abs(volumeProdutores - rota.volumeL))} L.`,
        });
      }
    }
  }
  for (const p of produtores) {
    if (p.volumeL <= 0) {
      problemas.push({
        severidade: "alerta",
        entidade: p.codigo,
        campo: "volume",
        mensagem: "Produtor sem volume.",
      });
    }
    if (
      !rotas.some(
        (r) =>
          r.codigo === p.rotaCodigo &&
          (!p.unidadeId || r.unidadeId === p.unidadeId) &&
          (!p.ciclo || r.ciclo === p.ciclo),
      )
    ) {
      problemas.push({
        severidade: "erro",
        entidade: p.codigo,
        campo: "rota",
        mensagem: `Rota ${p.rotaCodigo} do produtor não existe no RouteNow para o mesmo ciclo.`,
      });
    }
  }
  return problemas;
}
