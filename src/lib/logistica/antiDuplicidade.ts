/**
 * Trava anti-duplicidade das automações de logística.
 *
 * Garante que uma ação (ex.: envio de WhatsApp) seja executada apenas UMA vez
 * por workflow + destinatário dentro do período do agendamento, mesmo que a
 * automação seja avaliada várias vezes (vários mapas/abas abertos, recarregar
 * a página, ciclos de 20s do monitoramento).
 */

const PREFIX = 'logistica:antidup:';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // limpa registros com mais de 7 dias

function chaveTrava(workflowId: string, periodo: string, destinatario: string): string {
  const dest = String(destinatario || 'geral').replace(/\D/g, '') || String(destinatario || 'geral');
  return `${PREFIX}${workflowId}:${periodo}:${dest}`;
}

/** Remove travas antigas para não acumular no localStorage. */
export function limparTravasAntigas(): void {
  try {
    const agora = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const ts = Number(localStorage.getItem(k)) || 0;
      if (!ts || agora - ts > TTL_MS) localStorage.removeItem(k);
    }
  } catch {
    /* noop */
  }
}

/**
 * Retorna true (e registra a trava) quando o envio ainda NÃO ocorreu para este
 * workflow/destinatário no período informado. Retorna false quando duplicado.
 */
export function registrarEnvioUnico(
  workflowId: string,
  periodo: string,
  destinatario: string
): boolean {
  const key = chaveTrava(workflowId, periodo, destinatario);
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true; // sem storage disponível: não bloqueia o envio
  }
}

/** Consulta sem registrar. */
export function envioJaRealizado(
  workflowId: string,
  periodo: string,
  destinatario: string
): boolean {
  try {
    return !!localStorage.getItem(chaveTrava(workflowId, periodo, destinatario));
  } catch {
    return false;
  }
}
