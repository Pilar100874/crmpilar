import { createContext, useContext, type ReactNode } from "react";
import type { AcaoPermissao } from "@/hooks/usePermissoesUsuario";

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

export const inferirAcaoBotao = (texto: string): AcaoPermissao | null => {
  const normalizado = texto.trim().toLocaleLowerCase("pt-BR");
  if (!normalizado) return null;
  if (/\b(excluir|exclusão|remover|apagar|deletar|lixeira)\b/.test(normalizado)) return "delete";
  if (/\b(novo|nova|adicionar|incluir|criar|cadastrar|importar|duplicar)\b/.test(normalizado)) return "create";
  if (/\b(editar|alterar|salvar|atualizar|configurar|ajustar|confirmar alterações)\b/.test(normalizado)) return "edit";
  return null;
};