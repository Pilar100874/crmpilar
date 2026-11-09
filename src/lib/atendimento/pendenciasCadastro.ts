/** Itens importantes do cadastro que faltam para o contato aberto. */
export interface DadosCadastro {
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  companies?: any[];
}

const vazio = (v: unknown) => !String(v ?? "").trim();

export function pendenciasCadastro(d: DadosCadastro): string[] {
  const faltas: string[] = [];
  if (vazio(d.nome)) faltas.push("Nome do contato");
  if (vazio(d.telefone) && vazio(d.whatsapp)) faltas.push("Telefone ou WhatsApp");
  if (vazio(d.email)) faltas.push("E-mail");
  const empresas = (d.companies || []).map((c: any) => c?.empresas || c).filter((e: any) => e?.id);
  if (empresas.length === 0) faltas.push("Empresa vinculada");
  else if (empresas.every((e: any) => vazio(e.cnpj) && vazio(e.cpf))) faltas.push("CNPJ/CPF da empresa");
  return faltas;
}
