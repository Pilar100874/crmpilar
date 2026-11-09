import { describe, it, expect } from "vitest";
import { pendenciasCadastro } from "./pendenciasCadastro";

describe("pendenciasCadastro", () => {
  it("aponta e-mail, telefone e empresa ausentes", () => {
    expect(pendenciasCadastro({ nome: "Ana" })).toEqual(["Telefone ou WhatsApp", "E-mail", "Empresa vinculada"]);
  });
  it("cadastro completo não gera alerta", () => {
    expect(pendenciasCadastro({ nome: "Ana", whatsapp: "11999", email: "a@b.com", companies: [{ empresas: { id: "1", cnpj: "123" } }] })).toEqual([]);
  });
  it("empresa sem CNPJ/CPF gera alerta", () => {
    expect(pendenciasCadastro({ nome: "Ana", telefone: "1", email: "a@b", companies: [{ id: "1" }] })).toEqual(["CNPJ/CPF da empresa"]);
  });
});
