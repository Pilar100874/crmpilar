import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAipTable } from "@/lib/aip/db";
import { AipWorkflow } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Copy, Pencil, PlayCircle, Trash2, Workflow } from "lucide-react";
import { WorkflowRunPanel } from "@/components/ia-platform/WorkflowRunPanel";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { items, loading, create, remove } = useAipTable<AipWorkflow>("aip_workflows");
  const [busca, setBusca] = useState("");
  const [excluir, setExcluir] = useState<AipWorkflow | null>(null);
  const [executar, setExecutar] = useState<AipWorkflow | null>(null);

  const filtrados = useMemo(
    () =>
      items.filter((w) =>
        `${w.nome} ${w.descricao ?? ""} ${w.categoria ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
      ),
    [items, busca],
  );

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        onNovo={() => navigate("/ia-platform/workflows/novo")}
        novoLabel="Novo workflow"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhum workflow criado. Monte o primeiro no builder visual."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((w) => (
            <Card key={w.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{w.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{w.categoria || "Sem categoria"}</p>
                    </div>
                  </div>
                  <Badge variant={w.ativo ? "default" : "secondary"}>{w.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{w.descricao || "—"}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">v{w.versao}</Badge>
                  <Badge variant="outline">{w.flow_data?.nodes?.length ?? 0} blocos</Badge>
                </div>
                <div className="flex flex-nowrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/ia-platform/workflows/${w.id}`)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Abrir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const { id, created_at, updated_at, estabelecimento_id, ...resto } = w as any;
                      create({ ...resto, nome: `${w.nome} (cópia)`, versao: 1 });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setExecutar(w)}>
                    <PlayCircle className="mr-1 h-3.5 w-3.5" /> Executar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(w)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      <WorkflowRunPanel
        open={!!executar}
        onOpenChange={(o) => !o && setExecutar(null)}
        workflowId={executar?.id}
        nomeWorkflow={executar?.nome}
      />

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome}
        onConfirm={async () => {
          if (excluir) await remove(excluir.id);
          setExcluir(null);
        }}
      />
    </>
  );
}
