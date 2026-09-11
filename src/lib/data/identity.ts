import type { Produtor, RotaOperacional } from "../domain/types.ts";

/** Identidade operacional: o mesmo código pode existir nos ciclos par e ímpar. */
export function chaveRota(rota: Pick<RotaOperacional, "unidadeId" | "codigo" | "ciclo">): string {
  return `${rota.unidadeId}|${rota.codigo}|${rota.ciclo}`;
}

export function identificadorRotaUrl(rota: Pick<RotaOperacional, "codigo" | "ciclo">): string {
  return `${rota.codigo}--${rota.ciclo}`;
}

export function encontrarRotaPorIdentificador(
  rotas: RotaOperacional[],
  identificador: string,
): RotaOperacional | undefined {
  const match = /^(.*)--(par|impar)$/.exec(identificador);
  if (!match) return rotas.find((rota) => rota.codigo === identificador);
  return rotas.find((rota) => rota.codigo === match[1] && rota.ciclo === match[2]);
}

export function chaveProdutorRota(
  produtor: Pick<Produtor, "codigo" | "rotaCodigo" | "unidadeId" | "ciclo">,
): string {
  return `${produtor.unidadeId ?? "sem-unidade"}|${produtor.codigo}|${produtor.rotaCodigo}|${produtor.ciclo ?? "sem-ciclo"}`;
}
