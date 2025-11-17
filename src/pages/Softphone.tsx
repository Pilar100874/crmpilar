import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, PhoneOff } from "lucide-react";
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
  
  const { connect, disconnect, dial, hangup, isRegistered, isConnecting, activeCalls } = useSipConnection();

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

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('ramal, senha_sip')
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

      if (!userData?.ramal || !userData?.senha_sip) {
        toast({
          title: "Configuração incompleta",
          description: "Configure seu ramal e senha SIP nas configurações de usuário",
          variant: "destructive",
        });
        return;
      }

      setUserExtension(userData.ramal);
      setRamalSenha(userData.senha_sip);

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
        .select('ucm_host, remote_ip')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      if (ucmError || !ucmData?.ucm_host) {
        toast({
          title: "Erro",
          description: "Configure o servidor UCM nas configurações",
          variant: "destructive",
        });
        return;
      }

      setUcmServer(ucmData.ucm_host);

      await connect({
        server: ucmData.ucm_host,
        remoteServer: ucmData.remote_ip || undefined,
        extension: userData.ramal,
        password: userData.senha_sip,
        displayName: userData.ramal,
      });

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

  const getConnectionStatus = () => {
    if (isLoadingConfig) {
      return <Badge variant="secondary">Carregando...</Badge>;
    }
    if (isConnecting) {
      return <Badge variant="secondary">Conectando...</Badge>;
    }
    if (isRegistered) {
      return <Badge className="bg-green-500">Conectado</Badge>;
    }
    return <Badge variant="destructive">Desconectado</Badge>;
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
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getConnectionStatus()}
              </div>
              {userExtension && (
                <span className="text-sm text-muted-foreground">
                  Ramal: {userExtension}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Número de telefone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDial()}
                className="flex-1"
                disabled={!isRegistered}
              />
            </div>
            <Button 
              onClick={handleDial} 
              disabled={!isRegistered || !phoneNumber}
              className="w-full"
            >
              <Phone className="mr-2 h-4 w-4" />
              Ligar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chamadas Ativas ({activeCalls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCalls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma chamada ativa
              </p>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Phone className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {call.phoneNumber}
                        </div>
                      </div>
                      {getStatusBadge(call.state)}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => hangup(call.id)}
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
      </div>
    </Layout>
  );
}
