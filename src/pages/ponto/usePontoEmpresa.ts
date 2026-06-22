import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PontoEmpresa = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
};

const STORAGE_KEY = "ponto.empresa_id";

export function usePontoEmpresa() {
  const [empresas, setEmpresas] = useState<PontoEmpresa[]>([]);
  const [empresaId, setEmpresaIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const setEmpresaId = (id: string | null) => {
    setEmpresaIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ponto_empresas")
      .select("id, razao_social, nome_fantasia, cnpj, cidade, uf, ativo")
      .order("razao_social");
    setEmpresas((data as any) || []);
    if (data && data.length && !empresaId) {
      setEmpresaId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  return { empresas, empresaId, setEmpresaId, loading, reload };
}
