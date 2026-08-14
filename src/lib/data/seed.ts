import type { Produtor, RotaOperacional, Unidade } from "@/lib/domain/types";

/**
 * DADOS DE TESTE — conjunto fictício usado apenas enquanto a importação real
 * (Route_now + Produtores_Rotas do Axiodis) não é executada.
 * Todo registro carrega origem.mock = true e é rotulado na interface.
 */

export const UNIDADES: Unidade[] = [
  { id: "0081", nome: "Uberlândia" },
  { id: "0042", nome: "Patos de Minas" },
];

const IMPORTADO_EM = "2026-08-12T09:00:00.000Z";

interface Def {
  codigo: string;
  unidadeId: string;
  regiao: string;
  ciclo: "par" | "impar";
  veiculo: string;
  transportadora: string;
  equipamentoId: string;
  volumeL: number;
  km: number;
  inicioRota: string;
  chegadaBase: string;
  trechos?: { motorista: string; inicio: string; fim: string }[];
}

const DEFS: Def[] = [
  { codigo: "2858D", unidadeId: "0081", regiao: "501", ciclo: "par", veiculo: "0081VIA12TR10", transportadora: "VIA", equipamentoId: "truck", volumeL: 9420, km: 268, inicioRota: "04:10", chegadaBase: "15:40" },
  { codigo: "2741D", unidadeId: "0081", regiao: "501", ciclo: "par", veiculo: "0081VIA18BT10", transportadora: "VIA", equipamentoId: "bitruck", volumeL: 14130, km: 302, inicioRota: "03:50", chegadaBase: "16:20" },
  { codigo: "2712D", unidadeId: "0081", regiao: "501", ciclo: "impar", veiculo: "0081TRL08TO04", transportadora: "TRL", equipamentoId: "toco", volumeL: 5120, km: 214, inicioRota: "04:30", chegadaBase: "14:05" },
  { codigo: "2801R", unidadeId: "0081", regiao: "502", ciclo: "par", veiculo: "0081VIA24TR20", transportadora: "VIA", equipamentoId: "truck_reboque", volumeL: 19850, km: 341, inicioRota: "03:20", chegadaBase: "16:50", trechos: [
    { motorista: "J. Ferreira", inicio: "03:20", fim: "14:40" },
    { motorista: "R. Andrade", inicio: "14:40", fim: "16:50" },
  ] },
  { codigo: "2803R", unidadeId: "0081", regiao: "502", ciclo: "impar", veiculo: "0081VIA30BT20", transportadora: "VIA", equipamentoId: "bitruck_reboque", volumeL: 21240, km: 388, inicioRota: "03:00", chegadaBase: "17:10" },
  { codigo: "2810R", unidadeId: "0081", regiao: "502", ciclo: "par", veiculo: "0081TRL16TO20", transportadora: "TRL", equipamentoId: "toco_reboque", volumeL: 11760, km: 296, inicioRota: "04:00", chegadaBase: "15:20" },
  { codigo: "2905A", unidadeId: "0081", regiao: "503", ciclo: "impar", veiculo: "0081TRL08TO04", transportadora: "TRL", equipamentoId: "toco", volumeL: 3980, km: 176, inicioRota: "05:00", chegadaBase: "13:30" },
  { codigo: "2908B", unidadeId: "0081", regiao: "503", ciclo: "par", veiculo: "0081TRL12TR10", transportadora: "TRL", equipamentoId: "truck", volumeL: 7420, km: 248, inicioRota: "04:40", chegadaBase: "15:05" },
  { codigo: "2911C", unidadeId: "0081", regiao: "503", ciclo: "impar", veiculo: "0081VIA12TR10", transportadora: "VIA", equipamentoId: "truck", volumeL: 6310, km: 265, inicioRota: "04:20", chegadaBase: "16:10" },
  { codigo: "2960E", unidadeId: "0081", regiao: "504", ciclo: "par", veiculo: "0081CPT08TO04", transportadora: "CPT", equipamentoId: "toco", volumeL: 4460, km: 198, inicioRota: "05:10", chegadaBase: "14:00" },
  { codigo: "2975S", unidadeId: "0081", regiao: "504", ciclo: "impar", veiculo: "0081VIA30CA30", transportadora: "VIA", equipamentoId: "carreta", volumeL: 27600, km: 214, inicioRota: "06:00", chegadaBase: "15:40" },
  { codigo: "2978S", unidadeId: "0081", regiao: "504", ciclo: "par", veiculo: "0081VIA45BI40", transportadora: "VIA", equipamentoId: "bitrem", volumeL: 38200, km: 262, inicioRota: "05:30", chegadaBase: "16:30" },
  { codigo: "3011D", unidadeId: "0081", regiao: "505", ciclo: "impar", veiculo: "0081TRL18BT10", transportadora: "TRL", equipamentoId: "bitruck", volumeL: 12880, km: 355, inicioRota: "03:40", chegadaBase: "17:20" },
  { codigo: "3016D", unidadeId: "0081", regiao: "505", ciclo: "par", veiculo: "0081TRL12TR10", transportadora: "TRL", equipamentoId: "truck", volumeL: 8140, km: 289, inicioRota: "04:15", chegadaBase: "16:00" },
  { codigo: "3020R", unidadeId: "0081", regiao: "505", ciclo: "impar", veiculo: "0081CPT24TR20", transportadora: "CPT", equipamentoId: "truck_reboque", volumeL: 17420, km: 372, inicioRota: "03:10", chegadaBase: "16:45" },
  { codigo: "4102D", unidadeId: "0042", regiao: "610", ciclo: "par", veiculo: "0042MGL12TR10", transportadora: "MGL", equipamentoId: "truck", volumeL: 8760, km: 254, inicioRota: "04:20", chegadaBase: "15:10" },
  { codigo: "4110R", unidadeId: "0042", regiao: "610", ciclo: "impar", veiculo: "0042MGL24TR20", transportadora: "MGL", equipamentoId: "truck_reboque", volumeL: 18320, km: 318, inicioRota: "03:30", chegadaBase: "16:15" },
  { codigo: "4130D", unidadeId: "0042", regiao: "611", ciclo: "par", veiculo: "0042MGL08TO04", transportadora: "MGL", equipamentoId: "toco", volumeL: 4210, km: 192, inicioRota: "05:00", chegadaBase: "13:50" },
];

export const ROTAS_MOCK: RotaOperacional[] = DEFS.map((d) => ({
  codigo: d.codigo,
  sufixoTipo: d.codigo.slice(-1) as RotaOperacional["sufixoTipo"],
  unidadeId: d.unidadeId,
  regiao: d.regiao,
  ciclo: d.ciclo,
  veiculo: d.veiculo,
  transportadora: d.transportadora,
  equipamentoId: d.equipamentoId,
  volumeL: d.volumeL,
  km: d.km,
  inicioRota: d.inicioRota,
  chegadaBase: d.chegadaBase,
  ...(d.trechos ? { trechos: d.trechos } : {}),
  origem: { arquivo: "DADOS DE TESTE", importadoEm: IMPORTADO_EM, mock: true },
}));

const NOMES = [
  "Fazenda Boa Vista", "Sítio São José", "Fazenda Santa Rita", "Granja Bela Vista",
  "Fazenda Aurora", "Sítio Recanto", "Fazenda Três Irmãos", "Fazenda Serra Azul",
  "Sítio Água Limpa", "Fazenda Palmeiras", "Fazenda Canaã", "Sítio Bom Jardim",
];

export const PRODUTORES_MOCK: Produtor[] = ROTAS_MOCK.flatMap((rota, ri) => {
  const qtd = 3 + (ri % 4);
  const base = Math.floor(rota.volumeL / qtd);
  return Array.from({ length: qtd }, (_, i) => {
    const matricula = String(100 + ri * 7 + i * 3).padStart(3, "0");
    const ultimo = i === qtd - 1;
    return {
      codigo: `205${rota.regiao}${matricula}`,
      nome: NOMES[(ri + i) % NOMES.length]!,
      cooperativa: "205",
      linha: rota.regiao,
      matricula,
      volumeL: ultimo ? rota.volumeL - base * (qtd - 1) : base,
      rotaCodigo: rota.codigo,
    } satisfies Produtor;
  });
});
