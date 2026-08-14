import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { DESCRICAO_SUFIXO } from "@/lib/calculations/compatibility";
import { decodificarVeiculo } from "@/lib/calculations/equipment";
import { formatarHoras, LIMITE_JORNADA_H } from "@/lib/calculations/routeJourney";
import { densidadeFmt, km as fmtKm, litros, percentual, reais, reaisLitro } from "@/lib/format";

export const Route = createFileRoute("/rota/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Rota ${params.codigo} | Simulador Operacional CCPR` },
      {
        name: "description",
        content: `Detalhe operacional da rota ${params.codigo}: produtores, volume, km, equipamento, custo e jornada.`,
      },
      { property: "og:title", content: `Rota ${params.codigo} | CCPR CONECTA` },
      {
        property: "og:description",
        content: `Indicadores e produtores da rota ${params.codigo}.`,
      },
    ],
  }),
  component: DetalheRota,
});

function DetalheRota() {
  const { codigo } = Route.useParams();
  const linhas = useLinhasRota();
  const { produtores } = useDados();
  const linha = linhas.find((l) => l.rota.codigo === codigo);

  if (!linha) {
    return (
      <>
        <PageHeader titulo={`Rota ${codigo}`} />
        <p className="text-sm text-muted-foreground">
          Rota não encontrada na unidade selecionada. Verifique a unidade no topo da tela.
        </p>
      </>
    );
  }

  const { rota, equipamento, ind, jornada } = linha;
  const veiculo = decodificarVeiculo(rota.veiculo);
  const daRota = produtores.filter((p) => p.rotaCodigo === rota.codigo);

  return (
    <>
      <PageHeader
        titulo={`Rota ${rota.codigo}`}
        descricao={`${DESCRICAO_SUFIXO[rota.sufixoTipo]} · Região ${rota.regiao} · Ciclo ${rota.ciclo === "par" ? "dias pares" : "dias ímpares"}`}
        acoes={
          <>
            <Tag tom={rota.origem.mock ? "atencao" : "primario"}>
              {rota.origem.mock ? "DADOS DE TESTE" : "DADO REAL"}
            </Tag>
            <Link
              to="/simulador/$codigo"
              params={{ codigo: rota.codigo }}
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Simular
            </Link>
          </>
        }
      />

      <KpiGrid>
        <Kpi rotulo="Volume" valor={litros(ind.volumeL)} />
        <Kpi rotulo="Km" valor={fmtKm(ind.km)} />
        <Kpi rotulo="Custo" valor={reais(ind.custo)} />
        <Kpi rotulo="R$/L" valor={reaisLitro(ind.custoLitro)} tom="primario" />
        <Kpi rotulo="Densidade" valor={densidadeFmt(ind.densidade)} />
        <Kpi
          rotulo="Ocupação"
          valor={percentual(ind.ocupacao)}
          detalhe={`Capacidade ${litros(ind.capacidadeL)}`}
          tom={ind.ocupacao > 1 ? "critico" : "neutro"}
        />
        <Kpi
          rotulo="Jornada"
          valor={formatarHoras(jornada.horas)}
          detalhe={`Limite ${LIMITE_JORNADA_H}h`}
          tom={jornada.critica ? "critico" : jornada.atencao ? "atencao" : "neutro"}
        />
        <Kpi rotulo="Equipamento" valor={equipamento.nome} detalhe={rota.veiculo} />
      </KpiGrid>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle hint="chegada na base − início da rota (sem descarga e regresso)">
            Jornada
          </SectionTitle>
          <div className="rounded-md border border-border bg-card p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Início da rota</dt>
                <dd className="mt-1 tabular">{rota.inicioRota}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Chegada na base (pesagem)</dt>
                <dd className="mt-1 tabular">{rota.chegadaBase}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duração bruta</dt>
                <dd className="mt-1 tabular">{formatarHoras(jornada.horasBrutas)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Troca de motorista</dt>
                <dd className="mt-1">{jornada.trocaMotorista ? "Sim" : "Não"}</dd>
              </div>
            </dl>

            {jornada.trocaMotorista ? (
              <table className="mt-5 w-full border-t border-border">
                <thead>
                  <tr className="text-sm font-medium text-muted-foreground">
                    <th className="py-2 text-left">Motorista</th>
                    <th className="py-2 text-left">Trecho</th>
                    <th className="py-2 text-right">Jornada</th>
                  </tr>
                </thead>
                <tbody>
                  {jornada.trechos.map((t, i) => (
                    <tr key={`${t.motorista}-${i}`} className="border-t border-border">
                      <td className="py-2 text-sm">{t.motorista}</td>
                      <td className="py-2 text-sm tabular text-muted-foreground">
                        {rota.trechos?.[i]?.inicio} → {rota.trechos?.[i]?.fim}
                      </td>
                      <td
                        className={`py-2 text-right text-sm tabular ${t.critica ? "text-destructive" : ""}`}
                      >
                        {formatarHoras(t.horas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {jornada.critica ? (
              <p className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Jornada acima do limite de {LIMITE_JORNADA_H}h para um mesmo motorista.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle hint="rastreabilidade do registro">Origem do dado</SectionTitle>
          <div className="rounded-md border border-border bg-card p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Arquivo de origem</dt>
                <dd className="mt-1">{rota.origem.arquivo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Importado em</dt>
                <dd className="mt-1">
                  {new Date(rota.origem.importadoEm).toLocaleString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unidade</dt>
                <dd className="mt-1">{rota.unidadeId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transportadora</dt>
                <dd className="mt-1">{rota.transportadora || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Código do veículo</dt>
                <dd className="mt-1">{rota.veiculo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Capacidade nominal (código)</dt>
                <dd className="mt-1">
                  {veiculo.capacidadeNominalL ? litros(veiculo.capacidadeNominalL) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <SectionTitle hint={`${daRota.length} produtor(es) — região extraída da linha do código`}>
          Produtores da rota
        </SectionTitle>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-sm font-medium text-muted-foreground">
                <th className="py-3 pl-4 pr-3 text-left">Código</th>
                <th className="px-3 py-3 text-left">Produtor</th>
                <th className="px-3 py-3 text-left">Cooperativa</th>
                <th className="px-3 py-3 text-left">Linha (região)</th>
                <th className="px-3 py-3 text-left">Matrícula</th>
                <th className="py-3 pl-3 pr-4 text-right">Volume</th>
              </tr>
            </thead>
            <tbody>
              {daRota.map((p) => (
                <tr key={p.codigo} className="border-t border-border">
                  <td className="py-3 pl-4 pr-3 text-sm tabular">{p.codigo}</td>
                  <td className="px-3 py-3 text-sm">{p.nome}</td>
                  <td className="px-3 py-3 text-sm">{p.cooperativa}</td>
                  <td className="px-3 py-3 text-sm">{p.linha}</td>
                  <td className="px-3 py-3 text-sm">{p.matricula}</td>
                  <td className="py-3 pl-3 pr-4 text-right text-sm tabular">{litros(p.volumeL)}</td>
                </tr>
              ))}
              {daRota.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum produtor vinculado a esta rota.
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
