export function emissorOnline(ultima: string | null | undefined, agora = Date.now()) {
  if (!ultima) return false;
  const diferenca = agora - new Date(ultima).getTime();
  return Number.isFinite(diferenca) && diferenca >= 0 && diferenca < 120000;
}
export function resumoFila(ops: {situacao: string; created_at: string}[]) {
  return {
    pendentes: ops.filter(o => o.situacao === 'pendente').length,
    processando: ops.filter(o => o.situacao === 'processando').length,
    falhas: ops.filter(o => o.situacao === 'erro_comunicacao').length,
  };
}