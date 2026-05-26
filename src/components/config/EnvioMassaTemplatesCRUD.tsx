import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { 
  FileText, Plus, Edit2, Trash2, Save, RefreshCw, 
  Variable, Copy, Check, Image, Video, BookOpen, Paperclip, ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import { TemplateContentEditor, ContentItem } from "./TemplateContentEditor";

interface Template {
  id: string;
  nome: string;
  conteudo: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  content_items: ContentItem[];
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  
  // View mode: 'list' or 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
    content_items: [] as ContentItem[]
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
      
      // Parse content_items from JSON
      const parsedData = (data || []).map(template => ({
        ...template,
        content_items: template.content_items ? 
          (typeof template.content_items === 'string' 
            ? JSON.parse(template.content_items) 
            : template.content_items) 
          : []
      }));
      
      setTemplates(parsedData);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setFormData({ nome: '', descricao: '', ativo: true, content_items: [] });
    setViewMode('form');
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      ativo: template.ativo,
      content_items: template.content_items || []
    });
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingTemplate(null);
    setFormData({ nome: '', descricao: '', ativo: true, content_items: [] });
  };

  // Helper to generate conteudo from content_items for backwards compatibility
  const generateConteudoFromItems = (items: ContentItem[]): string => {
    return items
      .filter(item => item.type === 'text')
      .map(item => item.content)
      .join('\n\n');
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Preencha o nome do template');
      return;
    }
    
    if (formData.content_items.length === 0) {
      toast.error('Adicione pelo menos um item de conteúdo');
      return;
    }

    try {
      setSaving(true);
      
      // Generate conteudo for backwards compatibility
      const conteudo = generateConteudoFromItems(formData.content_items);

      if (editingTemplate) {
        // Update
        const { error } = await supabase
          .from('envio_massa_templates')
          .update({
            nome: formData.nome,
            conteudo: conteudo,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
            content_items: formData.content_items
          } as any)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        // Insert
        const { error } = await supabase
          .from('envio_massa_templates')
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: formData.nome,
            conteudo: conteudo,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
            ordem: templates.length,
            content_items: formData.content_items
          } as any);

        if (error) throw error;
        toast.success('Template criado!');
      }

      handleBackToList();
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

  // Helper to get icon count for template preview
  const getContentSummary = (items: ContentItem[]) => {
    const counts = {
      text: items.filter(i => i.type === 'text').length,
      image: items.filter(i => i.type === 'image').length,
      video: items.filter(i => i.type === 'video').length,
      catalog: items.filter(i => i.type === 'catalog').length,
      file: items.filter(i => i.type === 'file').length,
    };
    return counts;
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

  // Form view (inline)
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={handleBackToList} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold truncate">
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Monte seu template com textos, mídias, catálogos e anexos.
            </p>
          </div>
        </div>


        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Template ativo</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conteúdo do Template</CardTitle>
              <CardDescription>
                Adicione textos, imagens, vídeos, catálogos e anexos. Arraste para reordenar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateContentEditor
                contentItems={formData.content_items}
                onContentChange={(items) => setFormData(prev => ({ ...prev, content_items: items }))}
                estabelecimentoId={estabelecimentoId}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sticky bottom-0 bg-background py-3 -mx-1 px-1 border-t sm:border-0">
            <Button variant="outline" onClick={handleBackToList} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Template
            </Button>
          </div>

        </div>

        {/* Delete confirmation dialog */}
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

  // List view
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">Templates de Mensagens</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Crie templates com textos, mídias, catálogos e anexos para usar no envio em massa.
            </CardDescription>
          </div>
          <Button onClick={handleNewTemplate} className="w-full sm:w-auto shrink-0">
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
              <Button onClick={handleNewTemplate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const summary = getContentSummary(template.content_items || []);
                return (
                  <Card
                    key={template.id}
                    className={cn(
                      "transition-all hover:shadow-md cursor-pointer",
                      !template.ativo && "opacity-60"
                    )}
                    onClick={() => handleEditTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{template.nome}</h4>
                          {template.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {template.descricao}
                            </p>
                          )}
                        </div>
                        {!template.ativo && (
                          <Badge variant="secondary" className="shrink-0">Inativo</Badge>
                        )}
                      </div>
                      
                      {/* Content summary badges */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {summary.text > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {summary.text}
                          </Badge>
                        )}
                        {summary.image > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            {summary.image}
                          </Badge>
                        )}
                        {summary.video > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Video className="h-3 w-3 mr-1" />
                            {summary.video}
                          </Badge>
                        )}
                        {summary.catalog > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {summary.catalog}
                          </Badge>
                        )}
                        {summary.file > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {summary.file}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={template.ativo}
                          onCheckedChange={() => handleToggleAtivo(template)}
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
