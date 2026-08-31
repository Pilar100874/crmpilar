import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GrupoOpt {
  id: string;
  nome: string;
}

const STORAGE_KEY = 'cv.grupoFilter';
export const CV_GRUPO_ALL = 'all';

export function getSavedCvGrupo(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || CV_GRUPO_ALL;
  } catch {
    return CV_GRUPO_ALL;
  }
}

function saveCvGrupo(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Filtra qualquer lista que tenha (direta ou indiretamente) o grupo da Logística. */
export function filtrarPorGrupo<T>(list: T[], grupoId: string, getGrupo: (item: T) => string | null | undefined): T[] {
  if (!grupoId || grupoId === CV_GRUPO_ALL) return list;
  return list.filter(item => getGrupo(item) === grupoId);
}

export function useCvGrupoFilter() {
  const [grupoId, setGrupoIdState] = useState<string>(() => getSavedCvGrupo());
  const [grupos, setGrupos] = useState<GrupoOpt[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('unidades')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (!cancelled) setGrupos((data || []) as GrupoOpt[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const setGrupoId = useCallback((v: string) => {
    setGrupoIdState(v);
    saveCvGrupo(v);
  }, []);

  return { grupoId, setGrupoId, grupos };
}
