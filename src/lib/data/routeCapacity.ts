import type { RotaOperacional } from "../domain/types.ts";
import { getEquipamento } from "../calculations/equipment.ts";

export function recalcularCapacidadeRota(rota: RotaOperacional): RotaOperacional {
  const base = rota.capacidadeVeiculoInformadaL ?? rota.capacidadeNominalL;
  const conjunto = getEquipamento(rota.equipamentoId)?.tipo === "reboque";
  const reboque = rota.capacidadeReboqueL;
  const valido = (valor: number | undefined): valor is number =>
    valor !== undefined && Number.isFinite(valor) && valor > 0 && valor <= 100_000;
  return {
    ...rota,
    capacidadeRealL: valido(base)
      ? conjunto
        ? valido(reboque)
          ? base + reboque
          : undefined
        : base
      : undefined,
  };
}
