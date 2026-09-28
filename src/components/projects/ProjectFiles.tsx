import { useState } from "react";
import { useDados } from "@/lib/data/store";
import { SectionTitle } from "@/components/ui-ccpr/PageHeader";
import {
  criarProjetoUnidade,
  dadosDaUnidade,
  lerProjeto,
  LIMITE_PROJETO_BYTES,
  nomeArquivoProjeto,
  serializarProjeto,
  type Projeto,
} from "@/lib/data/project";

const botao =
  "inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm disabled:opacity-40 disabled:cursor-not-allowed";
const campo = "mt-1 block h-11 w-full rounded-md border border-border bg-card px-3";

export function ProjectFiles({ aoAbrir }: { aoAbrir: () => void }) {
  const dados = useDados();
  const meta = dados.projetos.find((p) => p.unidadeId === dados.unidadeAtivaId);
  const nome = meta?.nome ?? "";
  const autor = meta?.autor ?? "";
  const setNome = (valor: string) => dados.identificarProjeto(valor, autor);
  const setAutor = (valor: string) => dados.identificarProjeto(nome, valor);
  const [unidadeParaAbrir, setUnidadeParaAbrir] = useState("");
  let resumo = null;
  let erroResumo = "";
  try {
    resumo = dadosDaUnidade(dados, dados.unidadeAtivaId);
  } catch (e) {
    erroResumo = e instanceof Error ? e.message : "Não foi possível separar a unidade.";
  }
  let resumoPrevia = null;

  const [previa, setPrevia] = useState<Projeto | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  if (previa) {
    try {
      resumoPrevia = dadosDaUnidade(previa.dados, unidadeParaAbrir);
    } catch {
      /* confirmação permanece bloqueada */
    }
  }

  function salvar() {
    setErro("");
    setMensagem("");
    try {
      const { unidades, rotas, produtores, simulacoes, tarifas, transportadoras, unidadeAtivaId } =
        dados;
      const projeto = criarProjetoUnidade(
        { unidades, rotas, produtores, simulacoes, tarifas, transportadoras, unidadeAtivaId },
        nome,
        autor,
      );
      const blob = new Blob([serializarProjeto(projeto)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivoProjeto(projeto);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMensagem(
        "Download solicitado. Confira o arquivo na pasta de downloads e guarde-o na pasta da unidade ou no SharePoint. Alterações posteriores exigem salvar uma nova versão.",
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o projeto.");
    }
  }

  async function selecionar(file?: File) {
    setPrevia(null);
    setConfirmado(false);
    setErro("");
    setMensagem("");
    if (!file) return;
    setLendo(true);
    try {
      if (file.size > LIMITE_PROJETO_BYTES) throw new Error("Selecione um projeto de até 8 MB.");
      const projeto = lerProjeto(await file.text());
      setPrevia(projeto);
      setUnidadeParaAbrir(projeto.dados.unidadeAtivaId);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler o projeto.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <section className="mb-10 rounded-md border border-border bg-card p-6">
      <SectionTitle hint="versões no computador ou na pasta compartilhada">
        Projetos salvos
      </SectionTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        O arquivo .ccpr salva somente a unidade selecionada, com suas rotas, produtores,
        capacidades, tarifas, transportadoras e simulações registradas. Não inclui os arquivos
        CSV/XLSX originais nem alterações de simulação ainda não registradas. Ao reabrir, os
        resultados são calculados com as regras da versão atual do simulador.
      </p>
      <p className="mb-4 text-sm">
        Unidade {dados.unidadeAtivaId}: {resumo?.rotas.length ?? "—"} rotas ·{" "}
        {resumo?.produtores.length ?? "—"} vínculos de produtores ·{" "}
        {resumo?.simulacoes.length ?? "—"} simulações · {resumo?.tarifas.length ?? "—"} tarifas.
      </p>
      {erroResumo && (
        <p role="alert" className="mb-4 text-destructive">
          {erroResumo}
        </p>
      )}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Nome da versão
          <input
            className={campo}
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Uberlândia — estudo de coleta"
          />
        </label>
        <label className="text-sm">
          Responsável por esta versão
          <input
            className={campo}
            maxLength={120}
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Informe seu nome"
          />
        </label>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        O responsável é informado por você; este registro não equivale a uma identificação por
        login.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={botao}
          disabled={!dados.hidratado || !nome.trim() || !autor.trim() || !resumo}
          onClick={salvar}
        >
          Salvar unidade atual (.ccpr)
        </button>
        <label className={`${botao} cursor-pointer`}>
          {lendo ? "Lendo projeto…" : "Selecionar projeto para abrir"}
          <input
            aria-label="Selecionar projeto para abrir"
            className="sr-only"
            type="file"
            accept=".ccpr"
            disabled={lendo || !dados.hidratado}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void selecionar(file);
            }}
          />
        </label>
      </div>
      {dados.erroPersistencia && (
        <p role="alert" className="mt-4 text-destructive">
          Não foi possível salvar a sessão no navegador. Salve um arquivo de projeto antes de fechar
          ou atualizar a página.
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-4 text-destructive">
          {erro}
        </p>
      )}
      {mensagem && (
        <p role="status" className="mt-4 text-sm">
          {mensagem}
        </p>
      )}
      {previa && (
        <div className="mt-6 rounded-md border border-border bg-surface p-4">
          <h3 className="font-medium">Prévia: {previa.nome}</h3>
          <p className="mt-2 text-sm">
            Responsável: {previa.autor} · Salvo em:{" "}
            {new Date(previa.salvoEm).toLocaleString("pt-BR")}
          </p>
          <p className="mt-2 text-sm">
            Unidades: {previa.dados.unidades.map((u) => `${u.id} — ${u.nome}`).join(", ")}
          </p>
          <label className="mt-3 block text-sm">
            Unidade a abrir
            <select
              className={campo}
              value={unidadeParaAbrir}
              onChange={(e) => {
                setUnidadeParaAbrir(e.target.value);
                setConfirmado(false);
              }}
            >
              {previa.dados.unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id} — {u.nome}
                </option>
              ))}
            </select>
          </label>
          {!resumoPrevia && (
            <p role="alert" className="mt-2 text-destructive">
              Não foi possível identificar a unidade de todos os registros deste arquivo. A abertura
              está bloqueada.
            </p>
          )}
          <p className="mt-2 text-sm">
            {resumoPrevia?.rotas.length ?? "—"} rotas · {resumoPrevia?.produtores.length ?? "—"}{" "}
            vínculos de produtores · {resumoPrevia?.simulacoes.length ?? "—"} simulações ·{" "}
            {resumoPrevia?.tarifas.length ?? "—"} tarifas
          </p>
          <p className="mt-3 text-sm">
            Abrir substituirá as rotas, produtores, tarifas e simulações apenas da unidade{" "}
            {unidadeParaAbrir}. As outras unidades serão preservadas. Salve a versão atual dessa
            unidade antes de substituí-la, se precisar mantê-la.
          </p>
          <label className="my-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
            />
            Já salvei o trabalho atual ou posso substituí-lo.
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className={`${botao} bg-primary text-primary-foreground`}
              disabled={!confirmado || !dados.hidratado || !resumoPrevia}
              onClick={() => {
                try {
                  dados.abrirProjeto(previa, unidadeParaAbrir);
                  aoAbrir();

                  setPrevia(null);
                  setConfirmado(false);
                  setErro("");
                  setMensagem(
                    "Projeto aberto. Os dados e as tarifas do arquivo estão disponíveis para análise nesta sessão.",
                  );
                } catch (e) {
                  setErro(e instanceof Error ? e.message : "Não foi possível abrir o projeto.");
                }
              }}
            >
              Confirmar abertura
            </button>
            <button
              type="button"
              className={botao}
              onClick={() => {
                setPrevia(null);
                setConfirmado(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
