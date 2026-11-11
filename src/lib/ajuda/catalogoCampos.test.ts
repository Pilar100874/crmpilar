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
  it("botão de data dinâmica vira o seletor de data da agenda", () => {
    expect(buscarAjuda("Selecionar 18/11/2026")?.tela).toBe("Minha agenda");
  });
  it("Gravações com contador tem explicação oficial", () => {
    expect(buscarAjuda("Gravações (3)")?.tela).toBe("Pilar Fone / Atendimento");
  });
});

import { buscarAjuda as buscar2, textoOficial as texto2 } from "./catalogoCampos";
import { it as it2, expect as expect2 } from "vitest";
it2("Disparo em massa usa o texto oficial do Atendimento", () => {
  expect2(buscar2("Disparo em massa")?.paraQue).toContain("vários clientes");
});
it2("botão não mostra 'se ficar vazio'", () => {
  expect2(texto2(buscar2("Ligação com IA"), "botão")).not.toContain("Se ficar vazio");
});
it2("Próximo cliente no Atendimento tem texto oficial", () => {
  expect2(buscar2("Próximo cliente", "/atendimento")?.paraQue).toContain("próximo cliente da fila");
});
