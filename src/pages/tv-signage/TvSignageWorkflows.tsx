import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, Zap, Copy } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EVENTOS_SISTEMA } from "@/types/tvWorkflow";

export default function TvSignageWorkflows() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from("tv_workflows").select("*").order("created_at", { ascending: false });
    setLista(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const excluir = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("tv_workflows").delete().eq("id", confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído");
    setConfirmDelete(null);
    carregar();
  };

  const disparar = async (wf: any) => {
    const { data, error } = await supabase.functions.invoke("tv-workflow-dispatch", {
      body: { workflow_id: wf.id, evento: wf.evento, payload: {} },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Disparado para ${data?.execucoes ?? 0} dispositivo(s)`);
  };

  const duplicar = async (wf: any) => {
    const { id, created_at, updated_at, ...rest } = wf;
    const { error } = await supabase.from("tv_workflows").insert({
      ...rest,
      nome: `${wf.nome} (cópia)`,
      ativo: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicado");
    carregar();
  };

  const toggleAtivo = async (wf: any) => {
    const { error } = await supabase.from("tv_workflows").update({ ativo: !wf.ativo }).eq("id", wf.id);
    if (error) { toast.error(error.message); return; }
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workflows</h2>
          <p className="text-sm text-muted-foreground">
            Fluxos visuais em blocos que reagem a eventos do sistema e mostram mensagens/ações nas telas remotas.
          </p>
        </div>
        <Button onClick={() => navigate("/tv-signage/workflows/new/builder")}>
          <Plus className="w-4 h-4 mr-2" /> Novo workflow
        </Button>
      </div>

      {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Carregando…</Card>}

      {!loading && lista.length === 0 && (
        <Card className="p-10 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">Nenhum workflow cadastrado ainda.</p>
          <Button onClick={() => navigate("/tv-signage/workflows/new/builder")}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro workflow
          </Button>
        </Card>
      )}

      <div className="grid gap-3">
        {lista.map((wf) => {
          const flow = wf.flow_json || { nodes: [], edges: [] };
          const nBlocos = (flow.nodes || []).length;
          const evLabel = EVENTOS_SISTEMA.find((e) => e.value === wf.evento)?.label || wf.evento;
          return (
            <Card key={wf.id} className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: wf.estilo?.bg || "#0f172a", color: wf.estilo?.fg || "#fff" }}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/tv-signage/workflows/${wf.id}/builder`)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground truncate">{wf.nome}</span>
                  <Badge variant={wf.ativo ? "default" : "secondary"} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleAtivo(wf); }}>
                    {wf.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{evLabel}</Badge>
                  <Badge variant="outline">{nBlocos} bloco{nBlocos === 1 ? "" : "s"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate mt-1">
                  {wf.mensagem_template || "(sem mensagem principal)"}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Disparar agora" onClick={() => disparar(wf)}>
                  <Play className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" title="Duplicar" onClick={() => duplicar(wf)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/tv-signage/workflows/${wf.id}/builder`)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(wf)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={excluir}
        title="Excluir workflow?"
        description={confirmDelete ? `"${confirmDelete.nome}" será removido permanentemente.` : ""}
      />
    </div>
  );
}
