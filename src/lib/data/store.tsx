import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Produtor, RotaOperacional, SimulacaoRapida, Unidade } from "@/lib/domain/types";
import { PRODUTORES_MOCK, ROTAS_MOCK, UNIDADES } from "./seed";

/**
 * Repositório de dados da aplicação.
 * Hoje persiste no navegador; o contrato (RepositorioDados) é o ponto de
 * troca para um backend futuro, sem alterar telas nem motor de cálculo.
 */

const CHAVE = "ccpr.simulador-operacional.v1";

interface Estado {
  unidades: Unidade[];
  rotas: RotaOperacional[];
  produtores: Produtor[];
  simulacoes: SimulacaoRapida[];
  unidadeAtivaId: string;
}

interface RepositorioDados extends Estado {
  hidratado: boolean;
  temDadosMock: boolean;
  setUnidadeAtiva: (id: string) => void;
  substituirBase: (rotas: RotaOperacional[], produtores: Produtor[]) => void;
  mesclarBase: (rotas: RotaOperacional[], produtores: Produtor[]) => void;
  restaurarDadosTeste: () => void;
  registrarSimulacao: (s: Omit<SimulacaoRapida, "id" | "criadaEm">) => void;
  marcarAplicada: (id: string, aplicado: boolean) => void;
  removerSimulacao: (id: string) => void;
}

const estadoInicial: Estado = {
  unidades: UNIDADES,
  rotas: ROTAS_MOCK,
  produtores: PRODUTORES_MOCK,
  simulacoes: [],
  unidadeAtivaId: UNIDADES[0]!.id,
};

const Ctx = createContext<RepositorioDados | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) setEstado({ ...estadoInicial, ...(JSON.parse(bruto) as Estado) });
    } catch {
      /* base local corrompida — mantém o estado padrão */
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* quota indisponível — a sessão continua funcionando em memória */
    }
  }, [estado, hidratado]);

  const unidadesDe = (rotas: RotaOperacional[]): Unidade[] => {
    const ids = [...new Set(rotas.map((r) => r.unidadeId))];
    return ids.map((id) => UNIDADES.find((u) => u.id === id) ?? { id, nome: `Unidade ${id}` });
  };

  const substituirBase = useCallback((rotas: RotaOperacional[], produtores: Produtor[]) => {
    setEstado((prev) => {
      const unidades = unidadesDe(rotas);
      return {
        ...prev,
        rotas,
        produtores,
        unidades: unidades.length ? unidades : prev.unidades,
        unidadeAtivaId: unidades[0]?.id ?? prev.unidadeAtivaId,
      };
    });
  }, []);

  const mesclarBase = useCallback((rotas: RotaOperacional[], produtores: Produtor[]) => {
    setEstado((prev) => {
      const reais = prev.rotas.filter((r) => !r.origem.mock);
      const produtoresReais = prev.produtores.filter(
        (p) => !PRODUTORES_MOCK.some((m) => m.codigo === p.codigo && m.rotaCodigo === p.rotaCodigo),
      );
      const mapaRotas = new Map(reais.map((r) => [r.codigo, r]));
      for (const r of rotas) mapaRotas.set(r.codigo, r);
      const novasRotas = [...mapaRotas.values()];

      const mapaProd = new Map(produtoresReais.map((p) => [`${p.codigo}@${p.rotaCodigo}`, p]));
      for (const p of produtores) mapaProd.set(`${p.codigo}@${p.rotaCodigo}`, p);

      const unidades = unidadesDe(novasRotas);
      return {
        ...prev,
        rotas: novasRotas,
        produtores: [...mapaProd.values()],
        unidades: unidades.length ? unidades : prev.unidades,
        unidadeAtivaId: unidades.some((u) => u.id === prev.unidadeAtivaId)
          ? prev.unidadeAtivaId
          : (unidades[0]?.id ?? prev.unidadeAtivaId),
      };
    });
  }, []);

  const valor = useMemo<RepositorioDados>(
    () => ({
      ...estado,
      hidratado,
      temDadosMock: estado.rotas.some((r) => r.origem.mock),
      setUnidadeAtiva: (id) => setEstado((p) => ({ ...p, unidadeAtivaId: id })),
      substituirBase,
      mesclarBase,
      restaurarDadosTeste: () =>
        setEstado((p) => ({
          ...p,
          rotas: ROTAS_MOCK,
          produtores: PRODUTORES_MOCK,
          unidades: UNIDADES,
          unidadeAtivaId: UNIDADES[0]!.id,
        })),
      registrarSimulacao: (s) =>
        setEstado((p) => ({
          ...p,
          simulacoes: [
            {
              ...s,
              id: `${s.rotaCodigo}-${Date.now()}`,
              criadaEm: new Date().toISOString(),
            },
            ...p.simulacoes,
          ].slice(0, 200),
        })),
      marcarAplicada: (id, aplicado) =>
        setEstado((p) => ({
          ...p,
          simulacoes: p.simulacoes.map((s) => (s.id === id ? { ...s, aplicado } : s)),
        })),
      removerSimulacao: (id) =>
        setEstado((p) => ({ ...p, simulacoes: p.simulacoes.filter((s) => s.id !== id) })),
    }),
    [estado, hidratado, substituirBase, mesclarBase],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados(): RepositorioDados {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDados deve ser usado dentro de DataProvider");
  return ctx;
}

/** Rotas da unidade ativa. */
export function useRotasUnidade(): RotaOperacional[] {
  const { rotas, unidadeAtivaId } = useDados();
  return useMemo(
    () => rotas.filter((r) => r.unidadeId === unidadeAtivaId),
    [rotas, unidadeAtivaId],
  );
}
