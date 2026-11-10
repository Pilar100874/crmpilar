import { describe, expect, it } from "vitest";
import { correspondeBuscaAgenda } from "./buscaAgenda";

const tarefa = { title: "Retorno comercial", contactName: "João Silva", description: "Revisar proposta", userName: "Márcia", date: new Date(2026, 10, 10) };
describe("busca da agenda", () => {
  it("encontra contato sem depender de acentos ou maiúsculas", () => {
    expect(correspondeBuscaAgenda(tarefa, "  JOAO  ")).toBe(true);
    expect(correspondeBuscaAgenda(tarefa, "Pedro")).toBe(false);
  });
  it("pesquisa título, descrição, responsável e data", () => {
    for (const busca of ["retorno", "proposta", "marcia", "10/11/2026"]) expect(correspondeBuscaAgenda(tarefa, busca)).toBe(true);
  });
  it("combina termos e restaura todas as tarefas ao limpar", () => {
    expect(correspondeBuscaAgenda(tarefa, "joao retorno")).toBe(true);
    expect(correspondeBuscaAgenda(tarefa, "joao cobrança")).toBe(false);
    expect(correspondeBuscaAgenda(tarefa, " ")).toBe(true);
  });
});