import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { litros, reaisLitro } from "@/lib/format";

export const Route = createFileRoute("/simulador/")({
  head: () => ({
    meta: [
      { title: "Simulador Operacional de Rota | CCPR CONECTA" },
      {
        name: "description",
        content:
          "Selecione uma rota para simular crescimento de volume, aumento de km e troca de equipamento compatível.",
      },
      { property: "og:title", content: "Simulador Operacional de Rota | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Teste volume, km e equipamento sobre rotas reais e compare atual × simulado.",
      },
    ],
  }),
  component: SimuladorIndex,
});

function SimuladorIndex() {
  const linhas = useLinhasRota();
  const { simulacoes, marcarAplicada, removerSimulacao } = useDados();
  const navigate = useNavigate();

  const ordenadas = [...linhas].sort((a, b) => b.ind.custoLitro - a.ind.custoLitro);

  return (
    <>
      <PageHeader
        titulo="Simulador Operacional de Rota"
        descricao="Escolha a rota que deseja trabalhar. A simulação é uma camada sobre o dado real — os valores originais nunca são alterados."
      />

      <div className="mb-8 flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Rota</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                void navigate({ to: "/simulador/$codigo", params: { codigo: e.target.value } });
              }
            }}
            className="h-11 w-80 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Selecione uma rota…</option>
            {ordenadas.map((l) => (
              <option key={l.rota.codigo} value={l.rota.codigo}>
                {l.rota.codigo} — região {l.rota.regiao} — {reaisLitro(l.ind.custoLitro)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SectionTitle hint="as mais caras primeiro">Rotas disponíveis</SectionTitle>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="bg-surface text-sm font-medium text-muted-foreground">
              <th className="py-3 pl-4 pr-3 text-left">Rota</th>
              <th className="px-3 py-3 text-left">Região</th>
              <th className="px-3 py-3 text-left">Equipamento</th>
              <th className="px-3 py-3 text-right">Volume</th>
              <th className="px-3 py-3 text-right">R$/L</th>
              <th className="py-3 pl-3 pr-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l.rota.codigo} className="border-t border-border hover:bg-surface/60">
                <td className="py-3 pl-4 pr-3 text-sm">{l.rota.codigo}</td>
                <td className="px-3 py-3 text-sm">{l.rota.regiao}</td>
                <td className="px-3 py-3 text-sm">{l.equipamento.nome}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{litros(l.ind.volumeL)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">
                  {reaisLitro(l.ind.custoLitro)}
                </td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <Link
                    to="/simulador/$codigo"
                    params={{ codigo: l.rota.codigo }}
                    className="text-sm text-primary hover:underline"
                  >
                    Abrir simulação
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {simulacoes.length > 0 ? (
        <section className="mt-10">
          <SectionTitle hint="histórico local desta estação">Simulações registradas</SectionTitle>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="bg-surface text-sm font-medium text-muted-foreground">
                  <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                  <th className="px-3 py-3 text-left">Data</th>
                  <th className="px-3 py-3 text-right">+ Volume</th>
                  <th className="px-3 py-3 text-right">+ Km</th>
                  <th className="px-3 py-3 text-left">Equipamento testado</th>
                  <th className="px-3 py-3 text-left">Aplicado</th>
                  <th className="py-3 pl-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {simulacoes.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-3 pl-4 pr-3 text-sm">{s.rotaCodigo}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {new Date(s.criadaEm).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular">
                      {litros(s.aumentoVolumeL)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular">{s.aumentoKm} km</td>
                    <td className="px-3 py-3 text-sm">{s.equipamentoIdSimulado}</td>
                    <td className="px-3 py-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.aplicado}
                          onChange={(e) => marcarAplicada(s.id, e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                        {s.aplicado ? <Tag tom="primario">Aplicado</Tag> : "Não"}
                      </label>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => removerSimulacao(s.id)}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
