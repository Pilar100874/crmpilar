import { describe, it, expect } from 'vitest';
import { montarEmail } from './emailMensagem';
import { ContactForBulkSend } from './types';

const contato: ContactForBulkSend = { id: '1', nome: 'Marcos', empresa: 'Pilar', email: 'marcos@example.com', telefone: '11999999999' };
describe('montagem do e-mail em massa', () => {
  it('personaliza assunto e texto com as quatro variáveis', () => {
    const email = montarEmail([{ id: '1', type: 'text', emailSubject: 'Olá {{contato}} — {{empresa}}', content: '{{contato}}, {{empresa}}, {{email}}, {{whatsapp}}' }], contato);
    expect(email.subject).toBe('Olá Marcos — Pilar');
    expect(email.body).toBe('Marcos, Pilar, marcos@example.com, 11999999999');
  });
  it('mantém imagens no corpo e a ordem dos blocos', () => {
    const email = montarEmail([{ id: '1', type: 'text', content: 'Antes', emailSubject: 'Novidades' }, { id: '2', type: 'image', content: 'Produto', mediaUrl: 'https://example.com/produto.png' }, { id: '3', type: 'text', content: 'Depois' }], contato);
    expect(email.html.indexOf('Antes')).toBeLessThan(email.html.indexOf('<img'));
    expect(email.html.indexOf('<img')).toBeLessThan(email.html.indexOf('Depois'));
    expect(email.html).toContain('src="https://example.com/produto.png"');
  });
  it('não transforma texto ou dados do contato em código executável', () => {
    const email = montarEmail([{ id: '1', type: 'text', content: '{{contato}} <script>alert(1)</script>' }], { ...contato, nome: '<img src=x onerror=alert(1)>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;script&gt;');
  });
});