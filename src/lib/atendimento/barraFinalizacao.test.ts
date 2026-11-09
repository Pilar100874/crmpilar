import { describe, expect, it } from "vitest";
import { contatoDaBarraFinalizacao, itemNaoFinalizado } from "./barraFinalizacao";

describe("finalização pelo cartão clicado", () => {
  it("aceita o cartão do canal explicitamente aberto mesmo ausente da fila Agendados", () => {
    const filaAgendados = ['outro-contato'];
    const contatoDoChat = 'cliente-sem-tarefa-hoje';
    expect(filaAgendados.includes(contatoDoChat)).toBe(false);
    expect(contatoDaBarraFinalizacao(contatoDoChat, contatoDoChat, [contatoDoChat])).toBe(contatoDoChat);
  });
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

describe("filtro de contatos não finalizados", () => {
  it("mantém no filtro o contato com atendimento pendente", () => {
    expect(itemNaoFinalizado("a", ["a", "b"])).toBe(true);
  });
  it("remove do filtro o contato já finalizado", () => {
    expect(itemNaoFinalizado("c", ["a", "b"])).toBe(false);
  });
  it("remove itens sem contato vinculado", () => {
    expect(itemNaoFinalizado(null, ["a"])).toBe(false);
    expect(itemNaoFinalizado(undefined, ["a"])).toBe(false);
  });
});