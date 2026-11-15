import { describe, it, expect } from 'vitest';
import { sugerirEstoqueMinimo, contaComoVenda } from './estoqueMinimo';
const hoje = new Date('2026-11-14');
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86400000);
describe('estoque mínimo sugerido', () => {
  it('sem vendas sugere zero', () => {
    expect(sugerirEstoqueMinimo([], 15, hoje).sugerido).toBe(0);
  });
  it('90 un em 90 dias, prazo 15 dias, sem sazonalidade → 18', () => {
    const v = Array.from({ length: 90 }, (_, i) => ({ data: diasAtras(i + 1), quantidade: 1 }));
    expect(sugerirEstoqueMinimo(v, 15, hoje).sugerido).toBe(18);
  });
  it('pico no mesmo período do ano passado aumenta a sugestão', () => {
    const base = Array.from({ length: 90 }, (_, i) => ({ data: diasAtras(i + 1), quantidade: 1 }));
    const pico = [{ data: diasAtras(350), quantidade: 60 }];
    const r = sugerirEstoqueMinimo([...base, ...pico], 15, hoje);
    expect(r.fatorSazonal).toBeGreaterThan(1);
    expect(r.sugerido).toBeGreaterThan(18);
  });
  it('orçamento em aberto não conta como venda', () => {
    expect(contaComoVenda('em_aberto')).toBe(false);
    expect(contaComoVenda('aprovado')).toBe(true);
  });
});
