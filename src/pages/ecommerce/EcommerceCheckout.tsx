import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Lock, CreditCard, Building2, User, MapPin, FileText, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STEPS = ["Identificação", "Endereço", "Pagamento", "Confirmação"];

export default function EcommerceCheckout() {
  const { items, couponDiscount, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState<"pf" | "pj">("pf");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [formData, setFormData] = useState({
    nome: "", email: "", telefone: "", cpf: "",
    cnpj: "", razaoSocial: "", inscricaoEstadual: "", centroCusto: "", observacoes: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  });

  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const subtotal = items.length * 24.90;
  const discount = couponDiscount > 0 ? (subtotal * couponDiscount / 100) : 0;
  const shipping = subtotal >= 500 ? 0 : 29.90;
  const total = subtotal - discount + shipping;

  const handleFinish = () => {
    toast.success("Pedido realizado com sucesso! 🎉");
    clearCart();
    navigate("/ecommerce");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Seu carrinho está vazio</h2>
        <Link to="/ecommerce/catalogo"><Button className="mt-4 rounded-full">Ver Produtos</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/ecommerce/carrinho" className="hover:text-primary">Carrinho</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Checkout</span>
      </nav>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${i < step ? "bg-success text-success-foreground" : ""}`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : <span className="w-5 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-success" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            {/* Step 0: Identification */}
            {step === 0 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Identificação</h2>
                  </div>

                  <Tabs value={customerType} onValueChange={(v) => setCustomerType(v as "pf" | "pj")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="pf" className="flex-1 gap-2"><User className="h-4 w-4" /> Pessoa Física</TabsTrigger>
                      <TabsTrigger value="pj" className="flex-1 gap-2"><Building2 className="h-4 w-4" /> Pessoa Jurídica</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pf" className="space-y-4 mt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><Label>Nome completo *</Label><Input value={formData.nome} onChange={(e) => updateField("nome", e.target.value)} className="mt-1" /></div>
                        <div><Label>CPF *</Label><Input value={formData.cpf} onChange={(e) => updateField("cpf", e.target.value)} className="mt-1" placeholder="000.000.000-00" /></div>
                        <div><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1" /></div>
                        <div><Label>Telefone *</Label><Input value={formData.telefone} onChange={(e) => updateField("telefone", e.target.value)} className="mt-1" placeholder="(11) 99999-9999" /></div>
                      </div>
                    </TabsContent>
                    <TabsContent value="pj" className="space-y-4 mt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><Label>Razão Social *</Label><Input value={formData.razaoSocial} onChange={(e) => updateField("razaoSocial", e.target.value)} className="mt-1" /></div>
                        <div><Label>CNPJ *</Label><Input value={formData.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} className="mt-1" placeholder="00.000.000/0001-00" /></div>
                        <div><Label>Inscrição Estadual</Label><Input value={formData.inscricaoEstadual} onChange={(e) => updateField("inscricaoEstadual", e.target.value)} className="mt-1" /></div>
                        <div><Label>Nome do Responsável *</Label><Input value={formData.nome} onChange={(e) => updateField("nome", e.target.value)} className="mt-1" /></div>
                        <div><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1" /></div>
                        <div><Label>Telefone *</Label><Input value={formData.telefone} onChange={(e) => updateField("telefone", e.target.value)} className="mt-1" /></div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><Label>Centro de Custo</Label><Input value={formData.centroCusto} onChange={(e) => updateField("centroCusto", e.target.value)} className="mt-1" /></div>
                      </div>
                      <div><Label>Observações do Pedido</Label><Textarea value={formData.observacoes} onChange={(e) => updateField("observacoes", e.target.value)} className="mt-1" rows={3} /></div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end">
                    <Button onClick={() => setStep(1)} className="rounded-full gap-2 px-6">Continuar <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Address */}
            {step === 1 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Endereço de Entrega</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>CEP *</Label><Input value={formData.cep} onChange={(e) => updateField("cep", e.target.value)} className="mt-1" placeholder="00000-000" /></div>
                    <div />
                    <div className="sm:col-span-2"><Label>Rua *</Label><Input value={formData.rua} onChange={(e) => updateField("rua", e.target.value)} className="mt-1" /></div>
                    <div><Label>Número *</Label><Input value={formData.numero} onChange={(e) => updateField("numero", e.target.value)} className="mt-1" /></div>
                    <div><Label>Complemento</Label><Input value={formData.complemento} onChange={(e) => updateField("complemento", e.target.value)} className="mt-1" /></div>
                    <div><Label>Bairro *</Label><Input value={formData.bairro} onChange={(e) => updateField("bairro", e.target.value)} className="mt-1" /></div>
                    <div><Label>Cidade *</Label><Input value={formData.cidade} onChange={(e) => updateField("cidade", e.target.value)} className="mt-1" /></div>
                    <div><Label>Estado *</Label><Input value={formData.estado} onChange={(e) => updateField("estado", e.target.value)} className="mt-1" maxLength={2} /></div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(0)} className="rounded-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                    <Button onClick={() => setStep(2)} className="rounded-full gap-2 px-6">Continuar <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Forma de Pagamento</h2>
                  </div>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    {[
                      { value: "pix", label: "PIX", desc: "Aprovação imediata • 5% de desconto", icon: "💠" },
                      { value: "cartao", label: "Cartão de Crédito", desc: "Até 12x sem juros", icon: "💳" },
                      { value: "boleto", label: "Boleto Bancário", desc: "Vencimento em 3 dias úteis", icon: "📄" },
                      ...(customerType === "pj" ? [{ value: "faturado", label: "Pagamento Faturado", desc: "30/60/90 dias (sujeito a aprovação)", icon: "🏦" }] : []),
                    ].map(pm => (
                      <label key={pm.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === pm.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value={pm.value} />
                        <span className="text-2xl">{pm.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{pm.label}</p>
                          <p className="text-xs text-muted-foreground">{pm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  {paymentMethod === "cartao" && (
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="sm:col-span-2"><Label>Número do Cartão</Label><Input className="mt-1" placeholder="0000 0000 0000 0000" /></div>
                      <div><Label>Validade</Label><Input className="mt-1" placeholder="MM/AA" /></div>
                      <div><Label>CVV</Label><Input className="mt-1" placeholder="000" maxLength={4} /></div>
                      <div className="sm:col-span-2"><Label>Nome no Cartão</Label><Input className="mt-1" /></div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                    <Button onClick={() => setStep(3)} className="rounded-full gap-2 px-6">Revisar Pedido <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Confirmar Pedido</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm font-semibold mb-2">Dados do Cliente</p>
                      <p className="text-sm text-muted-foreground">{formData.nome || "—"} • {formData.email || "—"}</p>
                      {customerType === "pj" && <p className="text-sm text-muted-foreground">CNPJ: {formData.cnpj || "—"} • {formData.razaoSocial || "—"}</p>}
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm font-semibold mb-2">Endereço</p>
                      <p className="text-sm text-muted-foreground">{formData.rua || "—"}, {formData.numero || "—"} {formData.complemento && `- ${formData.complemento}`}</p>
                      <p className="text-sm text-muted-foreground">{formData.bairro || "—"} • {formData.cidade || "—"}/{formData.estado || "—"} • CEP: {formData.cep || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm font-semibold mb-2">Itens ({items.length})</p>
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                          <span className="font-medium">R$ {(24.90 * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                    <Button onClick={handleFinish} className="rounded-full gap-2 px-8 h-12 text-base bg-success hover:bg-success/90 text-success-foreground">
                      <Lock className="h-4 w-4" /> Confirmar e Pagar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Order summary sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold">Resumo</h3>
              <div className="space-y-2 text-sm">
                {items.slice(0, 3).map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-muted-foreground truncate mr-2">{item.quantity}x {item.name}</span>
                    <span className="font-medium flex-shrink-0">R$ {(24.90 * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} item(s)</p>}
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-R$ {discount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}</span></div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="text-xl font-black text-primary">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center pt-2">
                <Lock className="h-3 w-3" /> Compra 100% segura
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
