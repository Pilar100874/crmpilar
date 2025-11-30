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
    exemplo: `{
  "base_url": "https://api.mercadolivre.com.br",
  "search_endpoint": "/sites/MLB/search",
  "access_token": "SEU_TOKEN_AQUI",
  "params": {
    "limit": 10
  }
}`
  },
  scraping: {
    label: "Scraping",
    icon: Globe,
    color: "bg-purple-500/20 text-purple-400",
    exemplo: `{
  "url_busca": "https://site.com/busca?q={TERMO}",
  "seletor_preco": ".price-tag",
  "seletor_nome": ".product-title",
  "seletor_link": "a.product-link",
  "timeout_ms": 5000
}`
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
}`
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
    ativo: true
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const estabelecimentoId = await getEstabelecimentoId();
      let configJson = {};
      try {
        configJson = data.config_json ? JSON.parse(data.config_json) : {};
      } catch {
        throw new Error("JSON de configuração inválido");
      }
      
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
      let configJson = {};
      try {
        configJson = data.config_json ? JSON.parse(data.config_json) : {};
      } catch {
        throw new Error("JSON de configuração inválido");
      }
      
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
      ativo: true
    });
  };

  const handleEdit = (fonte: FontePesquisa) => {
    setEditingFonte(fonte);
    setFormData({
      nome_fonte: fonte.nome_fonte,
      tipo: fonte.tipo,
      config_json: JSON.stringify(fonte.config_json, null, 2),
      ativo: fonte.ativo
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

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Exemplo de configuração para {tipoConfig[formData.tipo].label}:</strong>
                  <pre className="mt-2 text-[10px] bg-muted p-2 rounded overflow-x-auto">
                    {tipoConfig[formData.tipo].exemplo}
                  </pre>
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
