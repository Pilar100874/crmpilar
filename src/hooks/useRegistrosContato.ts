import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  montarRegistrosPorContato,
  REGISTROS_VAZIOS,
  type RegistrosContato,
} from "@/lib/atendimento/registrosContato";

/** Contato por vez na consulta de tarefas, para não estourar o tamanho da URL. */
const LOTE = 100;

interface Fontes {
  contatos: Array<{ id: string; email?: string | null }>;
  tarefas: Array<{ contact_id?: string | null }>;
  conversas: Array<{ customer_id?: string | null }>;
  emails: Array<{ from_email?: string | null; to_email?: string | null }>;
  orcamentos: Array<{ cliente_id?: string | null }>;
}

/**
 * Registros de cada contato visível na tela.
 *
 * Conversas, e-mails e orçamentos já estão carregados na memória; as tarefas sim,
 * não estão — a agenda do dia traz só hoje e os atrasos. Por isso a presença de
 * tarefa é confirmada no banco uma única vez por contato, para nunca esconder o
 * atalho de um cliente que tem tarefa em outra data.
 */
export function useRegistrosContato(fontes: Fontes): Map<string, RegistrosContato> {
  const base = useMemo(
    () => montarRegistrosPorContato(fontes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fontes.contatos, fontes.tarefas, fontes.conversas, fontes.emails, fontes.orcamentos],
  );

  const [comTarefa, setComTarefa] = useState<Set<string>>(() => new Set());
  const consultados = useRef<Set<string>>(new Set());
  const chave = useMemo(() => Array.from(base.keys()).sort().join(","), [base]);

  useEffect(() => {
    const ids = chave ? chave.split(",") : [];
    const pendentes = ids.filter((id) => !consultados.current.has(id));
    if (pendentes.length === 0) return;
    pendentes.forEach((id) => consultados.current.add(id));

    let ativo = true;
    void (async () => {
      const encontrados = new Set<string>();
      for (let i = 0; i < pendentes.length; i += LOTE) {
        const lote = pendentes.slice(i, i + LOTE);
        const { data } = await supabase
          .from("calendario_tarefas")
          .select("contact_id")
          .in("contact_id", lote);
        (data || []).forEach((tarefa: any) => {
          if (tarefa?.contact_id) encontrados.add(tarefa.contact_id);
        });
      }
      if (!ativo || encontrados.size === 0) return;
      setComTarefa((atual) => {
        const novo = new Set(atual);
        encontrados.forEach((id) => novo.add(id));
        return novo;
      });
    })();

    return () => { ativo = false; };
  }, [chave]);

  return useMemo(() => {
    if (comTarefa.size === 0) return base;
    const mapa = new Map(base);
    comTarefa.forEach((id) => {
      const atual = mapa.get(id) || { ...REGISTROS_VAZIOS };
      if (atual.tarefas > 0) return;
      mapa.set(id, { ...atual, tarefas: 1 });
    });
    return mapa;
  }, [base, comTarefa]);
}
