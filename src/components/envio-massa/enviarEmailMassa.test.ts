import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn(), eq: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke }, from: (tabela: string) => tabela === 'email_oauth_config' ? { select: () => ({ eq: mocks.eq }) } : { insert: mocks.insert } } }));
import { enviarEmailMassa } from './enviarEmailMassa';
const itens = [{ id: '1', type: 'text' as const, content: 'Olá {{contato}}', emailSubject: 'Assunto {{empresa}}' }];
const contato = { id: '1', nome: 'Marcos', empresa: 'Pilar', email: 'marcos@example.com', telefone: null };
describe('processamento individual de e-mail', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.eq.mockResolvedValue({ data: [], error: null }); mocks.insert.mockResolvedValue({ error: null }); });
  it('cria o retorno somente após o serviço aceitar o envio', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const resultado = await enviarEmailMassa(itens, contato, 'estab', 'usuario', '2026-10-28');
    expect(mocks.invoke).toHaveBeenCalledWith('send-email-smtp', { body: { to: 'marcos@example.com', subject: 'Assunto Pilar', body: 'Olá Marcos', html: '<p>Olá Marcos</p>' } });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'usuario', date: '2026-10-28', origem_sub_item: 'email' }));
    expect(mocks.invoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.insert.mock.invocationCallOrder[0]);
    expect(resultado.status).toBe('encaminhado');
  });
  it('não cria retorno quando o envio falha', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false }, error: null });
    await expect(enviarEmailMassa(itens, contato, 'estab', 'usuario', '2026-10-28')).rejects.toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});