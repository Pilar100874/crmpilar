export function podeComercializar(produto: { ativo?: boolean; comercializavel?: boolean } | null | undefined): boolean {
  return produto?.ativo === true && produto.comercializavel === true;
}

export function abasProducao(produto: { produzido: boolean }): string[] {
  return produto.produzido ? ['producao', 'maquinas'] : [];
}

export const grausConhecimento = [
  { valor: 'iniciante', nome: 'Iniciante' },
  { valor: 'basico', nome: 'Básico' },
  { valor: 'intermediario', nome: 'Intermediário' },
  { valor: 'avancado', nome: 'Avançado' },
  { valor: 'instrutor', nome: 'Instrutor' },
] as const;