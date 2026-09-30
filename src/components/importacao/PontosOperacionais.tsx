import type { RotaOperacional } from "@/lib/domain/types";
import { litros } from "@/lib/format";

export function PontosOperacionais({ rotas }: { rotas: RotaOperacional[] }) {
  const eventos = rotas.flatMap((rota) =>
    (rota.pontosOperacionais ?? []).map((ponto) => ({ rota, ponto })),
  );
  if (eventos.length === 0) return null;
  const quantidade = new Set(eventos.map(({ rota, ponto }) => `${rota.unidadeId}|${ponto.codigo}`))
    .size;

  return (
    <details className="mt-8 rounded-md border border-border bg-card">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium">
        Pontos operacionais J · {quantidade} ponto(s), {eventos.length} registro(s)
      </summary>
      <p className="px-4 pb-4 text-sm text-muted-foreground">
        Locais de transbordo, engate, lavagem, troca de motorista ou descarga. As atividades e os
        horários são os informados nos arquivos. Estes registros não contam como produtores, e seus
        volumes não são somados ao leite coletado dos produtores.
      </p>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Unidade / Rota / Ciclo</th>
              <th className="px-4 py-3 text-left">Ponto</th>
              <th className="px-4 py-3 text-left">Atividade</th>
              <th className="px-4 py-3 text-left">Horário</th>
              <th className="px-4 py-3 text-right">Volume informado no ponto</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map(({ rota, ponto }, indice) => (
              <tr
                key={`${rota.unidadeId}-${rota.codigo}-${rota.ciclo}-${indice}`}
                className="border-t border-border"
              >
                <td className="px-4 py-3">
                  {rota.unidadeId} / {rota.codigo} / {rota.ciclo === "par" ? "Par" : "Ímpar"}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{ponto.codigo}</span>
                  <span className="block text-muted-foreground">{ponto.nome}</span>
                </td>
                <td className="px-4 py-3">
                  {ponto.atividade}
                  <span className="block text-xs text-muted-foreground">{ponto.origemArquivo}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular">{ponto.hora}</td>
                <td className="px-4 py-3 text-right tabular">
                  {ponto.volumeInformadoL === undefined ? "—" : litros(ponto.volumeInformadoL)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
