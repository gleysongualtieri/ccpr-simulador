import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { agregarRotas } from "@/lib/calculations/regionalAggregation";
import { DESCRICAO_SUFIXO } from "@/lib/calculations/compatibility";
import { densidadeFmt, km as fmtKm, litros, percentual, reaisLitro } from "@/lib/format";
import { formatarHoras } from "@/lib/calculations/routeJourney";

export const Route = createFileRoute("/roteirizacao")({
  head: () => ({
    meta: [
      { title: "Roteirização Atual | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Malha de rotas real da unidade por região, ciclo e equipamento, com produtores vinculados e rastreabilidade de origem.",
      },
      { property: "og:title", content: "Roteirização Atual | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Consulte a malha real de rotas da unidade com volume, km, equipamento e ciclo.",
      },
    ],
  }),
  component: Roteirizacao,
});

function Roteirizacao() {
  const linhas = useLinhasRota();
  const { produtores } = useDados();
  const [sufixo, setSufixo] = useState("todos");

  const sufixos = useMemo(
    () => [...new Set(linhas.map((l) => l.rota.sufixoTipo))].sort(),
    [linhas],
  );

  const filtradas = useMemo(
    () => linhas.filter((l) => (sufixo === "todos" ? true : l.rota.sufixoTipo === sufixo)),
    [linhas, sufixo],
  );

  const total = agregarRotas(filtradas.map((l) => l.rota));
  const produtoresVinculados = produtores.filter((p) =>
    filtradas.some((l) => l.rota.codigo === p.rotaCodigo),
  ).length;

  return (
    <>
      <PageHeader
        titulo="Roteirização"
        descricao="Malha atual carregada para a unidade selecionada. Cada rota preserva o arquivo de origem e a data de importação."
      />

      <KpiGrid>
        <Kpi rotulo="Rotas" valor={String(total.rotas)} tom="primario" />
        <Kpi rotulo="Produtores vinculados" valor={String(produtoresVinculados)} />
        <Kpi rotulo="Volume" valor={litros(total.volumeL)} />
        <Kpi rotulo="Densidade" valor={densidadeFmt(total.densidade)} />
      </KpiGrid>

      <div className="mt-6 mb-6 flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tipo de rota (sufixo)</span>
          <select
            value={sufixo}
            onChange={(e) => setSufixo(e.target.value)}
            className="h-11 w-80 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="todos">Todos os tipos</option>
            {sufixos.map((s) => (
              <option key={s} value={s}>
                {s} — {DESCRICAO_SUFIXO[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-surface text-sm font-medium text-muted-foreground">
              <th className="py-3 pl-4 pr-3 text-left">Rota</th>
              <th className="px-3 py-3 text-left">Tipo</th>
              <th className="px-3 py-3 text-left">Região</th>
              <th className="px-3 py-3 text-left">Ciclo</th>
              <th className="px-3 py-3 text-left">Veículo</th>
              <th className="px-3 py-3 text-left">Equipamento</th>
              <th className="px-3 py-3 text-right">Volume</th>
              <th className="px-3 py-3 text-right">Km</th>
              <th className="px-3 py-3 text-right">Ocupação</th>
              <th className="px-3 py-3 text-right">R$/L</th>
              <th className="py-3 pl-3 pr-4 text-right">Jornada</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.rota.codigo} className="border-t border-border hover:bg-surface/60">
                <td className="py-3 pl-4 pr-3 text-sm">
                  <Link
                    to="/rota/$codigo"
                    params={{ codigo: l.rota.codigo }}
                    className="text-primary hover:underline"
                  >
                    {l.rota.codigo}
                  </Link>
                </td>
                <td className="px-3 py-3 text-sm">
                  <Tag tom={l.compativel ? "neutro" : "critico"}>{l.rota.sufixoTipo}</Tag>
                </td>
                <td className="px-3 py-3 text-sm">{l.rota.regiao}</td>
                <td className="px-3 py-3 text-sm">{l.rota.ciclo === "par" ? "Par" : "Ímpar"}</td>
                <td className="px-3 py-3 text-sm text-muted-foreground">{l.rota.veiculo}</td>
                <td className="px-3 py-3 text-sm">{l.equipamento.nome}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{litros(l.ind.volumeL)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{fmtKm(l.ind.km)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">
                  {percentual(l.ind.ocupacao)}
                </td>
                <td className="px-3 py-3 text-right text-sm tabular">
                  {reaisLitro(l.ind.custoLitro)}
                </td>
                <td className="py-3 pl-3 pr-4 text-right text-sm tabular">
                  {formatarHoras(l.jornada.horas)}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma rota carregada. Utilize a tela de Importação de Dados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
