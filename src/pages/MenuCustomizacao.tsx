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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { Lock, LayoutList } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  GripVertical,
  Folder,
  FileText,
  Shield,
  LayoutGrid,
  BookmarkCheck,
} from "lucide-react";
import { MenuIconPicker, resolveMenuIcon } from "@/components/menu/MenuIconPicker";

type TreeKey = "main" | "admin";
type Path = number[];
type DropPos = "before" | "after" | "inside";

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
function pathsEqual(a: Path, b: Path) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function isAncestor(a: Path, b: Path) {
  if (a.length >= b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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
      const payload: MenuCustomization = {
        version: 1,
        roots: mainRoots,
        adminRoots,
        ...(baseline ? { baseline } : {}),
      };
      await saveCustomization(payload);
      setDirty(false);
      toast.success("Menu salvo. Vale para todos os usuários do estabelecimento.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar menu.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetAsDefault = async () => {
    if (!isAdmin) return;
    if (!window.confirm(
      "Definir o arranjo atual como novo padrão? A partir de agora, 'Restaurar padrão' voltará para este arranjo."
    )) return;
    try {
      setSaving(true);
      const newBaseline = {
        roots: JSON.parse(JSON.stringify(mainRoots)),
        adminRoots: JSON.parse(JSON.stringify(adminRoots)),
      };
      const payload: MenuCustomization = {
        version: 1,
        roots: mainRoots,
        adminRoots,
        baseline: newBaseline,
      };
      await saveCustomization(payload);
      setBaseline(newBaseline);
      setDirty(false);
      toast.success("Arranjo atual definido como novo padrão.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao definir padrão.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    const usingBaseline = !!baseline;
    const msg = usingBaseline
      ? "Restaurar menus para o padrão definido por você?"
      : "Restaurar menus para o padrão de fábrica (para todos os usuários deste estabelecimento)?";
    if (!window.confirm(msg)) return;
    try {
      setSaving(true);
      if (usingBaseline && baseline) {
        const payload: MenuCustomization = {
          version: 1,
          roots: JSON.parse(JSON.stringify(baseline.roots)),
          adminRoots: JSON.parse(JSON.stringify(baseline.adminRoots)),
          baseline,
        };
        await saveCustomization(payload);
        setMainRoots(payload.roots);
        setAdminRoots(payload.adminRoots!);
        setDirty(false);
        toast.success("Menus restaurados ao padrão definido.");
      } else {
        await clearCustomization();
        setMainRoots(initialFromBase(menuItems).roots);
        setAdminRoots(initialAdminFooterTree());
        setBaseline(null);
        setDirty(false);
        toast.success("Menus restaurados ao padrão de fábrica.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao restaurar menus.");
    } finally {
      setSaving(false);
    }
  };

  // Drag state
  const [dragging, setDragging] = useState<
    | { kind: "node"; tree: TreeKey; path: Path }
    | { kind: "program"; programId: string }
    | null
  >(null);
  const [dropHint, setDropHint] = useState<
    | { tree: TreeKey; path: Path; pos: DropPos }
    | { tree: TreeKey; path: null; pos: "end" }
    | null
  >(null);

  const clearDrag = () => {
    setDragging(null);
    setDropHint(null);
  };

  // Determine drop position based on mouse Y and whether target is a container
  const computeDropPos = (e: React.DragEvent<HTMLElement>, isContainer: boolean): DropPos => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (isContainer) {
      if (y < h * 0.28) return "before";
      if (y > h * 0.72) return "after";
      return "inside";
    }
    return y < h / 2 ? "before" : "after";
  };

  const performDrop = (destTree: TreeKey) => {
    if (!dragging || !dropHint || dropHint.tree !== destTree) return clearDrag();

    // Compute insertion parent path and index
    const resolveInsertion = (
      roots: CustomNode[],
      hint: typeof dropHint
    ): { parentPath: Path | null; index: number } | null => {
      if (!hint) return null;
      if (hint.path === null) {
        return { parentPath: null, index: roots.length };
      }
      const target = getNode(roots, hint.path);
      if (hint.pos === "inside") {
        if (!target || target.kind !== "container") return null;
        return { parentPath: hint.path, index: (target as any).children.length };
      }
      const parentPath = hint.path.length > 1 ? hint.path.slice(0, -1) : null;
      const lastIdx = hint.path[hint.path.length - 1];
      return { parentPath, index: hint.pos === "before" ? lastIdx : lastIdx + 1 };
    };

    if (dragging.kind === "program") {
      mutate(destTree, (roots) => {
        const ins = resolveInsertion(roots, dropHint);
        if (!ins) return;
        const newNode: CustomNode = { kind: "program", programId: dragging.programId };
        if (!ins.parentPath) roots.splice(ins.index, 0, newNode);
        else (getNode(roots, ins.parentPath) as any).children.splice(ins.index, 0, newNode);
      });
      clearDrag();
      return;
    }

    // Move node
    const srcTree = dragging.tree;
    const srcPath = dragging.path;

    // Prevent dropping into itself/descendant when same tree
    if (
      srcTree === destTree &&
      dropHint.path &&
      (pathsEqual(srcPath, dropHint.path) || isAncestor(srcPath, dropHint.path))
    ) {
      return clearDrag();
    }

    if (srcTree === destTree) {
      mutate(destTree, (roots) => {
        const ins = resolveInsertion(roots, dropHint);
        if (!ins) return;
        // Adjust for removal shifting indices when src is before insertion in same parent chain
        const insPathCandidate: Path = ins.parentPath ? [...ins.parentPath, ins.index] : [ins.index];
        const node = removeAt(roots, srcPath);
        // Recompute insertion after removal
        const adjParent = ins.parentPath ? [...ins.parentPath] : null;
        let adjIndex = ins.index;
        // If src was under same parent path prefix and before insertion, decrement
        if (adjParent) {
          const samePrefix =
            srcPath.length > adjParent.length &&
            adjParent.every((v, i) => v === srcPath[i]);
          if (samePrefix && srcPath[adjParent.length] < adjIndex) adjIndex -= 1;
          // Also adjust ancestor indices in adjParent itself
          for (let i = 0; i < adjParent.length; i++) {
            const samePref = srcPath.slice(0, i).every((v, k) => v === adjParent[k]);
            if (samePref && srcPath.length > i && srcPath[i] < adjParent[i]) adjParent[i] -= 1;
          }
        } else {
          if (srcPath.length === 1 && srcPath[0] < adjIndex) adjIndex -= 1;
        }
        if (!adjParent) roots.splice(adjIndex, 0, node);
        else {
          const parent = getNode(roots, adjParent);
          if (parent && parent.kind === "container") (parent as any).children.splice(adjIndex, 0, node);
          else roots.push(node);
        }
        void insPathCandidate;
      });
    } else {
      // Cross-tree move
      let removed: CustomNode | null = null;
      setTree(srcTree, (prev) => {
        const roots = cloneTree(prev);
        removed = removeAt(roots, srcPath);
        return roots;
      });
      setTree(destTree, (prev) => {
        if (!removed) return prev;
        const roots = cloneTree(prev);
        const ins = resolveInsertion(roots, dropHint);
        if (!ins) {
          roots.push(removed);
        } else if (!ins.parentPath) {
          roots.splice(ins.index, 0, removed);
        } else {
          const parent = getNode(roots, ins.parentPath);
          if (parent && parent.kind === "container") (parent as any).children.splice(ins.index, 0, removed);
          else roots.push(removed);
        }
        return roots;
      });
      setDirty(true);
    }
    clearDrag();
  };

  const dropIndicator = (tree: TreeKey, path: Path, pos: DropPos) => {
    if (!dropHint || dropHint.tree !== tree || dropHint.path === null) return false;
    return pathsEqual(dropHint.path as Path, path) && dropHint.pos === pos;
  };

  // Human-friendly summary of where the drop will land, per tree.
  const getDropSummary = (tree: TreeKey): { text: string; kind: "before" | "after" | "inside" | "end" } | null => {
    if (!dragging || !dropHint || dropHint.tree !== tree) return null;
    const roots = tree === "main" ? mainRoots : adminRoots;
    if (dropHint.path === null) return { text: "no final da lista", kind: "end" };
    const target = getNode(roots, dropHint.path);
    const name =
      target?.kind === "container"
        ? target.title
        : programs.get((target as any)?.programId)?.title || "item";
    if (dropHint.pos === "before") return { text: `antes de "${name}"`, kind: "before" };
    if (dropHint.pos === "after") return { text: `depois de "${name}"`, kind: "after" };
    return { text: `dentro da pasta "${name}"`, kind: "inside" };
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

    const showBefore = dropIndicator(tree, path, "before");
    const showAfter = dropIndicator(tree, path, "after");
    const showInside = node.kind === "container" && dropIndicator(tree, path, "inside");

    const dragHandlers = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDragging({ kind: "node", tree, path });
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", key); } catch { /* noop */ }
      },
      onDragEnd: () => clearDrag(),
      onDragOver: (e: React.DragEvent<HTMLElement>) => {
        if (!dragging) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const pos = computeDropPos(e, node.kind === "container");
        setDropHint({ tree, path, pos });
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        performDrop(tree);
      },
    };

    if (node.kind === "program") {
      const p = programs.get(node.programId);
      const OverrideIcon = resolveMenuIcon((node as any).iconName);
      const Icon = OverrideIcon || p?.icon || FileText;
      return (
        <div key={key} className="relative">
          {showBefore && (
            <div className="absolute -top-1 left-0 right-0 z-10 pointer-events-none flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
              <div className="h-1.5 flex-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)] animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-background border border-primary/40 rounded-full px-2 py-0.5 shadow-sm">↑ Antes</span>
            </div>
          )}
          <div
            {...dragHandlers}
            className="flex items-center gap-1.5 py-2 px-2 rounded-lg hover:bg-muted/40 group border border-transparent cursor-grab active:cursor-grabbing"
            style={{ marginLeft: depth * 16 }}
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0" />
            <MenuIconPicker
              value={(node as any).iconName ?? null}
              onChange={setIcon}
              trigger={
                <button
                  className="p-1 rounded hover:bg-muted"
                  title="Alterar ícone"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  draggable={false}
                >
                  <Icon className="w-4 h-4 text-primary/80" />
                </button>
              }
            />
            <span className="text-sm flex-1 truncate">{p?.title || `(programa ausente: ${node.programId})`}</span>
          </div>
          {showAfter && (
            <div className="absolute -bottom-1 left-0 right-0 z-10 pointer-events-none flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
              <div className="h-1.5 flex-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)] animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-background border border-primary/40 rounded-full px-2 py-0.5 shadow-sm">↓ Depois</span>
            </div>
          )}
        </div>
      );
    }

    const FolderIconResolved = resolveMenuIcon((node as any).iconName) || Folder;
    return (
      <div key={key} className="relative">
        {showBefore && (
          <div className="absolute -top-1 left-0 right-0 z-10 pointer-events-none flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
            <div className="h-1.5 flex-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-background border border-primary/40 rounded-full px-2 py-0.5 shadow-sm">↑ Antes</span>
          </div>
        )}
        <div
          {...dragHandlers}
          className={`flex items-center gap-1.5 py-2 px-2 rounded-lg group border-2 cursor-grab active:cursor-grabbing transition ${
            showInside
              ? "border-primary bg-primary/15 ring-4 ring-primary/30 shadow-lg scale-[1.01]"
              : "border-dashed border-transparent hover:bg-muted/40 hover:border-primary/30"
          }`}
          style={{ marginLeft: depth * 16 }}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0" />
          <button
            onClick={(e) => { e.stopPropagation(); toggle(tree, path); }}
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
            className="p-1 rounded hover:bg-muted"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <MenuIconPicker
            value={(node as any).iconName ?? null}
            onChange={setIcon}
            trigger={
              <button
                className="p-1 rounded hover:bg-muted"
                title="Alterar ícone da pasta"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
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
              className="h-8 text-sm flex-1"
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium flex-1 truncate">{node.title}</span>
          )}
          <Badge variant="secondary" className="text-[10px]">{node.children.length}</Badge>
          {showInside && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/20 border border-primary rounded-full px-2 py-0.5 shrink-0">
              ⤵ Dentro
            </span>
          )}
          <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
            <Button
              size="icon" variant="ghost" className="h-8 w-8 md:h-6 md:w-6"
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              onClick={(e) => { e.stopPropagation(); startRename(tree, path, node.title); }}
              title="Renomear"
            ><Pencil className="w-3.5 h-3.5" /></Button>
            <Button
              size="icon" variant="ghost" className="h-8 w-8 md:h-6 md:w-6"
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              onClick={(e) => { e.stopPropagation(); addContainer(tree, path); }}
              title="Nova subpasta"
            ><FolderPlus className="w-3.5 h-3.5" /></Button>
            <Button
              size="icon" variant="ghost" className="h-8 w-8 md:h-6 md:w-6 text-destructive"
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ tree, path }); }}
              title="Excluir pasta"
            ><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        {isExpanded && (
          <div>
            {node.children.map((c, i) => renderNode(tree, c, [...path, i], depth + 1))}
            {node.children.length === 0 && (
              <div
                onDragOver={(e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); setDropHint({ tree, path, pos: "inside" }); } }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); performDrop(tree); }}
                className={`text-xs italic py-3 px-3 border-2 border-dashed rounded-lg my-1 text-center transition ${
                  showInside ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
                style={{ marginLeft: (depth + 1) * 16 }}
              >
                Solte aqui dentro desta pasta
              </div>
            )}
          </div>
        )}
        {showAfter && (
          <div className="absolute -bottom-1 left-0 right-0 z-10 pointer-events-none flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
            <div className="h-1.5 flex-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-background border border-primary/40 rounded-full px-2 py-0.5 shadow-sm">↓ Depois</span>
          </div>
        )}
      </div>
    );
  };

  const renderTreeCard = (tree: TreeKey, title: string, icon: any, roots: CustomNode[]) => {
    const Icon = icon;
    const endActive =
      dragging && dropHint && dropHint.tree === tree && dropHint.path === null;
    const summary = getDropSummary(tree);
    return (
      <Card
        className={`p-0 overflow-hidden border-2 flex flex-col transition ${
          dragging && dropHint?.tree === tree ? "border-primary shadow-lg" : dragging ? "border-primary/30" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b bg-muted/40">
          <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base min-w-0">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{title}</span>
            <Badge variant="secondary" className="text-[10px]">{roots.length}</Badge>
          </h2>
          <Button size="sm" variant="outline" onClick={() => addContainer(tree, null)} className="shrink-0">
            <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Nova pasta</span>
          </Button>
        </div>
        {summary && (
          <div className="px-3 sm:px-4 py-2 bg-primary/10 border-b border-primary/30 text-xs sm:text-sm text-primary font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            Soltar {summary.text}
          </div>
        )}
        <ScrollArea className="h-[50vh] lg:h-[62vh]">
          <div className="p-2 sm:p-3">
            {roots.map((r, i) => renderNode(tree, r, [i], 0))}
            {/* End-of-list drop zone */}
            <div
              onDragOver={(e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); setDropHint({ tree, path: null, pos: "end" }); } }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); performDrop(tree); }}
              className={`mt-2 rounded-lg border-2 border-dashed py-4 text-center text-xs font-medium transition ${
                endActive
                  ? "border-primary bg-primary/15 text-primary ring-4 ring-primary/20 animate-pulse"
                  : dragging
                    ? "border-primary/40 bg-primary/5 text-primary/70"
                    : "border-transparent text-muted-foreground/60"
              }`}
            >
              {roots.length === 0
                ? "Solte um programa aqui para começar"
                : endActive
                  ? "Solte no final da lista"
                  : "— fim —"}
            </div>
          </div>
        </ScrollArea>
      </Card>
    );
  };

  const renderPoolCard = () => (
    <Card className="p-0 overflow-hidden border-2 flex flex-col">
      <div className="px-3 sm:px-4 py-2.5 border-b bg-muted/40">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-primary" /> Programas disponíveis
          </h2>
          <Badge variant="secondary" className="text-[10px]">{unplaced.length}</Badge>
        </div>
        <Input
          value={poolSearch}
          onChange={(e) => setPoolSearch(e.target.value)}
          placeholder="Buscar programa..."
          className="h-9 text-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-2 hidden sm:block">
          Arraste um programa até o menu desejado. A linha azul mostra onde ele vai cair.
        </p>
      </div>
      <ScrollArea className="h-[50vh] lg:h-[62vh]">
        <div className="p-2 sm:p-3 space-y-4">
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
                      onDragStart={(e) => {
                        setDragging({ kind: "program", programId: p.id });
                        e.dataTransfer.effectAllowed = "copy";
                        try { e.dataTransfer.setData("text/plain", p.id); } catch { /* noop */ }
                      }}
                      onDragEnd={() => clearDrag()}
                      className="flex items-center gap-2 py-2 px-2 rounded-md border bg-background hover:bg-primary/5 hover:border-primary/40 transition-colors cursor-grab active:cursor-grabbing"
                      title={p.title}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm flex-1 truncate">{p.title}</span>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto pb-24">
      <div className="mb-4 sm:mb-6 rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Personalizar Menus
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
              Arraste itens entre <strong>Menu principal</strong> e <strong>Admin (rodapé)</strong>.
              Uma linha azul indica onde o item será solto; solte sobre uma pasta para colocar dentro dela.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={handleReset} disabled={!isAdmin || saving} className="flex-1 sm:flex-initial">
              <RotateCcw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{baseline ? "Restaurar padrão salvo" : "Restaurar padrão"}</span>
              <span className="sm:hidden ml-1">Restaurar</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetAsDefault}
              disabled={!isAdmin || saving}
              title="Salva o arranjo atual como o novo padrão a ser restaurado depois"
              className="flex-1 sm:flex-initial"
            >
              <BookmarkCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Definir atual como padrão</span>
              <span className="sm:hidden ml-1">Definir padrão</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isAdmin || !dirty || saving} className="shadow-sm flex-1 sm:flex-initial">
              <Save className="w-4 h-4 sm:mr-2" />
              <span>{saving ? "Salvando..." : dirty ? "Salvar" : "Salvo"}</span>
            </Button>
          </div>
        </div>
        {baseline && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Padrão personalizado ativo — "Restaurar padrão" volta para o arranjo definido.
          </div>
        )}
        {dirty && <div className="mt-3 text-xs text-primary font-medium">● Alterações não salvas</div>}
      </div>

      {!checkingAdmin && !isAdmin && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Modo somente leitura.</strong> Apenas administradores podem alterar os menus.
          </div>
        </div>
      )}

      {/* Desktop / large tablet: 3 columns */}
      <div className="hidden lg:grid grid-cols-[1fr_1fr_360px] gap-4">
        {renderTreeCard("main", "Menu principal (lateral)", LayoutGrid, mainRoots)}
        {renderTreeCard("admin", "Menu Admin (rodapé)", Shield, adminRoots)}
        {renderPoolCard()}
      </div>

      {/* Mobile & tablet: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="main" className="flex-col gap-1 py-2 text-[11px] sm:text-xs sm:flex-row">
              <LayoutGrid className="w-4 h-4" />
              <span>Menu</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex-col gap-1 py-2 text-[11px] sm:text-xs sm:flex-row">
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </TabsTrigger>
            <TabsTrigger value="pool" className="flex-col gap-1 py-2 text-[11px] sm:text-xs sm:flex-row">
              <LayoutList className="w-4 h-4" />
              <span>Programas</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="main" className="mt-3">
            {renderTreeCard("main", "Menu principal (lateral)", LayoutGrid, mainRoots)}
          </TabsContent>
          <TabsContent value="admin" className="mt-3">
            {renderTreeCard("admin", "Menu Admin (rodapé)", Shield, adminRoots)}
          </TabsContent>
          <TabsContent value="pool" className="mt-3">
            {renderPoolCard()}
          </TabsContent>
        </Tabs>
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
