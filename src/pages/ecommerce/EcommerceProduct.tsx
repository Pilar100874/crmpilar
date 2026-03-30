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
import { resolveProductPrice, resolveProductPricesBatch } from "@/hooks/useProductPrice";

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
      .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, largura, gramatura, comprimento, cor, material, tipo_preco, categoria_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
      .eq("id", productId)
      .maybeSingle();

    if (!error && data) {
      // Resolver preço real
      const resolvedPrice = await resolveProductPrice(data as any);
      const mappedProduct = mapProduct(data);
      mappedProduct.preco_minimo = resolvedPrice.precoMinimo;
      mappedProduct.preco_tabela = resolvedPrice.precoTabela;
      setProduct(mappedProduct);

      const catId = (data.categoria as any)?.id;
      const estabId = (data as any).estabelecimento_id;

      // Load related products and volume tiers in parallel
      const relatedPromise = catId
        ? supabase.from("produtos")
            .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, largura, gramatura, comprimento, cor, material, tipo_preco, categoria_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
            .eq("categoria_id", catId).eq("ativo", true).neq("id", productId).limit(4)
        : null;

      const volumePromise = supabase
        .from("ecommerce_volume_pricing")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      const [relatedRes, volumeRes] = await Promise.all([
        relatedPromise,
        volumePromise,
      ]);

      if (relatedRes?.data) {
        const relMapped = relatedRes.data.map(mapProduct);
        const relPriceMap = await resolveProductPricesBatch(relatedRes.data as any[]);
        for (const rp of relMapped) {
          const resolved = relPriceMap.get(rp.id);
          if (resolved) {
            rp.preco_minimo = resolved.precoMinimo;
            rp.preco_tabela = resolved.precoTabela;
          }
        }
        setRelatedProducts(relMapped);
      }
      if (volumeRes.data) setVolumeTiers(volumeRes.data);
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 md:pb-6">
      {/* Breadcrumb */}
      {branding.feat_breadcrumb && <nav className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground mb-6 overflow-x-auto">
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button ref={cartBtnRef} size="lg" className="w-full flex-1 gap-2 rounded-full h-11 sm:h-12 text-sm sm:text-base" disabled={!inStock} onClick={(e) => {
                if (product) {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFlyAnim({ startRect: rect, target: "[data-cart-target]", image: product.foto_url || undefined, icon: "cart" });
                  addItem({ productId: product.id, name: product.nome, type: product.categoria_nome, gramatura: product.gramatura?.toString() || null, quantity, maxStock: product.estoque ?? 999, image: product.foto_url || undefined, price: product.preco_minimo || product.preco_tabela || 0 });
                  toast.success("Produto adicionado ao carrinho!");
                }
              }}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              <div className="flex gap-2 sm:gap-3 sm:w-auto">
                {branding.feat_favoritos && <Button ref={heartBtnRef} variant="outline" size="lg" className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full ${wishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`} onClick={(e) => {
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
                {branding.feat_compartilhar && <Button variant="outline" size="lg" className="h-11 w-11 sm:h-12 sm:w-12 rounded-full" onClick={handleShareProduct}>
                  <Share2 className="h-5 w-5" />
                </Button>}
              </div>
            </div>
          </div>

          {/* B2B / Volume Pricing */}
          {branding.feat_b2b_card && volumeTiers.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Preços por Volume</p>
                </div>
                <div className="border rounded-lg overflow-hidden bg-background">
                  <div className="grid grid-cols-3 bg-muted/50 p-2.5 text-[11px] font-semibold text-muted-foreground border-b">
                    <span>Quantidade</span>
                    <span>Desconto</span>
                    <span>Preço Unit.</span>
                  </div>
                  {volumeTiers.map((tier: any, i: number) => {
                    const basePrice = product?.preco_minimo || product?.preco_tabela || 0;
                    const discountedPrice = basePrice * (1 - Number(tier.percentual_desconto) / 100);
                    return (
                      <div key={i} className="grid grid-cols-3 p-2.5 text-sm border-b last:border-0 hover:bg-muted/20">
                        <span className="font-medium text-xs">
                          {tier.quantidade_minima}{tier.quantidade_maxima ? `-${tier.quantidade_maxima}` : "+"} un
                        </span>
                        <span className="text-primary font-semibold text-xs">{Number(tier.percentual_desconto)}% OFF</span>
                        <span className="font-semibold text-xs">{formatPrice(discountedPrice)}</span>
                      </div>
                    );
                  })}
                </div>
                <Link to="/ecommerce/b2b" className="text-xs text-primary font-semibold hover:underline inline-block">
                  Cadastre-se B2B para mais vantagens →
                </Link>
              </CardContent>
            </Card>
          )}
          {branding.feat_b2b_card && volumeTiers.length === 0 && (
            <Card className="border-primary/20 bg-primary/5">
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
            </Card>
          )}

          {/* Trust signals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Truck, text: "Frete grátis acima de R$ 500" },
              { icon: Shield, text: "Compra 100% segura" },
              { icon: RotateCcw, text: "Troca em até 30 dias" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 sm:block text-left sm:text-center p-3 rounded-xl bg-muted/30">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary sm:mx-auto sm:mb-1 shrink-0" />
                <p className="text-xs text-muted-foreground leading-tight">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-8 md:mt-12">
        <Tabs defaultValue="descricao">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-4 h-auto rounded-xl bg-muted/50 p-1 gap-1">
            <TabsTrigger value="descricao" className="rounded-lg text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium">
              Descrição
            </TabsTrigger>
            <TabsTrigger value="especificacoes" className="rounded-lg text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium">
              Specs
            </TabsTrigger>
            <TabsTrigger value="entrega" className="rounded-lg text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium">
              Entrega
            </TabsTrigger>
            {branding.feat_avaliacoes && (
              <TabsTrigger value="avaliacoes" className="rounded-lg text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium col-span-3 sm:col-span-1">
                Avaliações
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="descricao" className="mt-4">
            <Card className="border-0 shadow-none bg-muted/20">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                {product.descricao || `${product.nome} — produto de alta qualidade para uso profissional e comercial.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="especificacoes" className="mt-4">
            <Card className="border-0 shadow-none bg-muted/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {specs.map((s, i) => (
                    <div key={s.label} className={`flex justify-between items-center px-4 sm:px-6 py-3 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                      <span className="text-xs sm:text-sm text-muted-foreground">{s.label}</span>
                      <span className="text-xs sm:text-sm font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                  {specs.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma especificação disponível.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entrega" className="mt-4">
            <Card className="border-0 shadow-none bg-muted/20">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <p className="text-sm text-foreground/80">Prazo de entrega calculado após informar o CEP no carrinho.</p>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Frete grátis acima de R$ 500</p>
                    <p className="text-xs text-muted-foreground mt-1">Válido para todo o Brasil. Prazo: 3 a 7 dias úteis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40">
                  <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Envio seguro</p>
                    <p className="text-xs text-muted-foreground mt-1">Embalagem reforçada e rastreamento completo.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avaliacoes" className="mt-4">
            <div className="space-y-3">
              {[
                { name: "João P.", rating: 5, text: "Excelente qualidade, papel consistente. Compro sempre!", date: "12/03/2026" },
                { name: "Maria L.", rating: 4, text: "Bom produto, entrega rápida. Recomendo.", date: "08/03/2026" },
              ].map((review, i) => (
                <Card key={i} className="border-0 shadow-none bg-muted/20">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {review.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm font-semibold">{review.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 mt-2.5 leading-relaxed">{review.text}</p>
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
              setFlyAnim({ startRect: document.querySelector("[data-cart-target]")?.getBoundingClientRect() || new DOMRect(), target: "[data-cart-target]", image: product.foto_url || undefined, icon: "cart" });
              addItem({ productId: product.id, name: product.nome, type: product.categoria_nome, gramatura: product.gramatura?.toString() || null, quantity, maxStock: product.estoque ?? 999, image: product.foto_url || undefined, price: product.preco_minimo || product.preco_tabela || 0 });
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
