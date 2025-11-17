import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, PhoneOff, PhoneForwarded, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Call {
  id: string;
  call_id: string | null;
  numero_destino: string | null;
  ramal: string | null;
  status: string;
  direcao: string;
  horario_inicio: string | null;
}

interface SoftphoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNumber?: string;
}

export function SoftphoneDialog({ open, onOpenChange, initialNumber = "" }: SoftphoneDialogProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [extension, setExtension] = useState("");
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [isLoadingEstabelecimento, setIsLoadingEstabelecimento] = useState(true);

  useEffect(() => {
    if (open) {
      setPhoneNumber(initialNumber);
      loadUserEstabelecimento();
    }
  }, [open, initialNumber]);

  useEffect(() => {
    if (estabelecimentoId && open) {
      loadCalls();
      setupRealtimeSubscription();
    }
  }, [estabelecimentoId, open]);

  const loadUserEstabelecimento = async () => {
    try {
      setIsLoadingEstabelecimento(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('get_user_estabelecimento_id', { _user_id: user.id });
        console.log('Estabelecimento ID carregado no dialog:', data);
        setEstabelecimentoId(data);
      }
    } catch (error) {
      console.error('Error loading user establishment:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configuração do sistema",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEstabelecimento(false);
    }
  };

  const loadCalls = async () => {
    if (!estabelecimentoId) return;

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .in('status', ['ringing', 'dialing', 'answered'])
        .order('horario_inicio', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error loading calls:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!estabelecimentoId) return;

    const channel = supabase
      .channel('softphone-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `estabelecimento_id=eq.${estabelecimentoId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setCalls(prev => [payload.new as Call, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setCalls(prev => prev.map(c => c.id === payload.new.id ? payload.new as Call : c));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setCalls(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDial = async () => {
    if (isLoadingEstabelecimento) {
      toast({
        title: "Aguarde",
        description: "Carregando configuração do sistema...",
        variant: "default",
      });
      return;
    }

    if (!estabelecimentoId) {
      toast({
        title: "Erro",
        description: "Configuração UCM não encontrada. Verifique as configurações do estabelecimento.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      toast({
        title: "Erro",
        description: "Digite um número de telefone",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ucm-dial', {
        body: {
          number: phoneNumber,
          extension: extension || undefined,
          estabelecimento_id: estabelecimentoId,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Ligação iniciada",
        description: `Discando para ${phoneNumber}`,
      });

      loadCalls();
    } catch (error: any) {
      console.error('Error dialing:', error);
      toast({
        title: "Erro ao discar",
        description: error.message || "Verifique a configuração do UCM",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHangup = async (callId: string) => {
    if (!estabelecimentoId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ucm-hangup', {
        body: {
          callId,
          estabelecimento_id: estabelecimentoId,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Ligação encerrada",
      });

      loadCalls();
    } catch (error: any) {
      console.error('Error hanging up:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTransfer = async (callId: string) => {
    const targetExtension = prompt("Digite o ramal de destino:");
    if (!targetExtension || !estabelecimentoId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ucm-transfer', {
        body: {
          callId,
          targetExtension,
          estabelecimento_id: estabelecimentoId,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Ligação transferida",
        description: `Transferida para ramal ${targetExtension}`,
      });

      loadCalls();
    } catch (error: any) {
      console.error('Error transferring:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      ringing: { label: "Tocando", variant: "default" },
      dialing: { label: "Discando", variant: "default" },
      answered: { label: "Em andamento", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Softphone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discar */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Número de telefone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDial()}
                className="flex-1"
              />
              <Input
                placeholder="Ramal"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="w-24"
              />
            </div>
            <Button 
              onClick={handleDial} 
              disabled={loading || !phoneNumber}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discando...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Ligar
                </>
              )}
            </Button>
          </div>

          {/* Chamadas ativas */}
          {calls.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Chamadas Ativas ({calls.length})</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {call.numero_destino || 'Desconhecido'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getStatusBadge(call.status)}
                        {call.horario_inicio && (
                          <span>
                            {format(new Date(call.horario_inicio), 'HH:mm:ss')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      {call.status === 'answered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTransfer(call.id)}
                        >
                          <PhoneForwarded className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleHangup(call.id)}
                      >
                        <PhoneOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
