import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { agregarRotas } from "@/lib/calculations/regionalAggregation";
import { simularRota } from "@/lib/calculations/simulation";
import { formatarHoras } from "@/lib/calculations/routeJourney";
import { densidadeFmt, km as fmtKm, litros, reais, reaisLitro, variacao } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Operacionais | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Consolidado da unidade, plano de ação das simulações aplicadas e exportação da malha em CSV.",
      },
      { property: "og:title", content: "Relatórios Operacionais | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Consolide resultados e exporte a malha de rotas para compartilhar a decisão.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const linhas = useLinhasRota();
  const { simulacoes, unidades, unidadeAtivaId } = useDados();
  const unidade = unidades.find((u) => u.id === unidadeAtivaId);

  const total = agregarRotas(linhas.map((l) => l.rota));
  const criticas = linhas.filter((l) => l.status === "critico");

  const aplicadas = useMemo(() => {
    return simulacoes
      .filter((s) => s.aplicado)
      .flatMap((s) => {
        const linha = linhas.find((l) => l.rota.codigo === s.rotaCodigo);
        if (!linha) return [];
        const r = simularRota(linha.rota, {
          aumentoVolumeL: s.aumentoVolumeL,
          aumentoKm: s.aumentoKm,
          equipamentoIdSimulado: s.equipamentoIdSimulado,
        });
        return r ? [{ s, r }] : [];
      });
  }, [simulacoes, linhas]);

  const ganhoCustoLitro = aplicadas.length
    ? aplicadas.reduce((acc, a) => acc + (a.r.simulado.custoLitro - a.r.atual.custoLitro), 0) /
      aplicadas.length
    : 0;

  function exportarCsv() {
    const cab = [
      "rota",
      "sufixo",
      "regiao",
      "ciclo",
      "veiculo",
      "equipamento",
      "volume_l",
      "km",
      "custo_rs",
      "rs_por_litro",
      "densidade_l_km",
      "ocupacao",
      "jornada_h",
      "situacao",
    ];
    const linhasCsv = linhas.map((l) =>
      [
        l.rota.codigo,
        l.rota.sufixoTipo,
        l.rota.regiao,
        l.rota.ciclo,
        l.rota.veiculo,
        l.equipamento.nome,
        Math.round(l.ind.volumeL),
        l.ind.km,
        l.ind.custo.toFixed(2),
        l.ind.custoLitro.toFixed(4),
        l.ind.densidade.toFixed(2),
        (l.ind.ocupacao * 100).toFixed(1),
        l.jornada.horas.toFixed(2),
        l.status,
      ].join(";"),
    );
    const blob = new Blob(["\ufeff" + [cab.join(";"), ...linhasCsv].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `malha-rotas-${unidadeAtivaId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        titulo="Relatórios Operacionais"
        descricao={`Consolidado da unidade ${unidade ? `${unidade.id} — ${unidade.nome}` : unidadeAtivaId}, com o que já foi decidido e o que ainda precisa de ação.`}
        acoes={
          <button
            type="button"
            onClick={exportarCsv}
            className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Exportar malha (CSV)
          </button>
        }
      />

      <KpiGrid>
        <Kpi rotulo="Rotas" valor={String(total.rotas)} />
        <Kpi rotulo="Volume" valor={litros(total.volumeL)} />
        <Kpi rotulo="Km" valor={fmtKm(total.km)} />
        <Kpi rotulo="Custo" valor={reais(total.custo)} />
        <Kpi rotulo="R$/L da unidade" valor={reaisLitro(total.custoLitro)} tom="primario" />
        <Kpi rotulo="Densidade" valor={densidadeFmt(total.densidade)} />
        <Kpi
          rotulo="Rotas críticas"
          valor={String(criticas.length)}
          tom={criticas.length ? "critico" : "neutro"}
        />
        <Kpi
          rotulo="Simulações aplicadas"
          valor={String(aplicadas.length)}
          detalhe={
            aplicadas.length ? `Média R$/L ${reaisLitro(Math.abs(ganhoCustoLitro))}` : "Nenhuma"
          }
        />
      </KpiGrid>

      <section className="mt-10">
        <SectionTitle hint="marcadas como aplicadas no simulador">Plano de ação</SectionTitle>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-sm font-medium text-muted-foreground">
                <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                <th className="px-3 py-3 text-left">Ação</th>
                <th className="px-3 py-3 text-right">R$/L atual</th>
                <th className="px-3 py-3 text-right">R$/L simulado</th>
                <th className="py-3 pl-3 pr-4 text-right">Variação</th>
              </tr>
            </thead>
            <tbody>
              {aplicadas.map(({ s, r }) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-3 pl-4 pr-3 text-sm">{s.rotaCodigo}</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {s.aumentoVolumeL > 0 ? `+${litros(s.aumentoVolumeL)} ` : ""}
                    {s.aumentoKm > 0 ? `+${s.aumentoKm} km ` : ""}
                    {r.equipamentoSimulado.id !== r.equipamentoAtual.id
                      ? `· ${r.equipamentoAtual.nome} → ${r.equipamentoSimulado.nome}`
                      : ""}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular">
                    {reaisLitro(r.atual.custoLitro)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular">
                    {reaisLitro(r.simulado.custoLitro)}
                  </td>
                  <td
                    className={`py-3 pl-3 pr-4 text-right text-sm tabular ${
                      r.comparacao.custoLitro.favoravel ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {variacao(r.comparacao.custoLitro.variacaoPercentual)}
                  </td>
                </tr>
              ))}
              {aplicadas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma simulação marcada como aplicada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle hint="exigem decisão imediata">Exceções abertas</SectionTitle>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-sm font-medium text-muted-foreground">
                <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                <th className="px-3 py-3 text-left">Região</th>
                <th className="px-3 py-3 text-left">Motivo</th>
                <th className="px-3 py-3 text-right">Jornada</th>
                <th className="py-3 pl-3 pr-4 text-right">R$/L</th>
              </tr>
            </thead>
            <tbody>
              {criticas.map((l) => (
                <tr key={l.rota.codigo} className="border-t border-border">
                  <td className="py-3 pl-4 pr-3 text-sm">{l.rota.codigo}</td>
                  <td className="px-3 py-3 text-sm">{l.rota.regiao}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {l.jornada.critica ? <Tag tom="critico">Jornada &gt; 13h</Tag> : null}
                      {l.ind.ocupacao > 1 ? <Tag tom="critico">Capacidade excedida</Tag> : null}
                      {!l.compativel ? <Tag tom="critico">Equipamento incompatível</Tag> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular">
                    {formatarHoras(l.jornada.horas)}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right text-sm tabular">
                    {reaisLitro(l.ind.custoLitro)}
                  </td>
                </tr>
              ))}
              {criticas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma exceção crítica na unidade.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
