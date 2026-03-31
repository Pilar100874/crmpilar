import { useEcommerceRulesEngine } from "@/hooks/useEcommerceRulesEngine";

export interface FreteRuleResult {
  tipo: "gratis" | "fixo" | "desconto" | "padrao";
  valor: number;
  descricao: string;
  ruleId?: string;
}

/**
 * Calcula o frete com base nas regras ativas do e-commerce.
 * Prioridade: frete_gratis > frete_fixo > desconto_frete > padrão
 */
export function useEcommerceFreteRules() {
  const { freteActions, loading } = useEcommerceRulesEngine();

  const calcularFrete = (subtotal: number, cep: string, freteBase: number = 29.90): FreteRuleResult => {
    if (loading || freteActions.length === 0) {
      if (subtotal >= 500) return { tipo: "gratis", valor: 0, descricao: "Frete grátis (acima de R$ 500)" };
      return { tipo: "padrao", valor: freteBase, descricao: "Frete padrão" };
    }

    // Prioridade 1: Frete grátis
    const freteGratis = freteActions.find(a => a.type === "acao_frete_gratis");
    if (freteGratis) {
      const config = freteGratis.config;
      const regioes = config.regioes || "todas";
      if (regioes === "todas" || matchRegiao(cep, config)) {
        const valorMinimo = config.valorMinimo || 0;
        if (subtotal >= valorMinimo) {
          return { tipo: "gratis", valor: 0, descricao: "🎉 Frete grátis (promoção)", ruleId: freteGratis.ruleId };
        }
      }
    }

    // Prioridade 2: Frete fixo
    const freteFixo = freteActions.find(a => a.type === "acao_frete_fixo");
    if (freteFixo) {
      const valor = freteFixo.config.valor || 9.90;
      return { tipo: "fixo", valor, descricao: "Frete fixo promocional", ruleId: freteFixo.ruleId };
    }

    // Prioridade 3: Desconto no frete
    const descontoFrete = freteActions.find(a => a.type === "acao_desconto_frete");
    if (descontoFrete) {
      const percentual = descontoFrete.config.percentual || 50;
      const valorComDesconto = freteBase * (1 - percentual / 100);
      return { tipo: "desconto", valor: valorComDesconto, descricao: `${percentual}% de desconto no frete`, ruleId: descontoFrete.ruleId };
    }

    // Fallback
    if (subtotal >= 500) return { tipo: "gratis", valor: 0, descricao: "Frete grátis (acima de R$ 500)" };
    return { tipo: "padrao", valor: freteBase, descricao: "Frete padrão" };
  };

  return { calcularFrete, loading, hasRules: freteActions.length > 0 };
}

function matchRegiao(cep: string, config: Record<string, any>): boolean {
  if (!cep || config.regioes === "todas") return true;
  if (config.ufs && Array.isArray(config.ufs) && config.ufs.length > 0) {
    const cepNum = parseInt(cep.replace(/\D/g, ""));
    const ufByCep = getUfByCep(cepNum);
    if (ufByCep && config.ufs.includes(ufByCep)) return true;
    return false;
  }
  return true;
}

function getUfByCep(cep: number): string | null {
  const ranges: [number, number, string][] = [
    [1000000, 19999999, "SP"], [20000000, 28999999, "RJ"],
    [29000000, 29999999, "ES"], [30000000, 39999999, "MG"],
    [40000000, 48999999, "BA"], [49000000, 49999999, "SE"],
    [50000000, 56999999, "PE"], [57000000, 57999999, "AL"],
    [58000000, 58999999, "PB"], [59000000, 59999999, "RN"],
    [60000000, 63999999, "CE"], [64000000, 64999999, "PI"],
    [65000000, 65999999, "MA"], [66000000, 68899999, "PA"],
    [68900000, 68999999, "AP"], [69000000, 69299999, "AM"],
    [69300000, 69399999, "RR"], [69400000, 69899999, "AM"],
    [69900000, 69999999, "AC"], [70000000, 72799999, "DF"],
    [72800000, 72999999, "GO"], [73000000, 76799999, "GO"],
    [76800000, 76999999, "TO"], [77000000, 77999999, "TO"],
    [78000000, 78899999, "MT"], [78900000, 78999999, "MS"],
    [79000000, 79999999, "MS"], [80000000, 87999999, "PR"],
    [88000000, 89999999, "SC"], [90000000, 99999999, "RS"],
  ];
  for (const [min, max, uf] of ranges) {
    if (cep >= min && cep <= max) return uf;
  }
  return null;
}
