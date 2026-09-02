import { useEffect, useState } from "react";
import { BellRing, Smartphone, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    <div
      className={`mx-auto w-full max-w-md space-y-4 px-3 pb-4 ${dark ? "text-white" : ""}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
    >
      <header className={`flex flex-col items-center gap-2 rounded-2xl p-4 ${dark ? "border border-white/10 bg-white/5 backdrop-blur" : ""}`}>
        <img src={dark ? logoPilarBranco : logoPilar} alt="Pilar Sip" className="h-12 w-auto object-contain drop-shadow" />
        <div className="h-0.5 w-14 rounded-full bg-orange-500" />
        <div className="text-center">
          <p className="text-sm font-semibold leading-tight">Pilar Sip</p>
          <p className={`text-xs leading-tight ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Interfone e ramal SIP</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            config?.ativo ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-slate-300"
          }`}
        >
          {config?.ativo ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {config?.ativo ? "Ativo" : "Desligado"}
        </span>
      </header>

      <Tabs defaultValue="atendimento" className="w-full">
        <TabsList className={`grid w-full grid-cols-2 rounded-2xl ${dark ? "border border-white/10 bg-white/5 text-slate-300" : ""}`}>
          <TabsTrigger value="atendimento" className={`rounded-xl ${dark ? "data-[state=active]:bg-white/15 data-[state=active]:text-white" : ""}`}>
            Atendimento
          </TabsTrigger>
          <TabsTrigger value="historico" className={`rounded-xl ${dark ? "data-[state=active]:bg-white/15 data-[state=active]:text-white" : ""}`}>
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atendimento" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-95 ${
                dark ? "border border-white/10 bg-white/5 text-white hover:bg-white/10" : "border bg-card"
              }`}
              onClick={() => {
                setToqueId(toques[0]?.id ?? null);
                setAberto(true);
              }}
            >
              <BellRing className="h-5 w-5 text-orange-400" /> Interfone
            </button>
            <button
              type="button"
              disabled={status === "ativo"}
              onClick={() => void registrar()}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
                dark ? "border border-white/10 bg-white/5 text-white hover:bg-white/10" : "border bg-card"
              }`}
            >
              <Smartphone className="h-5 w-5 text-slate-400" /> {status === "ativo" ? "Alertas ok" : "Ativar alertas"}
            </button>
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
