import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Package, Phone, Mail, MapPin, Truck, Shield, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import EcommerceAdBanner from "@/components/ecommerce/EcommerceAdBanner";

const categories = [
  { name: "Papéis", slug: "papeis", subcategories: ["Sulfite", "Couché", "Offset", "Kraft"] },
  { name: "Embalagens", slug: "embalagens", subcategories: ["Caixas", "Sacolas", "Envelopes"] },
  { name: "Bobinas", slug: "bobinas", subcategories: ["Térmicas", "Offset", "Kraft"] },
  { name: "Etiquetas", slug: "etiquetas", subcategories: ["Adesivas", "BOPP", "Térmicas"] },
  { name: "Descartáveis", slug: "descartaveis", subcategories: ["Copos", "Pratos", "Talheres"] },
];

export default function EcommerceLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { totalItems } = useCart();
  const [wishlistCount] = useState(2);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMegaMenuOpen(null);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="bg-foreground text-background text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Frete grátis acima de R$ 500</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Compra 100% segura</span>
            <span className="flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Troca facilitada</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/ecommerce/b2b" className="hover:text-primary transition-colors font-medium">
              Atacado / B2B
            </Link>
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
            <SheetContent side="left" className="w-80 p-0">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold">Menu</h2>
              </div>
              <nav className="p-4 space-y-1">
                {categories.map(cat => (
                  <Link key={cat.slug} to={`/ecommerce/catalogo?categoria=${cat.slug}`} className="block px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium">
                    {cat.name}
                  </Link>
                ))}
                <hr className="my-4" />
                <Link to="/ecommerce/b2b" className="block px-4 py-3 rounded-xl hover:bg-accent transition-colors font-medium text-primary">
                  Atacado / B2B
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/ecommerce" className="flex-shrink-0">
            <span className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              STORE<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Search - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto relative">
            <Input
              placeholder="Buscar produtos, marcas, categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/ecommerce/conta">
              <Button variant="ghost" size="icon" className="relative">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/ecommerce/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/ecommerce/carrinho">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden md:hidden border-t">
              <div className="px-4 py-3">
                <Input placeholder="Buscar produtos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10" autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation - Desktop */}
        <nav className="hidden lg:block border-t">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-0">
            {categories.map((cat) => (
              <div key={cat.slug} className="relative" onMouseEnter={() => setMegaMenuOpen(cat.slug)} onMouseLeave={() => setMegaMenuOpen(null)}>
                <Link to={`/ecommerce/catalogo?categoria=${cat.slug}`} className="flex items-center gap-1 px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                  {cat.name}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>
                <AnimatePresence>
                  {megaMenuOpen === cat.slug && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 bg-card rounded-xl shadow-lg border p-4 min-w-[200px] z-50">
                      {cat.subcategories.map(sub => (
                        <Link key={sub} to={`/ecommerce/catalogo?categoria=${cat.slug}&sub=${sub.toLowerCase()}`} className="block px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
                          {sub}
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

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <span className="text-xl font-black text-background mb-4 block">STORE<span className="text-primary">.</span></span>
              <p className="text-sm text-background/60 leading-relaxed">
                Soluções em embalagens e papéis para empresas de todos os portes. Qualidade, variedade e agilidade na entrega.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-background mb-4">Institucional</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/ecommerce/sobre" className="hover:text-primary transition-colors">Sobre nós</Link></li>
                <li><Link to="/ecommerce/contato" className="hover:text-primary transition-colors">Contato</Link></li>
                <li><Link to="/ecommerce/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/ecommerce/politica-privacidade" className="hover:text-primary transition-colors">Privacidade</Link></li>
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
                <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> (11) 4002-8922</li>
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> contato@store.com.br</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Seg-Sex 8h-18h</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-background/40">© 2026 Store. Todos os direitos reservados. CNPJ: 00.000.000/0001-00</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-background/40">Pagamentos:</span>
              <div className="flex gap-2">
                {["Visa", "Master", "Pix", "Boleto"].map(m => (
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
