import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { agregarRotas, agruparPorRegiao } from "@/lib/calculations/regionalAggregation";
import { densidadeFmt, km as fmtKm, litros, reais, reaisLitro } from "@/lib/format";
import { formatarHoras } from "@/lib/calculations/routeJourney";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral da Operação | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Indicadores consolidados da roteirização atual: volume, km, custo, R$/L, densidade, rotas e jornadas críticas.",
      },
      { property: "og:title", content: "Visão Geral da Operação | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Painel operacional da malha de rotas da unidade com indicadores de custo e jornada.",
      },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const linhas = useLinhasRota();
  const { unidades, unidadeAtivaId, temDadosMock } = useDados();
  const unidade = unidades.find((u) => u.id === unidadeAtivaId);

  const total = agregarRotas(linhas.map((l) => l.rota));
  const criticas = linhas.filter((l) => l.status === "critico");
  const jornadasCriticas = linhas.filter((l) => l.jornada.critica);
  const maisCaras = [...linhas].sort((a, b) => b.ind.custoLitro - a.ind.custoLitro).slice(0, 5);

  const regioes = [...agruparPorRegiao(linhas.map((l) => l.rota)).entries()]
    .map(([regiao, rotas]) => ({ regiao, ...agregarRotas(rotas) }))
    .sort((a, b) => b.custoLitro - a.custoLitro);

  return (
    <>
      <PageHeader
        titulo="Visão Geral da Operação"
        descricao={`Roteirização atual da unidade ${unidade?.id ?? ""} — ${unidade?.nome ?? ""}. Os indicadores refletem os dados carregados hoje.`}
        acoes={
          temDadosMock ? <Tag tom="atencao">DADOS DE TESTE</Tag> : <Tag tom="primario">DADO REAL</Tag>
        }
      />

      <KpiGrid>
        <Kpi rotulo="Rotas analisadas" valor={String(total.rotas)} tom="primario" />
        <Kpi rotulo="Volume total" valor={litros(total.volumeL)} />
        <Kpi rotulo="Km total" valor={fmtKm(total.km)} />
        <Kpi rotulo="Custo total" valor={reais(total.custo)} />
        <Kpi rotulo="R$/L" valor={reaisLitro(total.custoLitro)} tom="primario" />
        <Kpi rotulo="Densidade" valor={densidadeFmt(total.densidade)} />
        <Kpi
          rotulo="Rotas críticas"
          valor={String(criticas.length)}
          tom={criticas.length ? "critico" : "neutro"}
          detalhe="Custo fora do padrão, jornada ou capacidade"
        />
        <Kpi
          rotulo="Jornadas críticas"
          valor={String(jornadasCriticas.length)}
          tom={jornadasCriticas.length ? "critico" : "neutro"}
          detalhe="Acima de 13h por motorista"
        />
      </KpiGrid>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle hint="ordenado por R$/L">Rotas com maior custo por litro</SectionTitle>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="bg-surface text-sm font-medium text-muted-foreground">
                  <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                  <th className="px-3 py-3 text-left">Região</th>
                  <th className="px-3 py-3 text-right">Volume</th>
                  <th className="px-3 py-3 text-right">R$/L</th>
                  <th className="px-3 py-3 text-right">Jornada</th>
                  <th className="py-3 pl-3 pr-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {maisCaras.map((l) => (
                  <tr key={l.rota.codigo} className="border-t border-border">
                    <td className="py-3 pl-4 pr-3 text-sm text-foreground">{l.rota.codigo}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{l.rota.regiao}</td>
                    <td className="px-3 py-3 text-right text-sm tabular">{litros(l.ind.volumeL)}</td>
                    <td className="px-3 py-3 text-right text-sm tabular text-foreground">
                      {reaisLitro(l.ind.custoLitro)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular">
                      {l.jornada.critica ? (
                        <span className="text-destructive">{formatarHoras(l.jornada.horas)}</span>
                      ) : (
                        formatarHoras(l.jornada.horas)
                      )}
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
                {maisCaras.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma rota carregada para esta unidade.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle hint="agregado por linha do produtor">Custo por região</SectionTitle>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="bg-surface text-sm font-medium text-muted-foreground">
                  <th className="py-3 pl-4 pr-3 text-left">Região</th>
                  <th className="px-3 py-3 text-right">Rotas</th>
                  <th className="px-3 py-3 text-right">Volume</th>
                  <th className="px-3 py-3 text-right">Densidade</th>
                  <th className="py-3 pl-3 pr-4 text-right">R$/L</th>
                </tr>
              </thead>
              <tbody>
                {regioes.map((r) => (
                  <tr key={r.regiao} className="border-t border-border">
                    <td className="py-3 pl-4 pr-3 text-sm text-foreground">{r.regiao}</td>
                    <td className="px-3 py-3 text-right text-sm tabular">{r.rotas}</td>
                    <td className="px-3 py-3 text-right text-sm tabular">{litros(r.volumeL)}</td>
                    <td className="px-3 py-3 text-right text-sm tabular">
                      {densidadeFmt(r.densidade)}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-sm tabular text-foreground">
                      {reaisLitro(r.custoLitro)}
                    </td>
                  </tr>
                ))}
                {regioes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Sem regiões identificadas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
