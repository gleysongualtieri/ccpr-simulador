import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useDados } from "@/lib/data/store";
import {
  aplicarRegiaoDosProdutores,
  auditarBase,
  decodeTextoDoArquivo,
  identificarTipoArquivo,
  importarProdutoresRotas,
  importarRouteNow,
} from "@/lib/data/import";
import type { ProblemaQualidade, Produtor, RotaOperacional } from "@/lib/domain/types";
import { CAPACIDADES_REBOQUE_INICIAIS_L, getEquipamento } from "@/lib/calculations/equipment";
import { litros } from "@/lib/format";

export const Route = createFileRoute("/importacao")({
  head: () => ({
    meta: [
      { title: "Importação de Dados | Simulador Operacional CCPR" },
      {
        name: "description",
        content:
          "Carregue os arquivos Route_now e Produtores_Rotas do Axiodis, revise a auditoria de qualidade e confirme a substituição da base.",
      },
      { property: "og:title", content: "Importação de Dados | CCPR CONECTA" },
      {
        property: "og:description",
        content: "Importe a roteirização real com auditoria de qualidade antes de confirmar.",
      },
    ],
  }),
  component: Importacao,
});

interface Previa {
  rotas: RotaOperacional[];
  produtores: Produtor[];
  problemasImportacao: ProblemaQualidade[];
  arquivos: string[];
}

const TAMANHO_MAXIMO_ARQUIVO_BYTES = 10 * 1024 * 1024;
const QUANTIDADE_MAXIMA_ARQUIVOS = 20;

function Importacao() {
  const { unidadeAtivaId, substituirBase, mesclarBase, restaurarDadosTeste, temDadosMock } =
    useDados();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());

  async function lerArquivoComEncodingCorreto(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return decodeTextoDoArquivo(buffer);
  }

  async function processar(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (files.length > QUANTIDADE_MAXIMA_ARQUIVOS) {
      setMensagem(`Selecione no máximo ${QUANTIDADE_MAXIMA_ARQUIVOS} arquivos por importação.`);
      return;
    }
    if (!Number.isInteger(anoReferencia) || anoReferencia < 2000 || anoReferencia > 2100) {
      setMensagem("Informe um ano de referência válido entre 2000 e 2100.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      let rotas: RotaOperacional[] = [];
      let produtores: Produtor[] = [];
      const problemas: ProblemaQualidade[] = [];
      const arquivos: string[] = [];
      const tiposLidos = new Set<string>();

      for (const file of Array.from(files)) {
        if (file.size > TAMANHO_MAXIMO_ARQUIVO_BYTES) {
          problemas.push({
            severidade: "erro",
            entidade: file.name,
            campo: "arquivo",
            mensagem: "Arquivo acima do limite de 10 MB.",
          });
          continue;
        }
        const texto = await lerArquivoComEncodingCorreto(file);
        arquivos.push(file.name);
        const tipoArquivo = identificarTipoArquivo(texto);
        if (!tipoArquivo) {
          problemas.push({
            severidade: "erro",
            entidade: file.name,
            campo: "cabecalho",
            mensagem: "Tipo de arquivo não reconhecido pelo cabeçalho.",
          });
          continue;
        }
        tiposLidos.add(tipoArquivo);
        const resultado =
          tipoArquivo === "produtores_rotas"
            ? importarProdutoresRotas(texto, file.name, anoReferencia)
            : importarRouteNow(texto, file.name, unidadeAtivaId, anoReferencia);
        rotas = [...rotas, ...resultado.rotas];
        produtores = [...produtores, ...resultado.produtores];
        problemas.push(...resultado.problemas);
      }

      if (!tiposLidos.has("route_now")) {
        problemas.push({
          severidade: "erro",
          entidade: "Importação",
          campo: "arquivo",
          mensagem: "Selecione pelo menos um arquivo RouteNow.",
        });
      }
      if (!tiposLidos.has("produtores_rotas")) {
        problemas.push({
          severidade: "erro",
          entidade: "Importação",
          campo: "arquivo",
          mensagem: "Selecione pelo menos um arquivo Produtores_Rotas.",
        });
      }

      const rotasComRegiao = aplicarRegiaoDosProdutores(rotas, produtores);
      setPrevia({ rotas: rotasComRegiao, produtores, problemasImportacao: problemas, arquivos });
    } catch {
      setMensagem("Não foi possível ler os arquivos selecionados.");
    } finally {
      setCarregando(false);
    }
  }

  const problemas = previa
    ? [...previa.problemasImportacao, ...auditarBase(previa.rotas, previa.produtores)]
    : [];
  const erros = problemas.filter((p) => p.severidade === "erro");
  const alertas = problemas.filter((p) => p.severidade === "alerta");
  const produtoresUnicos = previa
    ? new Set(previa.produtores.map((produtor) => produtor.codigo)).size
    : 0;

  function informarCapacidadeReboque(indiceRota: number, capacidadeReboqueL: number | undefined) {
    setPrevia((atual) => {
      if (!atual) return atual;
      const rotas = atual.rotas.map((rota, indice) => {
        if (indice !== indiceRota) return rota;
        const capacidadeNominalL = rota.capacidadeNominalL ?? 0;
        return {
          ...rota,
          capacidadeReboqueL,
          capacidadeRealL:
            capacidadeReboqueL && capacidadeNominalL > 0
              ? capacidadeNominalL + capacidadeReboqueL
              : undefined,
        };
      });
      return { ...atual, rotas };
    });
  }

  return (
    <>
      <PageHeader
        titulo="Importação de Dados"
        descricao="Selecione os arquivos exportados do Axiodis (Route_now e Produtores_Rotas) em CSV/TXT delimitado por ; ou ,. Nada é gravado antes da sua confirmação."
        acoes={
          temDadosMock ? (
            <Tag tom="atencao">Base atual: dados de teste</Tag>
          ) : (
            <Tag tom="primario">Base atual: dado real</Tag>
          )
        }
      />

      <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center">
        <label htmlFor="ano-referencia" className="mb-5 block text-sm font-medium text-foreground">
          Ano de referência dos arquivos
          <input
            id="ano-referencia"
            type="number"
            min={2000}
            max={2100}
            value={anoReferencia}
            onChange={(e) => setAnoReferencia(Number(e.target.value))}
            className="mx-auto mt-2 block h-10 w-32 rounded-md border border-border bg-card px-3 text-center tabular"
          />
        </label>
        <input
          id="arquivos"
          type="file"
          multiple
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(e) => void processar(e.target.files)}
          className="hidden"
        />
        <label
          htmlFor="arquivos"
          className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {carregando ? "Lendo arquivos…" : "Selecionar arquivos"}
        </label>
        <p className="mt-3 text-sm text-muted-foreground">
          O tipo de arquivo é identificado pelo cabeçalho. As datas do Axiodis não trazem o ano.
        </p>
        {mensagem ? <p className="mt-3 text-sm text-destructive">{mensagem}</p> : null}
      </div>

      {previa ? (
        <>
          <div className="mt-8">
            <SectionTitle hint={previa.arquivos.join(", ")}>Prévia da importação</SectionTitle>
            <KpiGrid>
              <Kpi rotulo="Rotas lidas" valor={String(previa.rotas.length)} tom="primario" />
              <Kpi
                rotulo="Produtores únicos"
                valor={String(produtoresUnicos)}
                detalhe={`${previa.produtores.length} vínculos produtor–rota`}
              />
              <Kpi
                rotulo="Erros"
                valor={String(erros.length)}
                tom={erros.length ? "critico" : "neutro"}
              />
              <Kpi
                rotulo="Alertas"
                valor={String(alertas.length)}
                tom={alertas.length ? "atencao" : "neutro"}
              />
            </KpiGrid>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={previa.rotas.length === 0 || erros.length > 0}
              onClick={() => {
                substituirBase(previa.rotas, previa.produtores);
                setMensagem("Base substituída pelos dados importados.");
                setPrevia(null);
              }}
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Substituir base
            </button>
            <button
              type="button"
              disabled={previa.rotas.length === 0 || erros.length > 0}
              onClick={() => {
                mesclarBase(previa.rotas, previa.produtores);
                setMensagem("Dados mesclados à base real existente.");
                setPrevia(null);
              }}
              className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mesclar com base atual
            </button>
            <button
              type="button"
              onClick={() => setPrevia(null)}
              className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:bg-surface"
            >
              Descartar
            </button>
          </div>

          {problemas.length > 0 ? (
            <section className="mt-10">
              <SectionTitle hint="revise antes de confirmar">Auditoria de qualidade</SectionTitle>
              <div className="overflow-hidden rounded-md border border-border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface text-sm font-medium text-muted-foreground">
                      <th className="py-3 pl-4 pr-3 text-left">Severidade</th>
                      <th className="px-3 py-3 text-left">Registro</th>
                      <th className="px-3 py-3 text-left">Campo</th>
                      <th className="py-3 pl-3 pr-4 text-left">Ocorrência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemas.slice(0, 200).map((p, i) => (
                      <tr key={`${p.entidade}-${p.campo}-${i}`} className="border-t border-border">
                        <td className="py-3 pl-4 pr-3">
                          <Tag tom={p.severidade === "erro" ? "critico" : "atencao"}>
                            {p.severidade === "erro" ? "Erro" : "Alerta"}
                          </Tag>
                        </td>
                        <td className="px-3 py-3 text-sm">{p.entidade}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{p.campo}</td>
                        <td className="py-3 pl-3 pr-4 text-sm">{p.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-10">
            <SectionTitle hint="revise todas as rotas antes de confirmar">
              Rotas a importar
            </SectionTitle>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface text-sm font-medium text-muted-foreground">
                    <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                    <th className="px-3 py-3 text-left">Unidade</th>
                    <th className="px-3 py-3 text-left">Região</th>
                    <th className="px-3 py-3 text-left">Ciclo</th>
                    <th className="px-3 py-3 text-left">Veículo</th>
                    <th className="px-3 py-3 text-left">Reboque (L)</th>
                    <th className="px-3 py-3 text-right">Capacidade total</th>
                    <th className="py-3 pl-3 pr-4 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.rotas.map((r, indice) => {
                    const exigeReboque = getEquipamento(r.equipamentoId)?.tipo === "reboque";
                    return (
                      <tr
                        key={`${r.unidadeId}-${r.codigo}-${r.ciclo}`}
                        className="border-t border-border"
                      >
                        <td className="py-3 pl-4 pr-3 text-sm">{r.codigo}</td>
                        <td className="px-3 py-3 text-sm">{r.unidadeId}</td>
                        <td className="px-3 py-3 text-sm">{r.regiao}</td>
                        <td className="px-3 py-3 text-sm">{r.ciclo === "par" ? "Par" : "Ímpar"}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{r.veiculo}</td>
                        <td className="px-3 py-3 text-sm">
                          {exigeReboque ? (
                            <input
                              type="number"
                              min={1000}
                              step={1000}
                              list="capacidades-reboque"
                              value={r.capacidadeReboqueL ?? ""}
                              onChange={(e) => {
                                const valor = Number(e.target.value);
                                informarCapacidadeReboque(indice, valor > 0 ? valor : undefined);
                              }}
                              aria-label={`Capacidade do reboque da rota ${r.codigo}`}
                              className="h-9 w-32 rounded-md border border-border bg-card px-2 text-right tabular"
                              placeholder="Obrigatório"
                            />
                          ) : (
                            "T2 — não se aplica"
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular">
                          {r.capacidadeRealL ? litros(r.capacidadeRealL) : "Pendente"}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right text-sm tabular">
                          {litros(r.volumeL)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="capacidades-reboque">
                {CAPACIDADES_REBOQUE_INICIAIS_L.map((capacidade) => (
                  <option key={capacidade} value={capacidade} />
                ))}
              </datalist>
            </div>
          </section>
        </>
      ) : null}

      <section className="mt-12 border-t border-border pt-6">
        <SectionTitle hint="ambiente de avaliação">Base de demonstração</SectionTitle>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Restaura a base fictícia de Uberlândia e Patos de Minas para navegar pelo sistema sem
          dados reais. Todos os registros ficam marcados como DADOS DE TESTE.
        </p>
        <button
          type="button"
          onClick={() => {
            restaurarDadosTeste();
            setMensagem("Base de demonstração restaurada.");
          }}
          className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-foreground transition-colors hover:bg-surface"
        >
          Restaurar dados de teste
        </button>
      </section>
    </>
  );
}
