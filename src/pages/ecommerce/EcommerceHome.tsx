import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Truck, Shield, RotateCcw, Headphones, ChevronRight, Building2, TrendingUp, Users, Package, ShoppingCart, Clock, Check, Gift, ChevronDown, Play } from "lucide-react";
import EcommerceAdBanner from "@/components/ecommerce/EcommerceAdBanner";
import EcommerceRulesVitrine from "@/components/ecommerce/EcommerceRulesVitrine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/ecommerce/BrandLogo";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import { useEcommerceCategories } from "@/hooks/useEcommerceCategories";
import { resolveProductPricesBatch } from "@/hooks/useProductPrice";

/* ─── Types ─── */
interface ProductWithPrice {
  id: string;
  nome: string;
  marca: string | null;
  gramatura: number | null;
  largura: number | null;
  estoque: number | null;
  preco_tabela: number | null;
  preco_minimo: number | null;
  foto_url: string | null;
}

interface CategoryData {
  id: string;
  nome: string;
  count: number;
  icone_url?: string | null;
}

/* ─── Scroll-reveal wrapper ─── */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Stagger items ─── */
function StaggerItem({ children, index, className = "" }: { children: React.ReactNode; index: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Constants ─── */
const categoryIcons: Record<string, string> = {
  "duplex": "📄", "papel": "📝", "bobina": "🧻", "embalagem": "📦",
  "etiqueta": "🏷️", "caixa": "📦", "envelope": "✉️",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return "📋";
}

const benefitIconMap: Record<string, React.ComponentType<any>> = {
  truck: Truck, shield: Shield, rotate: RotateCcw, headphones: Headphones,
  star: Star, clock: Clock, check: Check, gift: Gift,
};

const b2bIconMap: Record<string, React.ComponentType<any>> = {
  "Até 40% de desconto": TrendingUp, "Pedido mínimo flexível": Package,
  "Conta multi-usuário": Users, "Pagamento faturado": Shield,
};

const PLACEHOLDER_VIDEO = "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4";

/* ─── Main Component ─── */
export default function EcommerceHome() {
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const { branding } = useEcommerceBranding();
  const { menuGroups } = useEcommerceCategories();
  const categories: CategoryData[] = menuGroups.flatMap(g =>
    g.categorias.map(c => ({ id: c.id, nome: c.nome, count: 0, icone_url: c.icone_url }))
  );

  const vis = branding.secoes_visiveis || {};
  const isVisible = (key: string) => vis[key] !== false;

  // Parallax for hero
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.35, 0.75]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const estabId = localStorage.getItem("estabelecimentoId");

    const [productsRes, countRes] = await Promise.all([
      estabId
        ? supabase.from("produtos").select("id, nome, marca, gramatura, largura, estoque, preco_tabela, preco_minimo, foto_url, tipo_preco, categoria_id").eq("estabelecimento_id", estabId).eq("ativo", true).limit(12)
        : supabase.from("produtos").select("id, nome, marca, gramatura, largura, estoque, preco_tabela, preco_minimo, foto_url, tipo_preco, categoria_id").eq("ativo", true).limit(12),
      estabId
        ? supabase.from("produtos").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabId).eq("ativo", true)
        : supabase.from("produtos").select("id", { count: "exact", head: true }).eq("ativo", true),
    ]);

    if (productsRes.data) {
      const rawProducts = productsRes.data as any[];
      const priceMap = await resolveProductPricesBatch(rawProducts);
      const enriched = rawProducts.map(p => ({
        ...p,
        preco_minimo: priceMap.get(p.id)?.precoMinimo ?? p.preco_minimo,
        preco_tabela: priceMap.get(p.id)?.precoTabela ?? p.preco_tabela,
      }));
      setProducts(enriched);
    }
    if (countRes.count) setTotalProducts(countRes.count);
    setLoading(false);
  };

  const featuredProducts = products.slice(0, 6);
  const testimonials = branding.depoimentos?.length > 0 ? branding.depoimentos : [];

  const videoUrl = branding.background_type === "video" && branding.background_video_url
    ? branding.background_video_url
    : null;

  const scrollToContent = () => {
    const el = document.getElementById("home-content");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col">
      {/* ════════════ HERO — Fullscreen Video ════════════ */}
      {isVisible("hero") && (
        <section ref={heroRef} className="relative h-[100svh] min-h-[600px] overflow-hidden">
          {/* Video / Image / Gradient background */}
          <motion.div className="absolute inset-0 z-0" style={{ scale: heroScale }}>
            {branding.background_type === "image" && branding.background_image_url ? (
              <img src={branding.background_image_url} alt="" className="w-full h-full object-cover" />
            ) : videoUrl ? (
              <video
                key={videoUrl}
                autoPlay loop muted playsInline
                className="w-full h-full object-cover"
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-foreground/90 to-foreground/70" />
            )}
          </motion.div>

          {/* Gradient overlay */}
          <motion.div
            className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/40 to-black/70"
            style={{ opacity: overlayOpacity }}
          />

          {/* Rounded bottom mask */}
          <div className="absolute bottom-0 left-0 right-0 z-[2] h-16 md:h-24">
            <svg viewBox="0 0 1440 96" fill="none" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0 0C0 0 360 96 720 96C1080 96 1440 0 1440 0V96H0V0Z" className="fill-background" />
            </svg>
          </div>

          {/* Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {branding.hero_badge && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <Badge className="bg-white/15 text-white border-white/20 px-5 py-2 text-sm font-medium backdrop-blur-md">
                    {branding.hero_badge}
                  </Badge>
                </motion.div>
              )}

              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight drop-shadow-2xl"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {branding.hero_titulo || branding.slogan || "Tudo para sua empresa em um só lugar"}
              </motion.h1>

              <motion.p
                className="text-base sm:text-lg md:text-xl text-white/75 max-w-xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.7 }}
              >
                {branding.hero_subtitulo || (totalProducts > 0
                  ? `Mais de ${totalProducts} itens disponíveis com os melhores preços.`
                  : "Os melhores produtos com os melhores preços."
                )}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.7 }}
              >
                <Link to="/ecommerce/catalogo">
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-10 h-13 text-base shadow-xl shadow-primary/30 transition-transform hover:scale-105">
                    {branding.hero_btn_primario || "Comprar Agora"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/ecommerce/b2b">
                  <Button size="lg" className="gap-2 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 rounded-full px-10 h-13 text-base shadow-xl transition-transform hover:scale-105">
                    <Building2 className="h-4 w-4" /> {branding.hero_btn_secundario || "Atacado / B2B"}
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex items-center justify-center gap-8 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-white">{totalProducts > 0 ? `${totalProducts}+` : "---"}</p>
                  <p className="text-xs text-white/50 mt-0.5">Produtos</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-white">{categories.length > 0 ? categories.length : "---"}</p>
                  <p className="text-xs text-white/50 mt-0.5">Categorias</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-white">{branding.hero_stat_satisfacao || "98%"}</p>
                  <p className="text-xs text-white/50 mt-0.5">Satisfação</p>
                </div>
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.button
              onClick={scrollToContent}
              className="absolute bottom-20 md:bottom-28 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ChevronDown className="h-8 w-8" />
            </motion.button>
          </motion.div>
        </section>
      )}

      {/* ════════════ CONTENT START ════════════ */}
      <div id="home-content">
        {/* Benefits bar */}
        {isVisible("beneficios") && (
          <RevealSection>
            <section className="border-b bg-card">
              <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {branding.beneficios.map((b, i) => {
                  const Icon = benefitIconMap[b.icone] || Shield;
                  return (
                    <StaggerItem key={i} index={i}>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{b.titulo}</p>
                          <p className="text-xs text-muted-foreground">{b.subtitulo}</p>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </div>
            </section>
          </RevealSection>
        )}

        {/* Home Banner Ads */}
        <RevealSection delay={0.1}>
          <section className="max-w-7xl mx-auto px-4 py-8">
            <EcommerceAdBanner posicao="home_banner" carousel autoPlay interval={5000} />
          </section>
        </RevealSection>

        {/* Destaques da Vitrine (regras do e-commerce) */}
        <RevealSection delay={0.05}>
          <EcommerceRulesVitrine />
        </RevealSection>

        {/* Categories */}
        {isVisible("categorias") && (
          <RevealSection>
            <section className="max-w-7xl mx-auto px-4 py-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Categorias</h2>
                  <p className="text-muted-foreground mt-1">Encontre o que precisa rapidamente</p>
                </div>
                <Link to="/ecommerce/catalogo" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}><CardContent className="p-6 text-center"><Skeleton className="h-12 w-12 mx-auto mb-3 rounded" /><Skeleton className="h-4 w-20 mx-auto" /></CardContent></Card>
                  ))}
                </div>
              ) : categories.length > 0 ? (
                <div className="flex flex-wrap gap-5">
                  {categories.map((cat, i) => (
                    <StaggerItem key={cat.id} index={i} className="w-36 sm:w-40 lg:w-44">
                      <Link to={`/ecommerce/catalogo?categoria=${encodeURIComponent(cat.nome)}`}>
                        <Card className="group cursor-pointer hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                          <CardContent className="p-0 relative flex flex-col items-center justify-end aspect-square">
                            {cat.icone_url ? (
                              <img src={cat.icone_url} alt={cat.nome} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <span className="text-5xl absolute inset-0 flex items-center justify-center">{getCategoryIcon(cat.nome)}</span>
                            )}
                            <div className="relative z-10 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-8 pb-3 px-2">
                              <p className="font-semibold text-white text-center text-sm drop-shadow-md group-hover:text-primary transition-colors">{cat.nome}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </StaggerItem>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
                </div>
              )}
            </section>
          </RevealSection>
        )}

        {/* Featured Products */}
        {isVisible("produtos") && (
          <RevealSection>
            <section className="bg-muted/30 py-16">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">Produtos em Destaque</h2>
                    <p className="text-muted-foreground mt-1">Os mais procurados pelos nossos clientes</p>
                  </div>
                  <Link to="/ecommerce/catalogo" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i}><CardContent className="p-4"><Skeleton className="aspect-square rounded-xl mb-3" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-5 w-1/2" /></CardContent></Card>
                    ))}
                  </div>
                ) : featuredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
                    {featuredProducts.map((product, i) => {
                      const price = { tabela: product.preco_tabela, minimo: product.preco_minimo };
                      return (
                        <StaggerItem key={product.id} index={i}>
                          <Link to={`/ecommerce/produto/${product.id}`} className="flex h-full">
                            <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col w-full">
                              <div className="relative aspect-square bg-muted/50 flex items-center justify-center flex-shrink-0">
                                {product.foto_url ? (
                                  <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{getCategoryIcon(product.nome)}</span>
                                )}
                                {product.estoque && product.estoque > 0 && (
                                  <Badge className="absolute top-2 left-2 text-[10px] bg-emerald-500 text-white border-0">Em estoque</Badge>
                                )}
                              </div>
                              <CardContent className="p-3 flex flex-col flex-1">
                                {product.marca && <p className="text-xs text-muted-foreground">{product.marca}</p>}
                                <p className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5 min-h-[2.5rem]">{product.nome}</p>
                                <div className="flex flex-wrap gap-1 mt-1 min-h-[1.25rem]">
                                  {product.gramatura && product.gramatura > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.gramatura}g</Badge>}
                                  {product.largura && product.largura > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.largura}mm</Badge>}
                                </div>
                                <div className="mt-auto pt-2">
                                  {price.tabela ? (
                                    <>
                                      {price.minimo && price.minimo < price.tabela ? (
                                        <p className="text-xs text-muted-foreground line-through">R$ {price.tabela.toFixed(2)}</p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground line-through invisible">-</p>
                                      )}
                                      <p className="text-lg font-bold text-primary">R$ {(price.minimo || price.tabela).toFixed(2)}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground line-through invisible">-</p>
                                      <p className="text-sm font-semibold text-primary">Consulte</p>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </StaggerItem>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl block mb-4">📦</span>
                    <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
                  </div>
                )}
              </div>
            </section>
          </RevealSection>
        )}

        {/* B2B Section */}
        {isVisible("b2b") && (
          <RevealSection>
            <section className="max-w-7xl mx-auto px-4 py-16">
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-foreground to-foreground/90 text-background">
                <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
                  <div className="space-y-5">
                    <Badge className="bg-primary/20 text-primary border-0 px-3 py-1">{branding.b2b_badge || "Para Empresas"}</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                      {branding.b2b_titulo || "Compre no atacado com condições exclusivas"}
                    </h2>
                    <p className="text-background/70 leading-relaxed">
                      {branding.b2b_descricao || "Preços especiais por volume, pagamento faturado, atendimento dedicado e logística personalizada para sua empresa."}
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {branding.b2b_vantagens.map((v: any, i: number) => {
                        const label = typeof v === "string" ? v : v?.title || "";
                        const Icon = (typeof v === "string" ? b2bIconMap[v] : null) || (i === 0 ? TrendingUp : i === 1 ? Package : i === 2 ? Users : Shield);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm text-background/80">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Link to="/ecommerce/b2b">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 gap-2 transition-transform hover:scale-105">
                          Cadastre sua empresa <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <div className="text-[100px]">🏢</div>
                  </div>
                </div>
              </Card>
            </section>
          </RevealSection>
        )}

        {/* Footer Banner Ads */}
        <RevealSection delay={0.05}>
          <section className="max-w-7xl mx-auto px-4 py-6">
            <EcommerceAdBanner posicao="footer" />
          </section>
        </RevealSection>

        {/* Testimonials */}
        {isVisible("depoimentos") && testimonials.length > 0 && (
          <RevealSection>
            <section className="bg-muted/30 py-16">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">O que nossos clientes dizem</h2>
                  <p className="text-muted-foreground mt-2">Empresas que confiam em nós</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {testimonials.map((t, i) => (
                    <StaggerItem key={i} index={i}>
                      <Card className="h-full">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex gap-0.5">
                            {Array.from({ length: t.rating || 5 }).map((_, j) => (
                              <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed italic">"{t.text}"</p>
                          <div className="flex items-center gap-3 pt-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">{t.avatar}</div>
                            <div>
                              <p className="text-sm font-semibold">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.company}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </StaggerItem>
                  ))}
                </div>
              </div>
            </section>
          </RevealSection>
        )}

        {/* Newsletter */}
        {isVisible("newsletter") && (
          <RevealSection>
            <section className="bg-primary text-primary-foreground py-14">
              <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold">{branding.newsletter_titulo || "Receba ofertas exclusivas"}</h2>
                <p className="text-primary-foreground/80">{branding.newsletter_subtitulo || "Cadastre-se e ganhe 10% de desconto na primeira compra"}</p>
                <div className="flex gap-2 max-w-md mx-auto">
                  <Input placeholder="Seu melhor e-mail" className="bg-background/20 border-background/30 text-primary-foreground placeholder:text-primary-foreground/50 rounded-full" />
                  <Button variant="secondary" className="rounded-full px-6 font-semibold transition-transform hover:scale-105">Cadastrar</Button>
                </div>
              </div>
            </section>
          </RevealSection>
        )}
      </div>
    </div>
  );
}
