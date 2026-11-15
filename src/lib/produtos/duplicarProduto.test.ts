import { describe, expect, it } from 'vitest';
import { gerarCopiaDeProduto } from './duplicarProduto';

describe('gerarCopiaDeProduto', () => {
  it('cria nome e SKU novos a partir do produto original', () => {
    const copia = gerarCopiaDeProduto('Bobina 40cm', 'BOB40', [
      { nome: 'Bobina 40cm', codigo: 'BOB40' },
    ]);
    expect(copia.nome).toBe('Bobina 40cm (Cópia)');
    expect(copia.codigo).toBe('BOB40-Copia');
  });

  it('avança o número quando a primeira cópia já existe', () => {
    const copia = gerarCopiaDeProduto('Bobina 40cm', 'BOB40', [
      { nome: 'Bobina 40cm', codigo: 'BOB40' },
      { nome: 'Bobina 40cm (Cópia)', codigo: 'BOB40-Copia' },
      { nome: 'Bobina 40cm (Cópia 2)', codigo: 'BOB40-Copia2' },
    ]);
    expect(copia.nome).toBe('Bobina 40cm (Cópia 3)');
    expect(copia.codigo).toBe('BOB40-Copia3');
  });

  it('deixa o SKU em branco quando o original não tem SKU', () => {
    const copia = gerarCopiaDeProduto('Bobina 40cm', '', [
      { nome: 'Bobina 40cm', codigo: null },
    ]);
    expect(copia.nome).toBe('Bobina 40cm (Cópia)');
    expect(copia.codigo).toBe('');
  });

  it('não repete um SKU que já pertence a outro produto', () => {
    const copia = gerarCopiaDeProduto('Bobina 40cm', 'BOB40', [
      { nome: 'Bobina 40cm', codigo: 'BOB40' },
      { nome: 'Outro produto', codigo: 'BOB40-Copia' },
    ]);
    expect(copia.codigo).toBe('BOB40-Copia2');
  });
});
