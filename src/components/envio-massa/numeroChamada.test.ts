import { describe, expect, it } from 'vitest';
import { numeroParaChamada } from './numeroChamada';

describe('número das chamadas em massa', () => {
  it('disca contatos que possuem somente telefone fixo', () => {
    expect(numeroParaChamada({ telefone: null, tel: '(11) 3333-4444' })).toBe('(11) 3333-4444');
  });
  it('prioriza o telefone principal quando disponível', () => {
    expect(numeroParaChamada({ telefone: '11999999999', tel: '1133334444' })).toBe('11999999999');
  });
  it('usa fixo quando o principal está vazio ou incompleto', () => {
    expect(numeroParaChamada({ telefone: ' ', tel: '33334444' })).toBe('33334444');
    expect(numeroParaChamada({ telefone: '123', tel: '33334444' })).toBe('33334444');
  });
  it('não disca números incompletos', () => {
    expect(numeroParaChamada({ telefone: '123', tel: '456' })).toBeNull();
  });
});