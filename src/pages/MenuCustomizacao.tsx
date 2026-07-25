import { useEffect, useMemo, useState } from "react";
import { menuItems } from "@/components/Layout";
import {
  clearCustomization,
  CustomNode,
  extractPrograms,
  fetchRemoteCustomization,
  initialAdminFooterTree,
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
  Shield,
  LayoutGrid,
} from "lucide-react";
import { MenuIconPicker, resolveMenuIcon } from "@/components/menu/MenuIconPicker";

type TreeKey = "main" | "admin";
type Path = number[];

function cloneTree(roots: CustomNode[]): CustomNode[] {
  return JSON.parse(JSON.stringify(roots));
}
function getSiblings(roots: CustomNode[], path: Path): CustomNode[] {
  if (path.length === 1) return roots;
  let node: any = { children: roots };
  for (let i = 0; i < path.length - 1; i++) node = node.children[path[i]];
  return node.children;
}
function getNode(roots: CustomNode[], path: Path): CustomNode {
  return getSiblings(roots, path)[path[path.length - 1]];
}
function removeAt(roots: CustomNode[], path: Path): CustomNode {
  const sibs = getSiblings(roots, path);
  return sibs.splice(path[path.length - 1], 1)[0];
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
function collectIds(roots: CustomNode[], out: Set<string>) {
  for (const n of roots) {
    if (n.kind === "program") out.add(n.programId);
    else collectIds(n.children, out);
  }
}

export default function MenuCustomizacao() {
  const [mainRoots, setMainRoots] = useState<CustomNode[]>(
    () => (loadCustomization()?.roots) || initialFromBase(menuItems).roots
  );
  const [adminRoots, setAdminRoots] = useState<CustomNode[]>(
    () => (loadCustomization()?.adminRoots) || initialAdminFooterTree()
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ tree: TreeKey; path: Path } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState<{ roots: CustomNode[]; adminRoots: CustomNode[] } | null>(
    () => loadCustomization()?.baseline ?? null
  );

  useEffect(() => {
    (async () => {
      const admin = await isSystemAdmin();
      setIsAdmin(admin);
      setCheckingAdmin(false);
      const remote = await fetchRemoteCustomization();
      if (remote) {
        setMainRoots(remote.roots);
        setAdminRoots(remote.adminRoots ?? initialAdminFooterTree());
        setBaseline(remote.baseline ?? null);
        setDirty(false);
      }
    })();
  }, []);

  const programs = useMemo(() => extractPrograms(menuItems), []);

  const placedIds = useMemo(() => {
    const s = new Set<string>();
    collectIds(mainRoots, s);
    collectIds(adminRoots, s);
    return s;
  }, [mainRoots, adminRoots]);

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

  const groupedUnplaced = useMemo(() => {
    const groups = new Map<string, typeof filteredUnplaced>();
    for (const p of filteredUnplaced) {
      const key = p.originContainerTitle || (p.system ? "Sistema (rodapé)" : "Menu principal");
      if (!groups.has(key)) groups.set(key, [] as any);
      (groups.get(key) as any).push(p);
    }
    const order = (k: string) => {
      if (k === "Admin") return 0;
      if (k === "Admin (rodapé)") return 1;
      if (k.startsWith("Menu do usuário")) return 2;
      if (k.startsWith("Sistema")) return 3;
      return 4;
    };
    return Array.from(groups.entries()).sort((a, b) => {
      const oa = order(a[0]);
      const ob = order(b[0]);
      if (oa !== ob) return oa - ob;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredUnplaced]);

  const setTree = (tree: TreeKey, updater: (roots: CustomNode[]) => CustomNode[]) => {
    if (tree === "main") setMainRoots((r) => updater(r));
    else setAdminRoots((r) => updater(r));
  };

  const mutate = (tree: TreeKey, fn: (roots: CustomNode[]) => void) => {
    if (!isAdmin) {
      toast.error("Somente administradores podem alterar o menu.");
      return;
    }
    setTree(tree, (prev) => {
      const roots = cloneTree(prev);
      fn(roots);
      return roots;
    });
    setDirty(true);
  };

  const pathKey = (tree: TreeKey, p: Path) => `${tree}:${p.join(".")}`;
  const toggle = (tree: TreeKey, p: Path) =>
    setExpanded((e) => ({ ...e, [pathKey(tree, p)]: !e[pathKey(tree, p)] }));

  const startRename = (tree: TreeKey, path: Path, current: string) => {
    setRenaming(pathKey(tree, path));
    setRenameValue(current);
  };
  const commitRename = (tree: TreeKey, path: Path) => {
    const val = renameValue.trim();
    if (!val) return setRenaming(null);
    mutate(tree, (roots) => {
      const n = getNode(roots, path);
      if (n.kind === "container") n.title = val;
    });
    setRenaming(null);
  };

  const move = (tree: TreeKey, path: Path, delta: number) => {
    mutate(tree, (roots) => {
      const sibs = getSiblings(roots, path);
      const i = path[path.length - 1];
      const j = i + delta;
      if (j < 0 || j >= sibs.length) return;
      [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
    });
  };
  const indent = (tree: TreeKey, path: Path) => {
    mutate(tree, (roots) => {
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
  const outdent = (tree: TreeKey, path: Path) => {
    if (path.length <= 1) return;
    mutate(tree, (roots) => {
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

  const addContainer = (tree: TreeKey, path: Path | null) => {
    const title = window.prompt("Nome da nova pasta / submenu:");
    if (!title || !title.trim()) return;
    const newNode: CustomNode = {
      kind: "container",
      id: `c-custom-${Date.now()}`,
      title: title.trim(),
      children: [],
    };
    mutate(tree, (roots) => {
      if (!path) roots.push(newNode);
      else {
        const n = getNode(roots, path);
        if (n.kind !== "container") return toast.error("Só é possível adicionar dentro de pastas.");
        n.children.push(newNode);
      }
    });
    if (path) setExpanded((e) => ({ ...e, [pathKey(tree, path)]: true }));
  };

  const addProgramInto = (tree: TreeKey, path: Path | null, programId: string) => {
    mutate(tree, (roots) => {
      const newNode: CustomNode = { kind: "program", programId };
      if (!path) roots.push(newNode);
      else {
        const n = getNode(roots, path);
        if (n.kind !== "container") return;
        n.children.push(newNode);
      }
    });
    if (path) setExpanded((e) => ({ ...e, [pathKey(tree, path)]: true }));
  };

  const doDelete = (tree: TreeKey, path: Path) => {
    const roots = tree === "main" ? mainRoots : adminRoots;
    const node = getNode(roots, path);
    if (node.kind !== "container") {
      toast.error("Programas não podem ser excluídos, apenas pastas.");
      setConfirmDelete(null);
      return;
    }
    mutate(tree, (r) => {
      const sibs = getSiblings(r, path);
      const i = path[path.length - 1];
      const removed = sibs.splice(i, 1)[0] as any;
      if (removed?.children?.length) sibs.splice(i, 0, ...removed.children);
    });
    setConfirmDelete(null);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      const payload: MenuCustomization = { version: 1, roots: mainRoots, adminRoots };
      await saveCustomization(payload);
      setDirty(false);
      toast.success("Menu salvo. Vale para todos os usuários do estabelecimento.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar menu.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Restaurar menus padrão para todos os usuários deste estabelecimento?")) return;
    try {
      setSaving(true);
      await clearCustomization();
      setMainRoots(initialFromBase(menuItems).roots);
      setAdminRoots(initialAdminFooterTree());
      setDirty(false);
      toast.success("Menus restaurados ao padrão.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao restaurar menus.");
    } finally {
      setSaving(false);
    }
  };

  // Drag state — inclui árvore de origem para permitir mover entre menus
  const [dragging, setDragging] = useState<
    | { kind: "node"; tree: TreeKey; path: Path }
    | { kind: "program"; programId: string }
    | null
  >(null);

  const onDropOn = (destTree: TreeKey, targetPath: Path | null, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) return;

    if (dragging.kind === "program") {
      addProgramInto(destTree, targetPath, dragging.programId);
      setDragging(null);
      return;
    }

    // node — pode ser mesma árvore ou entre árvores
    if (dragging.tree === destTree) {
      const src = dragging.path;
      if (targetPath && src.length <= targetPath.length && src.every((v, i) => v === targetPath[i])) {
        return setDragging(null);
      }
      mutate(destTree, (roots) => {
        const node = removeAt(roots, src);
        const adjusted: Path | null = targetPath ? [...targetPath] : null;
        if (adjusted) {
          for (let i = 0; i < src.length; i++) {
            if (i >= adjusted.length) break;
            const samePrefix = src.slice(0, i).every((v, k) => v === adjusted[k]);
            if (samePrefix && src[i] < adjusted[i]) adjusted[i] -= 1;
          }
        }
        if (!adjusted || adjusted.length === 0) roots.push(node);
        else {
          const target = getNode(roots, adjusted);
          if (target && target.kind === "container") target.children.push(node);
          else {
            const parent = adjusted.slice(0, -1);
            const idx = adjusted[adjusted.length - 1] + 1;
            insertAt(roots, parent.length ? parent : null, idx, node);
          }
        }
      });
    } else {
      // Mover entre árvores: remove da origem e insere no destino
      if (!isAdmin) {
        toast.error("Somente administradores podem alterar o menu.");
        return setDragging(null);
      }
      let removed: CustomNode | null = null;
      setTree(dragging.tree, (prev) => {
        const roots = cloneTree(prev);
        removed = removeAt(roots, dragging.path);
        return roots;
      });
      // Aguarda micro-tick? Como setState é assíncrono, usamos snapshot direto:
      setTree(destTree, (prev) => {
        if (!removed) return prev;
        const roots = cloneTree(prev);
        if (!targetPath || targetPath.length === 0) {
          roots.push(removed);
        } else {
          const target = getNode(roots, targetPath);
          if (target && target.kind === "container") target.children.push(removed);
          else {
            const parent = targetPath.slice(0, -1);
            const idx = targetPath[targetPath.length - 1] + 1;
            insertAt(roots, parent.length ? parent : null, idx, removed);
          }
        }
        return roots;
      });
      setDirty(true);
    }
    setDragging(null);
  };

  const renderNode = (tree: TreeKey, node: CustomNode, path: Path, depth: number) => {
    const key = pathKey(tree, path);
    const isExpanded = expanded[key] ?? depth < 1;
    const setIcon = (iconName: string | null) => {
      mutate(tree, (roots) => {
        const n = getNode(roots, path);
        if (iconName) (n as any).iconName = iconName;
        else delete (n as any).iconName;
      });
    };
    if (node.kind === "program") {
      const p = programs.get(node.programId);
      const OverrideIcon = resolveMenuIcon((node as any).iconName);
      const Icon = OverrideIcon || p?.icon || FileText;
      return (
        <div
          key={key}
          draggable
          onDragStart={(e) => {
            setDragging({ kind: "node", tree, path });
            e.dataTransfer.effectAllowed = "move";
          }}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 group border border-transparent"
          style={{ marginLeft: depth * 20 }}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 cursor-grab" />
          <MenuIconPicker
            value={(node as any).iconName ?? null}
            onChange={setIcon}
            trigger={
              <button
                className="p-0.5 rounded hover:bg-muted"
                title="Alterar ícone"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon className="w-4 h-4 text-primary/80" />
              </button>
            }
          />
          <span className="text-sm flex-1 truncate">{p?.title || `(programa ausente: ${node.programId})`}</span>
          <Badge variant="outline" className="text-[10px]">programa</Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(tree, path, -1)}><ArrowUp className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(tree, path, 1)}><ArrowDown className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => outdent(tree, path)} disabled={path.length <= 1}><ArrowLeft className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => indent(tree, path)}><ArrowRight className="w-3 h-3" /></Button>
          </div>
        </div>
      );
    }
    const FolderIconResolved = resolveMenuIcon((node as any).iconName) || Folder;
    return (
      <div key={key}>
        <div
          draggable
          onDragStart={(e) => {
            setDragging({ kind: "node", tree, path });
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => dragging && e.preventDefault()}
          onDrop={(e) => onDropOn(tree, path, e)}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 group border border-dashed border-transparent hover:border-primary/30"
          style={{ marginLeft: depth * 20 }}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 cursor-grab" />
          <button onClick={() => toggle(tree, path)} className="p-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <MenuIconPicker
            value={(node as any).iconName ?? null}
            onChange={setIcon}
            trigger={
              <button
                className="p-0.5 rounded hover:bg-muted"
                title="Alterar ícone da pasta"
                onClick={(e) => e.stopPropagation()}
              >
                <FolderIconResolved className="w-4 h-4 text-primary" />
              </button>
            }
          />
          {renaming === key ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(tree, path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(tree, path);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="h-7 text-sm flex-1"
            />
          ) : (
            <span className="text-sm font-medium flex-1 truncate">{node.title}</span>
          )}
          <Badge variant="secondary" className="text-[10px]">{node.children.length}</Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startRename(tree, path, node.title)}><Pencil className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addContainer(tree, path)}><FolderPlus className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(tree, path, -1)}><ArrowUp className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(tree, path, 1)}><ArrowDown className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => outdent(tree, path)} disabled={path.length <= 1}><ArrowLeft className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => indent(tree, path)}><ArrowRight className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setConfirmDelete({ tree, path })}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
        {isExpanded && (
          <div>
            {node.children.map((c, i) => renderNode(tree, c, [...path, i], depth + 1))}
            {node.children.length === 0 && (
              <div
                onDragOver={(e) => dragging && e.preventDefault()}
                onDrop={(e) => onDropOn(tree, path, e)}
                className="text-xs text-muted-foreground italic py-2 px-3 border border-dashed rounded my-1"
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

  const renderTreeCard = (tree: TreeKey, title: string, icon: any, roots: CustomNode[]) => {
    const Icon = icon;
    return (
      <Card
        className="p-0 overflow-hidden border-2"
        onDragOver={(e) => dragging && e.preventDefault()}
        onDrop={(e) => onDropOn(tree, null, e)}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <h2 className="font-semibold flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" /> {title}
          </h2>
          <Button size="sm" variant="outline" onClick={() => addContainer(tree, null)}>
            <Plus className="w-4 h-4 mr-1" /> Nova pasta
          </Button>
        </div>
        <ScrollArea className="h-[62vh]">
          <div className="p-3">
            {roots.map((r, i) => renderNode(tree, r, [i], 0))}
            {roots.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed rounded-lg">
                Vazio — arraste programas para cá.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <div className="mb-6 rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-primary" /> Personalizar Menus
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Você pode organizar dois menus: o <strong>Menu principal</strong> (lateral) e o
              submenu <strong>Admin (rodapé)</strong>. Arraste programas de um menu para o outro,
              crie pastas e subpastas com quantos níveis quiser.
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
        {dirty && <div className="mt-3 text-xs text-primary font-medium">● Alterações não salvas</div>}
      </div>

      {!checkingAdmin && !isAdmin && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Modo somente leitura.</strong> Apenas administradores podem alterar a estrutura dos menus.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_340px] gap-4">
        {renderTreeCard("main", "Menu principal (lateral)", LayoutGrid, mainRoots)}
        {renderTreeCard("admin", "Menu Admin (rodapé)", Shield, adminRoots)}

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
              Arraste para qualquer um dos dois menus (ou entre eles).
            </p>
          </div>
          <ScrollArea className="h-[62vh]">
            <div className="p-3 space-y-4">
              {groupedUnplaced.length === 0 && (
                <div className="text-xs text-muted-foreground italic text-center py-8">
                  {poolSearch ? "Nenhum programa encontrado." : "Todos os programas já estão em algum menu."}
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
        onConfirm={() => confirmDelete && doDelete(confirmDelete.tree, confirmDelete.path)}
      />
    </div>
  );
}
