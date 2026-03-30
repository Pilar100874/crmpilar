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
}

const defaults: EcommerceBranding = {
  logo_url: "",
  background_video_url: "",
  background_type: "gradient",
  nome_loja: "Minha Loja",
  slogan: "",
  cor_primaria: "#000000",
  cor_secundaria: "#ffffff",
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
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  return { branding, loading };
}
