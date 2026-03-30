import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcommerceCategory {
  id: string;
  nome: string;
  icone_url?: string | null;
}

export interface EcommerceMenuGroup {
  id: string;
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

    // Buscar produtos ativos com grupo e categoria
    let query = supabase
      .from("produtos")
      .select("id, grupo_id, categoria_id, grupo:produto_grupos(id, nome), categoria:produto_categorias(id, nome)")
      .eq("ativo", true);

    if (estabId) {
      query = query.eq("estabelecimento_id", estabId);
    }

    const { data, error } = await query;

    if (!error && data) {
      const groupMap: Record<string, { id: string; nome: string; categorias: Record<string, { id: string; nome: string }> }> = {};

      data.forEach((prod: any) => {
        const grp = prod.grupo;
        const cat = prod.categoria;
        if (!grp || !cat) return;

        if (!groupMap[grp.id]) {
          groupMap[grp.id] = { id: grp.id, nome: grp.nome, categorias: {} };
        }
        if (!groupMap[grp.id].categorias[cat.id]) {
          groupMap[grp.id].categorias[cat.id] = { id: cat.id, nome: cat.nome };
        }
      });

      const groups: EcommerceMenuGroup[] = Object.values(groupMap)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(g => ({
          id: g.id,
          grupo: g.nome,
          categorias: Object.values(g.categorias).sort((a, b) => a.nome.localeCompare(b.nome)),
        }));

      setMenuGroups(groups);
    }
    setLoading(false);
  };

  return { menuGroups, loading };
}
