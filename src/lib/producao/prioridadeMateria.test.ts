import { describe, expect, it } from 'vitest';
import { priorizarMateria, analisarAbastecimento } from './montagemFicha';
import { calcularProducao, lerFicha, type FichaProducao } from './fichaProducao';

const ficha = (): FichaProducao => ({
  quantidade_base: 1, unidade_produto: 'un',
  materiais: [{ id: 'grupo', nome: 'Material', opcoes: [
    { id: 'a', produto_id: 'mp-a', quantidade: 10, unidade: 'kg', rendimento: 1 },
    { id: 'b', produto_id: 'mp-b', quantidade: 20, unidade: 'kg', rendimento: 2 },
    { id: 'c', produto_id: 'mp-c', quantidade: 30, unidade: 'kg', rendimento: 3 },
  ] }],
  etapas: [{ id: 'etapa', nome: 'Produzir', material_regra_id: 'grupo', opcoes: [{ id: 'maq', maquina_id: 'maquina', capacidade_minuto: 1, regras_materiais: [{ material_opcao_id: 'b', permitida: true, simultaneos: 2 }] }] }],
});

describe('prioridade de matérias-primas', () => {
  it('promove um substituto e mantém a prioridade ao salvar e reler', () => {
    const original = ficha();
    const nova = lerFicha(JSON.parse(JSON.stringify(priorizarMateria(original, 'grupo', 'b', 0))));
    expect(nova.materiais[0].opcoes.map(o => o.id)).toEqual(['b', 'a', 'c']);
    expect(original.materiais[0].opcoes.map(o => o.id)).toEqual(['a', 'b', 'c']);
    expect(calcularProducao(nova, 2)?.materiais[0]).toMatchObject({ produto_id: 'mp-b', quantidade: 20 });
    expect(calcularProducao(nova, 2)?.etapas[0].simultaneos).toBe(2);
  });
  it('permite subir e descer um nível sem alterar os parâmetros', () => {
    const original = ficha();
    const nova = priorizarMateria(original, 'grupo', 'b', 2);
    expect(nova.materiais[0].opcoes.map(o => o.id)).toEqual(['a', 'c', 'b']);
    expect(nova.materiais[0].opcoes[2]).toEqual(original.materiais[0].opcoes[1]);
    expect(priorizarMateria(nova, 'grupo', 'b', 1).materiais[0].opcoes.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });
  it('sugere o substituto com estoque pela ordem de prioridade', () => {
    const nova = priorizarMateria(ficha(), 'grupo', 'c', 1);
    const analise = analisarAbastecimento(nova, 1, {}, [
      { id: 'mp-a', unidade: 'kg', estoque: 0 },
      { id: 'mp-b', unidade: 'kg', estoque: 100 },
      { id: 'mp-c', unidade: 'kg', estoque: 100 },
    ]);
    expect(analise?.materiais[0].alternativa?.opcao_id).toBe('c');
  });
  it('ignora posições inválidas e opções inexistentes', () => {
    const original = ficha();
    expect(priorizarMateria(original, 'grupo', 'a', -1)).toBe(original);
    expect(priorizarMateria(original, 'grupo', 'a', 3)).toBe(original);
    expect(priorizarMateria(original, 'grupo', 'a', 0.5)).toBe(original);
    expect(priorizarMateria(original, 'grupo', 'ausente', 0)).toBe(original);
  });
});