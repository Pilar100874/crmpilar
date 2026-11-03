import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { podeLigarComIa, ramalOcupado } from "./ramaisUsuario";

describe("ramais de IA do usuário", () => {
  it("bloqueia ligação com IA sem 'fazer ligações' habilitado", () => {
    expect(podeLigarComIa({ ligacoes_ativo: false, ramal_ligacoes: "4444" })).toBe(false);
    expect(podeLigarComIa({ ligacoes_ativo: true, ramal_ligacoes: "" })).toBe(false);
    expect(podeLigarComIa({ ligacoes_ativo: true, ramal_ligacoes: "4444" })).toBe(true);
  });

  it("considera o ramal ocupado quando aparece numa chamada da central", () => {
    expect(ramalOcupado("2222", false, [{ canal: "PJSIP/2222-0001" }])).toBe(true);
    expect(ramalOcupado("2222", false, [{ canal: "PJSIP/22220-0001" }])).toBe(false);
    expect(ramalOcupado("2222", true, [])).toBe(true);
    expect(ramalOcupado("2222", false, [])).toBe(false);
  });
});
