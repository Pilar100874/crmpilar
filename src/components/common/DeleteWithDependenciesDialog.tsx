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
  const [deps, setDeps] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!open) return;
    setDeps(null);
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("check_entity_dependencies", {
          p_entity: ENTITY_KEY_MAP[entity],
          p_id: id,
        });
        if (error) {
          console.error(error);
          toast.error("Erro ao verificar dependências");
          setDeps({});
        } else {
          setDeps((data as Record<string, number>) || {});
        }
      } finally {
        setLoading(false);
      }
    })();
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
                  <div className="rounded-md border bg-muted/40 p-3 space-y-1 max-h-56 overflow-y-auto">
                    {Object.entries(deps!).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span>{k}</span>
                        <span className="font-mono font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para excluir definitivamente, primeiro remova os vínculos acima.
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
