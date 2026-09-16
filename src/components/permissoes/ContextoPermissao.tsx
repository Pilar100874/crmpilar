import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
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
  const raizRef = useRef<HTMLDivElement>(null);
  const { pode, carregando } = usePermissoesUsuario();

  useEffect(() => {
    const raiz = raizRef.current;
    const id = idModulo ?? idTela;
    if (!raiz || !id || carregando) return;

    const acaoDoElemento = (elemento: HTMLElement): AcaoPermissao | null => {
      const svg = elemento.querySelector("svg");
      const classeIcone = svg?.getAttribute("class") ?? "";
      if (/lucide-(trash|trash-2|x-circle)/.test(classeIcone)) return "delete";
      if (/lucide-(pencil|edit|edit-2|file-edit)/.test(classeIcone)) return "edit";
      if (/lucide-(plus|circle-plus|file-plus|user-plus)/.test(classeIcone)) return "create";
      return inferirAcaoBotao([
        elemento.getAttribute("aria-label"),
        elemento.getAttribute("title"),
        elemento.textContent,
      ].filter(Boolean).join(" "));
    };

    const aplicar = () => {
      raiz.querySelectorAll<HTMLElement>("button, [role='button'], [role='menuitem']").forEach((elemento) => {
        if (elemento.closest("[data-escopo-permissao]") !== raiz) return;
        const acao = acaoDoElemento(elemento);
        if (!acao) return;
        elemento.hidden = !pode(id, acao);
        elemento.setAttribute("aria-hidden", String(!pode(id, acao)));
      });
    };

    aplicar();
    const observador = new MutationObserver(aplicar);
    observador.observe(raiz, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, [carregando, idModulo, idTela, pode]);

  return (
    <ContextoPermissao.Provider value={{ idTela, idModulo }}>
      <div ref={raizRef} data-escopo-permissao className="contents">{children}</div>
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