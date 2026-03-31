import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import type { EcommerceBranding } from "@/hooks/useEcommerceBranding";

interface Props {
  branding: EcommerceBranding;
}

export default function NewsletterSection({ branding }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setLoading(true);
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) {
        // fallback: get any config
        const { data: cfg } = await supabase.from("ecommerce_config").select("estabelecimento_id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (!cfg) { toast.error("Erro ao cadastrar"); setLoading(false); return; }
        const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), estabelecimento_id: cfg.estabelecimento_id });
        if (error?.code === "23505") { toast.info("Este e-mail já está cadastrado!"); }
        else if (error) { toast.error("Erro ao cadastrar"); }
        else { toast.success("Cadastrado com sucesso! 🎉"); setEmail(""); }
      } else {
        const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), estabelecimento_id: estId });
        if (error?.code === "23505") { toast.info("Este e-mail já está cadastrado!"); }
        else if (error) { toast.error("Erro ao cadastrar"); }
        else { toast.success("Cadastrado com sucesso! 🎉"); setEmail(""); }
      }
    } catch {
      toast.error("Erro ao cadastrar");
    }
    setLoading(false);
  };

  return (
    <section className="bg-primary text-primary-foreground py-14">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          {branding.newsletter_titulo || "Receba ofertas exclusivas"}
        </h2>
        <p className="text-primary-foreground/80">
          {branding.newsletter_subtitulo || "Cadastre-se e ganhe 10% de desconto na primeira compra"}
        </p>
        <div className="flex gap-2 max-w-md mx-auto">
          <Input
            placeholder="Seu melhor e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            className="bg-background/20 border-background/30 text-primary-foreground placeholder:text-primary-foreground/50 rounded-full"
          />
          <Button
            variant="secondary"
            className="rounded-full px-6 font-semibold transition-transform hover:scale-105"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "..." : "Cadastrar"}
          </Button>
        </div>
      </div>
    </section>
  );
}
