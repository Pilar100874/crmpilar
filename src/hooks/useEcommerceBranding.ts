import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcommerceBranding {
  logo_url: string;
  background_video_url: string;
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
}

const defaults: EcommerceBranding = {
  logo_url: "",
  background_video_url: "",
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
};

export function useEcommerceBranding() {
  const [branding, setBranding] = useState<EcommerceBranding>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) { setLoading(false); return; }
      const { data } = await supabase
        .from("ecommerce_config")
        .select("*")
        .eq("estabelecimento_id", estId)
        .maybeSingle();
      if (data) {
        setBranding({
          logo_url: data.logo_url || "",
          background_video_url: data.background_video_url || "",
          background_type: data.background_type || "gradient",
          nome_loja: data.nome_loja || "Minha Loja",
          slogan: data.slogan || "",
          cor_primaria: data.cor_primaria || "#000000",
          cor_secundaria: data.cor_secundaria || "#ffffff",
          footer_descricao: (data as any).footer_descricao || "",
          footer_telefone: (data as any).footer_telefone || "",
          footer_email: (data as any).footer_email || "",
          footer_horario: (data as any).footer_horario || "",
          footer_copyright: (data as any).footer_copyright || "",
          footer_pagamentos: (data as any).footer_pagamentos || defaults.footer_pagamentos,
          footer_links_extras: (data as any).footer_links_extras || [],
          hero_badge: (data as any).hero_badge || defaults.hero_badge,
          hero_titulo: (data as any).hero_titulo || "",
          hero_subtitulo: (data as any).hero_subtitulo || "",
          hero_btn_primario: (data as any).hero_btn_primario || defaults.hero_btn_primario,
          hero_btn_secundario: (data as any).hero_btn_secundario || defaults.hero_btn_secundario,
          hero_stat_satisfacao: (data as any).hero_stat_satisfacao || defaults.hero_stat_satisfacao,
          beneficios: (data as any).beneficios || defaults.beneficios,
          b2b_badge: (data as any).b2b_badge || defaults.b2b_badge,
          b2b_titulo: (data as any).b2b_titulo || defaults.b2b_titulo,
          b2b_descricao: (data as any).b2b_descricao || "",
          b2b_vantagens: (data as any).b2b_vantagens || defaults.b2b_vantagens,
          depoimentos: (data as any).depoimentos || defaults.depoimentos,
          newsletter_titulo: (data as any).newsletter_titulo || defaults.newsletter_titulo,
          newsletter_subtitulo: (data as any).newsletter_subtitulo || defaults.newsletter_subtitulo,
          secoes_visiveis: (data as any).secoes_visiveis || defaults.secoes_visiveis,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  return { branding, loading };
}
