export const nfInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function litros(v: number): string {
  return `${nfInt.format(Math.round(v))} L`;
}

export function km(v: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)} km`;
}

export function reais(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function reaisLitro(v: number): string {
  return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(v)}`;
}

export function densidadeFmt(v: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)} L/km`;
}

export function percentual(v: number, casas = 1): string {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v * 100)}%`;
}

export function variacao(v: number): string {
  const sinal = v > 0 ? "↑ +" : v < 0 ? "↓ " : "";
  return `${sinal}${percentual(v, 2)}`;
}
