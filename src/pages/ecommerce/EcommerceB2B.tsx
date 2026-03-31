import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, TrendingUp, Shield, Users, Package, Truck, FileText, Star, Check, ChevronRight, Upload, RotateCcw, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const iconMap: Record<string, any> = {
  TrendingUp, CreditCard, Package, Users, Truck, RotateCcw, Upload, FileText, Shield, Check, Building2, Star,
};

const defaultBenefits = [
  { icone: "TrendingUp", title: "Até 40% de desconto", desc: "Preços especiais por volume com tabelas progressivas" },
  { icone: "CreditCard", title: "Pagamento faturado", desc: "Condições 30/60/90 dias para empresas aprovadas" },
  { icone: "Package", title: "Pedido mínimo flexível", desc: "MOQ adaptado ao seu porte e necessidade" },
  { icone: "Users", title: "Conta multi-usuário", desc: "Múltiplos colaboradores com permissões por perfil" },
  { icone: "Truck", title: "Logística dedicada", desc: "Entrega programada e fretes negociados" },
  { icone: "RotateCcw", title: "Recompra rápida", desc: "Repita pedidos anteriores com um clique" },
  { icone: "Upload", title: "Upload de lista", desc: "Envie sua lista de compras em Excel ou CSV" },
  { icone: "FileText", title: "Notas fiscais", desc: "Acesso a todas as NF-e direto no portal" },
];

const defaultVolumeTable = [
  { qty: "1–49 un.", discount: "Preço padrão", savings: "—" },
  { qty: "50–199 un.", discount: "-10%", savings: "Economize 10%" },
  { qty: "200–499 un.", discount: "-20%", savings: "Economize 20%" },
  { qty: "500–999 un.", discount: "-30%", savings: "Economize 30%" },
  { qty: "1.000+ un.", discount: "-40%", savings: "Maior desconto" },
];

const defaultSteps = [
  { step: "1", title: "Cadastre-se", desc: "Preencha o formulário com os dados da sua empresa" },
  { step: "2", title: "Aprovação", desc: "Análise em até 24h com confirmação por e-mail" },
  { step: "3", title: "Acesse preços", desc: "Veja preços exclusivos e condições especiais" },
  { step: "4", title: "Compre", desc: "Faça pedidos com pagamento faturado e recompra rápida" },
];

const defaultDepoimentos = [
  { name: "Gráfica Express", segment: "Gráfica", text: "Reduziu custos em 35% com descontos por volume.", avatar: "GE" },
  { name: "Restaurante Sabor", segment: "Alimentação", text: "Entrega programada semanal sem preocupação.", avatar: "RS" },
  { name: "Alves Distribuição", segment: "Distribuidor", text: "Recompra em 1 clique e NF-e sempre disponível.", avatar: "AD" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function EcommerceB2B() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const estId = await getEstabelecimentoId();
      let data: any = null;
      if (estId) {
        const res = await supabase.from("ecommerce_config").select("*").eq("estabelecimento_id", estId).maybeSingle();
        data = res.data;
      }
      if (!data) {
        const res = await supabase.from("ecommerce_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        data = res.data;
      }
      setConfig(data);
    };
    load();
  }, []);

  const d = config || {};
  const badge = d.b2b_badge || "Para Empresas";
  const titulo = d.b2b_titulo || "Programa Atacado & B2B";
  const subtitulo = d.b2b_hero_subtitulo || "Preços exclusivos por volume, pagamento faturado, atendimento dedicado e ferramentas pensadas para operações corporativas de qualquer porte.";
  const btnPrimario = d.b2b_btn_primario || "Solicitar Cadastro B2B";
  const btnSecundario = d.b2b_btn_secundario || "Falar com Consultor";
  const vantagensTitulo = d.b2b_secao_vantagens_titulo || "Vantagens exclusivas para empresas";
  const vantagensSubtitulo = d.b2b_secao_vantagens_subtitulo || "Tudo que você precisa para otimizar suas compras corporativas";
  const benefits = (d.b2b_vantagens && Array.isArray(d.b2b_vantagens) && d.b2b_vantagens.length > 0 && typeof d.b2b_vantagens[0] === "object") ? d.b2b_vantagens : defaultBenefits;
  const volumeTable = d.b2b_volume_table || defaultVolumeTable;
  const steps = d.b2b_como_funciona || defaultSteps;
  const depoimentos = d.b2b_depoimentos || defaultDepoimentos;
  const ctaTitulo = d.b2b_cta_titulo || "Pronto para economizar?";
  const ctaSubtitulo = d.b2b_cta_subtitulo || "Junte-se a mais de 500 empresas que já compram conosco com condições especiais.";
  const ctaBotao = d.b2b_cta_botao || "Criar Conta B2B";
  const formTitulo = d.b2b_form_titulo || "Solicite seu cadastro B2B";
  const formSubtitulo = d.b2b_form_subtitulo || "Preencha os dados abaixo e retornaremos em até 24h";
  const secoes = { hero: true, vantagens: true, volume: true, como_funciona: true, formulario: true, depoimentos: true, cta: true, ...(d.b2b_secoes_visiveis || {}) };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      {secoes.hero && (
        <section className="relative bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 text-background overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-80 h-80 bg-primary rounded-full blur-[100px]" />
          </div>
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="max-w-2xl space-y-6">
              <Badge className="bg-primary/20 text-primary border-0 px-4 py-1.5">{badge}</Badge>
              <h1 className="text-4xl md:text-5xl font-black leading-[1.1]">{titulo}</h1>
              <p className="text-lg text-background/70 leading-relaxed">{subtitulo}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 h-12 text-base shadow-lg shadow-primary/30">
                  {btnPrimario} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full px-8 h-12 text-base">
                  {btnSecundario}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {secoes.vantagens && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">{vantagensTitulo}</h2>
            <p className="text-muted-foreground mt-2">{vantagensSubtitulo}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b: any, i: number) => {
              const Icon = iconMap[b.icone] || Check;
              return (
                <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1">
                    <CardContent className="p-5 space-y-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground">{b.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Volume pricing */}
      {secoes.volume && (
        <section className="bg-muted/30 py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">Tabela de preços por volume</h2>
              <p className="text-muted-foreground mt-2">Quanto mais comprar, mais economiza</p>
            </div>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-6 py-4 text-left text-sm font-semibold">Quantidade</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Desconto</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Economia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volumeTable.map((row: any, i: number) => (
                        <tr key={i} className={`border-b last:border-0 ${i === volumeTable.length - 1 ? "bg-primary/5" : ""}`}>
                          <td className="px-6 py-4 text-sm font-medium">{row.qty}</td>
                          <td className="px-6 py-4">
                            <Badge variant={row.discount === "Preço padrão" ? "secondary" : "default"} className={row.discount !== "Preço padrão" ? "bg-primary text-primary-foreground" : ""}>
                              {row.discount}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{row.savings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* How it works */}
      {secoes.como_funciona && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Como funciona</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s: any, i: number) => (
              <div key={i} className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground text-xl font-black flex items-center justify-center mx-auto">
                  {s.step}
                </div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Registration Form */}
      {secoes.formulario && (
        <section className="bg-muted/30 py-16" id="cadastro">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">{formTitulo}</h2>
              <p className="text-muted-foreground mt-2">{formSubtitulo}</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Razão Social *</Label><Input className="mt-1" /></div>
                  <div><Label>CNPJ *</Label><Input className="mt-1" placeholder="00.000.000/0001-00" /></div>
                  <div><Label>Nome Fantasia</Label><Input className="mt-1" /></div>
                  <div><Label>Inscrição Estadual</Label><Input className="mt-1" /></div>
                  <div><Label>Nome do Responsável *</Label><Input className="mt-1" /></div>
                  <div><Label>Cargo</Label><Input className="mt-1" /></div>
                  <div><Label>E-mail Corporativo *</Label><Input type="email" className="mt-1" /></div>
                  <div><Label>Telefone *</Label><Input className="mt-1" placeholder="(11) 99999-9999" /></div>
                </div>
                <div><Label>Segmento de Atuação</Label><Input className="mt-1" placeholder="Ex: Gráfica, Restaurante, Distribuidor..." /></div>
                <div><Label>Observações</Label><Textarea className="mt-1" rows={3} placeholder="Conte-nos sobre suas necessidades de compra..." /></div>
                <Button className="w-full h-12 rounded-full text-base gap-2" size="lg">
                  <Building2 className="h-4 w-4" /> Enviar Solicitação
                </Button>
                <p className="text-xs text-center text-muted-foreground">Ao enviar, você concorda com nossos Termos de Uso e Política de Privacidade.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {secoes.depoimentos && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Empresas que confiam em nós</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {depoimentos.map((t: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                  <p className="text-sm text-foreground/80 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{t.avatar}</div>
                    <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs text-muted-foreground">{t.segment}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {secoes.cta && (
        <section className="bg-primary text-primary-foreground py-12">
          <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">{ctaTitulo}</h2>
            <p className="text-primary-foreground/80">{ctaSubtitulo}</p>
            <Button variant="secondary" size="lg" className="rounded-full px-8 h-12 text-base gap-2">
              {ctaBotao} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
