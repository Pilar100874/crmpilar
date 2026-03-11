import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Music, Type, Image, Upload, FolderOpen, Play, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
}

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem) => void;
}

interface GalleryVideo {
  id: string;
  nome: string;
  public_url: string;
  created_at: string;
}

const MediaBin: React.FC<Props> = ({ onAddClip }) => {
  const [savedVideos, setSavedVideos] = useState<GalleryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSavedVideos = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_gallery')
        .select('id, nome, public_url, created_at')
        .eq('estabelecimento_id', estabId)
        .eq('tipo', 'video')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setSavedVideos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSavedVideos(); }, [fetchSavedVideos]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('video/')) {
        // Get video duration
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          onAddClip('video', { type: 'video', name: file.name, src: url, duration: vid.duration });
          URL.revokeObjectURL(vid.src);
        };
        vid.src = url;
      } else if (file.type.startsWith('audio/')) {
        const aud = document.createElement('audio');
        aud.preload = 'metadata';
        aud.onloadedmetadata = () => {
          onAddClip('audio', { type: 'audio', name: file.name, src: url, duration: aud.duration });
        };
        aud.src = url;
      } else if (file.type.startsWith('image/')) {
        onAddClip('image', { type: 'image', name: file.name, src: url });
      }
    }
    e.target.value = '';
  }, [onAddClip]);

  const handleGalleryVideoClick = useCallback((video: GalleryVideo) => {
    onAddClip('video', {
      type: 'video',
      name: video.nome,
      src: video.public_url,
    });
  }, [onAddClip]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Biblioteca de Mídia
        </h3>
      </div>

      <div className="p-3 space-y-2">
        <Button onClick={() => onAddClip('video')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Film className="h-4 w-4 text-primary" />
          Adicionar Cena Vazia
        </Button>
        <Button onClick={() => onAddClip('text')} variant="outline" className="w-full justify-start gap-2 text-xs">
          <Type className="h-4 w-4 text-primary" />
          Adicionar Texto / Legenda
        </Button>
      </div>

      {/* Saved Videos from Gallery */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Film className="h-3 w-3" />
            Vídeos Salvos (AI Studio)
          </p>
          <button onClick={fetchSavedVideos} className="p-1 rounded hover:bg-muted transition-colors" title="Atualizar">
            <RefreshCw className={`h-3 w-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : savedVideos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-3">
            Nenhum vídeo salvo. Gere vídeos no AI Studio e salve na galeria.
          </p>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1.5">
              {savedVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleGalleryVideoClick(video)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                    <video src={video.public_url} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate">{video.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">Importar arquivos</p>
        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Arraste ou clique para importar</span>
          <span className="text-[10px] text-muted-foreground">MP4, MOV, MP3, WAV, PNG, JPG</span>
          <input ref={fileInputRef} type="file" className="hidden" accept="video/*,audio/*,image/*" multiple onChange={handleFileUpload} />
        </label>
      </div>
    </div>
  );
};

export default MediaBin;
