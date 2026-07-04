import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export interface TopbarItem {
  icone: string;
  texto: string;
  posicao: "esquerda" | "direita";
}

export interface EcommerceBranding {
  logo_url: string;
  background_video_url: string;
  background_image_url: string;
  background_type: string;
  nome_loja: string;
  slogan: string;
  cor_primaria: string;
  cor_secundaria: string;
  footer_descricao: string;
  footer_telefone: string;
  footer_email: string;
  footer_horario: string;
  footer_copyright: string;
  footer_pagamentos: string[];
  footer_links_extras: { label: string; url: string }[];
  hero_badge: string;
  hero_titulo: string;
  hero_subtitulo: string;
  hero_btn_primario: string;
  hero_btn_secundario: string;
  hero_stat_satisfacao: string;
  beneficios: { icone: string; titulo: string; subtitulo: string }[];
  b2b_badge: string;
  b2b_titulo: string;
  b2b_descricao: string;
  b2b_vantagens: string[];
  depoimentos: { name: string; company: string; text: string; rating: number; avatar: string }[];
  newsletter_titulo: string;
  newsletter_subtitulo: string;
  secoes_visiveis: Record<string, boolean>;
  feat_avaliacoes: boolean;
  feat_favoritos: boolean;
  feat_compartilhar: boolean;
  feat_produtos_relacionados: boolean;
  feat_b2b_card: boolean;
  feat_estoque_visivel: boolean;
  feat_newsletter: boolean;
  feat_rating_estrelas: boolean;
  feat_breadcrumb: boolean;
  feat_zoom_imagem: boolean;
  topbar_ativo: boolean;
  topbar_items: TopbarItem[];
  topbar_telefone: string;
  topbar_link_b2b: boolean;
  modo_catalogo: boolean;
  modo_catalogo_b2c: boolean;
  modo_catalogo_b2b: boolean;
  mostrar_precos_visitante_b2c: boolean;
  mostrar_precos_visitante_b2b: boolean;
  feat_webchat: boolean;
  feat_whatsapp: boolean;
}

const defaults: EcommerceBranding = {
  logo_url: "",
  background_video_url: "",
  background_image_url: "",
  background_type: "gradient",
  nome_loja: "Minha Loja",
  slogan: "",
  cor_primaria: "#000000",
  cor_secundaria: "#ffffff",
  footer_descricao: "",
  footer_telefone: "",
  footer_email: "",
  footer_horario: "",
  footer_copyright: "",
  footer_pagamentos: ["Visa", "Master", "Pix", "Boleto"],
  footer_links_extras: [],
  hero_badge: "🔥 Ofertas especiais esta semana",
  hero_titulo: "",
  hero_subtitulo: "",
  hero_btn_primario: "Comprar Agora",
  hero_btn_secundario: "Atacado / B2B",
  hero_stat_satisfacao: "98%",
  beneficios: [
    { icone: "truck", titulo: "Frete grátis acima de R$ 500", subtitulo: "Para todo o Brasil" },
    { icone: "shield", titulo: "Compra segura", subtitulo: "Dados protegidos" },
    { icone: "rotate", titulo: "Troca facilitada", subtitulo: "Até 30 dias" },
    { icone: "headphones", titulo: "Suporte dedicado", subtitulo: "Atendimento rápido" },
  ],
  b2b_badge: "Para Empresas",
  b2b_titulo: "Compre no atacado com condições exclusivas",
  b2b_descricao: "",
  b2b_vantagens: ["Até 40% de desconto", "Pedido mínimo flexível", "Conta multi-usuário", "Pagamento faturado"],
  depoimentos: [
    { name: "Carlos Silva", company: "Gráfica Express", text: "Fornecedor confiável há 3 anos.", rating: 5, avatar: "CS" },
    { name: "Ana Mendes", company: "Restaurante Sabor & Arte", text: "Ótimos preços em descartáveis.", rating: 5, avatar: "AM" },
    { name: "Roberto Alves", company: "Alves Distribuição", text: "O programa B2B é excelente.", rating: 5, avatar: "RA" },
  ],
  newsletter_titulo: "Receba ofertas exclusivas",
  newsletter_subtitulo: "Cadastre-se e ganhe 10% de desconto na primeira compra",
  secoes_visiveis: { hero: true, beneficios: true, categorias: true, produtos: true, b2b: true, depoimentos: true, newsletter: true },
  feat_avaliacoes: true,
  feat_favoritos: true,
  feat_compartilhar: true,
  feat_produtos_relacionados: true,
  feat_b2b_card: true,
  feat_estoque_visivel: true,
  feat_newsletter: true,
  feat_rating_estrelas: true,
  feat_breadcrumb: true,
  feat_zoom_imagem: true,
  topbar_ativo: true,
  topbar_items: [
    { icone: "truck", texto: "Frete grátis acima de R$ 500", posicao: "esquerda" },
    { icone: "shield", texto: "Compra 100% segura", posicao: "esquerda" },
    { icone: "rotate-ccw", texto: "Troca facilitada", posicao: "esquerda" },
  ],
  topbar_telefone: "(11) 4002-8922",
  topbar_link_b2b: true,
  modo_catalogo: false,
  modo_catalogo_b2c: false,
  modo_catalogo_b2b: false,
  mostrar_precos_visitante_b2c: true,
  mostrar_precos_visitante_b2b: true,
  feat_webchat: false,
  feat_whatsapp: false,
};

export function useEcommerceBranding() {
  const [branding, setBranding] = useState<EcommerceBranding>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const estId = await getEstabelecimentoId();
      let data: any = null;

      // Try with estabelecimento_id first
      if (estId) {
        const res = await supabase.from("ecommerce_config").select("*").eq("estabelecimento_id", estId).maybeSingle();
        data = res.data;
      }

      // Fallback: get most recent config if no match
      if (!data) {
        const res = await supabase.from("ecommerce_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        data = res.data;
      }
      if (data) {
        const d = data as any;
        setBranding({
          logo_url: d.logo_url || "",
          background_video_url: d.background_video_url || "",
          background_image_url: d.background_image_url || "",
          background_type: d.background_type || "gradient",
          nome_loja: d.nome_loja || "Minha Loja",
          slogan: d.slogan || "",
          cor_primaria: d.cor_primaria || "#000000",
          cor_secundaria: d.cor_secundaria || "#ffffff",
          footer_descricao: d.footer_descricao || "",
          footer_telefone: d.footer_telefone || "",
          footer_email: d.footer_email || "",
          footer_horario: d.footer_horario || "",
          footer_copyright: d.footer_copyright || "",
          footer_pagamentos: d.footer_pagamentos || defaults.footer_pagamentos,
          footer_links_extras: d.footer_links_extras || [],
          hero_badge: d.hero_badge || defaults.hero_badge,
          hero_titulo: d.hero_titulo || "",
          hero_subtitulo: d.hero_subtitulo || "",
          hero_btn_primario: d.hero_btn_primario || defaults.hero_btn_primario,
          hero_btn_secundario: d.hero_btn_secundario || defaults.hero_btn_secundario,
          hero_stat_satisfacao: d.hero_stat_satisfacao || defaults.hero_stat_satisfacao,
          beneficios: d.beneficios || defaults.beneficios,
          b2b_badge: d.b2b_badge || defaults.b2b_badge,
          b2b_titulo: d.b2b_titulo || defaults.b2b_titulo,
          b2b_descricao: d.b2b_descricao || "",
          b2b_vantagens: d.b2b_vantagens || defaults.b2b_vantagens,
          depoimentos: d.depoimentos?.length > 0 ? d.depoimentos : defaults.depoimentos,
          newsletter_titulo: d.newsletter_titulo || defaults.newsletter_titulo,
          newsletter_subtitulo: d.newsletter_subtitulo || defaults.newsletter_subtitulo,
          secoes_visiveis: d.secoes_visiveis || defaults.secoes_visiveis,
          feat_avaliacoes: d.feat_avaliacoes ?? true,
          feat_favoritos: d.feat_favoritos ?? true,
          feat_compartilhar: d.feat_compartilhar ?? true,
          feat_produtos_relacionados: d.feat_produtos_relacionados ?? true,
          feat_b2b_card: d.feat_b2b_card ?? true,
          feat_estoque_visivel: d.feat_estoque_visivel ?? true,
          feat_newsletter: d.feat_newsletter ?? true,
          feat_rating_estrelas: d.feat_rating_estrelas ?? true,
          feat_breadcrumb: d.feat_breadcrumb ?? true,
          feat_zoom_imagem: d.feat_zoom_imagem ?? true,
          topbar_ativo: d.topbar_ativo ?? true,
          topbar_items: d.topbar_items || defaults.topbar_items,
          topbar_telefone: d.topbar_telefone || defaults.topbar_telefone,
          topbar_link_b2b: d.topbar_link_b2b ?? true,
          modo_catalogo: d.modo_catalogo ?? false,
          modo_catalogo_b2c: d.modo_catalogo_b2c ?? d.modo_catalogo ?? false,
          modo_catalogo_b2b: d.modo_catalogo_b2b ?? d.modo_catalogo ?? false,
          mostrar_precos_visitante_b2c: d.mostrar_precos_visitante_b2c ?? true,
          mostrar_precos_visitante_b2b: d.mostrar_precos_visitante_b2b ?? true,
          feat_webchat: d.feat_webchat ?? false,
          feat_whatsapp: d.feat_whatsapp ?? false,
          denuncias_enabled: d.denuncias_enabled ?? false,
          lgpd_enabled: d.lgpd_enabled ?? false,
        } as any);
      }
      setLoading(false);
    };
    load();
  }, []);

  return { branding, loading };
}
