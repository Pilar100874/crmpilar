import { describe, expect, it } from "vitest";
import { itensSugeridos, aplicaAoTipo, RESPONSAVEIS, itensDoResponsavel } from "./checklistSaida";
import { disponivelNoChecklist, selecionarResponsavel } from "./gruposBiblioteca";

describe("check list de saída", () => {
  it("inclui freios de serviço e estacionamento no motorista", () => {
    const freios = itensSugeridos().find(i => i.responsavel === "motorista" && i.categoria === "Freios");
    expect(freios?.item).toContain("freios de serviço e estacionamento");
    expect(freios && aplicaAoTipo(freios, "Carro")).toBe(true);
  });
  it.each(["motorista", "porteiro", "mecanico"] as const)("isola os itens do PDF de %s", r => {
    const lista = itensDoResponsavel(itensSugeridos(), r);
    expect(lista.length).toBeGreaterThan(0);
    expect(new Set(lista.map(i => i.responsavel))).toEqual(new Set([r]));
    expect(itensDoResponsavel(lista.map(i => ({ ...i, ativo: false })), r)).toEqual([]);
  });
  it("ordena portaria logo após motorista e antes do mecânico", () => {
    expect(RESPONSAVEIS.map(r => r.valor)).toEqual(["motorista", "porteiro", "mecanico"]);
  });
  it("porteiro verifica embriaguez e anota dados do veículo", () => {
    const itens = itensSugeridos();
    const embriaguez = itens.find(i => i.responsavel === "porteiro" && i.item.includes("sinais de embriaguez"));
    const placa = itens.find(i => i.responsavel === "porteiro" && i.item.includes("placa, o tipo e a cor"));
    const km = itens.find(i => i.responsavel === "porteiro" && i.item.includes("quilometragem do painel"));
    expect(embriaguez).toBeDefined();
    expect(placa).toBeDefined();
    expect(km).toBeDefined();
    expect(embriaguez && aplicaAoTipo(embriaguez, "Caminhão Pesado")).toBe(true);
  });
  it("porteiro não lista mais itens de carga ou portão", () => {
    const porteiro = itensSugeridos().filter(i => i.responsavel === "porteiro");
    expect(porteiro.every(i => !i.item.includes("baú"))).toBe(true);
    expect(porteiro.every(i => !i.item.includes("Portão"))).toBe(true);
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
  it("verifica vazamento de óleo no motor para motorista e mecânico", () => {
    const itens = itensSugeridos();
    const motorista = itens.find(i => i.responsavel === "motorista" && i.categoria === "Motor" && i.item.includes("vazamento de óleo no motor"));
    const mecanico = itens.find(i => i.responsavel === "mecanico" && i.categoria === "Motor" && i.item.includes("Vazamento de óleo no motor"));
    expect(motorista).toBeDefined();
    expect(mecanico).toBeDefined();
    expect(motorista && aplicaAoTipo(motorista, "Carro")).toBe(true);
    expect(mecanico && aplicaAoTipo(mecanico, "Caminhão Pesado")).toBe(true);
  });
  it("confere troca de óleo em dia para motorista e mecânico", () => {
    const itens = itensSugeridos();
    const motorista = itens.find(i => i.responsavel === "motorista" && i.categoria === "Motor" && i.item.includes("troca de óleo do motor está em dia"));
    const mecanico = itens.find(i => i.responsavel === "mecanico" && i.categoria === "Motor" && i.item.includes("Troca de óleo em dia"));
    expect(motorista).toBeDefined();
    expect(mecanico).toBeDefined();
    expect(motorista && aplicaAoTipo(motorista, "Van")).toBe(true);
    expect(mecanico && aplicaAoTipo(mecanico, "Carro")).toBe(true);
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