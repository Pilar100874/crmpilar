import { VeiculoComStatus } from '@/types/logistica';

/**
 * A execução das automações passou a ser 100% server-side
 * (edge function `logistica-automacao-cron`, agendada a cada 2 min).
 * Os mapas agora apenas exibem as marcações persistidas — manter a execução
 * no navegador causaria disparos duplicados.
 */
export async function rodarAutomacoesLogistica(
  _veiculos: VeiculoComStatus[],
  _estabelecimentoId: string | null | undefined,
  _opts: { force?: boolean } = {}
): Promise<number> {
  return 0;
}

/** Força um ciclo imediato no servidor (botão "Executar agora"). */
export async function dispararCicloServidor(estabelecimentoId: string): Promise<boolean> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.functions.invoke('logistica-automacao-cron', {
      body: { estabelecimento_id: estabelecimentoId },
    });
    return !error;
  } catch {
    return false;
  }
}

