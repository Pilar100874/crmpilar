export interface ProdutoExistente {
  nome: string;
  codigo?: string | null;
}

/**
 * Gera o nome e o SKU da cópia de um produto, sem colidir com os já cadastrados.
 *
 * Nome: "Bobina 40cm" -> "Bobina 40cm (Cópia)" -> "Bobina 40cm (Cópia 2)" ...
 * SKU:  "BOB40"       -> "BOB40-Copia"         -> "BOB40-Copia2" ...
 *
 * Se o produto original não tem SKU, a cópia também fica sem SKU, para que a
 * validação de obrigatoriedade continue obrigando o usuário a preencher um.
 */
export function gerarCopiaDeProduto(
  nome: string,
  codigo: string,
  existentes: ProdutoExistente[],
): { nome: string; codigo: string } {
  const baseNome = nome.trim();
  const baseCodigo = codigo.trim();
  const nomesUsados = new Set(existentes.map(p => p.nome));
  const codigosUsados = new Set(existentes.map(p => p.codigo).filter(Boolean));

  let novoNome = `${baseNome} (Cópia)`;
  for (let i = 2; nomesUsados.has(novoNome); i++) {
    novoNome = `${baseNome} (Cópia ${i})`;
  }

  let novoCodigo = baseCodigo ? `${baseCodigo}-Copia` : "";
  for (let i = 2; novoCodigo && codigosUsados.has(novoCodigo); i++) {
    novoCodigo = `${baseCodigo}-Copia${i}`;
  }

  return { nome: novoNome, codigo: novoCodigo };
}
