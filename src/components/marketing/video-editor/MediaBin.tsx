import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Image as ImageIcon, FolderOpen, Loader2, Check, Trash2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TimelineTrack } from './types';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
  canvasJson?: string;
}

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string) => void;
  tracks: TimelineTrack[];
}

interface GalleryItem {
  id: string;
  nome: string;
  public_url: string;
  tipo: string;
  thumbnail_url: string | null;
  created_at: string | null;
  duracao_segundos: number | null;
}

interface ImportedMedia {
  id: string;
  name: string;
  src: string;
  type: 'video' | 'image';
  duration?: number | null;
  thumbnail?: string | null;
}

const MediaBin: React.FC<Props> = ({ onAddClip, tracks }) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryType, setGalleryType] = useState<'video' | 'image'>('video');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Imported media lists
  const [importedVideos, setImportedVideos] = useState<ImportedMedia[]>([]);
  const [importedImages, setImportedImages] = useState<ImportedMedia[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');

  const fetchGallery = useCallback(async (type: 'video' | 'image') => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    try {
      const tipoFilter = type === 'video' ? 'video' : 'imagem';
      const { data, error } = await supabase
        .from('media_gallery')
        .select('id, nome, public_url, tipo, thumbnail_url, created_at, duracao_segundos')
        .eq('estabelecimento_id', estabId)
        .eq('tipo', tipoFilter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setGalleryItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenGallery = useCallback((type: 'video' | 'image') => {
    setGalleryType(type);
    setSelectedIds(new Set());
    setGalleryItems([]);
    setGalleryOpen(true);
    fetchGallery(type);
  }, [fetchGallery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirmSelection = useCallback(() => {
    const selected = galleryItems.filter(i => selectedIds.has(i.id));
    
    for (const item of selected) {
      const imported: ImportedMedia = {
        id: item.id,
        name: item.nome,
        src: item.public_url,
        type: galleryType,
        duration: item.duracao_segundos,
        thumbnail: item.thumbnail_url,
      };

      if (galleryType === 'video') {
        setImportedVideos(prev => {
          if (prev.find(v => v.id === item.id)) return prev;
          return [...prev, imported];
        });
      } else {
        setImportedImages(prev => {
          if (prev.find(v => v.id === item.id)) return prev;
          return [...prev, imported];
        });
      }
    }

    setActiveTab(galleryType);
    setGalleryOpen(false);
    setSelectedIds(new Set());
  }, [galleryItems, selectedIds, galleryType]);

  const handleAddToTimeline = useCallback((media: ImportedMedia) => {
    if (media.type === 'video') {
      const videoTrackId = tracks.find(t => t.type === 'video')?.id;
      onAddClip('video', {
        type: 'video',
        name: media.name,
        src: media.src,
        duration: media.duration || undefined,
      }, videoTrackId);
    } else {
      const imageTrackId = tracks.find(t => t.type === 'image')?.id;
      onAddClip('image', {
        type: 'image',
        name: media.name,
        src: media.src,
      }, imageTrackId);
    }
  }, [onAddClip, tracks]);

  const handleRemoveImported = useCallback((id: string, type: 'video' | 'image') => {
    if (type === 'video') {
      setImportedVideos(prev => prev.filter(v => v.id !== id));
    } else {
      setImportedImages(prev => prev.filter(v => v.id !== id));
    }
  }, []);

  const currentList = activeTab === 'video' ? importedVideos : importedImages;
  const totalImported = importedVideos.length + importedImages.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Biblioteca de Mídia
        </h3>
      </div>

      {/* Insert buttons */}
      <div className="p-3 space-y-2 shrink-0">
        <Button
          onClick={() => handleOpenGallery('video')}
          variant="outline"
          className="w-full justify-start gap-2 text-xs h-10"
        >
          <Film className="h-4 w-4 text-primary" />
          <span className="font-medium">Inserir Vídeo</span>
          {importedVideos.length > 0 && (
            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{importedVideos.length}</span>
          )}
        </Button>
        <Button
          onClick={() => handleOpenGallery('image')}
          variant="outline"
          className="w-full justify-start gap-2 text-xs h-10"
        >
          <ImageIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">Inserir Imagem</span>
          {importedImages.length > 0 && (
            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{importedImages.length}</span>
          )}
        </Button>
      </div>

      {/* Tabs + imported list */}
      {totalImported > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden border-t">
          {/* Tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'video'
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Film className="h-3 w-3" />
              Vídeos ({importedVideos.length})
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'image'
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon className="h-3 w-3" />
              Imagens ({importedImages.length})
            </button>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {currentList.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  Nenhum {activeTab === 'video' ? 'vídeo' : 'imagem'} importado
                </p>
              ) : (
                currentList.map((media) => (
                  <div
                    key={media.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-9 rounded bg-muted shrink-0 overflow-hidden relative">
                      {media.type === 'video' ? (
                        <>
                          <video src={media.src} className="w-full h-full object-cover" muted preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-3 w-3 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img src={media.thumbnail || media.src} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{media.name}</p>
                      {media.duration && (
                        <p className="text-[10px] text-muted-foreground">{Math.round(media.duration)}s</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleAddToTimeline(media)}
                        title="Adicionar à timeline"
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRemoveImported(media.id, media.type)}
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Gallery Popup */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 pr-12">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {galleryType === 'video' ? <Film className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
              Selecionar {galleryType === 'video' ? 'Vídeos' : 'Imagens'}
            </DialogTitle>
          </div>
          <div className="flex items-center justify-between px-4 pb-3 border-b">
            {selectedIds.size > 0 ? (
              <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            ) : (
              <span className="text-xs text-muted-foreground">Selecione os itens desejados</span>
            )}
            <Button
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleConfirmSelection}
              className="gap-1.5 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Adicionar ({selectedIds.size})
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {galleryType === 'video' ? <Film className="h-10 w-10 mb-2" /> : <ImageIcon className="h-10 w-10 mb-2" />}
                <p className="text-sm">Nenhum {galleryType === 'video' ? 'vídeo' : 'imagem'} na galeria</p>
                <p className="text-xs mt-1">Salve mídias pelo AI Studio para usar aqui</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 p-4">
                {galleryItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`
                        relative rounded-lg border-2 overflow-hidden transition-all group
                        aspect-video bg-muted
                        ${isSelected
                          ? 'border-primary ring-2 ring-primary/30 scale-[0.97]'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      {galleryType === 'video' ? (
                        <video
                          src={item.public_url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.thumbnail_url || item.public_url}
                          className="w-full h-full object-cover"
                          alt={item.nome}
                        />
                      )}
                      
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'bg-background/80 border-border group-hover:border-primary/50'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-[10px] text-white truncate">{item.nome}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaBin;
