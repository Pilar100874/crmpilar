import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcommerceCategory {
  id: string;
  nome: string;
  grupo: string;
  totalProdutos: number;
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

    // Buscar categorias que possuem produtos vinculados via tabelas_preco
    const { data: precoData } = await supabase
      .from("tabelas_preco")
      .select("categoria_id, produto_categorias(id, nome, grupo)")
      .eq("estabelecimento_id", estabId)
      .eq("ativo", true);

    if (precoData) {
      // Agrupar categorias únicas com contagem de produtos
      const catMap: Record<string, { id: string; nome: string; grupo: string; count: number }> = {};

      precoData.forEach((item: any) => {
        const cat = item.produto_categorias;
        if (!cat) return;
        if (!catMap[cat.id]) {
          catMap[cat.id] = { id: cat.id, nome: cat.nome, grupo: cat.grupo || "Geral", count: 0 };
        }
        catMap[cat.id].count++;
      });

      // Montar grupos
      const groupMap: Record<string, EcommerceCategory[]> = {};
      Object.values(catMap).forEach((cat) => {
        if (!groupMap[cat.grupo]) groupMap[cat.grupo] = [];
        groupMap[cat.grupo].push({
          id: cat.id,
          nome: cat.nome,
          grupo: cat.grupo,
          totalProdutos: cat.count,
        });
      });

      // Ordenar categorias dentro de cada grupo
      const groups: EcommerceMenuGroup[] = Object.entries(groupMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([grupo, categorias]) => ({
          grupo,
          categorias: categorias.sort((a, b) => a.nome.localeCompare(b.nome)),
        }));

      setMenuGroups(groups);
    }
    setLoading(false);
  };

  return { menuGroups, loading };
}
