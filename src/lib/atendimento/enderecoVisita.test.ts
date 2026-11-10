import { describe, expect, it } from "vitest";
import { possuiEnderecoVisita } from "./enderecoVisita";

describe("menu Visita por endereço cadastrado", () => {
  it("oculta sem empresa cadastrada", () => {
    expect(possuiEnderecoVisita([])).toBe(false);
    expect(possuiEnderecoVisita([{ endereco: "Rua Central" }])).toBe(false);
  });
  it("oculta sem endereço ou com espaços", () => {
    expect(possuiEnderecoVisita([{ id: "empresa", endereco: null }])).toBe(false);
    expect(possuiEnderecoVisita([{ id: "empresa", endereco: "  " }])).toBe(false);
  });
  it("mostra quando uma empresa vinculada tem endereço", () => {
    expect(possuiEnderecoVisita([{ id: "empresa", endereco: "Rua Central, 100" }])).toBe(true);
    expect(possuiEnderecoVisita([{ id: "a", endereco: "" }, { id: "b", endereco: "Rua Central" }])).toBe(true);
  });
});