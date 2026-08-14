import type { RotaOperacional } from "@/lib/domain/types";

/**
 * Cálculo de jornada (PRD 6.5).
 * Jornada = chegada na base (pesagem, ANTES da descarga) − início da rota.
 * Não inclui descarga nem regresso após descarga.
 * Havendo troca de motorista, avalia-se a jornada POR TRECHO/MOTORISTA.
 */

export const LIMITE_JORNADA_H = 13;

export function minutosEntre(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => n === undefined || Number.isNaN(n))) return 0;
  let diff = hf! * 60 + mf! - (hi! * 60 + mi!);
  if (diff < 0) diff += 24 * 60; // rota que vira o dia
  return diff;
}

export function horasEntre(inicio: string, fim: string): number {
  return minutosEntre(inicio, fim) / 60;
}

export interface JornadaTrecho {
  motorista: string;
  horas: number;
  critica: boolean;
}

export interface ResultadoJornada {
  /** Jornada considerada para o limite de 13h (maior trecho, ou total sem troca) */
  horas: number;
  /** Duração bruta início → chegada na base */
  horasBrutas: number;
  trocaMotorista: boolean;
  trechos: JornadaTrecho[];
  critica: boolean;
  atencao: boolean;
}

export function calcularJornada(rota: RotaOperacional): ResultadoJornada {
  const horasBrutas = horasEntre(rota.inicioRota, rota.chegadaBase);
  const trechos: JornadaTrecho[] = (rota.trechos ?? []).map((t) => {
    const horas = horasEntre(t.inicio, t.fim);
    return { motorista: t.motorista, horas, critica: horas > LIMITE_JORNADA_H };
  });

  const trocaMotorista = trechos.length > 1;
  const horas = trocaMotorista ? Math.max(...trechos.map((t) => t.horas)) : horasBrutas;

  return {
    horas,
    horasBrutas,
    trocaMotorista,
    trechos,
    critica: horas > LIMITE_JORNADA_H,
    atencao: horas > LIMITE_JORNADA_H - 1 && horas <= LIMITE_JORNADA_H,
  };
}

export function formatarHoras(horas: number): string {
  const total = Math.round(horas * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}
