import { Link } from "react-router-dom";
import { ChevronRight, MapPin, Phone, Mail, Clock, MessageSquare, Shield, Truck, RotateCcw, ChevronDown, Building2, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqItems = [
  { q: "Qual o prazo de entrega?", a: "O prazo varia de 3 a 7 dias úteis dependendo da sua localidade. Para compras acima de R$ 500, o frete é gratuito." },
  { q: "Como faço para trocar ou devolver um produto?", a: "Você tem até 30 dias para solicitar a troca ou devolução. Entre em contato pelo nosso chat ou e-mail com o número do pedido." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos PIX, cartão de crédito (até 12x sem juros), boleto bancário e, para clientes B2B aprovados, pagamento faturado." },
  { q: "Como funciona o programa B2B?", a: "Empresas podem se cadastrar para acessar preços por volume, pagamento faturado e atendimento dedicado. A aprovação leva até 24h." },
  { q: "Posso rastrear meu pedido?", a: "Sim! Após o envio, você receberá o código de rastreamento por e-mail e poderá acompanhar na área 'Meus Pedidos'." },
  { q: "Vocês emitem nota fiscal?", a: "Sim, todas as compras geram NF-e automaticamente, disponível para download na sua conta." },
];

export default function EcommerceInstitutional({ page }: { page: "sobre" | "contato" | "faq" | "entrega" | "trocas" | "privacidade" | "termos" }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link to="/ecommerce" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          {page === "sobre" && "Sobre Nós"}
          {page === "contato" && "Contato"}
          {page === "faq" && "FAQ"}
          {page === "entrega" && "Política de Entrega"}
          {page === "trocas" && "Trocas e Devoluções"}
          {page === "privacidade" && "Política de Privacidade"}
          {page === "termos" && "Termos de Uso"}
        </span>
      </nav>

      {/* About */}
      {page === "sobre" && (
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-black">Sobre a STORE</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Há mais de 15 anos no mercado, somos referência em papéis, embalagens e soluções para empresas de todos os portes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Building2, title: "Estrutura Sólida", desc: "Centro de distribuição de 5.000m² com estoque para pronta-entrega" },
              { icon: Users, title: "2.400+ Clientes", desc: "Empresas de diversos segmentos confiam em nosso trabalho" },
              { icon: Heart, title: "98% Satisfação", desc: "Compromisso com qualidade, preço justo e atendimento humanizado" },
            ].map((item, i) => (
              <Card key={i}><CardContent className="p-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto"><item.icon className="h-6 w-6 text-primary" /></div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent></Card>
            ))}
          </div>
          <div className="prose prose-sm max-w-none text-foreground/80">
            <p>Nossa missão é simplificar a cadeia de suprimentos para empresas, oferecendo um catálogo completo com mais de 5.000 produtos, preços competitivos e logística eficiente.</p>
            <p>Trabalhamos com as melhores marcas do mercado e oferecemos condições exclusivas para compras em volume através do nosso programa B2B.</p>
          </div>
        </div>
      )}

      {/* Contact */}
      {page === "contato" && (
        <div className="space-y-8">
          <h1 className="text-3xl font-black text-center">Fale Conosco</h1>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Phone, title: "(11) 4002-8922", sub: "Seg-Sex 8h-18h" },
              { icon: Mail, title: "contato@store.com.br", sub: "Respondemos em até 24h" },
              { icon: MapPin, title: "São Paulo, SP", sub: "Av. Paulista, 1000" },
            ].map((c, i) => (
              <Card key={i}><CardContent className="p-5 text-center space-y-2">
                <c.icon className="h-6 w-6 text-primary mx-auto" />
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold">Envie sua mensagem</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input className="mt-1" /></div>
              <div><Label>E-mail *</Label><Input type="email" className="mt-1" /></div>
              <div><Label>Telefone</Label><Input className="mt-1" /></div>
              <div><Label>Assunto</Label><Input className="mt-1" /></div>
            </div>
            <div><Label>Mensagem *</Label><Textarea className="mt-1" rows={5} /></div>
            <Button className="rounded-full px-8 gap-2"><MessageSquare className="h-4 w-4" /> Enviar</Button>
          </CardContent></Card>
        </div>
      )}

      {/* FAQ */}
      {page === "faq" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-center">Perguntas Frequentes</h1>
          <p className="text-center text-muted-foreground">Encontre respostas para as dúvidas mais comuns</p>
          <Accordion type="single" collapsible className="space-y-2">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Delivery Policy */}
      {page === "entrega" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-center">Política de Entrega</h1>
          <Card><CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
            <h3>Prazo de entrega</h3>
            <p>O prazo de entrega varia de acordo com a localidade e a modalidade de frete escolhida. Após a confirmação do pagamento, os pedidos são processados em até 1 dia útil.</p>
            <ul>
              <li><strong>Sedex:</strong> 3 a 5 dias úteis</li>
              <li><strong>PAC:</strong> 5 a 8 dias úteis</li>
              <li><strong>Transportadora:</strong> 5 a 10 dias úteis (pedidos acima de 50kg)</li>
            </ul>
            <h3>Frete grátis</h3>
            <p>Compras acima de R$ 500,00 possuem frete grátis para todo o Brasil via PAC.</p>
            <h3>Rastreamento</h3>
            <p>Após o despacho, o código de rastreamento é enviado automaticamente por e-mail.</p>
          </CardContent></Card>
        </div>
      )}

      {/* Returns */}
      {page === "trocas" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-center">Trocas e Devoluções</h1>
          <Card><CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
            <h3>Prazo para solicitação</h3>
            <p>O cliente tem até 30 dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.</p>
            <h3>Condições</h3>
            <ul>
              <li>O produto deve estar na embalagem original, sem sinais de uso</li>
              <li>Incluir nota fiscal do pedido</li>
              <li>Produtos danificados no transporte devem ser reportados em até 48h</li>
            </ul>
            <h3>Como solicitar</h3>
            <p>Entre em contato pelo e-mail contato@store.com.br ou pelo chat com o número do pedido. O frete de devolução é por nossa conta em caso de defeito.</p>
          </CardContent></Card>
        </div>
      )}

      {/* Privacy */}
      {page === "privacidade" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-center">Política de Privacidade</h1>
          <Card><CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
            <p>Esta Política de Privacidade descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
            <h3>Dados coletados</h3>
            <p>Coletamos dados necessários para a realização de compras: nome, CPF/CNPJ, e-mail, telefone, endereço de entrega e dados de pagamento.</p>
            <h3>Uso dos dados</h3>
            <p>Seus dados são utilizados exclusivamente para processamento de pedidos, comunicação sobre entregas, atendimento ao cliente e, mediante consentimento, envio de ofertas personalizadas.</p>
            <h3>Seus direitos</h3>
            <p>Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados a qualquer momento pelo e-mail privacidade@store.com.br.</p>
          </CardContent></Card>
        </div>
      )}

      {/* Terms */}
      {page === "termos" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-center">Termos de Uso</h1>
          <Card><CardContent className="p-6 prose prose-sm max-w-none text-foreground/80">
            <p>Ao acessar e utilizar este site, você concorda com os termos e condições aqui descritos.</p>
            <h3>Cadastro</h3>
            <p>O usuário é responsável pela veracidade das informações fornecidas no cadastro e pela segurança de suas credenciais de acesso.</p>
            <h3>Compras</h3>
            <p>Os preços e condições exibidos no site são válidos enquanto estiverem publicados. A confirmação do pedido está sujeita à disponibilidade de estoque e aprovação do pagamento.</p>
            <h3>Propriedade intelectual</h3>
            <p>Todo o conteúdo do site (textos, imagens, marcas) é de propriedade da STORE e não pode ser reproduzido sem autorização prévia.</p>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
