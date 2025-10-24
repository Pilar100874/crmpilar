import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";

interface ResendConfig {
  id: string;
  estabelecimento_id: string;
  api_key: string;
  from_email: string;
  from_name: string;
}

export function ResendCRUD() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ResendConfig | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Form states
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");

  useEffect(() => {
    fetchEstabelecimentoAndConfig();
  }, []);

  const fetchEstabelecimentoAndConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar estabelecimento do usuário
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .single();

      if (usuario?.estabelecimento_id) {
        setEstabelecimentoId(usuario.estabelecimento_id);
        
        // Buscar configuração existente
        const { data: configData } = await supabase
          .from('resend_config')
          .select('*')
          .eq('estabelecimento_id', usuario.estabelecimento_id)
          .single();

        if (configData) {
          setConfig(configData);
          setApiKey(configData.api_key);
          setFromEmail(configData.from_email);
          setFromName(configData.from_name);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !fromEmail || !fromName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (!estabelecimentoId) {
      toast({
        title: "Erro",
        description: "Estabelecimento não encontrado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (config) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('resend_config')
          .update({
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .eq('id', config.id);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "As configurações do Resend foram atualizadas com sucesso.",
        });
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('resend_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          });

        if (error) throw error;
        toast({
          title: "✓ Configuração salva!",
          description: "As configurações do Resend foram salvas com sucesso.",
        });
      }

      fetchEstabelecimentoAndConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Configuração Resend</span>
            <a 
              href="https://resend.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              resend.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardTitle>
          <CardDescription>
            Configure o serviço Resend para envio de emails do seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold">Como obter as credenciais:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>
                  Acesse{" "}
                  <a 
                    href="https://resend.com/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    resend.com/signup
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {" "}e crie uma conta
                </li>
                <li>
                  Verifique seu domínio em{" "}
                  <a 
                    href="https://resend.com/domains" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Domains
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Gere uma API Key em{" "}
                  <a 
                    href="https://resend.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    API Keys
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Cole a API Key e configure o email remetente abaixo</li>
              </ol>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="api-key">
                API Key * 
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  (começa com "re_")
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxx"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="from-email">
                Email Remetente *
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  (deve ser do domínio verificado)
                </span>
              </Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@seudominio.com"
              />
            </div>

            <div>
              <Label htmlFor="from-name">
                Nome do Remetente *
              </Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Minha Empresa"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : config ? "Atualizar Configuração" : "Salvar Configuração"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}