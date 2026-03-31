import { useState, useEffect } from "react";
import { useEcommerceFreteRules } from "@/hooks/useEcommerceFreteRules";
import { useEcommerceRulesEngine } from "@/hooks/useEcommerceRulesEngine";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart, Tag, ChevronRight, ArrowRight, Package, Truck, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveProductPricesBatch } from "@/hooks/useProductPrice";
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
  const { items, removeItem, updateQuantity, clearCart, coupon, applyCoupon, removeCoupon, couponDiscount, couponFixedDiscount } = useCart();
  const { calcularFrete } = useEcommerceFreteRules();

  const rawSubtotal = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const rawTotalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const { discountActions, paymentActions, loading: rulesLoading } = useEcommerceRulesEngine({ subtotal: rawSubtotal, totalQuantity: rawTotalQty });
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState(false);
  const [cep, setCep] = useState("");
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const [crossSellProducts, setCrossSellProducts] = useState<CrossSellProduct[]>([]);

  useEffect(() => {
    const loadCrossSell = async () => {
      const estabId = localStorage.getItem("estabelecimentoId");
      let query = supabase
        .from("produtos")
        .select("id, nome, foto_url, preco_minimo, preco_tabela, tipo_preco, categoria_id, categoria:produto_categorias(nome)")
        .eq("ativo", true)
        .limit(6);
      if (estabId) query = query.eq("estabelecimento_id", estabId);

      const { data } = await query;
      if (data) {
        const priceMap = await resolveProductPricesBatch(data as any[]);
        const cartIds = new Set(items.map(i => i.id));
        const filtered = data.filter((p: any) => !cartIds.has(p.id)).slice(0, 3);
        setCrossSellProducts(filtered.map((p: any) => {
          const resolved = priceMap.get(p.id);
          const preco = resolved?.precoMinimo ?? resolved?.precoTabela ?? 0;
          return {
            id: p.id,
            name: p.nome || "Produto",
            type: (p.categoria as any)?.nome || "",
            price: `R$ ${preco.toFixed(2).replace(".", ",")}`,
            image: p.foto_url || "",
          };
        }));
      }
    };
    if (items.length > 0) loadCrossSell();
  }, [items]);

  const handleApplyCoupon = async () => {
    const result = await applyCoupon(couponInput);
    if (result) {
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

  const subtotal = rawSubtotal;
  const totalQuantity = rawTotalQty;

  // Calculate rule-based discounts (stacking: all matching discounts are summed)
  let ruleDiscount = 0;
  const ruleDiscountLabels: { label: string; value: number }[] = [];
  for (const action of discountActions) {
    if (action.type === "acao_desconto_percentual") {
      const pct = action.config.percentual || 0;
      const val = subtotal * pct / 100;
      ruleDiscount += val;
      ruleDiscountLabels.push({ label: `Desconto ${pct}% (${action.ruleName})`, value: val });
    } else if (action.type === "acao_desconto_fixo") {
      const valor = action.config.valor || 0;
      ruleDiscount += valor;
      ruleDiscountLabels.push({ label: `Desconto R$ ${valor.toFixed(2)} (${action.ruleName})`, value: valor });
    } else if (action.type === "acao_desconto_progressivo") {
      const faixas = action.config.faixas || [];
      const sorted = [...faixas].sort((a: any, b: any) => (b.quantidade || 0) - (a.quantidade || 0));
      for (const faixa of sorted) {
        if (totalQuantity >= (faixa.quantidade || 0)) {
          const pct = faixa.percentual || 0;
          const val = subtotal * pct / 100;
          ruleDiscount += val;
          ruleDiscountLabels.push({ label: `Progressivo ${pct}% (${action.ruleName})`, value: val });
          break;
        }
      }
    }
  }

  const couponDiscountValue = (couponDiscount > 0 ? ((subtotal - ruleDiscount) * couponDiscount / 100) : 0) + (couponFixedDiscount || 0);
  const discount = ruleDiscount + couponDiscountValue;
  const freteResult = shippingCalculated ? calcularFrete(subtotal - discount, cep) : null;
  const shipping = freteResult?.valor ?? null;
  const shippingDescription = freteResult?.descricao || "";
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
                        <p className="text-base font-bold text-foreground">R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}</p>
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
          {crossSellProducts.length > 0 && (
            <div className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Você também pode gostar</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {crossSellProducts.map(p => (
                  <Link key={p.id} to={`/ecommerce/produto/${p.id}`}>
                    <Card className="group cursor-pointer hover:shadow-md transition-all">
                      <CardContent className="p-3 flex gap-3 items-center">
                        <div className="h-14 w-14 bg-muted/30 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover rounded-xl" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{p.type}</p>
                          <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                          <p className="text-sm font-bold text-primary mt-0.5">{p.price}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
                {shippingCalculated && freteResult && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/50 text-sm">
                    {freteResult.valor === 0 ? (
                      <p className="text-success font-medium">{freteResult.descricao}</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>{freteResult.descricao}</span>
                          <span className="font-semibold">R$ {freteResult.valor.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">R$ {subtotal.toFixed(2)}</span></div>
                {ruleDiscountLabels.map((rd, idx) => (
                  <div key={idx} className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> {rd.label}</span>
                    <span className="font-medium">- R$ {rd.value.toFixed(2)}</span>
                  </div>
                ))}
                {couponDiscountValue > 0 && (
                  <div className="flex justify-between text-success"><span>Cupom {coupon} (-{couponDiscount}%)</span><span className="font-medium">- R$ {couponDiscountValue.toFixed(2)}</span></div>
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
