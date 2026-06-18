import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { CatalogPDFDocument } from "@/components/marketing/catalogo/PDFDocument";
import {
  CatalogConfig,
  CatalogPage,
  CatalogProduct,
  LAYOUT_OPTIONS,
  ProductGroup,
} from "@/components/marketing/catalogo/types";
import { Json } from "@/integrations/supabase/types";

export interface SavedCatalog {
  id: string;
  nome: string;
  config: CatalogConfig;
  cover_page: CatalogPage | null;
  products_page: CatalogPage | null;
  backcover_page: CatalogPage | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
}

interface PageInfo {
  type: "cover" | "group-header" | "products" | "price-table" | "backcover";
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
  priceTableData?: { groupName: string; products: CatalogProduct[] }[];
}

const parseJsonField = <T,>(json: Json | null): T | null => {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as unknown as T;
};

const buildGroupedProducts = (
  products: CatalogProduct[],
  groupByCategory: boolean,
): ProductGroup[] => {
  if (!groupByCategory) {
    return [{ id: "all", nome: "Todos os Produtos", products }];
  }
  const groupMap = new Map<string, ProductGroup>();
  products.forEach((product) => {
    const groupName = product.grupo_nome || "Outros";
    const groupId =
      product.grupo_id || `outros_${groupName.replace(/\s+/g, "_").toLowerCase()}`;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        id: groupId,
        nome: groupName,
        products: [],
        descritivo_catalogo: product.grupo_descritivo_catalogo,
      });
    }
    groupMap.get(groupId)!.products.push(product);
  });
  return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

const buildPages = (
  groupedProducts: ProductGroup[],
  productsPerPage: number,
  groupByCategory: boolean,
  showPriceTable: boolean,
): PageInfo[] => {
  const result: PageInfo[] = [{ type: "cover", pageNumber: 1 }];
  let pageNum = 2;
  groupedProducts.forEach((group) => {
    if (groupByCategory) {
      result.push({ type: "group-header", groupName: group.nome, pageNumber: pageNum++ });
    }
    const totalProductPages = Math.ceil(group.products.length / productsPerPage);
    for (let i = 0; i < totalProductPages; i++) {
      result.push({
        type: "products",
        groupName: group.nome,
        products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
        startIdx: i * productsPerPage,
        pageNumber: pageNum++,
      });
    }
  });
  if (showPriceTable !== false) {
    const sortedGroupsForPriceTable = [...groupedProducts]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((group) => ({
        groupName: group.nome,
        products: [...group.products].sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
    const ROWS_PER_PRICE_PAGE = 28;
    let cur: { groupName: string; products: CatalogProduct[] }[] = [];
    let count = 0;
    sortedGroupsForPriceTable.forEach((group) => {
      const rows = 1 + group.products.length;
      if (count + rows > ROWS_PER_PRICE_PAGE && cur.length > 0) {
        result.push({ type: "price-table", priceTableData: cur, pageNumber: pageNum++ });
        cur = [];
        count = 0;
      }
      cur.push(group);
      count += rows;
    });
    if (cur.length > 0) {
      result.push({ type: "price-table", priceTableData: cur, pageNumber: pageNum++ });
    }
  }
  result.push({ type: "backcover", pageNumber: pageNum });
  return result;
};

/** Carrega catálogos ativos (e não vencidos) do estabelecimento. */
export async function loadActiveCatalogs(): Promise<SavedCatalog[]> {
  const estabId = await getEstabelecimentoId();
  if (!estabId) return [];
  const { data, error } = await supabase
    .from("catalogos_salvos")
    .select("*")
    .eq("estabelecimento_id", estabId)
    .eq("ativo", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const now = new Date();
  return (data || [])
    .map((raw: any) => ({
      ...raw,
      config:
        parseJsonField<CatalogConfig>(raw.config) || {
          name: "",
          pages: [],
          primaryColor: "#0f172a",
          secondaryColor: "#64748b",
          fontFamily: "Inter, sans-serif",
          showPrices: true,
          showCodes: true,
          showPriceTable: true,
        },
      cover_page: parseJsonField<CatalogPage>(raw.cover_page),
      products_page: parseJsonField<CatalogPage>(raw.products_page),
      backcover_page: parseJsonField<CatalogPage>(raw.backcover_page),
    }))
    .filter((c: SavedCatalog) => {
      if (!c.data_indeterminada && c.data_validade) {
        return new Date(c.data_validade) > now;
      }
      return true;
    });
}

/** Gera o PDF de um catálogo e retorna URL local + nome de arquivo.
 *  Também faz upload do PDF para o Storage (bucket bot-media) e persiste
 *  a URL pública em catalogos_salvos.pdf_url, para que o bot do WhatsApp
 *  consiga enviar o arquivo sem precisar gerar PDF no servidor. */
export async function generateCatalogPdf(
  catalog: SavedCatalog,
): Promise<{ url: string; fileName: string; blob: Blob } | null> {
  if (!catalog.cover_page || !catalog.products_page || !catalog.backcover_page) {
    return null;
  }
  const products = catalog.products_page.products || [];
  const layout = catalog.products_page.layout || "grid-3";
  const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
  const productsPerPage = layout === "list" ? 4 : layoutConfig.cols * 2;
  const groupByCategory = catalog.products_page.groupByCategory ?? true;
  const groupedProducts = buildGroupedProducts(products, groupByCategory);
  const pages = buildPages(
    groupedProducts,
    productsPerPage,
    groupByCategory,
    catalog.config.showPriceTable !== false,
  );
  const blob = await pdf(
    <CatalogPDFDocument
      config={catalog.config}
      coverPage={catalog.cover_page}
      productsPage={catalog.products_page}
      backcoverPage={catalog.backcover_page}
      groupImages={catalog.config.groupImages || {}}
      groupedProducts={groupedProducts}
      pages={pages}
    />
  ).toBlob();
  const safeName = catalog.nome.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `catalogo_${safeName}.pdf`;

  // Cacheia o PDF no Storage para que o bot do WhatsApp consiga anexar.
  // Falha aqui NÃO deve quebrar o download local.
  try {
    const storagePath = `catalogos/${catalog.id}/${Date.now()}_${fileName}`;
    const { error: upErr } = await supabase.storage
      .from("bot-media")
      .upload(storagePath, blob, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "3600",
      });
    if (!upErr) {
      const { data: pub } = supabase.storage.from("bot-media").getPublicUrl(storagePath);
      if (pub?.publicUrl) {
        await supabase
          .from("catalogos_salvos")
          .update({
            pdf_url: pub.publicUrl,
            pdf_generated_at: new Date().toISOString(),
          })
          .eq("id", catalog.id);
      }
    } else {
      console.warn("[catalogPdfGenerator] Falha ao subir PDF para Storage:", upErr);
    }
  } catch (e) {
    console.warn("[catalogPdfGenerator] Erro inesperado ao cachear PDF:", e);
  }

  return { url: URL.createObjectURL(blob), fileName, blob };
}
