import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/lib/toast-config";
import { 
  Save, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  AlertCircle, 
  Navigation, 
  CheckCircle2,
  Loader2,
  Trash2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface PedagioAPIConfigCRUDProps {
  estabelecimentoId: string;
}

interface PedagioConfig {
  id: string;
  provider: string;
  api_key: string;
  ativo: boolean;
  configuracoes: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const PROVIDERS = [
  {
    id: "tollguru",
    name: "TollGuru",
    description: "API internacional com suporte a mais de 60 países",
    url: "https://tollguru.com",
    apiKeyPlaceholder: "Sua TollGuru API Key",
    docsUrl: "https://tollguru.com/developers/docs",
    fields: [
      { key: "vehicle_type", label: "Tipo de Veículo Padrão", type: "select", options: [
        { value: "2AxlesAuto", label: "Carro (2 eixos)" },
        { value: "3AxlesAuto", label: "Caminhonete (3 eixos)" },
        { value: "2AxlesTruck", label: "Caminhão (2 eixos)" },
        { value: "3AxlesTruck", label: "Caminhão (3 eixos)" },
        { value: "4AxlesTruck", label: "Caminhão (4 eixos)" },
        { value: "5AxlesTruck", label: "Caminhão (5 eixos)" },
        { value: "6AxlesTruck", label: "Caminhão (6+ eixos)" },
        { value: "2AxlesBus", label: "Ônibus (2 eixos)" },
        { value: "3AxlesBus", label: "Ônibus (3 eixos)" },
        { value: "Motorcycle", label: "Moto" },
      ]},
      { key: "currency", label: "Moeda", type: "select", options: [
        { value: "BRL", label: "Real (BRL)" },
        { value: "USD", label: "Dólar (USD)" },
        { value: "EUR", label: "Euro (EUR)" },
      ]},
    ]
  },
  {
    id: "calcular_pedagio",
    name: "CalcularPedagio.com.br",
    description: "API brasileira especializada em pedágios nacionais",
    url: "https://calcularpedagio.com.br",
    apiKeyPlaceholder: "Sua API Key do CalcularPedagio",
    docsUrl: "https://calcularpedagio.com.br/docs",
    fields: [
      { key: "tipo_veiculo", label: "Tipo de Veículo Padrão", type: "select", options: [
        { value: "carro", label: "Carro" },
        { value: "moto", label: "Moto" },
        { value: "caminhao_2_eixos", label: "Caminhão (2 eixos)" },
        { value: "caminhao_3_eixos", label: "Caminhão (3 eixos)" },
        { value: "caminhao_4_eixos", label: "Caminhão (4 eixos)" },
        { value: "caminhao_5_eixos", label: "Caminhão (5 eixos)" },
        { value: "caminhao_6_eixos", label: "Caminhão (6+ eixos)" },
        { value: "onibus", label: "Ônibus" },
      ]},
      { key: "incluir_retorno", label: "Incluir Retorno", type: "boolean" },
    ]
  }
];

export default function PedagioAPIConfigCRUD({ estabelecimentoId }: PedagioAPIConfigCRUDProps) {
  const [configs, setConfigs] = useState<PedagioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PedagioConfig | null>(null);
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [configuracoes, setConfiguracoes] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, [estabelecimentoId]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("pedagio_api_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações de pedágio");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProvider("");
    setApiKey("");
    setAtivo(true);
    setConfiguracoes({});
    setEditingId(null);
  };

  const handleEdit = (config: PedagioConfig) => {
    setEditingId(config.id);
    setSelectedProvider(config.provider);
    setApiKey(config.api_key);
    setAtivo(config.ativo);
    setConfiguracoes(config.configuracoes || {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvider || !apiKey.trim()) {
      toast.error("Selecione um provedor e informe a API Key");
      return;
    }

    setSaving(true);
    try {
      // Se está ativando, desativa todos os outros primeiro
      if (ativo) {
        const otherActiveConfigs = configs.filter(c => c.id !== editingId && c.ativo);
        for (const otherConfig of otherActiveConfigs) {
          await (supabase as any)
            .from("pedagio_api_config")
            .update({ ativo: false })
            .eq("id", otherConfig.id);
        }
      }

      const payload = {
        estabelecimento_id: estabelecimentoId,
        provider: selectedProvider,
        api_key: apiKey.trim(),
        ativo,
        configuracoes,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("pedagio_api_config")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Configuração atualizada com sucesso");
      } else {
        // Check if provider already exists
        const existing = configs.find(c => c.provider === selectedProvider);
        if (existing) {
          toast.error("Este provedor já está configurado. Edite a configuração existente.");
          setSaving(false);
          return;
        }

        const { error } = await (supabase as any)
          .from("pedagio_api_config")
          .insert(payload);

        if (error) throw error;
        toast.success("Configuração salva com sucesso");
      }

      resetForm();
      loadConfigs();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (config: PedagioConfig) => {
    try {
      // Se está ativando, desativa todos os outros primeiro
      if (!config.ativo) {
        const otherActiveConfigs = configs.filter(c => c.id !== config.id && c.ativo);
        for (const otherConfig of otherActiveConfigs) {
          await (supabase as any)
            .from("pedagio_api_config")
            .update({ ativo: false })
            .eq("id", otherConfig.id);
        }
      }

      const { error } = await (supabase as any)
        .from("pedagio_api_config")
        .update({ ativo: !config.ativo })
        .eq("id", config.id);

      if (error) throw error;
      toast.success(config.ativo ? "Provedor desativado" : "Provedor ativado");
      loadConfigs();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from("pedagio_api_config")
        .delete()
        .eq("id", configToDelete.id);

      if (error) throw error;
      toast.success("Configuração excluída");
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      loadConfigs();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir configuração");
    }
  };

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId);
  };

  const selectedProviderInfo = getProviderInfo(selectedProvider);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de Configurações Existentes */}
      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provedores Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => {
                  const provider = getProviderInfo(config.provider);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{provider?.name || config.provider}</div>
                            <div className="text-xs text-muted-foreground">{provider?.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {showApiKey[config.id] 
                              ? config.api_key 
                              : `${config.api_key.substring(0, 8)}...`}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowApiKey(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                          >
                            {showApiKey[config.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.ativo}
                            onCheckedChange={() => handleToggleAtivo(config)}
                          />
                          <Badge variant={config.ativo ? "default" : "secondary"}>
                            {config.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setConfigToDelete(config);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-5 w-5" />
            {editingId ? "Editar Configuração" : "Adicionar Provedor de Pedágio"}
          </CardTitle>
          <CardDescription>
            Configure APIs para cálculo automático de pedágios em rotas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seleção de Provedor */}
            <div className="space-y-2">
              <Label>Provedor de API *</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={(value) => {
                  setSelectedProvider(value);
                  setConfiguracoes({});
                }}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um provedor" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          - {provider.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProviderInfo && (
              <>
                {/* Informações do Provedor */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-semibold text-sm">Como obter a API Key:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                      <li>
                        Acesse{" "}
                        <a
                          href={selectedProviderInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {selectedProviderInfo.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Crie uma conta ou faça login</li>
                      <li>
                        Acesse a área de desenvolvedores ou API Keys{" "}
                        <a
                          href={selectedProviderInfo.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          (Documentação)
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Gere uma nova API Key e copie aqui</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type={showApiKey["new"] ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={selectedProviderInfo.apiKeyPlaceholder}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showApiKey["new"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Campos Específicos do Provedor */}
                {selectedProviderInfo.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.type === "select" && (
                      <Select
                        value={configuracoes[field.key] || ""}
                        onValueChange={(value) => 
                          setConfiguracoes(prev => ({ ...prev, [field.key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "boolean" && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={configuracoes[field.key] || false}
                          onCheckedChange={(checked) =>
                            setConfiguracoes(prev => ({ ...prev, [field.key]: checked }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {configuracoes[field.key] ? "Sim" : "Não"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Status Ativo */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ativo}
                    onCheckedChange={setAtivo}
                  />
                  <Label>Ativar este provedor</Label>
                </div>
              </>
            )}

            {/* Botões */}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !selectedProvider}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a configuração do provedor{" "}
              <strong>{getProviderInfo(configToDelete?.provider || "")?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
