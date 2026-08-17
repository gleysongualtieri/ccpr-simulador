import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useLinhasRota } from "@/lib/data/selectors";
import { useDados } from "@/lib/data/store";
import { agregarRotas } from "@/lib/calculations/regionalAggregation";
import { simularRota } from "@/lib/calculations/simulation";
import { formatarHoras } from "@/lib/calculations/routeJourney";
import { densidadeFmt, km as fmtKm, litros, percentual, reais, reaisLitro } from "@/lib/format";

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
  component: Relatorios;
});

function Relatorios() {
  return null;
}
