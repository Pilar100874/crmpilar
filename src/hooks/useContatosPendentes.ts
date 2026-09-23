import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ContatoAtendimento } from "@/hooks/useContatosAtendimento";

/** Carrega os dados dos clientes com atendimento a finalizar, para nunca sumirem das abas. */
export function useContatosPendentes(ids: string[]) {
  const [contatos, setContatos] = useState<ContatoAtendimento[]>([]);
  const chave = [...ids].sort().join(",");
  useEffect(() => {
    if (!ids.length) { setContatos([]); return; }
    let ativo = true;
    void supabase
      .from("customers")
      .select("id, nome, telefone, tel, email, customer_empresas ( id, empresa_id, is_primary, cargo, empresas:empresa_id ( id, nome, nome_fantasia, cnpj ) )")
      .in("id", ids)
      .then(({ data }) => {
        if (!ativo) return;
        setContatos(((data ?? []) as any[]).map((c) => ({
          id: c.id,
          nome: c.nome || "Sem nome",
          telefone: c.telefone || "",
          tel: c.tel || "",
          email: c.email || "",
          referencia: "Atendimento a finalizar",
          responsavel: "Meu Cliente",
          companies: c.customer_empresas || [],
        })));
      });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return contatos;
}
