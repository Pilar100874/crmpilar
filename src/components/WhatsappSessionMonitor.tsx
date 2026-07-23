// Monitor global de sessões WhatsApp (Evolution).
// - Polling a cada 45s de todas as sessões do estabelecimento do usuário logado.
// - Considera "caiu" qualquer sessão cujo status NÃO seja WORKING nem SCAN_QR_CODE
//   (ex.: STOPPED, DISCONNECTED, FAILED, CLOSE, TIMEOUT, etc.).
// - Só é exibido para usuários admin (user_roles.role = 'admin').
// - Popup grande (AlertDialog) com botão "Reconectar agora" que chama a
//   edge function `waha-manager` (action: start) para subir a sessão novamente
//   e abre a página /atendimento-config?tab=canais para escanear o QR se pedido.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type SessionRow = {
  id: string;
  session_name: string;
  status: string | null;
  phone_number: string | null;
};

const HEALTHY_STATES = new Set(["WORKING", "SCAN_QR_CODE"]);
const POLL_MS = 45_000;
// Silencia o mesmo aviso por 5 min após "Depois" para não incomodar.
const SNOOZE_MS = 5 * 60_000;

export default function WhatsappSessionMonitor() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [downSessions, setDownSessions] = useState<SessionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const snoozedUntilRef = useRef<number>(0);

  // Detecta admin + estabelecimento do usuário logado
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const [{ data: roleRows }, estId] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        getEstabelecimentoId(),
      ]);
      if (!mounted) return;
      const admin = (roleRows || []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      setEstabelecimentoId(estId);
    })();
    return () => { mounted = false; };
  }, []);

  // Polling
  useEffect(() => {
    if (!isAdmin || !estabelecimentoId) return;

    const check = async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("id, session_name, status, phone_number")
        .eq("estabelecimento_id", estabelecimentoId);
      if (error || !data) return;

      const down = data.filter((s) => !HEALTHY_STATES.has(String(s.status || "").toUpperCase()));
      setDownSessions(down);

      if (down.length > 0 && Date.now() > snoozedUntilRef.current) {
        setOpen(true);
      } else if (down.length === 0) {
        setOpen(false);
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [isAdmin, estabelecimentoId]);

  const reconnect = async (s: SessionRow) => {
    try {
      setReconnecting(s.id);
      const { data, error } = await supabase.functions.invoke("waha-manager", {
        body: {
          action: "start",
          estabelecimentoId,
          sessionId: s.id,
          sessionName: s.session_name,
        },
      });
      if (error) throw error;
      if (data?.qrCode) {
        toast.info(`Escaneie o QR Code para reconectar "${s.session_name}".`);
        navigate("/atendimento-config?tab=canais");
        setOpen(false);
      } else if (data?.status === "WORKING") {
        toast.success(`Sessão "${s.session_name}" reconectada.`);
      } else {
        toast.message(`Solicitação enviada para "${s.session_name}".`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao reconectar sessão.");
    } finally {
      setReconnecting(null);
    }
  };

  const openConfig = () => {
    navigate("/atendimento-config?tab=canais");
    setOpen(false);
  };

  const snooze = () => {
    snoozedUntilRef.current = Date.now() + SNOOZE_MS;
    setOpen(false);
  };

  if (!isAdmin) return null;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
      <AlertDialogContent className="max-w-2xl border-destructive/40">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </span>
            Sessão do WhatsApp caiu
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {downSessions.length === 1
              ? "Uma sessão do WhatsApp está desconectada. Reconecte agora para não perder mensagens."
              : `${downSessions.length} sessões do WhatsApp estão desconectadas. Reconecte-as para não perder mensagens.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-72 overflow-y-auto space-y-2 rounded-lg border bg-muted/30 p-3">
          {downSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-md bg-background p-3 shadow-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.session_name}</div>
                <div className="text-xs text-muted-foreground">
                  Status: <span className="font-mono">{s.status || "desconhecido"}</span>
                  {s.phone_number ? ` · ${s.phone_number}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => reconnect(s)}
                disabled={reconnecting === s.id}
              >
                {reconnecting === s.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reconectando…</>
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Reconectar</>
                )}
              </Button>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Lembrar depois</AlertDialogCancel>
          <AlertDialogAction onClick={openConfig}>Abrir configurações</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
