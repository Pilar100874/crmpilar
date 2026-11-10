import { describe, it, expect } from "vitest";
import { clientesSemTarefaHoje, resumirPedidosAbertos } from "./pedidosAbertos";
import { formatarMotivoPerda, validarMotivoPerda } from "./motivoPerda";

describe("pedidos em aberto na agenda", () => {
  const pedidos = [
    { id: "a", clienteId: "c1", etapa: "negociacao", valor: 100, criado: "2026-01-02" },
    { id: "b", clienteId: "c1", etapa: "orcamento", valor: 50, criado: "2026-01-01" },
    { id: "c", clienteId: "c2", etapa: "finalizado", valor: 999, criado: "2026-01-01" },
    { id: "d", clienteId: "c3", etapa: "perdido", valor: 10, criado: "2026-01-01" },
  ];
  it("só conta orçamento, negociação e aprovação", () => {
    const m = resumirPedidosAbertos(pedidos);
    expect([...m.keys()]).toEqual(["c1"]);
    expect(m.get("c1")).toMatchObject({ quantidade: 2, valor: 150, orcamentoId: "b" });
  });
  it("cria cartão diário só para quem não tem tarefa hoje", () => {
    const m = resumirPedidosAbertos(pedidos);
    expect(clientesSemTarefaHoje(m, new Set())).toEqual(["c1"]);
    expect(clientesSemTarefaHoje(m, new Set(["c1"]))).toEqual([]);
  });
});

describe("motivo de perda obrigatório", () => {
  it("bloqueia sem motivo", () => expect(validarMotivoPerda({ tipo: "", itens: [] })).not.toHaveLength(0));
  it("preço exige item e valor do cliente", () => {
    expect(validarMotivoPerda({ tipo: "preco", itens: [] })).not.toHaveLength(0);
    expect(validarMotivoPerda({ tipo: "preco", itens: [{ itemId: "1", nome: "X", nossoPreco: 10 }] })).not.toHaveLength(0);
    expect(validarMotivoPerda({ tipo: "preco", itens: [{ itemId: "1", nome: "X", nossoPreco: 10, precoCliente: 8 }] })).toEqual([]);
  });
  it("estoque exige itens", () => expect(validarMotivoPerda({ tipo: "estoque", itens: [] })).not.toHaveLength(0));
  it("prazo exige prazo pedido e ofertado", () => expect(validarMotivoPerda({ tipo: "prazo_entrega", itens: [], prazoSolicitado: "2 dias" })).not.toHaveLength(0));
  it("texto começa com o motivo e traz item e valores", () => {
    const t = formatarMotivoPerda({ tipo: "preco", itens: [{ itemId: "1", nome: "Cimento", nossoPreco: 10, precoCliente: 8 }] });
    expect(t.startsWith("Preço")).toBe(true);
    expect(t).toContain("Cimento");
  });
});
