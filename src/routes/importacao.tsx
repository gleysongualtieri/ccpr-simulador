import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useDados } from "@/lib/data/store";
import {
  aplicarRegiaoDosProdutores,
  auditarBase,
  importarProdutoresRotas,
  importarRouteNow,
} from "@/lib/data/import";
import type { ProblemaQualidade, Produtor, RotaOperacional } from "@/lib/domain/types";
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
  problemas: ProblemaQualidade[];
  arquivos: string[];
}

function Importacao() {
  const { unidadeAtivaId, substituirBase, mesclarBase, restaurarDadosTeste, temDadosMock } =
    useDados();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function lerArquivoComEncodingCorreto(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const textoUtf8 = new TextDecoder("utf-8").decode(buffer);
    // Se a decodificação UTF-8 gerou caracteres de substituição (�),
    // o arquivo não é UTF-8 de verdade — refaz como Windows-1252.
    if (textoUtf8.includes("\uFFFD")) {
      return new TextDecoder("windows-1252").decode(buffer);
    }
    return textoUtf8;
  }

  async function processar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCarregando(true);
    setMensagem("");
    try {
      let rotas: RotaOperacional[] = [];
      let produtores: Produtor[] = [];
      const problemas: ProblemaQualidade[] = [];
      const arquivos: string[] = [];

      for (const file of Array.from(files)) {
        const texto = await lerArquivoComEncodingCorreto(file);
        arquivos.push(file.name);
        const nome = file.name.toLowerCase();
        const ehProdutores = nome.includes("produtor");
        const resultado = ehProdutores
          ? importarProdutoresRotas(texto, file.name)
          : importarRouteNow(texto, file.name, unidadeAtivaId);
        rotas = [...rotas, ...resultado.rotas];
        produtores = [...produtores, ...resultado.produtores];
        problemas.push(...resultado.problemas);
      }

      const rotasComRegiao = aplicarRegiaoDosProdutores(rotas, produtores);
      problemas.push(...auditarBase(rotasComRegiao, produtores));
      setPrevia({ rotas: rotasComRegiao, produtores, problemas, arquivos });
    } catch {
      setMensagem("Não foi possível ler os arquivos selecionados.");
    } finally {
      setCarregando(false);
    }
  }

  const erros = previa?.problemas.filter((p) => p.severidade === "erro") ?? [];
  const alertas = previa?.problemas.filter((p) => p.severidade === "alerta") ?? [];

  return (
    <>
      <PageHeader
        titulo="Importação de Dados"
        descricao="Selecione os arquivos exportados do Axiodis (Route_now e Produtores_Rotas) em CSV/TXT delimitado por ; ou ,. Nada é gravado antes da sua confirmação."
        acoes={
          temDadosMock ? <Tag tom="atencao">Base atual: dados de teste</Tag> : <Tag tom="primario">Base atual: dado real</Tag>
        }
      />

      <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center">
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
          O nome do arquivo define o tipo: contendo “produtor” é lido como Produtores_Rotas; os
          demais como Route_now.
        </p>
        {mensagem ? <p className="mt-3 text-sm text-destructive">{mensagem}</p> : null}
      </div>

      {previa ? (
        <>
          <div className="mt-8">
            <SectionTitle hint={previa.arquivos.join(", ")}>Prévia da importação</SectionTitle>
            <KpiGrid>
              <Kpi rotulo="Rotas lidas" valor={String(previa.rotas.length)} tom="primario" />
              <Kpi rotulo="Produtores lidos" valor={String(previa.produtores.length)} />
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
              disabled={previa.rotas.length === 0}
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
              disabled={previa.rotas.length === 0}
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

          {previa.problemas.length > 0 ? (
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
                    {previa.problemas.slice(0, 200).map((p, i) => (
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
            <SectionTitle hint="primeiras 20 rotas">Rotas a importar</SectionTitle>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface text-sm font-medium text-muted-foreground">
                    <th className="py-3 pl-4 pr-3 text-left">Rota</th>
                    <th className="px-3 py-3 text-left">Unidade</th>
                    <th className="px-3 py-3 text-left">Região</th>
                    <th className="px-3 py-3 text-left">Ciclo</th>
                    <th className="px-3 py-3 text-left">Veículo</th>
                    <th className="py-3 pl-3 pr-4 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.rotas.slice(0, 20).map((r) => (
                    <tr key={r.codigo} className="border-t border-border">
                      <td className="py-3 pl-4 pr-3 text-sm">{r.codigo}</td>
                      <td className="px-3 py-3 text-sm">{r.unidadeId}</td>
                      <td className="px-3 py-3 text-sm">{r.regiao}</td>
                      <td className="px-3 py-3 text-sm">{r.ciclo === "par" ? "Par" : "Ímpar"}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{r.veiculo}</td>
                      <td className="py-3 pl-3 pr-4 text-right text-sm tabular">
                        {litros(r.volumeL)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
