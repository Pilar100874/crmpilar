import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  ZoomIn, ZoomOut, Film, Maximize2, Minimize2, Settings2, Magnet, Sparkles, FolderOpen,
  Download, Loader2, Save, GripHorizontal, Clock, Layers, ChevronDown,
  Plus, ArrowLeft, Clapperboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTimelineState } from './useTimelineState';
import TimelineTracks from './TimelineTracks';
import TimelineRuler from './TimelineRuler';
import TrackHeaders from './TrackHeaders';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import ResourcePanel, { ResourcePanelHandle } from './ResourcePanel';
import EffectsPanel from './EffectsPanel';
import VideoPreview from './VideoPreview';
import CanvasComposerDialog from './CanvasComposerDialog';
import VideoConfigPanel, { VideoConfig } from './VideoConfigPanel';
import { TRACK_COLORS, TimelineClip } from './types';
import { WorkflowCard, WorkflowCardGrid } from '@/components/ui/workflow-card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
  canvasJson?: string;
}

interface VideoProject {
  id: string;
  nome: string;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

const VideoTimelineEditor: React.FC = () => {
  const timeline = useTimelineState();
  const { state } = timeline;
  const [rightPanel, setRightPanel] = useState<'resources' | 'effects' | 'config' | 'properties'>('resources');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(300);
  const resizingRef = useRef(false);
  const resizeStartRef = useRef({ y: 0, height: 0 });
  const [showResizeBar, setShowResizeBar] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasEditClipId, setCanvasEditClipId] = useState<string | null>(null);
  const [canvasEditJson, setCanvasEditJson] = useState<string | undefined>(undefined);
  const [canvasEditResourceId, setCanvasEditResourceId] = useState<string | null>(null);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    backgroundColor: '#000000',
    resolution: '1920x1080',
    fps: 30,
    destination: 'youtube',
    format: 'mp4',
  });
  const resourcePanelRef = useRef<ResourcePanelHandle>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Project management
  const [showEditor, setShowEditor] = useState(false);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadProjects = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { setLoadingProjects(false); return; }
    setLoadingProjects(true);
    const { data } = await supabase
      .from('video_projects')
      .select('id, nome, thumbnail, created_at, updated_at')
      .eq('estabelecimento_id', estabId)
      .order('updated_at', { ascending: false });
    if (data) setProjects(data as VideoProject[]);
    setLoadingProjects(false);
  }, []);

  const saveProject = useCallback(async (name?: string) => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }

    const timelineData = {
      tracks: state.tracks,
      clips: state.clips,
      duration: state.duration,
      zoom: state.zoom,
      fps: state.fps,
    };

    if (currentProjectId) {
      await supabase
        .from('video_projects')
        .update({
          nome: name || projectName || 'Projeto sem título',
          timeline_data: timelineData as any,
          video_config: videoConfig as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProjectId);
      toast.success('Projeto salvo!');
    } else {
      const finalName = name || projectName || `Projeto ${new Date().toLocaleDateString('pt-BR')}`;
      const { data } = await supabase
        .from('video_projects')
        .insert({
          estabelecimento_id: estabId,
          nome: finalName,
          timeline_data: timelineData as any,
          video_config: videoConfig as any,
        })
        .select('id')
        .single();
      if (data) {
        setCurrentProjectId(data.id);
        setProjectName(finalName);
        toast.success('Projeto criado!');
      }
    }
    loadProjects();
  }, [state, videoConfig, currentProjectId, projectName, loadProjects]);

  const loadProject = useCallback(async (project: VideoProject) => {
    const { data } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', project.id)
      .single();
    if (!data) return;
    
    const td = data.timeline_data as any;
    const vc = data.video_config as any;
    
    if (td.tracks) timeline.updateState({ tracks: td.tracks, clips: td.clips || [], duration: td.duration || 60, zoom: td.zoom || 40, fps: td.fps || 30 });
    if (vc) setVideoConfig(vc);
    setCurrentProjectId(project.id);
    setProjectName(project.nome);
    setShowEditor(true);
    toast.success(`Projeto "${project.nome}" carregado`);
  }, [timeline]);

  const duplicateProject = useCallback(async (project: VideoProject) => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    const { data: original } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', project.id)
      .single();
    if (!original) return;
    await supabase.from('video_projects').insert({
      estabelecimento_id: estabId,
      nome: `${original.nome} (cópia)`,
      timeline_data: original.timeline_data,
      video_config: original.video_config,
      thumbnail: original.thumbnail,
    });
    loadProjects();
    toast.success('Projeto duplicado!');
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('video_projects').delete().eq('id', id);
    if (currentProjectId === id) { setCurrentProjectId(null); setProjectName(''); }
    loadProjects();
    toast.success('Projeto excluído');
  }, [currentProjectId, loadProjects]);

  const renameProject = useCallback(async () => {
    if (!renameProjectId || !renameName.trim()) return;
    await supabase.from('video_projects').update({ nome: renameName.trim() }).eq('id', renameProjectId);
    setRenameDialogOpen(false);
    setRenameProjectId(null);
    loadProjects();
    if (renameProjectId === currentProjectId) setProjectName(renameName.trim());
    toast.success('Projeto renomeado');
  }, [renameProjectId, renameName, currentProjectId, loadProjects]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleExportVideo = useCallback(async () => {
    if (state.clips.length === 0) {
      toast.error('Adicione conteúdo à timeline antes de gerar o vídeo');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const [resW, resH] = videoConfig.resolution.split('x').map(Number);
      const fps = videoConfig.fps;
      const duration = state.duration;
      const totalFrames = Math.ceil(duration * fps);

      const canvas = document.createElement('canvas');
      canvas.width = resW;
      canvas.height = resH;
      const ctx = canvas.getContext('2d')!;

      const mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {};
      for (const clip of state.clips) {
        if (!clip.src) continue;
        if (clip.type === 'video') {
          const vid = document.createElement('video');
          vid.src = clip.src;
          vid.crossOrigin = 'anonymous';
          vid.muted = true;
          vid.preload = 'auto';
          await new Promise<void>((res, rej) => { vid.onloadeddata = () => res(); vid.onerror = () => rej(); vid.load(); });
          mediaElements[clip.id] = vid;
        } else if (clip.type === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
          mediaElements[clip.id] = img;
        }
      }

      const stream = canvas.captureStream(fps);
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;
      const hasSoloTrack = state.tracks.some(t => t.solo);
      for (const clip of state.clips) {
        const clipTrack = state.tracks.find(t => t.id === clip.trackId);
        // Skip audio for muted tracks or non-solo tracks when solo exists
        const isTrackMuted = clipTrack?.muted || (hasSoloTrack && !clipTrack?.solo);
        if (isTrackMuted) continue;

        if (clip.type === 'video' && mediaElements[clip.id] instanceof HTMLVideoElement) {
          try {
            const vid = mediaElements[clip.id] as HTMLVideoElement;
            vid.muted = false;
            vid.volume = (clip.volume ?? 1) * (clipTrack?.volume ?? 1);
            const source = audioCtx.createMediaElementSource(vid);
            source.connect(dest);
            hasAudio = true;
          } catch { }
        }
        if (clip.type === 'audio' && clip.src) {
          try {
            const audio = new Audio(clip.src);
            audio.crossOrigin = 'anonymous';
            audio.volume = (clip.volume ?? 1) * (clipTrack?.volume ?? 1);
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(dest);
            hasAudio = true;
          } catch { }
        }
      }

      if (hasAudio) {
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.start(100);

      const sortedTracks = [...state.tracks];
      for (let frame = 0; frame < totalFrames; frame++) {
        const t = frame / fps;
        ctx.fillStyle = videoConfig.backgroundColor;
        ctx.fillRect(0, 0, resW, resH);

        for (let ti = sortedTracks.length - 1; ti >= 0; ti--) {
          const track = sortedTracks[ti];
          if (!track.visible) continue;
          const trackClips = state.clips
            .filter(c => c.trackId === track.id && t >= c.startTime && t < c.startTime + c.duration)
            .sort((a, b) => a.startTime - b.startTime);

          for (const clip of trackClips) {
            const el = mediaElements[clip.id];
            if (!el) continue;
            const x = ((clip.x ?? 0) / 100) * resW;
            const y = ((clip.y ?? 0) / 100) * resH;
            const w = ((clip.w ?? 100) / 100) * resW;
            const h = ((clip.h ?? 100) / 100) * resH;

            ctx.globalAlpha = clip.opacity ?? 1;
            if (el instanceof HTMLVideoElement) {
              el.currentTime = t - clip.startTime + (clip.trimStart || 0);
              ctx.drawImage(el, x, y, w, h);
            } else {
              ctx.drawImage(el, x, y, w, h);
            }
            ctx.globalAlpha = 1;
          }
        }

        setExportProgress(Math.round((frame / totalFrames) * 90));
        await new Promise(r => setTimeout(r, 1000 / fps));
      }

      recorder.stop();
      const blob = await recordingDone;

      const estabId = localStorage.getItem('estabelecimentoId');
      if (estabId) {
        const fileName = `video_${Date.now()}.webm`;
        const path = `${estabId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('marketing-videos')
          .upload(path, blob, { contentType: mimeType });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('marketing-videos').getPublicUrl(path);
          await supabase.from('media_gallery').insert({
            estabelecimento_id: estabId,
            tipo: 'video',
            nome: `Vídeo Editor ${new Date().toLocaleDateString('pt-BR')}`,
            public_url: urlData.publicUrl,
            storage_path: path,
            duracao_segundos: Math.round(duration),
          });
          toast.success('Vídeo gerado e salvo na galeria!');
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = fileName; a.click();
          URL.revokeObjectURL(url);
          toast.info('Upload falhou. Vídeo baixado localmente.');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `video_editor_${Date.now()}.webm`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Vídeo gerado e baixado!');
      }

      setExportProgress(100);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Erro ao gerar vídeo: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [state, videoConfig]);

  const selectedClip = state.selectedClipIds.length === 1
    ? state.clips.find((c) => c.id === state.selectedClipIds[0])
    : null;

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const ids = stateRef.current.selectedClipIds;
        if (ids.length > 0) timeline.deleteClips(ids);
      }
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline, isFullscreen]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.floor((t % 1) * state.fps);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  const tracksRef = useRef(state.tracks);
  tracksRef.current = state.tracks;
  const clipsRef = useRef(state.clips);
  clipsRef.current = state.clips;

  const handleAddClip = useCallback((type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, targetTrackId?: string) => {
    const tracks = tracksRef.current;
    const clips = clipsRef.current;
    let trackId = targetTrackId;
    if (!trackId || !tracks.find(t => t.id === trackId)) {
      trackId = tracks.find((t) => {
        if (type === 'audio') return t.type === 'audio';
        if (type === 'image') return t.type === 'image';
        if (type === 'text') return t.type === 'text';
        return t.type === 'video';
      })?.id;
    }
    if (!trackId) return;

    const lastClip = clips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => (b.startTime + b.duration) - (a.startTime + a.duration))[0];
    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
    const targetTrack = tracks.find(t => t.id === trackId);
    const trackType = targetTrack?.type || (type === 'image' ? 'video' : type);
    const color = TRACK_COLORS[trackType] || TRACK_COLORS.video;
    const clipDuration = media?.duration || (type === 'text' ? 3 : type === 'audio' ? 10 : 5);

    timeline.addClip({
      trackId,
      type,
      name: media?.name || `${type === 'video' ? 'Cena' : type === 'audio' ? 'Áudio' : type === 'text' ? 'Texto' : 'Imagem'} ${clips.length + 1}`,
      startTime,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: 0,
      color,
      volume: 1,
      opacity: 1,
      filters: [],
      src: media?.src,
      canvasJson: media?.canvasJson,
      x: 0, y: 0, w: 100, h: 100,
    });
  }, [timeline]);

  const handleOpenCanvasFromToolbar = useCallback(() => {
    setCanvasEditClipId(null);
    setCanvasEditResourceId(null);
    setCanvasEditJson(undefined);
    setCanvasDialogOpen(true);
  }, []);

  const handleDoubleClickClip = useCallback((clip: TimelineClip) => {
    if (clip.canvasJson) {
      setCanvasEditClipId(clip.id);
      setCanvasEditResourceId(null);
      setCanvasEditJson(clip.canvasJson);
      setCanvasDialogOpen(true);
    }
  }, []);

  const handleEditCanvasFromResource = useCallback((canvasJson: string, itemId: string) => {
    setCanvasEditClipId(null);
    setCanvasEditResourceId(itemId);
    setCanvasEditJson(canvasJson);
    setCanvasDialogOpen(true);
  }, []);

  const handleCanvasEditConfirm = useCallback((imageDataUrl: string, canvasJson: string) => {
    setCanvasDialogOpen(false);
    if (canvasEditClipId) {
      // Editing existing clip in timeline
      timeline.updateClip(canvasEditClipId, { src: imageDataUrl, canvasJson });
    } else if (canvasEditResourceId) {
      // Editing existing canvas in resource panel
      (resourcePanelRef.current as any)?.updateCanvasItem?.(canvasEditResourceId, imageDataUrl, canvasJson);
    } else {
      // New canvas — add to resource panel
      const clips = clipsRef.current;
      const name = `Canvas ${clips.filter(c => c.canvasJson).length + 1}`;
      resourcePanelRef.current?.addCanvasItem(name, imageDataUrl, canvasJson);
    }
    setCanvasEditClipId(null);
    setCanvasEditResourceId(null);
    setCanvasEditJson(undefined);
  }, [canvasEditClipId, canvasEditResourceId, timeline]);

  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setCurrentProjectId(null);
    setProjectName('');
    loadProjects();
  }, [loadProjects]);

  // Landing page
  if (!showEditor) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[600px] rounded-xl overflow-hidden bg-card border border-border text-card-foreground flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-start px-3 sm:px-6 relative overflow-y-auto pt-6 sm:pt-10 pb-16">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-3xl w-full"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3 sm:mb-5 text-[9px] sm:text-xs text-muted-foreground">
              <Clapperboard className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
              Timeline completa com efeitos, cortes e transições
            </div>

            <h1 className="text-xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-2 sm:mb-4">
              <span className="text-foreground">Editor de</span>{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Vídeo</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-lg text-muted-foreground mb-4 sm:mb-8 max-w-xl mx-auto leading-relaxed px-2">
              Crie e edite vídeos com múltiplas trilhas, efeitos e transições profissionais.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-10">
              <Button
                onClick={() => { setCurrentProjectId(null); setProjectName(''); setShowEditor(true); }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium gap-1.5 sm:gap-2 text-[11px] sm:text-sm"
              >
                <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Novo Projeto
              </Button>
            </div>
          </motion.div>

          {/* Saved Projects */}
          {projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 w-full max-w-5xl mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Meus Projetos</p>
              </div>

              <WorkflowCardGrid>
                {projects.map((p) => (
                  <WorkflowCard
                    key={p.id}
                    id={p.id}
                    title={p.nome}
                    isActive={true}
                    createdAt={p.created_at}
                    mediaTypes={['video']}
                    onOpenEditor={() => loadProject(p)}
                    onRename={() => { setRenameProjectId(p.id); setRenameValue(p.nome); setRenameDialogOpen(true); }}
                    onDuplicate={() => duplicateProject(p)}
                    onDelete={() => setDeleteConfirm({ id: p.id, nome: p.nome })}
                  />
                ))}
              </WorkflowCardGrid>
            </motion.div>
          )}

          {loadingProjects && projects.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregando projetos...</p>
          )}
        </div>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deleteConfirm?.nome}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteConfirm) deleteProject(deleteConfirm.id); setDeleteConfirm(null); }}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename dialog */}
        {renameDialogOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => setRenameDialogOpen(false)}>
            <div className="bg-card rounded-xl p-6 w-[400px] shadow-2xl border" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Renomear Projeto</h3>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameProjectId) {
                    supabase.from('video_projects').update({ nome: renameValue.trim() }).eq('id', renameProjectId).then(() => {
                      loadProjects();
                      setRenameDialogOpen(false);
                      toast.success('Projeto renomeado');
                    });
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => {
                  if (renameProjectId) {
                    supabase.from('video_projects').update({ nome: renameValue.trim() }).eq('id', renameProjectId).then(() => {
                      loadProjects();
                      setRenameDialogOpen(false);
                      toast.success('Projeto renomeado');
                    });
                  }
                }}>Renomear</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Editor view
  return (
    <div
      ref={containerRef}
      className={`flex flex-col border rounded-xl overflow-hidden bg-background ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[calc(100vh-200px)] min-h-[700px]'
      }`}
      tabIndex={0}
    >
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-card/80 backdrop-blur shrink-0">
        {/* Back button */}
        <Button size="icon" variant="ghost" onClick={handleCloseEditor} title="Voltar aos projetos" className="h-8 w-8 mr-1">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Playback */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(0)} title="Início" className="h-8 w-8">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant={state.isPlaying ? 'default' : 'ghost'} onClick={() => state.isPlaying ? timeline.pause() : timeline.play()} className="h-9 w-9">
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(state.duration)} title="Fim" className="h-8 w-8">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md min-w-[100px] text-center">
          {formatTime(state.currentTime)}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Edit tools */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => selectedClip && timeline.splitClip(selectedClip.id, state.currentTime)} disabled={!selectedClip} title="Cortar">
            <Scissors className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => selectedClip && timeline.duplicateClip(selectedClip.id)} disabled={!selectedClip} title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => timeline.deleteClips(state.selectedClipIds)} disabled={state.selectedClipIds.length === 0} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant={state.snapEnabled ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => timeline.updateState({ snapEnabled: !state.snapEnabled })} title="Snap">
            <Magnet className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Save */}
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => {
          if (currentProjectId) { saveProject(); } else { setSaveDialogOpen(true); }
        }}>
          <Save className="h-3.5 w-3.5" />
          {currentProjectId ? 'Salvar' : 'Salvar como'}
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={timeline.zoomOut} className="h-8 w-8"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(state.zoom)}x</span>
          <Button size="icon" variant="ghost" onClick={timeline.zoomIn} className="h-8 w-8"><ZoomIn className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Sair' : 'Tela cheia'}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button onClick={handleExportVideo} disabled={isExporting || state.clips.length === 0} variant="default" size="sm" className="gap-1.5 text-xs h-8 px-3">
          {isExporting ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />{exportProgress}%</>) : (<><Download className="h-3.5 w-3.5" />Gerar Vídeo</>)}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          {!previewCollapsed && (
            <div className="flex items-center justify-center relative shrink-0 overflow-hidden" style={{ height: previewHeight, backgroundColor: videoConfig.backgroundColor === '#transparent' ? 'transparent' : videoConfig.backgroundColor }}
              onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setPreviewZoom(prev => Math.min(5, Math.max(0.25, prev + (e.deltaY < 0 ? 0.1 : -0.1)))); } }}>
              <div style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}>
                <VideoPreview clips={state.clips} currentTime={state.currentTime} tracks={state.tracks} isPlaying={state.isPlaying} selectedClipIds={state.selectedClipIds} onUpdateClip={timeline.updateClip} onSelectClip={(id) => timeline.selectClip(id)} />
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg px-1.5 py-0.5 border">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewZoom(prev => Math.max(0.25, prev - 0.25))}><ZoomOut className="h-3 w-3" /></Button>
                <button className="text-[10px] text-muted-foreground w-10 text-center hover:text-foreground" onClick={() => setPreviewZoom(1)}>{Math.round(previewZoom * 100)}%</button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewZoom(prev => Math.min(5, prev + 0.25))}><ZoomIn className="h-3 w-3" /></Button>
              </div>
            </div>
          )}

          {/* Fixed bars */}
          <div className="shrink-0">
            {showResizeBar && !previewCollapsed && (
              <div className="h-5 bg-muted/40 border-y border-border/40 cursor-row-resize flex items-center justify-center group relative"
                onMouseDown={(e) => {
                  e.preventDefault(); resizingRef.current = true; resizeStartRef.current = { y: e.clientY, height: previewHeight };
                  const onMouseMove = (ev: MouseEvent) => { if (!resizingRef.current) return; setPreviewHeight(Math.min(800, Math.max(120, resizeStartRef.current.height + ev.clientY - resizeStartRef.current.y))); };
                  const onMouseUp = () => { resizingRef.current = false; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
                  document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
                }}>
                <GripHorizontal className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                <button className="absolute right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all" onClick={(e) => { e.stopPropagation(); setShowResizeBar(false); }}><Minimize2 className="h-2.5 w-2.5" /></button>
              </div>
            )}
            {showStatusBar && (
              <div className="h-6 bg-muted/30 border-b border-border/40 px-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>
                  <span className="flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{state.tracks.length} trilhas · {state.clips.length} clipes</span>
                  {currentProjectId && <span className="text-primary/70 font-medium">{projectName}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!showResizeBar && !previewCollapsed && <button className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-background/80" onClick={() => setShowResizeBar(true)}><GripHorizontal className="h-2.5 w-2.5 inline" /></button>}
                  <button className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-background/80" onClick={() => setShowStatusBar(false)}><Minimize2 className="h-2.5 w-2.5" /></button>
                </div>
              </div>
            )}
            {previewCollapsed && (
              <div className="bg-muted/30 px-3 py-1 flex items-center gap-2 border-b border-border/40">
                <Button size="sm" variant="ghost" onClick={() => setPreviewCollapsed(false)} className="text-xs gap-1 h-6"><ChevronDown className="h-3 w-3" />Mostrar Preview</Button>
                <span className="text-[10px] text-muted-foreground">{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>
              </div>
            )}
            {(!showResizeBar || !showStatusBar) && (
              <div className="flex items-center justify-end px-2 py-0.5 gap-1 bg-muted/20">
                {!showResizeBar && !previewCollapsed && <button className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/60" onClick={() => setShowResizeBar(true)}>↕ Resize</button>}
                {!showStatusBar && <button className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/60" onClick={() => setShowStatusBar(true)}>▤ Status</button>}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            <TrackHeaders tracks={state.tracks} onUpdateTrack={timeline.updateTrack} onDeleteTrack={timeline.deleteTrack} onAddTrack={timeline.addTrack} onMoveTrack={timeline.moveTrack} onReorderTrack={timeline.reorderTrack} />
            <div className="flex-1 overflow-auto relative flex flex-col">
              <TimelineRuler duration={state.duration} zoom={state.zoom} currentTime={state.currentTime} onSeek={timeline.seekTo} onDurationChange={(d) => timeline.updateState({ duration: d })} />
              <TimelineTracks state={state} onSelectClip={timeline.selectClip} onUpdateClip={timeline.updateClip} onDeselectAll={timeline.deselectAll} onSeek={timeline.seekTo} onDoubleClickClip={handleDoubleClickClip} onAddClip={handleAddClip} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l bg-card shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center border-b px-1 py-1 gap-0.5 shrink-0">
            <Button size="sm" variant={rightPanel === 'resources' ? 'default' : 'ghost'} onClick={() => setRightPanel('resources')} className="text-[10px] gap-1 flex-1 h-7 px-1"><FolderOpen className="h-3 w-3" />Recursos</Button>
            <Button size="sm" variant={rightPanel === 'effects' ? 'default' : 'ghost'} onClick={() => setRightPanel('effects')} className="text-[10px] gap-1 flex-1 h-7 px-1"><Sparkles className="h-3 w-3" />Efeitos</Button>
            <Button size="sm" variant={rightPanel === 'config' ? 'default' : 'ghost'} onClick={() => setRightPanel('config')} className="text-[10px] gap-1 flex-1 h-7 px-1"><Settings2 className="h-3 w-3" />Config</Button>
            <Button size="sm" variant={rightPanel === 'properties' ? 'default' : 'ghost'} onClick={() => setRightPanel('properties')} className="text-[10px] gap-1 flex-1 h-7 px-1"><Settings2 className="h-3 w-3" />Props</Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'resources' && <ResourcePanel ref={resourcePanelRef} onAddClip={handleAddClip} tracks={state.tracks} onOpenCanvas={handleOpenCanvasFromToolbar} onEditCanvas={handleEditCanvasFromResource} />}
            {rightPanel === 'config' && <VideoConfigPanel config={videoConfig} onChange={setVideoConfig} />}
            {rightPanel === 'effects' && <EffectsPanel selectedClip={selectedClip || undefined} onUpdateClip={timeline.updateClip} />}
            {rightPanel === 'properties' && <ClipPropertiesPanel clip={selectedClip || undefined} onUpdateClip={timeline.updateClip} />}
          </div>
        </div>
      </div>

      <CanvasComposerDialog open={canvasDialogOpen} onClose={() => { setCanvasDialogOpen(false); setCanvasEditClipId(null); setCanvasEditResourceId(null); setCanvasEditJson(undefined); }} onConfirm={handleCanvasEditConfirm} initialCanvasJson={canvasEditJson} />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Salvar Projeto</DialogTitle>
          <Input placeholder="Nome do projeto" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { saveProject(projectName); setSaveDialogOpen(false); } }} autoFocus />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => { saveProject(projectName); setSaveDialogOpen(false); }}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoTimelineEditor;
