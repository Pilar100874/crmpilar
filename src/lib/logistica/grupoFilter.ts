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

  const setGrupoId = useCallback((v: string) => {
    setGrupoIdState(v);
    saveGrupo(v);
  }, []);

  return { grupoId, setGrupoId, unidades };
}
