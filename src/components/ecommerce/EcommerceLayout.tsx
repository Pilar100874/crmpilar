import { useState, useEffect, useRef } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Phone, Mail, Clock, Truck, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import EcommerceAdBanner from "@/components/ecommerce/EcommerceAdBanner";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import { useEcommerceCategories } from "@/hooks/useEcommerceCategories";
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
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const location = useLocation();
  const { branding } = useEcommerceBranding();
  const { menuGroups } = useEcommerceCategories();

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
    <div className="min-h-screen bg-background flex flex-col">
      <EcommerceAdBanner posicao="popup" />
      {/* Top bar */}
      <div className="bg-foreground text-background text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Frete grátis acima de R$ 500</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Compra 100% segura</span>
            <span className="flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Troca facilitada</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/ecommerce/b2b" className="hover:text-primary transition-colors font-medium">Atacado / B2B</Link>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> (11) 4002-8922</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-lg shadow-md" : "bg-background"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold">Menu</h2>
              </div>
              <nav className="p-4 space-y-1">
                {menuGroups.map(group => (
                  <Collapsible key={group.grupo}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-accent transition-colors font-semibold text-sm">
                      {group.grupo}
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 space-y-0.5">
                        {group.categorias.map(cat => (
                          <Link key={cat.id} to={`/ecommerce/catalogo?grupo=${encodeURIComponent(group.grupo)}&categoria=${encodeURIComponent(cat.nome)}`} className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground">
                            {cat.nome}
                          </Link>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {menuGroups.length === 0 && (
                  <Link to="/ecommerce/catalogo" className="block px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium">
                    Todos os Produtos
                  </Link>
                )}
                <hr className="my-4" />
                <Link to="/ecommerce/b2b" className="block px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-primary">
                  Atacado / B2B
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/ecommerce" className="flex-shrink-0">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.nome_loja} className="max-h-10 md:max-h-12 max-w-[120px] md:max-w-[160px] object-contain" />
            ) : (
              <span className="text-xl md:text-2xl font-black tracking-tight text-foreground">
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
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/ecommerce/conta">
              <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
            </Link>
            <Link to="/ecommerce/wishlist">
              <Button variant="ghost" size="icon" className="relative" data-wishlist-target>
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{wishlistCount}</span>
                )}
              </Button>
            </Link>
            <Link to="/ecommerce/carrinho">
              <Button variant="ghost" size="icon" className="relative" data-cart-target>
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{totalItems}</span>
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
                        <Link key={cat.id} to={`/ecommerce/catalogo?grupo=${encodeURIComponent(group.grupo)}&categoria=${encodeURIComponent(cat.nome)}`} className="block px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
                          {cat.nome}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            <Link to="/ecommerce/catalogo" className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Todos os Produtos
            </Link>
            <Link to="/ecommerce/b2b" className="px-4 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors ml-auto">
              Atacado / B2B →
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.nome_loja} className="max-h-10 max-w-[140px] object-contain mb-4" />
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
    </div>
  );
}
