import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Tag } from "@/components/ui-ccpr/Kpi";
import { EQUIPAMENTOS } from "@/lib/calculations/equipment";
import { DESCRICAO_SUFIXO, SUFIXOS_VALIDOS, isCompativel } from "@/lib/calculations/compatibility";
import { litros, reais } from "@/lib/format";

export const Route = createFileRoute("/equipamentos")({
  head: () => ({
    meta: [
      { title: "Equipamentos e Compatibilidade | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Tabela de referência de equipamentos: capacidade, diária, custo por km e compatibilidade por tipo de rota.",
      },
      { property: "og:title", content: "Equipamentos e Compatibilidade | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Capacidade, custos e regra de compatibilidade por sufixo de rota.",
      },
    ],
  }),
  component: Equipamentos,
});

function Equipamentos() {
  return (
    <>
      <PageHeader
        titulo="Equipamentos"
        descricao="Fonte única de capacidade e custo usada por todas as simulações. Os valores de diária e R$/km são parametrizáveis e devem ser substituídos pela Tabela de Tarifas oficial quando disponível."
      />

      <SectionTitle hint="capacidade e custo">Tabela de referência</SectionTitle>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="bg-surface text-sm font-medium text-muted-foreground">
              <th className="py-3 pl-4 pr-3 text-left">Equipamento</th>
              <th className="px-3 py-3 text-left">Tipo</th>
              <th className="px-3 py-3 text-left">Siglas Axiodis</th>
              <th className="px-3 py-3 text-right">Capacidade</th>
              <th className="px-3 py-3 text-right">Diária</th>
              <th className="py-3 pl-3 pr-4 text-right">R$/km</th>
            </tr>
          </thead>
          <tbody>
            {EQUIPAMENTOS.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-3 pl-4 pr-3 text-sm">{e.nome}</td>
                <td className="px-3 py-3 text-sm capitalize text-muted-foreground">{e.tipo}</td>
                <td className="px-3 py-3 text-sm">{e.siglas.join(", ")}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{litros(e.capacidadeL)}</td>
                <td className="px-3 py-3 text-right text-sm tabular">{reais(e.diaria)}</td>
                <td className="py-3 pl-3 pr-4 text-right text-sm tabular">{reais(e.custoKm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <SectionTitle hint="o sufixo do código da rota define o que pode rodar">
          Compatibilidade Rota × Equipamento
        </SectionTitle>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-surface text-sm font-medium text-muted-foreground">
                <th className="py-3 pl-4 pr-3 text-left">Sufixo</th>
                <th className="px-3 py-3 text-left">Significado</th>
                {EQUIPAMENTOS.map((e) => (
                  <th key={e.id} className="px-2 py-3 text-center text-xs">
                    {e.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUFIXOS_VALIDOS.map((s) => (
                <tr key={s} className="border-t border-border">
                  <td className="py-3 pl-4 pr-3 text-sm font-medium">{s}</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {DESCRICAO_SUFIXO[s]}
                  </td>
                  {EQUIPAMENTOS.map((e) => (
                    <td key={e.id} className="px-2 py-3 text-center">
                      {isCompativel(s, e.id) ? <Tag tom="primario">Sim</Tag> : <Tag>—</Tag>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
