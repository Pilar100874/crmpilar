// Enriquecimento server-side via ReceitaWS (usado pelas tools MCP de prospecção).
// Preenche apenas campos vazios. Nunca sobrescreve o que a IA já mandou.

export type ProspectRow = Record<string, any>;

const cache = new Map<string, ProspectRow | null>();

async function fetchReceita(cnpjLimpo: string): Promise<any | null> {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.status === "ERROR") return null;
    return data;
  } catch {
    return null;
  }
}

export async function enrichWithCnpj(row: ProspectRow): Promise<ProspectRow> {
  const raw = String(row?.cnpj || "").replace(/\D/g, "");
  if (raw.length !== 14) return row;

  let receita: any = cache.get(raw);
  if (receita === undefined) {
    receita = await fetchReceita(raw);
    cache.set(raw, receita ?? null);
  }
  if (!receita) return row;

  const pick = <T,>(cur: T | undefined | null, next: T | undefined | null): T | null => {
    if (cur !== undefined && cur !== null && cur !== "") return cur as T;
    return (next ?? null) as T | null;
  };

  const enderecoTxt = [receita.logradouro, receita.numero, receita.complemento]
    .filter(Boolean)
    .join(", ");

  const enriched: ProspectRow = {
    ...row,
    cnpj: raw,
    nome: pick(row.nome, receita.nome),
    nome_fantasia: pick(row.nome_fantasia, receita.fantasia),
    email: pick(row.email, receita.email),
    telefone: pick(row.telefone, receita.telefone),
    endereco: pick(row.endereco, enderecoTxt || null),
    bairro: pick(row.bairro, receita.bairro),
    cidade: pick(row.cidade, receita.municipio),
    estado: pick(row.estado, receita.uf),
    cep: pick(row.cep, (receita.cep || "").replace(/\D/g, "") || null),
    cnae_principal: pick(row.cnae_principal, receita.atividade_principal?.[0]?.code),
    cnae_descricao: pick(row.cnae_descricao, receita.atividade_principal?.[0]?.text),
    porte: pick(row.porte, receita.porte),
    situacao_cadastral: pick(row.situacao_cadastral, receita.situacao),
    data_fundacao: pick(row.data_fundacao, receita.abertura),
  };

  const extras = { ...(row.extras ?? {}) };
  extras.natureza_juridica = extras.natureza_juridica ?? receita.natureza_juridica ?? null;
  extras.capital_social = extras.capital_social ?? receita.capital_social ?? null;
  extras.socio_nome = extras.socio_nome ?? receita.qsa?.[0]?.nome ?? null;
  extras.socio_qualificacao = extras.socio_qualificacao ?? receita.qsa?.[0]?.qual ?? null;
  extras.simples_optante = extras.simples_optante ?? receita.simples?.optante ?? null;
  extras.simei_optante = extras.simei_optante ?? receita.simei?.optante ?? null;
  enriched.extras = extras;

  return enriched;
}
