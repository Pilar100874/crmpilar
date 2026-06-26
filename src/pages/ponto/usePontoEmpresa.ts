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
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Disparar evento para atualizar outros componentes que usam este hook
    window.dispatchEvent(new CustomEvent("ponto:empresa-changed", { detail: id }));
  };

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ponto_empresas")
      .select("id, razao_social, nome_fantasia, cnpj, cidade, uf, ativo")
      .order("razao_social");
    setEmpresas((data as any) || []);
    
    const currentStored = localStorage.getItem(STORAGE_KEY);
    if (data && data.length) {
      if (!currentStored) {
        setEmpresaId(data[0].id);
      } else if (!data.some(e => e.id === currentStored)) {
        setEmpresaId(data[0].id);
      } else if (empresaId !== currentStored) {
        setEmpresaIdState(currentStored);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();

    const handleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setEmpresaIdState(customEvent.detail);
    };

    window.addEventListener("ponto:empresa-changed", handleChanged);
    return () => {
      window.removeEventListener("ponto:empresa-changed", handleChanged);
    };
  }, [empresaId]);

  return { empresas, empresaId, setEmpresaId, loading, reload };
}
