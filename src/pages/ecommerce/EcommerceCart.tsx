import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart, Tag, ChevronRight, ArrowRight, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CrossSellProduct {
  id: string;
  name: string;
  type: string;
  price: string;
  image: string;
}

export default function EcommerceCart() {
  const { items, removeItem, updateQuantity, clearCart, coupon, applyCoupon, removeCoupon, couponDiscount } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState(false);
  const [cep, setCep] = useState("");
  const [shippingCalculated, setShippingCalculated] = useState(false);

  const handleApplyCoupon = () => {
    if (applyCoupon(couponInput)) {
      toast.success("Cupom aplicado com sucesso!");
      setCouponError(false);
      setCouponInput("");
    } else {
      setCouponError(true);
      toast.error("Cupom inválido");
    }
  };

  const handleCalcShipping = () => {
    if (cep.length >= 8) setShippingCalculated(true);
  };

  const subtotal = items.length * 24.90; // Placeholder pricing
  const discount = couponDiscount > 0 ? (subtotal * couponDiscount / 100) : 0;
  const shipping = shippingCalculated ? (subtotal >= 500 ? 0 : 29.90) : null;
  const total = subtotal - discount + (shipping ?? 0);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-bold text-foreground">Seu carrinho está vazio</h2>
          <p className="text-muted-foreground mt-2">Que tal explorar nosso catálogo?</p>
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Carrinho</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
        Carrinho <span className="text-muted-foreground font-normal text-lg">({items.length} {items.length === 1 ? "item" : "itens"})</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }}>
                <Card>
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="h-20 w-20 bg-muted/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">📄</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {item.type && <p className="text-xs text-muted-foreground">{item.type}</p>}
                          <Link to={`/ecommerce/produto/${item.productId}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                            {item.name}
                          </Link>
                          {item.gramatura && <Badge variant="outline" className="text-[10px] mt-1">{item.gramatura}</Badge>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-base font-bold text-foreground">R$ {(24.90 * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clearCart}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar carrinho
            </Button>
          </div>

          {/* Cross-sell */}
          <div className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Você também pode gostar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {crossSellProducts.map(p => (
                <Card key={p.id} className="group cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-3 flex gap-3 items-center">
                    <div className="h-14 w-14 bg-muted/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{p.image}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{p.type}</p>
                      <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{p.price}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold">Resumo do Pedido</h3>

              {/* Coupon */}
              <div>
                {coupon ? (
                  <div className="flex items-center justify-between bg-success/10 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">{coupon} (-{couponDiscount}%)</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={removeCoupon}>Remover</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="Cupom de desconto" value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponError(false); }} className={`h-9 text-sm ${couponError ? "border-destructive" : ""}`} />
                    <Button variant="outline" size="sm" className="h-9 px-4" onClick={handleApplyCoupon}>Aplicar</Button>
                  </div>
                )}
              </div>

              {/* Shipping */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Truck className="h-4 w-4" /> Calcular frete</p>
                <div className="flex gap-2">
                  <Input placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))} className="h-9 text-sm" maxLength={9} />
                  <Button variant="outline" size="sm" className="h-9 px-4" onClick={handleCalcShipping}>Calcular</Button>
                </div>
                {shippingCalculated && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/50 text-sm">
                    {subtotal >= 500 ? (
                      <p className="text-success font-medium">🎉 Frete grátis!</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>Sedex (3-5 dias)</span><span className="font-semibold">R$ 29,90</span></div>
                        <div className="flex justify-between"><span>PAC (5-8 dias)</span><span className="font-semibold">R$ 19,90</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">R$ {subtotal.toFixed(2)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-success"><span>Desconto ({couponDiscount}%)</span><span className="font-medium">- R$ {discount.toFixed(2)}</span></div>
                )}
                {shipping !== null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="font-medium">{shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}</span></div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</span>
              </div>

              <Link to="/ecommerce/checkout">
                <Button className="w-full h-12 rounded-full text-base gap-2 mt-2" size="lg">
                  Finalizar Compra <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link to="/ecommerce/catalogo" className="block text-center text-sm text-primary hover:underline">
                ← Continuar comprando
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
