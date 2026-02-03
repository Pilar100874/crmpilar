import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { 
  FileText, Plus, Edit2, Trash2, Save, X, RefreshCw, 
  Variable, Copy, Check, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  nome: string;
  conteudo: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

interface EnvioMassaTemplatesCRUDProps {
  estabelecimentoId: string;
}

const VARIAVEIS_DISPONIVEIS = [
  { key: '{{contato}}', desc: 'Nome do contato' },
  { key: '{{empresa}}', desc: 'Empresa do contato' },
  { key: '{{whatsapp}}', desc: 'Número de WhatsApp' },
  { key: '{{email}}', desc: 'Email do contato' },
];

export function EnvioMassaTemplatesCRUD({ estabelecimentoId }: EnvioMassaTemplatesCRUDProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    loadTemplates();
  }, [estabelecimentoId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('envio_massa_templates')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        nome: template.nome,
        conteudo: template.conteudo,
        descricao: template.descricao || '',
        ativo: template.ativo
      });
    } else {
      setSelectedTemplate(null);
      setFormData({ nome: '', conteudo: '', descricao: '', ativo: true });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.conteudo.trim()) {
      toast.error('Preencha nome e conteúdo');
      return;
    }

    try {
      setSaving(true);

      if (selectedTemplate) {
        // Update
        const { error } = await supabase
          .from('envio_massa_templates')
          .update({
            nome: formData.nome,
            conteudo: formData.conteudo,
            descricao: formData.descricao || null,
            ativo: formData.ativo
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        // Insert
        const { error } = await supabase
          .from('envio_massa_templates')
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: formData.nome,
            conteudo: formData.conteudo,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
            ordem: templates.length
          });

        if (error) throw error;
        toast.success('Template criado!');
      }

      setDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('envio_massa_templates')
        .delete()
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      toast.success('Template removido!');
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      toast.error('Erro ao remover template');
    }
  };

  const handleToggleAtivo = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('envio_massa_templates')
        .update({ ativo: !template.ativo })
        .eq('id', template.id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      conteudo: prev.conteudo + variable
    }));
  };

  const renderPreview = (text: string) => {
    return text
      .replace(/\{\{contato\}\}/gi, 'João Silva')
      .replace(/\{\{empresa\}\}/gi, 'Empresa ABC')
      .replace(/\{\{whatsapp\}\}/gi, '(11) 99999-9999')
      .replace(/\{\{email\}\}/gi, 'joao@empresa.com');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Carregando templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates de Mensagens
            </CardTitle>
            <CardDescription>
              Crie templates com variáveis para usar no envio em massa. 
              As variáveis serão substituídas pelos dados de cada contato.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum template cadastrado</p>
              <p className="text-sm">Crie seu primeiro template para usar no envio em massa</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    "transition-all",
                    !template.ativo && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{template.nome}</h4>
                          {!template.ativo && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                          {template.conteudo}
                        </p>
                        {template.descricao && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {template.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={template.ativo}
                          onCheckedChange={() => handleToggleAtivo(template)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variáveis disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Variable className="h-4 w-4" />
            Variáveis Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VARIAVEIS_DISPONIVEIS.map((v) => (
              <div
                key={v.key}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
              >
                <div>
                  <code className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                    {v.key}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">{v.desc}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyVariable(v.key)}
                >
                  {copiedVar === v.key ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Use as variáveis para personalizar a mensagem para cada contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input
                placeholder="Ex: Boas-vindas, Promoção de Verão..."
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição para identificação interna"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo da Mensagem *</Label>
                <div className="flex gap-1">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.key.replace(/\{\{|\}\}/g, '')}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Digite sua mensagem aqui. Use {{contato}} para inserir o nome do contato, {{empresa}} para a empresa, etc."
                value={formData.conteudo}
                onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                rows={6}
              />
            </div>

            {formData.conteudo && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Preview</Label>
                <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
                  {renderPreview(formData.conteudo)}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Template ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o template "{selectedTemplate?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
