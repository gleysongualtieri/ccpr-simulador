import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { agregarRotas, agruparPorRegiao } from "@/lib/calculations/regionalAggregation";
import { densidadeFmt, km as fmtKm, litros, reais, reaisLitro } from "@/lib/format";

export const Route = createFileRoute("/regioes")({
  head: () => ({
    meta: [
      { title: "Análise de Regiões | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Custo consolidado por região da unidade: volume, km, R$/L e densidade, com as rotas que puxam o custo para cima.",
      },
      { property: "og:title", content: "Análise de Regiões | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Compare o custo por litro entre as regiões da malha e ataque as piores primeiro.",
      },
    ],
  }),
  component: Regioes,
});

function Regioes() {
  const linhas = useLinhasRota();

  const regioes = useMemo(() => {
    const grupos = agruparPorRegiao(linhas.map((l) => l.rota));
    return [...grupos.entries()]
      .map(([regiao, rotas]) => ({
        regiao,
        agregado: agregarRotas(rotas),
        linhas: linhas
          .filter((l) => l.rota.regiao === regiao)
          .sort((a, b) => b.ind.custoLitro - a.ind.custoLitro),
      }))
      .sort((a, b) => b.agregado.custoLitro - a.agregado.custoLitro);
  }, [linhas]);

  const total = agregarRotas(linhas.map((l) => l.rota));
  const pior = regioes[0];

  return (
    <>
      <PageHeader
        titulo="Análise de Regiões"
        descricao="Cada região agrupa as rotas pela linha dominante dos produtores. O custo regional é a soma dos custos das rotas sobre a soma dos volumes."
      />

      <KpiGrid>
        <Kpi rotulo="Regiões" valor={String(regioes.length)} />
        <Kpi rotulo="Volume total" valor={litros(total.volumeL)} />
        <Kpi rotulo="Custo total" valor={reais(total.custo)} />
        <Kpi
          rotulo="Pior R$/L regional"
          valor={pior ? reaisLitro(pior.agregado.custoLitro) : "—"}
          detalhe={pior ? `Região ${pior.regiao}` : undefined}
          tom="critico"
        />
      </KpiGrid>

      <div className="mt-10 space-y-8">
        {regioes.map((r) => (
          <section key={r.regiao}>
            <SectionTitle hint={`${r.agregado.rotas} rota(s)`}>Região {r.regiao}</SectionTitle>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="grid grid-cols-2 gap-4 border-b border-border bg-surface px-4 py-3 text-sm md:grid-cols-5">
                <div>
                  <div className="text-xs text-muted-foreground">Volume</div>
                  <div className="tabular">{litros(r.agregado.volumeL)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Km</div>
                  <div className="tabular">{fmtKm(r.agregado.km)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Custo</div>
                  <div className="tabular">{reais(r.agregado.custo)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">R$/L</div>
                  <div className="tabular text-primary">{reaisLitro(r.agregado.custoLitro)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Densidade</div>
                  <div className="tabular">{densidadeFmt(r.agregado.densidade)}</div>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="text-sm font-medium text-muted-foreground">
                    <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                    <th className="px-3 py-3 text-left">Equipamento</th>
                    <th className="px-3 py-3 text-left">Situação</th>
                    <th className="px-3 py-3 text-right">Volume</th>
                    <th className="px-3 py-3 text-right">Km</th>
                    <th className="px-3 py-3 text-right">R$/L</th>
                    <th className="py-3 pl-3 pr-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {r.linhas.map((l) => (
                    <tr key={l.rota.codigo} className="border-t border-border">
                      <td className="py-3 pl-4 pr-3 text-sm">
                        <Link
                          to="/rota/$codigo"
                          params={{ codigo: l.rota.codigo }}
                          className="text-primary hover:underline"
                        >
                          {l.rota.codigo}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm">{l.equipamento.nome}</td>
                      <td className="px-3 py-3 text-sm">
                        {l.status === "critico" ? (
                          <Tag tom="critico">Crítico</Tag>
                        ) : l.status === "atencao" ? (
                          <Tag tom="atencao">Atenção</Tag>
                        ) : (
                          <Tag>Normal</Tag>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular">
                        {litros(l.ind.volumeL)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular">{fmtKm(l.ind.km)}</td>
                      <td className="px-3 py-3 text-right text-sm tabular">
                        {reaisLitro(l.ind.custoLitro)}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <Link
                          to="/simulador/$codigo"
                          params={{ codigo: l.rota.codigo }}
                          className="text-sm text-primary hover:underline"
                        >
                          Simular
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {regioes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma rota carregada para esta unidade.</p>
        ) : null}
      </div>
    </>
  );
}
