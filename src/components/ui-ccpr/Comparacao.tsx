import type { Comparacao, Delta } from "@/lib/calculations/comparison";
import { cn } from "@/lib/utils";
import { densidadeFmt, km, litros, percentual, reais, reaisLitro, variacao } from "@/lib/format";

function Linha({ rotulo, d, fmt }: { rotulo: string; d: Delta; fmt: (v: number) => string }) {
  const neutro = Math.abs(d.variacaoAbsoluta) < 1e-9;
  return (
    <tr className="border-t border-border">
      <td className="py-3 pl-4 pr-3 text-sm text-muted-foreground">{rotulo}</td>
      <td className="px-3 py-3 text-right text-sm tabular text-foreground">{fmt(d.atual)}</td>
      <td className="px-3 py-3 text-right text-sm tabular font-medium text-foreground">
        {fmt(d.simulado)}
      </td>
      <td
        className={cn(
          "py-3 pl-3 pr-4 text-right text-sm tabular",
          neutro ? "text-muted-foreground" : d.favoravel ? "text-primary" : "text-destructive",
        )}
      >
        {neutro ? "—" : variacao(d.variacaoPercentual)}
      </td>
    </tr>
  );
}

export function TabelaComparacao({ c }: { c: Comparacao }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="bg-surface">
            <th className="py-3 pl-4 pr-3 text-left text-sm font-medium text-muted-foreground">
              Indicador
            </th>
            <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">
              Atual
            </th>
            <th className="px-3 py-3 text-right text-sm font-medium text-primary">Simulado</th>
            <th className="py-3 pl-3 pr-4 text-right text-sm font-medium text-muted-foreground">
              Variação
            </th>
          </tr>
        </thead>
        <tbody>
          <Linha rotulo="Volume" d={c.volumeL} fmt={litros} />
          <Linha rotulo="Km" d={c.km} fmt={km} />
          <Linha rotulo="Custo" d={c.custo} fmt={reais} />
          <Linha rotulo="R$/L" d={c.custoLitro} fmt={reaisLitro} />
          <Linha rotulo="Densidade" d={c.densidade} fmt={densidadeFmt} />
          <Linha rotulo="Ocupação" d={c.ocupacao} fmt={(v) => percentual(v)} />
        </tbody>
      </table>
    </div>
  );
}
