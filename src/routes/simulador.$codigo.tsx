import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { TabelaComparacao } from "@/components/ui-ccpr/Comparacao";
import { useDados, useRotasUnidade } from "@/lib/data/store";
import { simularRota } from "@/lib/calculations/simulation";
import { categoriaReboquePorCapacidade } from "@/lib/data/tariffs";
import { EQUIPAMENTOS } from "@/lib/calculations/equipment";
import { DESCRICAO_SUFIXO, equipamentosCompativeis } from "@/lib/calculations/compatibility";
import { litrosPrecisos, litros, percentual, reaisLitro } from "@/lib/format";
import { encontrarRotaPorIdentificador, identificadorRotaUrl } from "@/lib/data/identity";

export const Route = createFileRoute("/simulador/$codigo")({
  head: ({ params }) => {
    const codigoExibido = params.codigo.replace(/--(?:par|impar)$/, "");
    return {
      meta: [
        { title: `Simulação da rota ${codigoExibido} | CCPR CONECTA` },
        {
          name: "description",
          content: `Simule volume, km e equipamento na rota ${codigoExibido} e compare o resultado com a operação atual.`,
        },
        { property: "og:title", content: `Simulação da rota ${codigoExibido} | CCPR CONECTA` },
        {
          property: "og:description",
          content: `Comparação atual × simulado da rota ${codigoExibido}.`,
        },
      ],
    };
  },
  component: SimuladorRota,
});

function SimuladorRota() {
  const { codigo } = Route.useParams();
  const rotas = useRotasUnidade();
  const { registrarSimulacao, tarifas, transportadoras } = useDados();
  const rota = encontrarRotaPorIdentificador(rotas, codigo);

  const [aumentoVolumeL, setAumentoVolumeL] = useState(0);
  const [aumentoKm, setAumentoKm] = useState(0);
  const [equipamentoIdSimulado, setEquipamentoIdSimulado] = useState(rota?.equipamentoId ?? "");
  const capacidadeOriginal = rota?.capacidadeVeiculoInformadaL ?? rota?.capacidadeNominalL ?? 0;
  const [capacidadeVeiculoSimuladaL, setVeiculo] = useState(capacidadeOriginal);
  const [capacidadeReboqueSimuladaL, setReboque] = useState(rota?.capacidadeReboqueL ?? 0);
  const [categoriaReboqueSimulada, setCategoria] = useState<"comum" | "trucado" | undefined>();
  const conjunto = EQUIPAMENTOS.find((e) => e.id === equipamentoIdSimulado)?.tipo === "reboque";
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setEquipamentoIdSimulado(rota?.equipamentoId ?? "");
    setVeiculo(rota?.capacidadeVeiculoInformadaL ?? rota?.capacidadeNominalL ?? 0);
    setReboque(rota?.capacidadeReboqueL ?? 0);
    setCategoria(undefined);
    setAumentoVolumeL(0);
    setAumentoKm(0);
    setSalvo(false);
  }, [rota]);

  const compativeis = useMemo(() => (rota ? equipamentosCompativeis(rota.sufixoTipo) : []), [rota]);

  const resultado = useMemo(
    () =>
      rota
        ? simularRota(
            rota,
            {
              capacidadeVeiculoSimuladaL,
              capacidadeReboqueSimuladaL,
              categoriaReboqueSimulada,
              aumentoVolumeL,
              aumentoKm,
              equipamentoIdSimulado: equipamentoIdSimulado || rota.equipamentoId,
            },
            tarifas,
            transportadoras,
          )
        : null,
    [
      rota,
      aumentoVolumeL,
      aumentoKm,
      equipamentoIdSimulado,
      tarifas,
      transportadoras,
      capacidadeVeiculoSimuladaL,
      capacidadeReboqueSimuladaL,
      categoriaReboqueSimulada,
    ],
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
    aumentoVolumeL === 0 &&
    aumentoKm === 0 &&
    resultado.equipamentoSimulado.id === rota.equipamentoId &&
    capacidadeVeiculoSimuladaL === capacidadeOriginal &&
    (!conjunto || capacidadeReboqueSimuladaL === rota.capacidadeReboqueL);

  const bloqueada = !resultado.viavel;

  return (
    <>
      <PageHeader
        titulo={`Simulação — rota ${rota.codigo}`}
        descricao={`${DESCRICAO_SUFIXO[rota.sufixoTipo]} · Região ${rota.regiao} · Ciclo ${rota.ciclo === "par" ? "dias pares" : "dias ímpares"}. A rota original permanece intacta.`}
        acoes={
          <Link
            to="/rota/$codigo"
            params={{ codigo: identificadorRotaUrl(rota) }}
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
                  setVeiculo(e.target.value === rota.equipamentoId ? capacidadeOriginal : 0);
                  setReboque(
                    e.target.value === rota.equipamentoId ? (rota.capacidadeReboqueL ?? 0) : 0,
                  );
                  setCategoria(undefined);
                  setSalvo(false);
                }}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <optgroup label={`Compatíveis com sufixo ${rota.sufixoTipo}`}>
                  {compativeis.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Demais equipamentos (incompatíveis)">
                  {EQUIPAMENTOS.filter((e) => !compativeis.some((c) => c.id === e.id)).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Atual: {resultado.equipamentoAtual.nome}
              </span>
            </label>

            <label className="block text-sm">
              Capacidade real do veículo sem reboque (L)
              <input
                aria-label="Capacidade real do veículo"
                type="number"
                min={1}
                max={100000}
                step={1}
                value={capacidadeVeiculoSimuladaL || ""}
                onChange={(e) => {
                  setVeiculo(Number(e.target.value));
                  setSalvo(false);
                }}
                className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Para Carreta, Vanderleia e Bitrem, informe a capacidade total do equipamento.
              </span>
            </label>
            {conjunto && (
              <>
                <label className="block text-sm">
                  Capacidade real do reboque (L)
                  <input
                    aria-label="Capacidade real do reboque"
                    type="number"
                    list="capacidades-reboque"
                    min={1}
                    max={100000}
                    step={1}
                    value={capacidadeReboqueSimuladaL || ""}
                    onChange={(e) => {
                      setReboque(Number(e.target.value));
                      setCategoria(undefined);
                      setSalvo(false);
                    }}
                    className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3"
                  />
                  <datalist id="capacidades-reboque">
                    {[12000, 15000, 18000, 21000].map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Selecione uma sugestão ou informe outra capacidade.
                  </span>
                </label>
                {categoriaReboquePorCapacidade(capacidadeReboqueSimuladaL) ? (
                  <p className="text-sm">
                    Reboque {categoriaReboquePorCapacidade(capacidadeReboqueSimuladaL)}.
                  </p>
                ) : (
                  <label className="block text-sm">
                    Categoria do reboque
                    <select
                      value={categoriaReboqueSimulada ?? ""}
                      onChange={(e) => {
                        setCategoria(
                          e.target.value === "comum" || e.target.value === "trucado"
                            ? e.target.value
                            : undefined,
                        );
                        setSalvo(false);
                      }}
                      className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3"
                    >
                      <option value="">Selecione a categoria</option>
                      <option value="comum">Comum — 2 eixos</option>
                      <option value="trucado">Trucado — 3 eixos</option>
                    </select>
                  </label>
                )}
              </>
            )}
            <p className="text-sm">
              Capacidade total:{" "}
              {resultado.simulado.capacidadeL > 0
                ? litros(resultado.simulado.capacidadeL)
                : "Informe as capacidades"}
            </p>
            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <button
                type="button"
                disabled={semAlteracao || bloqueada}
                onClick={() => {
                  if (bloqueada || semAlteracao) return;
                  registrarSimulacao({
                    capacidadeVeiculoSimuladaL,
                    capacidadeReboqueSimuladaL,
                    categoriaReboqueSimulada,
                    rotaCodigo: rota.codigo,
                    rotaCiclo: rota.ciclo,
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
                  setVeiculo(capacidadeOriginal);
                  setReboque(rota.capacidadeReboqueL ?? 0);
                  setCategoria(undefined);
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
            {bloqueada ? (
              <p className="text-sm text-destructive">{resultado.motivosBloqueio.join(" ")}</p>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle hint="cálculo em tempo real">Resultado</SectionTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            A jornada verificada é a original, entre Saída e Balanza. Alterações de km não estimam
            uma nova duração.
          </p>

          {bloqueada && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive p-4 text-destructive"
            >
              <strong>Simulação inviável</strong>
              <ul className="list-disc pl-5">
                {resultado.motivosBloqueio.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p>Valores apenas para referência; não representam economia aplicável.</p>
            </div>
          )}
          {!bloqueada && semAlteracao && (
            <p className="mb-4 text-sm text-muted-foreground">
              Altere um parâmetro para registrar uma simulação.
            </p>
          )}
          {!resultado.compativel ? (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {resultado.equipamentoSimulado.nome} não é compatível com rota de sufixo{" "}
              {rota.sufixoTipo} ({DESCRICAO_SUFIXO[rota.sufixoTipo]}). A simulação é exibida apenas
              como referência e não deve ser aplicada.
            </p>
          ) : null}

          {resultado.capacidade.excedida ? (
            <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              Capacidade excedida em {litrosPrecisos(resultado.capacidade.excedenteL)} — o volume
              simulado não cabe em {resultado.equipamentoSimulado.nome} (
              {litros(resultado.capacidade.capacidadeL)}). É necessário equipamento maior ou uma
              segunda viagem.
            </p>
          ) : null}

          <div className="mb-6">
            <KpiGrid>
              <Kpi
                rotulo="R$/L simulado"
                valor={
                  resultado.tarifaSimuladaEncontrada
                    ? reaisLitro(resultado.simulado.custoLitro)
                    : "Sem tarifa"
                }
                detalhe={
                  resultado.tarifaAtualEncontrada
                    ? `Atual ${reaisLitro(resultado.atual.custoLitro)}`
                    : "A tarifa atual também está ausente"
                }
                tom={
                  bloqueada
                    ? "neutro"
                    : resultado.comparacao.custoLitro.favoravel
                      ? "primario"
                      : "critico"
                }
              />
              <Kpi rotulo="Volume simulado" valor={litros(resultado.simulado.volumeL)} />
              <Kpi
                rotulo="Ocupação simulada"
                valor={
                  resultado.capacidadeInformada
                    ? percentual(resultado.simulado.ocupacao)
                    : "Capacidade não informada"
                }
                detalhe={
                  resultado.capacidadeInformada
                    ? `Capacidade ${litros(resultado.simulado.capacidadeL)}`
                    : "Preencha as capacidades para calcular a ocupação"
                }
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

          <TabelaComparacao
            c={resultado.comparacao}
            neutra={bloqueada}
            tarifaAtual={resultado.tarifaAtualEncontrada}
            tarifaSimulada={resultado.tarifaSimuladaEncontrada}
            capacidadeSimulada={resultado.capacidadeInformada}
          />

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
