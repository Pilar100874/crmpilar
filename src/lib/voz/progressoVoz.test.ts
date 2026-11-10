import { describe, expect, it } from "vitest";
import { progressoVoz } from "../../../supabase/functions/_shared/progressoVoz";

const pergunta = [{ papel: "agente", texto: "O senhor conseguiu dar uma olhada no orçamento?" }];
describe("avanço do diálogo de orçamento", () => {
  it("interpreta sim como orçamento analisado", () => {
    expect(progressoVoz(pergunta, "Sim.", false).respostaOrcamento).toBe("analisou");
  });
  it("interpreta não como orçamento ainda não analisado", () => {
    expect(progressoVoz(pergunta, "Não, ainda não consegui.", false).respostaOrcamento).toBe("nao_analisou");
  });
  it("não usa sim da confirmação de identidade como análise de orçamento", () => {
    expect(progressoVoz([{ papel: "agente", texto: "Falo com o responsável pelas compras?" }], "Sim.", false).respostaOrcamento).toBeNull();
  });
  it("não avança com alô ou silêncio", () => {
    expect(progressoVoz(pergunta, "Alô", false).respostaOrcamento).toBeNull();
    expect(progressoVoz(pergunta, "", true).respostaOrcamento).toBeNull();
  });
  it("encerra no segundo silêncio sem resposta, inclusive em aparelhos que não registram silêncio", () => {
    expect(progressoVoz(pergunta, "", true).encerrarSilencio).toBe(false);
    expect(progressoVoz([...pergunta, { papel: "agente", texto: "Alô, consegue me ouvir?" }], "", true).encerrarSilencio).toBe(true);
  });
  it("uma fala real reinicia a verificação de silêncio", () => {
    expect(progressoVoz([{ papel: "agente", texto: "Alô, consegue me ouvir?" }, { papel: "cliente", texto: "Sim" }, ...pergunta], "", true).encerrarSilencio).toBe(false);
  });
});