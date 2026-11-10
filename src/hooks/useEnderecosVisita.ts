import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { possuiEnderecoVisita } from "@/lib/atendimento/enderecoVisita";

/** Consulta os endereços salvos, sem depender dos campos parciais carregados em cada canal. */
export function useEnderecosVisita(ids: string[]) {
  const chave = [...new Set(ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))].sort().join(",");
  const [comEndereco, setComEndereco] = useState<Set<string>>(new Set());
  const [revisao, setRevisao] = useState(0);
  const recarregar = useCallback(() => setRevisao((v) => v + 1), []);
  useEffect(() => {
    let ativo = true;
    const contatos = chave ? chave.split(",") : [];
    void (async () => {
      const encontrados = new Set<string>();
      for (let i = 0; i < contatos.length; i += 100) {
        const { data, error } = await supabase.from("customer_empresas")
          .select("customer_id,empresas:empresa_id(id,endereco)").in("customer_id", contatos.slice(i, i + 100));
        if (error) { console.error("Erro ao conferir endereço de visita:", error); continue; }
        data?.forEach((vinculo) => {
          if (possuiEnderecoVisita(vinculo.empresas ? [vinculo.empresas] : [])) encontrados.add(vinculo.customer_id);
        });
      }
      if (ativo) setComEndereco(encontrados);
    })();
    return () => { ativo = false; };
  }, [chave, revisao]);
  return { comEndereco, recarregar };
}