import { useEffect, useState } from "react";
import { BellRing, Smartphone, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useCampainha, useInterfoneConfig, tocarAlerta, type ToqueCampainha } from "@/lib/portaria/interfone";
import { usePushInterfone, notificarCampainhaLocal, isAppNativo } from "@/lib/portaria/push";
import InterfonePopup from "@/components/portaria/InterfonePopup";
import PortariaSipRamal from "@/components/portaria/PortariaSipRamal";

/** Tela de atendimento do interfone otimizada para celular (usada também no app Android). */
export default function PortariaAtendimentoMobile() {
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
    <div className="mx-auto w-full max-w-md space-y-4 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Atendimento do interfone</h1>
        <Badge variant={config?.ativo ? "default" : "outline"} className="gap-1">
          {config?.ativo ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {config?.ativo ? "Ativo" : "Desligado"}
        </Badge>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4" /> Alertas neste aparelho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {status === "ativo" && <p>Este celular receberá o alerta mesmo com o app fechado.</p>}
          {status === "indisponivel" && (
            <p>No navegador o alerta chega com esta tela aberta. Instale o app Android para receber com o app fechado.</p>
          )}
          {(status === "inativo" || status === "negado" || status === "erro") && isAppNativo() && (
            <div className="space-y-2">
              <p>Permita as notificações para ser avisado da campainha.</p>
              <Button size="sm" onClick={() => void registrar()}>Ativar alertas</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full gap-2"
        onClick={() => {
          setToqueId(toques[0]?.id ?? null);
          setAberto(true);
        }}
      >
        <BellRing className="h-5 w-5" /> Abrir câmera do interfone
      </Button>

      <PortariaSipRamal />



      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimos toques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {toques.length === 0 && <p className="text-sm text-muted-foreground">Nenhum toque registrado ainda.</p>}
          {toques.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setToqueId(t.id);
                setAberto(true);
              }}
              className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-left"
            >
              <span className="text-sm">{new Date(t.created_at).toLocaleString("pt-BR")}</span>
              <Badge variant={t.status === "pendente" ? "default" : "outline"}>
                {t.status === "pendente" ? "Novo" : "Atendido"}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

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
