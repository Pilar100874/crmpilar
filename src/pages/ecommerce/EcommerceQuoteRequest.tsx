import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Trash2, Minus, Plus, ChevronRight, ArrowRight, Package, LogIn, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useQuoteRequest } from "@/contexts/QuoteRequestContext";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function EcommerceQuoteRequest() {
  const { items, removeItem, updateQuantity, clearItems, submitQuote, submitting } = useQuoteRequest();
  const navigate = useNavigate();
  const [observacoes, setObservacoes] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const handleSubmit = async () => {
    const success = await submitQuote(observacoes);
    if (success) {
      navigate("/ecommerce/conta");
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <FileText className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-bold text-foreground">Sua lista de orçamento está vazia</h2>
          <p className="text-muted-foreground mt-2">Adicione produtos ao catálogo para solicitar um orçamento personalizado.</p>
          <Link to="/ecommerce/catalogo">
            <Button className="mt-6 rounded-full gap-2 px-8" size="lg">
              <Package className="h-4 w-4" /> Ver Produtos
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Solicitar Orçamento</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        Solicitar Orçamento
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Monte sua lista de produtos e envie para receber uma cotação personalizada. Nosso time entrará em contato com preços e condições especiais.
      </p>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5 mb-6">
        <CardContent className="p-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Como funciona?</p>
            <ol className="list-decimal list-inside mt-1 space-y-0.5 text-muted-foreground text-xs">
              <li>Adicione os produtos desejados à lista</li>
              <li>Ajuste as quantidades conforme sua necessidade</li>
              <li>Faça login para enviar a solicitação</li>
              <li>Receba o orçamento detalhado com preços e condições</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }}>
                <Card>
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="h-20 w-20 bg-muted/30 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {item.type && <p className="text-xs text-muted-foreground">{item.type}</p>}
                          <Link to={`/ecommerce/produto/${item.productId}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                            {item.name}
                          </Link>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center mt-3">
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clearItems}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar lista
            </Button>
          </div>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold">Resumo do Orçamento</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens</span>
                  <span className="font-medium">{items.length} produto(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade total</span>
                  <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)} un.</span>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">Observações (opcional)</label>
                <Textarea
                  placeholder="Ex: Preciso de entrega urgente, aceito produtos similares..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              {isLoggedIn === false ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Faça login para enviar sua solicitação de orçamento
                  </p>
                  <Link to="/ecommerce/conta">
                    <Button className="w-full h-12 rounded-full text-base gap-2" size="lg">
                      <LogIn className="h-4 w-4" /> Fazer Login
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  className="w-full h-12 rounded-full text-base gap-2"
                  size="lg"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  <Send className="h-4 w-4" /> {submitting ? "Enviando..." : "Enviar Solicitação"}
                </Button>
              )}

              <Link to="/ecommerce/catalogo" className="block text-center text-sm text-primary hover:underline">
                ← Continuar adicionando produtos
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
