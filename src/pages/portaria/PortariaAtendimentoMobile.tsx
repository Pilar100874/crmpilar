import { useEffect, useState } from "react";
import { BellRing, Smartphone, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useCampainha, useInterfoneConfig, tocarAlerta, type ToqueCampainha } from "@/lib/portaria/interfone";
import { usePushInterfone, notificarCampainhaLocal } from "@/lib/portaria/push";
import InterfonePopup from "@/components/portaria/InterfonePopup";
import PortariaSipRamal from "@/components/portaria/PortariaSipRamal";
import logoPilar from "@/assets/logo-2.png";
import logoPilarBranco from "@/assets/logo_branco.png";

/** Tela de atendimento do interfone otimizada para celular (usada também no app Android). */
export default function PortariaAtendimentoMobile({ dark = false }: { dark?: boolean }) {
  const { unidadeId } = useUnidadeAtual();
  const { config } = useInterfoneConfig(unidadeId);
  const { status, registrar } = usePushInterfone(unidadeId);
  const [toques, setToques] = useState<ToqueCampainha[]>([]);
  const [toqueId, setToqueId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      let q = supabase
        .from("port_campainha_eventos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (unidadeId) q = q.eq("unidade_id", unidadeId);
      const { data } = await q;
      if (ativo) setToques((data ?? []) as ToqueCampainha[]);
    })();
    return () => {
      ativo = false;
    };
  }, [unidadeId]);

  useCampainha(unidadeId, !!config?.ativo, (toque) => {
    setToques((atual) => [toque, ...atual].slice(0, 20));
    setToqueId(toque.id);
    setAberto(true);
    if (config?.som) tocarAlerta();
    void notificarCampainhaLocal("Campainha do interfone", "Alguém está na portaria. Toque para atender.");
  });

  return (
    <div className={`mx-auto w-full max-w-md space-y-4 p-3 ${dark ? "text-white" : ""}`}>
      <header className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${dark ? "border border-white/10 bg-white/5 backdrop-blur" : ""}`}>
        <div className="flex items-center gap-2">
          <img src={dark ? logoPilarBranco : logoPilar} alt="Pilar Sip" className="h-9 w-auto object-contain" />
          <div>
            <p className="text-sm font-semibold leading-tight">Pilar Sip</p>
            <p className={`text-xs leading-tight ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Interfone e ramal SIP</p>
          </div>
        </div>
        <Badge
          variant={config?.ativo ? "default" : "outline"}
          className={`gap-1 ${dark ? (config?.ativo ? "bg-orange-500 text-white hover:bg-orange-500" : "border-white/20 text-slate-300") : ""}`}
        >
          {config?.ativo ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {config?.ativo ? "Ativo" : "Desligado"}
        </Badge>
      </header>

      <Tabs defaultValue="atendimento" className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${dark ? "border border-white/10 bg-white/5 text-slate-300" : ""}`}>
          <TabsTrigger value="atendimento" className={dark ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : ""}>
            Atendimento
          </TabsTrigger>
          <TabsTrigger value="historico" className={dark ? "data-[state=active]:bg-orange-500 data-[state=active]:text-white" : ""}>
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atendimento" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              className={`h-14 gap-2 ${dark ? "bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600" : ""}`}
              onClick={() => {
                setToqueId(toques[0]?.id ?? null);
                setAberto(true);
              }}
            >
              <BellRing className="h-5 w-5" /> Interfone
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`h-14 gap-2 ${dark ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""}`}
              disabled={status === "ativo"}
              onClick={() => void registrar()}
            >
              <Smartphone className="h-5 w-5" /> {status === "ativo" ? "Alertas ok" : "Ativar alertas"}
            </Button>
          </div>

          <PortariaSipRamal dark={dark} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className={dark ? "border-white/10 bg-white/5 text-white backdrop-blur" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Últimos toques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {toques.length === 0 && (
                <p className={`text-sm ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Nenhum toque registrado ainda.</p>
              )}
              {toques.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setToqueId(t.id);
                    setAberto(true);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    dark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "bg-card"
                  }`}
                >
                  <span className="text-sm">{new Date(t.created_at).toLocaleString("pt-BR")}</span>
                  <Badge
                    variant={t.status === "pendente" ? "default" : "outline"}
                    className={dark ? (t.status === "pendente" ? "bg-orange-500 text-white hover:bg-orange-500" : "border-white/20 text-slate-300") : ""}
                  >
                    {t.status === "pendente" ? "Novo" : "Atendido"}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {config && (
        <InterfonePopup
          aberto={aberto}
          onFechar={() => setAberto(false)}
          config={config}
          unidadeId={unidadeId}
          toqueId={toqueId}
        />
      )}
    </div>
  );
}
