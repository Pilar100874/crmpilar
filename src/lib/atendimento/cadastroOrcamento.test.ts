import { describe, expect, it } from "vitest";
import { pendenciasOrcamento, type CadastroOrcamento } from "./cadastroOrcamento";

const completo: CadastroOrcamento = {
  contato: { id: "contato", nome: "Ana", telefone: "11999999999", tel: null, email: "ana@empresa.com" },
  empresa: { id: "empresa", nome: "Empresa", cnpj: "12345678000199" },
  vinculado: true, responsavel: true,
};
describe("cadastro obrigatório para orçamento", () => {
  it("bloqueia sem empresa cadastrada e vinculada", () => {
    expect(pendenciasOrcamento({ ...completo, empresa: null, vinculado: false })).toContain("Empresa vinculada");
  });
  it("bloqueia contato sem e-mail", () => {
    expect(pendenciasOrcamento({ ...completo, contato: { ...completo.contato, id: "contato", nome: "Ana", telefone: "11999999999", tel: null, email: "" } })).toContain("E-mail");
  });
  it("bloqueia contato sem telefone ou WhatsApp", () => {
    expect(pendenciasOrcamento({ ...completo, contato: { id: "contato", nome: "Ana", telefone: null, tel: null, email: "ana@empresa.com" } })).toContain("Telefone ou WhatsApp");
  });
  it("bloqueia contato temporário mesmo com dados herdados da empresa", () => {
    expect(pendenciasOrcamento({ ...completo, contato: { id: "contato", nome: "Empresa", telefone: "11999999999", tel: null, email: "ana@empresa.com", custom_fields: { contato_temporario: true } } })).toContain("Dados do contato real");
  });
  it("bloqueia empresa sem documento", () => {
    expect(pendenciasOrcamento({ ...completo, empresa: { id: "empresa", nome: "Empresa", cnpj: null } })).toContain("CNPJ/CPF da empresa");
  });
  it("bloqueia sem responsável", () => {
    expect(pendenciasOrcamento({ ...completo, responsavel: false })).toContain("Usuário responsável pelo contato");
  });
  it("permite apenas cadastro completo", () => {
    expect(pendenciasOrcamento(completo)).toEqual([]);
  });
});