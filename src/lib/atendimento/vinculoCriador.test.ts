import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getUserIdFromAuth: vi.fn() }));
import { usuariosComCriador, exigirUsuarioCriador } from "./vinculoCriador";
import { getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
describe("vínculo automático do criador", () => {
  it("inclui quem criou mesmo sem responsável selecionado", () => {
    expect(usuariosComCriador("criador", [])).toEqual(["criador"]);
  });
  it("preserva outros responsáveis sem duplicar quem criou", () => {
    expect(usuariosComCriador("criador", ["gerente", "criador", "gerente"])).toEqual(["criador", "gerente"]);
  });
  it("usa o identificador interno resolvido do usuário", async () => {
    vi.mocked(getUserIdFromAuth).mockResolvedValue("usuario-interno");
    expect(await exigirUsuarioCriador()).toBe("usuario-interno");
  });
  it("impede cadastro sem conseguir identificar o responsável", async () => {
    vi.mocked(getUserIdFromAuth).mockResolvedValue(null);
    await expect(exigirUsuarioCriador()).rejects.toThrow("Usuário responsável não encontrado");
  });
});