import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Mail, Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Secao { titulo: string; texto: string; }
interface LgpdConfig {
  titulo: string; intro: string;
  encarregado_nome?: string; encarregado_email?: string;
  controlador_nome?: string; controlador_cnpj?: string; controlador_endereco?: string;
  secoes: Secao[];
}

export default function EcommerceLGPD() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [cfg, setCfg] = useState<LgpdConfig | null>(null);

  useEffect(() => {
    (async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) { setLoading(false); return; }
      const { data } = await supabase.from("ecommerce_config" as any)
        .select("lgpd_enabled, lgpd_config").eq("estabelecimento_id", estId).maybeSingle();
      if (data) {
        setEnabled(!!(data as any).lgpd_enabled);
        setCfg((data as any).lgpd_config as LgpdConfig);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  if (!enabled || !cfg) return <Navigate to="/ecommerce" replace />;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center py-6 border-b">
        <Shield className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="text-3xl font-bold">{cfg.titulo}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{cfg.intro}</p>
      </div>

      {(cfg.controlador_nome || cfg.encarregado_email) && (
        <Card>
          <CardContent className="p-5 grid md:grid-cols-2 gap-4 text-sm">
            {cfg.controlador_nome && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Controlador</p>
                  <p className="text-muted-foreground">{cfg.controlador_nome}</p>
                  {cfg.controlador_cnpj && <p className="text-xs text-muted-foreground">CNPJ: {cfg.controlador_cnpj}</p>}
                </div>
              </div>
            )}
            {cfg.controlador_endereco && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Endereço</p>
                  <p className="text-muted-foreground">{cfg.controlador_endereco}</p>
                </div>
              </div>
            )}
            {(cfg.encarregado_nome || cfg.encarregado_email) && (
              <div className="flex items-start gap-2 md:col-span-2">
                <Mail className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Encarregado de Dados (DPO)</p>
                  <p className="text-muted-foreground">{cfg.encarregado_nome}</p>
                  {cfg.encarregado_email && <a href={`mailto:${cfg.encarregado_email}`} className="text-primary hover:underline text-xs">{cfg.encarregado_email}</a>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {cfg.secoes?.map((s, i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold mb-1">{s.titulo}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{s.texto}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-6 border-t">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
