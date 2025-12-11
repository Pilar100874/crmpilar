import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, FileText, Settings2, Palette, Building2, Upload, Trash2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface ReportConfig {
  logo_url: string;
  empresa_nome: string;
  empresa_endereco: string;
  empresa_telefone: string;
  empresa_email: string;
  empresa_cnpj: string;
  empresa_website: string;
  titulo_relatorio: string;
  subtitulo_relatorio: string;
  mostrar_data: boolean;
  mostrar_numero_orcamento: boolean;
  mostrar_vendedor: boolean;
  mostrar_cliente_nome: boolean;
  mostrar_cliente_telefone: boolean;
  mostrar_cliente_email: boolean;
  mostrar_cliente_endereco: boolean;
  mostrar_condicao_pagamento: boolean;
  mostrar_observacoes: boolean;
  mostrar_codigo_produto: boolean;
  mostrar_descricao_produto: boolean;
  mostrar_quantidade: boolean;
  mostrar_preco_unitario: boolean;
  mostrar_desconto: boolean;
  mostrar_subtotal: boolean;
  mostrar_total: boolean;
  mostrar_assinatura: boolean;
  texto_rodape: string;
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulo: string;
  tamanho_fonte: string;
}

const defaultConfig: ReportConfig = {
  logo_url: "",
  empresa_nome: "",
  empresa_endereco: "",
  empresa_telefone: "",
  empresa_email: "",
  empresa_cnpj: "",
  empresa_website: "",
  titulo_relatorio: "ORÇAMENTO",
  subtitulo_relatorio: "",
  mostrar_data: true,
  mostrar_numero_orcamento: true,
  mostrar_vendedor: true,
  mostrar_cliente_nome: true,
  mostrar_cliente_telefone: true,
  mostrar_cliente_email: true,
  mostrar_cliente_endereco: false,
  mostrar_condicao_pagamento: true,
  mostrar_observacoes: true,
  mostrar_codigo_produto: true,
  mostrar_descricao_produto: true,
  mostrar_quantidade: true,
  mostrar_preco_unitario: true,
  mostrar_desconto: true,
  mostrar_subtotal: true,
  mostrar_total: true,
  mostrar_assinatura: true,
  texto_rodape: "Orçamento válido por 30 dias.",
  cor_primaria: "#f97316",
  cor_secundaria: "#fed7aa",
  fonte_titulo: "helvetica",
  tamanho_fonte: "normal",
};

interface OrcamentoReportConfigContentProps {
  estabelecimentoId: string;
}

export function OrcamentoReportConfigContent({ estabelecimentoId }: OrcamentoReportConfigContentProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localConfig, setLocalConfig] = useState<ReportConfig | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");

  // Usar useQuery para carregar a configuração de forma estável
  const { data: savedConfig, isLoading: configLoading, isSuccess } = useQuery({
    queryKey: ['orcamento-report-config', estabelecimentoId],
    queryFn: async () => {
      const { data: configData, error } = await supabase
        .from("orcamento_report_config" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (configData && !error) {
        const loadedConfig = (configData as any).config_json;
        // Sincroniza logoUrl quando carregar do banco
        if (loadedConfig.logo_url) {
          setLogoUrl(loadedConfig.logo_url);
        }
        return { ...defaultConfig, ...loadedConfig } as ReportConfig;
      }
      return defaultConfig;
    },
    enabled: !!estabelecimentoId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Config ativa: usa localConfig se existir (edições do usuário), senão savedConfig, senão default
  const config: ReportConfig = localConfig ?? savedConfig ?? defaultConfig;
  // Usa logoUrl do state dedicado se existir, senão usa do config
  const currentLogoUrl = logoUrl || config.logo_url;
  const configLoaded = !configLoading && isSuccess;
  
  // Função para atualizar config localmente
  const setConfig = (newConfig: ReportConfig | ((prev: ReportConfig) => ReportConfig)) => {
    if (typeof newConfig === 'function') {
      setLocalConfig(prev => newConfig(prev ?? savedConfig ?? defaultConfig));
    } else {
      setLocalConfig(newConfig);
    }
  };

  const saveConfigToDb = async (configToSave: ReportConfig) => {
    if (!estabelecimentoId) return false;
    
    try {
      const { data: existing } = await supabase
        .from("orcamento_report_config" as any)
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("orcamento_report_config" as any)
          .update({ config_json: configToSave, updated_at: new Date().toISOString() })
          .eq("id", (existing as any).id);
      } else {
        await supabase
          .from("orcamento_report_config" as any)
          .insert({ estabelecimento_id: estabelecimentoId, config_json: configToSave });
      }
      return true;
    } catch (error) {
      console.error("Erro ao salvar config:", error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!estabelecimentoId) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setLoading(true);
    try {
      const saved = await saveConfigToDb(config);
      if (saved) {
        toast.success("Configuração salva com sucesso!");
      } else {
        toast.error("Erro ao salvar configuração");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !estabelecimentoId) return;

    e.target.value = "";
    setUploading(true);
    
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${estabelecimentoId}/logo_orcamento.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("report-assets")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("report-assets")
        .getPublicUrl(fileName);

      const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Atualiza state dedicado imediatamente (força re-render)
      setLogoUrl(newLogoUrl);
      
      // Salva no banco
      const configToSave = { ...config, logo_url: newLogoUrl };
      await saveConfigToDb(configToSave);
      
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl("");
    
    const configToSave = { ...config, logo_url: "" };
    await saveConfigToDb(configToSave);
    toast.success("Logo removido!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Personalize o modelo do seu orçamento em PDF</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="campos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Campos</span>
          </TabsTrigger>
          <TabsTrigger value="estilo" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Estilo</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* Dados da Empresa */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={config.empresa_nome}
                    onChange={(e) => updateConfig("empresa_nome", e.target.value)}
                    placeholder="Razão Social ou Nome Fantasia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={config.empresa_cnpj}
                    onChange={(e) => updateConfig("empresa_cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={config.empresa_endereco}
                  onChange={(e) => updateConfig("empresa_endereco", e.target.value)}
                  placeholder="Rua, número, bairro - Cidade/UF"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={config.empresa_telefone}
                    onChange={(e) => updateConfig("empresa_telefone", e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={config.empresa_email}
                    onChange={(e) => updateConfig("empresa_email", e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={config.empresa_website}
                    onChange={(e) => updateConfig("empresa_website", e.target.value)}
                    placeholder="www.empresa.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Preview do Logo */}
                <div className="w-40 h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden">
                  {currentLogoUrl ? (
                    <img 
                      src={currentLogoUrl} 
                      alt="Logo da empresa"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum logo</p>
                    </div>
                  )}
                </div>
                
                {/* Botões */}
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  
                  {!currentLogoUrl ? (
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Enviando..." : "Procurar Logo"}
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById("logo-upload")?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Enviando..." : "Modificar"}
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleRemoveLogo}
                        disabled={uploading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG ou SVG (máx. 2MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Título e Subtítulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Relatório</Label>
                  <Input
                    value={config.titulo_relatorio}
                    onChange={(e) => updateConfig("titulo_relatorio", e.target.value)}
                    placeholder="ORÇAMENTO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo (opcional)</Label>
                  <Input
                    value={config.subtitulo_relatorio}
                    onChange={(e) => updateConfig("subtitulo_relatorio", e.target.value)}
                    placeholder="Proposta Comercial"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campos */}
        <TabsContent value="campos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cabeçalho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Data do Orçamento</Label>
                  <Switch
                    checked={config.mostrar_data}
                    onCheckedChange={(v) => updateConfig("mostrar_data", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Número do Orçamento</Label>
                  <Switch
                    checked={config.mostrar_numero_orcamento}
                    onCheckedChange={(v) => updateConfig("mostrar_numero_orcamento", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Vendedor</Label>
                  <Switch
                    checked={config.mostrar_vendedor}
                    onCheckedChange={(v) => updateConfig("mostrar_vendedor", v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Nome</Label>
                  <Switch
                    checked={config.mostrar_cliente_nome}
                    onCheckedChange={(v) => updateConfig("mostrar_cliente_nome", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Telefone</Label>
                  <Switch
                    checked={config.mostrar_cliente_telefone}
                    onCheckedChange={(v) => updateConfig("mostrar_cliente_telefone", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>E-mail</Label>
                  <Switch
                    checked={config.mostrar_cliente_email}
                    onCheckedChange={(v) => updateConfig("mostrar_cliente_email", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Endereço</Label>
                  <Switch
                    checked={config.mostrar_cliente_endereco}
                    onCheckedChange={(v) => updateConfig("mostrar_cliente_endereco", v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itens do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Código do Produto</Label>
                  <Switch
                    checked={config.mostrar_codigo_produto}
                    onCheckedChange={(v) => updateConfig("mostrar_codigo_produto", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Descrição</Label>
                  <Switch
                    checked={config.mostrar_descricao_produto}
                    onCheckedChange={(v) => updateConfig("mostrar_descricao_produto", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Quantidade</Label>
                  <Switch
                    checked={config.mostrar_quantidade}
                    onCheckedChange={(v) => updateConfig("mostrar_quantidade", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Preço Unitário</Label>
                  <Switch
                    checked={config.mostrar_preco_unitario}
                    onCheckedChange={(v) => updateConfig("mostrar_preco_unitario", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Desconto</Label>
                  <Switch
                    checked={config.mostrar_desconto}
                    onCheckedChange={(v) => updateConfig("mostrar_desconto", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Subtotal</Label>
                  <Switch
                    checked={config.mostrar_subtotal}
                    onCheckedChange={(v) => updateConfig("mostrar_subtotal", v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rodapé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Valor Total</Label>
                  <Switch
                    checked={config.mostrar_total}
                    onCheckedChange={(v) => updateConfig("mostrar_total", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Condição de Pagamento</Label>
                  <Switch
                    checked={config.mostrar_condicao_pagamento}
                    onCheckedChange={(v) => updateConfig("mostrar_condicao_pagamento", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Observações</Label>
                  <Switch
                    checked={config.mostrar_observacoes}
                    onCheckedChange={(v) => updateConfig("mostrar_observacoes", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Campo de Assinatura</Label>
                  <Switch
                    checked={config.mostrar_assinatura}
                    onCheckedChange={(v) => updateConfig("mostrar_assinatura", v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Texto do Rodapé</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={config.texto_rodape}
                  onChange={(e) => updateConfig("texto_rodape", e.target.value)}
                  placeholder="Texto que aparecerá no rodapé do relatório..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Estilo */}
        <TabsContent value="estilo">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Cores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cor Primária (Cabeçalhos)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={config.cor_primaria}
                      onChange={(e) => updateConfig("cor_primaria", e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.cor_primaria}
                      onChange={(e) => updateConfig("cor_primaria", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária (Destaques)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={config.cor_secundaria}
                      onChange={(e) => updateConfig("cor_secundaria", e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.cor_secundaria}
                      onChange={(e) => updateConfig("cor_secundaria", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipografia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fonte do Título</Label>
                  <Select
                    value={config.fonte_titulo}
                    onValueChange={(v) => updateConfig("fonte_titulo", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helvetica">Helvetica</SelectItem>
                      <SelectItem value="times">Times New Roman</SelectItem>
                      <SelectItem value="courier">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho da Fonte</Label>
                  <Select
                    value={config.tamanho_fonte}
                    onValueChange={(v) => updateConfig("tamanho_fonte", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeno</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div 
                className="bg-white text-black p-8 rounded-lg shadow-lg mx-auto"
                style={{ maxWidth: "210mm", minHeight: "297mm" }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b-2" style={{ borderColor: config.cor_primaria }}>
                  <div className="flex items-center gap-4">
                    {currentLogoUrl && (
                      <img 
                        src={currentLogoUrl} 
                        alt="Logo da empresa"
                        className="w-16 h-16 object-contain"
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: config.cor_primaria }}>
                        {config.empresa_nome || "Nome da Empresa"}
                      </h1>
                      {config.empresa_cnpj && <p className="text-xs text-gray-600">CNPJ: {config.empresa_cnpj}</p>}
                      {config.empresa_endereco && <p className="text-xs text-gray-600">{config.empresa_endereco}</p>}
                      <p className="text-xs text-gray-600">
                        {[config.empresa_telefone, config.empresa_email].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold" style={{ color: config.cor_primaria }}>
                      {config.titulo_relatorio}
                    </h2>
                    {config.subtitulo_relatorio && (
                      <p className="text-sm text-gray-600">{config.subtitulo_relatorio}</p>
                    )}
                    {config.mostrar_numero_orcamento && (
                      <p className="text-sm font-medium mt-2">Nº 0001</p>
                    )}
                    {config.mostrar_data && (
                      <p className="text-xs text-gray-600">{new Date().toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                </div>

                {/* Cliente Info */}
                <div className="mb-6 p-4 rounded" style={{ backgroundColor: config.cor_secundaria + "40" }}>
                  <h3 className="font-semibold mb-2" style={{ color: config.cor_primaria }}>CLIENTE</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {config.mostrar_cliente_nome && <p><strong>Nome:</strong> Cliente Exemplo</p>}
                    {config.mostrar_cliente_telefone && <p><strong>Telefone:</strong> (11) 99999-9999</p>}
                    {config.mostrar_cliente_email && <p><strong>E-mail:</strong> cliente@email.com</p>}
                    {config.mostrar_cliente_endereco && <p><strong>Endereço:</strong> Rua Exemplo, 123</p>}
                  </div>
                  {config.mostrar_vendedor && (
                    <p className="text-sm mt-2"><strong>Vendedor:</strong> João Silva</p>
                  )}
                </div>

                {/* Tabela de Itens */}
                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr style={{ backgroundColor: config.cor_primaria, color: "white" }}>
                      {config.mostrar_codigo_produto && <th className="p-2 text-left">Código</th>}
                      {config.mostrar_descricao_produto && <th className="p-2 text-left">Descrição</th>}
                      {config.mostrar_quantidade && <th className="p-2 text-center">Qtd</th>}
                      {config.mostrar_preco_unitario && <th className="p-2 text-right">Preço Unit.</th>}
                      {config.mostrar_desconto && <th className="p-2 text-right">Desc.</th>}
                      {config.mostrar_subtotal && <th className="p-2 text-right">Subtotal</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      {config.mostrar_codigo_produto && <td className="p-2">001</td>}
                      {config.mostrar_descricao_produto && <td className="p-2">Produto Exemplo A</td>}
                      {config.mostrar_quantidade && <td className="p-2 text-center">2</td>}
                      {config.mostrar_preco_unitario && <td className="p-2 text-right">R$ 150,00</td>}
                      {config.mostrar_desconto && <td className="p-2 text-right">10%</td>}
                      {config.mostrar_subtotal && <td className="p-2 text-right">R$ 270,00</td>}
                    </tr>
                    <tr className="border-b">
                      {config.mostrar_codigo_produto && <td className="p-2">002</td>}
                      {config.mostrar_descricao_produto && <td className="p-2">Produto Exemplo B</td>}
                      {config.mostrar_quantidade && <td className="p-2 text-center">1</td>}
                      {config.mostrar_preco_unitario && <td className="p-2 text-right">R$ 200,00</td>}
                      {config.mostrar_desconto && <td className="p-2 text-right">-</td>}
                      {config.mostrar_subtotal && <td className="p-2 text-right">R$ 200,00</td>}
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                {config.mostrar_total && (
                  <div className="flex justify-end mb-6">
                    <div className="text-right p-4 rounded" style={{ backgroundColor: config.cor_secundaria + "40" }}>
                      <p className="text-lg font-bold" style={{ color: config.cor_primaria }}>
                        TOTAL: R$ 470,00
                      </p>
                    </div>
                  </div>
                )}

                {/* Condição de Pagamento */}
                {config.mostrar_condicao_pagamento && (
                  <p className="text-sm mb-4"><strong>Condição de Pagamento:</strong> 30/60/90 dias</p>
                )}

                {/* Observações */}
                {config.mostrar_observacoes && (
                  <div className="mb-6 p-3 bg-gray-100 rounded text-sm">
                    <strong>Observações:</strong>
                    <p className="text-gray-600">Exemplo de observações do orçamento...</p>
                  </div>
                )}

                {/* Rodapé */}
                {config.texto_rodape && (
                  <p className="text-xs text-gray-500 text-center mb-6">{config.texto_rodape}</p>
                )}

                {/* Assinatura */}
                {config.mostrar_assinatura && (
                  <div className="mt-12 pt-4 border-t flex justify-around">
                    <div className="text-center">
                      <div className="w-48 border-b border-gray-400 mb-1"></div>
                      <p className="text-xs text-gray-600">Assinatura do Cliente</p>
                    </div>
                    <div className="text-center">
                      <div className="w-48 border-b border-gray-400 mb-1"></div>
                      <p className="text-xs text-gray-600">Assinatura do Vendedor</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
