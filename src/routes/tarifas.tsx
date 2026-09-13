import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/ui-ccpr/PageHeader";
import { Kpi, KpiGrid, Tag } from "@/components/ui-ccpr/Kpi";
import { useDados } from "@/lib/data/store";
import { importarMatrizTarifas, type ResultadoImportacaoTarifas } from "@/lib/data/tariffImport";
import {
  associarTransportadorasImportadas,
  formatarCnpj,
  normalizarCnpj,
  validarTransportadora,
} from "@/lib/data/tariffs";
import type { Transportadora } from "@/lib/domain/types";
import { reais } from "@/lib/format";

export const Route = createFileRoute("/tarifas")({
  head: () => ({ meta: [{ title: "Tarifas e Transportadoras | Simulador Operacional CCPR" }] }),
  component: Tarifas,
});

interface Previa extends ResultadoImportacaoTarifas {
  arquivo: string;
}
const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const LIMITE_LINHAS = 20000;

function Tarifas() {
  const { unidadeAtivaId, tarifas, transportadoras, substituirTarifas, salvarTransportadora } =
    useDados();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().slice(0, 10));
  const [sigla, setSigla] = useState("");
  const [nome, setNome] = useState("");
  const [cnpjs, setCnpjs] = useState("");

  async function processarArquivo(file: File | undefined) {
    if (!file) return;
    setMensagem("");
    setPrevia(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setMensagem("Selecione uma planilha no formato .xlsx.");
      return;
    }
    if (file.size > LIMITE_ARQUIVO) {
      setMensagem("A planilha ultrapassa o limite de 10 MB.");
      return;
    }
    setCarregando(true);
    try {
      const { default: readXlsxFile } = await import("read-excel-file");
      const linhas = (await readXlsxFile(file)) as unknown[][];
      if (linhas.length > LIMITE_LINHAS + 1) {
        setMensagem(
          `A planilha ultrapassa o limite de ${LIMITE_LINHAS.toLocaleString("pt-BR")} registros.`,
        );
        return;
      }
      setPrevia({ ...importarMatrizTarifas(linhas, file.name), arquivo: file.name });
    } catch {
      setMensagem(
        "Não foi possível ler a planilha. Confirme se o arquivo .xlsx não está corrompido.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const vigentes = useMemo(
    () =>
      tarifas
        .filter(
          (t) =>
            t.unidadeId === unidadeAtivaId &&
            t.inicioVigencia <= dataReferencia &&
            (!t.fimVigencia || t.fimVigencia >= dataReferencia),
        )
        .sort(
          (a, b) =>
            a.transportadoraNome.localeCompare(b.transportadoraNome) ||
            a.tipoOrigem.localeCompare(b.tipoOrigem),
        ),
    [tarifas, unidadeAtivaId, dataReferencia],
  );
  const transportadorasPrevia = previa
    ? associarTransportadorasImportadas(transportadoras, previa.tarifas)
    : transportadoras;
  const vinculados = new Set(transportadorasPrevia.flatMap((item) => item.cnpjs));
  const semSigla = previa
    ? new Set(previa.tarifas.filter((t) => !vinculados.has(t.cnpj)).map((t) => t.cnpj)).size
    : 0;
  const erros = previa?.problemas.filter((p) => p.severidade === "erro") ?? [];

  function editar(item: Transportadora) {
    setSigla(item.sigla);
    setNome(item.nome);
    setCnpjs(item.cnpjs.map(formatarCnpj).join(", "));
    setMensagem("");
  }
  function salvar() {
    const item: Transportadora = {
      sigla: sigla.trim().toUpperCase(),
      nome: nome.trim(),
      cnpjs: [
        ...new Set(
          cnpjs
            .split(/[,;\n]+/)
            .map(normalizarCnpj)
            .filter(Boolean),
        ),
      ],
      ativa: true,
    };
    const problemas = validarTransportadora(item);
    if (problemas.length) {
      setMensagem(problemas.map((p) => p.mensagem).join(" "));
      return;
    }
    salvarTransportadora(item);
    setMensagem(`Transportadora ${item.sigla} salva.`);
    setSigla("");
    setNome("");
    setCnpjs("");
  }

  return (
    <>
      <PageHeader
        titulo="Tarifas e Transportadoras"
        descricao="A tarifa é localizada pela unidade, sigla da transportadora, CNPJ, equipamento e data da rota. O histórico de vigência é preservado."
        acoes={
          <Tag tom={tarifas.length ? "primario" : "atencao"}>
            {tarifas.length ? "Tabela carregada" : "Tabela pendente"}
          </Tag>
        }
      />
      <section>
        <SectionTitle hint="arquivo oficial .xlsx">Importar tabela de tarifas</SectionTitle>
        <div className="rounded-md border border-dashed border-border bg-surface p-6">
          <input
            id="arquivo-tarifas"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => void processarArquivo(e.target.files?.[0])}
          />
          <label
            htmlFor="arquivo-tarifas"
            className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {carregando ? "Lendo planilha…" : "Selecionar planilha"}
          </label>
          <p className="mt-3 text-sm text-muted-foreground">
            Limites: 10 MB e 20.000 registros. Nada é gravado antes da confirmação.
          </p>
        </div>
        {previa ? (
          <div className="mt-6">
            <KpiGrid>
              <Kpi rotulo="Linhas lidas" valor={String(previa.totalLinhas)} />
              <Kpi rotulo="Tarifas válidas" valor={String(previa.tarifas.length)} tom="primario" />
              <Kpi
                rotulo="Erros"
                valor={String(erros.length)}
                tom={erros.length ? "critico" : "neutro"}
              />
              <Kpi
                rotulo="CNPJs sem sigla"
                valor={String(semSigla)}
                tom={semSigla ? "atencao" : "neutro"}
              />
            </KpiGrid>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={!previa.tarifas.length || erros.length > 0}
                onClick={() => {
                  substituirTarifas(previa.tarifas);
                  setMensagem(`${previa.tarifas.length} tarifas importadas de ${previa.arquivo}.`);
                  setPrevia(null);
                }}
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                Confirmar e substituir tabela
              </button>
              <button
                type="button"
                onClick={() => setPrevia(null)}
                className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm"
              >
                Descartar prévia
              </button>
            </div>
            {previa.problemas.length ? (
              <div className="mt-5 overflow-hidden rounded-md border border-border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface text-sm text-muted-foreground">
                      <th className="py-3 pl-4 pr-3 text-left">Severidade</th>
                      <th className="px-3 py-3 text-left">Registro</th>
                      <th className="py-3 pl-3 pr-4 text-left">Ocorrência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.problemas.slice(0, 100).map((p, i) => (
                      <tr key={`${p.entidade}-${p.campo}-${i}`} className="border-t border-border">
                        <td className="py-3 pl-4 pr-3">
                          <Tag tom={p.severidade === "erro" ? "critico" : "atencao"}>
                            {p.severidade === "erro" ? "Erro" : "Alerta"}
                          </Tag>
                        </td>
                        <td className="px-3 py-3 text-sm">{p.entidade}</td>
                        <td className="py-3 pl-3 pr-4 text-sm">{p.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <section className="mt-10">
        <SectionTitle hint={`unidade ${unidadeAtivaId}`}>Tarifas vigentes</SectionTitle>
        <label className="mb-4 block w-56 text-sm">
          Data de referência
          <input
            type="date"
            value={dataReferencia}
            onChange={(e) => setDataReferencia(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"
          />
        </label>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="bg-surface text-sm text-muted-foreground">
                <th className="py-3 pl-4 pr-3 text-left">Sigla</th>
                <th className="px-3 py-3 text-left">Transportadora</th>
                <th className="px-3 py-3 text-left">CNPJ</th>
                <th className="px-3 py-3 text-left">Tipo</th>
                <th className="px-3 py-3 text-left">Início</th>
                <th className="px-3 py-3 text-right">Diária</th>
                <th className="py-3 pl-3 pr-4 text-right">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {vigentes.map((t) => {
                const v = transportadoras.find((x) => x.cnpjs.includes(t.cnpj));
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-3 pl-4 pr-3 text-sm">
                      {v?.sigla ?? <Tag tom="atencao">Sem sigla</Tag>}
                    </td>
                    <td className="px-3 py-3 text-sm">{t.transportadoraNome}</td>
                    <td className="px-3 py-3 text-sm">{formatarCnpj(t.cnpj)}</td>
                    <td className="px-3 py-3 text-sm">{t.tipoOrigem}</td>
                    <td className="px-3 py-3 text-sm">
                      {new Date(`${t.inicioVigencia}T00:00:00`).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-3 text-right text-sm">
                      {t.diaria === undefined ? "—" : reais(t.diaria)}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-sm">
                      {t.custoKm === undefined ? "—" : reais(t.custoKm)}
                    </td>
                  </tr>
                );
              })}
              {!vigentes.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma tarifa vigente para a unidade e data selecionadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-10">
        <SectionTitle hint="sigla Axiodis → CNPJ da tarifa">
          Cadastro de transportadoras
        </SectionTitle>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-md border border-border bg-card p-5">
            <label className="block text-sm">
              Sigla Axiodis
              <input
                value={sigla}
                maxLength={4}
                onChange={(e) => setSigla(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              Nome completo
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              CNPJ(s)
              <textarea
                value={cnpjs}
                onChange={(e) => setCnpjs(e.target.value)}
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2"
                placeholder="Separe por vírgula"
              />
            </label>
            <button
              type="button"
              onClick={salvar}
              className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Salvar transportadora
            </button>
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="bg-surface text-sm text-muted-foreground">
                  <th className="py-3 pl-4 pr-3 text-left">Sigla</th>
                  <th className="px-3 py-3 text-left">Transportadora</th>
                  <th className="px-3 py-3 text-left">CNPJ(s)</th>
                  <th className="py-3 pl-3 pr-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {transportadoras.map((t) => (
                  <tr key={t.sigla} className="border-t border-border">
                    <td className="py-3 pl-4 pr-3 text-sm font-medium">{t.sigla}</td>
                    <td className="px-3 py-3 text-sm">{t.nome}</td>
                    <td className="px-3 py-3 text-sm">
                      {t.cnpjs.length ? t.cnpjs.map(formatarCnpj).join(", ") : "Não informado"}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => editar(t)}
                        className="text-sm text-primary hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {mensagem ? <p className="mt-6 text-sm text-primary">{mensagem}</p> : null}
    </>
  );
}
