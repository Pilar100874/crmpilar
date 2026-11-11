import { describe, expect, it } from "vitest";
import { buscarAjuda } from "./catalogoCampos";

describe("Ajuda global – catálogo de campos", () => {
  it("encontra campo ignorando acento, maiúsculas e asterisco", () => {
    expect(buscarAjuda("Código de escuta silenciosa *")?.tela).toBe("Configuração PABX");
  });
  it("respeita a rota quando o campo é específico de uma tela", () => {
    expect(buscarAjuda("Marca", "/produtos")?.tela).toBe("Produtos");
    expect(buscarAjuda("Marca", "/config")).toBeNull();
  });
  it("campo desconhecido fica para a IA", () => {
    expect(buscarAjuda("Cor favorita")).toBeNull();
  });
});
