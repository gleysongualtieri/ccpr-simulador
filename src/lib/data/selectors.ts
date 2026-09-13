import { useMemo } from "react";
import type { RotaOperacional, TarifaTransporte, Transportadora } from "@/lib/domain/types";
import { getEquipamento } from "@/lib/calculations/equipment";
import { indicadoresRota, type IndicadoresRota } from "@/lib/calculations/routeCost";
import { calcularJornada, type ResultadoJornada } from "@/lib/calculations/routeJourney";
import { isCompativel } from "@/lib/calculations/compatibility";
import { useDados, useRotasUnidade } from "./store";
import type { Equipamento } from "@/lib/domain/types";
import { resolverTarifaRota } from "./tariffs";

export interface LinhaRota {
  rota: RotaOperacional;
  equipamento: Equipamento;
  ind: IndicadoresRota;
  jornada: ResultadoJornada;
  compativel: boolean;
  tarifa?: TarifaTransporte | undefined;
  tarifaEncontrada: boolean;
  status: "normal" | "atencao" | "critico";
}

/** Classificação operacional: exceções só aparecem quando têm significado. */
function classificar(l: Omit<LinhaRota, "status">, medianaCustoLitro: number): LinhaRota["status"] {
  if (!l.tarifaEncontrada || l.jornada.critica || l.ind.ocupacao > 1 || !l.compativel)
    return "critico";
  if (medianaCustoLitro > 0 && l.ind.custoLitro > medianaCustoLitro * 1.15) return "atencao";
  if (l.jornada.atencao) return "atencao";
  return "normal";
}

export function montarLinhas(
  rotas: RotaOperacional[],
  tarifas: TarifaTransporte[] = [],
  transportadoras: Transportadora[] = [],
): LinhaRota[] {
  const parciais = rotas.flatMap((rota) => {
    const resolvida = resolverTarifaRota(rota, rota.equipamentoId, tarifas, transportadoras);
    const equipamento = resolvida?.equipamento ?? getEquipamento(rota.equipamentoId);
    if (!equipamento) return [];
    return [
      {
        rota,
        equipamento,
        ind: indicadoresRota(equipamento, rota.volumeL, rota.km, rota.capacidadeRealL),
        jornada: calcularJornada(rota),
        compativel: isCompativel(rota.sufixoTipo, equipamento.id),
        tarifa: resolvida?.tarifa,
        tarifaEncontrada: rota.origem.mock || Boolean(resolvida?.tarifa),
      },
    ];
  });

  const ordenados = [...parciais].map((p) => p.ind.custoLitro).sort((a, b) => a - b);
  const mediana = ordenados.length ? (ordenados[Math.floor(ordenados.length / 2)] ?? 0) : 0;

  return parciais.map((p) => ({ ...p, status: classificar(p, mediana) }));
}

export function useLinhasRota(): LinhaRota[] {
  const rotas = useRotasUnidade();
  const { tarifas, transportadoras } = useDados();
  return useMemo(
    () => montarLinhas(rotas, tarifas, transportadoras),
    [rotas, tarifas, transportadoras],
  );
}

export function agregarLinhas(linhas: LinhaRota[]) {
  const volumeL = linhas.reduce((total, linha) => total + linha.rota.volumeL, 0);
  const km = linhas.reduce((total, linha) => total + linha.rota.km, 0);
  const custo = linhas.reduce((total, linha) => total + linha.ind.custo, 0);
  const tarifasAusentes = linhas.filter((linha) => !linha.tarifaEncontrada).length;
  return {
    rotas: linhas.length,
    volumeL,
    km,
    custo,
    custoLitro: volumeL > 0 ? custo / volumeL : 0,
    densidade: km > 0 ? volumeL / km : 0,
    tarifasAusentes,
  };
}
