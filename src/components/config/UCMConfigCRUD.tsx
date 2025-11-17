import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save } from "lucide-react";

interface UCMConfigCRUDProps {
  estabelecimentoId: string;
}

interface UCMConfig {
  id?: string;
  ucm_host: string;
  ucm_user: string;
  ucm_password: string;
  enabled: boolean;
  is_local: boolean;
}

export function UCMConfigCRUD({ estabelecimentoId }: UCMConfigCRUDProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<UCMConfig>({
    ucm_host: "",
    ucm_user: "",
    ucm_password: "",
    enabled: true,
    is_local: true,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [estabelecimentoId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("ucm_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configuração UCM:", error);
    }
  };

  const handleSave = async () => {
    if (!config.ucm_host || !config.ucm_user || !config.ucm_password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de configuração",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use upsert para inserir ou atualizar automaticamente
      const { error } = await supabase
        .from("ucm_config")
        .upsert({
          estabelecimento_id: estabelecimentoId,
          ucm_host: config.ucm_host,
          ucm_user: config.ucm_user,
          ucm_password: config.ucm_password,
          enabled: config.enabled,
          is_local: config.is_local,
        }, {
          onConflict: 'estabelecimento_id'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configuração UCM salva com sucesso",
      });

      await fetchConfig();
    } catch (error: any) {
      console.error("Erro ao salvar configuração UCM:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração UCM",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração PABX Grandstream UCM</CardTitle>
        <CardDescription>
          Configure a integração com o PABX Grandstream UCM6510 via API HTTPS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ucm_host">Host do UCM (IP ou domínio)</Label>
          <Input
            id="ucm_host"
            placeholder="192.168.1.100 ou ucm.empresa.com"
            value={config.ucm_host}
            onChange={(e) => setConfig({ ...config, ucm_host: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Endereço IP ou domínio do seu UCM6510 (sem https://)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ucm_user">Usuário API</Label>
          <Input
            id="ucm_user"
            placeholder="admin"
            value={config.ucm_user}
            onChange={(e) => setConfig({ ...config, ucm_user: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Usuário com permissões de API no UCM
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ucm_password">Senha</Label>
          <div className="relative">
            <Input
              id="ucm_password"
              type={showPassword ? "text" : "password"}
              placeholder="********"
              value={config.ucm_password}
              onChange={(e) => setConfig({ ...config, ucm_password: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_local"
            checked={config.is_local}
            onCheckedChange={(checked) => setConfig({ ...config, is_local: checked })}
          />
          <Label htmlFor="is_local">UCM na rede local</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Ative esta opção se o UCM estiver na sua rede local. Desative se o UCM estiver acessível via internet.
        </p>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
          <Label htmlFor="enabled">Integração ativa</Label>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configuração"}
        </Button>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Instruções:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Acesse o painel web do seu UCM6510</li>
            <li>Vá em System Settings → API Configuration</li>
            <li>Ative a API HTTPS e anote as credenciais</li>
            <li>Configure o webhook apontando para este sistema</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
