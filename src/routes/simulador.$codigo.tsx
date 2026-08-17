import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { TabelaComparacao } from "@/components/ui-ccpr/Comparacao";
import { useDados, useRotasUnidade } from "@/lib/data/store";
import { simularRota } from "@/lib/calculations/simulation";
import { EQUIPAMENTOS } from "@/lib/calculations/equipment";
import { DESCRICAO_SUFIXO, equipamentosCompativeis } from "@/lib/calculations/compatibility";
import { litros, percentual, reaisLitro } from "@/lib/format";

export const Route = createFileRoute("/simulador/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Simulação da rota ${params.codigo} | CCPR CONECTA` },
      {
        name: "description",
        content: `Simule volume, km e equipamento na rota ${params.codigo} e compare o resultado com a operação atual.`,
      },
      { property: "og:title", content: `Simulação da rota ${params.codigo} | CCPR CONECTA` },
      {
        property: "og:description",
        content: `Comparação atual × simulado da rota ${params.codigo}.`,
      },
    ],
  }),
  component: SimuladorRota,
});

function SimuladorRota() {
  const { codigo } = Route.useParams();
  const rotas = useRotasUnidade();
  const { registrarSimulacao } = useDados();
  const rota = rotas.find((r) => r.codigo === codigo);

  const [aumentoVolumeL, setAumentoVolumeL] = useState(0);
  const [aumentoKm, setAumentoKm] = useState(0);
  const [equipamentoIdSimulado, setEquipamentoIdSimulado] = useState(rota?.equipamentoId ?? "");
  const [salvo, setSalvo] = useState(false);

  const compativeis = useMemo(
    () => (rota ? equipamentosCompativeis(rota.sufixoTipo) : []),
    [rota],
  );

  const resultado = useMemo(
    () =>
      rota
        ? simularRota(rota, {
            aumentoVolumeL,
            aumentoKm,
            equipamentoIdSimulado: equipamentoIdSimulado || rota.equipamentoId,
          })
        : null,
    [rota, aumentoVolumeL, aumentoKm, equipamentoIdSimulado],
  );

  if (!rota || !resultado) {
    return (
      <>
        <PageHeader titulo={`Simulação — ${codigo}`} />
        <p className="text-sm text-muted-foreground">
          Rota não encontrada na unidade selecionada.{" "}
          <Link to="/simulador" className="text-primary hover:underline">
            Voltar ao simulador
          </Link>
          .
        </p>
      </>
    );
  }

  const semAlteracao =
    aumentoVolumeL === 0 && aumentoKm === 0 && resultado.equipamentoSimulado.id === rota.equipamentoId;

  return (
    <>
      <PageHeader
        titulo={`Simulação — rota ${rota.codigo}`}
        descricao={`${DESCRICAO_SUFIXO[rota.sufixoTipo]} · Região ${rota.regiao} · Ciclo ${rota.ciclo === "par" ? "dias pares" : "dias ímpares"}. A rota original permanece intacta.`}
        acoes={
          <Link
            to="/rota/$codigo"
            params={{ codigo: rota.codigo }}
            className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-foreground transition-colors hover:bg-surface"
          >
            Ver detalhe da rota
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <section>
          <SectionTitle hint="alavancas táticas">Parâmetros</SectionTitle>
          <div className="space-y-6 rounded-md border border-border bg-card p-5">
            <label className="block">
              <span className="text-sm text-foreground">Aumento de volume (L/dia)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={aumentoVolumeL}
                onChange={(e) => {
                  setAumentoVolumeL(Math.max(0, Number(e.target.value) || 0));
                  setSalvo(false);
                }}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm tabular outline-none focus:border-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Crescimento dos produtores que já estão na rota. Atual: {litros(rota.volumeL)}
              </span>
            </label>

            <label className="block">
              <span className="text-sm text-foreground">Aumento de km</span>
              <input
                type="number"
                min={0}
                step={1}
                value={aumentoKm}
                onChange={(e) => {
                  setAumentoKm(Math.max(0, Number(e.target.value) || 0));
                  setSalvo(false);
                }}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm tabular outline-none focus:border-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Km adicional para captar o volume novo. Atual: {rota.km} km
              </span>
            </label>

            <label className="block">
              <span className="text-sm text-foreground">Equipamento simulado</span>
              <select
                value={equipamentoIdSimulado || rota.equipamentoId}
                onChange={(e) => {
                  setEquipamentoIdSimulado(e.target.value);
                  setSalvo(false);
                }}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <optgroup label={`Compatíveis com sufixo ${rota.sufixoTipo}`}>
                  {compativeis.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} — {litros(e.capacidadeL)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Demais equipamentos (incompatíveis)">
                  {EQUIPAMENTOS.filter((e) => !compativeis.some((c) => c.id === e.id)).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} — {litros(e.capacidadeL)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Atual: {resultado.equipamentoAtual.nome}
              </span>
            </label>

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <button
                type="button"
                disabled={semAlteracao}
                onClick={() => {
                  registrarSimulacao({
                    rotaCodigo: rota.codigo,
                    aumentoVolumeL,
                    aumentoKm,
                    equipamentoIdSimulado: resultado.equipamentoSimulado.id,
                    aplicado: false,
                  });
                  setSalvo(true);
                }}
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Registrar simulação
              </button>
              <button
                type="button"
                onClick={() => {
                  setAumentoVolumeL(0);
                  setAumentoKm(0);
                  setEquipamentoIdSimulado(rota.equipamentoId);
                  setSalvo(false);
                }}
                className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-foreground transition-colors hover:bg-surface"
              >
                Limpar
              </button>
            </div>
            {salvo ? (
              <p className="text-sm text-primary">
                Simulação registrada.{" "}
                <Link to="/simulador" className="underline">
                  Ver histórico
                </Link>
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle hint="cálculo em tempo real">Resultado</SectionTitle>

          {!resultado.compativel ? (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {resultado.equipamentoSimulado.nome} não é compatível com rota de sufixo{" "}
              {rota.sufixoTipo} ({DESCRICAO_SUFIXO[rota.sufixoTipo]}). A simulação é exibida apenas
              como referência e não deve ser aplicada.
            </p>
          ) : null}

          {resultado.capacidade.excedida ? (
            <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              Capacidade excedida em {litros(resultado.capacidade.excedenteL)} — o volume simulado
              não cabe em {resultado.equipamentoSimulado.nome} (
              {litros(resultado.capacidade.capacidadeL)}). É necessário equipamento maior ou uma
              segunda viagem.
            </p>
          ) : null}

          <div className="mb-6">
            <KpiGrid>
              <Kpi
                rotulo="R$/L simulado"
                valor={reaisLitro(resultado.simulado.custoLitro)}
                detalhe={`Atual ${reaisLitro(resultado.atual.custoLitro)}`}
                tom={resultado.comparacao.custoLitro.favoravel ? "primario" : "critico"}
              />
              <Kpi rotulo="Volume simulado" valor={litros(resultado.simulado.volumeL)} />
              <Kpi
                rotulo="Ocupação simulada"
                valor={percentual(resultado.simulado.ocupacao)}
                detalhe={`Capacidade ${litros(resultado.simulado.capacidadeL)}`}
                tom={resultado.capacidade.excedida ? "critico" : "neutro"}
              />
              <Kpi
                rotulo="Compatibilidade"
                valor={resultado.compativel ? "OK" : "Incompatível"}
                detalhe={`Sufixo ${rota.sufixoTipo}`}
                tom={resultado.compativel ? "primario" : "critico"}
              />
            </KpiGrid>
          </div>

          <TabelaComparacao c={resultado.comparacao} />

          <div className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            <Tag tom={rota.origem.mock ? "atencao" : "primario"}>
              {rota.origem.mock ? "DADOS DE TESTE" : "DADO REAL"}
            </Tag>{" "}
            Origem: {rota.origem.arquivo} · importado em{" "}
            {new Date(rota.origem.importadoEm).toLocaleDateString("pt-BR")}
          </div>
        </section>
      </div>
    </>
  );
}
