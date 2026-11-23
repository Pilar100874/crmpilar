import { describe, expect, it, vi } from "vitest";
import { BarChart3, MessageSquare } from "lucide-react";
import type { MenuItem } from "@/components/Layout";
import { getEffectiveMainCustomization, type MenuCustomization } from "./menuCustomization";
import {MENUS_OPERACIONAIS} from './menusOperacionais';

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getEstabelecimentoId: vi.fn() }));

const base: MenuItem[] = [{ id: "Atendimento", title: "Chats", icon: MessageSquare, subItems: [
  { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: MessageSquare },
  { id: "Jornada Equipe", title: "Jornada da equipe", url: "/jornada-equipe", icon: BarChart3 },
] }];

describe("novos programas no menu personalizado", () => {
  it('agrupa os três módulos na raiz e suas configurações sem alterar outros menus salvos', () => {
    const custom: MenuCustomization = {version:1,roots:[{kind:'container',id:'meu-menu',title:'Meu menu',children:[{kind:'program',programId:'Faturamento'},{kind:'program',programId:'Painel Chats'}]},{kind:'program',programId:'Motor próprio NF-e'},{kind:'container',id:'g-Compras-Configurações',title:'Configurações',children:[{kind:'program',programId:'Config Estab Condicoes Pagamento'}]}]};
    const effective = getEffectiveMainCustomization([...base,...MENUS_OPERACIONAIS],custom);
    for (const menu of MENUS_OPERACIONAIS) {
      const root = effective.roots.find(n => n.kind === 'container' && n.id === `c-${menu.id}`);
      expect(root?.kind).toBe('container');
      if (root?.kind !== 'container') throw new Error('Menu ausente');
      expect(root.children[root.children.length - 1]).toEqual({kind:'program',programId:`Config ${menu.title}`});
      const grupo = root.children.find(n => n.kind === 'container');
      expect(grupo?.kind === 'container' ? grupo.children.map(n => n.kind === 'program' ? n.programId : '') : []).toEqual(menu.subItems.filter(s => s.group).map(s => s.id));
    }
    expect(effective.roots.find(n => n.kind === 'container' && n.id === 'meu-menu')).toEqual({kind:'container',id:'meu-menu',title:'Meu menu',children:[{kind:'program',programId:'Painel Chats'}]});
    expect(custom.roots).toHaveLength(3);
    expect(JSON.stringify(effective)).not.toContain('Motor próprio NF-e');
    const again = getEffectiveMainCustomization([...base,...MENUS_OPERACIONAIS],effective);
    expect(again).toEqual(effective);
  });
  it("insere Jornada da equipe dentro de Chats sem alterar a personalização salva", () => {
    const custom: MenuCustomization = { version: 1, roots: [{ kind: "container", id: "c-Atendimento", title: "Chats", children: [{ kind: "program", programId: "Painel Chats" }] }] };
    const effective = getEffectiveMainCustomization(base, custom);
    const chats = effective.roots.find(n => n.kind === "container" && n.id === "c-Atendimento");
    expect(chats?.kind === "container" ? chats.children : []).toContainEqual({ kind: "program", programId: "Jornada Equipe" });
    expect(effective.roots).not.toContainEqual({ kind: "program", programId: "Jornada Equipe" });
    expect(custom.roots[0]).toEqual({ kind: "container", id: "c-Atendimento", title: "Chats", children: [{ kind: "program", programId: "Painel Chats" }] });
  });
  it("preserva um programa explicitamente posicionado fora da categoria original", () => {
    const custom: MenuCustomization = { version: 1, roots: [{ kind: "program", programId: "Jornada Equipe" }, { kind: "container", id: "c-Atendimento", title: "Chats", children: [{ kind: "program", programId: "Painel Chats" }] }] };
    const effective = getEffectiveMainCustomization(base, custom);
    expect(effective.roots[0]).toEqual({ kind: "program", programId: "Jornada Equipe" });
    const chats = effective.roots.find(n => n.kind === "container" && n.id === "c-Atendimento");
    expect(chats?.kind === "container" ? chats.children : []).not.toContainEqual({ kind: "program", programId: "Jornada Equipe" });
  });
});