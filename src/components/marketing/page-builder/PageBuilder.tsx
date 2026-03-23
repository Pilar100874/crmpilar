import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, GripVertical, Plus, Trash2, Eye, Code, Image, Video, Type,
  ChevronDown, ChevronUp, Settings, Palette, Layout, Bot, ArrowDown,
  Sparkles, FileText, Monitor, Smartphone, Tablet, Copy, Save, Loader2,
  PanelRightOpen, PanelRightClose, Columns, Square, AlignLeft, Link,
  ExternalLink, Upload, FolderOpen, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PageSection {
  id: string;
  type: 'hero' | 'text' | 'image' | 'video' | 'gallery' | 'cta' | 'features' | 'testimonials' | 'faq' | 'footer' | 'custom_html' | 'spacer';
  title: string;
  content: Record<string, any>;
  visible: boolean;
  styles: Record<string, string>;
}

interface PageConfig {
  title: string;
  description: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontDisplay: string;
  fontBody: string;
  maxWidth: string;
}

interface SavedPage {
  id: string;
  nome: string;
  slug: string;
  sections: any;
  config: any;
  publicado: boolean;
  created_at: string;
  updated_at: string;
}

// ── Section Templates ──────────────────────────────────────────────────────────
const SECTION_TEMPLATES: { type: PageSection['type']; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'hero', label: 'Hero', icon: <Layout className="h-4 w-4" />, description: 'Seção principal com título, subtítulo e CTA' },
  { type: 'text', label: 'Texto', icon: <Type className="h-4 w-4" />, description: 'Bloco de texto livre' },
  { type: 'image', label: 'Imagem', icon: <Image className="h-4 w-4" />, description: 'Imagem com legenda' },
  { type: 'video', label: 'Vídeo', icon: <Video className="h-4 w-4" />, description: 'Player de vídeo' },
  { type: 'features', label: 'Recursos', icon: <Columns className="h-4 w-4" />, description: 'Grade de recursos/benefícios' },
  { type: 'testimonials', label: 'Depoimentos', icon: <FileText className="h-4 w-4" />, description: 'Carrossel de depoimentos' },
  { type: 'cta', label: 'CTA', icon: <Square className="h-4 w-4" />, description: 'Call-to-action com botão' },
  { type: 'faq', label: 'FAQ', icon: <AlignLeft className="h-4 w-4" />, description: 'Perguntas frequentes' },
  { type: 'gallery', label: 'Galeria', icon: <Image className="h-4 w-4" />, description: 'Grid de imagens' },
  { type: 'footer', label: 'Rodapé', icon: <Layout className="h-4 w-4" />, description: 'Rodapé do site' },
  { type: 'spacer', label: 'Espaçador', icon: <ArrowDown className="h-4 w-4" />, description: 'Espaço vertical' },
  { type: 'custom_html', label: 'HTML Custom', icon: <Code className="h-4 w-4" />, description: 'Código HTML personalizado' },
];

const defaultContent: Record<PageSection['type'], Record<string, any>> = {
  hero: { headline: 'Título Principal', subheadline: 'Subtítulo descritivo do seu negócio', cta_text: 'Começar Agora', cta_url: '#', background_image: '' },
  text: { body: 'Seu texto aqui...', alignment: 'left' },
  image: { url: '', alt: '', caption: '', fit: 'cover' },
  video: { url: '', poster: '', autoplay: false },
  features: { items: [{ icon: '🚀', title: 'Recurso 1', description: 'Descrição' }, { icon: '⚡', title: 'Recurso 2', description: 'Descrição' }, { icon: '🎯', title: 'Recurso 3', description: 'Descrição' }] },
  testimonials: { items: [{ name: 'Cliente', role: 'Cargo', text: 'Depoimento...', avatar: '' }] },
  cta: { headline: 'Pronto para começar?', description: 'Não perca essa oportunidade', button_text: 'Fale Conosco', button_url: '#', style: 'primary' },
  faq: { items: [{ question: 'Pergunta?', answer: 'Resposta.' }] },
  gallery: { images: [] },
  footer: { company: 'Sua Empresa', links: [{ label: 'Contato', url: '#' }], copyright: `© ${new Date().getFullYear()}` },
  spacer: { height: '60' },
  custom_html: { code: '<div>Seu HTML aqui</div>' },
};

// ── Sortable Section Item ──────────────────────────────────────────────────────
const SortableSectionItem: React.FC<{
  section: PageSection;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
}> = ({ section, isSelected, onSelect, onDelete, onToggleVisible }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const tpl = SECTION_TEMPLATES.find(t => t.type === section.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors border",
        isSelected ? "bg-primary/10 border-primary" : "bg-card border-transparent hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="text-sm">{tpl?.icon}</span>
      <span className={cn("flex-1 text-sm truncate", !section.visible && "line-through text-muted-foreground")}>{section.title}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}>
        <Eye className={cn("h-3 w-3", !section.visible && "opacity-30")} />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ── Media Picker (Gallery) ─────────────────────────────────────────────────────
const MediaPicker: React.FC<{ onSelect: (url: string) => void; type?: 'image' | 'video' }> = ({ onSelect, type = 'image' }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const tipoFilter = type === 'video' ? ['video'] : ['imagem', 'image', 'gif'];
      const { data } = await supabase
        .from('media_gallery')
        .select('id, nome, tipo, public_url, thumbnail_url, created_at')
        .eq('estabelecimento_id', estabId)
        .in('tipo', tipoFilter)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    })();
  }, [type]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.public_url)}
          className="relative aspect-video rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all group"
        >
          {type === 'video' ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <img src={item.thumbnail_url || item.public_url} alt={item.nome} className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {item.nome}
          </div>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-3 text-center text-sm text-muted-foreground py-4">Nenhuma mídia encontrada</p>}
    </div>
  );
};

// ── Strategy Text Picker (Enhanced with agent filter + artifacts) ──────────────
const StrategyTextPicker: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string>('all');
  const [sourceTab, setSourceTab] = useState<'memory' | 'artifacts'>('memory');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const { data: projs } = await supabase
        .from('strategy_projects')
        .select('id, nome, strategic_memory')
        .eq('estabelecimento_id', estabId)
        .order('updated_at', { ascending: false })
        .limit(10);
      const projectList = projs || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        const projectIds = projectList.map((p: any) => p.id);
        const { data: arts } = await supabase
          .from('strategy_artifacts')
          .select('id, tipo, conteudo, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(50);
        setArtifacts(arts || []);
      }
      if (projs[0]) {
        setSelectedProject(projs[0].id);
        setMemory((projs[0].strategic_memory as Record<string, any>) || {});
      }
      setLoading(false);
    })();
  }, []);

  const handleProjectChange = (id: string) => {
    setSelectedProject(id);
    const p = projects.find(p => p.id === id);
    setMemory((p?.strategic_memory as Record<string, any>) || {});
  };

  const extractTexts = (obj: any, prefix = ''): { path: string; text: string }[] => {
    const results: { path: string; text: string }[] = [];
    if (!obj) return results;
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'string' && val.length > 10 && val.length < 2000) {
        results.push({ path, text: val });
      } else if (Array.isArray(val)) {
        val.forEach((item, i) => {
          if (typeof item === 'string' && item.length > 5) results.push({ path: `${path}[${i}]`, text: item });
          else if (typeof item === 'object') results.push(...extractTexts(item, `${path}[${i}]`));
        });
      } else if (typeof val === 'object' && val !== null) {
        results.push(...extractTexts(val, path));
      }
    }
    return results;
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const agentKeys = Object.keys(memory);
  const filteredKeys = activeAgent === 'all' ? agentKeys : agentKeys.filter(k => k === activeAgent);
  const projectArtifacts = artifacts.filter(a => a.project_id === selectedProject);

  return (
    <div className="space-y-3">
      {projects.length > 1 && (
        <Select value={selectedProject || ''} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Selecione projeto" /></SelectTrigger>
          <SelectContent className="bg-popover">
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="memory" className="flex-1 text-xs">Memória Estratégica</TabsTrigger>
          <TabsTrigger value="artifacts" className="flex-1 text-xs">Artefatos dos Agentes</TabsTrigger>
        </TabsList>

        <TabsContent value="memory" className="mt-2">
          {agentKeys.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge
                variant={activeAgent === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setActiveAgent('all')}
              >Todos</Badge>
              {agentKeys.map(k => (
                <Badge
                  key={k}
                  variant={activeAgent === k ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setActiveAgent(k)}
                >{k}</Badge>
              ))}
            </div>
          )}
          <ScrollArea className="h-[260px]">
            {filteredKeys.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado estratégico disponível.</p>}
            {filteredKeys.map(agentKey => {
              const texts = extractTexts(memory[agentKey]);
              if (texts.length === 0) return null;
              return (
                <div key={agentKey} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{agentKey}</p>
                  {texts.slice(0, 12).map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onSelect(t.text)}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30"
                    >
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="artifacts" className="mt-2">
          <ScrollArea className="h-[280px]">
            {projectArtifacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum artefato encontrado. Execute agentes no Motor de Estratégia.</p>}
            {projectArtifacts.map(art => {
              const texts = extractTexts(art.conteudo as any);
              if (texts.length === 0) return null;
              return (
                <div key={art.id} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{art.tipo}</p>
                  {texts.slice(0, 10).map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onSelect(t.text)}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30"
                    >
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Site Builder Agent Viewer (Enhanced with auto-import) ─────────────────────
const SiteBuilderAgentViewer: React.FC<{
  onImportSections?: (sections: PageSection[], config?: Partial<PageConfig>) => void;
}> = ({ onImportSections }) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const { data } = await supabase
        .from('strategy_projects')
        .select('strategic_memory')
        .eq('estabelecimento_id', estabId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const mem = (data?.strategic_memory as Record<string, any>) || {};
      setResult(mem.site_builder || null);
      setLoading(false);
    })();
  }, []);

  const handleImport = () => {
    if (!result || !onImportSections) return;
    setImporting(true);

    try {
      const importedSections: PageSection[] = [];
      const r = result;

      // Try to extract sections from Site Builder output
      if (r.headline || r.titulo || r.hero_headline) {
        importedSections.push({
          id: `hero-imp-${Date.now()}`, type: 'hero', title: 'Hero (Importado)', visible: true, styles: {},
          content: {
            headline: r.hero_headline || r.headline || r.titulo || '',
            subheadline: r.hero_subheadline || r.subheadline || r.subtitulo || r.descricao || '',
            cta_text: r.cta_text || r.hero_cta || 'Saiba Mais',
            cta_url: r.cta_url || '#',
            background_image: r.hero_image || '',
          }
        });
      }

      if (r.features || r.recursos || r.beneficios) {
        const items = r.features || r.recursos || r.beneficios || [];
        if (Array.isArray(items) && items.length > 0) {
          importedSections.push({
            id: `feat-imp-${Date.now()}`, type: 'features', title: 'Recursos (Importado)', visible: true, styles: {},
            content: {
              items: items.slice(0, 6).map((f: any) => ({
                icon: f.icon || f.icone || '✨',
                title: f.title || f.titulo || f.name || f.nome || '',
                description: f.description || f.descricao || '',
              }))
            }
          });
        }
      }

      if (r.testimonials || r.depoimentos) {
        const items = r.testimonials || r.depoimentos || [];
        if (Array.isArray(items) && items.length > 0) {
          importedSections.push({
            id: `test-imp-${Date.now()}`, type: 'testimonials', title: 'Depoimentos (Importado)', visible: true, styles: {},
            content: {
              items: items.map((t: any) => ({
                name: t.name || t.nome || 'Cliente',
                role: t.role || t.cargo || '',
                text: t.text || t.texto || t.depoimento || '',
              }))
            }
          });
        }
      }

      if (r.faq || r.perguntas_frequentes) {
        const items = r.faq || r.perguntas_frequentes || [];
        if (Array.isArray(items) && items.length > 0) {
          importedSections.push({
            id: `faq-imp-${Date.now()}`, type: 'faq', title: 'FAQ (Importado)', visible: true, styles: {},
            content: {
              items: items.map((q: any) => ({
                question: q.question || q.pergunta || '',
                answer: q.answer || q.resposta || '',
              }))
            }
          });
        }
      }

      if (r.cta || r.chamada_acao) {
        const cta = r.cta || r.chamada_acao || {};
        importedSections.push({
          id: `cta-imp-${Date.now()}`, type: 'cta', title: 'CTA (Importado)', visible: true, styles: {},
          content: {
            headline: cta.headline || cta.titulo || r.cta_headline || 'Pronto para começar?',
            description: cta.description || cta.descricao || '',
            button_text: cta.button_text || cta.texto_botao || 'Entrar em Contato',
            button_url: cta.button_url || cta.url || '#',
          }
        });
      }

      // Extract config hints
      const configHints: Partial<PageConfig> = {};
      if (r.title || r.titulo_pagina) configHints.title = r.title || r.titulo_pagina;
      if (r.primary_color || r.cor_primaria) configHints.primaryColor = r.primary_color || r.cor_primaria;
      if (r.accent_color || r.cor_destaque) configHints.accentColor = r.accent_color || r.cor_destaque;

      if (importedSections.length > 0) {
        onImportSections(importedSections, configHints);
        toast.success(`${importedSections.length} seções importadas do Site Builder!`);
      } else {
        // Fallback: try to extract any text content as sections
        const texts = extractTextsFlat(r);
        if (texts.length > 0) {
          const textSections: PageSection[] = texts.slice(0, 5).map((t, i) => ({
            id: `text-imp-${Date.now()}-${i}`, type: 'text' as const, title: `Texto ${i + 1} (Importado)`, visible: true, styles: {},
            content: { body: t, alignment: 'left' }
          }));
          onImportSections(textSections, configHints);
          toast.success(`${textSections.length} blocos de texto importados!`);
        } else {
          toast.info('O output do Site Builder não contém seções estruturadas reconhecíveis.');
        }
      }
    } catch (e) {
      toast.error('Erro ao importar dados do agente');
    }
    setImporting(false);
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!result) return <p className="text-sm text-muted-foreground text-center py-6">O agente Site Builder ainda não foi executado. Execute-o no Motor de Estratégia.</p>;

  return (
    <div className="space-y-3">
      {onImportSections && (
        <Button variant="default" size="sm" className="w-full gap-2" onClick={handleImport} disabled={importing}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Importar Seções do Site Builder
        </Button>
      )}
      <ScrollArea className="h-[350px]">
        <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
      </ScrollArea>
    </div>
  );
};

function extractTextsFlat(obj: any): string[] {
  const results: string[] = [];
  if (!obj) return results;
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' && val.length > 20 && val.length < 2000) results.push(val);
    else if (Array.isArray(val)) val.forEach(item => { if (typeof item === 'string' && item.length > 20) results.push(item); });
    else if (typeof val === 'object' && val !== null) results.push(...extractTextsFlat(val));
  }
  return results;
}

// ── Section Editor ─────────────────────────────────────────────────────────────
const SectionEditor: React.FC<{
  section: PageSection;
  onChange: (updated: PageSection) => void;
}> = ({ section, onChange }) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string>('');
  const [strategyTarget, setStrategyTarget] = useState<string>('');

  const updateContent = (key: string, value: any) => {
    onChange({ ...section, content: { ...section.content, [key]: value } });
  };

  const openMediaPicker = (targetKey: string) => {
    setMediaPickerTarget(targetKey);
    setShowMediaPicker(true);
  };

  const openStrategyPicker = (targetKey: string) => {
    setStrategyTarget(targetKey);
    setShowStrategyPicker(true);
  };

  const StrategyButton: React.FC<{ targetKey: string }> = ({ targetKey }) => (
    <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => openStrategyPicker(targetKey)}>
      <Sparkles className="h-3 w-3" /> Estratégia
    </Button>
  );

  const renderFields = () => {
    switch (section.type) {
      case 'hero':
        return (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Título</Label>
                <StrategyButton targetKey="headline" />
              </div>
              <Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Subtítulo</Label>
                <StrategyButton targetKey="subheadline" />
              </div>
              <Textarea value={section.content.subheadline} onChange={e => updateContent('subheadline', e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Texto do Botão</Label>
                <Input value={section.content.cta_text} onChange={e => updateContent('cta_text', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">URL do Botão</Label>
                <Input value={section.content.cta_url} onChange={e => updateContent('cta_url', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Imagem de Fundo</Label>
              <div className="flex gap-2 mt-1">
                <Input value={section.content.background_image} onChange={e => updateContent('background_image', e.target.value)} placeholder="URL da imagem" className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => openMediaPicker('background_image')}><Image className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Conteúdo</Label>
              <StrategyButton targetKey="body" />
            </div>
            <Textarea value={section.content.body} onChange={e => updateContent('body', e.target.value)} rows={5} />
          </div>
        );
      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">URL da Imagem</Label>
              <div className="flex gap-2 mt-1">
                <Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => openMediaPicker('url')}><Image className="h-4 w-4" /></Button>
              </div>
            </div>
            {section.content.url && <img src={section.content.url} alt="" className="w-full max-h-40 object-contain rounded border" />}
            <Input value={section.content.alt} onChange={e => updateContent('alt', e.target.value)} placeholder="Texto alternativo" />
            <Input value={section.content.caption} onChange={e => updateContent('caption', e.target.value)} placeholder="Legenda (opcional)" />
          </div>
        );
      case 'video':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">URL do Vídeo</Label>
              <div className="flex gap-2 mt-1">
                <Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" placeholder="URL do vídeo ou embed" />
                <Button variant="outline" size="sm" onClick={() => { setMediaPickerTarget('url'); setShowMediaPicker(true); }}><Video className="h-4 w-4" /></Button>
              </div>
            </div>
            {section.content.url && <video src={section.content.url} controls className="w-full max-h-40 rounded border" />}
          </div>
        );
      case 'cta':
        return (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Título</Label>
                <StrategyButton targetKey="headline" />
              </div>
              <Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Descrição</Label>
                <StrategyButton targetKey="description" />
              </div>
              <Textarea value={section.content.description} onChange={e => updateContent('description', e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={section.content.button_text} onChange={e => updateContent('button_text', e.target.value)} placeholder="Texto do botão" />
              <Input value={section.content.button_url} onChange={e => updateContent('button_url', e.target.value)} placeholder="URL" />
            </div>
          </div>
        );
      case 'features':
        return (
          <div className="space-y-3">
            {(section.content.items || []).map((item: any, i: number) => (
              <Card key={i} className="p-2">
                <div className="grid grid-cols-[40px_1fr] gap-2">
                  <Input value={item.icon} onChange={e => {
                    const items = [...section.content.items]; items[i] = { ...item, icon: e.target.value }; updateContent('items', items);
                  }} className="text-center" />
                  <Input value={item.title} onChange={e => {
                    const items = [...section.content.items]; items[i] = { ...item, title: e.target.value }; updateContent('items', items);
                  }} placeholder="Título" />
                </div>
                <Textarea value={item.description} onChange={e => {
                  const items = [...section.content.items]; items[i] = { ...item, description: e.target.value }; updateContent('items', items);
                }} rows={1} className="mt-1" placeholder="Descrição" />
                <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => {
                  const items = section.content.items.filter((_: any, idx: number) => idx !== i); updateContent('items', items);
                }}>Remover</Button>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { icon: '✨', title: 'Novo', description: 'Descrição' }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-3">
            {(section.content.items || []).map((item: any, i: number) => (
              <Card key={i} className="p-2 space-y-1">
                <Input value={item.question} onChange={e => {
                  const items = [...section.content.items]; items[i] = { ...item, question: e.target.value }; updateContent('items', items);
                }} placeholder="Pergunta" />
                <Textarea value={item.answer} onChange={e => {
                  const items = [...section.content.items]; items[i] = { ...item, answer: e.target.value }; updateContent('items', items);
                }} rows={2} placeholder="Resposta" />
                <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => {
                  const items = section.content.items.filter((_: any, idx: number) => idx !== i); updateContent('items', items);
                }}>Remover</Button>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { question: 'Pergunta?', answer: 'Resposta.' }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(section.content.images || []).map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => updateContent('images', section.content.images.filter((_: any, idx: number) => idx !== i))}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => openMediaPicker('gallery_add')}>
              <Image className="h-3 w-3 mr-1" /> Adicionar da Galeria
            </Button>
          </div>
        );
      case 'spacer':
        return (
          <div>
            <Label className="text-xs">Altura (px)</Label>
            <Input type="number" value={section.content.height} onChange={e => updateContent('height', e.target.value)} />
          </div>
        );
      case 'custom_html':
        return (
          <div>
            <Label className="text-xs">Código HTML</Label>
            <Textarea value={section.content.code} onChange={e => updateContent('code', e.target.value)} rows={8} className="font-mono text-xs" />
          </div>
        );
      case 'footer':
        return (
          <div className="space-y-3">
            <Input value={section.content.company} onChange={e => updateContent('company', e.target.value)} placeholder="Nome da empresa" />
            <Input value={section.content.copyright} onChange={e => updateContent('copyright', e.target.value)} placeholder="Copyright" />
          </div>
        );
      case 'testimonials':
        return (
          <div className="space-y-3">
            {(section.content.items || []).map((item: any, i: number) => (
              <Card key={i} className="p-2 space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={item.name} onChange={e => {
                    const items = [...section.content.items]; items[i] = { ...item, name: e.target.value }; updateContent('items', items);
                  }} placeholder="Nome" />
                  <Input value={item.role} onChange={e => {
                    const items = [...section.content.items]; items[i] = { ...item, role: e.target.value }; updateContent('items', items);
                  }} placeholder="Cargo" />
                </div>
                <Textarea value={item.text} onChange={e => {
                  const items = [...section.content.items]; items[i] = { ...item, text: e.target.value }; updateContent('items', items);
                }} rows={2} placeholder="Depoimento" />
                <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => {
                  const items = section.content.items.filter((_: any, idx: number) => idx !== i); updateContent('items', items);
                }}>Remover</Button>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { name: 'Cliente', role: '', text: 'Depoimento...' }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground">Editor não disponível para este tipo.</p>;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Título da Seção</Label>
        <Input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} />
      </div>
      <Separator />
      {renderFields()}

      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Selecionar Mídia da Galeria</DialogTitle></DialogHeader>
          <MediaPicker
            type={section.type === 'video' || mediaPickerTarget === 'video_url' ? 'video' : 'image'}
            onSelect={(url) => {
              if (mediaPickerTarget === 'gallery_add') {
                updateContent('images', [...(section.content.images || []), url]);
              } else {
                updateContent(mediaPickerTarget, url);
              }
              setShowMediaPicker(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showStrategyPicker} onOpenChange={setShowStrategyPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Importar Texto do Motor de Estratégia</DialogTitle></DialogHeader>
          <StrategyTextPicker onSelect={(text) => {
            updateContent(strategyTarget, text);
            setShowStrategyPicker(false);
            toast.success('Texto importado!');
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Preview Renderer ───────────────────────────────────────────────────────────
const SectionPreview: React.FC<{ section: PageSection; config: PageConfig }> = ({ section, config }) => {
  if (!section.visible) return null;
  const c = section.content;

  switch (section.type) {
    case 'hero':
      return (
        <div className="relative py-20 px-6 text-center" style={{
          backgroundImage: c.background_image ? `url(${c.background_image})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: c.background_image ? undefined : config.primaryColor,
          color: '#fff',
        }}>
          {c.background_image && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: config.fontDisplay }}>{c.headline}</h1>
            <p className="text-lg md:text-xl mb-8 opacity-90">{c.subheadline}</p>
            <a href={c.cta_url} className="inline-block px-8 py-3 rounded-lg font-semibold text-lg" style={{ backgroundColor: config.accentColor, color: '#fff' }}>{c.cta_text}</a>
          </div>
        </div>
      );
    case 'text':
      return <div className="py-10 px-6 max-w-3xl mx-auto" style={{ textAlign: c.alignment as any }}><p className="text-base leading-relaxed whitespace-pre-wrap">{c.body}</p></div>;
    case 'image':
      return (
        <div className="py-8 px-6 max-w-4xl mx-auto text-center">
          {c.url ? <img src={c.url} alt={c.alt} className="w-full rounded-lg shadow-lg" style={{ objectFit: c.fit }} /> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Image className="h-10 w-10 text-muted-foreground" /></div>}
          {c.caption && <p className="text-sm text-muted-foreground mt-2">{c.caption}</p>}
        </div>
      );
    case 'video':
      return (
        <div className="py-8 px-6 max-w-4xl mx-auto">
          {c.url ? <video src={c.url} controls poster={c.poster} className="w-full rounded-lg shadow-lg" /> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Video className="h-10 w-10 text-muted-foreground" /></div>}
        </div>
      );
    case 'features':
      return (
        <div className="py-12 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(c.items || []).map((item: any, i: number) => (
              <div key={i} className="text-center p-6 rounded-xl bg-card border">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div className="py-16 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: '#fff' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{c.headline}</h2>
          <p className="text-lg mb-6 opacity-90">{c.description}</p>
          <a href={c.button_url} className="inline-block px-8 py-3 rounded-lg font-semibold" style={{ backgroundColor: config.accentColor }}>{c.button_text}</a>
        </div>
      );
    case 'testimonials':
      return (
        <div className="py-12 px-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(c.items || []).map((item: any, i: number) => (
              <div key={i} className="p-6 rounded-xl bg-card border italic">
                <p className="mb-3">"{item.text}"</p>
                <p className="text-sm font-semibold not-italic">{item.name}{item.role ? ` — ${item.role}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'faq':
      return (
        <div className="py-12 px-6 max-w-3xl mx-auto space-y-4">
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">{item.question}</h4>
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      );
    case 'gallery':
      return (
        <div className="py-8 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(c.images || []).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
            ))}
          </div>
        </div>
      );
    case 'footer':
      return (
        <div className="py-8 px-6 text-center border-t bg-muted/30">
          <p className="font-semibold mb-2">{c.company}</p>
          <p className="text-xs text-muted-foreground">{c.copyright}</p>
        </div>
      );
    case 'spacer':
      return <div style={{ height: `${c.height || 60}px` }} />;
    case 'custom_html':
      return <div className="py-4 px-6 max-w-4xl mx-auto" dangerouslySetInnerHTML={{ __html: c.code || '' }} />;
    default:
      return null;
  }
};

// ── Generate Slug ──────────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `page-${Date.now()}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
const PageBuilder: React.FC = () => {
  const [sections, setSections] = useState<PageSection[]>([
    { id: 'hero-1', type: 'hero', title: 'Hero Principal', visible: true, content: defaultContent.hero, styles: {} },
    { id: 'features-1', type: 'features', title: 'Recursos', visible: true, content: defaultContent.features, styles: {} },
    { id: 'cta-1', type: 'cta', title: 'Chamada para Ação', visible: true, content: defaultContent.cta, styles: {} },
    { id: 'footer-1', type: 'footer', title: 'Rodapé', visible: true, content: defaultContent.footer, styles: {} },
  ]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>('hero-1');
  const [config, setConfig] = useState<PageConfig>({
    title: 'Meu Site', description: '', favicon: '', primaryColor: '#1e40af', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', backgroundColor: '#ffffff', textColor: '#1f2937', fontDisplay: 'Inter', fontBody: 'Inter', maxWidth: '1200px',
  });
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [rightPanel, setRightPanel] = useState<'editor' | 'agent' | 'config'>('editor');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  // Save/Load/Publish state
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageName, setPageName] = useState('Meu Site');
  const [pageSlug, setPageSlug] = useState('meu-site');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  // Load saved pages list
  const loadSavedPages = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    const { data } = await supabase
      .from('published_pages')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('updated_at', { ascending: false });
    setSavedPages((data || []) as unknown as SavedPage[]);
  }, []);

  useEffect(() => { loadSavedPages(); }, [loadSavedPages]);

  const addSection = (type: PageSection['type']) => {
    const id = `${type}-${Date.now()}`;
    const tpl = SECTION_TEMPLATES.find(t => t.type === type);
    setSections(prev => [...prev, { id, type, title: tpl?.label || type, visible: true, content: { ...defaultContent[type] }, styles: {} }]);
    setSelectedSectionId(id);
    setShowAddSection(false);
    toast.success(`Seção "${tpl?.label}" adicionada`);
  };

  const updateSection = (updated: PageSection) => {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(sections[0]?.id || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(prev => {
        const oldIndex = prev.findIndex(s => s.id === active.id);
        const newIndex = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // Save page
  const savePage = async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
    setSaving(true);

    const payload = {
      nome: pageName,
      slug: pageSlug,
      sections: sections as any,
      config: config as any,
      estabelecimento_id: estabId,
    };

    let result;
    if (currentPageId) {
      result = await supabase.from('published_pages').update(payload).eq('id', currentPageId).select().single();
    } else {
      result = await supabase.from('published_pages').insert(payload).select().single();
    }

    if (result.error) {
      if (result.error.message.includes('duplicate') || result.error.message.includes('unique')) {
        toast.error('Esse slug já está em uso. Escolha outro.');
      } else {
        toast.error('Erro ao salvar: ' + result.error.message);
      }
    } else {
      setCurrentPageId(result.data.id);
      setIsPublished((result.data as any).publicado);
      toast.success('Página salva com sucesso!');
      await loadSavedPages();
    }
    setSaving(false);
    setShowSaveDialog(false);
  };

  // Publish / Unpublish
  const togglePublish = async () => {
    if (!currentPageId) {
      setShowSaveDialog(true);
      toast.info('Salve a página primeiro antes de publicar.');
      return;
    }
    setPublishing(true);
    const newStatus = !isPublished;
    const { error } = await supabase.from('published_pages').update({ publicado: newStatus }).eq('id', currentPageId);
    if (error) {
      toast.error('Erro ao publicar: ' + error.message);
    } else {
      setIsPublished(newStatus);
      toast.success(newStatus ? 'Página publicada! 🎉' : 'Página despublicada.');
      await loadSavedPages();
    }
    setPublishing(false);
  };

  // Load a saved page
  const loadPage = (page: SavedPage) => {
    setCurrentPageId(page.id);
    setPageName(page.nome);
    setPageSlug(page.slug);
    setSections((page.sections as any[]) || []);
    setConfig({ ...config, ...(page.config as any) });
    setIsPublished(page.publicado);
    setShowLoadDialog(false);
    toast.success(`"${page.nome}" carregada`);
  };

  // Import from Site Builder agent
  const handleImportFromAgent = (importedSections: PageSection[], configHints?: Partial<PageConfig>) => {
    setSections(prev => [...prev, ...importedSections]);
    if (configHints) {
      setConfig(c => ({ ...c, ...configHints }));
    }
  };

  const generateHTML = useCallback(() => {
    const visibleSections = sections.filter(s => s.visible);
    let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <meta name="description" content="${config.description}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${config.fontBody}, sans-serif; color: ${config.textColor}; background: ${config.backgroundColor}; }
    .container { max-width: ${config.maxWidth}; margin: 0 auto; }
  </style>
</head>
<body>
`;
    visibleSections.forEach(s => {
      html += `<!-- Section: ${s.title} -->\n`;
      switch (s.type) {
        case 'hero':
          html += `<section style="padding:80px 24px;text-align:center;${s.content.background_image ? `background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(${s.content.background_image}) center/cover` : `background:${config.primaryColor}`};color:#fff"><div class="container"><h1 style="font-size:3rem;font-weight:bold;margin-bottom:16px">${s.content.headline}</h1><p style="font-size:1.25rem;margin-bottom:32px;opacity:.9">${s.content.subheadline}</p><a href="${s.content.cta_url}" style="display:inline-block;padding:12px 32px;background:${config.accentColor};color:#fff;border-radius:8px;font-weight:600;text-decoration:none">${s.content.cta_text}</a></div></section>\n`;
          break;
        case 'text':
          html += `<section style="padding:40px 24px"><div class="container" style="max-width:768px;text-align:${s.content.alignment}">${s.content.body}</div></section>\n`;
          break;
        default:
          html += `<section style="padding:40px 24px"><div class="container"><!-- ${s.type} --></div></section>\n`;
      }
    });
    html += `</body>\n</html>`;
    return html;
  }, [sections, config]);

  const previewWidth = viewMode === 'mobile' ? 375 : viewMode === 'tablet' ? 768 : '100%';
  const publicUrl = currentPageId && isPublished ? `${window.location.origin}/p/${pageSlug}` : null;

  return (
    <div className="flex h-[calc(100vh-200px)] gap-0 overflow-hidden -mx-3 sm:-mx-6 -mb-3 sm:-mb-6">
      {/* Left Panel - Sections List */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary" /> Seções</h3>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setShowAddSection(true)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowLoadDialog(true)}>
              <FolderOpen className="h-3 w-3" /> Abrir
            </Button>
            <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowSaveDialog(true)}>
              <Save className="h-3 w-3" /> Salvar
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setDragActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(s => (
                <SortableSectionItem
                  key={s.id}
                  section={s}
                  isSelected={s.id === selectedSectionId}
                  onSelect={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                  onDelete={() => deleteSection(s.id)}
                  onToggleVisible={() => updateSection({ ...s, visible: !s.visible })}
                />
              ))}
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </div>

      {/* Center - Preview */}
      <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
        <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('desktop')}><Monitor className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('tablet')}><Tablet className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('mobile')}><Smartphone className="h-4 w-4" /></Button>
            {publicUrl && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Link className="h-3 w-3" />
                  <span className="max-w-[200px] truncate">/p/{pageSlug}</span>
                </Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('URL copiada!'); }}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(publicUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowPreviewDialog(true)}><Eye className="h-3 w-3" /> Preview</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowCodeDialog(true)}><Code className="h-3 w-3" /> HTML</Button>
            <Button
              variant={isPublished ? 'secondary' : 'default'}
              size="sm"
              className="h-7 gap-1"
              onClick={togglePublish}
              disabled={publishing}
            >
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {isPublished ? 'Despublicar' : 'Publicar'}
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex justify-center py-4 px-4" style={{ minHeight: '100%' }}>
            <div
              className="bg-background border rounded-lg shadow-sm overflow-hidden transition-all"
              style={{ width: previewWidth, maxWidth: '100%' }}
            >
              {sections.filter(s => s.visible).length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Adicione seções para começar</p>
                </div>
              ) : (
                sections.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                    className={cn(
                      "relative cursor-pointer transition-all",
                      selectedSectionId === s.id && "ring-2 ring-primary ring-inset",
                      !s.visible && "hidden"
                    )}
                  >
                    <SectionPreview section={s} config={config} />
                    <div className={cn(
                      "absolute top-1 left-1 z-10",
                      selectedSectionId === s.id ? "opacity-100" : "opacity-0 hover:opacity-100"
                    )}>
                      <Badge variant="secondary" className="text-[10px] shadow">{s.title}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l bg-card flex flex-col shrink-0">
        <div className="border-b p-2 flex items-center gap-1">
          <Button variant={rightPanel === 'editor' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('editor')}>
            <Settings className="h-3 w-3 mr-1" /> Editor
          </Button>
          <Button variant={rightPanel === 'config' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('config')}>
            <Palette className="h-3 w-3 mr-1" /> Estilo
          </Button>
          <Button variant={rightPanel === 'agent' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('agent')}>
            <Bot className="h-3 w-3 mr-1" /> Agente
          </Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          {rightPanel === 'editor' && (
            selectedSection ? (
              <SectionEditor section={selectedSection} onChange={updateSection} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Selecione uma seção para editar</p>
            )
          )}
          {rightPanel === 'config' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Título do Site</Label>
                <Input value={config.title} onChange={e => setConfig(c => ({ ...c, title: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Descrição (SEO)</Label>
                <Textarea value={config.description} onChange={e => setConfig(c => ({ ...c, description: e.target.value }))} rows={2} />
              </div>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase">Cores</p>
              <div className="grid grid-cols-2 gap-2">
                {([['primaryColor', 'Primária'], ['secondaryColor', 'Secundária'], ['accentColor', 'Destaque'], ['backgroundColor', 'Fundo'], ['textColor', 'Texto']] as const).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-[10px]">{label}</Label>
                    <div className="flex gap-1">
                      <input type="color" value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                      <Input value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="text-xs h-8" />
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tipografia</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Display</Label>
                  <Input value={config.fontDisplay} onChange={e => setConfig(c => ({ ...c, fontDisplay: e.target.value }))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Body</Label>
                  <Input value={config.fontBody} onChange={e => setConfig(c => ({ ...c, fontBody: e.target.value }))} className="text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Largura Máxima</Label>
                <Input value={config.maxWidth} onChange={e => setConfig(c => ({ ...c, maxWidth: e.target.value }))} className="text-xs" />
              </div>
            </div>
          )}
          {rightPanel === 'agent' && <SiteBuilderAgentViewer onImportSections={handleImportFromAgent} />}
        </ScrollArea>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Seção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {SECTION_TEMPLATES.map(tpl => (
              <button
                key={tpl.type}
                onClick={() => addSection(tpl.type)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 hover:border-primary transition-all text-center"
              >
                {tpl.icon}
                <span className="text-sm font-medium">{tpl.label}</span>
                <span className="text-[10px] text-muted-foreground">{tpl.description}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Salvar Página</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Página</Label>
              <Input value={pageName} onChange={e => { setPageName(e.target.value); if (!currentPageId) setPageSlug(generateSlug(e.target.value)); }} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/p/</span>
                <Input value={pageSlug} onChange={e => setPageSlug(generateSlug(e.target.value))} className="flex-1" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">URL pública: {window.location.origin}/p/{pageSlug}</p>
            </div>
            <Button onClick={savePage} disabled={saving || !pageName.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {currentPageId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Abrir Página Salva</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {savedPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma página salva ainda.</p>
            ) : (
              <div className="space-y-2">
                {savedPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => loadPage(page)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50",
                      currentPageId === page.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{page.nome}</span>
                      {page.publicado && <Badge variant="default" className="text-[10px]">Publicada</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">/p/{page.slug}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(page.updated_at).toLocaleString('pt-BR')}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader><DialogTitle>Preview do Site</DialogTitle></DialogHeader>
          <iframe srcDoc={generateHTML()} className="w-full flex-1 rounded border" style={{ height: 'calc(90vh - 80px)' }} />
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-background sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Código HTML
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generateHTML()); toast.success('HTML copiado!'); }}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <pre className="text-xs bg-muted p-4 rounded font-mono whitespace-pre-wrap">{generateHTML()}</pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageBuilder;
