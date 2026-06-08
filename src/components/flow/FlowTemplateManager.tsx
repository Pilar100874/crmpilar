import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Library, Save, Trash2, FileText, Clock, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export interface FlowTemplate {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
}

interface FlowTemplateManagerProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodes?: Node[];
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void;
}

async function fetchTemplates(): Promise<FlowTemplate[]> {
  const estabId = await getEstabelecimentoId();
  if (!estabId) return [];
  const { data, error } = await supabase
    .from("flow_templates" as any)
    .select("id, name, description, nodes, edges, created_at")
    .eq("estabelecimento_id", estabId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Erro ao carregar modelos:", error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    nodes: (r.nodes as Node[]) || [],
    edges: (r.edges as Edge[]) || [],
    createdAt: r.created_at,
  }));
}

export function FlowTemplateManager({
  nodes,
  edges,
  selectedNodes = [],
  onLoadTemplate,
}: FlowTemplateManagerProps) {
  const [openList, setOpenList] = useState(false);
  const [openSave, setOpenSave] = useState(false);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [toDelete, setToDelete] = useState<FlowTemplate | null>(null);

  useEffect(() => {
    if (openList || openSave) setTemplates(loadTemplates());
  }, [openList, openSave]);

  const hasSelection = selectedNodes.length > 0;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Informe um nome para o modelo");
      return;
    }
    const sourceNodes =
      onlySelected && hasSelection ? selectedNodes : nodes;
    const ids = new Set(sourceNodes.map((n) => n.id));
    const sourceEdges = edges.filter(
      (e) => ids.has(e.source) && ids.has(e.target)
    );

    if (sourceNodes.length === 0) {
      toast.error("Nada para salvar");
      return;
    }

    const list = loadTemplates();
    const tpl: FlowTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      description: desc.trim() || undefined,
      nodes: JSON.parse(JSON.stringify(sourceNodes)),
      edges: JSON.parse(JSON.stringify(sourceEdges)),
      createdAt: new Date().toISOString(),
    };
    persistTemplates([tpl, ...list]);
    toast.success(`Modelo "${tpl.name}" salvo!`);
    setName("");
    setDesc("");
    setOnlySelected(false);
    setOpenSave(false);
  };

  const handleLoad = (tpl: FlowTemplate) => {
    // Re-id to allow inserting alongside existing nodes
    const idMap = new Map<string, string>();
    const offset = { x: 80, y: 80 };
    const newNodes: Node[] = tpl.nodes.map((n) => {
      const newId = `node_${Date.now()}_${Math.floor(Math.random() * 100000)}_${n.id}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        selected: false,
        position: {
          x: (n.position?.x ?? 0) + offset.x,
          y: (n.position?.y ?? 0) + offset.y,
        },
      };
    });
    const newEdges: Edge[] = tpl.edges.map((e) => ({
      ...e,
      id: `edge_${Date.now()}_${Math.floor(Math.random() * 100000)}_${e.id}`,
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
      selected: false,
    }));
    onLoadTemplate(newNodes, newEdges);
    toast.success(`Modelo "${tpl.name}" inserido!`);
    setOpenList(false);
  };

  const handleDelete = (tpl: FlowTemplate) => {
    const list = loadTemplates().filter((t) => t.id !== tpl.id);
    persistTemplates(list);
    setTemplates(list);
    toast.success("Modelo excluído");
    setToDelete(null);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpenSave(true)}
        className="h-8 px-2 hidden lg:flex"
        title="Salvar fluxo atual como modelo"
      >
        <Save className="h-4 w-4 mr-1.5" />
        <span className="hidden xl:inline">Salvar Modelo</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpenList(true)}
        className="h-8 px-2 hidden lg:flex"
        title="Inserir modelo salvo"
      >
        <Library className="h-4 w-4 mr-1.5" />
        <span className="hidden xl:inline">Modelos</span>
      </Button>

      {/* Save dialog */}
      <Dialog open={openSave} onOpenChange={setOpenSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>
              Modelos podem ser reutilizados em qualquer outro workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Roteiro de postagem IA"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>
            {hasSelection && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                />
                Salvar apenas os {selectedNodes.length} blocos selecionados
              </label>
            )}
            <div className="text-xs text-muted-foreground">
              {(onlySelected && hasSelection ? selectedNodes.length : nodes.length)}{" "}
              blocos serão salvos
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSave(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar modelo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* List dialog */}
      <Dialog open={openList} onOpenChange={setOpenList}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modelos salvos</DialogTitle>
            <DialogDescription>
              Clique em um modelo para inseri-lo no fluxo atual.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo salvo ainda
                </p>
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer group transition-colors"
                  onClick={() => handleLoad(t)}
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {t.description && (
                        <span className="truncate">{t.description}</span>
                      )}
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {format(new Date(t.createdAt), "dd/MM/yy HH:mm")}
                      </span>
                      <span className="shrink-0">• {t.nodes.length} blocos</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(t);
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => toDelete && handleDelete(toDelete)}
        title="Excluir modelo"
        description={`Tem certeza que deseja excluir o modelo "${toDelete?.name}"?`}
      />
    </>
  );
}
