import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IncomingCall {
  id: string;
  numero_origem: string;
  numero_destino: string;
  ramal: string;
  call_id: string;
  horario_inicio: string;
  direcao: string;
  status: string;
}

export const IncomingCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [usuarioRamal, setUsuarioRamal] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Buscar ramal do usuário logado
    const fetchUsuarioRamal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("ramal")
        .eq("auth_user_id", user.id)
        .single();

      if (usuario?.ramal) {
        setUsuarioRamal(usuario.ramal);
      }
    };

    fetchUsuarioRamal();
  }, []);

  useEffect(() => {
    if (!usuarioRamal) return;

    console.log(`[IncomingCall] Escutando chamadas para ramal: ${usuarioRamal}`);

    // Subscrever a chamadas em tempo real
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `ramal=eq.${usuarioRamal}`,
        },
        (payload) => {
          console.log("[IncomingCall] Nova chamada detectada:", payload);
          const call = payload.new as IncomingCall;
          
          // Verificar se é uma chamada recebida (entrante)
          if (call.direcao === "entrante" && call.status === "ringing") {
            setIncomingCall(call);
            
            // Tocar som de notificação (opcional)
            const audio = new Audio("/notification.mp3");
            audio.play().catch(console.error);

            toast({
              title: "📞 Chamada Recebida",
              description: `De: ${call.numero_origem}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `ramal=eq.${usuarioRamal}`,
        },
        (payload) => {
          const updatedCall = payload.new as IncomingCall;
          
          // Fechar popup se a chamada foi atendida/recusada
          if (
            incomingCall?.id === updatedCall.id &&
            (updatedCall.status === "answered" || 
             updatedCall.status === "rejected" ||
             updatedCall.status === "ended")
          ) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usuarioRamal, incomingCall, toast]);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    try {
      // Chamar edge function para atender
      const { error } = await supabase.functions.invoke("ucm-hangup", {
        body: {
          action: "answer",
          callId: incomingCall.call_id,
          ramal: usuarioRamal,
        },
      });

      if (error) throw error;

      // Atualizar status no banco
      await supabase
        .from("calls")
        .update({
          status: "answered",
          horario_atendimento: new Date().toISOString(),
        })
        .eq("id", incomingCall.id);

      toast({
        title: "✅ Chamada Atendida",
        description: "Conectando...",
      });

      setIncomingCall(null);
    } catch (error) {
      console.error("Erro ao atender chamada:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atender a chamada",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;

    try {
      // Chamar edge function para recusar
      const { error } = await supabase.functions.invoke("ucm-hangup", {
        body: {
          action: "reject",
          callId: incomingCall.call_id,
          ramal: usuarioRamal,
        },
      });

      if (error) throw error;

      // Atualizar status no banco
      await supabase
        .from("calls")
        .update({
          status: "rejected",
          horario_fim: new Date().toISOString(),
        })
        .eq("id", incomingCall.id);

      toast({
        title: "❌ Chamada Recusada",
      });

      setIncomingCall(null);
    } catch (error) {
      console.error("Erro ao recusar chamada:", error);
      toast({
        title: "Erro",
        description: "Não foi possível recusar a chamada",
        variant: "destructive",
      });
    }
  };

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall} onOpenChange={() => setIncomingCall(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="h-6 w-6 animate-pulse text-primary" />
            Chamada Recebida
          </DialogTitle>
          <DialogDescription>
            Uma nova chamada está chegando no seu ramal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">De:</span>
              <span className="text-lg font-semibold">
                {incomingCall.numero_origem}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Para:</span>
              <span className="text-lg font-semibold">
                {incomingCall.numero_destino || `Ramal ${incomingCall.ramal}`}
              </span>
            </div>

            {incomingCall.horario_inicio && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Hora:</span>
                <span className="text-sm">
                  {new Date(incomingCall.horario_inicio).toLocaleTimeString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAnswer}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Atender
            </Button>

            <Button
              onClick={handleReject}
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Recusar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
