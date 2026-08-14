import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Upload,
  Truck,
  FileBarChart,
  ListOrdered,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { useDados } from "@/lib/data/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/roteirizacao", label: "Roteirização", icon: Map },
  { to: "/ranking", label: "Ranking de Rotas", icon: ListOrdered },
  { to: "/regioes", label: "Análise de Regiões", icon: Layers },
  { to: "/simulador", label: "Simulador", icon: SlidersHorizontal },
  { to: "/importacao", label: "Importação de Dados", icon: Upload },
  { to: "/equipamentos", label: "Equipamentos", icon: Truck },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unidades, unidadeAtivaId, setUnidadeAtiva, temDadosMock } = useDados();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between bg-primary px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Alternar menu"
            onClick={() => setMenuAberto((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-primary-foreground/90 transition-colors hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="text-[17px] tracking-wide text-primary-foreground">
            CCPR <span className="font-medium">CONECTA</span>
          </Link>
        </div>

        <div className="flex items-center gap-5">
          <select
            aria-label="Unidade"
            value={unidadeAtivaId}
            onChange={(e) => setUnidadeAtiva(e.target.value)}
            className="h-9 rounded-sm border border-white/30 bg-transparent px-2 text-sm text-primary-foreground outline-none"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id} className="text-foreground">
                {u.id} — {u.nome}
              </option>
            ))}
          </select>
          <span className="hidden text-sm text-primary-foreground/90 sm:inline">
            Analista Logístico
          </span>
          <button
            type="button"
            aria-label="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-sm text-primary-foreground/90 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <aside
        className={cn(
          "fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border bg-background transition-[width] duration-200",
          menuAberto ? "w-64" : "w-0 overflow-hidden border-r-0",
        )}
      >
        <nav className="py-4">
          {NAV.map((item) => {
            const ativo = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icone = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 border-l-2 px-5 py-3 text-[15px] transition-colors",
                  ativo
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-transparent text-foreground hover:bg-surface",
                )}
              >
                <Icone className={cn("h-4.5 w-4.5 shrink-0", ativo ? "text-primary" : "text-muted-foreground")} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </Link>
            );
          })}
        </nav>
        {temDadosMock ? (
          <div className="mx-5 mb-6 rounded-sm border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">DADOS DE TESTE</span>
            <br />
            Base fictícia carregada. Importe Route_now e Produtores_Rotas para operar com dados
            reais.
          </div>
        ) : null}
      </aside>

      <main className={cn("pt-16 transition-[padding] duration-200", menuAberto ? "pl-64" : "pl-0")}>
        <div className="mx-auto max-w-[1440px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
