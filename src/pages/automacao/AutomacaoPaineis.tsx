import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, LayoutTemplate, Monitor, Pencil, Plus, Power, PowerOff, Smartphone, Tablet, Trash2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import AmbienteDialog from "@/components/automacao/AmbienteDialog";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  definirAtivoAmbiente, duplicarAmbiente, excluirAmbiente, listarAmbientes,
} from "@/lib/automacao/api";
import { supabase } from "@/integrations/supabase/client";
import { isAdministradorSistema } from "@/lib/portaria/porteiros";

const ICONE_TIPO: Record<TipoTela, typeof Monitor> = {
  tv: Tv,
  computador: Monitor,
  tablet: Tablet,
  celular: Smartphone,
};

/** Nome amigável do formato, para agrupar as telas por tamanho. */
function nomeFormato(a: Ambiente) {
  const l = a.tela_largura ?? TELA_PADRAO.largura;
  const alt = a.tela_altura ?? TELA_PADRAO.altura;
  const tipo = (a.dispositivo as TipoTela) ?? "tv";
  const conhecido = FORMATOS_TELA[tipo].find((f) => f.largura === l && f.altura === alt);
  return conhecido ? conhecido.label : `Tamanho personalizado (${l} × ${alt})`;
}

export default function AutomacaoPaineis() {
  const navegar = useNavigate();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [admin, setAdmin] = useState(false);
  const [edit, setEdit] = useState<Partial<Ambiente> | null>(null);
  const [excluir, setExcluir] = useState<Ambiente | null>(null);

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

  const nova = (tipo: TipoTela) => {
    const irmao = ambientes.find((a) => ((a.dispositivo as TipoTela) ?? "tv") === tipo);
    setEdit({
      nome: "",
      ordem: ambientes.length,
      dispositivo: tipo,
      tela_largura: irmao?.tela_largura ?? FORMATOS_TELA[tipo][0].largura,
      tela_altura: irmao?.tela_altura ?? FORMATOS_TELA[tipo][0].altura,
      rolagem: irmao?.rolagem ?? tipo === "celular",
      mostrar_abas: irmao?.mostrar_abas !== false,
    });
  };

  const duplicar = async (a: Ambiente) => {
    const copia = await duplicarAmbiente(a);
    if (!copia) { toast.error("Não foi possível copiar a tela."); return; }
    toast.success("Cópia criada.");
    carregar();
  };

  const alternarAtivo = async (a: Ambiente) => {
    const novo = a.ativo === false;
    await definirAtivoAmbiente(a.id, novo);
    toast.success(novo ? "Tela ativada." : "Tela desativada — só administradores veem.");
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    await excluirAmbiente(excluir.id);
    setExcluir(null);
    toast.success("Tela excluída.");
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Telas de automação</h2>
          <p className="text-sm text-muted-foreground">
            Escolha o aparelho, veja as telas já criadas e abra uma para montar os botões.
          </p>
        </div>
        {admin && (
          <Button className="ml-auto" onClick={() => nova("tv")}>
            <Plus className="h-4 w-4 mr-1" /> Nova tela
          </Button>
        )}
      </div>

      {TIPOS_TELA.map((tipo) => {
        const doTipo = visiveis.filter((a) => ((a.dispositivo as TipoTela) ?? "tv") === tipo.valor);
        const Icone = ICONE_TIPO[tipo.valor];
        const formatos = Array.from(new Set(doTipo.map(nomeFormato)));
        return (
          <section key={tipo.valor} className="rounded-2xl border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Icone className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight">{tipo.label}</h3>
                <p className="text-xs text-muted-foreground">{tipo.descricao}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {doTipo.length} {doTipo.length === 1 ? "tela" : "telas"}
              </span>
              {admin && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => nova(tipo.valor)}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              )}
            </header>

            {doTipo.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma tela criada para este aparelho.</p>
            ) : (
              formatos.map((formato) => (
                <div key={formato} className="border-b last:border-b-0 px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{formato}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {doTipo.filter((a) => nomeFormato(a) === formato).map((a) => (
                      <div
                        key={a.id}
                        className="group rounded-xl border bg-background p-3 transition hover:border-primary/60 hover:shadow-sm"
                      >
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 text-left"
                          onClick={() => navegar(`/automacao/painel/${a.id}`)}
                        >
                          <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{a.nome}</span>
                            <span className="block text-xs text-muted-foreground">
                              {(a.tela_largura ?? TELA_PADRAO.largura)} × {(a.tela_altura ?? TELA_PADRAO.altura)}
                              {a.rolagem ? " · rola para baixo" : ""}
                            </span>
                          </span>
                          {a.ativo === false && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              desativada
                            </span>
                          )}
                        </button>
                        {admin && (
                          <div className="mt-2 flex items-center gap-1 border-t pt-2">
                            <Button size="sm" variant="ghost" onClick={() => navegar(`/automacao/painel/${a.id}`)}>
                              Abrir
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar dados da tela"
                              onClick={() => setEdit(a)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicar tela"
                              onClick={() => duplicar(a)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              title={a.ativo === false ? "Ativar tela" : "Desativar tela"}
                              onClick={() => alternarAtivo(a)}
                            >
                              {a.ativo === false
                                ? <PowerOff className="h-4 w-4 text-muted-foreground" />
                                : <Power className="h-4 w-4 text-emerald-500" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto text-destructive"
                              title="Excluir tela" onClick={() => setExcluir(a)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        );
      })}

      <AmbienteDialog ambiente={edit} onChange={setEdit} onSalvo={carregar} />

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
