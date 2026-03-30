import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PriceResult {
  precoMinimo: number | null;
  precoTabela: number | null;
}

/**
 * Resolve o preço de um produto seguindo a regra:
 * - tipo_preco = 'produto': usa preco_minimo/preco_tabela do próprio produto
 * - tipo_preco = 'categoria': busca da tabela tabelas_preco pela categoria_id
 */
export async function resolveProductPrice(product: {
  tipo_preco?: string | null;
  preco_minimo?: number | null;
  preco_tabela?: number | null;
  categoria_id?: string | null;
}): Promise<PriceResult> {
  if (product.tipo_preco === "produto" || !product.tipo_preco) {
    return {
      precoMinimo: product.preco_minimo ?? null,
      precoTabela: product.preco_tabela ?? null,
    };
  }

  // tipo_preco = 'categoria'
  if (!product.categoria_id) {
    return { precoMinimo: null, precoTabela: null };
  }

  const { data } = await supabase
    .from("tabelas_preco")
    .select("preco_minimo, preco_tabela")
    .eq("categoria_id", product.categoria_id)
    .eq("ativo", true)
    .maybeSingle();

  return {
    precoMinimo: data?.preco_minimo ?? null,
    precoTabela: data?.preco_tabela ?? null,
  };
}

/**
 * Resolve preços para uma lista de produtos de uma vez (batch).
 */
export async function resolveProductPricesBatch(
  products: Array<{
    id: string;
    tipo_preco?: string | null;
    preco_minimo?: number | null;
    preco_tabela?: number | null;
    categoria_id?: string | null;
  }>
): Promise<Map<string, PriceResult>> {
  const result = new Map<string, PriceResult>();

  const categoryIds = new Set<string>();

  for (const p of products) {
    if (p.tipo_preco === "categoria" && p.categoria_id) {
      categoryIds.add(p.categoria_id);
    }
  }

  // Buscar preços de categorias em batch
  let categoryPrices = new Map<string, PriceResult>();
  if (categoryIds.size > 0) {
    const { data } = await supabase
      .from("tabelas_preco")
      .select("categoria_id, preco_minimo, preco_tabela")
      .in("categoria_id", Array.from(categoryIds))
      .eq("ativo", true);

    if (data) {
      for (const row of data) {
        categoryPrices.set(row.categoria_id, {
          precoMinimo: row.preco_minimo,
          precoTabela: row.preco_tabela,
        });
      }
    }
  }

  for (const p of products) {
    if (p.tipo_preco === "categoria" && p.categoria_id) {
      result.set(p.id, categoryPrices.get(p.categoria_id) || { precoMinimo: null, precoTabela: null });
    } else {
      result.set(p.id, { precoMinimo: p.preco_minimo ?? null, precoTabela: p.preco_tabela ?? null });
    }
  }

  return result;
}
