// Catálogo hierárquico de permissões: menu > submenu > módulo interno (abas da tela).
// A fonte principal é o menu real do sistema (Layout.tsx); itens antigos de
// menuStructure/MENU_CONFIG entram como "Outros" para não perder permissões já salvas.

import { menuItems } from "@/components/Layout";
import { menuStructure } from "@/lib/menuStructure";
import { MENU_CONFIG } from "@/lib/menus";
import { MODULOS_INTERNOS_GERADOS } from "./modulosInternos.gerado";
import { MODULOS_INTERNOS_EXTRAS } from "./modulosInternosExtras";

export type NivelPermissao = "menu" | "submenu" | "modulo";

export interface NoPermissao {
  id: string;
  label: string;
  nivel: NivelPermissao;
  url?: string;
  grupo?: string;
  filhos: NoPermissao[];
}

export const SEPARADOR_MODULO = "::";

/** Id de permissão de um módulo interno (aba) dentro de uma tela. */
export const idModulo = (idTela: string, idAba: string) => `${idTela}${SEPARADOR_MODULO}${idAba}`;

const modulosDaTela = (idTela: string): NoPermissao[] => {
  const lista = [
    ...(MODULOS_INTERNOS_GERADOS[idTela] || []),
    ...(MODULOS_INTERNOS_EXTRAS[idTela] || []),
  ];
  const vistos = new Set<string>();
  return lista
    .filter((m) => (vistos.has(m.id) ? false : (vistos.add(m.id), true)))
    .map((m) => ({
      id: idModulo(idTela, m.id),
      label: m.label,
      nivel: "modulo" as const,
      filhos: [],
    }));
};

const construirCatalogo = (): NoPermissao[] => {
  const catalogo: NoPermissao[] = [];
  const idsIncluidos = new Set<string>();

  const adicionarTela = (
    item: { id?: string; title?: string; url?: string; group?: string },
    nivel: NivelPermissao
  ): NoPermissao | null => {
    if (!item.id || idsIncluidos.has(item.id)) return null;
    idsIncluidos.add(item.id);
    return {
      id: item.id,
      label: item.title || item.id,
      nivel,
      url: item.url,
      grupo: item.group,
      filhos: modulosDaTela(item.id),
    };
  };

  for (const item of menuItems as any[]) {
    const no = adicionarTela(item, "menu");
    if (!no) continue;
    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const filho = adicionarTela(sub, "submenu");
        if (filho) no.filhos.push(filho);
      }
    }
    catalogo.push(no);
  }

  // Menus antigos que ainda aparecem em permissões salvas
  const outros: NoPermissao[] = [];
  for (const item of menuStructure as any[]) {
    const no = adicionarTela(item, "menu");
    if (no) outros.push(no);
    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const filho = adicionarTela(sub, "submenu");
        if (filho) outros.push(filho);
      }
    }
  }
  for (const item of MENU_CONFIG) {
    const no = adicionarTela({ id: item.id, title: item.label }, "submenu");
    if (no) outros.push(no);
  }

  if (outros.length > 0) {
    catalogo.push({
      id: "__outros__",
      label: "Outros itens do sistema",
      nivel: "menu",
      filhos: outros.map((o) => ({ ...o, nivel: "submenu" as const })),
    });
  }

  return catalogo;
};

// Construção preguiçosa: o catálogo lê o menu do Layout, que por sua vez usa
// as permissões — montar na importação criaria dependência circular.
let catalogoCache: NoPermissao[] | null = null;

/** Catálogo completo (menus, submenus e módulos internos). */
export const getCatalogoPermissoes = (): NoPermissao[] => {
  if (!catalogoCache) catalogoCache = construirCatalogo();
  return catalogoCache;
};

/** Todos os ids do catálogo (menus, submenus e módulos). */
export const listarIdsCatalogo = (): string[] => {
  const ids: string[] = [];
  const percorrer = (nos: NoPermissao[]) => {
    for (const no of nos) {
      ids.push(no.id);
      percorrer(no.filhos);
    }
  };
  percorrer(getCatalogoPermissoes());
  return ids;
};

/** Mapa id -> id do pai (usado para herdar permissão). */
let mapaPaisCache: Record<string, string> | null = null;

export const getMapaPais = (): Record<string, string> => {
  if (!mapaPaisCache) {
    const mapa: Record<string, string> = {};
    const percorrer = (nos: NoPermissao[], pai?: string) => {
      for (const no of nos) {
        if (pai) mapa[no.id] = pai;
        percorrer(no.filhos, no.id);
      }
    };
    percorrer(getCatalogoPermissoes());
    mapaPaisCache = mapa;
  }
  return mapaPaisCache;
};

export const rotuloDoId = (id: string): string => {
  const procurar = (nos: NoPermissao[]): string | null => {
    for (const no of nos) {
      if (no.id === id) return no.label;
      const achado = procurar(no.filhos);
      if (achado) return achado;
    }
    return null;
  };
  return procurar(getCatalogoPermissoes()) || id;
};

/** Ids de um nó e de todos os seus descendentes. */
export const idsDoRamo = (no: NoPermissao): string[] => [
  no.id,
  ...no.filhos.flatMap((f) => idsDoRamo(f)),
];
