import { z } from "zod";
import { type EstadoPersistido, estadoPersistido } from "./persistence.ts";

export const LIMITE_PROJETO_BYTES = 8 * 1024 * 1024;
const projetoSchema = z
  .object({
    formato: z.literal("ccpr-projeto"),
    versao: z.union([z.literal(1), z.literal(2)]),
    nome: z.string().trim().min(1).max(120),
    autor: z.string().trim().min(1).max(120),
    salvoEm: z.string().datetime(),
    dados: estadoPersistido.omit({ projetos: true }).required(),
  })
  .strict();

export type DadosProjeto = Required<Omit<EstadoPersistido, "projetos">>;
export type Projeto = Omit<z.infer<typeof projetoSchema>, "dados"> & { dados: DadosProjeto };

function validarProjeto(valor: unknown): Projeto {
  const resultado = projetoSchema.safeParse(valor);
  if (!resultado.success) {
    throw new Error(
      "Projeto inválido, incompleto ou de versão não suportada. Use um arquivo .ccpr gerado pelo simulador.",
    );
  }
  const projeto = resultado.data;
  const ids = new Set(projeto.dados.unidades.map((u) => u.id));
  if (
    ids.size !== projeto.dados.unidades.length ||
    !ids.has(projeto.dados.unidadeAtivaId) ||
    projeto.dados.rotas.some((r) => !ids.has(r.unidadeId)) ||
    projeto.dados.produtores.some((p) => p.unidadeId && !ids.has(p.unidadeId))
  ) {
    throw new Error("O projeto contém referências de unidade inconsistentes.");
  }
  if (
    projeto.versao === 2 &&
    (ids.size !== 1 ||
      projeto.dados.tarifas.some((t) => !ids.has(t.unidadeId)) ||
      projeto.dados.simulacoes.some((s) => !s.unidadeId || !ids.has(s.unidadeId)))
  ) {
    throw new Error("Projeto por unidade contém dados de outra unidade.");
  }
  return projeto as Projeto;
}

export function lerProjeto(texto: string): Projeto {
  if (new TextEncoder().encode(texto).byteLength > LIMITE_PROJETO_BYTES) {
    throw new Error("O projeto excede o limite de 8 MB desta versão.");
  }
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    throw new Error("Não foi possível ler o projeto. O arquivo não é um .ccpr válido.");
  }
  return validarProjeto(valor);
}

export function criarProjeto(dados: DadosProjeto, nome: string, autor: string): Projeto {
  return validarProjeto({
    formato: "ccpr-projeto",
    versao: 1,
    nome,
    autor,
    salvoEm: new Date().toISOString(),
    dados,
  });
}

export function serializarProjeto(projeto: Projeto): string {
  const texto = JSON.stringify(validarProjeto(projeto));
  lerProjeto(texto);
  return texto;
}

export function nomeArquivoProjeto(projeto: Projeto): string {
  const nome =
    projeto.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 80) || "Projeto";
  return `${projeto.dados.unidadeAtivaId}_${nome}_${projeto.salvoEm.replace(/[:.]/g, "-")}.ccpr`;
}

/** Legados só recebem unidade quando a associação é inequívoca. */
export function unidadeDaSimulacao(
  s: DadosProjeto["simulacoes"][number],
  rotas: DadosProjeto["rotas"],
): string | undefined {
  if (s.unidadeId) return s.unidadeId;
  const ids = [
    ...new Set(
      rotas
        .filter((r) => r.codigo === s.rotaCodigo && (!s.rotaCiclo || r.ciclo === s.rotaCiclo))
        .map((r) => r.unidadeId),
    ),
  ];
  return ids.length === 1 ? ids[0] : undefined;
}

export function dadosDaUnidade(dados: DadosProjeto, id: string): DadosProjeto {
  const unidade = dados.unidades.find((u) => u.id === id);
  if (!unidade) throw new Error("Selecione uma unidade existente no projeto.");
  const simulacoes = dados.simulacoes.map((s) => {
    const unidadeId = unidadeDaSimulacao(s, dados.rotas);
    if (!unidadeId)
      throw new Error(
        "Existe uma simulação antiga sem unidade identificável. Não foi possível separar o projeto com segurança.",
      );
    return { ...s, unidadeId };
  });
  const produtores = dados.produtores.map((p) => {
    if (p.unidadeId) return p;
    const ids = [
      ...new Set(
        dados.rotas
          .filter((r) => r.codigo === p.rotaCodigo && (!p.ciclo || r.ciclo === p.ciclo))
          .map((r) => r.unidadeId),
      ),
    ];
    if (ids.length !== 1)
      throw new Error(
        "Existe um produtor sem unidade identificável. Revise a base antes de separar o projeto.",
      );
    return { ...p, unidadeId: ids[0]! };
  });
  return {
    unidades: [unidade],
    unidadeAtivaId: id,
    rotas: dados.rotas.filter((r) => r.unidadeId === id),
    produtores: produtores.filter((p) => p.unidadeId === id),
    simulacoes: simulacoes.filter((s) => s.unidadeId === id),
    tarifas: dados.tarifas.filter((t) => t.unidadeId === id),
    transportadoras: dados.transportadoras,
  };
}

export function criarProjetoUnidade(dados: DadosProjeto, nome: string, autor: string): Projeto {
  return validarProjeto({
    ...criarProjeto(dadosDaUnidade(dados, dados.unidadeAtivaId), nome, autor),
    versao: 2,
  });
}

export function incorporarProjeto(
  atual: DadosProjeto,
  projeto: Projeto,
  unidadeId: string,
): DadosProjeto {
  const recebido = dadosDaUnidade(lerProjeto(serializarProjeto(projeto)).dados, unidadeId);
  const simulacoesAtuais = atual.simulacoes.map((s) => {
    const id = unidadeDaSimulacao(s, atual.rotas);
    if (!id)
      throw new Error(
        "Uma simulação atual tem unidade ambígua. Salve o trabalho atual e revise a base antes de abrir outro projeto.",
      );
    return { ...s, unidadeId: id };
  });
  // Protege outras bases reais; o cadastro inicial da demonstração pode ser atualizado.
  const transportadoras = new Map(atual.transportadoras.map((t) => [t.sigla, t]));
  const outrasRotas = atual.rotas.filter((r) => r.unidadeId !== unidadeId);
  for (const t of recebido.transportadoras) {
    const anterior = transportadoras.get(t.sigla);
    if (outrasRotas.some((r) => !r.origem.mock && r.transportadora === t.sigla)) {
      if (
        !anterior ||
        anterior.ativa !== t.ativa ||
        JSON.stringify([...anterior.cnpjs].sort()) !== JSON.stringify([...t.cnpjs].sort())
      ) {
        throw new Error(
          `O cadastro da transportadora ${t.sigla} conflita com outra unidade carregada. A abertura foi cancelada para preservar seus cálculos.`,
        );
      }
      continue;
    }
    transportadoras.set(t.sigla, t);
  }
  const produtoresAtuais = atual.produtores.map((p) => {
    if (p.unidadeId) return p;
    const ids = [
      ...new Set(
        atual.rotas
          .filter((r) => r.codigo === p.rotaCodigo && (!p.ciclo || r.ciclo === p.ciclo))
          .map((r) => r.unidadeId),
      ),
    ];
    if (ids.length !== 1)
      throw new Error("Um produtor atual tem unidade ambígua. A abertura foi cancelada.");
    return { ...p, unidadeId: ids[0]! };
  });
  const idsMantidos = new Set(
    simulacoesAtuais.filter((s) => s.unidadeId !== unidadeId).map((s) => s.id),
  );
  return {
    unidades: [...atual.unidades.filter((u) => u.id !== unidadeId), ...recebido.unidades],
    unidadeAtivaId: unidadeId,
    rotas: [...outrasRotas, ...recebido.rotas],
    produtores: [
      ...produtoresAtuais.filter((p) => p.unidadeId !== unidadeId),
      ...recebido.produtores,
    ],
    simulacoes: [
      ...simulacoesAtuais.filter((s) => s.unidadeId !== unidadeId),
      ...recebido.simulacoes.map((s) => {
        let id = s.id;
        let sufixo = 1;
        while (idsMantidos.has(id)) id = `importado-${sufixo++}-${s.id.slice(0, 65)}`;
        idsMantidos.add(id);
        return { ...s, id };
      }),
    ],
    tarifas: [...atual.tarifas.filter((t) => t.unidadeId !== unidadeId), ...recebido.tarifas],
    transportadoras: [...transportadoras.values()],
  };
}
