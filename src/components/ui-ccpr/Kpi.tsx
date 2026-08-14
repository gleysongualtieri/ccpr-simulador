import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
      {children}
    </div>
  );
}

export function Kpi({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "neutro" | "primario" | "atencao" | "critico";
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</div>
      <div
        className={cn(
          "mt-2 text-2xl tabular",
          tom === "primario" && "text-primary",
          tom === "atencao" && "text-warning-foreground",
          tom === "critico" && "text-destructive",
          tom === "neutro" && "text-foreground",
        )}
      >
        {valor}
      </div>
      {detalhe ? <div className="mt-1 text-xs text-muted-foreground">{detalhe}</div> : null}
    </div>
  );
}

export function Tag({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "primario" | "lime" | "atencao" | "critico";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs whitespace-nowrap",
        tom === "neutro" && "border-border bg-surface text-muted-foreground",
        tom === "primario" && "border-primary/30 bg-primary-soft text-primary",
        tom === "lime" && "border-lime/50 bg-lime/20 text-lime-foreground",
        tom === "atencao" && "border-warning/40 bg-warning/10 text-warning-foreground",
        tom === "critico" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}
