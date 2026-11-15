import { describe, expect, it } from "vitest";
import { catalogoVenda, type ConfigVenda } from "../../../supabase/functions/_shared/catalogoVenda";

describe("saldo no catálogo de voz", () => {
  it("preserva 12,4 kg e usa a unidade do produto, não a forma de preço", async () => {
    let selecao = "";
    const query = {
      select: (s: string) => { selecao = s; return query; },
      eq: () => query, neq: () => query, order: () => query,
      limit: async () => ({ data: [{ nome: "Matéria-prima", estoque: 12.4, unidade: "kg", tipo_preco: "categoria", preco_tabela: 0 }] }),
    };
    const cfg: ConfigVenda = { desconto: 0, similares: false, filtro: "", modalidade: "venda", parcelas: 1 };
    const texto = await catalogoVenda({ from: () => query }, "teste-decimal-kg", cfg);
    expect(selecao).toContain("estoque:estoque_saldo");
    expect(texto).toContain("estoque: 12.4 kg");
    expect(texto).not.toContain("12.4 categoria");
  });
});