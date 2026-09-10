import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, LayoutTemplate, Monitor, Pencil, Plus, Settings, Smartphone, Tablet, Trash2, Tv, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import NovaTelaDialog from "@/components/automacao/NovaTelaDialog";
import TelaConfigDialog from "@/components/automacao/TelaConfigDialog";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  duplicarTela, excluirAmbiente, listarAmbientes, renomearTela,
} from "@/lib/automacao/api";
import { supabase } from "@/integrations/supabase/client";
import { isAdministradorSistema } from "@/lib/portaria/porteiros";

const ICONE_TIPO: Record<TipoTela, typeof Monitor> = {
  tv: Tv,
  computador: Monitor,
  tablet: Tablet,
  celular: Smartphone,
};

/** Nome amigável do formato, para mostrar o tamanho da tela. */
function nomeFormato(a: Ambiente) {
  const l = a.tela_largura ?? TELA_PADRAO.largura;
  const alt = a.tela_altura ?? TELA_PADRAO.altura;
  const tipo = (a.dispositivo as TipoTela) ?? "tv";
  const conhecido = FORMATOS_TELA[tipo].find((f) => f.largura === l && f.altura === alt);
  return conhecido ? conhecido.label : `${l} × ${alt}`;
}

/** Chave que junta as abas da mesma tela (mesmo aparelho + mesmo nome de tela). */
function chaveTela(a: Ambiente) {
  return `${(a.dispositivo as TipoTela) ?? "tv"}::${a.tela_nome?.trim() || a.nome}`;
}

interface TelaGrupo {
  chave: string;
  nome: string;
  dispositivo: TipoTela;
  abas: Ambiente[];
}

export default function AutomacaoPaineis() {
  const navegar = useNavigate();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [admin, setAdmin] = useState(false);
  const [novaTela, setNovaTela] = useState<{ tipo: TipoTela } | null>(null);
  const [excluirTela, setExcluirTela] = useState<TelaGrupo | null>(null);
  const [renomear, setRenomear] = useState<TelaGrupo | null>(null);
  const [configTela, setConfigTela] = useState<TelaGrupo | null>(null);
  const [novoNomeTela, setNovoNomeTela] = useState("");

  const carregar = useCallback(async () => {
    setAmbientes(await listarAmbientes());
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", uid).maybeSingle();
      setAdmin(await isAdministradorSistema(uid, (u as any)?.id ?? null));
    })();
  }, []);

  const visiveis = admin ? ambientes : ambientes.filter((a) => a.ativo !== false);

  /** Junta as abas que pertencem à mesma tela em um único grupo. */
  const telasDe = (tipo: TipoTela): TelaGrupo[] => {
    const mapa = new Map<string, TelaGrupo>();
    for (const a of visiveis.filter((x) => ((x.dispositivo as TipoTela) ?? "tv") === tipo)) {
      const chave = chaveTela(a);
      const grupo = mapa.get(chave);
      if (grupo) grupo.abas.push(a);
      else mapa.set(chave, {
        chave,
        nome: a.tela_nome?.trim() || a.nome,
        dispositivo: tipo,
        abas: [a],
      });
    }
    return Array.from(mapa.values());
  };

  /** Cria uma tela nova (a primeira aba nasce junto, com o nome da tela). */
  const nova = (tipo: TipoTela) => {
    setEdit({
      nome: "",
      tela_nome: "",
      ordem: ambientes.length,
      dispositivo: tipo,
      tela_largura: FORMATOS_TELA[tipo][0].largura,
      tela_altura: FORMATOS_TELA[tipo][0].altura,
      rolagem: tipo === "celular",
      mostrar_abas: true,
    });
  };

  /** Cria uma aba nova dentro de uma tela já existente, herdando o formato dela. */
  const novaAba = (grupo: TelaGrupo) => {
    const base = grupo.abas[0];
    setEdit({
      nome: "",
      tela_nome: grupo.nome,
      ordem: ambientes.length,
      dispositivo: grupo.dispositivo,
      tela_largura: base?.tela_largura ?? FORMATOS_TELA[grupo.dispositivo][0].largura,
      tela_altura: base?.tela_altura ?? FORMATOS_TELA[grupo.dispositivo][0].altura,
      rolagem: base?.rolagem === true,
      mostrar_abas: base?.mostrar_abas !== false,
    });
  };

  const confirmarRenomear = async () => {
    if (!renomear) return;
    const nome = novoNomeTela.trim();
    if (!nome) { toast.error("Informe o nome da tela."); return; }
    await renomearTela(renomear.dispositivo, renomear.nome, nome);
    toast.success("Tela renomeada.");
    setRenomear(null);
    carregar();
  };

  const [duplicando, setDuplicando] = useState(false);

  /** Duplica a tela inteira (todas as abas e elementos) em um novo cartão "(cópia)". */
  const confirmarDuplicacao = async (grupo: TelaGrupo) => {
    setDuplicando(true);
    const criados = await duplicarTela(grupo.abas);
    setDuplicando(false);
    if (criados > 0) toast.success(`Tela duplicada com ${criados} ${criados === 1 ? "aba" : "abas"}.`);
    else toast.error("Não foi possível duplicar a tela.");
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluirTela) return;
    for (const aba of excluirTela.abas) await excluirAmbiente(aba.id);
    setExcluirTela(null);
    toast.success("Tela excluída com todas as abas.");
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Telas de automação</h2>
          <p className="text-sm text-muted-foreground">
            Cada tela tem um nome e reúne as abas (ambientes) dela em um único cartão.
          </p>
        </div>
        {admin && (
          <Button className="ml-auto" onClick={() => nova("tv")}>
            <Plus className="h-4 w-4 mr-1" /> Nova tela
          </Button>
        )}
      </div>

      {TIPOS_TELA.map((tipo) => {
        const telas = telasDe(tipo.valor);
        const Icone = ICONE_TIPO[tipo.valor];
        return (
          <section key={tipo.valor} className="rounded-2xl border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Icone className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight">{tipo.label}</h3>
                <p className="text-xs text-muted-foreground">{tipo.descricao}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {telas.length} {telas.length === 1 ? "tela" : "telas"}
              </span>
              {admin && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => nova(tipo.valor)}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              )}
            </header>

            {telas.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma tela criada para este aparelho.</p>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {telas.map((grupo) => {
                  const primeira = grupo.abas[0];
                  return (
                    <div
                      key={grupo.chave}
                      className="group rounded-xl border bg-background p-3 transition hover:border-primary/60 hover:shadow-sm"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 text-left"
                        onClick={() => primeira && navegar(`/automacao/painel/${primeira.id}`)}
                      >
                        <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{grupo.nome}</span>
                          <span className="block text-xs text-muted-foreground">
                            {primeira ? nomeFormato(primeira) : ""}
                            {primeira?.rolagem ? " · rola para baixo" : ""}
                          </span>
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {grupo.abas.length} {grupo.abas.length === 1 ? "aba" : "abas"}
                        </span>
                      </button>

                      {/* Abas da tela */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {grupo.abas.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className={`rounded-full border px-2 py-0.5 text-xs ${a.ativo === false ? "line-through opacity-60" : "hover:text-primary"}`}
                            onClick={() => navegar(`/automacao/painel/${a.id}`)}
                          >
                            {a.nome}
                          </button>
                        ))}
                      </div>

                      {admin && (
                        <div className="mt-2 flex items-center gap-1 border-t pt-2">
                          <Button size="sm" variant="ghost" onClick={() => primeira && navegar(`/automacao/painel/${primeira.id}`)}>
                            Abrir
                          </Button>
                          <Button
                            size="sm" variant="ghost" title="Automações desta tela"
                            onClick={() =>
                              navegar(
                                `/automacao/regras?ambiente=${grupo.abas.map((a) => a.id).join(",")}&nome=${encodeURIComponent(grupo.nome)}`,
                              )
                            }
                          >
                            <Workflow className="h-4 w-4 mr-1" /> Automações
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8" title="Duplicar tela e todas as abas"
                            disabled={duplicando}
                            onClick={() => confirmarDuplicacao(grupo)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8" title="Configurar tela (formato/aparelho)"
                            onClick={() => setConfigTela(grupo)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8" title="Renomear tela"
                            onClick={() => { setRenomear(grupo); setNovoNomeTela(grupo.nome); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 ml-auto text-destructive"
                            title="Excluir tela e todas as abas"
                            onClick={() => setExcluirTela(grupo)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <AmbienteDialog ambiente={edit} onChange={setEdit} onSalvo={carregar} />

      <TelaConfigDialog
        abas={configTela?.abas ?? []}
        aberto={!!configTela}
        onFechar={() => setConfigTela(null)}
        onSalvo={carregar}
      />

      <Dialog open={!!renomear} onOpenChange={(o) => !o && setRenomear(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renomear tela</DialogTitle></DialogHeader>
          <div>
            <Label>Nome da tela</Label>
            <Input value={novoNomeTela} onChange={(e) => setNovoNomeTela(e.target.value)} autoFocus />
            <p className="mt-1 text-xs text-muted-foreground">
              Todas as {renomear?.abas.length ?? 0} abas desta tela passam a usar o novo nome.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenomear(null)}>Cancelar</Button>
            <Button onClick={confirmarRenomear}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluirTela}
        onOpenChange={(o) => !o && setExcluirTela(null)}
        onConfirm={confirmarExclusao}
        itemName={excluirTela ? `${excluirTela.nome} (e suas ${excluirTela.abas.length} abas)` : undefined}
      />
    </div>
  );
}
