import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus, Share2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import FlyToAnimation from "@/components/ecommerce/FlyToAnimation";

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  preco_tabela: number | null;
  preco_minimo: number | null;
  estoque: number | null;
  marca: string | null;
  categoria_nome: string | null;
  grupo_nome: string | null;
  largura: number | null;
  gramatura: number | null;
  comprimento: number | null;
  cor: string | null;
  material: string | null;
}

const formatPrice = (value: number | null) => {
  if (!value) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function EcommerceProduct() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { branding } = useEcommerceBranding();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [volumeTiers, setVolumeTiers] = useState<any[]>([]);
  const [flyAnim, setFlyAnim] = useState<{ startRect: DOMRect; target: string; image?: string; icon?: "heart" | "cart" } | null>(null);
  const [flyAnim, setFlyAnim] = useState<{ startRect: DOMRect; target: string; image?: string; icon?: "heart" | "cart" } | null>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const wishlisted = product ? isWishlisted(product.id) : false;

  const copyProductLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
      return true;
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.setAttribute("readonly", "true");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Link copiado para a área de transferência!");
        return true;
      } catch {
        toast.error("Não foi possível compartilhar este produto agora.");
        return false;
      }
    }
  };

  const handleShareProduct = async () => {
    if (!product) return;

    const shareData = {
      title: product.nome,
      text: product.descricao || `Confira o produto ${product.nome}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Produto compartilhado com sucesso!");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyProductLink();
  };

  useEffect(() => {
    if (id) loadProduct(id);
  }, [id]);

  const mapProduct = (r: any): Product => ({
    id: r.id, nome: r.nome, descricao: r.descricao, foto_url: r.foto_url,
    preco_tabela: r.preco_tabela, preco_minimo: r.preco_minimo, estoque: r.estoque,
    marca: r.marca, largura: r.largura, gramatura: r.gramatura, comprimento: r.comprimento,
    cor: r.cor, material: r.material,
    categoria_nome: r.categoria?.nome || null, grupo_nome: r.grupo?.nome || null,
  });

  const loadProduct = async (productId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, largura, gramatura, comprimento, cor, material, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
      .eq("id", productId)
      .maybeSingle();

    if (!error && data) {
      setProduct(mapProduct(data));

      const catId = (data.categoria as any)?.id;
      if (catId) {
        const { data: related } = await supabase
          .from("produtos")
          .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, largura, gramatura, comprimento, cor, material, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
          .eq("categoria_id", catId)
          .eq("ativo", true)
          .neq("id", productId)
          .limit(4);
        if (related) setRelatedProducts(related.map(mapProduct));
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-10 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="text-6xl block mb-4">😕</span>
        <h2 className="text-2xl font-bold">Produto não encontrado</h2>
        <Link to="/ecommerce/catalogo">
          <Button className="mt-4 rounded-full">Voltar ao catálogo</Button>
        </Link>
      </div>
    );
  }

  const specs = [
    { label: "Categoria", value: product.categoria_nome },
    { label: "Grupo", value: product.grupo_nome },
    { label: "Gramatura", value: product.gramatura?.toString() },
    { label: "Largura", value: product.largura?.toString() },
    { label: "Comprimento", value: product.comprimento?.toString() },
    { label: "Cor", value: product.cor },
    { label: "Material", value: product.material },
    { label: "Marca", value: product.marca },
  ].filter(s => s.value);

  const inStock = (product.estoque ?? 0) > 0;

  return (
    <>
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Breadcrumb */}
      {branding.feat_breadcrumb && <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/ecommerce/catalogo" className="hover:text-primary transition-colors">Catálogo</Link>
        {product.grupo_nome && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/ecommerce/catalogo?grupo=${encodeURIComponent(product.grupo_nome)}`} className="hover:text-primary transition-colors">{product.grupo_nome}</Link>
          </>
        )}
        {product.categoria_nome && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/ecommerce/catalogo?grupo=${encodeURIComponent(product.grupo_nome || "")}&categoria=${encodeURIComponent(product.categoria_nome)}`} className="hover:text-primary transition-colors">{product.categoria_nome}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium line-clamp-1">{product.nome}</span>
      </nav>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="aspect-square max-h-[55vh] md:max-h-none bg-muted/30 rounded-2xl flex items-center justify-center border relative overflow-hidden group mx-auto w-full">
            {product.foto_url ? (
              <img src={product.foto_url} alt={product.nome} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <span className="text-[80px] md:text-[120px] group-hover:scale-110 transition-transform duration-500">📄</span>
            )}
            {!inStock && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Badge variant="destructive" className="text-base px-4 py-2">Indisponível</Badge>
              </div>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 md:space-y-5">
          {product.categoria_nome && (
            <Badge variant="outline" className="text-xs">{product.categoria_nome}</Badge>
          )}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.nome}</h1>
          
          {/* Rating */}
          {branding.feat_rating_estrelas && <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-4 w-4 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4.0 (12 avaliações)</span>
          </div>}

          {/* Price */}
          <div>
            {product.preco_tabela && product.preco_minimo && product.preco_tabela > product.preco_minimo && (
              <p className="text-sm text-muted-foreground line-through">{formatPrice(product.preco_tabela)}</p>
            )}
            {product.preco_minimo ? (
              <p className="text-2xl sm:text-3xl font-bold text-primary">{formatPrice(product.preco_minimo)}</p>
            ) : (
              <p className="text-lg text-muted-foreground">Sob consulta</p>
            )}
          </div>

          {/* Specs badges */}
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {specs.map(s => (
              <Badge key={s.label} variant="secondary" className="text-xs gap-1">
                {s.label}: {s.value}
              </Badge>
            ))}
          </div>

          {/* Stock */}
          {branding.feat_estoque_visivel && <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${inStock ? "bg-green-600" : "bg-destructive"}`} />
            <span className={`text-sm font-medium ${inStock ? "text-green-600" : "text-destructive"}`}>
              {inStock ? `Em estoque (${product.estoque} un.)` : "Indisponível"}
            </span>
          </div>}

          <Separator />

          {/* Quantity & Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantidade:</span>
              <div className="flex items-center border rounded-full overflow-hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button ref={cartBtnRef} size="lg" className="flex-1 gap-2 rounded-full h-11 sm:h-12 text-sm sm:text-base" disabled={!inStock} onClick={(e) => {
                if (product) {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFlyAnim({ startRect: rect, target: "[data-cart-target]", image: product.foto_url || undefined, icon: "cart" });
                  addItem({ productId: product.id, name: product.nome, type: product.categoria_nome, gramatura: product.gramatura?.toString() || null, quantity, maxStock: product.estoque ?? 999, image: product.foto_url || undefined });
                  toast.success("Produto adicionado ao carrinho!");
                }
              }}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              {branding.feat_favoritos && <Button ref={heartBtnRef} variant="outline" size="lg" className={`h-12 w-12 rounded-full ${wishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`} onClick={(e) => {
                if (product) {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const added = toggleWishlist({ productId: product.id, name: product.nome, image: product.foto_url || undefined, price: product.preco_tabela || product.preco_minimo || undefined });
                  if (added) {
                    setFlyAnim({ startRect: rect, target: "[data-wishlist-target]", image: product.foto_url || undefined, icon: "heart" });
                    toast.success("Adicionado aos favoritos ❤️");
                  } else {
                    toast.success("Removido dos favoritos");
                  }
                }
              }}>
                <Heart className={`h-5 w-5 ${wishlisted ? "fill-red-500" : ""}`} />
              </Button>}
              {branding.feat_compartilhar && <Button variant="outline" size="lg" className="h-12 w-12 rounded-full" onClick={handleShareProduct}>
                <Share2 className="h-5 w-5" />
              </Button>}
            </div>
          </div>

          {/* B2B pricing hint */}
          {branding.feat_b2b_card && <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Package className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Compra em volume?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastre-se como cliente B2B para acessar preços especiais por quantidade.
                </p>
                <Link to="/ecommerce/b2b" className="text-xs text-primary font-semibold hover:underline mt-1 inline-block">
                  Saiba mais →
                </Link>
              </div>
            </CardContent>
          </Card>}

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Truck, text: "Frete grátis acima de R$ 500" },
              { icon: Shield, text: "Compra 100% segura" },
              { icon: RotateCcw, text: "Troca em até 30 dias" },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 sm:p-3 rounded-xl bg-muted/30">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground leading-tight">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-8 md:mt-12">
        <Tabs defaultValue="descricao">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 gap-0 overflow-x-auto flex-nowrap">
            {[
              { value: "descricao", label: "Descrição" },
              { value: "especificacoes", label: "Especificações" },
              { value: "entrega", label: "Entrega" },
              ...(branding.feat_avaliacoes ? [{ value: "avaliacoes", label: "Avaliações (12)" }] : []),
            ].map((tab: any) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="descricao" className="py-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground/80 leading-relaxed">
                {product.descricao || `${product.nome} — produto de alta qualidade para uso profissional e comercial.`}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="especificacoes" className="py-6">
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              {specs.map(s => (
                <div key={s.label} className="flex justify-between items-center py-2 px-4 rounded-xl bg-muted/30">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="entrega" className="py-6">
            <div className="space-y-4 max-w-lg">
              <p className="text-sm text-foreground/80">Prazo de entrega calculado após informar o CEP no carrinho.</p>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-sm font-semibold">Frete grátis para compras acima de R$ 500</p>
                <p className="text-xs text-muted-foreground mt-1">Válido para todo o Brasil. Prazo estimado: 3 a 7 dias úteis.</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="avaliacoes" className="py-6">
            <div className="space-y-4">
              {[
                { name: "João P.", rating: 5, text: "Excelente qualidade, papel consistente. Compro sempre!", date: "12/03/2026" },
                { name: "Maria L.", rating: 4, text: "Bom produto, entrega rápida. Recomendo.", date: "08/03/2026" },
              ].map((review, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {review.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm font-semibold">{review.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 mt-2">{review.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {branding.feat_produtos_relacionados && relatedProducts.length > 0 && (
        <section className="mt-16 mb-8">
          <h2 className="text-xl font-bold mb-6">Produtos Relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map(rp => (
              <Link key={rp.id} to={`/ecommerce/produto/${rp.id}`}>
                <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                  <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                    {rp.foto_url ? (
                      <img src={rp.foto_url} alt={rp.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <span className="text-4xl group-hover:scale-110 transition-transform">📄</span>
                    )}
                  </div>
                  <CardContent className="p-3">
                    {rp.categoria_nome && <p className="text-xs text-muted-foreground">{rp.categoria_nome}</p>}
                    <p className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5">{rp.nome}</p>
                    <div className="mt-1.5">
                      {rp.preco_minimo ? (
                        <p className="text-sm font-bold text-primary">{formatPrice(rp.preco_minimo)}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sob consulta</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile add to cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t p-3 md:hidden z-40 safe-area-inset-bottom">
        <div className="flex gap-3 items-center">
          <div className="flex items-center border rounded-full overflow-hidden flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(quantity + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button size="lg" className="flex-1 gap-2 rounded-full h-11" disabled={!inStock} onClick={() => {
            if (product) {
              addItem({ productId: product.id, name: product.nome, type: product.categoria_nome, gramatura: product.gramatura?.toString() || null, quantity, maxStock: product.estoque ?? 999 });
              toast.success("Produto adicionado ao carrinho!");
            }
          }}>
            <ShoppingCart className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
    {flyAnim && (
      <FlyToAnimation
        startRect={flyAnim.startRect}
        targetSelector={flyAnim.target}
        imageUrl={flyAnim.image}
        icon={flyAnim.icon}
        onComplete={() => setFlyAnim(null)}
      />
    )}
    </>
  );
}
