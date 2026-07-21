import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { User, Mail, Phone, Building2, Users, Monitor, Download, ExternalLink, CheckCircle2, XCircle, Loader2, Smartphone, Car } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { useExtensionDownload } from "@/hooks/useExtensionDownload";
import { ExtensionInstallManual } from "@/components/ExtensionInstallManual";
import LocationConsentCard from "@/components/perfil/LocationConsentCard";

export default function Perfil() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [estabelecimentoName, setEstabelecimentoName] = useState("");
  const [grupoAcessoName, setGrupoAcessoName] = useState("");
  const [extensionStatus, setExtensionStatus] = useState<{isSharing: boolean, lastFrameAt: string | null} | null>(null);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const { downloadExtension, isDownloading } = useExtensionDownload();

  const currentDeviceUuid = (() => {
    try {
      return localStorage.getItem('crm:pwa:device_uuid') || '';
    } catch { return ''; }
  })();

  useEffect(() => {
    loadUserData();
  }, []);

  // Realtime para monitorar status da extensão
  useEffect(() => {
    if (!userData?.id) return;

    const channel = supabase
      .channel('screen-monitor-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_monitor_consent',
          filter: `usuario_id=eq.${userData.id}`
        },
        (payload: any) => {
          console.log('[Perfil] Status de monitoramento atualizado:', payload);
          if (payload.new) {
            setExtensionStatus({
              isSharing: payload.new.is_sharing || false,
              lastFrameAt: payload.new.last_frame_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.id]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Buscar dados do usuário
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (usuario) {
        setUserData(usuario);

        // Buscar estabelecimento
        const estabId = await getEstabelecimentoId();
        if (estabId) {
          const { data: estabData } = await supabase
            .from("estabelecimentos")
            .select("nome")
            .eq("id", estabId)
            .maybeSingle();
          
          if (estabData) {
            setEstabelecimentoName(estabData.nome);
          }

          // Verificar status da extensão
          const { data: consentData } = await supabase
            .from("screen_monitor_consent")
            .select("is_sharing, last_frame_at")
            .eq("usuario_id", usuario.id)
            .eq("estabelecimento_id", estabId)
            .maybeSingle();

          if (consentData) {
            setExtensionStatus({
              isSharing: consentData.is_sharing || false,
              lastFrameAt: consentData.last_frame_at
            });
          }
        }

        // Buscar grupo de acesso
        if (usuario.grupo_acesso_id) {
          const { data: grupoData } = await supabase
            .from("grupos_acesso")
            .select("nome")
            .eq("id", usuario.grupo_acesso_id)
            .maybeSingle();
          
          if (grupoData) {
            setGrupoAcessoName(grupoData.nome);
          }
        }

        // Buscar dispositivos vinculados ao usuário
        const { data: disps } = await supabase
          .from("dispositivos_rastreamento")
          .select("id, device_uuid, nome_dispositivo, modelo, plataforma, status, ultimo_acesso, primeiro_acesso, veiculo_id")
          .eq("usuario_id", usuario.id)
          .order("ultimo_acesso", { ascending: false });
        if (disps) {
          // Enriquecer com placa do veículo vinculado
          const veicIds = Array.from(new Set(disps.map(d => d.veiculo_id).filter(Boolean)));
          let veicMap: Record<string, string> = {};
          if (veicIds.length) {
            const { data: veics } = await supabase
              .from("veiculos")
              .select("id, placa")
              .in("id", veicIds);
            veics?.forEach(v => { veicMap[v.id] = v.placa; });
          }
          setDispositivos(disps.map(d => ({ ...d, placa: d.veiculo_id ? veicMap[d.veiculo_id] : null })));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do perfil");
    }
  };

  const handleCopyUserId = async () => {
    if (!userData?.id) return;
    
    navigator.clipboard.writeText(userData.id);
    toast.success("ID copiado! Cole na extensão para iniciar.");
    
    // Garantir que existe registro de consentimento para a extensão usar
    try {
      const estabId = await getEstabelecimentoId();
      if (estabId) {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("screen_monitor_consent")
          .upsert({
            usuario_id: userData.id,
            estabelecimento_id: estabId,
            consent_given: true,
            consent_given_at: now,
            is_sharing: false,
            updated_at: now
          }, { onConflict: 'usuario_id,estabelecimento_id' });
        
        if (error) {
          console.error("Erro ao criar registro de consentimento:", error);
        } else {
          console.log("Registro de consentimento criado/atualizado com sucesso");
        }
      }
    } catch (error) {
      console.error("Erro ao preparar registro:", error);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: userData.nome,
          telefone: userData.telefone,
        })
        .eq("id", userData.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Visualize e edite suas informações pessoais</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={userData.nome || ""}
                onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={userData.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={userData.telefone || ""}
                  onChange={(e) => setUserData({ ...userData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estabelecimento</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={estabelecimentoName || "Carregando..."}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {grupoAcessoName && (
              <div className="space-y-2">
                <Label>Grupo de Acesso</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={grupoAcessoName}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extensão de Monitoramento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Extensão de Monitoramento
            </CardTitle>
            <CardDescription>
              Extensão do Chrome para monitoramento de tela corporativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status da Extensão */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {extensionStatus?.isSharing ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Extensão Ativa</p>
                      <p className="text-xs text-muted-foreground">
                        Última captura: {extensionStatus.lastFrameAt 
                          ? new Date(extensionStatus.lastFrameAt).toLocaleString('pt-BR')
                          : 'Aguardando...'
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Extensão Inativa</p>
                      <p className="text-xs text-muted-foreground">
                        Instale e ative a extensão para habilitar o monitoramento
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Badge variant={extensionStatus?.isSharing ? "default" : "secondary"}>
                {extensionStatus?.isSharing ? "Conectado" : "Desconectado"}
              </Badge>
            </div>

            {/* Seu ID para a Extensão */}
            <div className="space-y-2">
              <Label>Seu ID de Usuário (para a extensão)</Label>
              <div className="flex gap-2">
                <Input
                  value={userData?.id || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUserId}
                  title="Copiar ID"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole este ID na extensão do Chrome para vincular seu monitoramento
              </p>
            </div>

            {/* Botão de Download */}
            <div className="pt-2 space-y-3">
              <Button 
                variant="default" 
                className="w-full gap-2"
                onClick={downloadExtension}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading ? 'Gerando ZIP...' : 'Baixar Extensão (Chrome/Edge)'}
              </Button>
              
              <ExtensionInstallManual />
            </div>
          </CardContent>
        </Card>

        <LocationConsentCard />
      </div>
    </div>
  );
}
