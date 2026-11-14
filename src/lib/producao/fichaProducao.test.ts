import { describe, it, expect } from 'vitest';
import { calcularProducao, validarFicha, type FichaProducao } from './fichaProducao';
const ficha: FichaProducao = {
  quantidade_base: 10, unidade_produto: 'un',
  materiais: [
    { id: 'x', nome: 'X', opcoes: [{ id: 'x1', produto_id: 'x', quantidade: 2, unidade: 'kg' }, { id: 'a1', produto_id: 'a', quantidade: 3, unidade: 'kg' }] },
    { id: 'y', nome: 'Y', opcoes: [{ id: 'y1', produto_id: 'y', quantidade: 5, unidade: 'un' }] },
  ],
  etapas: [
    { id: 'e1', nome: 'Primeira', opcoes: [{ id: 'mx', maquina_id: 'x', capacidade_minuto: 20 }, { id: 'mg', maquina_id: 'g', capacidade_minuto: 40 }] },
    { id: 'e2', nome: 'Segunda', opcoes: [{ id: 'my', maquina_id: 'y', capacidade_minuto: 5 }] },
  ],
};
describe('ficha de produção', () => {
  it('escala o consumo de cada matéria-prima para a quantidade-base', () => {
    expect(calcularProducao(ficha, 100)?.materiais.map(m => [m.produto_id, m.quantidade, m.unidade])).toEqual([['x', 20, 'kg'], ['y', 50, 'un']]);
  });
  it('substitui X por A sem consumir as duas opções juntas e preserva Y', () => {
    expect(calcularProducao(ficha, 100, { x: 'a1' })?.materiais.map(m => [m.produto_id, m.quantidade])).toEqual([['a', 30], ['y', 50]]);
  });
  it('respeita etapas em sequência e calcula o gargalo da linha', () => {
    const r = calcularProducao(ficha, 100);
    expect(r?.etapas.map(e => e.minutos)).toEqual([5, 20]);
    expect(r?.minutosSequenciais).toBe(25);
    expect(r?.capacidadeLinha).toBe(5);
  });
  it('usa a capacidade própria da máquina alternativa G', () => {
    const r = calcularProducao(ficha, 100, { e1: 'mg' });
    expect(r?.etapas.map(e => e.maquina_id)).toEqual(['g', 'y']);
    expect(r?.minutosSequenciais).toBe(22.5);
    expect(r?.capacidadeLinha).toBe(5);
  });
  it('sinaliza máquina em manutenção sem substituir silenciosamente', () => {
    expect(calcularProducao(ficha, 100, {}, ['x'])?.indisponivel).toBe(true);
    expect(calcularProducao(ficha, 100, { e1: 'mg' }, ['x'])?.indisponivel).toBe(false);
  });
  it('rejeita quantidade-base, consumo e capacidade sem valores positivos', () => {
    expect(validarFicha({ ...ficha, quantidade_base: 0 })).toBeTruthy();
    expect(validarFicha({ ...ficha, materiais: [{ id: 'x', nome: 'X', opcoes: [{ id: 'x1', produto_id: 'x', quantidade: 0, unidade: 'kg' }] }] })).toBeTruthy();
    expect(validarFicha({ ...ficha, etapas: [{ id: 'e', nome: 'Etapa', opcoes: [{ id: 'm', maquina_id: 'm', capacidade_minuto: 0 }] }] })).toBeTruthy();
  });
});

describe('tempo de setup', () => {
  it('soma o setup de cada máquina ao tempo da etapa e ao total', () => {
    const f = { quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [
      { id: 'e1', nome: 'Corte', opcoes: [{ id: 'o1', maquina_id: 'm1', capacidade_minuto: 10, setup_minutos: 15 }] },
      { id: 'e2', nome: 'Dobra', opcoes: [{ id: 'o2', maquina_id: 'm2', capacidade_minuto: 5, setup_minutos: 5 }] },
    ] };
    const r = calcularProducao(f, 50);
    expect(r?.etapas.map(e => e.minutos)).toEqual([20, 15]);
    expect(r?.minutosSequenciais).toBe(35);
    expect(r?.setupTotal).toBe(20);
  });
  it('setup negativo é recusado', () => {
    expect(validarFicha({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [{ id: 'e', nome: 'X', opcoes: [{ id: 'o', maquina_id: 'm', capacidade_minuto: 1, setup_minutos: -1 }] }] })).toMatch(/setup/);
  });
});
