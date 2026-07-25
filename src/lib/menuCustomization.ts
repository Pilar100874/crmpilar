import * as LucideIcons from "lucide-react";
import type { MenuItem } from "@/components/Layout";

const KEY = "menu_customization_v1";
export const MENU_CUSTOMIZATION_EVENT = "menu-customization-changed";

export type CustomNode =
  | { kind: "program"; programId: string }
  | { kind: "container"; id: string; title: string; children: CustomNode[] };

export interface MenuCustomization {
  version: 1;
  roots: CustomNode[];
}

export function loadCustomization(): MenuCustomization | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.roots)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCustomization(c: MenuCustomization) {
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(MENU_CUSTOMIZATION_EVENT));
}

export function clearCustomization() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(MENU_CUSTOMIZATION_EVENT));
}

export interface ProgramLeaf {
  id: string;
  title: string;
  url: string;
  icon: any;
  originContainerId?: string;
  originContainerTitle?: string;
}

export function extractPrograms(base: MenuItem[]): Map<string, ProgramLeaf> {
  const map = new Map<string, ProgramLeaf>();
  for (const item of base) {
    if (item.url && !item.subItems) {
      map.set(item.id, { id: item.id, title: item.title, url: item.url, icon: item.icon });
    }
    if (item.subItems) {
      for (const s of item.subItems) {
        if (s.url) {
          map.set(s.id, {
            id: s.id,
            title: s.title,
            url: s.url,
            icon: s.icon,
            originContainerId: item.id,
            originContainerTitle: item.title,
          });
        }
      }
    }
  }
  return map;
}

export function initialFromBase(base: MenuItem[]): MenuCustomization {
  const roots: CustomNode[] = base.map((item) => {
    if (!item.subItems || item.subItems.length === 0) {
      return item.url
        ? ({ kind: "program", programId: item.id } as CustomNode)
        : ({ kind: "container", id: `c-${item.id}`, title: item.title, children: [] } as CustomNode);
    }
    const groups = new Map<string, CustomNode[]>();
    const plain: CustomNode[] = [];
    for (const s of item.subItems) {
      const node: CustomNode = { kind: "program", programId: s.id };
      if (s.group) {
        if (!groups.has(s.group)) groups.set(s.group, []);
        groups.get(s.group)!.push(node);
      } else {
        plain.push(node);
      }
    }
    const children: CustomNode[] = [...plain];
    for (const [gname, gnodes] of groups) {
      children.push({
        kind: "container",
        id: `g-${item.id}-${gname}`,
        title: gname,
        children: gnodes,
      });
    }
    return { kind: "container", id: `c-${item.id}`, title: item.title, children };
  });
  return { version: 1, roots };
}

export function applyMenuCustomization(base: MenuItem[]): MenuItem[] {
  const custom = loadCustomization();
  if (!custom) return base;
  const programs = extractPrograms(base);
  const placed = new Set<string>();

  const walkForPlaced = (node: CustomNode) => {
    if (node.kind === "program") placed.add(node.programId);
    else node.children.forEach(walkForPlaced);
  };
  custom.roots.forEach(walkForPlaced);

  const baseIconById = new Map<string, any>();
  for (const b of base) baseIconById.set(b.id, b.icon);

  const result: MenuItem[] = [];
  for (const root of custom.roots) {
    if (root.kind === "program") {
      const p = programs.get(root.programId);
      if (p) result.push({ id: p.id, title: p.title, url: p.url, icon: p.icon });
      continue;
    }
    const subItems: any[] = [];
    const pushGroup = (nodes: CustomNode[], groupName?: string) => {
      for (const n of nodes) {
        if (n.kind === "program") {
          const p = programs.get(n.programId);
          if (p)
            subItems.push({
              id: p.id,
              title: p.title,
              url: p.url,
              icon: p.icon,
              ...(groupName ? { group: groupName } : {}),
            });
        } else {
          const nextGroup = groupName ? `${groupName} · ${n.title}` : n.title;
          pushGroup(n.children, nextGroup);
        }
      }
    };
    pushGroup(root.children);

    const baseId = root.id.startsWith("c-") ? root.id.slice(2) : root.id;
    const icon =
      baseIconById.get(baseId) ||
      (subItems[0]?.icon) ||
      LucideIcons.Folder;

    if (subItems.length === 1 && !subItems[0].group) {
      const only = subItems[0];
      result.push({
        id: only.id,
        title: root.title || only.title,
        url: only.url,
        icon: only.icon,
      });
    } else {
      result.push({
        id: baseId || root.id,
        title: root.title,
        icon,
        subItems,
      });
    }
  }

  // Never lose programs
  const missing: MenuItem[] = [];
  for (const [id, p] of programs) {
    if (!placed.has(id)) missing.push({ id, title: p.title, url: p.url, icon: p.icon });
  }
  return [...result, ...missing];
}
