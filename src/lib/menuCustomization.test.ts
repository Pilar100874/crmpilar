import { describe, expect, it, vi } from "vitest";
import { BarChart3, MessageSquare } from "lucide-react";
import type { MenuItem } from "@/components/Layout";
import { getEffectiveMainCustomization, type MenuCustomization } from "./menuCustomization";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getEstabelecimentoId: vi.fn() }));

const base: MenuItem[] = [{ id: "Atendimento", title: "Chats", icon: MessageSquare, subItems: [
  { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: MessageSquare },
  { id: "Jornada Equipe", title: "Jornada da equipe", url: "/jornada-equipe", icon: BarChart3 },
] }];

describe("novos programas no menu personalizado", () => {
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