import { Link } from "react-router-dom";
import { ArrowRight, Star, Truck, Shield, RotateCcw, Headphones, ChevronRight, Building2, TrendingUp, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const featuredProducts = [
  { id: "1", name: "Papel Sulfite A4 75g", brand: "Chamex", price: 24.90, originalPrice: 29.90, image: "📄", badge: "Mais Vendido", rating: 4.8, reviews: 342 },
  { id: "2", name: "Bobina Térmica 80x40", brand: "Regispel", price: 8.50, image: "🧻", badge: "Novo", rating: 4.6, reviews: 128 },
  { id: "3", name: "Caixa Papelão 30x20x15", brand: "PackBox", price: 3.20, originalPrice: 4.00, image: "📦", badge: "-20%", rating: 4.7, reviews: 89 },
  { id: "4", name: "Papel Couché 170g A3", brand: "Suzano", price: 1.80, image: "🎨", rating: 4.9, reviews: 56 },
  { id: "5", name: "Envelope Kraft A4", brand: "Foroni", price: 0.45, image: "✉️", badge: "Exclusivo", rating: 4.5, reviews: 201 },
  { id: "6", name: "Etiqueta Adesiva A4", brand: "Pimaco", price: 32.90, originalPrice: 39.90, image: "🏷️", badge: "-18%", rating: 4.7, reviews: 167 },
];

const categories = [
  { name: "Papéis", icon: "📄", count: 1240, slug: "papeis" },
  { name: "Embalagens", icon: "📦", count: 856, slug: "embalagens" },
  { name: "Bobinas", icon: "🧻", count: 312, slug: "bobinas" },
  { name: "Etiquetas", icon: "🏷️", count: 428, slug: "etiquetas" },
  { name: "Descartáveis", icon: "🍽️", count: 195, slug: "descartaveis" },
  { name: "Escritório", icon: "🖊️", count: 673, slug: "escritorio" },
];

const testimonials = [
  { name: "Carlos Silva", company: "Gráfica Express", text: "Fornecedor confiável há 3 anos. Qualidade impecável e entrega sempre no prazo.", rating: 5, avatar: "CS" },
  { name: "Ana Mendes", company: "Restaurante Sabor & Arte", text: "Ótimos preços em descartáveis. A compra por volume reduziu nosso custo em 30%.", rating: 5, avatar: "AM" },
  { name: "Roberto Alves", company: "Alves Distribuição", text: "O programa B2B é excelente. Condições comerciais e atendimento diferenciado.", rating: 5, avatar: "RA" },
];

const partners = ["Suzano", "International Paper", "Klabin", "Pimaco", "3M", "Chamex", "Regispel", "Foroni"];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function EcommerceHome() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 text-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/50 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
              <Badge className="bg-primary/20 text-primary border-0 px-4 py-1.5 text-sm font-medium">
                🔥 Ofertas especiais esta semana
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
                Tudo para sua empresa em um só lugar
              </h1>
              <p className="text-lg text-background/70 max-w-lg leading-relaxed">
                Papéis, embalagens, descartáveis e mais de 5.000 itens com os melhores preços. 
                Para você e para sua empresa.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/ecommerce/catalogo">
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 h-12 text-base shadow-lg shadow-primary/30">
                    Comprar Agora <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/ecommerce/b2b">
                  <Button size="lg" variant="outline" className="gap-2 border-background/30 text-background hover:bg-background/10 rounded-full px-8 h-12 text-base">
                    <Building2 className="h-4 w-4" /> Atacado / B2B
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">5.000+</p>
                  <p className="text-xs text-background/50">Produtos</p>
                </div>
                <div className="w-px h-8 bg-background/20" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">2.400+</p>
                  <p className="text-xs text-background/50">Clientes</p>
                </div>
                <div className="w-px h-8 bg-background/20" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">98%</p>
                  <p className="text-xs text-background/50">Satisfação</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden md:flex justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl rotate-6" />
                <div className="absolute inset-0 bg-primary/10 rounded-3xl -rotate-3" />
                <div className="relative bg-card rounded-3xl p-8 shadow-2xl flex items-center justify-center">
                  <span className="text-[120px]">📦</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits bar */}
      <section className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, text: "Frete grátis acima de R$ 500", sub: "Para todo o Brasil" },
            { icon: Shield, text: "Compra segura", sub: "Dados protegidos" },
            { icon: RotateCcw, text: "Troca facilitada", sub: "Até 30 dias" },
            { icon: Headphones, text: "Suporte dedicado", sub: "Atendimento rápido" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{b.text}</p>
                <p className="text-xs text-muted-foreground">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => (
            <motion.div key={cat.slug} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Link to={`/ecommerce/catalogo?categoria=${cat.slug}`}>
                <Card className="group cursor-pointer hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <span className="text-4xl block mb-3">{cat.icon}</span>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cat.count} itens</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredProducts.map((product, i) => (
              <motion.div key={product.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Link to={`/ecommerce/produto/${product.id}`}>
                  <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div className="relative aspect-square bg-muted/50 flex items-center justify-center">
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{product.image}</span>
                      {product.badge && (
                        <Badge className="absolute top-2 left-2 text-[10px] bg-primary text-primary-foreground border-0">{product.badge}</Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                      <p className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5 min-h-[2.5rem]">{product.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                      </div>
                      <div className="mt-2">
                        {product.originalPrice && (
                          <p className="text-xs text-muted-foreground line-through">R$ {product.originalPrice.toFixed(2)}</p>
                        )}
                        <p className="text-lg font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-foreground to-foreground/90 text-background">
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            <div className="space-y-5">
              <Badge className="bg-primary/20 text-primary border-0 px-3 py-1">Para Empresas</Badge>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Compre no atacado com condições exclusivas
              </h2>
              <p className="text-background/70 leading-relaxed">
                Preços especiais por volume, pagamento faturado, atendimento dedicado e 
                logística personalizada para sua empresa.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { icon: TrendingUp, text: "Até 40% de desconto" },
                  { icon: Package, text: "Pedido mínimo flexível" },
                  { icon: Users, text: "Conta multi-usuário" },
                  { icon: Shield, text: "Pagamento faturado" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-background/80">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Link to="/ecommerce/b2b">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 gap-2">
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

      {/* Testimonials */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">O que nossos clientes dizem</h2>
            <p className="text-muted-foreground mt-2">Mais de 2.400 empresas confiam em nós</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-center text-sm text-muted-foreground mb-6">Marcas que trabalhamos</p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {partners.map(p => (
            <span key={p} className="text-lg font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">{p}</span>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl font-bold">Receba ofertas exclusivas</h2>
          <p className="text-primary-foreground/80">Cadastre-se e ganhe 10% de desconto na primeira compra</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input placeholder="Seu melhor e-mail" className="bg-background/20 border-background/30 text-primary-foreground placeholder:text-primary-foreground/50 rounded-full" />
            <Button variant="secondary" className="rounded-full px-6 font-semibold">Cadastrar</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
