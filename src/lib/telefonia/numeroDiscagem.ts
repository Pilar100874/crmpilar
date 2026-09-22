/**
 * Prepara o número para a discagem no PABX.
 *
 * O cadastro guarda telefones com o código do país (ex.: 5511999611194).
 * As rotas de saída do UCM esperam o número como se fosse discado do
 * aparelho (DDD + número), então o "55" inicial é removido quando sobra
 * um número brasileiro válido (10 ou 11 dígitos).
 * Códigos de serviço digitados com * e # são preservados.
 */
export function prepararNumeroDiscagem(valor: string): string {
  const limpo = (valor || "").replace(/[^\d*#+]/g, "").replace(/\+/g, "");
  if (!limpo || /[*#]/.test(limpo)) return limpo;

  // DDI do Brasil: 55 + DDD (2) + número (8 ou 9)
  if (limpo.length >= 12 && limpo.length <= 13 && limpo.startsWith("55")) {
    return limpo.slice(2);
  }
  // 00 55 ... (discagem internacional digitada à mão)
  if (limpo.length >= 14 && limpo.startsWith("0055")) {
    return limpo.slice(4);
  }
  return limpo;
}
