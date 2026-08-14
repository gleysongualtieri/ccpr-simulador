import type { RotaOperacional } from "@/lib/domain/types";
import { getEquipamento } from "./equipment";
import { custoRota, custoPorLitro, densidade } from "./routeCost";

/** Agregação por região (PRD 6.3 / RF06). */

export interface AgregadoRegiao {
  rotas: number;
  volumeL: number;
  km: number;
  custo: number;
  custoLitro: number;
  densidade: number;
}

export function agregarRotas(rotas: RotaOperacional[]): AgregadoRegiao {
  let volumeL = 0;
  let km = 0;
  let custo = 0;

  for (const rota of rotas) {
    const equipamento = getEquipamento(rota.equipamentoId);
    volumeL += rota.volumeL;
    km += rota.km;
    if (equipamento) custo += custoRota(equipamento, rota.km);
  }

  return {
    rotas: rotas.length,
    volumeL,
    km,
    custo,
    custoLitro: custoPorLitro(custo, volumeL),
    densidade: densidade(volumeL, km),
  };
}

export function agruparPorRegiao(rotas: RotaOperacional[]): Map<string, RotaOperacional[]> {
  const mapa = new Map<string, RotaOperacional[]>();
  for (const rota of rotas) {
    const atual = mapa.get(rota.regiao) ?? [];
    atual.push(rota);
    mapa.set(rota.regiao, atual);
  }
  return mapa;
}
