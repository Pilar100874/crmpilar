import { describe, expect, it } from "vitest";
import { contatoDaBarraFinalizacao } from "./barraFinalizacao";

describe("finalização pelo cartão clicado", () => {
  it("não abre pendências sem clicar num cartão", () => {
    expect(contatoDaBarraFinalizacao(null, "a", ["a", "b"])).toBeNull();
  });
  it("oculta a barra anterior ao abrir outro contato sem pendência", () => {
    expect(contatoDaBarraFinalizacao("b", "b", ["a"])).toBeNull();
  });
  it("reabre a pendência ao clicar novamente no mesmo contato", () => {
    expect(contatoDaBarraFinalizacao("a", "a", ["a", "b"])).toBe("a");
  });
  it("mostra somente o contato clicado quando há várias pendências", () => {
    expect(contatoDaBarraFinalizacao("b", "b", ["a", "b"])).toBe("b");
  });
  it("não promove outra pendência após finalizar o contato aberto", () => {
    expect(contatoDaBarraFinalizacao("a", "a", ["b"])).toBeNull();
  });
  it("não finaliza um cartão anterior quando outro contato está aberto", () => {
    expect(contatoDaBarraFinalizacao("a", "b", ["a", "b"])).toBeNull();
  });
});