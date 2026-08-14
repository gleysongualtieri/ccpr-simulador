import { useMemo } from "react";
import type { RotaOperacional } from "@/lib/domain/types";
import { getEquipamento } from "@/lib/calculations/equipment";
import { indicadoresRota, type IndicadoresRota } from "@/lib/calculations/routeCost";
import { calcularJornada, type ResultadoJornada } from "@/lib/calculations/routeJourney";
import { isCompativel } from "@/lib/calculations/compatibility";
import { useRotasUnidade } from "./store";
import type { Equipamento } from "@/lib/domain/types";

export interface LinhaRota {
  rota: RotaOperacional;
  equipamento: Equipamento;
  ind: IndicadoresRota;
  jornada: ResultadoJornada;
  compativel: boolean;
  status: "normal" | "atencao" | "critico";
}

/** Classificação operacional: exceções só aparecem quando têm significado. */
function classificar(l: Omit<LinhaRota, "status">, medianaCustoLitro: number): LinhaRota["status"] {
  if (l.jornada.critica || l.ind.ocupacao > 1 || !l.compativel) return "critico";
  if (medianaCustoLitro > 0 && l.ind.custoLitro > medianaCustoLitro * 1.15) return "atencao";
  if (l.jornada.atencao) return "atencao";
  return "normal";
}

export function montarLinhas(rotas: RotaOperacional[]): LinhaRota[] {
  const parciais = rotas.flatMap((rota) => {
    const equipamento = getEquipamento(rota.equipamentoId);
    if (!equipamento) return [];
    return [
      {
        rota,
        equipamento,
        ind: indicadoresRota(equipamento, rota.volumeL, rota.km),
        jornada: calcularJornada(rota),
        compativel: isCompativel(rota.sufixoTipo, equipamento.id),
      },
    ];
  });

  const ordenados = [...parciais].map((p) => p.ind.custoLitro).sort((a, b) => a - b);
  const mediana = ordenados.length
    ? (ordenados[Math.floor(ordenados.length / 2)] ?? 0)
    : 0;

  return parciais.map((p) => ({ ...p, status: classificar(p, mediana) }));
}

export function useLinhasRota(): LinhaRota[] {
  const rotas = useRotasUnidade();
  return useMemo(() => montarLinhas(rotas), [rotas]);
}
