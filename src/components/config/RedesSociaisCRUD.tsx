import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RedesSociais {
  whatsapp: string;
  instagram: string;
  facebook: string;
  website: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  telegram: string;
  twitter: string;
  threads: string;
  pinterest: string;
}

const EMPTY: RedesSociais = {
  whatsapp: "",
  instagram: "",
  facebook: "",
  website: "",
  tiktok: "",
  youtube: "",
  linkedin: "",
  telegram: "",
  twitter: "",
  threads: "",
  pinterest: "",
};

const FIELDS: { key: keyof RedesSociais; label: string; placeholder: string }[] = [
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/5511999999999" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/seuperfil" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/suapagina" },
  { key: "website", label: "Website", placeholder: "https://seusite.com.br" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@seuperfil" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@seucanal" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/suaempresa" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/seuusuario" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/seuperfil" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@seuperfil" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/seuperfil" },
];

interface RedesSociaisCRUDProps {
  estabelecimentoId?: string;
}

export const RedesSociaisCRUD = ({ estabelecimentoId }: RedesSociaisCRUDProps) => {
  const [socialLinks, setSocialLinks] = useState<RedesSociais>(EMPTY);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRedesSociais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estabelecimentoId]);

  const resolveEstabelecimentoId = async () => {
    if (estabelecimentoId) return estabelecimentoId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: userData } = await supabase
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('email', user.email!)
      .maybeSingle();
    return userData?.estabelecimento_id ?? null;
  };

  const fetchRedesSociais = async () => {
    const targetId = await resolveEstabelecimentoId();
    if (!targetId) return;

    const { data, error } = await supabase
      .from("redes_sociais")
      .select("*")
      .eq("estabelecimento_id", targetId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast({ title: "Erro ao carregar redes sociais", description: error.message, variant: "destructive" });
    } else if (data) {
      const merged: RedesSociais = { ...EMPTY };
      (Object.keys(EMPTY) as (keyof RedesSociais)[]).forEach((k) => {
        merged[k] = (data as any)[k] || "";
      });
      setSocialLinks(merged);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const targetId = await resolveEstabelecimentoId();
    if (!targetId) {
      toast({ title: "Erro", description: "Estabelecimento não identificado", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("redes_sociais")
      .select("id")
      .eq("estabelecimento_id", targetId)
      .maybeSingle();

    const payload = { estabelecimento_id: targetId, ...socialLinks };
    const { error } = existing
      ? await supabase.from("redes_sociais").update(socialLinks).eq("estabelecimento_id", targetId)
      : await supabase.from("redes_sociais").insert([payload]);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Redes sociais salvas com sucesso!" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              placeholder={f.placeholder}
              value={socialLinks[f.key]}
              onChange={(e) => setSocialLinks({ ...socialLinks, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Links"}
      </Button>
    </div>
  );
};
