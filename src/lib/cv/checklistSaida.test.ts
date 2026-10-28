import { describe, expect, it } from "vitest";
import { itensSugeridos, aplicaAoTipo, RESPONSAVEIS } from "./checklistSaida";
import { disponivelNoChecklist, selecionarResponsavel } from "./gruposBiblioteca";

describe("check list de saída", () => {
  it("ordena portaria logo após motorista e antes do mecânico", () => {
    expect(RESPONSAVEIS.map(r => r.valor)).toEqual(["motorista", "porteiro", "mecanico"]);
  });
  it("exige conferência do formulário preenchido pelo porteiro", () => {
    const recebimento = itensSugeridos().find(i => i.responsavel === "porteiro" && i.item === "Recebi o check list do motorista preenchido e assinado");
    expect(recebimento).toBeDefined();
    expect(recebimento && aplicaAoTipo(recebimento, "Carro")).toBe(true);
  });
  it("inclui água diariamente nas responsabilidades do motorista", () => {
    const agua = itensSugeridos().find(i => i.responsavel === "motorista" && i.item.includes("diariamente") && i.item.includes("água"));
    expect(agua).toBeDefined();
    expect(agua && aplicaAoTipo(agua, "Carro")).toBe(true);
    expect(agua && aplicaAoTipo(agua, "Caminhão Pesado")).toBe(true);
  });
  it("inclui óleo diariamente nas responsabilidades do motorista", () => {
    const oleo = itensSugeridos().find(i => i.responsavel === "motorista" && i.item.includes("diariamente") && i.item.includes("óleo do motor"));
    expect(oleo).toBeDefined();
    expect(oleo && aplicaAoTipo(oleo, "Caminhão Pesado")).toBe(true);
  });
  const item = { uso_manutencao: false, ativo: true, sistema: "Motor", checklist_responsaveis: ["motorista", "mecanico"], checklist_selecionados: ["mecanico"], checklist_tipos: ["Carro"] };
  it("filtra simultaneamente grupo, responsável e veículo", () => {
    expect(disponivelNoChecklist(item, "motorista", "Motor", "Carro")).toBe(true);
    expect(disponivelNoChecklist(item, "motorista", "Freios", "Carro")).toBe(false);
    expect(disponivelNoChecklist(item, "motorista", "Motor", "Van")).toBe(false);
    expect(disponivelNoChecklist({ ...item, checklist_responsaveis: ["mecanico"] }, "motorista", "Motor", "Carro")).toBe(false);
  });
  it("seleciona separadamente sem remover o outro responsável", () => {
    expect(selecionarResponsavel(item, "motorista", true)).toEqual(["mecanico", "motorista"]);
    expect(selecionarResponsavel(item, "motorista", false)).toEqual(["mecanico"]);
  });
});