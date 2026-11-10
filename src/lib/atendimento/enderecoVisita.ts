/** Visita só é oferecida quando existe uma empresa cadastrada com endereço. */
export function possuiEnderecoVisita(empresas?: Array<{ id?: string | null; endereco?: string | null }> | null): boolean {
  return !!empresas?.some((empresa) => !!empresa.id && !!empresa.endereco?.trim());
}