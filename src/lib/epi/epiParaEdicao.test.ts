import { describe, expect, it } from "vitest";
import { epiParaEdicao } from "./regrasEpi";

// EPI salvo antes das obrigatoriedades: fabricante, CA e tamanho vieram nulos do banco.
const linhaAntiga = {
  id: "e1",
  nome: "Luva",
  categoria: null,
  ca_numero: null,
  ca_validade: null,
  ca_validade_indeterminada: null,
  fabricante: null,
  tamanho: null,
  vida_util_dias: null,
  estoque: 3,
  estoque_minimo: 0,
  ativo: true,
};

test("abrir EPI antigo preenche os campos de texto vazios sem nulos", () => {
  const form = epiParaEdicao(linhaAntiga);
  expect(form.fabricante).toBe("");
  expect(form.ca_numero).toBe("");
  expect(form.tamanho).toBe("");
  expect(form.categoria).toBe("");
  expect(form.ca_validade).toBe("");
  expect(form.vida_util_dias).toBe("");
  expect(form.ca_validade_indeterminada).toBe(false);
  // a validação lê esses campos com .trim(): nenhum pode ser null
  expect(() => `${form.nome}${form.fabricante}${form.ca_numero}${form.tamanho}`.trim()).not.toThrow();
});

test("abrir EPI antigo mantém estoque e marca como texto editável", () => {
  const form = epiParaEdicao(linhaAntiga);
  expect(form.estoque).toBe("3");
  expect(form.estoque_minimo).toBe("0");
  expect(form.id).toBe("e1");
  expect(form.nome).toBe("Luva");
  expect(form.ativo).toBe(true);
});

test("abrir EPI completo conserva os valores salvos", () => {
  const form = epiParaEdicao({
    ...linhaAntiga,
    categoria: "Proteção das mãos",
    ca_numero: "1234",
    ca_validade: "2027-05-01",
    ca_validade_indeterminada: false,
    fabricante: "Malha",
    tamanho: "M",
    vida_util_dias: 30,
    estoque: 10,
    estoque_minimo: 2,
  });
  expect(form.categoria).toBe("Proteção das mãos");
  expect(form.ca_numero).toBe("1234");
  expect(form.ca_validade).toBe("2027-05-01");
  expect(form.fabricante).toBe("Malha");
  expect(form.tamanho).toBe("M");
  expect(form.vida_util_dias).toBe(30);
  expect(form.estoque).toBe("10");
  expect(form.estoque_minimo).toBe("2");
});

test("validade indeterminada continua marcada ao reabrir", () => {
  const form = epiParaEdicao({ ...linhaAntiga, ca_validade_indeterminada: true, ca_validade: null });
  expect(form.ca_validade_indeterminada).toBe(true);
  expect(form.ca_validade).toBe("");
});
