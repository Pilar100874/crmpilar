import { describe, it, expect, vi } from 'vitest';
import { executarSequencial, ResultadoEnvio } from './execucaoSequencial';

describe('acompanhamento do envio em massa', () => {
  it('processa um contato por vez e informa cada resultado', async () => {
    let ativos = 0;
    let maximo = 0;
    const resultados: ResultadoEnvio[] = [];
    await executarSequencial([1, 2, 3], () => false, async () => {
      ativos++; maximo = Math.max(maximo, ativos);
      await Promise.resolve(); ativos--;
      return { status: 'encaminhado' };
    }, (_, resultado) => resultados.push(resultado));
    expect(maximo).toBe(1);
    expect(resultados.map(r => r.status)).toEqual(['processando', 'encaminhado', 'processando', 'encaminhado', 'processando', 'encaminhado']);
  });
  it('cancelar preserva o contato atual e impede os próximos', async () => {
    let cancelar = false;
    const resultados: Record<number, ResultadoEnvio> = {};
    const processar = vi.fn(async () => { cancelar = true; return { status: 'registrado' as const }; });
    await executarSequencial([1, 2, 3], () => cancelar, processar, (i, r) => { resultados[i] = r; });
    expect(processar).toHaveBeenCalledTimes(1);
    expect(resultados[0].status).toBe('registrado');
    expect(resultados[1].status).toBe('cancelado');
    expect(resultados[2].status).toBe('cancelado');
  });
  it('falha individual não aparece como sucesso e permite acompanhar o próximo', async () => {
    const resultados: Record<number, ResultadoEnvio> = {};
    await executarSequencial([1, 2], () => false, async contato => {
      if (contato === 1) throw new Error('Falha de envio');
      return { status: 'encaminhado' };
    }, (i, r) => { resultados[i] = r; });
    expect(resultados[0]).toEqual({ status: 'erro', detalhe: 'Falha de envio' });
    expect(resultados[1].status).toBe('encaminhado');
  });
});