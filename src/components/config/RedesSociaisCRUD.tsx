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
}

interface RedesSociaisCRUDProps {
  estabelecimentoId?: string;
}

export const RedesSociaisCRUD = ({ estabelecimentoId }: RedesSociaisCRUDProps) => {
  const [socialLinks, setSocialLinks] = useState<RedesSociais>({
    whatsapp: "",
    instagram: "",
    facebook: "",
    website: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRedesSociais();
  }, []);

  const fetchRedesSociais = async () => {
    let targetEstabelecimentoId = estabelecimentoId;

    if (!targetEstabelecimentoId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('email', user.email)
        .maybeSingle();

      targetEstabelecimentoId = userData?.estabelecimento_id;
    }

    if (!targetEstabelecimentoId) return;

    const { data, error } = await supabase
      .from("redes_sociais")
      .select("*")
      .eq("estabelecimento_id", targetEstabelecimentoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      toast({
        title: "Erro ao carregar redes sociais",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setSocialLinks({
        whatsapp: data.whatsapp || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        website: data.website || ""
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);

    let targetEstabelecimentoId = estabelecimentoId;

    if (!targetEstabelecimentoId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('email', user.email)
        .maybeSingle();

      targetEstabelecimentoId = userData?.estabelecimento_id;
    }

    if (!targetEstabelecimentoId) {
      toast({
        title: "Erro",
        description: "Estabelecimento não identificado",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from("redes_sociais")
      .select("id")
      .eq("estabelecimento_id", targetEstabelecimentoId)
      .maybeSingle();

    const dataToSave = {
      estabelecimento_id: targetEstabelecimentoId,
      ...socialLinks
    };

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("redes_sociais")
        .update(socialLinks)
        .eq("estabelecimento_id", targetEstabelecimentoId));
    } else {
      ({ error } = await supabase
        .from("redes_sociais")
        .insert([dataToSave]));
    }

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Redes sociais salvas com sucesso!" });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          placeholder="https://wa.me/5511999999999"
          value={socialLinks.whatsapp}
          onChange={(e) => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instagram">Instagram</Label>
        <Input
          id="instagram"
          placeholder="https://instagram.com/seuperfil"
          value={socialLinks.instagram}
          onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="facebook">Facebook</Label>
        <Input
          id="facebook"
          placeholder="https://facebook.com/suapagina"
          value={socialLinks.facebook}
          onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          placeholder="https://seusite.com.br"
          value={socialLinks.website}
          onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
        />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Links"}
      </Button>
    </div>
  );
};
