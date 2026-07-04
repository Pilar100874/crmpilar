import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, CreditCard, Workflow, Truck, FileText, Megaphone, Settings2, PanelBottom, Home, ToggleLeft, Package, Ticket, Building2, Mail, Flame, AlertOctagon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const configSections = [
  {
    id: "homepage",
    title: "Página Inicial",
    description: "Edite textos, seções, benefícios, depoimentos e newsletter",
    icon: Home,
    url: "/ecommerce-config/homepage",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    id: "branding",
    title: "Identidade Visual",
    description: "Logo, vídeo de fundo, cores e nome da loja",
    icon: Palette,
    url: "/ecommerce-config/branding",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    id: "pagamentos",
    title: "Gateways de Pagamento",
    description: "Configure Stripe, Mercado Pago, PIX e mais",
    icon: CreditCard,
    url: "/config/pagamentos",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    id: "regras",
    title: "Regras do E-commerce",
    description: "Descontos, promoções, frete e banners automáticos",
    icon: Workflow,
    url: "/ecommerce-rules",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "rastreamento",
    title: "Rastreamento de Pedidos",
    description: "Status, notificações WhatsApp/E-mail e página pública",
    icon: Truck,
    url: "/pedido-tracking",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: "conteudos",
    title: "Conteúdos & Páginas",
    description: "Sobre nós, Contato, FAQ, Privacidade, Termos e mais",
    icon: FileText,
    url: "/ecommerce-config/conteudos",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    id: "anuncios",
    title: "Anúncios & Banners",
    description: "Crie banners, popups e promoções visuais para a loja",
    icon: Megaphone,
    url: "/ecommerce-config/anuncios",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: "rodape",
    title: "Rodapé",
    description: "Edite descrição, contato, pagamentos e links do rodapé",
    icon: PanelBottom,
    url: "/ecommerce-config/rodape",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    id: "funcionalidades",
    title: "Funcionalidades",
    description: "Ative ou desative avaliações, favoritos, compartilhar e mais",
    icon: ToggleLeft,
    url: "/ecommerce-config/funcionalidades",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: "volume-pricing",
    title: "Preços por Volume / B2B",
    description: "Configure faixas de desconto para compras em quantidade",
    icon: Package,
    url: "/ecommerce-config/volume-pricing",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "cupons",
    title: "Cupons de Desconto",
    description: "Crie e gerencie cupons promocionais com validade e limites de uso",
    icon: Ticket,
    url: "/ecommerce-config/cupons",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    id: "b2b-editor",
    title: "Página B2B / Atacado",
    description: "Edite textos, vantagens, depoimentos e seções da página B2B",
    icon: Building2,
    url: "/ecommerce-config/b2b",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    id: "newsletter",
    title: "Newsletter",
    description: "Visualize e gerencie os inscritos na newsletter da loja",
    icon: Mail,
    url: "/ecommerce-config/newsletter",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    id: "mapa-calor",
    title: "Mapa de Calor",
    description: "Veja telas mais visitadas, tempo de uso e carrinhos abandonados",
    icon: Flame,
    url: "/ecommerce-config/mapa-calor",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

export default function EcommerceConfigHub() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Configurações do E-commerce
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie todas as configurações da sua loja virtual</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configSections.map((section, i) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group h-full"
              onClick={() => navigate(section.url)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl ${section.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
