import { VeiculoComStatus } from '@/types/logistica';
import { executarAutomacoesLogistica, limparParadasAntigas } from '@/services/logisticaAutomacaoExecutor';

/**
 * Runner compartilhado das automações de logística.
 *
 * Antes as automações só rodavam na tela de Monitoramento. Agora qualquer mapa
 * (Monitoramento, Dashboard, TV, etc.) pode dispará-las usando esta função.
 * Um throttle global evita execuções duplicadas quando mais de um mapa está aberto.
 */

const INTERVALO_MINIMO_MS = 20000;
let ultimaExecucao = 0;
let execucaoEmAndamento: Promise<number> | null = null;

export async function rodarAutomacoesLogistica(
  veiculos: VeiculoComStatus[],
  estabelecimentoId: string | null | undefined,
  opts: { force?: boolean } = {}
): Promise<number> {
  if (!estabelecimentoId || veiculos.length === 0) return 0;

  const agora = Date.now();
  if (execucaoEmAndamento) return execucaoEmAndamento;
  if (!opts.force && agora - ultimaExecucao < INTERVALO_MINIMO_MS) return 0;

  ultimaExecucao = agora;

  execucaoEmAndamento = (async () => {
    try {
      const resultados = await executarAutomacoesLogistica(veiculos, estabelecimentoId);
      const veiculosComMarcacao = resultados.map(r => r.veiculo_id);
      await limparParadasAntigas(veiculosComMarcacao, estabelecimentoId);
      return resultados.length;
    } catch (e) {
      console.warn('Falha ao executar automações de logística', e);
      return 0;
    } finally {
      execucaoEmAndamento = null;
    }
  })();

  return execucaoEmAndamento;
}
