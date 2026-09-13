/**
 * Modelo de dados — Simulador Operacional de Rota (PRD seção 7).
 * Estruturas puras, sem dependência de UI.
 */

export type SufixoRota = "D" | "R" | "A" | "B" | "C" | "E" | "S";

export type TipoEquipamento = "solteiro" | "reboque" | "especial";

export type CategoriaReboque = "comum" | "trucado";

export interface Equipamento {
  /** Identificador estável usado nas rotas e simulações */
  id: string;
  nome: string;
  tipo: TipoEquipamento;
  /** Capacidade nominal em litros */
  capacidadeL: number;
  /** Diária em R$ */
  diaria: number;
  /** Custo por km em R$ */
  custoKm: number;
  /** Siglas do Axiodis que mapeiam para este equipamento */
  siglas: string[];
}

export interface Transportadora {
  /** Sigla presente no código do veículo do Axiodis (ex.: VIA, TFL). */
  sigla: string;
  nome: string;
  /** Uma transportadora pode operar por mais de uma filial/CNPJ. */
  cnpjs: string[];
  ativa: boolean;
}

export interface TarifaTransporte {
  id: string;
  unidadeId: string;
  localNome: string;
  cnpj: string;
  transportadoraNome: string;
  codigoTarifa: string;
  tipoOrigem: string;
  /** Ausente para adicionais ou tipos ainda sem equivalência operacional confirmada. */
  equipamentoId?: string | undefined;
  /** Diferencia reboque comum (12/15 mil L) de trucado (18/21 mil L). */
  categoriaReboque?: CategoriaReboque | undefined;
  inicioVigencia: string;
  fimVigencia?: string | undefined;
  diaria?: number | undefined;
  custoKm?: number | undefined;
  valorKmInicio?: number | undefined;
  valorKmFim?: number | undefined;
  adicionalNoturno?: number | undefined;
  motoristaExtra?: number | undefined;
  atualizadaEm: string;
  origemArquivo: string;
}

export interface Produtor {
  /** Código completo: Cooperativa + Linha + Matrícula (ex.: 205501587) */
  codigo: string;
  nome: string;
  cooperativa: string;
  /** Segmento "Linha" do código — usado como região (PRD 6.6) */
  linha: string;
  matricula: string;
  volumeL: number;
  rotaCodigo: string;
  /** Unidade extraída do código do veículo no Produtores_Rotas. */
  unidadeId?: string | undefined;
  /** Ciclo derivado da data da coleta no arquivo Produtores_Rotas. */
  ciclo?: "par" | "impar" | undefined;
  /** ISO — data/hora da coleta, quando disponível no arquivo de origem. */
  dataColeta?: string | undefined;
}

export interface TrechoJornada {
  motorista: string;
  /** HH:MM */
  inicio: string;
  /** HH:MM */
  fim: string;
}

export interface RotaOperacional {
  codigo: string;
  sufixoTipo: SufixoRota;
  unidadeId: string;
  /** Região derivada da linha do produtor (PRD 6.6) */
  regiao: string;
  ciclo: "par" | "impar";
  /** Código bruto do veículo, ex.: 0081VIA18BT10 */
  veiculo: string;
  transportadora: string;
  equipamentoId: string;
  volumeL: number;
  km: number;
  /** HH:MM — início da rota */
  inicioRota: string;
  /** HH:MM — chegada na base (pesagem/Balanza, antes da descarga) */
  chegadaBase: string;
  /** ISO — data/hora do evento de início da execução, quando disponível */
  dataExecucao?: string | undefined;
  /** Trechos por motorista, quando houver troca de motorista registrada */
  trechos?: TrechoJornada[];
  /** Rastreabilidade */
  origem: OrigemDado;
  /** Capacidade real do veículo (cavalo + reboque, quando houver) */
  capacidadeRealL?: number | undefined;
  /** Capacidade nominal do cavalo (sem reboque) */
  capacidadeNominalL?: number | undefined;
  /** Capacidade do reboque escolhida para esta execução de rota R. */
  capacidadeReboqueL?: number | undefined;
}

export interface OrigemDado {
  arquivo: string;
  importadoEm: string;
  /** true quando o registro é fictício de desenvolvimento */
  mock: boolean;
}

export interface Unidade {
  id: string;
  nome: string;
}

export interface SimulacaoRapida {
  id: string;
  rotaCodigo: string;
  rotaCiclo?: "par" | "impar" | undefined;
  criadaEm: string;
  aumentoVolumeL: number;
  aumentoKm: number;
  equipamentoIdSimulado: string;
  aplicado: boolean;
}

export interface ProblemaQualidade {
  severidade: "erro" | "alerta";
  entidade: string;
  campo: string;
  mensagem: string;
}
