import {describe, expect, it} from 'vitest';
import {notaSomenteHistorica} from './motorEmissao';
describe('aposentadoria do emissor externo', () => {
  it('preserva notas Focus somente para consulta, sem reemissão ou edição automática', () => {
    expect(notaSomenteHistorica('focus')).toBe(true);
    expect(notaSomenteHistorica(null)).toBe(true);
  });
  it('mantém edição e transmissão no emissor próprio', () => {
    expect(notaSomenteHistorica('proprio')).toBe(false);
  });
});