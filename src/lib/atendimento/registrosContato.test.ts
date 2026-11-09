import { describe, expect, it } from "vitest";
import {
  extrairEnderecos,
  montarRegistrosPorContato,
  possuiAgenda,
  possuiHistorico,
  possuiOrcamento,
  possuiTarefa,
  REGISTROS_VAZIOS,
} from "./registrosContato";

const contatos = [{ id: "novo", email: "" }, { id: "velho", email: "ana@acme.com" }];

describe("atalhos por registro do contato", () => {
  it("esconde tudo do contato recém-cadastrado", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [],
      conversas: [],
      emails: [],
      orcamentos: [],
    });
    expect(possuiHistorico(registros.get("novo"))).toBe(false);
    expect(possuiTarefa(registros.get("novo"))).toBe(false);
    expect(possuiAgenda(registros.get("novo"))).toBe(false);
    expect(possuiOrcamento(registros.get("novo"))).toBe(false);
  });

  it("mostra histórico e agenda quando existe tarefa, mas não orçamentos", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [{ contact_id: "novo" }],
      conversas: [],
      emails: [],
      orcamentos: [],
    });
    expect(possuiHistorico(registros.get("novo"))).toBe(true);
    expect(possuiAgenda(registros.get("novo"))).toBe(true);
    expect(possuiOrcamento(registros.get("novo"))).toBe(false);
  });

  it("casa o e-mail pelo endereço do contato, mesmo formatado com nome", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [],
      conversas: [],
      emails: [{ from_email: "Ana <ana@acme.com>", to_email: "vendedor@pilar.com.br" }],
      orcamentos: [],
    });
    expect(registros.get("velho")?.emails).toBe(1);
    expect(possuiHistorico(registros.get("velho"))).toBe(true);
    expect(possuiHistorico(registros.get("novo"))).toBe(false);
  });

  it("conta o e-mail uma única vez quando o mesmo endereço aparece em de e para", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [],
      conversas: [],
      emails: [{ from_email: "ana@acme.com", to_email: "Ana <ana@acme.com>, outro@acme.com" }],
      orcamentos: [],
    });
    expect(registros.get("velho")?.emails).toBe(1);
  });

  it("mostra o atalho de orçamentos quando o contato tem orçamento", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [],
      conversas: [],
      emails: [],
      orcamentos: [{ cliente_id: "novo" }, { cliente_id: "novo" }],
    });
    expect(possuiOrcamento(registros.get("novo"))).toBe(true);
    expect(possuiTarefa(registros.get("novo"))).toBe(false);
  });

  it("não cria registros para contato de fora da lista", () => {
    const registros = montarRegistrosPorContato({
      contatos,
      tarefas: [{ contact_id: "estranho" }],
      conversas: [],
      emails: [],
      orcamentos: [],
    });
    expect(registros.has("estranho")).toBe(false);
    expect(registros.get("novo")).toEqual(REGISTROS_VAZIOS);
  });

  it("extrai endereços de listas separadas por vírgula e ponto e vírgula", () => {
    expect(extrairEnderecos("Ana <ana@acme.com>; joao <joao@acme.com>")).toEqual(["ana@acme.com", "joao@acme.com"]);
    expect(extrairEnderecos(null)).toEqual([]);
  });
});
