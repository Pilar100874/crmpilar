import { describe, it, expect } from 'vitest';
import { calcularProducao, validarFicha, lerFicha, type FichaProducao } from './fichaProducao';
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

describe('funcionários extras', () => {
  it('preserva quantidades e serviços ao reabrir a ficha, sem alterar a produção', () => {
    const f: FichaProducao = { ...ficha, funcionarios_extras: [
      { id: 'embalagem', quantidade: 2, servico: 'Embalar produtos' },
      { id: 'abastecimento', quantidade: 1, servico: 'Abastecer a máquina' },
    ] };
    const reaberta = lerFicha(JSON.parse(JSON.stringify(f)));
    expect(reaberta.funcionarios_extras).toEqual(f.funcionarios_extras);
    expect(validarFicha(reaberta)).toBeNull();
    expect(calcularProducao(reaberta, 100)?.minutosSequenciais).toBe(25);
  });
  it('exige quantidade inteira positiva por serviço', () => {
    for (const quantidade of [0, -1, 1.5]) {
      expect(validarFicha({ ...ficha, funcionarios_extras: [{ id: 'a', quantidade, servico: 'Embalar' }] })).toMatch(/inteira/);
    }
  });
  it('exige o serviço quando há funcionários extras', () => {
    expect(validarFicha({ ...ficha, funcionarios_extras: [{ id: 'a', quantidade: 2, servico: '  ' }] })).toMatch(/serviço/);
  });
  it('aceita fichas antigas sem funcionários extras', () => {
    expect(validarFicha(lerFicha(ficha))).toBeNull();
    expect(lerFicha(ficha).funcionarios_extras).toBeUndefined();
  });
});

describe('metas por matéria-prima', () => {
  it('usa a meta da matéria-prima escolhida, inclusive do substituto', () => {
    const f = structuredClone(ficha);
    f.materiais[0].opcoes[0].meta_producao = 500;
    f.materiais[0].opcoes[1].meta_producao = 800;
    expect(calcularProducao(f, 100)?.materiais[0].meta_producao).toBe(500);
    expect(calcularProducao(f, 100, { x: 'a1' })?.materiais[0].meta_producao).toBe(800);
  });
  it('exige meta positiva quando informada', () => {
    const f = structuredClone(ficha);
    f.materiais[0].opcoes[0].meta_producao = 0;
    expect(validarFicha(f)).toMatch(/meta de produção/i);
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
  it('informa o setup de cada reposição sem somá-lo ao setup inicial', () => {
    const f: FichaProducao = { quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [{ id: 'e', nome: 'Corte', opcoes: [{ id: 'o', maquina_id: 'm', capacidade_minuto: 10, setup_minutos: 15, setup_troca_material_minutos: 4 }] }] };
    const r = calcularProducao(f, 100);
    expect(r?.etapas[0].minutos).toBe(25);
    expect(r?.etapas[0].setupTrocaMaterial).toBe(4);
    expect(r?.setupTotal).toBe(15);
  });
  it('recusa tempo de reposição negativo', () => {
    expect(validarFicha({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [{ id: 'e', nome: 'X', opcoes: [{ id: 'o', maquina_id: 'm', capacidade_minuto: 1, setup_troca_material_minutos: -1 }] }] })).toMatch(/reposição/);
  });
});

describe('exceções por matéria-prima e máquina', () => {
  const bobina: FichaProducao = {
    quantidade_base: 1, unidade_produto: 'un',
    materiais: [{ id: 'bobina', nome: 'Bobina', opcoes: [
      { id: '80', produto_id: 'mp80', quantidade: 2, unidade: 'kg' },
      { id: '40', produto_id: 'mp40', quantidade: 2, unidade: 'kg' },
    ] }],
    etapas: [{ id: 'corte', nome: 'Corte', material_regra_id: 'bobina', opcoes: [
      { id: 'a', maquina_id: 'a', capacidade_minuto: 5, setup_minutos: 10, regras_materiais: [{ material_opcao_id: '80', permitida: true, simultaneos: 2 }] },
      { id: 'b', maquina_id: 'b', capacidade_minuto: 5, regras_materiais: [{ material_opcao_id: '80', permitida: false, simultaneos: 1 }] },
      { id: 'c', maquina_id: 'c', capacidade_minuto: 8, regras_materiais: [{ material_opcao_id: '80', permitida: true, simultaneos: 2 }] },
    ] }],
  };
  it('produz 2 por vez pela matéria-prima sem informar largura', () => {
    const r = calcularProducao(bobina, 100);
    expect(r?.etapas[0].simultaneos).toBe(2);
    expect(r?.etapas[0].capacidade).toBe(10);
    expect(r?.minutosSequenciais).toBe(20);
    expect(r?.materiais[0].quantidade).toBe(200);
  });
  it('bloqueia a máquina B para a matéria-prima não aceita', () => {
    const r = calcularProducao(bobina, 100, { corte: 'b' });
    expect(r?.incompativel).toBe(true);
    expect(r?.minutosSequenciais).toBeNull();
    expect(r?.capacidadeLinha).toBeNull();
    expect(r?.etapas[0].maquina_id).toBe('b');
  });
  it('permite B com outra matéria-prima e 1 por vez', () => {
    const r = calcularProducao(bobina, 100, { corte: 'b', bobina: '40' });
    expect(r?.incompativel).toBe(false);
    expect(r?.etapas[0].simultaneos).toBe(1);
    expect(r?.minutosSequenciais).toBe(20);
  });
  it('preserva capacidade própria da máquina C', () => {
    expect(calcularProducao(bobina, 100, { corte: 'c' })?.etapas[0].capacidade).toBe(16);
  });
  it('não multiplica outras etapas da sequência', () => {
    const f = structuredClone(bobina); f.etapas.push({ id: 'embalar', nome: 'Embalar', opcoes: [{ id: 'p', maquina_id: 'p', capacidade_minuto: 3 }] });
    expect(calcularProducao(f, 100)?.capacidadeLinha).toBe(3);
  });
  it('rejeita quantidade por vez fracionada ou zero', () => {
    const f = structuredClone(bobina);
    const regra = f.etapas[0].opcoes[0].regras_materiais?.[0];
    if (!regra) throw new Error('Regra ausente');
    regra.simultaneos = 0;
    expect(validarFicha(f)).toMatch(/inteira/);
    regra.simultaneos = 1.5;
    expect(validarFicha(f)).toMatch(/inteira/);
  });
  it('rejeita regra vinculada a opção de outro grupo', () => {
    const f = structuredClone(bobina); f.etapas[0].material_regra_id = 'outro';
    expect(validarFicha(f)).toMatch(/existente/);
  });
  it('converte fichas antigas preservando rendimento e bloqueio', () => {
    const f = lerFicha({ quantidade_base: 1, unidade_produto: 'un', largura_produto_cm: 40,
      materiais: [{ id: 'm', nome: 'Bobina', opcoes: [{ id: '80', produto_id: 'mp80', quantidade: 2, unidade: 'kg', largura_cm: 80 }] }],
      etapas: [{ id: 'e', nome: 'Corte', material_largura_id: 'm', opcoes: [
        { id: 'a', maquina_id: 'a', capacidade_minuto: 5 },
        { id: 'b', maquina_id: 'b', capacidade_minuto: 5, largura_max_cm: 40 },
      ] }],
    });
    expect(calcularProducao(f, 100)?.etapas[0].capacidade).toBe(10);
    expect(calcularProducao(f, 100, { e: 'b' })?.incompativel).toBe(true);
    expect(lerFicha(f)).toEqual(f);
  });
});
