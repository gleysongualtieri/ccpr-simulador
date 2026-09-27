import { useState } from "react";
import { useDados } from "@/lib/data/store";
import { SectionTitle } from "@/components/ui-ccpr/PageHeader";
import {
  criarProjeto,
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
  const [nome, setNome] = useState("");
  const [autor, setAutor] = useState("");
  const [previa, setPrevia] = useState<Projeto | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);

  function salvar() {
    setErro("");
    setMensagem("");
    try {
      const { unidades, rotas, produtores, simulacoes, tarifas, transportadoras, unidadeAtivaId } =
        dados;
      const projeto = criarProjeto(
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
      setPrevia(lerProjeto(await file.text()));
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
        O arquivo .ccpr reúne todas as unidades carregadas, rotas, produtores, capacidades, tarifas,
        transportadoras e simulações registradas. Não inclui os arquivos CSV/XLSX originais nem
        alterações de simulação ainda não registradas. Ao reabrir, os resultados são calculados com
        as regras da versão atual do simulador.
      </p>
      <p className="mb-4 text-sm">
        Base atual: {dados.rotas.length} rotas · {dados.produtores.length} vínculos de produtores ·{" "}
        {dados.simulacoes.length} simulações · {dados.tarifas.length} tarifas.
      </p>
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
          disabled={!dados.hidratado || !nome.trim() || !autor.trim()}
          onClick={salvar}
        >
          Salvar projeto atual (.ccpr)
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
          <p className="mt-2 text-sm">
            {previa.dados.rotas.length} rotas · {previa.dados.produtores.length} vínculos de
            produtores · {previa.dados.simulacoes.length} simulações · {previa.dados.tarifas.length}{" "}
            tarifas
          </p>
          <p className="mt-3 text-sm">
            Abrir substituirá todas as unidades, tarifas e simulações desta sessão pelo conteúdo do
            arquivo. Salve o projeto atual acima se quiser mantê-lo. Nada será mesclado
            automaticamente.
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
              disabled={!confirmado || !dados.hidratado}
              onClick={() => {
                try {
                  dados.abrirProjeto(previa);
                  aoAbrir();
                  setNome(previa.nome);
                  setAutor(previa.autor);
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
