import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertCircle, ExternalLink, Eye, EyeOff, Mail } from "lucide-react";

interface ResendConfigSectionProps {
  estabelecimentoId: string;
}

export function ResendConfigSection({ estabelecimentoId }: ResendConfigSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadResendConfig();
  }, [estabelecimentoId]);

  const loadResendConfig = async () => {
    try {
      const { data } = await supabase
        .from('resend_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setApiKey(data.api_key);
        setFromEmail(data.from_email);
        setFromName(data.from_name);
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

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('resend_config')
          .update({
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "As configurações do Resend foram atualizadas.",
        });
      } else {
        const { data, error } = await supabase
          .from('resend_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "As configurações do Resend foram salvas.",
        });
      }

      loadResendConfig();
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
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="font-semibold text-sm">Como obter as credenciais:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
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
          </ol>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key *</Label>
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

        <div className="space-y-2">
          <Label htmlFor="from-email">Email Remetente *</Label>
          <Input
            id="from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@seudominio.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="from-name">Nome do Remetente *</Label>
          <Input
            id="from-name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Minha Empresa"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : configId ? "Atualizar" : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
