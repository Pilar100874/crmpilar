import { VeiculoComStatus } from '@/types/logistica';
import { executarAutomacoesLogistica, limparParadasAntigas } from '@/services/logisticaAutomacaoExecutor';

/**
 * Runner compartilhado das automações de logística.
 *
 * Qualquer mapa (Monitoramento, Dashboard, TV, etc.) pode dispará-las.
 * Garantias:
 *  - Throttle em memória (mesma aba / múltiplos mapas montados simultaneamente).
 *  - Lock de ciclo em localStorage (várias abas/janelas do mesmo navegador):
 *    apenas UMA execução acontece por ciclo, mesmo que N mapas disparem juntos.
 */

const INTERVALO_MINIMO_MS = 20000;
/** Tempo máximo que um lock pode ficar preso caso a aba trave/feche no meio. */
const LOCK_TTL_MS = 60000;
const LOCK_PREFIX = 'logistica:automacao:lock:';

const RUNNER_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let ultimaExecucao = 0;
let execucaoEmAndamento: Promise<number> | null = null;

type Lock = { owner: string; ciclo: number; ts: number };

function lockKey(estabelecimentoId: string) {
  return `${LOCK_PREFIX}${estabelecimentoId}`;
}

function lerLock(key: string): Lock | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Lock) : null;
  } catch {
    return null;
  }
}

/**
 * Tenta adquirir o lock do ciclo atual. Retorna false se outro mapa/aba já
 * executou (ou está executando) este mesmo ciclo.
 */
function adquirirCiclo(estabelecimentoId: string, agora: number, force: boolean): boolean {
  const ciclo = Math.floor(agora / INTERVALO_MINIMO_MS);
  const key = lockKey(estabelecimentoId);

  let atual: Lock | null = null;
  try {
    atual = lerLock(key);
  } catch {
    atual = null;
  }

  if (atual && !force) {
    const expirado = agora - atual.ts > LOCK_TTL_MS;
    // Mesmo ciclo já tratado por alguém, ou execução recente ainda dentro da janela.
    if (!expirado && (atual.ciclo >= ciclo || agora - atual.ts < INTERVALO_MINIMO_MS)) {
      return false;
    }
  }

  const novo: Lock = { owner: RUNNER_ID, ciclo, ts: agora };
  try {
    localStorage.setItem(key, JSON.stringify(novo));
    // Releitura: se outra aba escreveu no mesmo instante, o último vence.
    const confirmado = lerLock(key);
    if (confirmado && confirmado.owner !== RUNNER_ID && !force) return false;
  } catch {
    // Sem localStorage (modo privado/SSR): cai no throttle em memória.
  }
  return true;
}

function renovarLock(estabelecimentoId: string) {
  const key = lockKey(estabelecimentoId);
  const atual = lerLock(key);
  if (!atual || atual.owner !== RUNNER_ID) return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...atual, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export async function rodarAutomacoesLogistica(
  veiculos: VeiculoComStatus[],
  estabelecimentoId: string | null | undefined,
  opts: { force?: boolean } = {}
): Promise<number> {
  if (!estabelecimentoId || veiculos.length === 0) return 0;

  const agora = Date.now();
  if (execucaoEmAndamento) return execucaoEmAndamento;
  if (!opts.force && agora - ultimaExecucao < INTERVALO_MINIMO_MS) return 0;

  // Coordenação entre abas/mapas: só um runner executa o ciclo.
  if (!adquirirCiclo(estabelecimentoId, agora, !!opts.force)) {
    ultimaExecucao = agora;
    return 0;
  }

  ultimaExecucao = agora;

  execucaoEmAndamento = (async () => {
    try {
      const resultados = await executarAutomacoesLogistica(veiculos, estabelecimentoId);
      renovarLock(estabelecimentoId);
      const veiculosComMarcacao = resultados.map(r => r.veiculo_id);
      await limparParadasAntigas(veiculosComMarcacao, estabelecimentoId);
      return resultados.length;
    } catch (e) {
      console.warn('Falha ao executar automações de logística', e);
      return 0;
    } finally {
      renovarLock(estabelecimentoId);
      execucaoEmAndamento = null;
    }
  })();

  return execucaoEmAndamento;
}
