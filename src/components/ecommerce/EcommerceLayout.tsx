import { useState, useEffect, useRef } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Phone, Mail, Clock, Truck, Shield, RotateCcw, Package, Sun, Moon, Star, Headphones, Gift, Check, FileText, type LucideIcon } from "lucide-react";

const topbarIconMap: Record<string, LucideIcon> = {
  truck: Truck, shield: Shield, "rotate-ccw": RotateCcw, rotate: RotateCcw,
  phone: Phone, mail: Mail, clock: Clock, star: Star, headphones: Headphones,
  gift: Gift, check: Check, package: Package,
};
const getTopbarIcon = (name: string) => topbarIconMap[name] || null;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useQuoteRequest } from "@/contexts/QuoteRequestContext";
import EcommerceAdBanner from "@/components/ecommerce/EcommerceAdBanner";
import EcommerceRulesPopup from "@/components/ecommerce/EcommerceRulesPopup";
import EcommerceRulesBanner from "@/components/ecommerce/EcommerceRulesBanner";
import BrandLogo from "@/components/ecommerce/BrandLogo";
import EcommerceFloatingChat from "@/components/ecommerce/EcommerceFloatingChat";
import EcommerceWebchatWidget from "@/components/ecommerce/EcommerceWebchatWidget";
import EcommerceWhatsappWidget from "@/components/ecommerce/EcommerceWhatsappWidget";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import { useEcommerceCategories } from "@/hooks/useEcommerceCategories";
import { useEcomTracker, upsertActiveCart } from "@/hooks/useEcomTracker";
import { useInteractionTracker } from "@/hooks/useInteractionTracker";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

export default function EcommerceLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { totalItems: quoteCount } = useQuoteRequest();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const location = useLocation();
  const { branding, loading: brandingLoading } = useEcommerceBranding();
  const { menuGroups } = useEcommerceCategories();
  const [isFromSystem] = useState(() => !!localStorage.getItem("estabelecimentoId"));
  const isB2BRoute = location.pathname.includes("/b2b");
  const isCatalogMode = isB2BRoute ? branding.modo_catalogo_b2b : branding.modo_catalogo_b2c;
  const [estabId, setEstabId] = useState<string | null>(() => localStorage.getItem("estabelecimentoId"));
  useEffect(() => {
    if (estabId) return;
    (async () => {
      const mod = await import("@/lib/estabelecimentoUtils");
      const id = await mod.getEstabelecimentoId();
      if (id) setEstabId(id);
    })();
  }, [estabId]);

  // Mapa de calor do e-commerce: rastreia pageviews e tempo
  useEcomTracker(estabId);
  useInteractionTracker("ecommerce", estabId);


  // Snapshot do carrinho para detecção de abandono
  const { items: cartItems, totalPrice } = useCart() as any;
  useEffect(() => {
    if (!estabId) return;
    const items = Array.isArray(cartItems)
      ? cartItems.map((it: any) => ({
          id: String(it.id || it.produto_id || ""),
          nome: String(it.nome || it.name || ""),
          qtd: Number(it.quantidade || it.quantity || 1),
          preco: Number(it.preco || it.price || 0),
        }))
      : [];
    upsertActiveCart({
      estabelecimento_id: estabId,
      items,
      total: Number(totalPrice || items.reduce((s, i) => s + i.qtd * i.preco, 0)),
    });
  }, [estabId, cartItems, totalPrice]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMegaMenuOpen(null); setShowResults(false); setSearchQuery("");
  }, [location.pathname]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    const timer = setTimeout(async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      let query = supabase
        .from("produtos")
        .select("id, nome, foto_url, preco_minimo, marca")
        .eq("ativo", true)
        .ilike("nome", `%${searchQuery.trim()}%`)
        .limit(8);
      if (estId) { query = query.eq("estabelecimento_id", estId); }
      const { data } = await query;
      if (data) { setSearchResults(data); setShowResults(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node) &&
          (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target as Node))) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectProduct = (id: string) => {
    setShowResults(false); setSearchQuery(""); navigate(`/ecommerce/produto/${id}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowResults(false);
      navigate(`/ecommerce/catalogo?busca=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const SearchDropdown = () => (
    showResults && searchResults.length > 0 ? (
      <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-xl border z-[60] max-h-[400px] overflow-y-auto">
        {searchResults.map(p => (
          <button key={p.id} onClick={() => handleSelectProduct(p.id)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">📄</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.nome}</p>
              {p.marca && <p className="text-xs text-muted-foreground">{p.marca}</p>}
            </div>
            {p.preco_minimo && <span className="text-sm font-semibold text-primary whitespace-nowrap">{Number(p.preco_minimo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
          </button>
        ))}
        <button onClick={() => { setShowResults(false); navigate(`/ecommerce/catalogo?busca=${encodeURIComponent(searchQuery.trim())}`); }} className="w-full px-4 py-2.5 text-sm text-primary font-medium hover:bg-accent transition-colors border-t text-center">
          Ver todos os resultados →
        </button>
      </div>
    ) : showResults && searchQuery.trim().length >= 2 ? (
      <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-xl border z-[60] p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado para "{searchQuery}"</p>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {!isCatalogMode && <EcommerceAdBanner posicao="popup" />}
      {!isCatalogMode && <EcommerceRulesPopup />}
      {/* Top bar */}
      {branding.topbar_ativo && (
      <div className="bg-foreground text-background text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {branding.topbar_items.filter(item => item.posicao === "esquerda").map((item, i) => {
              const Icon = getTopbarIcon(item.icone);
              return (
                <span key={i} className="flex items-center gap-1.5">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {item.texto}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-6">
            {branding.topbar_items.filter(item => item.posicao === "direita").map((item, i) => {
              const Icon = getTopbarIcon(item.icone);
              return (
                <span key={i} className="flex items-center gap-1.5">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {item.texto}
                </span>
              );
            })}
            {branding.topbar_link_b2b && (
              <Link to="/ecommerce/b2b" className="hover:text-primary transition-colors font-medium">Atacado / B2B</Link>
            )}
            {branding.topbar_telefone && (
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {branding.topbar_telefone}</span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-lg shadow-md" : "bg-background"}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
              <div className="p-6 border-b bg-background">
                <div className="flex min-h-[72px] flex-col items-center justify-center gap-3">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt={branding.nome_loja} className="h-12 max-w-[140px] object-contain dark:brightness-0 dark:invert" />
                  ) : null}
                  <h2 className="text-lg font-bold text-foreground">Menu</h2>
                </div>
              </div>
              <nav className="p-4 space-y-1">
                <Link to="/ecommerce/conta" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-sm">
                  <User className="h-4 w-4" /> Minha Conta
                </Link>
                <Link to="/ecommerce/conta?tab=pedidos" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-sm">
                  <Package className="h-4 w-4" /> Meus Pedidos
                </Link>
                <Link to="/ecommerce/conta?tab=rastreamento" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-sm">
                  <Truck className="h-4 w-4" /> Rastreamento
                </Link>
                <hr className="my-3" />
                <Link to="/ecommerce/catalogo" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-sm">
                  Todos os Produtos
                </Link>
                {menuGroups.map(group => (
                  <Collapsible key={group.grupo}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-accent transition-colors font-semibold text-sm">
                      {group.grupo}
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 space-y-0.5">
                        {group.categorias.map(cat => (
                          <Link key={cat.id} to={`/ecommerce/catalogo?grupo=${encodeURIComponent(group.grupo)}&categoria=${encodeURIComponent(cat.nome)}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground">
                            {cat.icone_url ? <img src={cat.icone_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" /> : null}
                            {cat.nome}
                          </Link>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                <hr className="my-3" />
                <Link to="/ecommerce/b2b" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-primary">
                  Atacado / B2B
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/ecommerce" className="min-w-0 flex-1 lg:flex-none lg:min-w-fit flex items-center justify-start">
            {brandingLoading ? (
              <div className="h-10 sm:h-12 md:h-14 w-[120px]" />
            ) : branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.nome_loja} className="h-10 sm:h-12 md:h-14 max-w-[160px] object-contain dark:brightness-0 dark:invert" />
            ) : (
              <span className="block truncate text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground">
                {branding.nome_loja || "STORE"}<span className="text-primary">.</span>
              </span>
            )}
          </Link>

          {/* Search - Desktop */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl mx-auto relative">
            <Input
              placeholder="Buscar produtos, marcas, categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-4 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SearchDropdown />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0">
            {isFromSystem && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium rounded-full border-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 mr-1" title="Voltar ao sistema" onClick={() => navigate("/dashboard")}>
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fechar</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={toggleTheme} title={isDarkMode ? "Modo claro" : "Modo escuro"}>
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/ecommerce/conta" className="hidden sm:block">
              <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
            </Link>
            <Link to="/ecommerce/wishlist">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10" data-wishlist-target>
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{wishlistCount}</span>
                )}
              </Button>
            </Link>
            <Link to={isCatalogMode ? "/ecommerce/orcamento" : "/ecommerce/carrinho"}>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10" data-cart-target>
                {isCatalogMode ? <FileText className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {(isCatalogMode ? quoteCount : totalItems) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{isCatalogMode ? quoteCount : totalItems}</span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden md:hidden border-t">
              <div ref={mobileSearchRef} className="px-4 py-3 relative">
                <Input placeholder="Buscar produtos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} className="h-10" autoFocus />
                <SearchDropdown />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation - Desktop: Groups as main items, categories as dropdowns */}
        <nav className="hidden lg:block border-t">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-0">
            <Link to="/ecommerce/catalogo" className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Todos os Produtos
            </Link>
            {menuGroups.map((group) => (
              <div key={group.grupo} className="relative" onMouseEnter={() => setMegaMenuOpen(group.grupo)} onMouseLeave={() => setMegaMenuOpen(null)}>
                <button className="flex items-center gap-1 px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                  {group.grupo}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {megaMenuOpen === group.grupo && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 bg-card rounded-xl shadow-lg border p-4 min-w-[200px] z-50">
                      {group.categorias.map(cat => (
                        <Link key={cat.id} to={`/ecommerce/catalogo?grupo=${encodeURIComponent(group.grupo)}&categoria=${encodeURIComponent(cat.nome)}`} className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
                          {cat.icone_url ? <img src={cat.icone_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" /> : null}
                          {cat.nome}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            <Link to="/ecommerce/b2b" className="px-4 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors ml-auto">
              Atacado / B2B →
            </Link>
          </div>
        </nav>
      </header>

      {!isCatalogMode && <EcommerceRulesBanner posicao="topo" />}

      <main className="flex-1">
        <Outlet />
      </main>

      {!isCatalogMode && <EcommerceRulesBanner posicao="rodape" />}

      {/* Footer */}
      <footer className="bg-foreground text-background/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.nome_loja} className="mb-4 h-14 max-w-[160px] object-contain brightness-0 invert" />
              ) : (
                <span className="text-xl font-black text-background mb-4 block">{branding.nome_loja || "STORE"}<span className="text-primary">.</span></span>
              )}
              <p className="text-sm text-background/60 leading-relaxed">
                {branding.footer_descricao || "Soluções completas para empresas de todos os portes."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-background mb-4">Institucional</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/ecommerce/sobre" className="hover:text-primary transition-colors">Sobre nós</Link></li>
                <li><Link to="/ecommerce/contato" className="hover:text-primary transition-colors">Contato</Link></li>
                <li><Link to="/ecommerce/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/ecommerce/politica-privacidade" className="hover:text-primary transition-colors">Privacidade</Link></li>
                {(branding as any).lgpd_enabled && (
                  <li><Link to="/ecommerce/lgpd" className="hover:text-primary transition-colors">LGPD</Link></li>
                )}
                {(branding as any).denuncias_enabled && (
                  <li><Link to="/ecommerce/denuncias" className="hover:text-primary transition-colors">Canal de Denúncias</Link></li>
                )}
                {branding.footer_links_extras.map((link, i) => (
                  <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{link.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-background mb-4">Para Empresas</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/ecommerce/b2b" className="hover:text-primary transition-colors">Programa B2B</Link></li>
                <li><Link to="/ecommerce/b2b" className="hover:text-primary transition-colors">Preços por Volume</Link></li>
                <li><Link to="/ecommerce/b2b" className="hover:text-primary transition-colors">Solicitar Cotação</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-background mb-4">Contato</h4>
              <ul className="space-y-2 text-sm">
                {(branding.footer_telefone || "(11) 4002-8922") && (
                  <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {branding.footer_telefone || "(11) 4002-8922"}</li>
                )}
                {(branding.footer_email || "contato@store.com.br") && (
                  <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {branding.footer_email || "contato@store.com.br"}</li>
                )}
                {(branding.footer_horario || "Seg-Sex 8h-18h") && (
                  <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {branding.footer_horario || "Seg-Sex 8h-18h"}</li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-background/40">{branding.footer_copyright || `© ${new Date().getFullYear()} ${branding.nome_loja}. Todos os direitos reservados.`}</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-background/40">Pagamentos:</span>
              <div className="flex gap-2">
                {(branding.footer_pagamentos.length > 0 ? branding.footer_pagamentos : ["Visa", "Master", "Pix", "Boleto"]).map(m => (
                  <span key={m} className="px-2 py-1 rounded bg-background/10 text-[10px] font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      <EcommerceFloatingChat />
      <EcommerceWebchatWidget />
      <EcommerceWhatsappWidget />
    </div>
  );
}
