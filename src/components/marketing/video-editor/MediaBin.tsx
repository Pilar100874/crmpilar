import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Film, Image as ImageIcon, FolderOpen, Loader2, Check, X } from 'lucide-react';
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

const MediaBin: React.FC<Props> = ({ onAddClip, tracks }) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryType, setGalleryType] = useState<'video' | 'image'>('video');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      if (!error && data) setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenGallery = useCallback((type: 'video' | 'image') => {
    setGalleryType(type);
    setSelectedIds(new Set());
    setItems([]);
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
    const selected = items.filter(i => selectedIds.has(i.id));
    
    for (const item of selected) {
      if (galleryType === 'video') {
        const videoTrackId = tracks.find(t => t.type === 'video')?.id;
        onAddClip('video', {
          type: 'video',
          name: item.nome,
          src: item.public_url,
          duration: item.duracao_segundos || undefined,
        }, videoTrackId);
      } else {
        const imageTrackId = tracks.find(t => t.type === 'image')?.id;
        onAddClip('image', {
          type: 'image',
          name: item.nome,
          src: item.public_url,
        }, imageTrackId);
      }
    }
    
    setGalleryOpen(false);
    setSelectedIds(new Set());
  }, [items, selectedIds, galleryType, onAddClip, tracks]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Biblioteca de Mídia
        </h3>
      </div>

      <div className="p-3 space-y-2">
        <Button
          onClick={() => handleOpenGallery('video')}
          variant="outline"
          className="w-full justify-start gap-2 text-xs h-12"
        >
          <Film className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">Vídeo</p>
            <p className="text-[10px] text-muted-foreground">Selecionar da galeria</p>
          </div>
        </Button>
        <Button
          onClick={() => handleOpenGallery('image')}
          variant="outline"
          className="w-full justify-start gap-2 text-xs h-12"
        >
          <ImageIcon className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">Imagem</p>
            <p className="text-[10px] text-muted-foreground">Selecionar da galeria</p>
          </div>
        </Button>
      </div>

      {/* Gallery Popup */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {galleryType === 'video' ? <Film className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
              Selecionar {galleryType === 'video' ? 'Vídeos' : 'Imagens'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>
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
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {galleryType === 'video' ? <Film className="h-10 w-10 mb-2" /> : <ImageIcon className="h-10 w-10 mb-2" />}
                <p className="text-sm">Nenhum {galleryType === 'video' ? 'vídeo' : 'imagem'} na galeria</p>
                <p className="text-xs mt-1">Salve mídias pelo AI Studio para usar aqui</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 p-4">
                {items.map((item) => {
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
                      
                      {/* Selection indicator */}
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'bg-background/80 border-border group-hover:border-primary/50'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      {/* Name overlay */}
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
