import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Edit, Trash2, RefreshCw, Image, Paperclip, Variable, Zap, FileCheck, Languages, 
  FileText, Bot, Webhook, UserPlus, Wand2, Sparkles, BookOpen, type LucideIcon,
  MessageSquare, MessageCircle, Mail, Phone, PhoneCall, Video, Send, Reply, Forward,
  File, FilePlus, FileSearch, Folder, FolderOpen, Download, Upload, Archive, 
  Clipboard, ClipboardList, ClipboardCheck,
  User, Users, UserCheck, UserX, UserCog, Contact, CircleUser,
  Settings, Cog, Wrench, SlidersHorizontal, ToggleLeft,
  Home, Search, Filter, SortAsc, SortDesc, ArrowRight, ArrowLeft, ChevronRight, ChevronDown,
  Check, CheckCircle, X, XCircle, AlertTriangle, AlertCircle, Info, HelpCircle, Bell, BellRing,
  Play, Pause, Square, SkipForward, SkipBack, RotateCw, Repeat,
  Clock, Calendar, CalendarDays, CalendarPlus, Timer, History, Hourglass,
  DollarSign, CreditCard, Wallet, Receipt, ShoppingCart, ShoppingBag, Package, Truck, 
  BarChart, BarChart2, LineChart, PieChart, TrendingUp, TrendingDown, Activity,
  Lock, Unlock, Shield, ShieldCheck, Key, Eye, EyeOff,
  Camera, Mic, Volume2, VolumeX, Music, Headphones,
  Globe, Link, Wifi, Cloud, CloudUpload, CloudDownload, Database, Server,
  Pencil, Eraser, Scissors, Copy, Move, Maximize, Minimize, ZoomIn, ZoomOut,
  Star, Heart, ThumbsUp, ThumbsDown, Flag, Bookmark, Tag, Hash, AtSign, Smile, Frown,
  Share, ExternalLink, QrCode, Lightbulb, Rocket, Target, Award, Gift, Crown
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Mapa de ícones disponíveis organizados por categoria
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, MessageCircle, Mail, Phone, PhoneCall, Video, Send, Reply, Forward,
  Image, Paperclip, File, FileText, FilePlus, FileSearch, FileCheck, 
  Folder, FolderOpen, Download, Upload, Archive, Clipboard, ClipboardList, ClipboardCheck,
  User, Users, UserPlus, UserCheck, UserX, UserCog, Contact, CircleUser,
  Settings, Cog, Wrench, SlidersHorizontal, ToggleLeft,
  Home, Search, Filter, SortAsc, SortDesc, ArrowRight, ArrowLeft, ChevronRight, ChevronDown,
  Check, CheckCircle, X, XCircle, AlertTriangle, AlertCircle, Info, HelpCircle, Bell, BellRing,
  Play, Pause, Square, SkipForward, SkipBack, RotateCw, Repeat,
  Clock, Calendar, CalendarDays, CalendarPlus, Timer, History, Hourglass,
  DollarSign, CreditCard, Wallet, Receipt, ShoppingCart, ShoppingBag, Package, Truck,
  BarChart, BarChart2, LineChart, PieChart, TrendingUp, TrendingDown, Activity,
  Lock, Unlock, Shield, ShieldCheck, Key, Eye, EyeOff,
  Camera, Mic, Volume2, VolumeX, Music, Headphones,
  Globe, Link, Wifi, Cloud, CloudUpload, CloudDownload, Database, Server, Webhook,
  Pencil, Eraser, Scissors, Copy, Move, Maximize, Minimize, ZoomIn, ZoomOut,
  Bot, Wand2, Sparkles, Zap, Variable, Languages, BookOpen,
  Star, Heart, ThumbsUp, ThumbsDown, Flag, Bookmark, Tag, Hash, AtSign, Smile, Frown,
  Share, ExternalLink, QrCode, Lightbulb, Rocket, Target, Award, Gift, Crown
};

const ICON_CATEGORIES: Record<string, string[]> = {
  'Comunicação': ['MessageSquare', 'MessageCircle', 'Mail', 'Phone', 'PhoneCall', 'Video', 'Send', 'Reply', 'Forward'],
  'Arquivos': ['Image', 'Paperclip', 'File', 'FileText', 'FilePlus', 'FileSearch', 'FileCheck', 'Folder', 'FolderOpen', 'Download', 'Upload', 'Archive', 'Clipboard', 'ClipboardList', 'ClipboardCheck'],
  'Usuários': ['User', 'Users', 'UserPlus', 'UserCheck', 'UserX', 'UserCog', 'Contact', 'CircleUser'],
  'Configurações': ['Settings', 'Cog', 'Wrench', 'SlidersHorizontal', 'ToggleLeft'],
  'Status': ['Check', 'CheckCircle', 'X', 'XCircle', 'AlertTriangle', 'AlertCircle', 'Info', 'HelpCircle', 'Bell', 'BellRing'],
  'Tempo': ['Clock', 'Calendar', 'CalendarDays', 'Timer', 'History', 'Hourglass'],
  'Negócios': ['DollarSign', 'CreditCard', 'Wallet', 'Receipt', 'ShoppingCart', 'ShoppingBag', 'Package', 'Truck'],
  'Gráficos': ['BarChart', 'BarChart2', 'LineChart', 'PieChart', 'TrendingUp', 'TrendingDown', 'Activity'],
  'Segurança': ['Lock', 'Unlock', 'Shield', 'ShieldCheck', 'Key', 'Eye', 'EyeOff'],
  'Mídia': ['Camera', 'Mic', 'Volume2', 'VolumeX', 'Music', 'Headphones'],
  'Redes': ['Globe', 'Link', 'Wifi', 'Cloud', 'CloudUpload', 'CloudDownload', 'Database', 'Server', 'Webhook'],
  'IA e Automação': ['Bot', 'Wand2', 'Sparkles', 'Zap', 'Variable', 'Languages', 'BookOpen'],
  'Outros': ['Star', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Flag', 'Bookmark', 'Tag', 'Hash', 'AtSign', 'Smile', 'Frown', 'Share', 'ExternalLink', 'QrCode', 'Lightbulb', 'Rocket', 'Target', 'Award', 'Gift', 'Crown']
};

// Ferramentas padrão que serão inicializadas para cada estabelecimento
const DEFAULT_TOOLS = [
  { ferramenta_id: 'tool-image', nome: 'Imagem', icone: 'Image', descricao: 'Enviar imagem', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-file', nome: 'Arquivo', icone: 'Paperclip', descricao: 'Enviar arquivo', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-variables', nome: 'Variáveis', icone: 'Variable', descricao: 'Inserir variáveis', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-quick-replies', nome: 'Respostas Rápidas', icone: 'Zap', descricao: 'Textos prontos', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-attachments', nome: 'Anexos Rápidos', icone: 'FileCheck', descricao: 'Anexos pré-configurados', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-budget', nome: 'Anexar Orçamento', icone: 'FileText', descricao: 'Anexar orçamento ao atendimento', tipo: 'ferramenta', aba_chat: true, aba_orcamento: true, radial_chat: true, radial_orcamento: true },
  { ferramenta_id: 'tool-catalog', nome: 'Anexar Catálogo', icone: 'BookOpen', descricao: 'Anexar catálogo em PDF', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-agenda-email', nome: 'Rastreio com Agendamento', icone: 'Target', descricao: 'Link ou anexo que rastreia e agenda', tipo: 'ferramenta', aba_chat: true, aba_email: true, radial_chat: true, radial_email: true },
  { ferramenta_id: 'tool-translate', nome: 'Traduzir', icone: 'Languages', descricao: 'Traduzir texto', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-reports', nome: 'Relatórios', icone: 'FileText', descricao: 'Importar relatórios', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'tool-bot', nome: 'Redirecionar Bot', icone: 'Bot', descricao: 'Redirecionar para bot', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  
  { ferramenta_id: 'tool-stock', nome: 'Consulta Estoque', icone: 'Package', descricao: 'Pesquisar produtos e enviar estoque', tipo: 'ferramenta', aba_chat: true, radial_chat: false },
  { ferramenta_id: 'tool-transfer', nome: 'Transferir Usuário', icone: 'UserPlus', descricao: 'Transferir atendimento', tipo: 'ferramenta', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'ai-chat', nome: 'Chat IA', icone: 'Wand2', descricao: 'Conversar com IA', tipo: 'ia', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'ai-suggestion', nome: 'Sugestão Contextual', icone: 'Sparkles', descricao: 'Sugestão de resposta', tipo: 'ia', aba_chat: true, radial_chat: true },
  { ferramenta_id: 'ai-summary', nome: 'Gerar Resumo', icone: 'FileText', descricao: 'Resumo da conversa', tipo: 'ia', aba_chat: true, radial_chat: true },
  
  { ferramenta_id: 'ai-translate', nome: 'Tradução em Tempo Real', icone: 'Languages', descricao: 'Tradução automática', tipo: 'ia', aba_chat: true, radial_chat: true },
];

interface Ferramenta {
  id: string;
  estabelecimento_id: string;
  ferramenta_id: string;
  nome: string;
  icone: string;
  descricao: string | null;
  aba_chat: boolean;
  aba_agenda: boolean;
  aba_email: boolean;
  aba_orcamento: boolean;
  radial_chat: boolean;
  radial_agenda: boolean;
  radial_email: boolean;
  radial_orcamento: boolean;
  ordem: number;
  ativo: boolean;
  tipo: string;
}

interface FerramentasAtendimentoCRUDProps {
  estabelecimentoId: string;
}

export default function FerramentasAtendimentoCRUD({ estabelecimentoId }: FerramentasAtendimentoCRUDProps) {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ferramentaToDelete, setFerramentaToDelete] = useState<Ferramenta | null>(null);
  const [editingFerramenta, setEditingFerramenta] = useState<Ferramenta | null>(null);
  const [formData, setFormData] = useState({
    ferramenta_id: '',
    nome: '',
    icone: 'Wand2',
    descricao: '',
    aba_chat: false,
    aba_agenda: false,
    aba_email: false,
    aba_orcamento: false,
    radial_chat: false,
    radial_agenda: false,
    radial_email: false,
    radial_orcamento: false,
    tipo: 'ferramenta',
    ordem: 0,
    ativo: true
  });

  useEffect(() => {
    loadFerramentas();
  }, [estabelecimentoId]);

  const loadFerramentas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ferramentas_atendimento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem');

      if (error) throw error;

      // Se não houver ferramentas, inicializar com as padrão
      if (!data || data.length === 0) {
        await initializeDefaultTools();
        return;
      }

      // Verificar se há ferramentas padrão faltando e adicionar
      const existingIds = data.map(f => f.ferramenta_id);
      const missingTools = DEFAULT_TOOLS.filter(t => !existingIds.includes(t.ferramenta_id));
      
      if (missingTools.length > 0) {
        const toolsToInsert = missingTools.map((tool, index) => ({
          ferramenta_id: tool.ferramenta_id,
          nome: tool.nome,
          icone: tool.icone,
          descricao: tool.descricao,
          tipo: tool.tipo,
          estabelecimento_id: estabelecimentoId,
          ordem: data.length + index,
          ativo: true,
          aba_chat: tool.aba_chat || false,
          aba_agenda: (tool as any).aba_agenda || false,
          aba_email: (tool as any).aba_email || false,
          aba_orcamento: (tool as any).aba_orcamento || false,
          radial_chat: tool.radial_chat || false,
          radial_agenda: (tool as any).radial_agenda || false,
          radial_email: (tool as any).radial_email || false,
          radial_orcamento: (tool as any).radial_orcamento || false
        }));

        const { error: insertError } = await supabase
          .from('ferramentas_atendimento')
          .insert(toolsToInsert);

        if (!insertError) {
          // Recarregar para pegar as novas ferramentas
          const { data: newData } = await supabase
            .from('ferramentas_atendimento')
            .select('*')
            .eq('estabelecimento_id', estabelecimentoId)
            .order('ordem');
          
          setFerramentas((newData || []) as Ferramenta[]);
          return;
        }
      }

      setFerramentas(data as Ferramenta[]);
    } catch (error) {
      console.error('Erro ao carregar ferramentas:', error);
      toast.error('Erro ao carregar ferramentas');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTools = async () => {
    try {
      const toolsToInsert = DEFAULT_TOOLS.map((tool, index) => ({
        ...tool,
        estabelecimento_id: estabelecimentoId,
        ordem: index,
        ativo: true,
        aba_agenda: false,
        aba_email: false,
        aba_orcamento: false,
        radial_agenda: false,
        radial_email: false,
        radial_orcamento: false
      }));

      const { error } = await supabase
        .from('ferramentas_atendimento')
        .insert(toolsToInsert);

      if (error) throw error;
      
      toast.success('Ferramentas padrão inicializadas');
      loadFerramentas();
    } catch (error) {
      console.error('Erro ao inicializar ferramentas:', error);
      toast.error('Erro ao inicializar ferramentas');
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.ferramenta_id.trim()) {
      toast.error('Nome e ID da ferramenta são obrigatórios');
      return;
    }

    try {
      if (editingFerramenta) {
        const { error } = await supabase
          .from('ferramentas_atendimento')
          .update(formData)
          .eq('id', editingFerramenta.id);
        if (error) throw error;
        toast.success('Ferramenta atualizada');
      } else {
        const { error } = await supabase
          .from('ferramentas_atendimento')
          .insert({ ...formData, estabelecimento_id: estabelecimentoId });
        if (error) throw error;
        toast.success('Ferramenta criada');
      }
      setDialogOpen(false);
      loadFerramentas();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma ferramenta com este ID');
      } else {
        toast.error('Erro ao salvar ferramenta');
      }
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('ferramentas_atendimento')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
      toast.success(ativo ? 'Ferramenta ativada' : 'Ferramenta desativada');
      loadFerramentas();
    } catch (error) {
      toast.error('Erro ao atualizar ferramenta');
    }
  };

  const updateField = async (id: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('ferramentas_atendimento')
        .update({ [field]: value } as any)
        .eq('id', id);
      if (error) throw error;
      loadFerramentas();
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const confirmDelete = async () => {
    if (!ferramentaToDelete) return;
    try {
      const { error } = await supabase
        .from('ferramentas_atendimento')
        .delete()
        .eq('id', ferramentaToDelete.id);
      if (error) throw error;
      toast.success('Ferramenta excluída');
      loadFerramentas();
    } catch (error) {
      toast.error('Erro ao excluir ferramenta');
    } finally {
      setDeleteDialogOpen(false);
      setFerramentaToDelete(null);
    }
  };

  const resetFormData = () => {
    setFormData({
      ferramenta_id: '',
      nome: '',
      icone: 'Wand2',
      descricao: '',
      aba_chat: false,
      aba_agenda: false,
      aba_email: false,
      aba_orcamento: false,
      radial_chat: false,
      radial_agenda: false,
      radial_email: false,
      radial_orcamento: false,
      tipo: 'ferramenta',
      ordem: ferramentas.length,
      ativo: true
    });
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={loadFerramentas}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
        <Button size="sm" onClick={() => { setEditingFerramenta(null); resetFormData(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Ferramenta
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ativo</TableHead>
              <TableHead>Ferramenta</TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center">
                  <span>Aba</span>
                  <div className="flex gap-1 text-xs">
                    <span className="w-10">Chat</span>
                    <span className="w-10">Agenda</span>
                    <span className="w-10">Email</span>
                    <span className="w-10">Orçam.</span>
                  </div>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center">
                  <span>RadialMenu</span>
                  <div className="flex gap-1 text-xs">
                    <span className="w-10">Chat</span>
                    <span className="w-10">Agenda</span>
                    <span className="w-10">Email</span>
                    <span className="w-10">Orçam.</span>
                  </div>
                </div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ferramentas.map((ferramenta) => (
              <TableRow key={ferramenta.id}>
                <TableCell>
                  <Switch 
                    checked={ferramenta.ativo} 
                    onCheckedChange={(checked) => toggleAtivo(ferramenta.id, checked)} 
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getIconComponent(ferramenta.icone)}
                    <div>
                      <div className="font-medium">{ferramenta.nome}</div>
                      <div className="text-xs text-muted-foreground">{ferramenta.ferramenta_id}</div>
                    </div>
                    <Badge variant={ferramenta.tipo === 'ia' ? 'default' : 'secondary'} className="ml-2">
                      {ferramenta.tipo === 'ia' ? 'IA' : 'Tool'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Checkbox 
                      checked={ferramenta.aba_chat} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'aba_chat', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.aba_agenda} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'aba_agenda', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.aba_email} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'aba_email', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.aba_orcamento} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'aba_orcamento', !!checked)}
                      className="w-10"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Checkbox 
                      checked={ferramenta.radial_chat} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'radial_chat', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.radial_agenda} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'radial_agenda', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.radial_email} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'radial_email', !!checked)}
                      className="w-10"
                    />
                    <Checkbox 
                      checked={ferramenta.radial_orcamento} 
                      onCheckedChange={(checked) => updateField(ferramenta.id, 'radial_orcamento', !!checked)}
                      className="w-10"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { 
                      setEditingFerramenta(ferramenta); 
                      setFormData({
                        ferramenta_id: ferramenta.ferramenta_id,
                        nome: ferramenta.nome,
                        icone: ferramenta.icone,
                        descricao: ferramenta.descricao || '',
                        aba_chat: ferramenta.aba_chat,
                        aba_agenda: ferramenta.aba_agenda,
                        aba_email: ferramenta.aba_email,
                        aba_orcamento: ferramenta.aba_orcamento,
                        radial_chat: ferramenta.radial_chat,
                        radial_agenda: ferramenta.radial_agenda,
                        radial_email: ferramenta.radial_email,
                        radial_orcamento: ferramenta.radial_orcamento,
                        tipo: ferramenta.tipo,
                        ordem: ferramenta.ordem,
                        ativo: ferramenta.ativo
                      }); 
                      setDialogOpen(true); 
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setFerramentaToDelete(ferramenta); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {ferramentas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma ferramenta cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFerramenta ? 'Editar Ferramenta' : 'Nova Ferramenta'}</DialogTitle>
            <DialogDescription>Configure uma ferramenta para o atendimento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID da Ferramenta *</Label>
                <Input 
                  value={formData.ferramenta_id} 
                  onChange={(e) => setFormData({ ...formData, ferramenta_id: e.target.value })} 
                  placeholder="Ex: tool-minha-ferramenta"
                  disabled={!!editingFerramenta}
                />
              </div>
              <div>
                <Label>Nome *</Label>
                <Input 
                  value={formData.nome} 
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
                  placeholder="Ex: Minha Ferramenta"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option value="ferramenta">Ferramenta</option>
                  <option value="ia">IA</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-md border bg-primary/10">
                  {getIconComponent(formData.icone)}
                </div>
                <span className="text-sm text-muted-foreground">{formData.icone}</span>
              </div>
            </div>
            
            <div>
              <Label>Ícone</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                  <div key={category} className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                    <div className="grid grid-cols-10 gap-1">
                      {icons.map(iconName => {
                        const IconComp = ICON_MAP[iconName];
                        if (!IconComp) return null;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setFormData({ ...formData, icone: iconName })}
                            className={cn(
                              "p-2 rounded hover:bg-muted transition-colors",
                              formData.icone === iconName && "bg-primary/20 ring-2 ring-primary"
                            )}
                            title={iconName}
                          >
                            <IconComp className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao} 
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                rows={2}
              />
            </div>
            
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Exibir na Aba (Toolbar)</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.aba_chat} 
                    onCheckedChange={(checked) => setFormData({ ...formData, aba_chat: !!checked })}
                  />
                  <Label>Chat</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.aba_agenda} 
                    onCheckedChange={(checked) => setFormData({ ...formData, aba_agenda: !!checked })}
                  />
                  <Label>Agenda</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.aba_email} 
                    onCheckedChange={(checked) => setFormData({ ...formData, aba_email: !!checked })}
                  />
                  <Label>Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.aba_orcamento} 
                    onCheckedChange={(checked) => setFormData({ ...formData, aba_orcamento: !!checked })}
                  />
                  <Label>Orçamento</Label>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Exibir no RadialMenu (Botão Direito)</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.radial_chat} 
                    onCheckedChange={(checked) => setFormData({ ...formData, radial_chat: !!checked })}
                  />
                  <Label>Chat</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.radial_agenda} 
                    onCheckedChange={(checked) => setFormData({ ...formData, radial_agenda: !!checked })}
                  />
                  <Label>Agenda</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.radial_email} 
                    onCheckedChange={(checked) => setFormData({ ...formData, radial_email: !!checked })}
                  />
                  <Label>Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.radial_orcamento} 
                    onCheckedChange={(checked) => setFormData({ ...formData, radial_orcamento: !!checked })}
                  />
                  <Label>Orçamento</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordem</Label>
                <Input 
                  type="number"
                  value={formData.ordem} 
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} 
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch 
                  checked={formData.ativo} 
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label>Ferramenta Ativa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingFerramenta ? 'Atualizar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ferramenta "{ferramentaToDelete?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
