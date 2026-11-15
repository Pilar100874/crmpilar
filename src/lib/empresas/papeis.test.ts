import { describe, it, expect } from "vitest";
import { somenteFornecedor } from "./papeis";

describe("somenteFornecedor", () => {
  it("fornecedor sem ser cliente fica fora das telas de clientes", () => {
    expect(somenteFornecedor({ eh_fornecedor: true, eh_cliente: false })).toBe(true);
  });
  it("fornecedor que também é cliente continua aparecendo", () => {
    expect(somenteFornecedor({ eh_fornecedor: true, eh_cliente: true })).toBe(false);
  });
  it("vendedor não é tratado como só fornecedor", () => {
    expect(somenteFornecedor({ eh_fornecedor: true, eh_cliente: false, eh_vendedor: true })).toBe(false);
  });
});
