import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-ccpr/PageHeader";
import { Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { densidadeFmt, km as fmtKm, litros, reais, reaisLitro } from "@/lib/format";
import { formatarHoras } from "@/lib/calculations/routeJourney";
import { MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de Rotas por Custo | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Ranking das rotas por R$/L com filtros por região e ciclo par/ímpar para identificar rotas críticas.",
      },
      { property: "og:title", content: "Ranking de Rotas por Custo | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Identifique rapidamente as rotas mais caras da unidade por R$/L.",
      },
    ],
  }),
  component: Ranking,
});

const STATUS_LABEL = { normal: "Normal", atencao: "Atenção", critico: "Crítico" } as const;

function Ranking() {
  const linhas = useLinhasRota();
  const [regiao, setRegiao] = useState("todas");
  const [ciclo, setCiclo] = useState<"todos" | "par" | "impar">("todos");
  const [busca, setBusca] = useState("");

  const regioes = useMemo(
    () => [...new Set(linhas.map((l) => l.rota.regiao))].sort(),
    [linhas],
  );

  const filtradas = useMemo(
    () =>
      linhas
        .filter((l) => (regiao === "todas" ? true : l.rota.regiao === regiao))
        .filter((l) => (ciclo === "todos" ? true : l.rota.ciclo === ciclo))
        .filter((l) =>
          busca.trim() ? l.rota.codigo.toLowerCase().includes(busca.trim().toLowerCase()) : true,
        )
        .sort((a, b) => b.ind.custoLitro - a.ind.custoLitro),
    [linhas, regiao, ciclo, busca],
  );

  return (
    <>
      <PageHeader
        titulo="Ranking de Rotas"
        descricao="Rotas ordenadas do maior para o menor custo por litro. Use os filtros para isolar uma região ou um ciclo."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Pesquisa avançada</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o código da rota"
            className="h-11 w-72 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Região</span>
          <select
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            className="h-11 w-48 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="todas">Todas</option>
            {regioes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Ciclo</span>
          <div className="flex h-11 items-center gap-5">
            {(["todos", "par", "impar"] as const).map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ciclo"
                  checked={ciclo === c}
                  onChange={() => setCiclo(c)}
                  className="h-4 w-4 accent-primary"
                />
                {c === "todos" ? "Todos" : c === "par" ? "Dias pares" : "Dias ímpares"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="ml-auto text-sm text-muted-foreground">
          {filtradas.length} rota(s) no filtro
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-surface text-sm font-medium text-muted-foreground">
              <th className="py-3 pl-4 pr-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Rota</th>
              <th className="px-3 py-3 text-left">Região</th>
              <th className="px-3 py-3 text-left">Ciclo</th>
              <th className="px-3 py-3 text-left">Equipamento</th>
              <th className="px-3 py-3 text-right">Volume</th>
              <th className="px-3 py-3 text-right">Km</th>
              <th className="px-3 py-3 text-right">Custo</th>
              <th className="px-3 py-3 text-right">R$/L</th>
              <th className="px-3 py-3 text-right">Densidade</th>
              <th className="px-3 py-3 text-right">Jornada</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="py-3 pl-3 pr-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l, i) => (
              <tr key={l.rota.codigo} className="border-t border-border hover:bg-surface/60">
                <td className="py-3 pl-4 pr-3 text-sm tabular text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 text-sm">
                  <Link
                    to="/rota/$codigo"
                    params={{ codigo: l.rota.codigo }}
                    className="text-primary hover:underline"
                  >
                    {l.rota.codigo}
                  </Link>
                </td>
                <td className="px-3 py-3 text-sm">{l.rota.regiao}</td>
                <td className="px-3 py-3 text-sm">{l.rota.ciclo === "par" ? "Par" : "Ímpar"}</td>
                <td className="px-3 py-3 text-sm">{l.equipamento.nome}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{litros(l.ind.volumeL)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{fmtKm(l.ind.km)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{reais(l.ind.custo)}</td>
                <td className="px-3 py-3 text-right text-sm tabular text-foreground">
                  {reaisLitro(l.ind.custoLitro)}
                </td>
                <td className="px-3 py-3 text-right text-sm tabular">
                  {densidadeFmt(l.ind.densidade)}
                </td>
                <td className="px-3 py-3 text-right text-sm tabular">
                  {formatarHoras(l.jornada.horas)}
                </td>
                <td className="px-3 py-3 text-sm">
                  <Tag
                    tom={
                      l.status === "critico"
                        ? "critico"
                        : l.status === "atencao"
                          ? "atencao"
                          : "neutro"
                    }
                  >
                    {STATUS_LABEL[l.status]}
                  </Tag>
                </td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <Link
                    to="/simulador/$codigo"
                    params={{ codigo: l.rota.codigo }}
                    aria-label={`Simular rota ${l.rota.codigo}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma rota encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
