import type { Comparacao, Delta } from "@/lib/calculations/comparison";
import { cn } from "@/lib/utils";
import { densidadeFmt, km, litros, percentual, reais, reaisLitro, variacao } from "@/lib/format";

function Linha({
  rotulo,
  d,
  fmt,
  neutra,
  ausenciaAtual,
  ausenciaSimulada,
}: {
  rotulo: string;
  d: Delta;
  fmt: (v: number) => string;
  neutra?: boolean;
  ausenciaAtual?: string | undefined;
  ausenciaSimulada?: string | undefined;
}) {
  const indisponivel = Boolean(ausenciaAtual || ausenciaSimulada);
  const neutro = Math.abs(d.variacaoAbsoluta) < 1e-9;
  return (
    <tr className="border-t border-border">
      <td className="py-3 pl-4 pr-3 text-sm text-muted-foreground">{rotulo}</td>
      <td className="px-3 py-3 text-right text-sm tabular text-foreground">
        {ausenciaAtual ?? fmt(d.atual)}
      </td>
      <td className="px-3 py-3 text-right text-sm tabular font-medium text-foreground">
        {ausenciaSimulada ?? fmt(d.simulado)}
      </td>
      <td
        className={cn(
          "py-3 pl-3 pr-4 text-right text-sm tabular",
          indisponivel || neutro || neutra
            ? "text-muted-foreground"
            : d.favoravel
              ? "text-primary"
              : "text-destructive",
        )}
      >
        {indisponivel || neutro ? "—" : variacao(d.variacaoPercentual)}
      </td>
    </tr>
  );
}

export function TabelaComparacao({
  c,
  neutra = false,
  tarifaAtual = true,
  tarifaSimulada = true,
  capacidadeSimulada = true,
}: {
  c: Comparacao;
  neutra?: boolean;
  tarifaAtual?: boolean;
  tarifaSimulada?: boolean;
  capacidadeSimulada?: boolean;
}) {
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
          <Linha neutra={neutra} rotulo="Volume" d={c.volumeL} fmt={litros} />
          <Linha neutra={neutra} rotulo="Km" d={c.km} fmt={km} />
          <Linha
            ausenciaAtual={tarifaAtual ? undefined : "Sem tarifa"}
            ausenciaSimulada={tarifaSimulada ? undefined : "Sem tarifa"}
            neutra={neutra}
            rotulo="Custo"
            d={c.custo}
            fmt={reais}
          />
          <Linha
            ausenciaAtual={tarifaAtual ? undefined : "Sem tarifa"}
            ausenciaSimulada={tarifaSimulada ? undefined : "Sem tarifa"}
            neutra={neutra}
            rotulo="R$/L"
            d={c.custoLitro}
            fmt={reaisLitro}
          />
          <Linha neutra={neutra} rotulo="Densidade" d={c.densidade} fmt={densidadeFmt} />
          <Linha
            ausenciaSimulada={capacidadeSimulada ? undefined : "Capacidade não informada"}
            neutra={neutra}
            rotulo="Ocupação"
            d={c.ocupacao}
            fmt={(v) => percentual(v)}
          />
        </tbody>
      </table>
    </div>
  );
}
