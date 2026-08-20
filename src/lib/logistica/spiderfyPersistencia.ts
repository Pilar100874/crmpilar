import { supabase } from '@/integrations/supabase/client';

/**
 * Persistência (por usuário) da disposição do espalhamento (spiderfy) e dos
 * grupos expandidos no mapa de logística. Evita que os marcadores "saltem"
 * de posição a cada atualização de GPS, mantendo a mesma ordem de rótulos.
 */

export interface DisposicaoMapa {
  /** chave do grupo (ids ordenados) -> ordem estável dos veículos no círculo */
  grupos: Record<string, string[]>;
  /** grupos que o usuário deixou expandidos */
  expandidos: string[];
}

const VAZIO: DisposicaoMapa = { grupos: {}, expandidos: [] };
const PREFIXO = 'logistica:disposicao-mapa:';

let chaveUsuarioCache: string | null = null;

export async function obterChaveUsuario(): Promise<string> {
  if (chaveUsuarioCache) return chaveUsuarioCache;
  try {
    const { data } = await supabase.auth.getUser();
    chaveUsuarioCache = PREFIXO + (data.user?.id || 'anon');
  } catch {
    chaveUsuarioCache = PREFIXO + 'anon';
  }
  return chaveUsuarioCache;
}

export function carregarDisposicao(chave: string): DisposicaoMapa {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return { ...VAZIO, grupos: {} };
    const dados = JSON.parse(bruto) as Partial<DisposicaoMapa>;
    return {
      grupos: dados.grupos && typeof dados.grupos === 'object' ? dados.grupos : {},
      expandidos: Array.isArray(dados.expandidos) ? dados.expandidos : [],
    };
  } catch {
    return { grupos: {}, expandidos: [] };
  }
}

let timerSalvar: ReturnType<typeof setTimeout> | null = null;

export function salvarDisposicao(chave: string, dados: DisposicaoMapa) {
  if (timerSalvar) clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    try {
      // Limita o histórico para não crescer indefinidamente
      const entradas = Object.entries(dados.grupos).slice(-200);
      localStorage.setItem(
        chave,
        JSON.stringify({ grupos: Object.fromEntries(entradas), expandidos: dados.expandidos }),
      );
    } catch {
      /* storage indisponível: ignora */
    }
  }, 800);
}
