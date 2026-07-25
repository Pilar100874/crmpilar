import * as LucideIcons from "lucide-react";
import type { MenuItem } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const KEY = "menu_customization_v1";
export const MENU_CUSTOMIZATION_EVENT = "menu-customization-changed";

export type CustomNode =
  | { kind: "program"; programId: string; iconName?: string }
  | { kind: "container"; id: string; title: string; iconName?: string; children: CustomNode[] };

export interface MenuCustomization {
  version: 1;
  roots: CustomNode[];
  adminRoots?: CustomNode[];
  baseline?: { roots: CustomNode[]; adminRoots: CustomNode[] };
}

export type SystemAction =
  | "lock"
  | "admin"
  | "theme"
  | "logout"
  | "profile"
  | "share-screen"
  | "open-ticket"
  | "pwa-update"
  | "change-password";

// ---- Local cache (mirrors remote, used for instant sidebar render) ----
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

function writeCache(c: MenuCustomization | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(MENU_CUSTOMIZATION_EVENT));
}

// ---- Remote sync (per estabelecimento; admin writes, everyone reads) ----
export async function fetchRemoteCustomization(): Promise<MenuCustomization | null> {
  try {
    const estId = await getEstabelecimentoId();
    if (!estId) return null;
    const { data, error } = await supabase
      .from("menu_customizacoes")
      .select("payload")
      .eq("estabelecimento_id", estId)
      .maybeSingle();
    if (error) throw error;
    const payload = (data?.payload as unknown as MenuCustomization) || null;
    if (payload && payload.version === 1 && Array.isArray(payload.roots)) {
      writeCache(payload);
      return payload;
    }
    return null;
  } catch (e) {
    console.warn("fetchRemoteCustomization failed", e);
    return null;
  }
}

export async function saveCustomization(c: MenuCustomization): Promise<void> {
  const estId = await getEstabelecimentoId();
  if (!estId) throw new Error("Estabelecimento não identificado");
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("menu_customizacoes")
    .upsert(
      {
        estabelecimento_id: estId,
        payload: c as any,
        updated_by: authData.user?.id ?? null,
      },
      { onConflict: "estabelecimento_id" }
    );
  if (error) throw error;
  writeCache(c);
}

export async function clearCustomization(): Promise<void> {
  const estId = await getEstabelecimentoId();
  if (estId) {
    const { error } = await supabase
      .from("menu_customizacoes")
      .delete()
      .eq("estabelecimento_id", estId);
    if (error) throw error;
  }
  writeCache(null);
}

export interface ProgramLeaf {
  id: string;
  title: string;
  url: string;
  icon: any;
  system?: SystemAction;
  footerAdmin?: boolean;
  footerUser?: boolean;
  originContainerId?: string;
  originContainerTitle?: string;
}

// Itens do rodapé do menu que também podem ser posicionados no menu principal
export const SYSTEM_PROGRAMS: ProgramLeaf[] = [
  { id: "system-lock", title: "Travar menu", url: "#system-lock", icon: LucideIcons.Lock, system: "lock" },
  { id: "system-admin", title: "Admin", url: "/admin", icon: LucideIcons.Shield, system: "admin" },
  { id: "system-theme", title: "Modo escuro / claro", url: "#system-theme", icon: LucideIcons.Moon, system: "theme" },
  { id: "system-logout", title: "Sair", url: "#system-logout", icon: LucideIcons.LogOut, system: "logout" },
];

// Itens do menu do usuário (rodapé) — podem ser movidos para o menu principal ou para o Admin do rodapé
export const FOOTER_USER_PROGRAMS: ProgramLeaf[] = [
  { id: "user-perfil", title: "Perfil", url: "/perfil", icon: LucideIcons.User, system: "profile", footerUser: true },
  { id: "user-share-screen", title: "Compartilhar ou Ver Tela", url: "/compartilhar-tela", icon: LucideIcons.Monitor, system: "share-screen", footerUser: true },
  { id: "user-open-ticket", title: "Abrir Ticket de Suporte", url: "#action-open-ticket", icon: LucideIcons.LifeBuoy, system: "open-ticket", footerUser: true },
  { id: "user-pwa-update", title: "Atualizar Sistema (PWA)", url: "#action-pwa-update", icon: LucideIcons.RefreshCw, system: "pwa-update", footerUser: true },
  { id: "user-change-password", title: "Alterar Senha", url: "#action-change-password", icon: LucideIcons.KeyRound, system: "change-password", footerUser: true },
];

// Itens do menu Admin do rodapé — podem ser movidos para o menu principal
export const FOOTER_ADMIN_PROGRAMS: ProgramLeaf[] = [
  { id: "Admin Macros", title: "Macros", url: "/macros", icon: LucideIcons.Zap, footerAdmin: true },
  { id: "Admin Tickets", title: "Tickets de Suporte", url: "/admin/support-tickets", icon: LucideIcons.LifeBuoy, footerAdmin: true },
  { id: "Admin Apps", title: "Apps", url: "/admin/apps", icon: LucideIcons.AppWindow, footerAdmin: true },
  { id: "Admin Telas Customizadas", title: "Tela Customizada", url: "/admin/telas-customizadas", icon: LucideIcons.LayoutGrid, footerAdmin: true },
  { id: "Admin Politicas Internas", title: "Políticas Internas", url: "/politicas-internas", icon: LucideIcons.BookOpen, footerAdmin: true },
];

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
  for (const sp of SYSTEM_PROGRAMS) {
    if (!map.has(sp.id)) map.set(sp.id, sp);
  }
  for (const sp of FOOTER_USER_PROGRAMS) {
    if (!map.has(sp.id)) map.set(sp.id, { ...sp, originContainerId: "UserMenu", originContainerTitle: "Menu do usuário (rodapé)" });
  }
  for (const sp of FOOTER_ADMIN_PROGRAMS) {
    if (!map.has(sp.id)) map.set(sp.id, { ...sp, originContainerId: "Admin", originContainerTitle: "Admin (rodapé)" });
  }
  return map;
}

/** Constrói a árvore padrão do "Admin do rodapé" quando ainda não há customização. */
export function initialAdminFooterTree(): CustomNode[] {
  return FOOTER_ADMIN_PROGRAMS.map((p) => ({ kind: "program", programId: p.id } as CustomNode));
}

/** Aplica customização ao Admin do rodapé (segunda árvore). */
export function applyAdminFooterCustomization(base: MenuItem[] = []): MenuItem[] {
  const custom = loadCustomization();
  const roots = custom?.adminRoots ?? initialAdminFooterTree();
  const programs = extractPrograms(base); // inclui menu principal + system/footer pools
  const nodeToItems = (nodes: CustomNode[]): any[] => {
    const out: any[] = [];
    const IconsMap = LucideIcons as unknown as Record<string, any>;
    for (const n of nodes) {
      if (n.kind === "program") {
        const p = programs.get(n.programId);
        if (p) {
          const icon = (n.iconName && IconsMap[n.iconName]) || p.icon;
          out.push({ id: p.id, title: p.title, url: p.url, icon, ...(p.system ? { system: p.system } : {}) });
        }
      } else {
        const icon = (n.iconName && IconsMap[n.iconName]) || LucideIcons.Folder;
        out.push({
          id: n.id,
          title: n.title,
          icon,
          subItems: nodeToItems(n.children),
        });
      }
    }
    return out;
  };
  return nodeToItems(roots);
}


/** IDs de programas atualmente posicionados no menu principal (após customização). */
export function getPlacedProgramIds(items: MenuItem[]): Set<string> {
  const out = new Set<string>();
  for (const it of items) {
    if (it.url) out.add(it.id);
    if (it.subItems) for (const s of it.subItems) out.add(s.id);
  }
  return out;
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
  const IconsMap = LucideIcons as unknown as Record<string, any>;
  for (const root of custom.roots) {
    if (root.kind === "program") {
      const p = programs.get(root.programId);
      if (p) {
        const icon = (root.iconName && IconsMap[root.iconName]) || p.icon;
        result.push({ id: p.id, title: p.title, url: p.url, icon, ...(p.system ? { system: p.system } : {}) });
      }
      continue;
    }
    const subItems: any[] = [];
    const pushGroup = (nodes: CustomNode[], groupName?: string) => {
      for (const n of nodes) {
        if (n.kind === "program") {
          const p = programs.get(n.programId);
          if (p) {
            const icon = (n.iconName && IconsMap[n.iconName]) || p.icon;
            subItems.push({
              id: p.id,
              title: p.title,
              url: p.url,
              icon,
              ...(p.system ? { system: p.system } : {}),
              ...(groupName ? { group: groupName } : {}),
            });
          }
        } else {
          const nextGroup = groupName ? `${groupName} · ${n.title}` : n.title;
          pushGroup(n.children, nextGroup);
        }
      }
    };
    pushGroup(root.children);

    const baseId = root.id.startsWith("c-") ? root.id.slice(2) : root.id;
    const icon =
      (root.iconName && IconsMap[root.iconName]) ||
      baseIconById.get(baseId) ||
      (subItems[0]?.icon) ||
      LucideIcons.Folder;

    if (subItems.length === 1 && !subItems[0].group) {
      const only = subItems[0];
      result.push({
        id: only.id,
        title: root.title || only.title,
        url: only.url,
        icon: root.iconName && IconsMap[root.iconName] ? IconsMap[root.iconName] : only.icon,
        ...(only.system ? { system: only.system } : {}),
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

  const missing: MenuItem[] = [];
  for (const [id, p] of programs) {
    // Programas de sistema e do Admin (rodapé) não aparecem por padrão no menu principal — só se o admin arrastar
    if (p.system || p.footerAdmin) continue;
    if (!placed.has(id)) missing.push({ id, title: p.title, url: p.url, icon: p.icon });

  }
  return [...result, ...missing];

}
