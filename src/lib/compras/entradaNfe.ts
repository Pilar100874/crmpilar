/** Regras puras da entrada de NF-e: desmembramento de um item da nota em vários produtos do estoque. */
export interface ParteEntrada { produto_id: string; quantidade: number; percentual: number }
export interface ItemBase { quantidade: number; valorTotal: number; valorUnitario: number; produto_id: string; fator: number }

/** Divide 100% do custo igualmente entre n partes (a última absorve o arredondamento). */
export function percentuaisIguais(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor((100 / n) * 100) / 100;
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base));
}

/** Lista o que impede lançar o desmembramento. */
export function errosDesmembramento(partes: ParteEntrada[]): string[] {
  const e: string[] = [];
  if (partes.length < 2) e.push("Informe ao menos 2 produtos no desmembramento");
  if (partes.some((p) => !p.produto_id)) e.push("Escolha o produto de cada parte");
  if (new Set(partes.map((p) => p.produto_id)).size !== partes.length) e.push("Produto repetido no desmembramento");
  if (partes.some((p) => !(p.quantidade > 0))) e.push("Quantidade de cada parte deve ser maior que zero");
  const soma = partes.reduce((s, p) => s + (Number(p.percentual) || 0), 0);
  if (Math.abs(soma - 100) > 0.01) e.push(`Os percentuais de custo somam ${soma.toFixed(2)}% (devem somar 100%)`);
  return e;
}

/** Converte as partes em linhas de entrada: quantidade já na unidade do estoque (fator 1) e custo rateado pelo percentual. */
export function expandirPartes<T extends ItemBase>(item: T, partes: ParteEntrada[]): T[] {
  const total = Number(item.valorTotal) || item.quantidade * item.valorUnitario;
  return partes.map((p) => {
    const valor = Math.round(total * (p.percentual / 100) * 100) / 100;
    return { ...item, produto_id: p.produto_id, quantidade: p.quantidade, fator: 1, valorTotal: valor, valorUnitario: p.quantidade ? valor / p.quantidade : 0 };
  });
}
