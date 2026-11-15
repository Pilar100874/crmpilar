/** Papéis da empresa (Cliente, Fornecedor, Vendedor, Transportadora). */
export interface PapeisEmpresa {
  eh_cliente?: boolean | null;
  eh_fornecedor?: boolean | null;
  eh_vendedor?: boolean | null;
  eh_transportadora?: boolean | null;
}

/** Empresa marcada apenas como fornecedora: não deve aparecer como cliente em vendas/atendimento. */
export function somenteFornecedor(e: PapeisEmpresa | null | undefined): boolean {
  if (!e) return false;
  return !!e.eh_fornecedor && e.eh_cliente === false && !e.eh_vendedor && !e.eh_transportadora;
}
