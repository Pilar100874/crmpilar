import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MapPin, Phone, Mail, Clock, MessageSquare, Shield, Truck, RotateCcw, Building2, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ContentData {
  conteudo_html: string;
  dados_json: Record<string, any>;
}

const defaultFaq = [
  { q: "Qual o prazo de entrega?", a: "O prazo varia de 3 a 7 dias úteis dependendo da sua localidade." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos PIX, cartão de crédito, boleto bancário e pagamento faturado para B2B." },
];

const pageTitles: Record<string, string> = {
  sobre: "Sobre Nós",
  contato: "Contato",
  faq: "FAQ",
  entrega: "Política de Entrega",
  trocas: "Trocas e Devoluções",
  privacidade: "Política de Privacidade",
  termos: "Termos de Uso",
};

export default function EcommerceInstitutional({ page }: { page: "sobre" | "contato" | "faq" | "entrega" | "trocas" | "privacidade" | "termos" }) {
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) { setLoading(false); return; }
      const { data } = await supabase
        .from("ecommerce_conteudos")
        .select("conteudo_html, dados_json")
        .eq("estabelecimento_id", estId)
        .eq("tipo", page)
        .maybeSingle();
      if (data) {
        setContent({
          conteudo_html: data.conteudo_html || "",
          dados_json: (data.dados_json as Record<string, any>) || {},
        });
      } else {
        setContent(null);
      }
      setLoading(false);
    };
    load();
  }, [page]);

  const faqItems = content?.dados_json?.faq_items && Array.isArray(content.dados_json.faq_items) && content.dados_json.faq_items.length > 0
    ? content.dados_json.faq_items
    : defaultFaq;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link to="/ecommerce" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{pageTitles[page]}</span>
      </nav>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {/* Pages with HTML content: sobre, entrega, trocas, privacidade, termos */}
          {["sobre", "entrega", "trocas", "privacidade", "termos"].includes(page) && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-center">{pageTitles[page]}</h1>
              {content?.conteudo_html ? (
                <Card>
                  <CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
                    <div dangerouslySetInnerHTML={{ __html: content.conteudo_html }} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <p>Conteúdo ainda não configurado.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Contact */}
          {page === "contato" && (
            <div className="space-y-8">
              <h1 className="text-3xl font-black text-center">Fale Conosco</h1>
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Phone, title: content?.dados_json?.telefone || "(00) 0000-0000", sub: "Seg-Sex 8h-18h" },
                  { icon: Mail, title: content?.dados_json?.email || "contato@loja.com", sub: "Respondemos em até 24h" },
                  { icon: MapPin, title: content?.dados_json?.endereco || "Endereço não configurado", sub: "" },
                ].map((c, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 text-center space-y-2">
                      <c.icon className="h-6 w-6 text-primary mx-auto" />
                      <p className="font-semibold text-sm">{c.title}</p>
                      {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {content?.conteudo_html && (
                <Card>
                  <CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
                    <div dangerouslySetInnerHTML={{ __html: content.conteudo_html }} />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-bold">Envie sua mensagem</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Nome *</Label><Input className="mt-1" /></div>
                    <div><Label>E-mail *</Label><Input type="email" className="mt-1" /></div>
                    <div><Label>Telefone</Label><Input className="mt-1" /></div>
                    <div><Label>Assunto</Label><Input className="mt-1" /></div>
                  </div>
                  <div><Label>Mensagem *</Label><Textarea className="mt-1" rows={5} /></div>
                  <Button className="rounded-full px-8 gap-2"><MessageSquare className="h-4 w-4" /> Enviar</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FAQ */}
          {page === "faq" && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-center">Perguntas Frequentes</h1>
              {content?.conteudo_html && (
                <div className="prose prose-sm max-w-none text-center text-muted-foreground mb-4">
                  <div dangerouslySetInnerHTML={{ __html: content.conteudo_html }} />
                </div>
              )}
              <Accordion type="single" collapsible className="space-y-2">
                {faqItems.map((item: any, i: number) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </>
      )}
    </div>
  );
}
