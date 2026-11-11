import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  for (const [app, pacote] of [
    ['pilar-voz-app', 'br/com/pilar/voz'],
    ['android-pilar-hub', 'br/com/pilar/hub/voz'],
  ]) {
    it(`${app} mantém o destino do REFER até a finalização e o envia no contrato do CRM`, () => {
      const base = `${app}/app/src/main/java/${pacote}`;
      const servico = readFileSync(`${base}/VozService.kt`, 'utf8');
      const api = readFileSync(`${base}/Api.kt`, 'utf8');
      // Regressão entre linguagens: ambos os clientes precisam enviar o mesmo campo do backend.
      expect(servico).toMatch(/var transferidoPara: String\? = null/);
      expect(servico).toMatch(/c\.transferir\(transf\)\s+transferidoPara = transf/);
      expect(servico).toMatch(/finally\s*\{[\s\S]*Api\.finalizar\(it, erro, transferidoPara\)/);
      expect(api).toMatch(/fun finalizar\(id: String, erro: Boolean = false, transferidoPara: String\? = null\)/);
      expect(api).toMatch(/\.put\("transferido_para", transferidoPara\?\.trim\(\)\?\.takeIf \{ it\.isNotBlank\(\) \} \?: JSONObject\.NULL\)/);
      expect(destinoTransferencia({ transferido_para: '2222' })).toBe('2222');
    });
  }
});