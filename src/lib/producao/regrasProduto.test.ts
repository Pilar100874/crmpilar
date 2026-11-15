import { describe, it, expect } from 'vitest';
import { podeComercializar, abasProducao } from './regrasProduto';

describe('classificação de produtos', () => {
  it('somente permite vender produtos comercializáveis e ativos', () => {
    expect(podeComercializar({ ativo: true, comercializavel: false })).toBe(false);
    expect(podeComercializar({ ativo: true, comercializavel: true })).toBe(true);
    expect(podeComercializar({ ativo: false, comercializavel: true })).toBe(false);
    expect(podeComercializar(undefined)).toBe(false);
  });
  it('mostra produção e máquinas somente para produtos produzidos', () => {
    expect(abasProducao({ produzido: true })).toEqual(['producao', 'maquinas']);
    expect(abasProducao({ produzido: false })).toEqual([]);
  });
});