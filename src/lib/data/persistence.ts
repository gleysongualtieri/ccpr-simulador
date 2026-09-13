import { z } from "zod";
import type {
  Produtor,
  RotaOperacional,
  SimulacaoRapida,
  TarifaTransporte,
  Transportadora,
  Unidade,
} from "../domain/types.ts";

const LIMITE_ESTADO_LOCAL_CARACTERES = 8 * 1024 * 1024;
const texto = (maximo: number) => z.string().max(maximo);
const numero = z.number().finite().min(0).max(1_000_000_000);

const origem = z.object({
  arquivo: texto(255),
  importadoEm: texto(64),
  mock: z.boolean(),
});
const unidade = z.object({ id: texto(20), nome: texto(200) });
const trecho = z.object({ motorista: texto(200), inicio: texto(10), fim: texto(10) });
const rota = z.object({
  codigo: texto(50),
  sufixoTipo: z.enum(["D", "R", "A", "B", "C", "E", "S"]),
  unidadeId: texto(20),
  regiao: texto(50),
  ciclo: z.enum(["par", "impar"]),
  veiculo: texto(100),
  transportadora: texto(20),
  equipamentoId: texto(50),
  volumeL: numero,
  km: numero,
  inicioRota: texto(10),
  chegadaBase: texto(10),
  dataExecucao: texto(64).optional(),
  trechos: z.array(trecho).max(100).optional(),
  origem,
  capacidadeRealL: numero.optional(),
  capacidadeNominalL: numero.optional(),
  capacidadeReboqueL: numero.optional(),
});
const produtor = z.object({
  codigo: texto(50),
  nome: texto(300),
  cooperativa: texto(50),
  linha: texto(50),
  matricula: texto(50),
  volumeL: numero,
  rotaCodigo: texto(50),
  unidadeId: texto(20).optional(),
  ciclo: z.enum(["par", "impar"]).optional(),
  dataColeta: texto(64).optional(),
});
const simulacao = z.object({
  id: texto(100),
  rotaCodigo: texto(50),
  rotaCiclo: z.enum(["par", "impar"]).optional(),
  criadaEm: texto(64),
  aumentoVolumeL: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  aumentoKm: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  equipamentoIdSimulado: texto(50),
  aplicado: z.boolean(),
});
const tarifa = z.object({
  id: texto(500),
  unidadeId: texto(20),
  localNome: texto(300),
  cnpj: z.string().regex(/^\d{14}$/),
  transportadoraNome: texto(300),
  codigoTarifa: texto(100),
  tipoOrigem: texto(100),
  equipamentoId: texto(50).optional(),
  categoriaReboque: z.enum(["comum", "trucado"]).optional(),
  inicioVigencia: texto(32),
  fimVigencia: texto(32).optional(),
  diaria: numero.optional(),
  custoKm: numero.optional(),
  valorKmInicio: numero.optional(),
  valorKmFim: numero.optional(),
  adicionalNoturno: numero.optional(),
  motoristaExtra: numero.optional(),
  atualizadaEm: texto(64),
  origemArquivo: texto(255),
});
const transportadora = z.object({
  sigla: z.string().regex(/^[A-Z]{2,4}$/),
  nome: texto(300),
  cnpjs: z.array(z.string().regex(/^\d{14}$/)).max(100),
  ativa: z.boolean(),
});

const estadoPersistido = z
  .object({
    unidades: z.array(unidade).max(500),
    rotas: z.array(rota).max(50_000),
    produtores: z.array(produtor).max(100_000),
    simulacoes: z.array(simulacao).max(10_000),
    tarifas: z.array(tarifa).max(50_000),
    transportadoras: z.array(transportadora).max(1_000),
    unidadeAtivaId: texto(20),
  })
  .partial()
  .strict();

export interface EstadoPersistido {
  unidades?: Unidade[];
  rotas?: RotaOperacional[];
  produtores?: Produtor[];
  simulacoes?: SimulacaoRapida[];
  tarifas?: TarifaTransporte[];
  transportadoras?: Transportadora[];
  unidadeAtivaId?: string;
}

export function lerEstadoPersistido(bruto: string): EstadoPersistido | null {
  if (bruto.length > LIMITE_ESTADO_LOCAL_CARACTERES) return null;
  try {
    const resultado = estadoPersistido.safeParse(JSON.parse(bruto));
    return resultado.success ? (resultado.data as EstadoPersistido) : null;
  } catch {
    return null;
  }
}
