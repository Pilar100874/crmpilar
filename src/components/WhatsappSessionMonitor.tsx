// Monitor global de sessões WhatsApp (Evolution).
// - Polling a cada 45s de todas as sessões do estabelecimento do usuário logado.
// - Considera "caiu" qualquer sessão cujo status NÃO seja WORKING nem SCAN_QR_CODE
//   (ex.: STOPPED, DISCONNECTED, FAILED, CLOSE, TIMEOUT, etc.).
// - Também detecta sessão "ZUMBI": aparece WORKING mas as mensagens estão
//   acumulando em PENDING no Evolution (celular pareado offline / instância travada).
// - Só é exibido para usuários admin (user_roles.role = 'admin').

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
import { AlertTriangle, RefreshCw, Loader2, Ghost, QrCode } from "lucide-react";
import { toast } from "sonner";

type SessionRow = {
  id: string;
  session_name: string;
  status: string | null;
  phone_number: string | null;
  // preenchido só para zumbis
  pending?: number;
  total?: number;
  reason?: "down" | "zombie" | "qr";
};

// WORKING = ok. SCAN_QR_CODE agora dispara alerta próprio (precisa ler QR).
const HEALTHY_STATES = new Set(["WORKING"]);
const POLL_MS = 45_000;
// Intervalo de checagem de zumbi é mais espaçado (chama Evolution API por sessão).
const ZOMBIE_POLL_MS = 3 * 60_000;
// Silencia o mesmo aviso por 5 min após "Depois" para não incomodar.
const SNOOZE_MS = 5 * 60_000;
// Limiares para considerar sessão zumbi (WORKING mas com PENDING acumulando).
const ZOMBIE_MIN_PENDING = 5; // pelo menos 5 mensagens pendentes
const ZOMBIE_WINDOW_MIN = 15; // nos últimos 15 minutos


export default function WhatsappSessionMonitor() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [downSessions, setDownSessions] = useState<SessionRow[]>([]);
  const [zombieSessions, setZombieSessions] = useState<SessionRow[]>([]);
  const [qrSessions, setQrSessions] = useState<SessionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const snoozedUntilRef = useRef<number>(0);
  const lastZombieCheckRef = useRef<number>(0);
  const notifiedQrRef = useRef<Set<string>>(new Set());

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
      // Pede permissão de notificação do navegador só para admins.
      if (admin && typeof window !== "undefined" && "Notification" in window) {
        try {
          if (Notification.permission === "default") {
            await Notification.requestPermission();
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const notifyQr = (s: SessionRow) => {
    if (notifiedQrRef.current.has(s.id)) return;
    notifiedQrRef.current.add(s.id);
    const title = "WhatsApp precisa de QR Code";
    const body = `Sessão "${s.session_name}" foi desvinculada. Escaneie o QR Code para reconectar.`;
    toast.warning(title, { description: body, duration: 15_000 });
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const n = new Notification(title, { body, tag: `wa-qr-${s.id}`, requireInteraction: true });
        n.onclick = () => {
          window.focus();
          navigate("/atendimento-config?tab=canais");
        };
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!isAdmin || !estabelecimentoId) return;

    const check = async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("id, session_name, status, phone_number")
        .eq("estabelecimento_id", estabelecimentoId);
      if (error || !data) return;

      const qr: SessionRow[] = data
        .filter((s) => String(s.status || "").toUpperCase() === "SCAN_QR_CODE")
        .map((s) => ({ ...s, reason: "qr" as const }));
      setQrSessions(qr);

      // Dispara notificação para QR recém-detectados; limpa memória dos que saíram.
      const currentQrIds = new Set(qr.map((s) => s.id));
      for (const id of Array.from(notifiedQrRef.current)) {
        if (!currentQrIds.has(id)) notifiedQrRef.current.delete(id);
      }
      qr.forEach(notifyQr);

      const down: SessionRow[] = data
        .filter((s) => {
          const st = String(s.status || "").toUpperCase();
          return st !== "SCAN_QR_CODE" && !HEALTHY_STATES.has(st);
        })
        .map((s) => ({ ...s, reason: "down" as const }));
      setDownSessions(down);

      // Checagem de zumbi: só sessões WORKING, e no máximo a cada ZOMBIE_POLL_MS.
      const now = Date.now();
      let zombies: SessionRow[] = zombieSessions;
      if (now - lastZombieCheckRef.current >= ZOMBIE_POLL_MS) {
        lastZombieCheckRef.current = now;
        const working = data.filter((s) => String(s.status || "").toUpperCase() === "WORKING");
        const results = await Promise.all(
          working.map(async (s) => {
            try {
              const { data: resp } = await supabase.functions.invoke("evolution-manager", {
                body: {
                  action: "pending_count",
                  estabelecimentoId,
                  sessionId: s.id,
                  sessionName: s.session_name,
                  minutes: ZOMBIE_WINDOW_MIN,
                },
              });
              const pending = Number(resp?.pending || 0);
              const total = Number(resp?.total || 0);
              if (resp?.supported && pending >= ZOMBIE_MIN_PENDING) {
                return { ...s, pending, total, reason: "zombie" as const };
              }
            } catch { /* silencioso */ }
            return null;
          }),
        );
        zombies = results.filter(Boolean) as SessionRow[];
        setZombieSessions(zombies);
      }

      const hasIssue = down.length > 0 || zombies.length > 0 || qr.length > 0;
      const shouldOpen = hasIssue && Date.now() > snoozedUntilRef.current;
      if (shouldOpen) setOpen(true);
      else if (!hasIssue) setOpen(false);
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [isAdmin, estabelecimentoId]);


  const reconnect = async (s: SessionRow) => {
    try {
      setReconnecting(s.id);
      const { data, error } = await supabase.functions.invoke("evolution-manager", {
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

  const restartZombie = async (s: SessionRow) => {
    try {
      setRestarting(s.id);
      // Força reconexão da instância (mesmo endpoint start faz connect/QR quando preciso).
      const { data, error } = await supabase.functions.invoke("evolution-manager", {
        body: {
          action: "start",
          estabelecimentoId,
          sessionId: s.id,
          sessionName: s.session_name,
        },
      });
      if (error) throw error;
      if (data?.qrCode) {
        toast.warning(`Sessão "${s.session_name}" precisa de novo QR Code.`);
        navigate("/atendimento-config?tab=canais");
        setOpen(false);
      } else {
        toast.success(`Instância "${s.session_name}" reiniciada. Verifique o celular pareado.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao reiniciar instância.");
    } finally {
      setRestarting(null);
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

  const totalIssues = downSessions.length + zombieSessions.length + qrSessions.length;
  const onlyQr = downSessions.length === 0 && zombieSessions.length === 0 && qrSessions.length > 0;
  const onlyZombies = downSessions.length === 0 && qrSessions.length === 0 && zombieSessions.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
      <AlertDialogContent className="max-w-2xl border-destructive/40">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
              {onlyZombies ? (
                <Ghost className="h-7 w-7 text-destructive" />
              ) : (
                <AlertTriangle className="h-7 w-7 text-destructive" />
              )}
            </span>
            {onlyQr
              ? "WhatsApp precisa de QR Code"
              : onlyZombies
                ? "WhatsApp travado (mensagens não estão saindo)"
                : "Sessão do WhatsApp caiu"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {onlyQr
              ? `${qrSessions.length === 1 ? "Uma sessão está aguardando" : `${qrSessions.length} sessões estão aguardando`} leitura de QR Code para reconectar. Abra as configurações e escaneie com o celular pareado.`
              : onlyZombies
                ? `${zombieSessions.length === 1 ? "Uma sessão aparece como conectada" : `${zombieSessions.length} sessões aparecem como conectadas`}, mas mensagens estão acumulando em PENDING no Evolution. Isso geralmente indica que o celular pareado está offline ou a instância travou.`
                : totalIssues === 1
                  ? "Uma sessão do WhatsApp está com problema. Verifique abaixo."
                  : `${totalIssues} sessões do WhatsApp com problema. Verifique abaixo.`}
          </AlertDialogDescription>
        </AlertDialogHeader>


        <div className="max-h-72 overflow-y-auto space-y-2 rounded-lg border bg-muted/30 p-3">
          {downSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-md bg-background p-3 shadow-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.session_name}</div>
                <div className="text-xs text-muted-foreground">
                  Desconectada · Status: <span className="font-mono">{s.status || "desconhecido"}</span>
                  {s.phone_number ? ` · ${s.phone_number}` : ""}
                </div>
              </div>
              <Button size="sm" onClick={() => reconnect(s)} disabled={reconnecting === s.id}>
                {reconnecting === s.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reconectando…</>
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Reconectar</>
                )}
              </Button>
            </div>
          ))}

          {zombieSessions.map((s) => (
            <div
              key={`z-${s.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 truncate font-semibold">
                  <Ghost className="h-4 w-4 text-amber-600" />
                  {s.session_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Aparece como <span className="font-mono">WORKING</span>, mas
                  {" "}<strong className="text-amber-700 dark:text-amber-400">{s.pending} de {s.total}</strong>
                  {" "}mensagens dos últimos {ZOMBIE_WINDOW_MIN}min estão em PENDING.
                  {s.phone_number ? ` · ${s.phone_number}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restartZombie(s)}
                disabled={restarting === s.id}
              >
                {restarting === s.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reiniciando…</>
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Reiniciar instância</>
                )}
              </Button>
            </div>
          ))}
        </div>

        {zombieSessions.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Como resolver:</strong>{" "}
            confirme que o celular pareado está com internet e WhatsApp aberto.
            Se persistir, reinicie a instância acima e, caso peça, escaneie o QR novamente.
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Lembrar depois</AlertDialogCancel>
          <AlertDialogAction onClick={openConfig}>Abrir configurações</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
