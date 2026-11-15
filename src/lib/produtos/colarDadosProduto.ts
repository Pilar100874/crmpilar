/** Transfer editable configuration without replacing the destination's identity or physical stock. */
export function colarDadosProduto<T extends { nome: string; codigo: string; estoque: string; ean_13: string; ean_14_1: string; ean_14_2: string; gtin: string }>(destino: T, origem: T): T {
  return { ...structuredClone(origem), nome: destino.nome, codigo: destino.codigo, estoque: destino.estoque,
    ean_13: destino.ean_13, ean_14_1: destino.ean_14_1, ean_14_2: destino.ean_14_2, gtin: destino.gtin };
}