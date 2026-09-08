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
  return texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Escolhe o delimitador mais provável olhando as primeiras linhas. */
function detectarDelimitador(texto: string): string {
  const amostra = texto.split("\n").slice(0, 5).join("\n");
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
  servico: "balanza",
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

/** Interpreta "Dt/Hr coleta" em formatos dd/mm/aaaa hh:mm ou ISO. */
function parseDataHora(valor: string | undefined): Date | null {
  if (!valor) return null;
  const t = valor.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{2,4})[ T]?(\d{2})?:?(\d{2})?/.exec(t);
  if (br) {
    const ano = Number(br[3]!.length === 2 ? `20${br[3]}` : br[3]);
    return new Date(ano, Number(br[2]) - 1, Number(br[1]), Number(br[4] ?? 0), Number(br[5] ?? 0));
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const iAtividade = indice(cab, "atividade", "atividde", "evento", "activity");
  const iVeiculo = indice(cab, "veiculo", "vehicle", "codigo_veiculo");
  const iVolume = indice(cab, "volume", "volume_l", "litros");
  const iKm = indice(cab, "km etapa", "kmetapa", "km", "distancia", "km_total");
  const iDataHora = indice(cab, "dt/hr coleta", "dthrcoleta", "data_hora", "datahora", "dt/hr");
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

  // 1. Agrupar eventos por código de rota
  const grupos = new Map<string, EventoBruto[]>();
  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]!;
    const codigo = (l[iRota] ?? "").trim().toUpperCase();
    if (!codigo) continue;
    const atividadeBruta = (l[iAtividade] ?? "").trim();
    const atividade = MAPEAMENTO_ATIVIDADES[normalizar(atividadeBruta)] ?? normalizar(atividadeBruta);
    const data = parseDataHora(l[iDataHora]);
    const evento: EventoBruto = {
      atividade,
      atividadeBruta,
      veiculo: (l[iVeiculo] ?? "").trim().toUpperCase(),
      km: numeroOuZero(l[iKm]),
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
        mensagem: `Atividade não reconhecida "${atividadeBruta}" — valores somados mesmo assim.`,
      });
    }
    const lista = grupos.get(codigo) ?? [];
    lista.push(evento);
    grupos.set(codigo, lista);
  }

  for (const [codigo, eventosBrutos] of grupos) {
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

      const km = execucao.reduce((s, e) => s + e.km, 0);
      const volumeL = execucao.filter((e) => e.atividade === "coleta").reduce((s, e) => s + e.volume, 0);

      const comData = execucao.filter((e) => e.data);
      const primeiro = comData[0] ?? execucao[0]!;
      const ultimo = comData[comData.length - 1] ?? execucao[execucao.length - 1]!;

      const eventoInicio = saida ?? primeiro;
      if (!saida) {
        problemas.push({
          severidade: "alerta",
          entidade: codigo,
          campo: "inicio",
          mensagem: "Execução sem evento Saída.",
        });
      }

      const indiceInicio = execucao.indexOf(eventoInicio);
      const balanza = execucao.slice(indiceInicio).find((e) => e.atividade === "balanza");

      // Fallback: sem Balanza, usar o último evento de Descarrega
      let eventoChegada: EventoBruto;
      if (balanza) {
        eventoChegada = balanza;
      } else {
        const descarregas = execucao.filter((e) => e.atividade === "descarrega");
        if (descarregas.length > 0) {
          eventoChegada = descarregas[descarregas.length - 1]!;
        } else {
          problemas.push({
            severidade: "alerta",
            entidade: codigo,
            campo: "chegada",
            mensagem: "Execução sem evento Balanza nem Descarrega — jornada não calculada.",
          });
          eventoChegada = ultimo;
        }
      }

      const inicioRota = eventoInicio.hora;
      const chegadaBase = eventoChegada.hora;
      const dataExecucao = eventoInicio.data;
      const ciclo: "par" | "impar" =
        dataExecucao && dataExecucao.getDate() % 2 === 0 ? "par" : "impar";

      // 4. Compatibilidade uma vez por execução
      const decodificado = decodificarVeiculo(veiculo);
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
          severidade: "alerta",
          entidade: codigo,
          campo: "equipamento",
          mensagem: `Equipamento ${equipamento.nome} não é compatível com rota de sufixo ${sufixo}.`,
        });
      }

      // 5. Validações bloqueantes
      if (!(volumeL > 0)) {
        problemas.push({ severidade: "erro", entidade: codigo, campo: "volume", mensagem: "Execução sem volume válido." });
        continue;
      }
      if (!(km > 0)) {
        problemas.push({ severidade: "erro", entidade: codigo, campo: "km", mensagem: "Execução sem km válido." });
        continue;
      }

      rotas.push({
        codigo,
        sufixoTipo: sufixo,
        unidadeId:
          (execucao.find((e) => e.unidade)?.unidade || decodificado.unidade || unidadeIdPadrao).trim(),
        regiao: execucao.find((e) => e.regiao)?.regiao || "—",
        ciclo,
        veiculo,
        transportadora: decodificado.transportadora,
        equipamentoId: equipamento.id,
        volumeL,
        km,
        inicioRota,
        chegadaBase,
        dataExecucao: dataExecucao ? dataExecucao.toISOString() : undefined,
        origem,
        capacidadeRealL: decodificado.capacidadeTotalL ?? equipamento.capacidadeL,
        capacidadeNominalL: decodificado.capacidadeNominalL ?? equipamento.capacidadeL,
      });
    }
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
  const iVolume = indice(cab, "volume", "volume_l", "litros", "volume/coleta", "volume coleta");
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
    const capacidadeRealL = rota.capacidadeRealL ?? equipamento.capacidadeL;
    if (rota.volumeL > capacidadeRealL) {
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
