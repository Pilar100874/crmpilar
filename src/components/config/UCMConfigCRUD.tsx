import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save } from "lucide-react";
import { UCMAjudaGuia } from "./UCMAjudaGuia";
import { UCMTesteLigacao } from "./UCMTesteLigacao";
import { invalidarRegrasDiscagem } from "@/lib/telefonia/regrasDiscagem";
import { prepararNumeroDiscagem } from "@/lib/telefonia/numeroDiscagem";

interface UCMConfigCRUDProps {
  estabelecimentoId: string;
}

interface UCMConfig {
  id?: string;
  ucm_host: string;
  remote_ip?: string;
  sip_porta?: number | string | null;
  sip_porta_alternativa?: number | string | null;
  ramal_portaria?: string | null;
  ucm_user: string;
  ucm_password: string;
  enabled: boolean;
  is_local: boolean;
  conference_room_number?: string;
  conference_room_password?: string;
  discagem_regras_ativas?: boolean;
  discagem_ddd_local?: string | null;
  discagem_prefixo_outro_ddd?: string | null;
}

export function UCMConfigCRUD({ estabelecimentoId }: UCMConfigCRUDProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<UCMConfig>({
    ucm_host: "",
    remote_ip: "",
    sip_porta: 8089,
    sip_porta_alternativa: 8089,
    ramal_portaria: "",
    ucm_user: "",
    ucm_password: "",
    enabled: true,
    is_local: true,
    conference_room_number: "",
    conference_room_password: "",
    discagem_regras_ativas: true,
    discagem_ddd_local: "11",
    discagem_prefixo_outro_ddd: "015",
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
          // O acesso é sempre externo: o mesmo endereço/porta vale para todos os usos.
          remote_ip: config.ucm_host,
          sip_porta: config.sip_porta ? Number(config.sip_porta) : 8089,
          sip_porta_alternativa: config.sip_porta ? Number(config.sip_porta) : 8089,
          ramal_portaria: config.ramal_portaria || null,
          ucm_user: config.ucm_user,
          ucm_password: config.ucm_password,
          enabled: config.enabled,
          is_local: false,
          conference_room_number: config.conference_room_number || null,
          conference_room_password: config.conference_room_password || null,
          discagem_regras_ativas: config.discagem_regras_ativas ?? true,
          discagem_ddd_local: (config.discagem_ddd_local || "").replace(/\D/g, "") || null,
          discagem_prefixo_outro_ddd: (config.discagem_prefixo_outro_ddd || "").replace(/\D/g, "") || null,
        }, {
          onConflict: 'estabelecimento_id'
        });

      if (error) throw error;

      invalidarRegrasDiscagem();
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Configuração PABX Grandstream UCM</CardTitle>
            <CardDescription>
              Configure a integração com o PABX Grandstream UCM6510 via API HTTPS
            </CardDescription>
          </div>
          <UCMAjudaGuia />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-3 space-y-4">
          <div>
            <Label>Telefonia do estabelecimento</Label>
            <p className="text-xs text-muted-foreground">
              Estes dados valem para todos os usuários do estabelecimento (Pilar Fone web, APK, TV e portaria).
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-2">
              <Label htmlFor="ucm_host">Servidor do UCM (endereço externo)</Label>
              <Input
                id="ucm_host"
                placeholder="ucm.empresa.com ou IP fixo"
                value={config.ucm_host}
                onChange={(e) => setConfig({ ...config, ucm_host: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Endereço público (IP fixo ou domínio) do UCM, sem https://. É o único endereço usado pelo sistema.
              </p>
            </div>
            <div className="space-y-2 w-24">
              <Label htmlFor="sip_porta">Porta</Label>
              <Input
                id="sip_porta"
                type="number"
                placeholder="8089"
                value={config.sip_porta ?? ""}
                onChange={(e) => setConfig({ ...config, sip_porta: e.target.value })}
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="ramal_portaria">Ramal da TV/portaria</Label>
            <Input
              id="ramal_portaria"
              placeholder="2000"
              value={config.ramal_portaria || ""}
              onChange={(e) => setConfig({ ...config, ramal_portaria: e.target.value })}
            />
          </div>
        </div>


        <div className="rounded-lg border border-border p-3 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Regras de discagem</Label>
              <p className="text-xs text-muted-foreground">
                Define como o número do cadastro é discado: o código do país (55) é sempre retirado,
                o DDD da própria cidade não é discado e os demais DDDs recebem o código da operadora na frente.
              </p>
            </div>
            <Switch
              id="discagem_regras_ativas"
              checked={config.discagem_regras_ativas ?? true}
              onCheckedChange={(checked) => setConfig({ ...config, discagem_regras_ativas: checked })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discagem_ddd_local">DDD da sua cidade</Label>
              <Input
                id="discagem_ddd_local"
                inputMode="numeric"
                placeholder="11"
                maxLength={3}
                value={config.discagem_ddd_local ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, discagem_ddd_local: e.target.value.replace(/\D/g, "") })
                }
                disabled={!(config.discagem_regras_ativas ?? true)}
              />
              <p className="text-xs text-muted-foreground">
                Ligações para este DDD são discadas só com o número.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discagem_prefixo_outro_ddd">Código antes de outros DDDs</Label>
              <Input
                id="discagem_prefixo_outro_ddd"
                inputMode="numeric"
                placeholder="015"
                maxLength={5}
                value={config.discagem_prefixo_outro_ddd ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    discagem_prefixo_outro_ddd: e.target.value.replace(/\D/g, ""),
                  })
                }
                disabled={!(config.discagem_regras_ativas ?? true)}
              />
              <p className="text-xs text-muted-foreground">
                Discado automaticamente antes do DDD quando a cidade for diferente.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-xs space-y-1">
            <p className="font-medium">Como vai discar:</p>
            <p>
              55 {config.discagem_ddd_local || "11"} 99961-1194 →{" "}
              <span className="font-mono">
                {prepararNumeroDiscagem(`55${config.discagem_ddd_local || "11"}999611194`, {
                  ativas: config.discagem_regras_ativas ?? true,
                  dddLocal: config.discagem_ddd_local || "",
                  prefixoOutroDdd: config.discagem_prefixo_outro_ddd || "",
                })}
              </span>
            </p>
            <p>
              55 21 99961-1194 →{" "}
              <span className="font-mono">
                {prepararNumeroDiscagem("5521999611194", {
                  ativas: config.discagem_regras_ativas ?? true,
                  dddLocal: config.discagem_ddd_local || "",
                  prefixoOutroDdd: config.discagem_prefixo_outro_ddd || "",
                })}
              </span>
            </p>
          </div>
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

      <div className="space-y-2">
        <Label htmlFor="conference_room_number">Número da Sala de Conferência (Opcional)</Label>
        <Input
          id="conference_room_number"
          placeholder="Ex: 8000"
          value={config.conference_room_number || ""}
          onChange={(e) => setConfig({ ...config, conference_room_number: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Número para discar no UCM para iniciar conferências multiponto
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="conference_room_password">Senha da Sala de Conferência (Opcional)</Label>
        <Input
          id="conference_room_password"
          type="password"
          placeholder="Senha da sala de conferência"
          value={config.conference_room_password || ""}
          onChange={(e) => setConfig({ ...config, conference_room_password: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Senha configurada na sala de conferência do UCM
        </p>
      </div>


        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
          <Label htmlFor="enabled">Integração ativa</Label>
        </div>

        <UCMTesteLigacao />

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
