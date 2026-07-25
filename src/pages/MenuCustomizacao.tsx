import { useEffect, useMemo, useState } from "react";
import { menuItems } from "@/components/Layout";
import {
  applyMenuCustomization,
  clearCustomization,
  CustomNode,
  extractPrograms,
  fetchRemoteCustomization,
  initialFromBase,
  loadCustomization,
  MenuCustomization,
  saveCustomization,
} from "@/lib/menuCustomization";
import { isSystemAdmin } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { Lock } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Folder,
  FileText,
} from "lucide-react";

type Path = number[];

function cloneTree(roots: CustomNode[]): CustomNode[] {
  return JSON.parse(JSON.stringify(roots));
}

function getSiblings(roots: CustomNode[], path: Path): CustomNode[] {
  if (path.length === 1) return roots;
  let node: any = { children: roots };
  for (let i = 0; i < path.length - 1; i++) {
    node = node.children[path[i]];
  }
  return node.children;
}

function getNode(roots: CustomNode[], path: Path): CustomNode {
  const sibs = getSiblings(roots, path);
  return sibs[path[path.length - 1]];
}

function removeAt(roots: CustomNode[], path: Path): CustomNode {
  const sibs = getSiblings(roots, path);
  const [removed] = sibs.splice(path[path.length - 1], 1);
  return removed;
}

function insertAt(roots: CustomNode[], parentPath: Path | null, index: number, node: CustomNode) {
  if (!parentPath || parentPath.length === 0) {
    roots.splice(index, 0, node);
    return;
  }
  let container: any = { children: roots };
  for (const idx of parentPath) container = container.children[idx];
  if (container.kind !== "container") return;
  container.children.splice(index, 0, node);
}

export default function MenuCustomizacao() {
  const [state, setState] = useState<MenuCustomization>(() => loadCustomization() || initialFromBase(menuItems));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Path | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const admin = await isSystemAdmin();
      setIsAdmin(admin);
      setCheckingAdmin(false);
      const remote = await fetchRemoteCustomization();
      if (remote) {
        setState(remote);
        setDirty(false);
      }
    })();
  }, []);

  const programs = useMemo(() => extractPrograms(menuItems), []);

  // pool of programs not yet placed
  const placedIds = useMemo(() => {
    const s = new Set<string>();
    const walk = (n: CustomNode) => {
      if (n.kind === "program") s.add(n.programId);
      else n.children.forEach(walk);
    };
    state.roots.forEach(walk);
    return s;
  }, [state]);

  const [poolSearch, setPoolSearch] = useState("");

  const unplaced = useMemo(
    () => Array.from(programs.values()).filter((p) => !placedIds.has(p.id)),
    [placedIds, programs]
  );

  const filteredUnplaced = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    if (!q) return unplaced;
    return unplaced.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.originContainerTitle || "").toLowerCase().includes(q)
    );
  }, [unplaced, poolSearch]);

  // Agrupa a piscina de programas por origem para uma "sequência única" organizada
  const groupedUnplaced = useMemo(() => {
    const groups = new Map<string, typeof filteredUnplaced>();
    for (const p of filteredUnplaced) {
      const key = p.originContainerTitle || (p.system ? "Sistema (rodapé)" : "Menu principal");
      if (!groups.has(key)) groups.set(key, [] as any);
      (groups.get(key) as any).push(p);
    }
    // Coloca "Admin" e "Admin (rodapé)" no topo, depois Sistema, depois o resto alfabético
    const order = (k: string) => {
      if (k === "Admin") return 0;
      if (k === "Admin (rodapé)") return 1;
      if (k.startsWith("Sistema")) return 2;
      return 3;
    };
    return Array.from(groups.entries()).sort((a, b) => {
      const oa = order(a[0]);
      const ob = order(b[0]);
      if (oa !== ob) return oa - ob;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredUnplaced]);

  const mutate = (fn: (roots: CustomNode[]) => void) => {
    if (!isAdmin) {
      toast.error("Somente administradores podem alterar o menu.");
      return;
    }
    setState((prev) => {
      const roots = cloneTree(prev.roots);
      fn(roots);
      return { ...prev, roots };
    });
    setDirty(true);
  };

  const pathKey = (p: Path) => p.join(".");

  const toggle = (p: Path) => setExpanded((e) => ({ ...e, [pathKey(p)]: !e[pathKey(p)] }));

  const startRename = (path: Path, current: string) => {
    setRenaming(pathKey(path));
    setRenameValue(current);
  };

  const commitRename = (path: Path) => {
    const val = renameValue.trim();
    if (!val) {
      setRenaming(null);
      return;
    }
    mutate((roots) => {
      const n = getNode(roots, path);
      if (n.kind === "container") n.title = val;
    });
    setRenaming(null);
  };

  const move = (path: Path, delta: number) => {
    mutate((roots) => {
      const sibs = getSiblings(roots, path);
      const i = path[path.length - 1];
      const j = i + delta;
      if (j < 0 || j >= sibs.length) return;
      [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
    });
  };

  // Indent: nest into previous sibling if it is a container
  const indent = (path: Path) => {
    mutate((roots) => {
      const sibs = getSiblings(roots, path);
      const i = path[path.length - 1];
      if (i === 0) return;
      const prev = sibs[i - 1];
      if (prev.kind !== "container") {
        toast.error("O item anterior precisa ser uma pasta para aninhar.");
        return;
      }
      const [node] = sibs.splice(i, 1);
      prev.children.push(node);
    });
  };

  // Outdent: move node up one level (to parent's parent, after parent)
  const outdent = (path: Path) => {
    if (path.length <= 1) return;
    mutate((roots) => {
      const parentPath = path.slice(0, -1);
      const grandParentPath = parentPath.slice(0, -1);
      const sibs = getSiblings(roots, path);
      const i = path[path.length - 1];
      const [node] = sibs.splice(i, 1);
      const targetSibs =
        grandParentPath.length === 0 ? roots : getSiblings(roots, [...grandParentPath, 0]);
      const parentIdx = parentPath[parentPath.length - 1];
      targetSibs.splice(parentIdx + 1, 0, node);
    });
  };

  const addContainer = (path: Path | null) => {
    const title = window.prompt("Nome da nova pasta / submenu:");
    if (!title || !title.trim()) return;
    const newNode: CustomNode = {
      kind: "container",
      id: `c-custom-${Date.now()}`,
      title: title.trim(),
      children: [],
    };
    mutate((roots) => {
      if (!path) {
        roots.push(newNode);
      } else {
        const n = getNode(roots, path);
        if (n.kind !== "container") {
          toast.error("Só é possível adicionar dentro de pastas.");
          return;
        }
        n.children.push(newNode);
      }
    });
    if (path) setExpanded((e) => ({ ...e, [pathKey(path)]: true }));
  };

  const addProgramInto = (path: Path | null, programId: string) => {
    mutate((roots) => {
      const newNode: CustomNode = { kind: "program", programId };
      if (!path) {
        roots.push(newNode);
      } else {
        const n = getNode(roots, path);
        if (n.kind !== "container") return;
        n.children.push(newNode);
      }
    });
    if (path) setExpanded((e) => ({ ...e, [pathKey(path)]: true }));
  };

  const doDelete = (path: Path) => {
    const node = getNode(state.roots, path);
    if (node.kind !== "container") {
      toast.error("Programas não podem ser excluídos, apenas pastas.");
      setConfirmDelete(null);
      return;
    }
    mutate((roots) => {
      // Move children up to parent, in place of the deleted container
      const sibs = getSiblings(roots, path);
      const i = path[path.length - 1];
      const removed = sibs.splice(i, 1)[0] as any;
      if (removed?.children?.length) {
        sibs.splice(i, 0, ...removed.children);
      }
    });
    setConfirmDelete(null);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      await saveCustomization(state);
      setDirty(false);
      toast.success("Menu salvo no banco. A configuração vale para todos os usuários deste estabelecimento.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar menu.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Restaurar menu padrão para todos os usuários deste estabelecimento?")) return;
    try {
      setSaving(true);
      await clearCustomization();
      setState(initialFromBase(menuItems));
      setDirty(false);
      toast.success("Menu restaurado ao padrão.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao restaurar menu.");
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop between any node -> container
  const [dragging, setDragging] = useState<{ kind: "node"; path: Path } | { kind: "program"; programId: string } | null>(null);

  const onDropOn = (targetPath: Path | null, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) return;
    if (dragging.kind === "program") {
      addProgramInto(targetPath, dragging.programId);
    } else {
      // Prevent dropping onto self or descendant
      const src = dragging.path;
      if (targetPath && src.length <= targetPath.length && src.every((v, i) => v === targetPath[i])) {
        setDragging(null);
        return;
      }
      mutate((roots) => {
        // Remove source
        const node = removeAt(roots, src);
        // Adjust target path if it shares ancestry after removal
        const adjusted: Path | null = targetPath ? [...targetPath] : null;
        if (adjusted) {
          for (let i = 0; i < src.length; i++) {
            if (i >= adjusted.length - 0) break;
            const samePrefix = src.slice(0, i).every((v, k) => v === adjusted[k]);
            if (samePrefix && src[i] < adjusted[i]) adjusted[i] -= 1;
          }
        }
        if (!adjusted || adjusted.length === 0) {
          roots.push(node);
        } else {
          const target = getNode(roots, adjusted);
          if (target && target.kind === "container") {
            target.children.push(node);
          } else {
            // if target is program, insert after it at parent
            const parent = adjusted.slice(0, -1);
            const idx = adjusted[adjusted.length - 1] + 1;
            insertAt(roots, parent.length ? parent : null, idx, node);
          }
        }
      });
    }
    setDragging(null);
  };

  const renderNode = (node: CustomNode, path: Path, depth: number) => {
    const key = pathKey(path);
    const isExpanded = expanded[key] ?? depth < 1;
    if (node.kind === "program") {
      const p = programs.get(node.programId);
      return (
        <div
          key={key}
          draggable
          onDragStart={(e) => {
            setDragging({ kind: "node", path });
            e.dataTransfer.effectAllowed = "move";
          }}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 group border border-transparent"
          style={{ marginLeft: depth * 20 }}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 cursor-grab" />
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{p?.title || `(programa ausente: ${node.programId})`}</span>
          <Badge variant="outline" className="text-[10px]">programa</Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(path, -1)} title="Subir">
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(path, 1)} title="Descer">
              <ArrowDown className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => outdent(path)} title="Diminuir nível" disabled={path.length <= 1}>
              <ArrowLeft className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => indent(path)} title="Aninhar na pasta anterior">
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div key={key}>
        <div
          draggable
          onDragStart={(e) => {
            setDragging({ kind: "node", path });
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (dragging) e.preventDefault();
          }}
          onDrop={(e) => onDropOn(path, e)}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 group border border-dashed border-transparent hover:border-primary/30"
          style={{ marginLeft: depth * 20 }}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 cursor-grab" />
          <button onClick={() => toggle(path)} className="p-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Folder className="w-4 h-4 text-primary" />
          {renaming === key ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(path);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="h-7 text-sm flex-1"
            />
          ) : (
            <span className="text-sm font-medium flex-1 truncate">{node.title}</span>
          )}
          <Badge variant="secondary" className="text-[10px]">{node.children.length}</Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startRename(path, node.title)} title="Renomear">
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addContainer(path)} title="Nova subpasta">
              <FolderPlus className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(path, -1)} title="Subir">
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(path, 1)} title="Descer">
              <ArrowDown className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => outdent(path)} title="Diminuir nível" disabled={path.length <= 1}>
              <ArrowLeft className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => indent(path)} title="Aninhar na pasta anterior">
              <ArrowRight className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setConfirmDelete(path)} title="Excluir pasta">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div>
            {node.children.map((c, i) => renderNode(c, [...path, i], depth + 1))}
            {node.children.length === 0 && (
              <div
                onDragOver={(e) => dragging && e.preventDefault()}
                onDrop={(e) => onDropOn(path, e)}
                className="text-xs text-muted-foreground italic py-2 px-3 border border-dashed rounded ml-8 my-1"
                style={{ marginLeft: (depth + 1) * 20 }}
              >
                Arraste programas ou pastas aqui
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">
      <div className="mb-6 rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-primary" />
              Personalizar Menu Principal
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Arraste programas para dentro do menu, crie pastas e subpastas, renomeie e reordene.
              A configuração é salva no banco e vale para todos os usuários do estabelecimento.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={!isAdmin || saving}>
              <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
            </Button>
            <Button onClick={handleSave} disabled={!isAdmin || !dirty || saving} className="shadow-sm">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : dirty ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </div>
        {dirty && (
          <div className="mt-3 text-xs text-primary font-medium">● Alterações não salvas</div>
        )}
      </div>

      {!checkingAdmin && !isAdmin && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Modo somente leitura.</strong> Apenas administradores podem alterar a estrutura do menu.
            Você está vendo a configuração atual definida pelo admin do estabelecimento.
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <Card
          className="p-0 overflow-hidden border-2"
          onDragOver={(e) => dragging && e.preventDefault()}
          onDrop={(e) => onDropOn(null, e)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <h2 className="font-semibold flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" /> Estrutura do menu
            </h2>
            <Button size="sm" variant="outline" onClick={() => addContainer(null)}>
              <Plus className="w-4 h-4 mr-1" /> Nova pasta na raiz
            </Button>
          </div>
          <ScrollArea className="h-[72vh]">
            <div className="p-3">
              {state.roots.map((r, i) => renderNode(r, [i], 0))}
              {state.roots.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed rounded-lg">
                  Menu vazio — arraste programas da direita para cá.
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-0 overflow-hidden border-2">
          <div className="px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Programas disponíveis
              </h2>
              <Badge variant="secondary" className="text-[10px]">{unplaced.length}</Badge>
            </div>
            <Input
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Buscar programa..."
              className="h-8 text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Arraste para o menu ou para uma pasta. Programas ficam agrupados pela origem.
            </p>
          </div>
          <ScrollArea className="h-[68vh]">
            <div className="p-3 space-y-4">
              {groupedUnplaced.length === 0 && (
                <div className="text-xs text-muted-foreground italic text-center py-8">
                  {poolSearch ? "Nenhum programa encontrado." : "Todos os programas já estão no menu."}
                </div>
              )}
              {groupedUnplaced.map(([origem, items]) => (
                <div key={origem}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-1">
                    {origem}
                    <span className="ml-1 text-muted-foreground/60">({items.length})</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((p) => {
                      const Icon = p.icon || FileText;
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={() => setDragging({ kind: "program", programId: p.id })}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md border bg-background hover:bg-primary/5 hover:border-primary/40 cursor-grab transition-colors"
                          title={p.title}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs flex-1 truncate">{p.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Excluir pasta?"
        description="Os programas dentro dela serão movidos para o nível acima. Programas nunca são excluídos."
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      />
    </div>
  );
}
