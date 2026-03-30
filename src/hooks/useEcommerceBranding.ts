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
          footer_pagamentos: (data as any).footer_pagamentos || ["Visa", "Master", "Pix", "Boleto"],
          footer_links_extras: (data as any).footer_links_extras || [],
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  return { branding, loading };
}
