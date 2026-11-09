import { describe, expect, it } from 'vitest';
import { destinoTransferencia } from '../../../supabase/functions/_shared/transferenciaConfirmada';

describe('transferência informada pelo aparelho', () => {
  it('não presume transferência quando o aparelho informa null', () => {
    const corpo = { transferido_para: null, ultimaIa: 'O atendente confirma o preço. Um momento.' };
    expect(destinoTransferencia(corpo)).toBeNull();
  });
  it('não presume transferência em aparelhos antigos sem o campo', () => {
    expect(destinoTransferencia({})).toBeNull();
  });
  it('aceita somente o destino explícito', () => {
    expect(destinoTransferencia({ transferido_para: '2222' })).toBe('2222');
    expect(destinoTransferencia({ transferido_para: ' ' })).toBeNull();
  });
});