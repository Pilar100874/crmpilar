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

describe('exceções por largura da bobina', () => {
  const bobina: FichaProducao = {
    quantidade_base: 1, unidade_produto: 'un', largura_produto_cm: 40,
    materiais: [{ id: 'bobina', nome: 'Bobina', opcoes: [
      { id: '80', produto_id: 'mp80', quantidade: 2, unidade: 'kg', largura_cm: 80 },
      { id: '40', produto_id: 'mp40', quantidade: 2, unidade: 'kg', largura_cm: 40 },
    ] }],
    etapas: [{ id: 'corte', nome: 'Corte', material_largura_id: 'bobina', opcoes: [
      { id: 'a', maquina_id: 'a', capacidade_minuto: 5, setup_minutos: 10 },
      { id: 'b', maquina_id: 'b', capacidade_minuto: 5, largura_min_cm: 40, largura_max_cm: 40 },
      { id: 'c', maquina_id: 'c', capacidade_minuto: 8 },
    ] }],
  };
  it('produz duas bobinas de 40 cm por vez com matéria-prima de 80 cm', () => {
    const r = calcularProducao(bobina, 100);
    expect(r?.etapas[0].simultaneos).toBe(2);
    expect(r?.etapas[0].capacidade).toBe(10);
    expect(r?.minutosSequenciais).toBe(20);
    expect(r?.materiais[0].quantidade).toBe(200);
  });
  it('não permite entrada de 80 cm na máquina B limitada a 40 cm', () => {
    const r = calcularProducao(bobina, 100, { corte: 'b' });
    expect(r?.incompativel).toBe(true);
    expect(r?.etapas[0].minutos).toBeNull();
    expect(r?.minutosSequenciais).toBeNull();
    expect(r?.capacidadeLinha).toBeNull();
    expect(r?.etapas[0].maquina_id).toBe('b');
  });
  it('permite a máquina B com o substituto de 40 cm e uma unidade por vez', () => {
    const r = calcularProducao(bobina, 100, { corte: 'b', bobina: '40' });
    expect(r?.incompativel).toBe(false);
    expect(r?.etapas[0].simultaneos).toBe(1);
    expect(r?.minutosSequenciais).toBe(20);
  });
  it('aplica a capacidade própria da máquina alternativa C com duas faixas', () => {
    expect(calcularProducao(bobina, 100, { corte: 'c' })?.etapas[0].capacidade).toBe(16);
  });
  it('não arredonda a largura para cima e informa sobra', () => {
    const f = structuredClone(bobina); f.materiais[0].opcoes[0].largura_cm = 90;
    const r = calcularProducao(f, 100);
    expect(r?.etapas[0].simultaneos).toBe(2);
    expect(r?.etapas[0].sobraLargura).toBe(10);
  });
  it('bloqueia matéria-prima mais estreita que os 40 cm do produto', () => {
    const f = structuredClone(bobina); f.materiais[0].opcoes[0].largura_cm = 30;
    expect(calcularProducao(f, 100)?.incompativel).toBe(true);
  });
  it('exige largura em todas as alternativas quando a etapa calcula por largura', () => {
    const f = structuredClone(bobina); delete f.materiais[0].opcoes[1].largura_cm;
    expect(validarFicha(f)).toMatch(/alternativas/);
  });
  it('não multiplica etapas posteriores sem regra de largura', () => {
    const f = structuredClone(bobina); f.etapas.push({ id: 'embalar', nome: 'Embalar', opcoes: [{ id: 'p', maquina_id: 'p', capacidade_minuto: 3 }] });
    expect(calcularProducao(f, 100)?.capacidadeLinha).toBe(3);
  });
});
