import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Lock, CreditCard, Building2, User, MapPin, FileText, Check, ArrowLeft, Tag, Percent } from "lucide-react";
import { useEcommerceRulesEngine } from "@/hooks/useEcommerceRulesEngine";
import { useEcommerceFreteRules } from "@/hooks/useEcommerceFreteRules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STEPS = ["Identificação", "Endereço", "Pagamento", "Confirmação"];

interface TipoPagamento {
  id: string;
  nome: string;
  ativo: boolean;
}

interface CondicaoPagamento {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_pagamento_id: string | null;
  valor_minimo: number | null;
  valor_maximo: number | null;
  ativo: boolean;
}

const formatPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EcommerceCheckout() {
  const { items, couponDiscount, couponFixedDiscount, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState<"pf" | "pj">("pf");
  const [selectedTipoPagamento, setSelectedTipoPagamento] = useState("");
  const [selectedCondicao, setSelectedCondicao] = useState("");
  const [tiposPagamento, setTiposPagamento] = useState<TipoPagamento[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [formData, setFormData] = useState({
    nome: "", email: "", telefone: "", cpf: "",
    cnpj: "", razaoSocial: "", inscricaoEstadual: "", centroCusto: "", observacoes: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  });

  const estId = localStorage.getItem("estabelecimentoId");
  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const { discountActions, loading: rulesLoading } = useEcommerceRulesEngine({ subtotal, totalQuantity });
  const { calcularFrete } = useEcommerceFreteRules();

  // Calculate rule-based discounts (same logic as cart)
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
  const freteResult = calcularFrete(subtotal - discount, formData.cep || "");
  const shipping = freteResult.valor;
  const total = subtotal - discount + shipping;

  useEffect(() => {
    if (!estId) return;
    supabase
      .from("tipos_pagamento")
      .select("id, nome, ativo")
      .eq("estabelecimento_id", estId)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (data) setTiposPagamento(data);
      });

    supabase
      .from("condicoes_pagamento")
      .select("id, nome, descricao, tipo_pagamento_id, valor_minimo, valor_maximo, ativo")
      .eq("estabelecimento_id", estId)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (data) setCondicoesPagamento(data);
      });
  }, [estId]);

  // Filter conditions based on selected payment type and order total
  const filteredCondicoes = condicoesPagamento.filter(c => {
    if (c.tipo_pagamento_id !== selectedTipoPagamento) return false;
    if (c.valor_minimo != null && total < c.valor_minimo) return false;
    if (c.valor_maximo != null && total > c.valor_maximo) return false;
    return true;
  });

  // Reset condição when tipo changes
  useEffect(() => {
    setSelectedCondicao("");
  }, [selectedTipoPagamento]);

  const selectedTipoNome = tiposPagamento.find(t => t.id === selectedTipoPagamento)?.nome || "";
  const selectedCondicaoNome = condicoesPagamento.find(c => c.id === selectedCondicao)?.nome || "";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const estIdValue = estId || "";

      // Insert order
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos_ecommerce")
        .insert({
          estabelecimento_id: estIdValue,
          numero_pedido: "", // auto-generated by trigger
          nome_cliente: formData.nome || formData.razaoSocial || "Cliente",
          email_cliente: formData.email || null,
          telefone_cliente: formData.telefone || null,
          cpf_cliente: customerType === "pf" ? formData.cpf || null : null,
          cnpj_cliente: customerType === "pj" ? formData.cnpj || null : null,
          razao_social: customerType === "pj" ? formData.razaoSocial || null : null,
          tipo_cliente: customerType,
          endereco_cep: formData.cep || null,
          endereco_rua: formData.rua || null,
          endereco_numero: formData.numero || null,
          endereco_complemento: formData.complemento || null,
          endereco_bairro: formData.bairro || null,
          endereco_cidade: formData.cidade || null,
          endereco_estado: formData.estado || null,
          tipo_pagamento_nome: selectedTipoNome || null,
          condicao_pagamento_nome: selectedCondicaoNome || null,
          subtotal,
          desconto: discount,
          frete: shipping,
          valor_total: total,
          observacoes: formData.observacoes || null,
        })
        .select("id, numero_pedido, token_rastreamento")
        .single();

      if (pedidoError) throw pedidoError;

      // Insert order items
      const itensToInsert = items.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.productId || null,
        nome_produto: item.name,
        quantidade: item.quantity,
        preco_unitario: item.price,
        subtotal: item.price * item.quantity,
        foto_url: item.image || null,
      }));

      const { error: itensError } = await supabase
        .from("pedidos_ecommerce_itens")
        .insert(itensToInsert);

      if (itensError) throw itensError;

      // Sincronizar com cadastro de empresas e contatos
      if (estIdValue) {
        try {
          const nomeCliente = formData.nome || formData.razaoSocial || "Cliente";
          const emailCliente = formData.email || "";
          const telefoneCliente = formData.telefone || "";

          // Verificar se contato já existe por email ou telefone
          let customerId: string | null = null;
          if (emailCliente) {
            const { data: existingByEmail } = await supabase
              .from("customers")
              .select("id")
              .eq("estabelecimento_id", estIdValue)
              .ilike("email", emailCliente)
              .maybeSingle();
            if (existingByEmail) customerId = existingByEmail.id;
          }
          if (!customerId && telefoneCliente) {
            const cleanPhone = telefoneCliente.replace(/\D/g, "");
            const { data: existingByPhone } = await supabase
              .from("customers")
              .select("id")
              .eq("estabelecimento_id", estIdValue)
              .filter("telefone", "ilike", `%${cleanPhone.slice(-8)}%`)
              .maybeSingle();
            if (existingByPhone) customerId = existingByPhone.id;
          }

          // Criar contato se não existir
          if (!customerId) {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                estabelecimento_id: estIdValue,
                nome: nomeCliente,
                email: emailCliente,
                telefone: telefoneCliente,
              })
              .select("id")
              .maybeSingle();
            if (newCustomer) customerId = newCustomer.id;
          }

          // Sincronizar com empresa (PJ) 
          if (customerType === "pj" && formData.cnpj) {
            const cleanCnpj = formData.cnpj.replace(/\D/g, "");
            const { data: existingEmpresa } = await supabase
              .from("empresas")
              .select("id")
              .eq("estabelecimento_id", estIdValue)
              .eq("cnpj", cleanCnpj)
              .maybeSingle();

            let empresaId: string | null = existingEmpresa?.id || null;

            if (!empresaId) {
              const { data: newEmpresa } = await supabase
                .from("empresas")
                .insert({
                  estabelecimento_id: estIdValue,
                  nome_fantasia: formData.razaoSocial || nomeCliente,
                  nome: formData.razaoSocial || nomeCliente,
                  cnpj: cleanCnpj,
                  email: emailCliente || null,
                  telefone: telefoneCliente || null,
                  cep: formData.cep || null,
                  endereco: formData.rua ? `${formData.rua}, ${formData.numero}` : null,
                  cidade: formData.cidade || null,
                  estado: formData.estado || null,
                  bairro: formData.bairro || null,
                  tipo_cliente: "B2B",
                  custom_fields: { company_type: "Pessoa Jurídica", inscricao: formData.inscricaoEstadual || "" },
                })
                .select("id")
                .maybeSingle();
              if (newEmpresa) empresaId = newEmpresa.id;
            }

            // Vincular contato à empresa
            if (customerId && empresaId) {
              await supabase
                .from("customers")
                .update({ empresa_id: empresaId })
                .eq("id", customerId);
            }
          } else if (customerType === "pf") {
            // PF - criar como empresa individual (B2C)
            const { data: existingEmpresaPf } = await supabase
              .from("empresas")
              .select("id")
              .eq("estabelecimento_id", estIdValue)
              .eq("nome_fantasia", nomeCliente)
              .eq("tipo_cliente", "B2C")
              .maybeSingle();

            if (!existingEmpresaPf && customerId) {
              const { data: newEmpresaPf } = await supabase
                .from("empresas")
                .insert({
                  estabelecimento_id: estIdValue,
                  nome_fantasia: nomeCliente,
                  nome: nomeCliente,
                  email: emailCliente || null,
                  telefone: telefoneCliente || null,
                  cep: formData.cep || null,
                  endereco: formData.rua ? `${formData.rua}, ${formData.numero}` : null,
                  cidade: formData.cidade || null,
                  estado: formData.estado || null,
                  bairro: formData.bairro || null,
                  tipo_cliente: "B2C",
                  custom_fields: { company_type: "Pessoa Física" },
                })
                .select("id")
                .maybeSingle();

              if (newEmpresaPf) {
                await supabase
                  .from("customers")
                  .update({ empresa_id: newEmpresaPf.id })
                  .eq("id", customerId);
              }
            } else if (existingEmpresaPf && customerId) {
              await supabase
                .from("customers")
                .update({ empresa_id: existingEmpresaPf.id })
                .eq("id", customerId);
            }
          }
        } catch (syncError) {
          console.error("Erro ao sincronizar cadastro:", syncError);
          // Não bloquear o pedido por erro de sync
        }
      }

      // Save order info in localStorage for tracking
      const recentOrders = JSON.parse(localStorage.getItem("ecommerce_orders") || "[]");
      recentOrders.unshift({
        id: pedido.id,
        numero: pedido.numero_pedido,
        token: pedido.token_rastreamento,
        email: formData.email,
        date: new Date().toISOString(),
      });
      localStorage.setItem("ecommerce_orders", JSON.stringify(recentOrders.slice(0, 50)));

      toast.success(`Pedido ${pedido.numero_pedido} realizado com sucesso! 🎉`);
      clearCart();
      navigate(`/ecommerce/conta?tab=pedidos`);
    } catch (err: any) {
      console.error("Erro ao criar pedido:", err);
      toast.error("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
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
                        <div><Label>Telefone *</Label><Input value={formData.telefone} onChange={(e) => updateField("telefone", e.target.value)} className="mt-1" placeholder="(11) 99999-9999" /></div>
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

                  {/* Tipo de Pagamento */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Tipo de Pagamento</Label>
                    {tiposPagamento.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum tipo de pagamento configurado.</p>
                    ) : (
                      <RadioGroup value={selectedTipoPagamento} onValueChange={setSelectedTipoPagamento} className="space-y-2">
                        {tiposPagamento.map(tp => (
                          <label
                            key={tp.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTipoPagamento === tp.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                          >
                            <RadioGroupItem value={tp.id} />
                            <div>
                              <p className="font-semibold text-sm">{tp.nome}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>

                  {/* Condição de Pagamento */}
                  {selectedTipoPagamento && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Condição de Pagamento</Label>
                      {filteredCondicoes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma condição disponível para este tipo de pagamento
                          {total > 0 ? ` e valor de ${formatPrice(total)}` : ""}.
                        </p>
                      ) : (
                        <RadioGroup value={selectedCondicao} onValueChange={setSelectedCondicao} className="space-y-2">
                          {filteredCondicoes.map(cond => (
                            <label
                              key={cond.id}
                              className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCondicao === cond.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                            >
                              <RadioGroupItem value={cond.id} />
                              <div>
                                <p className="font-semibold text-sm">{cond.nome}</p>
                                {cond.descricao && <p className="text-xs text-muted-foreground">{cond.descricao}</p>}
                                {(cond.valor_minimo != null || cond.valor_maximo != null) && (
                                  <p className="text-xs text-muted-foreground">
                                    {cond.valor_minimo != null && `Mín: ${formatPrice(cond.valor_minimo)}`}
                                    {cond.valor_minimo != null && cond.valor_maximo != null && " • "}
                                    {cond.valor_maximo != null && `Máx: ${formatPrice(cond.valor_maximo)}`}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!selectedTipoPagamento || (filteredCondicoes.length > 0 && !selectedCondicao)}
                      className="rounded-full gap-2 px-6"
                    >
                      Revisar Pedido <ChevronRight className="h-4 w-4" />
                    </Button>
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
                      <p className="text-sm font-semibold mb-2">Pagamento</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTipoNome}
                        {selectedCondicaoNome && ` • ${selectedCondicaoNome}`}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm font-semibold mb-2">Itens ({items.length})</p>
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                          <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                    <Button onClick={handleFinish} disabled={isSubmitting} className="rounded-full gap-2 px-8 h-12 text-base bg-success hover:bg-success/90 text-success-foreground">
                      <Lock className="h-4 w-4" /> {isSubmitting ? "Processando..." : "Confirmar e Pagar"}
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
                    <span className="font-medium flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} item(s)</p>}
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-{formatPrice(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? "Grátis" : formatPrice(shipping)}</span></div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="text-xl font-black text-primary">{formatPrice(total)}</span>
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
