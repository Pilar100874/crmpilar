/**
 * Regras de discagem configuradas por estabelecimento.
 * - dddLocal: DDD da cidade onde fica o PABX (não é discado).
 * - prefixoOutroDdd: código discado antes do DDD quando a ligação é para outro DDD.
 */
export interface RegrasDiscagem {
  ativas: boolean;
  dddLocal: string;
  prefixoOutroDdd: string;
}

export const REGRAS_DISCAGEM_PADRAO: RegrasDiscagem = {
  ativas: true,
  dddLocal: "11",
  prefixoOutroDdd: "015",
};

/**
 * Prepara o número para a discagem no PABX.
 *
 * O cadastro guarda telefones com o código do país (ex.: 5511999611194).
 * As rotas de saída do UCM esperam o número como se fosse discado do
 * aparelho, então:
 * - o DDI 55 é sempre removido;
 * - se o DDD for o local, ele também é removido (disca só o número);
 * - se for outro DDD, o código da operadora é colocado na frente
 *   (ex.: 015 + 21 + número).
 * Códigos de serviço digitados com * e # são preservados.
 */
export function prepararNumeroDiscagem(valor: string, regras?: Partial<RegrasDiscagem>): string {
  const limpo = (valor || "").replace(/[^\d*#+]/g, "").replace(/\+/g, "");
  if (!limpo || /[*#]/.test(limpo)) return limpo;

  let numero = limpo;
  // DDI do Brasil: 55 + DDD (2) + número (8 ou 9)
  if (numero.length >= 12 && numero.length <= 13 && numero.startsWith("55")) {
    numero = numero.slice(2);
  } else if (numero.length >= 14 && numero.startsWith("0055")) {
    numero = numero.slice(4);
  }

  const r = { ...REGRAS_DISCAGEM_PADRAO, ...(regras || {}) };
  if (!r.ativas) return numero;

  const dddLocal = (r.dddLocal || "").replace(/\D/g, "");
  const prefixo = (r.prefixoOutroDdd || "").replace(/\D/g, "");

  // Já veio com o código da operadora na frente: não mexe (idempotente).
  if (prefixo && numero.startsWith(prefixo) && numero.length > prefixo.length + 10) {
    return numero;
  }

  // Só trata números com DDD (10 = fixo, 11 = celular)
  if (numero.length !== 10 && numero.length !== 11) return numero;
  if (numero.startsWith("0")) return numero;

  const ddd = numero.slice(0, 2);
  const assinante = numero.slice(2);

  if (dddLocal && ddd === dddLocal) return assinante;
  if (prefixo) return `${prefixo}${ddd}${assinante}`;
  return numero;
}
