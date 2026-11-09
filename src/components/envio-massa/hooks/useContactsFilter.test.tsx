import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CanalEnvio } from '../types';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    let columns = '';
    const chain: Record<string, unknown> = {};
    for (const method of ['eq', 'in', 'not', 'order', 'limit', 'maybeSingle']) chain[method] = () => chain;
    chain.select = (value: string) => { columns = value; return chain; };
    chain.then = (resolve: (value: unknown) => unknown) => {
      const data = table === 'campaign_permissions' ? null
        : table === 'calendario_tarefas' ? [{ contact_id: 'fixo' }]
        : table === 'customers' ? [{ id: 'fixo', nome: 'Contato fixo', telefone: null,
            ...(columns.split(/[\s,]+/).includes('tel') ? { tel: '1133334444' } : {}), email: null }]
        : [];
      return Promise.resolve({ data, error: null }).then(resolve);
    };
    return chain;
  },
} }));

import { useContactsFilter } from './useContactsFilter';

describe('contatos fixos no assistente', () => {
  it.each(['telefone', 'ia'] as CanalEnvio[])('mantém telefone fixo carregado e selecionável no canal %s', async canal => {
    const { result } = renderHook(() => useContactsFilter('empresa', canal));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.contacts).toHaveLength(1));
    expect(result.current.contacts[0].telefone).toBe('1133334444');
    expect(result.current.contacts[0].id).toBe('fixo');
  });
  it('não transforma telefone fixo em número de WhatsApp ao trocar de canal', async () => {
    const { result, rerender } = renderHook(({ canal }: { canal: CanalEnvio }) => useContactsFilter('empresa', canal), { initialProps: { canal: 'telefone' as CanalEnvio } });
    await waitFor(() => expect(result.current.contacts).toHaveLength(1));
    rerender({ canal: 'whatsapp' });
    await waitFor(() => expect(result.current.contacts).toHaveLength(0));
    expect(result.current.allContacts[0].telefone).toBeNull();
  });
});