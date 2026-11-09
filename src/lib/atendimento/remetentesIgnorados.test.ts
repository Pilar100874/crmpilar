import { describe, it, expect } from "vitest";
import { ehEmailAutomatico, emailIgnorado, telefoneIgnorado } from "./remetentesIgnorados";

describe("remetentes ignorados", () => {
  it("filtra no-reply automaticamente", () => {
    expect(ehEmailAutomatico("Banco <noreply@banco.com.br>")).toBe(true);
    expect(ehEmailAutomatico("naoresponda@loja.com")).toBe(true);
  });
  it("não filtra cliente comum", () => {
    expect(ehEmailAutomatico("joao@cliente.com.br", "Pedido de papel")).toBe(false);
  });
  it("ignora domínio inteiro", () => {
    expect(emailIgnorado("ana@fornecedor.com", [{ tipo: "dominio", valor: "fornecedor.com" }])).toBe(true);
  });
  it("reativado volta a aparecer", () => {
    expect(emailIgnorado("ana@fornecedor.com", [])).toBe(false);
  });
  it("ignora telefone com ou sem 55", () => {
    expect(telefoneIgnorado("+55 (11) 98765-4321", [{ tipo: "telefone", valor: "11987654321" }])).toBe(true);
  });
});
