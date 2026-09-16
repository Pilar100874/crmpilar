import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnidadeOpt {
  id: string;
  nome: string;
}

const STORAGE_KEY = 'logistica.grupoFilter';
export const GRUPO_ALL = 'all';

export function getSavedGrupo(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || GRUPO_ALL;
  } catch {
    return GRUPO_ALL;
  }
}

export function saveGrupo(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function filterByGrupo<T extends { unidade_id?: string | null; grupo_id?: string | null }>(
  list: T[],
  grupoId: string
): T[] {
  if (!grupoId || grupoId === GRUPO_ALL) return list;
  return list.filter(v => {
    const anyV = v as any;
    return anyV.unidade_id === grupoId || anyV.grupo_id === grupoId;
  });
}

const LOGIN_APLICADO_KEY = 'logistica.grupoFilter.loginAplicado';

/** Ao entrar no sistema, o filtro padrão passa a ser a unidade do usuário logado. */
async function unidadeDoUsuarioLogado(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const authId = auth?.user?.id;
  if (!authId) return null;
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('unidade_id')
    .eq('auth_user_id', authId)
    .maybeSingle();
  return (usuario as { unidade_id?: string | null } | null)?.unidade_id ?? null;
}

export function useGrupoFilter(_estabelecimentoId?: string | null) {
  const [grupoId, setGrupoIdState] = useState<string>(() => getSavedGrupo());
  const [unidades, setUnidades] = useState<UnidadeOpt[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('unidades')
        .select('id, nome')
        .order('nome');
      if (!cancelled) setUnidades((data || []) as UnidadeOpt[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Novo login: permite aplicar novamente o padrão (unidade do usuário).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        try { sessionStorage.removeItem(LOGIN_APLICADO_KEY); } catch { /* ignore */ }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Aplica a unidade do usuário como padrão uma vez por sessão de login.
  useEffect(() => {
    let cancelled = false;
    let jaAplicado = false;
    try { jaAplicado = !!sessionStorage.getItem(LOGIN_APLICADO_KEY); } catch { /* ignore */ }
    if (jaAplicado) return;
    (async () => {
      const unidadeId = await unidadeDoUsuarioLogado();
      if (cancelled) return;
      try { sessionStorage.setItem(LOGIN_APLICADO_KEY, '1'); } catch { /* ignore */ }
      if (unidadeId) {
        setGrupoIdState(unidadeId);
        saveGrupo(unidadeId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setGrupoId = useCallback((v: string) => {
    setGrupoIdState(v);
    saveGrupo(v);
  }, []);

  return { grupoId, setGrupoId, unidades };
}
