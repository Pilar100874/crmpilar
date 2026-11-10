import { describe, expect, it } from "vitest";
import { correspondeFiltroContato } from "./filtroContato";

describe("filtro da fila de contatos", () => {
  const empresa = { id: "empresa-a", contatos: new Set(["ana", "joao"]), emails: new Set(["ana@cliente.com"]) };
  it("mostra somente o contato selecionado, em qualquer origem", () => {
    const filtro = { type: "customer" as const, id: "ana", email: "ana@cliente.com" };
    expect(["ana", "joao"].filter(id => correspondeFiltroContato(id, null, filtro, null))).toEqual(["ana"]);
  });
  it("filtra a empresa pelos vínculos salvos, não pelo nome do contato", () => {
    expect(["ana", "joao", "empresa-a"].filter(id => correspondeFiltroContato(id, null, { type: "empresa", id: "empresa-a" }, empresa))).toEqual(["ana", "joao"]);
  });
  it("inclui e-mail sem cadastro somente pela correspondência exata do remetente", () => {
    const filtro = { type: "customer" as const, id: "ana", email: "ana@cliente.com" };
    expect(correspondeFiltroContato(null, "ANA@CLIENTE.COM", filtro, null)).toBe(true);
    expect(correspondeFiltroContato(null, "outra-ana@cliente.com", filtro, null)).toBe(false);
  });
  it("não reaproveita vínculos de outra empresa ao trocar o filtro", () => {
    expect(correspondeFiltroContato("ana", null, { type: "empresa", id: "empresa-b" }, empresa)).toBe(false);
  });
  it("limpar o filtro restaura todos os itens", () => {
    expect(correspondeFiltroContato("joao", null, null, empresa)).toBe(true);
  });
  it("filtra remetentes sem cadastro pelos e-mails vinculados à empresa", () => {
    expect(correspondeFiltroContato(null, "ANA@CLIENTE.COM", { type: "empresa", id: "empresa-a" }, empresa)).toBe(true);
    expect(correspondeFiltroContato(null, "outro@cliente.com", { type: "empresa", id: "empresa-a" }, empresa)).toBe(false);
  });
});