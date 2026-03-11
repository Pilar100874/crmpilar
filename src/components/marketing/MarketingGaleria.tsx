import React, { useState, useEffect } from 'react';
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  Calendar, 
  Trash2, 
  ExternalLink,
  Loader2,
  Filter,
  Search,
  Play,
  Download,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReturnType, RETURN_TYPE_LABELS, CHANNEL_CONFIG, PublishChannel } from './types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import VideoTrimmer from './ai-studio/VideoTrimmer';

interface MarketingContentItem {
  id: string;
  resource_id: string | null;
  resource_name: string;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  input_data: any;
  channels: string[] | null;
  status: string | null;
  created_at: string;
  _source?: 'marketing_content' | 'media_gallery';
}

const ContentTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-5 w-5" }) => {
  const icons: Record<string, React.ReactNode> = {
    image: <Image className={className} />,
    video: <Video className={className} />,
    audio: <Music className={className} />,
    text: <FileText className={className} />,
  };
  return <>{icons[type] || <FileText className={className} />}</>;
};

const contentTypeColors: Record<string, string> = {
  image: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  audio: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  video: 'bg-red-500/10 text-red-600 border-red-500/20',
  text: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

interface MarketingGaleriaProps {
  onEditImage?: (imageUrl: string, resourceName?: string) => void;
  onEditVideo?: (videoUrl: string, resourceName?: string) => void;
}

const MarketingGaleria: React.FC<MarketingGaleriaProps> = ({ onEditImage, onEditVideo }) => {
  const [content, setContent] = useState<MarketingContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<MarketingContentItem | null>(null);
  const [isSavingTrimmed, setIsSavingTrimmed] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const estabId = localStorage.getItem('estabelecimentoId');

      // Fetch from marketing_content
      const { data: mcData, error: mcError } = await supabase
        .from('marketing_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (mcError) throw mcError;

      const mcItems: MarketingContentItem[] = (mcData || []).map((item: any) => ({
        ...item,
        _source: 'marketing_content' as const,
      }));

      // Fetch from media_gallery
      let mgItems: MarketingContentItem[] = [];
      if (estabId) {
        const { data: mgData, error: mgError } = await supabase
          .from('media_gallery')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .order('created_at', { ascending: false });

        if (!mgError && mgData) {
          mgItems = mgData.map((item: any) => ({
            id: item.id,
            resource_id: null,
            resource_name: item.nome || 'Mídia',
            content_type: item.tipo || 'image',
            content_url: item.public_url,
            text_content: item.descricao || null,
            input_data: null,
            channels: null,
            status: null,
            created_at: item.created_at || new Date().toISOString(),
            _source: 'media_gallery' as const,
          }));
        }
      }

      // Merge and sort by date descending
      const merged = [...mcItems, ...mgItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setContent(merged);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const item = content.find(c => c.id === deleteId);
    if (!item) return;

    try {
      const table = item._source === 'media_gallery' ? 'media_gallery' : 'marketing_content';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setContent(prev => prev.filter(c => c.id !== deleteId));
      toast.success('Conteúdo removido');
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erro ao remover conteúdo');
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (item: MarketingContentItem) => {
    if (!item.content_url) return;

    if (item.content_type === 'image' && onEditImage) {
      onEditImage(item.content_url, item.resource_name);
      return;
    }

    if (item.content_type === 'video') {
      setEditingVideo(item);
      return;
    }

    window.open(item.content_url, '_blank');
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.resource_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.content_type === filterType;
    return matchesSearch && matchesType;
  });

  const groupedByDate = filteredContent.reduce((acc, item) => {
    const date = format(new Date(item.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, MarketingContentItem[]>);

  const renderContentPreview = (item: MarketingContentItem) => {
    switch (item.content_type) {
      case 'image':
        return item.content_url ? (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={item.content_url} 
              alt={item.resource_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground" />
          </div>
        );
      
      case 'video':
        return item.content_url ? (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              src={item.content_url} 
              className="w-full h-full object-cover"
              controls
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        );
      
      case 'audio':
        return (
          <div className="p-4 bg-muted rounded-lg">
            {item.content_url ? (
              <audio src={item.content_url} controls className="w-full" />
            ) : (
              <div className="flex items-center justify-center py-4">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div className="p-4 bg-muted rounded-lg max-h-32 overflow-hidden">
            <p className="text-sm whitespace-pre-wrap line-clamp-4">
              {item.text_content || 'Sem conteúdo de texto'}
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Galeria de Conteúdo</h3>
          <p className="text-sm text-muted-foreground">
            Visualize todo o conteúdo criado com seus recursos
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por recurso..."
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
              <SelectItem value="audio">Áudios</SelectItem>
              <SelectItem value="text">Textos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Nenhum conteúdo encontrado</h3>
            <p className="text-sm text-muted-foreground text-center">
              {search || filterType !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Use um recurso para criar seu primeiro conteúdo'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden group">
                      {renderContentPreview(item)}
                      
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.resource_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'HH:mm')}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 ${contentTypeColors[item.content_type]}`}
                          >
                            <ContentTypeIcon type={item.content_type} className="h-3 w-3 mr-1" />
                            {RETURN_TYPE_LABELS[item.content_type as ReturnType] || item.content_type}
                          </Badge>
                        </div>

                        {item.channels && item.channels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.channels.map((channel) => (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                {CHANNEL_CONFIG[channel as PublishChannel]?.label || channel}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1 flex-wrap">
                          {item.content_url && (item.content_type === 'image' || item.content_type === 'video') && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                          )}
                          {item.content_url && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.open(item.content_url!, '_blank')}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Abrir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={item.content_url} download>
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O conteúdo será removido permanentemente.
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
};

export default MarketingGaleria;
