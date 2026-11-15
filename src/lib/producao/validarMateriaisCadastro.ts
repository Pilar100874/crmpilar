import type { FichaProducao } from './fichaProducao';

type MaterialCadastrado = { id: string; nome: string; estabelecimento_id: string; materia_prima?: boolean | null };
/** Mirror persisted eligibility without exposing foreign-company products in the editor. */
export function validarMateriaisCadastro(ficha: FichaProducao, produtos: MaterialCadastrado[], estabelecimentoId: string, produtoAtualId?: string): string | null {
  for (const grupo of ficha.materiais) {
    for (const opcao of grupo.opcoes) {
      const material = produtos.find(p => p.id === opcao.produto_id);
      if (opcao.produto_id === produtoAtualId) return `O produto não pode usar a si mesmo como matéria-prima (${material?.nome || grupo.nome}). Escolha outra matéria-prima antes de salvar.`;
      if (!material || material.estabelecimento_id !== estabelecimentoId) return `A matéria-prima de "${grupo.nome}" não está disponível nesta empresa. Selecione novamente.`;
      if (!material.materia_prima) return `"${material.nome}" não está marcada como Matéria-prima no cadastro. Corrija o cadastro ou escolha outro material.`;
    }
  }
  return null;
}