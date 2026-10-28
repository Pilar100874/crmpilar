/* Compartilhado entre ucm-dial e voz-dispositivo. */
/**
 * Regras de discagem do estabelecimento: o DDI e o DDD locais não são discados,
 * os demais DDDs recebem o código da operadora na frente (ex.: 015 + DDD) e as
 * ligações para outros países saem como 00 + operadora + DDI + DDD + número.
 */
export const aplicarRegrasDiscagem = (
  valor: string,
  regras: { ativas: boolean; ddiLocal: string; dddLocal: string; prefixo: string },
) => {
  const bruto = (valor || "").replace(/[^\d*#+]/g, "");
  const internacional = bruto.startsWith("+") || bruto.startsWith("00");
  const limpo = bruto.replace(/\+/g, "");
  if (!limpo || /[*#]/.test(limpo)) return limpo;

  const ddiLocal = (regras.ddiLocal || "").replace(/\D/g, "") || "55";
  const dddLocal = (regras.dddLocal || "").replace(/\D/g, "");
  const prefixo = (regras.prefixo || "").replace(/\D/g, "");
  const operadora = prefixo.replace(/^0+/, "");

  if (operadora && limpo.startsWith(`00${operadora}`) && limpo.length > operadora.length + 6) {
    return limpo;
  }

  let numero = limpo;
  const semPrefixo = limpo.startsWith("00") ? limpo.slice(2) : limpo;
  if (internacional || limpo.length >= 12) {
    const semDdi = semPrefixo.startsWith(ddiLocal) ? semPrefixo.slice(ddiLocal.length) : null;
    if (semDdi !== null && (semDdi.length === 10 || semDdi.length === 11)) {
      numero = semDdi;
    } else if (internacional) {
      if (!regras.ativas) return semPrefixo;
      return operadora ? `00${operadora}${semPrefixo}` : `00${semPrefixo}`;
    }
  }

  if (!regras.ativas) return numero;
  if (prefixo && numero.startsWith(prefixo) && numero.length > prefixo.length + 10) return numero;
  if (numero.length !== 10 && numero.length !== 11) return numero;
  if (numero.startsWith("0")) return numero;
  const ddd = numero.slice(0, 2);
  // Fixo = 8 dígitos (2 a 5); celular = 9 dígitos começando por 9.
  const assinanteBruto = numero.slice(2);
  const assinante =
    assinanteBruto.length === 8 && /^[6-9]/.test(assinanteBruto) ? `9${assinanteBruto}` : assinanteBruto;
  if (dddLocal && ddd === dddLocal) return assinante;
  if (prefixo) return `${prefixo}${ddd}${assinante}`;
  return `${ddd}${assinante}`;
};
