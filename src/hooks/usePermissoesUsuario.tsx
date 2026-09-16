// Consulta central de permissões do usuário logado (grupo de acesso).
// Regras:
// - Administrador do estabelecimento ou grupo com perfil "admin": acesso total.
// - Sem grupo ou grupo sem permissões salvas: acesso total (nada configurado = liberado).
// - Item marcado no grupo: vale exatamente o que está marcado.
// - Item não listado: herda a permissão do item pai; sem pai listado, fica liberado.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";
import { getMapaPais } from "@/lib/permissoes/catalogo";

export interface Permissao {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type AcaoPermissao = keyof Permissao;

interface EstadoPermissoes {
  carregando: boolean;
  acessoTotal: boolean;
  permissoes: Record<string, Permissao>;
}

const ESTADO_INICIAL: EstadoPermissoes = { carregando: true, acessoTotal: true, permissoes: {} };

const PermissoesContext = createContext<EstadoPermissoes | null>(null);

let cache: Promise<EstadoPermissoes> | null = null;

/** Limpa o cache (usar após trocar de usuário ou salvar permissões). */
export const limparCachePermissoes = () => {
  cache = null;
};

const carregarPermissoes = (): Promise<EstadoPermissoes> => {
  if (!cache) cache = buscarPermissoes();
  return cache;
};

const buscarPermissoes = async (): Promise<EstadoPermissoes> => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { carregando: false, acessoTotal: true, permissoes: {} };

    if (await isEstabelecimentoAdmin()) {
      return { carregando: false, acessoTotal: true, permissoes: {} };
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("grupo_acesso_id")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (!usuario?.grupo_acesso_id) return { carregando: false, acessoTotal: true, permissoes: {} };

    const { data: grupo } = await supabase
      .from("grupos_acesso")
      .select("perfil, menus_permitidos")
      .eq("id", usuario.grupo_acesso_id)
      .maybeSingle();

    const perfil = (grupo as any)?.perfil as string | undefined;
    if (perfil === "admin") return { carregando: false, acessoTotal: true, permissoes: {} };

    const mapa = (grupo?.menus_permitidos || {}) as unknown as Record<string, Permissao>;
    const temAlgo = mapa && typeof mapa === "object" && Object.keys(mapa).length > 0;
    return { carregando: false, acessoTotal: !temAlgo, permissoes: temAlgo ? mapa : {} };
  } catch {
    return { carregando: false, acessoTotal: true, permissoes: {} };
  }
};

export function PermissoesProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPermissoes>(ESTADO_INICIAL);

  useEffect(() => {
    let ativo = true;
    carregarPermissoes().then((novo) => {
      if (ativo) setEstado(novo);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return <PermissoesContext.Provider value={estado}>{children}</PermissoesContext.Provider>;
}

export function usePermissoesUsuario() {
  const contexto = useContext(PermissoesContext);
  const [local, setLocal] = useState<EstadoPermissoes>(ESTADO_INICIAL);

  useEffect(() => {
    if (contexto) return;
    let ativo = true;
    carregarPermissoes().then((novo) => {
      if (ativo) setLocal(novo);
    });
    return () => {
      ativo = false;
    };
  }, [contexto]);

  const estado = contexto ?? local;

  return useMemo(() => {
    const resolver = (id: string, acao: AcaoPermissao): boolean => {
      if (estado.acessoTotal) return true;
      let atual: string | undefined = id;
      const visitados = new Set<string>();
      while (atual && !visitados.has(atual)) {
        visitados.add(atual);
        const permissao = estado.permissoes[atual];
        if (permissao) return Boolean(permissao[acao]);
        atual = getMapaPais()[atual];
      }
      return true;
    };

    return {
      carregando: estado.carregando,
      acessoTotal: estado.acessoTotal,
      permissoes: estado.permissoes,
      pode: resolver,
      podeVer: (id: string) => resolver(id, "view"),
      podeCriar: (id: string) => resolver(id, "create"),
      podeEditar: (id: string) => resolver(id, "edit"),
      podeExcluir: (id: string) => resolver(id, "delete"),
    };
  }, [estado]);
}

/** Renderiza os filhos apenas se o usuário tiver a permissão informada. */
export function SeTiverPermissao({
  id,
  acao = "view",
  children,
}: {
  id: string;
  acao?: AcaoPermissao;
  children: ReactNode;
}) {
  const { pode } = usePermissoesUsuario();
  if (!pode(id, acao)) return null;
  return <>{children}</>;
}
