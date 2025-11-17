import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, PhoneOff, PhoneForwarded } from "lucide-react";
import { useSipConnection } from "@/hooks/useSipConnection";
import { SessionState } from "sip.js";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export default function Softphone() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userExtension, setUserExtension] = useState<string>("");
  const [ramalSenha, setRamalSenha] = useState<string>("");
  const [ucmServer, setUcmServer] = useState<string>("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const { connect, disconnect, dial, hangup, answer, isRegistered, isConnecting, activeCalls } = useSipConnection();

  useEffect(() => {
    loadSoftphoneConfig();
  }, []);

  const loadSoftphoneConfig = async () => {
    try {
      setIsLoadingConfig(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      // Carregar ramal e senha do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('ramal, ramal_senha')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
        toast({
          title: "Erro",
          description: "Erro ao carregar configuração do usuário",
          variant: "destructive",
        });
        return;
      }

      if (!userData?.ramal || !userData?.ramal_senha) {
        toast({
          title: "Configuração incompleta",
          description: "Configure seu ramal e senha nas configurações de usuário",
          variant: "destructive",
        });
        return;
      }

      setUserExtension(userData.ramal);
      setRamalSenha(userData.ramal_senha);

      // Carregar configuração UCM
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast({
          title: "Erro",
          description: "Estabelecimento não encontrado",
          variant: "destructive",
        });
        return;
      }

      const { data: ucmData, error: ucmError } = await supabase
        .from('ucm_config')
        .select('ucm_server')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      if (ucmError || !ucmData?.ucm_server) {
        toast({
          title: "Erro",
          description: "Configure o servidor UCM nas configurações",
          variant: "destructive",
        });
        return;
      }

      setUcmServer(ucmData.ucm_server);

    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configuração do softphone",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleConnect = async () => {
    if (!userExtension || !ramalSenha || !ucmServer) {
      toast({
        title: "Configuração incompleta",
        description: "Verifique as configurações do softphone",
        variant: "destructive",
      });
      return;
    }

    await connect({
      server: ucmServer,
      extension: userExtension,
      password: ramalSenha,
      displayName: userExtension,
    });
  };

  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone",
        variant: "destructive",
      });
      return;
    }

    await dial(phoneNumber);
  };

  const getStatusBadge = (state: SessionState) => {
    switch (state) {
      case SessionState.Initial:
        return <Badge variant="secondary">Iniciando</Badge>;
      case SessionState.Establishing:
        return <Badge className="bg-yellow-500">Discando</Badge>;
      case SessionState.Established:
        return <Badge className="bg-green-500">Em Chamada</Badge>;
      case SessionState.Terminating:
      case SessionState.Terminated:
        return <Badge variant="destructive">Encerrada</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const loadCallsPlaceholder = async () => {
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
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `estabelecimento_id=eq.${estabelecimentoId}`,
        },
        (payload) => {
          console.log('Call update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newCall = payload.new as Call;
            if (newCall.direcao === 'inbound' && newCall.status === 'ringing') {
              setIncomingCall(newCall);
              setShowIncomingDialog(true);
            }
            setCalls(prev => [newCall, ...prev]);
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

    // Buscar configuração UCM
    const { data: ucmConfig } = await supabase
      .from('ucm_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle();

    if (!ucmConfig) {
      toast({
        title: "Erro",
        description: "Configuração UCM não encontrada",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Sempre usar edge function (resolve problemas de mixed content HTTP/HTTPS)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Usar ramal do usuário se não especificado
      const effectiveExtension = extension || userExtension;
      
      const response = await supabase.functions.invoke('ucm-dial', {
        body: {
          number: phoneNumber,
          extension: effectiveExtension || undefined,
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

      setPhoneNumber("");
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
      finished: { label: "Finalizada", variant: "secondary" },
      busy: { label: "Ocupado", variant: "destructive" },
      failed: { label: "Falhou", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string, direcao: string) => {
    if (status === 'failed' || status === 'busy') {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    if (direcao === 'inbound') {
      return <PhoneIncoming className="h-4 w-4 text-primary" />;
    }
    return <Phone className="h-4 w-4 text-primary" />;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <SubMenuHeader title="Softphone" onOpenSubmenu={() => {}} />

        <Card>
          <CardHeader>
            <CardTitle>Fazer Ligação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status do Ramal */}
            {userExtension && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Ramal {userExtension} conectado</span>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Número de telefone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDial()}
                className="flex-1"
              />
              <Input
                placeholder={userExtension ? `Ramal: ${userExtension}` : "Ramal (carregando...)"}
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="w-32"
                disabled={isLoadingEstabelecimento}
              />
            </div>
            <Button 
              onClick={handleDial} 
              disabled={loading || !phoneNumber}
              className="w-full"
            >
              <Phone className="mr-2 h-4 w-4" />
              {loading ? "Discando..." : "Ligar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chamadas Ativas ({calls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma chamada ativa
              </p>
            ) : (
              <div className="space-y-3">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(call.status, call.direcao)}
                      <div className="flex-1">
                        <div className="font-medium">
                          {call.direcao === 'inbound' 
                            ? `De: ${call.numero_origem || 'Desconhecido'}` 
                            : `Para: ${call.numero_destino || 'Desconhecido'}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {call.ramal && `Ramal: ${call.ramal} • `}
                          {call.horario_inicio && format(new Date(call.horario_inicio), 'HH:mm:ss')}
                        </div>
                      </div>
                      {getStatusBadge(call.status)}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
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
            )}
          </CardContent>
        </Card>

        <Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PhoneIncoming className="h-5 w-5 animate-pulse text-primary" />
                Chamada Recebida
              </DialogTitle>
              <DialogDescription>
                {incomingCall?.numero_origem || "Número desconhecido"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => {
                  setShowIncomingDialog(false);
                  toast({ title: "Chamada atendida" });
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                Atender
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => {
                  if (incomingCall) {
                    handleHangup(incomingCall.id);
                  }
                  setShowIncomingDialog(false);
                }}
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                Recusar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
