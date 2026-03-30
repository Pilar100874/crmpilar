import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcommerceCategory {
  id: string;
  nome: string;
  grupo: string;
}

export interface EcommerceMenuGroup {
  grupo: string;
  categorias: EcommerceCategory[];
}

export function useEcommerceCategories() {
  const [menuGroups, setMenuGroups] = useState<EcommerceMenuGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const estabId = localStorage.getItem("estabelecimentoId");
    if (!estabId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("produto_categorias")
      .select("id, nome, grupo")
      .eq("estabelecimento_id", estabId)
      .order("grupo")
      .order("nome");

    if (!error && data) {
      const groupMap: Record<string, EcommerceCategory[]> = {};
      data.forEach((cat: any) => {
        const grupo = cat.grupo || "Geral";
        if (!groupMap[grupo]) groupMap[grupo] = [];
        groupMap[grupo].push({ id: cat.id, nome: cat.nome, grupo });
      });

      const groups: EcommerceMenuGroup[] = Object.entries(groupMap).map(([grupo, categorias]) => ({
        grupo,
        categorias,
      }));

      setMenuGroups(groups);
    }
    setLoading(false);
  };

  return { menuGroups, loading };
}
