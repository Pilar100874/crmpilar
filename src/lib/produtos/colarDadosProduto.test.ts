import { expect, it } from 'vitest';
import { colarDadosProduto } from './colarDadosProduto';
it('copia configuração sem trocar identidade, códigos de barras ou estoque do destino', () => {
  const destino = { nome: 'B', codigo: 'SKU-B', estoque: '12', ean_13: '13B', ean_14_1: '14B', ean_14_2: '15B', gtin: 'B', unidade: 'un', dados: { consumo: 1 } };
  const origem = { ...destino, nome: 'A', codigo: 'SKU-A', estoque: '90', ean_13: '13A', ean_14_1: '14A', ean_14_2: '15A', gtin: 'A', unidade: 'kg', dados: { consumo: 10 } };
  const colado = colarDadosProduto(destino, origem);
  expect(colado).toEqual({ ...destino, unidade: 'kg', dados: { consumo: 10 } });
  colado.dados.consumo = 20;
  expect(origem.dados.consumo).toBe(10);
});