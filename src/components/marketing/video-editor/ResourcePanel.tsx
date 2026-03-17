import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Film, Image as ImageIcon, Music, Palette, Upload, FolderOpen,
  Play, Check, Trash2, Loader2, Plus, Mic, Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TimelineTrack } from './types';

type ResourceType = 'video' | 'image' | 'canvas' | 'music' | 'audio';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
  canvasJson?: string;
}

export interface ResourcePanelHandle {
  addCanvasItem: (name: string, src: string, canvasJson?: string) => void;
}

interface Props {
  onAddClip: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string) => void;
  tracks: TimelineTrack[];
  onOpenCanvas: () => void;
  onEditCanvas?: (canvasJson: string, itemId: string) => void;
}

interface ImportedMedia {
  id: string;
  name: string;
  src: string;
  type: 'video' | 'image' | 'audio';
  duration?: number | null;
  thumbnail?: string | null;
  resourceType: ResourceType;
  canvasJson?: string;
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

const TABS: { key: ResourceType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'video', label: 'Vídeo', icon: <Film className="h-4 w-4" />, color: 'text-blue-400' },
  { key: 'image', label: 'Imagem', icon: <ImageIcon className="h-4 w-4" />, color: 'text-green-400' },
  { key: 'canvas', label: 'Canvas', icon: <Palette className="h-4 w-4" />, color: 'text-purple-400' },
  { key: 'music', label: 'Música', icon: <Music className="h-4 w-4" />, color: 'text-yellow-400' },
  { key: 'audio', label: 'Áudio', icon: <Mic className="h-4 w-4" />, color: 'text-orange-400' },
];

const ResourcePanel = forwardRef<ResourcePanelHandle, Props>(({ onAddClip, tracks, onOpenCanvas, onEditCanvas }, ref) => {
  const [activeTab, setActiveTab] = useState<ResourceType>('video');
  const [items, setItems] = useState<Record<ResourceType, ImportedMedia[]>>({
    video: [], image: [], canvas: [], music: [], audio: [],
  });

  useImperativeHandle(ref, () => ({
    addCanvasItem: (name: string, src: string, canvasJson?: string) => {
      const imported: ImportedMedia = {
        id: `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        src,
        type: 'image',
        duration: null,
        thumbnail: null,
        resourceType: 'canvas',
        canvasJson,
      };
      setItems(prev => ({ ...prev, canvas: [...prev.canvas, imported] }));
      setActiveTab('canvas');
    },
    updateCanvasItem: (itemId: string, src: string, canvasJson: string) => {
      setItems(prev => ({
        ...prev,
        canvas: prev.canvas.map(item =>
          item.id === itemId ? { ...item, src, canvasJson } : item
        ),
      }));
    },
  }));

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryType, setGalleryType] = useState<'video' | 'image'>('video');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async (type: 'video' | 'image') => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    try {
      const tipoFilter = type === 'video' ? 'video' : 'image';
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

  const handleConfirmSelection = useCallback(() => {
    const selected = galleryItems.filter(i => selectedIds.has(i.id));
    const resType: ResourceType = galleryType;

    for (const item of selected) {
      const imported: ImportedMedia = {
        id: item.id,
        name: item.nome,
        src: item.public_url,
        type: galleryType,
        duration: item.duracao_segundos,
        thumbnail: item.thumbnail_url,
        resourceType: resType,
      };
      setItems(prev => {
        if (prev[resType].find(v => v.id === item.id)) return prev;
        return { ...prev, [resType]: [...prev[resType], imported] };
      });
    }
    setActiveTab(resType);
    setGalleryOpen(false);
    setSelectedIds(new Set());
  }, [galleryItems, selectedIds, galleryType]);

  const handleFileUpload = useCallback((files: FileList | null, resType: ResourceType) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const mediaType: 'video' | 'image' | 'audio' =
        resType === 'video' ? 'video' :
        resType === 'image' || resType === 'canvas' ? 'image' :
        'audio';

      const imported: ImportedMedia = {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        src: url,
        type: mediaType,
        duration: null,
        thumbnail: null,
        resourceType: resType,
      };

      if (mediaType === 'video') {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          imported.duration = vid.duration;
          setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        };
        vid.onerror = () => setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        vid.src = url;
      } else if (mediaType === 'audio') {
        const aud = document.createElement('audio');
        aud.preload = 'metadata';
        aud.onloadedmetadata = () => {
          imported.duration = aud.duration;
          setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        };
        aud.onerror = () => setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
        aud.src = url;
      } else {
        setItems(prev => ({ ...prev, [resType]: [...prev[resType], imported] }));
      }
    });
    setActiveTab(resType);
  }, []);

  const handleAddToTimeline = useCallback((media: ImportedMedia) => {
    const resType = media.resourceType;
    if (resType === 'video') {
      const trackId = tracks.find(t => t.type === 'video')?.id;
      onAddClip('video', { type: 'video', name: media.name, src: media.src, duration: media.duration || undefined }, trackId);
    } else if (resType === 'image') {
      const trackId = tracks.find(t => t.type === 'image')?.id;
      onAddClip('image', { type: 'image', name: media.name, src: media.src }, trackId);
    } else if (resType === 'canvas') {
      const trackId = tracks.find(t => t.type === 'canvas')?.id || tracks.find(t => t.type === 'video')?.id;
      onAddClip('image', { type: 'canvas' as any, name: media.name, src: media.src, canvasJson: media.canvasJson }, trackId);
    } else if (resType === 'music' || resType === 'audio') {
      const trackId = tracks.find(t => t.type === 'audio')?.id;
      onAddClip('audio', { type: 'audio', name: media.name, src: media.src, duration: media.duration || undefined }, trackId);
    }
  }, [onAddClip, tracks]);

  const handleRemove = useCallback((id: string, resType: ResourceType) => {
    setItems(prev => ({ ...prev, [resType]: prev[resType].filter(v => v.id !== id) }));
  }, []);

  const handleDoubleClickCanvas = useCallback((media: ImportedMedia) => {
    if (media.canvasJson && onEditCanvas) {
      onEditCanvas(media.canvasJson, media.id);
    }
  }, [onEditCanvas]);

  const getInputRef = (tab: ResourceType) => {
    if (tab === 'video') return videoInputRef;
    if (tab === 'image') return imageInputRef;
    if (tab === 'music') return musicInputRef;
    if (tab === 'audio') return audioInputRef;
    return null;
  };

  const getAccept = (tab: ResourceType) => {
    if (tab === 'video') return 'video/*';
    if (tab === 'image' || tab === 'canvas') return 'image/*';
    return 'audio/*';
  };

  const currentItems = items[activeTab];
  const activeTabInfo = TABS.find(t => t.key === activeTab)!;

  const renderSectionItems = (tab: typeof TABS[number], sectionItems: ImportedMedia[]) => (
    <div className="space-y-1">
      {sectionItems.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60 text-center py-2">Nenhum item</p>
      ) : (
        sectionItems.map((media) => (
          <div
            key={media.id}
            draggable
            onDragStart={(e) => {
              const dragType = media.resourceType === 'music' || media.resourceType === 'audio' ? 'audio' : media.resourceType === 'canvas' ? 'canvas' : media.type;
              e.dataTransfer.setData('application/timeline-media', JSON.stringify({
                type: dragType,
                name: media.name,
                src: media.src,
                duration: media.duration,
                canvasJson: media.canvasJson,
              }));
              e.dataTransfer.setData(`mediatype/${dragType}`, '');
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDoubleClick={() => {
              if (media.resourceType === 'canvas' && media.canvasJson) {
                handleDoubleClickCanvas(media);
              }
            }}
            className={`flex items-center gap-2 p-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group cursor-grab active:cursor-grabbing ${
              media.resourceType === 'canvas' && media.canvasJson ? 'cursor-pointer' : ''
            }`}
          >
            {/* Thumbnail */}
            <div className="w-11 h-8 rounded bg-muted shrink-0 overflow-hidden relative">
              {media.type === 'video' ? (
                <>
                  <video src={media.src} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-3 w-3 text-white drop-shadow" />
                  </div>
                </>
              ) : media.type === 'image' ? (
                <img src={media.thumbnail || media.src} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">{media.name}</p>
              {media.duration && (
                <p className="text-[10px] text-muted-foreground">{Math.round(media.duration)}s</p>
              )}
              {media.resourceType === 'canvas' && media.canvasJson && (
                <p className="text-[9px] text-purple-400">Duplo clique para editar</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {media.resourceType === 'canvas' && media.canvasJson && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDoubleClickCanvas(media)} title="Editar canvas">
                  <Pencil className="h-3 w-3 text-purple-400" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddToTimeline(media)} title="Adicionar à timeline">
                <Plus className="h-3 w-3 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemove(media.id, media.resourceType)} title="Remover">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const [collapsedSections, setCollapsedSections] = useState<Set<ResourceType>>(new Set());
  const toggleSection = (key: ResourceType) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'video')} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'image')} />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'audio')} />
      <input ref={musicInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files, 'music')} />

      {/* All sections in a single scroll */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {TABS.map(tab => {
            const sectionItems = items[tab.key];
            const isCollapsed = collapsedSections.has(tab.key);
            return (
              <div key={tab.key} className="border border-border/40 rounded-lg overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(tab.key)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className={tab.color}>{tab.icon}</span>
                  <span className="text-[11px] font-semibold flex-1 text-left">{tab.label}</span>
                  {sectionItems.length > 0 && (
                    <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">{sectionItems.length}</span>
                  )}
                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                {!isCollapsed && (
                  <div className="px-2 pb-2 pt-1.5 space-y-1.5">
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      {tab.key === 'canvas' ? (
                        <>
                          <Button onClick={onOpenCanvas} variant="outline" className="flex-1 gap-1.5 text-[10px] h-7">
                            <Palette className="h-3 w-3" />Criar
                          </Button>
                          <Button onClick={() => imageInputRef.current?.click()} variant="outline" size="icon" className="h-7 w-7 shrink-0" title="Upload imagem">
                            <Upload className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {(tab.key === 'video' || tab.key === 'image') && (
                            <Button onClick={() => handleOpenGallery(tab.key as 'video' | 'image')} variant="outline" className="flex-1 gap-1.5 text-[10px] h-7">
                              <FolderOpen className="h-3 w-3" />Galeria
                            </Button>
                          )}
                          <Button
                            onClick={() => getInputRef(tab.key)?.current?.click()}
                            variant="outline"
                            className={`${tab.key === 'video' || tab.key === 'image' ? '' : 'flex-1'} gap-1.5 text-[10px] h-7`}
                            title="Upload do computador"
                          >
                            <Upload className="h-3 w-3" />
                            {tab.key !== 'video' && tab.key !== 'image' && 'Upload'}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* Items */}
                    {renderSectionItems(tab, sectionItems)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Gallery Dialog */}
      {galleryOpen && (
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
            <div className="flex items-center justify-between px-4 pt-10 pb-2 pr-12">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                {galleryType === 'video' ? <Film className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                Selecionar {galleryType === 'video' ? 'Vídeos' : 'Imagens'}
              </DialogTitle>
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b gap-2">
              <Button
                size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={() => { getInputRef(galleryType)?.current?.click(); setGalleryOpen(false); }}
              >
                <Upload className="h-3.5 w-3.5" />Upload do PC
              </Button>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>}
                <Button size="sm" disabled={selectedIds.size === 0} onClick={handleConfirmSelection} className="gap-1.5 text-xs">
                  <Check className="h-3.5 w-3.5" />Adicionar ({selectedIds.size})
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : galleryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {galleryType === 'video' ? <Film className="h-10 w-10 mb-2" /> : <ImageIcon className="h-10 w-10 mb-2" />}
                  <p className="text-sm">Nenhum {galleryType === 'video' ? 'vídeo' : 'imagem'} na galeria</p>
                  <Button variant="outline" size="sm" className="gap-1.5 mt-4" onClick={() => { getInputRef(galleryType)?.current?.click(); setGalleryOpen(false); }}>
                    <Upload className="h-3.5 w-3.5" />Upload do computador
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-4">
                  {galleryItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })}
                        className={`relative rounded-lg border-2 overflow-hidden transition-all group aspect-video bg-muted ${
                          isSelected ? 'border-primary ring-2 ring-primary/30 scale-[0.97]' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {galleryType === 'video' ? (
                          <video src={item.public_url} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : (
                          <img src={item.thumbnail_url || item.public_url} className="w-full h-full object-cover" alt={item.nome} />
                        )}
                        <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-border'
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
      )}
    </div>
  );
});

ResourcePanel.displayName = 'ResourcePanel';

export default ResourcePanel;
