import { useEcommerceRulesEngine } from "@/hooks/useEcommerceRulesEngine";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChevronRight, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  nome: string;
  foto_url: string | null;
  preco_tabela: number | null;
  preco_minimo: number | null;
  marca: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

/**
 * Renderiza seções de destaque na vitrine geradas pelo motor de regras.
 */
export default function EcommerceRulesVitrine() {
  const { vitrineActions, loading: rulesLoading } = useEcommerceRulesEngine();

  if (rulesLoading) return null;
  if (vitrineActions.length === 0) return null;

  return (
    <>
      {vitrineActions.map((action) => (
        <VitrineSection key={action.ruleId} action={action} />
      ))}
    </>
  );
}

function VitrineSection({ action }: { action: { ruleId: string; config: Record<string, any>; label: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const config = action.config || {};
  const titulo = config.titulo || "Oferta Especial";
  const maxProdutos = config.maxProdutos || 8;
  const productIds: string[] = config.produtos || [];
  const categoriaId: string = config.categoriaId || "";

  useEffect(() => {
    loadProducts();
  }, [action.ruleId]);

  const loadProducts = async () => {
    try {
      const estabId = localStorage.getItem("estabelecimentoId");
      if (!estabId) { setLoading(false); return; }

      let data: any[] = [];

      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("produtos")
          .select("id, nome, foto_url, preco_tabela, preco_minimo, marca")
          .in("id", productIds)
          .limit(maxProdutos);
        data = prods || [];
      } else if (categoriaId) {
        const { data: prods } = await supabase
          .from("produtos")
          .select("id, nome, foto_url, preco_tabela, preco_minimo, marca")
          .eq("categoria_id", categoriaId)
          .eq("estabelecimento_id", estabId)
          .limit(maxProdutos);
        data = prods || [];
      }

      setProducts(data);
    } catch (err) {
      console.error("[Vitrine] Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="aspect-square rounded-xl mb-3" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-5 w-1/2" /></CardContent></Card>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Badge variant="secondary" className="mb-2 text-xs">⭐ Destaque</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{titulo}</h2>
          </div>
          <Link to="/ecommerce/catalogo" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            Ver mais <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product, i) => {
            const preco = product.preco_minimo || product.preco_tabela;
            return (
              <motion.div key={product.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Link to={`/ecommerce/produto/${product.id}`}>
                  <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-primary/10">
                    <div className="relative aspect-square bg-muted/50 flex items-center justify-center">
                      {product.foto_url ? (
                        <img src={product.foto_url} alt={product.nome} className="w-full h-full object-contain p-2" loading="lazy" />
                      ) : (
                        <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                      )}
                      <Badge className="absolute top-2 left-2 text-[10px] bg-primary text-primary-foreground">Destaque</Badge>
                    </div>
                    <CardContent className="p-4">
                      {product.marca && <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.marca}</p>}
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">{product.nome}</h3>
                      {preco && (
                        <span className="text-lg font-bold text-primary">
                          R$ {preco.toFixed(2)}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
