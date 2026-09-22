import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  REGRAS_DISCAGEM_PADRAO,
  prepararNumeroDiscagem,
  type RegrasDiscagem,
} from "@/lib/telefonia/numeroDiscagem";

let cache: RegrasDiscagem | null = null;
let carregando: Promise<RegrasDiscagem> | null = null;

/** Limpa o cache depois que as regras são salvas na tela de configuração. */
export function invalidarRegrasDiscagem() {
  cache = null;
  carregando = null;
}

export async function obterRegrasDiscagem(): Promise<RegrasDiscagem> {
  if (cache) return cache;
  if (carregando) return carregando;

  carregando = (async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return REGRAS_DISCAGEM_PADRAO;
      const { data } = await supabase
        .from("ucm_config")
        .select("discagem_regras_ativas, discagem_ddd_local, discagem_prefixo_outro_ddd")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      const regras: RegrasDiscagem = {
        ativas: data?.discagem_regras_ativas ?? REGRAS_DISCAGEM_PADRAO.ativas,
        dddLocal: data?.discagem_ddd_local ?? REGRAS_DISCAGEM_PADRAO.dddLocal,
        prefixoOutroDdd:
          data?.discagem_prefixo_outro_ddd ?? REGRAS_DISCAGEM_PADRAO.prefixoOutroDdd,
      };
      cache = regras;
      return regras;
    } catch {
      return REGRAS_DISCAGEM_PADRAO;
    } finally {
      carregando = null;
    }
  })();

  return carregando;
}

/** Aplica as regras do estabelecimento ao número antes de discar. */
export async function prepararNumeroComRegras(valor: string): Promise<string> {
  const regras = await obterRegrasDiscagem();
  return prepararNumeroDiscagem(valor, regras);
}
