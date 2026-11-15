import { expect, it } from 'vitest';
import { validarMateriaisCadastro } from './validarMateriaisCadastro';
const ficha = { quantidade_base: 1, unidade_produto: 'un', etapas: [], materiais: [{ id: 'g', nome: 'Material 1', opcoes: [{ id: 'o', produto_id: 'a', quantidade: 10, unidade: 'kg' }] }] };
const material = { id: 'a', nome: 'Bobina', estabelecimento_id: 'empresa', materia_prima: true };
it('permite material cadastrado como matéria-prima na mesma empresa', () => {
  expect(validarMateriaisCadastro(ficha, [material], 'empresa', 'b')).toBeNull();
});
it('recusa colar uma ficha que usa o próprio produto de destino', () => {
  expect(validarMateriaisCadastro(ficha, [material], 'empresa', 'a')).toContain('si mesmo');
});
it('recusa material de outra empresa', () => {
  expect(validarMateriaisCadastro(ficha, [material], 'outra', 'b')).toContain('nesta empresa');
});
it('recusa material removido ou com classificação alterada', () => {
  expect(validarMateriaisCadastro(ficha, [], 'empresa', 'b')).toContain('Selecione novamente');
  expect(validarMateriaisCadastro(ficha, [{ ...material, materia_prima: false }], 'empresa', 'b')).toContain('Bobina');
});
it('valida também substitutos, não apenas a opção principal', () => {
  const comSubstituto = { ...ficha, materiais: [{ ...ficha.materiais[0], opcoes: [...ficha.materiais[0].opcoes, { id: 'o2', produto_id: 'b', quantidade: 20, unidade: 'kg' }] }] };
  expect(validarMateriaisCadastro(comSubstituto, [material], 'empresa', 'c')).toContain('Selecione novamente');
  expect(validarMateriaisCadastro(comSubstituto, [material, { ...material, id: 'b' }], 'empresa', 'c')).toBeNull();
});