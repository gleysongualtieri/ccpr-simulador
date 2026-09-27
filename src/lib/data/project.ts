import { z } from "zod";
import { type EstadoPersistido, estadoPersistido } from "./persistence.ts";

export const LIMITE_PROJETO_BYTES = 8 * 1024 * 1024;
const projetoSchema = z
  .object({
    formato: z.literal("ccpr-projeto"),
    versao: z.literal(1),
    nome: z.string().trim().min(1).max(120),
    autor: z.string().trim().min(1).max(120),
    salvoEm: z.string().datetime(),
    dados: estadoPersistido.required(),
  })
  .strict();

export type DadosProjeto = Required<EstadoPersistido>;
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
