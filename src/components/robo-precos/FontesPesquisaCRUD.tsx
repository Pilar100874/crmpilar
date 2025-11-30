import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Database, Globe, FileSpreadsheet, Info, Loader2 } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface FontePesquisa {
  id: string;
  nome_fonte: string;
  tipo: 'api' | 'scraping' | 'arquivo_importado';
  config_json: any;
  ativo: boolean;
  created_at: string;
}

const tipoConfig = {
  api: {
    label: "API",
    icon: Database,
    color: "bg-blue-500/20 text-blue-400",
    exemplo: `// 1️⃣ MERCADO LIVRE (MLB) - API Pública
{
  "tipo_api": "mercado_livre",
  "site_id": "MLB",
  "limite_resultados": 20,
  "min_score_aceite": 0.45,
  "bonus_ean": 0.5
}

// 2️⃣ AMAZON (Product Advertising API)
{
  "tipo_api": "amazon",
  "region": "us-east-1",
  "marketplace": "www.amazon.com.br",
  "access_key": "SUA_ACCESS_KEY",
  "secret_key": "SUA_SECRET_KEY",
  "partner_tag": "SEU_TAG-20",
  "limite_resultados": 10,
  "min_score_aceite": 0.40
}

// 3️⃣ GOOGLE MERCHANT CENTER
{
  "tipo_api": "google_merchant",
  "merchant_id": "123456789",
  "client_email": "service@projeto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
  "limite_resultados": 20,
  "min_score_aceite": 0.40
}`,
    ajuda: `🎯 DRIVERS DISPONÍVEIS:

📦 MERCADO LIVRE (mercado_livre)
• API pública, não requer autenticação
• site_id: MLB (Brasil), MLA (Argentina), MLM (México)

🛒 AMAZON (amazon)
• Requer cadastro no Amazon Associates
• Obter credenciais em affiliate-program.amazon.com

🛍️ GOOGLE MERCHANT (google_merchant)
• Requer conta Google Cloud com Service Account
• merchant_id: ID do Merchant Center

⚙️ PARÂMETROS COMUNS:
• limite_resultados: quantidade de itens a analisar
• min_score_aceite: score mínimo (0-1) para aceitar match
• bonus_ean: bônus no score se EAN coincidir

📌 REGRA: Busca sempre pelo NOME DO PRODUTO`
  },
  scraping: {
    label: "Scraping",
    icon: Globe,
    color: "bg-purple-500/20 text-purple-400",
    exemplo: `{
  "url_busca": "https://site.com/busca?q={TERMO}",
  "regex_preco": "R\\\\$\\\\s*([\\\\d.,]+)",
  "regex_titulo": "<h1[^>]*>([^<]+)</h1>",
  "timeout_ms": 5000
}`,
    ajuda: `Use {TERMO} na URL para substituir pelo nome do produto.
Configure regex para extrair preço e título da página.
⚠️ IMPORTANTE: Use apenas em sites com permissão.`
  },
  arquivo_importado: {
    label: "Arquivo",
    icon: FileSpreadsheet,
    color: "bg-green-500/20 text-green-400",
    exemplo: `{
  "formato": "csv",
  "separador": ";",
  "encoding": "utf-8",
  "tem_cabecalho": true
}`,
    ajuda: `Importe planilhas de preços de concorrentes.
O sistema buscará produtos pelo NOME (similaridade Jaccard).
EAN/SKU são usados para bonus de validação.`
  }
};

export function FontesPesquisaCRUD() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingFonte, setEditingFonte] = useState<FontePesquisa | null>(null);
  const [formData, setFormData] = useState({
    nome_fonte: "",
    tipo: "api" as 'api' | 'scraping' | 'arquivo_importado',
    config_json: "",
    ativo: true,
    // Campos específicos para APIs
    tipo_api: "mercado_livre" as string,
    // Mercado Livre
    ml_client_id: "",
    ml_client_secret: "",
    ml_site_id: "MLB",
    // Amazon
    amazon_access_key: "",
    amazon_secret_key: "",
    amazon_partner_tag: "",
    amazon_region: "us-east-1",
    // Google Merchant
    google_merchant_id: "",
    google_client_email: "",
    google_private_key: "",
    // Comum
    limite_resultados: "20",
    min_score_aceite: "0.45",
    bonus_ean: "0.5",
  });

  const { data: fontes, isLoading } = useQuery({
    queryKey: ['fontes_pesquisa_precos'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('fontes_pesquisa_precos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FontePesquisa[];
    }
  });

  // Função para construir config_json a partir dos campos do formulário
  const buildConfigJson = (data: typeof formData) => {
    if (data.tipo !== 'api') {
      // Para scraping/arquivo, usar JSON manual
      try {
        return data.config_json ? JSON.parse(data.config_json) : {};
      } catch {
        return {};
      }
    }

    const baseConfig: Record<string, any> = {
      tipo_api: data.tipo_api,
      limite_resultados: parseInt(data.limite_resultados) || 20,
      min_score_aceite: parseFloat(data.min_score_aceite) || 0.45,
      bonus_ean: parseFloat(data.bonus_ean) || 0.5,
    };

    switch (data.tipo_api) {
      case 'mercado_livre':
        return {
          ...baseConfig,
          site_id: data.ml_site_id || 'MLB',
          client_id: data.ml_client_id || '',
          client_secret: data.ml_client_secret || '',
        };
      case 'amazon':
        return {
          ...baseConfig,
          region: data.amazon_region || 'us-east-1',
          marketplace: 'www.amazon.com.br',
          access_key: data.amazon_access_key || '',
          secret_key: data.amazon_secret_key || '',
          partner_tag: data.amazon_partner_tag || '',
        };
      case 'google_merchant':
        return {
          ...baseConfig,
          merchant_id: data.google_merchant_id || '',
          client_email: data.google_client_email || '',
          private_key: data.google_private_key || '',
        };
      default:
        return baseConfig;
    }
  };

  // Função para extrair campos do config_json
  const parseConfigToFields = (config: any) => {
    return {
      tipo_api: config?.tipo_api || 'mercado_livre',
      ml_client_id: config?.client_id || '',
      ml_client_secret: config?.client_secret || '',
      ml_site_id: config?.site_id || 'MLB',
      amazon_access_key: config?.access_key || '',
      amazon_secret_key: config?.secret_key || '',
      amazon_partner_tag: config?.partner_tag || '',
      amazon_region: config?.region || 'us-east-1',
      google_merchant_id: config?.merchant_id || '',
      google_client_email: config?.client_email || '',
      google_private_key: config?.private_key || '',
      limite_resultados: String(config?.limite_resultados || 20),
      min_score_aceite: String(config?.min_score_aceite || 0.45),
      bonus_ean: String(config?.bonus_ean || 0.5),
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const estabelecimentoId = await getEstabelecimentoId();
      const configJson = buildConfigJson(data);
      
      const { error } = await supabase.from('fontes_pesquisa_precos').insert({
        estabelecimento_id: estabelecimentoId,
        nome_fonte: data.nome_fonte,
        tipo: data.tipo,
        config_json: configJson,
        ativo: data.ativo
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      setShowDialog(false);
      resetForm();
      toast.success("Fonte criada com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const configJson = buildConfigJson(data);
      
      const { error } = await supabase.from('fontes_pesquisa_precos')
        .update({
          nome_fonte: data.nome_fonte,
          tipo: data.tipo,
          config_json: configJson,
          ativo: data.ativo
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      setShowDialog(false);
      setEditingFonte(null);
      resetForm();
      toast.success("Fonte atualizada");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fontes_pesquisa_precos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      toast.success("Fonte excluída");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      nome_fonte: "",
      tipo: "api",
      config_json: "",
      ativo: true,
      tipo_api: "mercado_livre",
      ml_client_id: "",
      ml_client_secret: "",
      ml_site_id: "MLB",
      amazon_access_key: "",
      amazon_secret_key: "",
      amazon_partner_tag: "",
      amazon_region: "us-east-1",
      google_merchant_id: "",
      google_client_email: "",
      google_private_key: "",
      limite_resultados: "20",
      min_score_aceite: "0.45",
      bonus_ean: "0.5",
    });
  };

  const handleEdit = (fonte: FontePesquisa) => {
    setEditingFonte(fonte);
    const parsedFields = parseConfigToFields(fonte.config_json);
    setFormData({
      nome_fonte: fonte.nome_fonte,
      tipo: fonte.tipo,
      config_json: JSON.stringify(fonte.config_json, null, 2),
      ativo: fonte.ativo,
      ...parsedFields,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_fonte) {
      toast.error("Nome da fonte é obrigatório");
      return;
    }
    
    if (editingFonte) {
      updateMutation.mutate({ ...formData, id: editingFonte.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const TipoIcon = tipoConfig[formData.tipo].icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fontes de Pesquisa</CardTitle>
          <CardDescription>Configure APIs, sites para scraping ou arquivos de preços</CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingFonte(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Fonte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFonte ? "Editar Fonte" : "Nova Fonte de Pesquisa"}</DialogTitle>
              <DialogDescription>Configure uma fonte para monitorar preços</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Fonte *</Label>
                <Input
                  value={formData.nome_fonte}
                  onChange={(e) => setFormData(p => ({ ...p, nome_fonte: e.target.value }))}
                  placeholder="Ex: Mercado Livre, Amazon, Concorrente X"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        API
                      </div>
                    </SelectItem>
                    <SelectItem value="scraping">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Scraping
                      </div>
                    </SelectItem>
                    <SelectItem value="arquivo_importado">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Arquivo Importado
                      </div>
                    </SelectItem>
                  </SelectContent>
              </Select>
              </div>

              {/* Campos específicos para API */}
              {formData.tipo === 'api' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de API</Label>
                    <Select value={formData.tipo_api} onValueChange={(v) => setFormData(p => ({ ...p, tipo_api: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="google_merchant">Google Merchant / Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Credenciais Mercado Livre */}
                  {formData.tipo_api === 'mercado_livre' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-blue-500">
                        <Database className="h-4 w-4" />
                        Credenciais Mercado Livre
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Client ID</Label>
                          <Input
                            value={formData.ml_client_id}
                            onChange={(e) => setFormData(p => ({ ...p, ml_client_id: e.target.value }))}
                            placeholder="Ex: 1234567890123456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Client Secret</Label>
                          <Input
                            type="password"
                            value={formData.ml_client_secret}
                            onChange={(e) => setFormData(p => ({ ...p, ml_client_secret: e.target.value }))}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Site ID</Label>
                        <Select value={formData.ml_site_id} onValueChange={(v) => setFormData(p => ({ ...p, ml_site_id: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MLB">MLB - Brasil</SelectItem>
                            <SelectItem value="MLA">MLA - Argentina</SelectItem>
                            <SelectItem value="MLM">MLM - México</SelectItem>
                            <SelectItem value="MLC">MLC - Chile</SelectItem>
                            <SelectItem value="MCO">MCO - Colômbia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <Info className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-xs">
                          Obtenha suas credenciais em <a href="https://developers.mercadolibre.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">developers.mercadolibre.com.br</a>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Amazon */}
                  {formData.tipo_api === 'amazon' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-orange-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-orange-500">
                        <Database className="h-4 w-4" />
                        Credenciais Amazon Product Advertising API
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Access Key</Label>
                          <Input
                            value={formData.amazon_access_key}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_access_key: e.target.value }))}
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Secret Key</Label>
                          <Input
                            type="password"
                            value={formData.amazon_secret_key}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_secret_key: e.target.value }))}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Partner Tag</Label>
                          <Input
                            value={formData.amazon_partner_tag}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_partner_tag: e.target.value }))}
                            placeholder="meutag-20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Região</Label>
                          <Select value={formData.amazon_region} onValueChange={(v) => setFormData(p => ({ ...p, amazon_region: v }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="us-east-1">us-east-1 (Brasil)</SelectItem>
                              <SelectItem value="us-west-2">us-west-2</SelectItem>
                              <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Alert className="bg-orange-500/10 border-orange-500/20">
                        <Info className="h-4 w-4 text-orange-500" />
                        <AlertDescription className="text-xs">
                          Cadastre-se no <a href="https://affiliate-program.amazon.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">Amazon Associates</a> e acesse o Product Advertising API.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Google Merchant */}
                  {formData.tipo_api === 'google_merchant' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-green-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-green-500">
                        <Database className="h-4 w-4" />
                        Credenciais Google Merchant Center
                      </h4>
                      <div className="space-y-2">
                        <Label>Merchant ID</Label>
                        <Input
                          value={formData.google_merchant_id}
                          onChange={(e) => setFormData(p => ({ ...p, google_merchant_id: e.target.value }))}
                          placeholder="123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Email (Service Account)</Label>
                        <Input
                          value={formData.google_client_email}
                          onChange={(e) => setFormData(p => ({ ...p, google_client_email: e.target.value }))}
                          placeholder="service@projeto.iam.gserviceaccount.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Private Key</Label>
                        <Textarea
                          value={formData.google_private_key}
                          onChange={(e) => setFormData(p => ({ ...p, google_private_key: e.target.value }))}
                          placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                          className="font-mono text-xs min-h-[100px]"
                        />
                      </div>
                      <Alert className="bg-green-500/10 border-green-500/20">
                        <Info className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-xs">
                          Configure uma Service Account no <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-green-500 underline">Google Cloud Console</a> com acesso ao Merchant Center.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Parâmetros comuns */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Parâmetros de Busca</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Limite de Resultados</Label>
                        <Input
                          type="number"
                          value={formData.limite_resultados}
                          onChange={(e) => setFormData(p => ({ ...p, limite_resultados: e.target.value }))}
                          min={1}
                          max={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Score Mínimo (0-1)</Label>
                        <Input
                          type="number"
                          step="0.05"
                          value={formData.min_score_aceite}
                          onChange={(e) => setFormData(p => ({ ...p, min_score_aceite: e.target.value }))}
                          min={0}
                          max={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bônus EAN (0-1)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.bonus_ean}
                          onChange={(e) => setFormData(p => ({ ...p, bonus_ean: e.target.value }))}
                          min={0}
                          max={1}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Para scraping e arquivo, mostrar JSON manual */}
              {formData.tipo !== 'api' && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Exemplo de configuração para {tipoConfig[formData.tipo].label}:</strong>
                      <pre className="mt-2 text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {tipoConfig[formData.tipo].exemplo}
                      </pre>
                      <p className="mt-2 text-muted-foreground">
                        {tipoConfig[formData.tipo].ajuda}
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Configuração (JSON)</Label>
                    <Textarea
                      value={formData.config_json}
                      onChange={(e) => setFormData(p => ({ ...p, config_json: e.target.value }))}
                      placeholder="Cole aqui o JSON de configuração..."
                      className="font-mono text-xs min-h-[200px]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, ativo: checked }))}
                />
                <Label>Fonte ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingFonte ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : fontes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma fonte cadastrada. Clique em "Nova Fonte" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fontes?.map((fonte) => {
                const config = tipoConfig[fonte.tipo];
                const Icon = config.icon;
                return (
                  <TableRow key={fonte.id}>
                    <TableCell className="font-medium">{fonte.nome_fonte}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fonte.ativo ? "default" : "secondary"}>
                        {fonte.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(fonte)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir esta fonte?")) {
                            deleteMutation.mutate(fonte.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
