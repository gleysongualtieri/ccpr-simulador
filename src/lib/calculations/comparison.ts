import type { IndicadoresRota } from "./routeCost";

/** Comparação antes × depois (PRD 6.1, seção 28 do Prompt Mestre). */

export interface Delta {
  atual: number;
  simulado: number;
  variacaoAbsoluta: number;
  /** Variação percentual (0.1 = +10%) */
  variacaoPercentual: number;
  /** true quando a variação é boa operacionalmente */
  favoravel: boolean;
}

function delta(atual: number, simulado: number, menorEhMelhor: boolean): Delta {
  const variacaoAbsoluta = simulado - atual;
  const variacaoPercentual = atual !== 0 ? variacaoAbsoluta / atual : 0;
  const favoravel = menorEhMelhor ? variacaoAbsoluta < 0 : variacaoAbsoluta > 0;
  return { atual, simulado, variacaoAbsoluta, variacaoPercentual, favoravel };
}

export interface Comparacao {
  volumeL: Delta;
  km: Delta;
  custo: Delta;
  custoLitro: Delta;
  densidade: Delta;
  ocupacao: Delta;
}

export function compararIndicadores(
  atual: IndicadoresRota,
  simulado: IndicadoresRota,
): Comparacao {
  return {
    volumeL: delta(atual.volumeL, simulado.volumeL, false),
    km: delta(atual.km, simulado.km, true),
    custo: delta(atual.custo, simulado.custo, true),
    custoLitro: delta(atual.custoLitro, simulado.custoLitro, true),
    densidade: delta(atual.densidade, simulado.densidade, false),
    ocupacao: delta(atual.ocupacao, simulado.ocupacao, false),
  };
}
