import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DeletableEntity =
  | "empresa"
  | "produto"
  | "veiculo"
  | "motorista"
  | "usuario"
  | "whatsapp_sessao"
  | "quick_reply"
  | "mensagem_grupo"
  | "agente_ia"
  | "cupom"
  | "tabela_preco"
  | "workflow_bot"
  | "workflow_tv"
  | "workflow_logistica"
  | "workflow_omni"
  | "contato";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: DeletableEntity;
  entityLabel?: string;
  id: string;
  name?: string;
  /** Delete function to execute if there are no dependencies */
  onDelete: () => Promise<void>;
  /** Called after successful inactivation */
  onInactivated?: () => void;
}

const ENTITY_KEY_MAP: Record<DeletableEntity, string> = {
  empresa: "empresa",
  produto: "produto",
  veiculo: "veiculo",
  motorista: "motorista",
  usuario: "usuario",
  whatsapp_sessao: "whatsapp_sessao",
  quick_reply: "quick_reply",
  mensagem_grupo: "mensagem_grupo",
  agente_ia: "agente_ia",
  cupom: "cupom",
  tabela_preco: "tabela_preco",
  workflow_bot: "workflow",
  workflow_tv: "workflow",
  workflow_logistica: "workflow",
  workflow_omni: "workflow",
  contato: "contato",
};

export function DeleteWithDependenciesDialog({
  open,
  onOpenChange,
  entity,
  entityLabel,
  id,
  name,
  onDelete,
  onInactivated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearingKey, setClearingKey] = useState<string | null>(null);
  const [deps, setDeps] = useState<Record<string, number> | null>(null);

  const refreshDeps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("check_entity_dependencies", {
        p_entity: ENTITY_KEY_MAP[entity],
        p_id: id,
      });
      if (error) throw error;
      setDeps((data as Record<string, number>) || {});
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao verificar dependências");
      setDeps({});
    } finally {
      setLoading(false);
    }
  };

  const handleClearDep = async (depKey: string) => {
    setClearingKey(depKey);
    try {
      const { error } = await supabase.rpc("clear_entity_dependency", {
        p_entity: entity,
        p_id: id,
        p_dep_key: depKey,
      });
      if (error) throw error;
      toast.success(`Vínculo "${depKey}" removido`);
      await refreshDeps();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao remover vínculo");
    } finally {
      setClearingKey(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDeps(null);
    refreshDeps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity, id]);

  const hasDeps = deps && Object.keys(deps).length > 0;
  const label = entityLabel || "registro";

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onDelete();
      toast.success(`${label} excluído(a) com sucesso`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  const handleInactivate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("inactivate_entity", {
        p_entity: entity,
        p_id: id,
      });
      if (error) throw error;
      toast.success(`${label} inativado(a) com sucesso`);
      onInactivated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao inativar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir {label}
            {name ? <span className="text-muted-foreground font-normal">— {name}</span> : null}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando vínculos no sistema...
                </div>
              ) : hasDeps ? (
                <>
                  <p className="text-sm">
                    Este {label} está sendo usado no sistema e <strong>não pode ser excluído</strong>.
                    Você pode <strong>inativá-lo</strong> para preservar o histórico.
                  </p>
                  <div className="rounded-md border bg-muted/40 divide-y max-h-72 overflow-y-auto">
                    {Object.entries(deps!).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2 p-2 text-sm">
                        <span className="flex-1 truncate">{k}</span>
                        <span className="font-mono font-semibold min-w-[2rem] text-right">{v}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive hover:bg-destructive/10"
                          disabled={busy || !!clearingKey}
                          onClick={() => handleClearDep(k)}
                        >
                          {clearingKey === k ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Excluir vínculos
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Remova os vínculos acima um a um para liberar a exclusão definitiva, ou use "Inativar" para preservar o histórico.
                  </p>
                </>
              ) : (
                <p className="text-sm">
                  Nenhum vínculo encontrado. Esta ação é <strong>irreversível</strong>. Deseja excluir
                  o {label} <strong>{name || id}</strong>?
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          {hasDeps ? (
            <Button variant="secondary" onClick={handleInactivate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
              Inativar
            </Button>
          ) : (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busy || loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
