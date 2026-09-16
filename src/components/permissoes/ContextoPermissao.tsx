import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePermissoesUsuario, type AcaoPermissao } from "@/hooks/usePermissoesUsuario";
import { existeIdCatalogo, idModulo as montarIdModulo } from "@/lib/permissoes/catalogo";

interface ContextoPermissaoValor {
  idTela: string | null;
  idModulo: string | null;
}

const ContextoPermissao = createContext<ContextoPermissaoValor>({ idTela: null, idModulo: null });

export function EscopoPermissao({
  idTela,
  idModulo,
  children,
}: ContextoPermissaoValor & { children: ReactNode }) {
  return (
    <ContextoPermissao.Provider value={{ idTela, idModulo }}>
      {children}
    </ContextoPermissao.Provider>
  );
}

export const useContextoPermissao = () => useContext(ContextoPermissao);

export function useModulosPermitidos<T extends { id: string }>(
  idTela: string,
  itens: T[],
  ativo?: string | null,
  aoCorrigirAtivo?: (id: string) => void,
) {
  const { podeVer, carregando, acessoTotal } = usePermissoesUsuario();
  const permitidos = useMemo(() => itens.filter((item) => {
    const id = montarIdModulo(idTela, item.id);
    return acessoTotal || !existeIdCatalogo(id) || podeVer(id);
  }), [itens, idTela, acessoTotal, podeVer]);

  useEffect(() => {
    if (carregando || !ativo || permitidos.some((item) => item.id === ativo)) return;
    const primeiro = permitidos[0];
    if (primeiro) aoCorrigirAtivo?.(primeiro.id);
  }, [ativo, aoCorrigirAtivo, carregando, permitidos]);

  return { itensPermitidos: permitidos, carregando };
}

export const inferirAcaoBotao = (texto: string): AcaoPermissao | null => {
  const normalizado = texto.trim().toLocaleLowerCase("pt-BR");
  if (!normalizado) return null;
  if (/\b(excluir|exclusão|remover|apagar|deletar|lixeira)\b/.test(normalizado)) return "delete";
  if (/\b(novo|nova|adicionar|incluir|criar|cadastrar|importar|duplicar)\b/.test(normalizado)) return "create";
  if (/\b(editar|alterar|salvar|atualizar|configurar|ajustar|confirmar alterações)\b/.test(normalizado)) return "edit";
  return null;
};