import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  ZoomIn, ZoomOut, Film, Maximize2, Minimize2, Settings2, Magnet, FolderOpen,
  Download, Loader2, Save, GripHorizontal, Clock, Layers, ChevronDown,
  Plus, ArrowLeft, Clapperboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { convertVideoToWhatsappMp4, triggerDownload } from '@/lib/video/whatsappMp4';
import { useTimelineState } from './useTimelineState';
import TimelineTracks from './TimelineTracks';
import TimelineRuler from './TimelineRuler';
import TrackHeaders from './TrackHeaders';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import ResourcePanel, { ResourcePanelHandle } from './ResourcePanel';
import FloatingEffectsToolbar from './FloatingEffectsToolbar';
import VideoPreview from './VideoPreview';
import CanvasComposerDialog from './CanvasComposerDialog';
import VideoConfigPanel, { VideoConfig } from './VideoConfigPanel';
import { TRACK_COLORS, TimelineClip, DEFAULT_TRACKS, TransitionType, EFFECT_TRACK_PRESETS } from './types';
import MiniEffectPreview from './MiniEffectPreview';
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
  const [rightPanel, setRightPanel] = useState<'resources' | 'config' | 'properties'>('resources');
  const [effectsPanelOpen, setEffectsPanelOpen] = useState(false);
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
  const [previewEffectFromTimeline, setPreviewEffectFromTimeline] = useState<TransitionType | null>(null);
  const [editingEffectClipId, setEditingEffectClipId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [exportedVideoDuration, setExportedVideoDuration] = useState(0);
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewingTransition, setPreviewingTransition] = useState<{ clipId: string; phase: 'entrance' | 'exit' } | null>(null);
  const [filterPreviewActive, setFilterPreviewActive] = useState(false);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0, scrollWidth: 0, scrollHeight: 0, clientWidth: 0, clientHeight: 0 });

  // Keep floating scrollbar dimensions in sync with the timeline container
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const sync = () => {
      setScrollState({
        scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
        scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth, clientHeight: el.clientHeight,
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [state.tracks.length, state.clips.length, state.zoom, state.duration]);

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
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<string>('');

  const getCurrentStateHash = useCallback(() => {
    return JSON.stringify({ tracks: state.tracks, clips: state.clips, videoConfig });
  }, [state.tracks, state.clips, videoConfig]);

  const hasUnsavedChanges = useCallback(() => {
    if (state.clips.length === 0 && state.tracks.length === DEFAULT_TRACKS.length) return false;
    return getCurrentStateHash() !== lastSavedState;
  }, [getCurrentStateHash, lastSavedState, state.clips.length, state.tracks.length]);

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
      setLastSavedState(getCurrentStateHash());
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
        setLastSavedState(getCurrentStateHash());
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
    // Mark state as saved after loading
    setTimeout(() => setLastSavedState(JSON.stringify({ tracks: td.tracks, clips: td.clips || [], videoConfig: vc || videoConfig })), 100);
  }, [timeline, videoConfig]);

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
      const duration = Math.max(0.05, state.duration);

      const canvas = document.createElement('canvas');
      canvas.width = resW;
      canvas.height = resH;
      const ctx = canvas.getContext('2d')!;

      const mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {};
      const audioElements: Record<string, HTMLAudioElement> = {};

      for (const clip of state.clips) {
        if (!clip.src) continue;

        if (clip.type === 'video') {
          const vid = document.createElement('video');
          vid.src = clip.src;
          vid.crossOrigin = 'anonymous';
          vid.muted = true;
          vid.preload = 'auto';
          vid.playsInline = true;

          await new Promise<void>((resolve, reject) => {
            vid.onloadedmetadata = () => resolve();
            vid.onerror = () => reject(new Error(`Falha ao carregar vídeo: ${clip.name}`));
            vid.load();
          });

          mediaElements[clip.id] = vid;
        } else if (clip.type === 'image' || clip.type === 'canvas') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${clip.name}`));
          });

          mediaElements[clip.id] = img;
        } else if (clip.type === 'audio') {
          const audio = new Audio(clip.src);
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';

          await new Promise<void>((resolve, reject) => {
            audio.onloadedmetadata = () => resolve();
            audio.onerror = () => reject(new Error(`Falha ao carregar áudio: ${clip.name}`));
            audio.load();
          });

          audioElements[clip.id] = audio;
        }
      }

      const stream = canvas.captureStream(fps);
      const canvasTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;
      const hasSoloTrack = state.tracks.some((t) => t.solo);

      const isTrackMutedForExport = (trackId: string) => {
        const track = state.tracks.find((t) => t.id === trackId);
        return !!track?.muted || (hasSoloTrack && !track?.solo);
      };

      for (const clip of state.clips) {
        if (isTrackMutedForExport(clip.trackId)) continue;

        if (clip.type === 'video' && mediaElements[clip.id] instanceof HTMLVideoElement) {
          try {
            const vid = mediaElements[clip.id] as HTMLVideoElement;
            vid.muted = false;
            const trackVolume = state.tracks.find((t) => t.id === clip.trackId)?.volume ?? 1;
            vid.volume = (clip.volume ?? 1) * trackVolume;
            const source = audioCtx.createMediaElementSource(vid);
            source.connect(dest);
            hasAudio = true;
          } catch {
            // ignore duplicate source connections
          }
        }

        if (clip.type === 'audio' && audioElements[clip.id]) {
          try {
            const audio = audioElements[clip.id];
            const trackVolume = state.tracks.find((t) => t.id === clip.trackId)?.volume ?? 1;
            audio.volume = (clip.volume ?? 1) * trackVolume;
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(dest);
            hasAudio = true;
          } catch {
            // ignore duplicate source connections
          }
        }
      }

      if (hasAudio) {
        await audioCtx.resume().catch(() => undefined);
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 10_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      const seekVideo = (vid: HTMLVideoElement, time: number): Promise<void> => {
        return new Promise((resolve) => {
          const maxTime = Number.isFinite(vid.duration) ? Math.max(0, vid.duration - 0.001) : time;
          const safeTime = Math.max(0, Math.min(time, maxTime));
          const tolerance = Math.max(1 / (fps * 2), 0.01);

          if (Math.abs(vid.currentTime - safeTime) <= tolerance && vid.readyState >= 2) {
            resolve();
            return;
          }

          let settled = false;
          let timeoutId: number | undefined;
          let frameCbId: number | undefined;

          const done = () => {
            if (settled) return;
            settled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
            if (frameCbId !== undefined && 'cancelVideoFrameCallback' in vid) {
              (vid as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback?.(frameCbId);
            }
            resolve();
          };

          const afterSeek = () => {
            if ('requestVideoFrameCallback' in vid) {
              frameCbId = (vid as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number })
                .requestVideoFrameCallback(() => done());
            } else {
              requestAnimationFrame(() => done());
            }
          };

          timeoutId = window.setTimeout(() => done(), 900);
          vid.addEventListener('seeked', afterSeek, { once: true });
          vid.addEventListener('error', done, { once: true });
          vid.currentTime = safeTime;
        });
      };

      const sortedTracks = [...state.tracks];
      const clipsByTrack = new Map(
        sortedTracks.map((track) => [
          track.id,
          state.clips
            .filter((clip) => clip.trackId === track.id)
            .sort((a, b) => a.startTime - b.startTime),
        ])
      );

      const exportStartTs = performance.now();
      let lastProgress = -1;

      while (true) {
        const t = Math.min(duration, (performance.now() - exportStartTs) / 1000);

        ctx.fillStyle = videoConfig.backgroundColor;
        ctx.fillRect(0, 0, resW, resH);

        const activeVideoIds = new Set<string>();

        for (let ti = sortedTracks.length - 1; ti >= 0; ti--) {
          const track = sortedTracks[ti];
          if (!track.visible) continue;
          if (hasSoloTrack && !track.solo) continue;

          const trackClips = (clipsByTrack.get(track.id) || []).filter(
            (clip) => t >= clip.startTime && t < clip.startTime + clip.duration
          );

          for (const clip of trackClips) {
            if (clip.type === 'audio') continue;

            const el = mediaElements[clip.id];
            if (!el) continue;

            const destX = ((clip.x ?? 0) / 100) * resW;
            const destY = ((clip.y ?? 0) / 100) * resH;
            const destW = ((clip.w ?? 100) / 100) * resW;
            const destH = ((clip.h ?? 100) / 100) * resH;

            ctx.save();
            ctx.globalAlpha = clip.opacity ?? 1;

            if (clip.filters?.length) {
              const filterStr = clip.filters
                .filter((f) => f.enabled)
                .map((f) => {
                  switch (f.type) {
                    case 'brightness': return `brightness(${f.value / 50})`;
                    case 'contrast': return `contrast(${f.value / 50})`;
                    case 'saturation': return `saturate(${f.value / 50})`;
                    case 'hue-rotate': return `hue-rotate(${(f.value / 100) * 360}deg)`;
                    case 'blur': return `blur(${(f.value / 100) * 10}px)`;
                    case 'grayscale': return `grayscale(${f.value}%)`;
                    case 'sepia': return `sepia(${f.value}%)`;
                    case 'invert': return `invert(${f.value}%)`;
                    default: return '';
                  }
                })
                .filter(Boolean)
                .join(' ');

              if (filterStr) ctx.filter = filterStr;
            }

            if (el instanceof HTMLVideoElement) {
              activeVideoIds.add(clip.id);
              const clipTime = Math.max(0, t - clip.startTime + (clip.trimStart || 0));
              const maxTime = Number.isFinite(el.duration) ? Math.max(0, el.duration - 0.001) : clipTime;
              const desiredTime = Math.max(0, Math.min(clipTime, maxTime));
              const drift = Math.abs(el.currentTime - desiredTime);

              if (el.paused || drift > Math.max(0.12, 1 / fps)) {
                await seekVideo(el, desiredTime);
              }

              if (el.paused) {
                try { await el.play(); } catch { }
              }
            }

            const elW = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
            const elH = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;

            if (elW && elH) {
              const scale = Math.min(destW / elW, destH / elH);
              const drawW = elW * scale;
              const drawH = elH * scale;
              const drawX = destX + (destW - drawW) / 2;
              const drawY = destY + (destH - drawH) / 2;
              ctx.drawImage(el, drawX, drawY, drawW, drawH);
            } else {
              ctx.drawImage(el, destX, destY, destW, destH);
            }

            ctx.restore();
          }
        }

        for (const [id, el] of Object.entries(mediaElements)) {
          if (!(el instanceof HTMLVideoElement)) continue;
          if (!activeVideoIds.has(id) && !el.paused) el.pause();
        }

        for (const [audioId, audio] of Object.entries(audioElements)) {
          const clip = state.clips.find((c) => c.id === audioId);
          if (!clip || isTrackMutedForExport(clip.trackId)) {
            if (!audio.paused) audio.pause();
            continue;
          }

          const active = t >= clip.startTime && t < clip.startTime + clip.duration;
          if (!active) {
            if (!audio.paused) audio.pause();
            continue;
          }

          const clipTime = Math.max(0, t - clip.startTime + (clip.trimStart || 0));
          const maxTime = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.001) : clipTime;
          const desiredTime = Math.max(0, Math.min(clipTime, maxTime));

          if (audio.paused || Math.abs(audio.currentTime - desiredTime) > 0.18) {
            audio.currentTime = desiredTime;
          }

          if (audio.paused) {
            try { await audio.play(); } catch { }
          }
        }

        const progress = Math.min(90, Math.round((t / duration) * 90));
        if (progress !== lastProgress) {
          lastProgress = progress;
          setExportProgress(progress);
        }

        if (t >= duration) break;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            try {
              canvasTrack?.requestFrame();
            } catch {
              // track may not support requestFrame in all browsers
            }
            resolve();
          });
        });
      }

      try {
        canvasTrack?.requestFrame();
      } catch {
        // ignore
      }

      Object.values(mediaElements).forEach((el) => {
        if (el instanceof HTMLVideoElement) el.pause();
      });
      Object.values(audioElements).forEach((audio) => audio.pause());

      recorder.stop();
      const blob = await recordingDone;

      await audioCtx.close().catch(() => undefined);

      const url = URL.createObjectURL(blob);
      setExportedVideoBlob(blob);
      setExportedVideoUrl(url);
      setExportedVideoDuration(Math.round(duration));
      setExportProgress(100);
      toast.success('Vídeo gerado com sucesso!');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Erro ao gerar vídeo: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [state, videoConfig]);

  const handleSaveExportedToGallery = useCallback(async () => {
    if (!exportedVideoBlob) return;
    setIsSavingToGallery(true);
    try {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }

      // Convert to MP4 before saving
      const mp4Blob = await convertVideoToWhatsappMp4(exportedVideoBlob);
      const isMp4 = mp4Blob.type.startsWith('video/mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const contentType = isMp4 ? 'video/mp4' : 'video/webm';

      const fileName = `video_${Date.now()}.${ext}`;
      const path = `${estabId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('marketing-videos')
        .upload(path, mp4Blob, { contentType });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('marketing-videos').getPublicUrl(path);
      await supabase.from('media_gallery').insert({
        estabelecimento_id: estabId,
        tipo: 'video',
        nome: `Vídeo Editor ${new Date().toLocaleDateString('pt-BR')}`,
        public_url: urlData.publicUrl,
        storage_path: path,
        duracao_segundos: exportedVideoDuration,
      });
      toast.success('Vídeo salvo na galeria!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSavingToGallery(false);
    }
  }, [exportedVideoBlob, exportedVideoDuration]);

  const [isConverting, setIsConverting] = useState(false);

  const handleDownloadExported = useCallback(async () => {
    if (!exportedVideoBlob) return;
    setIsConverting(true);
    try {
      const mp4Blob = await convertVideoToWhatsappMp4(exportedVideoBlob);
      triggerDownload(mp4Blob, `video_editor_${Date.now()}`);
    } catch {
      // Fallback to raw blob
      triggerDownload(exportedVideoBlob, `video_editor_${Date.now()}`);
    } finally {
      setIsConverting(false);
    }
  }, [exportedVideoBlob]);

  const handleCloseExportPreview = useCallback(() => {
    if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
    setExportedVideoUrl(null);
    setExportedVideoBlob(null);
  }, [exportedVideoUrl]);

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
        if (type === 'image') return t.type === 'image' || t.type === 'canvas';
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
    const clipType = media?.canvasJson ? 'canvas' as const : type;

    timeline.addClip({
      trackId,
      type: clipType,
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

  const handleAddEffectClip = useCallback((trackId: string, startTime: number, effectType: TransitionType, label: string) => {
    timeline.addClip({
      trackId,
      type: 'effect',
      name: `✨ ${label}`,
      startTime: Math.max(0, startTime),
      duration: 2, // default 2 seconds
      trimStart: 0,
      trimEnd: 0,
      color: TRACK_COLORS.effect,
      volume: 1,
      opacity: 1,
      filters: [],
      effectType,
    });
  }, [timeline]);

  const handleOpenCanvasFromToolbar = useCallback(() => {
    setCanvasEditClipId(null);
    setCanvasEditResourceId(null);
    setCanvasEditJson(undefined);
    setCanvasDialogOpen(true);
  }, []);

  const handleDoubleClickClip = useCallback((clip: TimelineClip) => {
    if (clip.type === 'effect' && clip.effectType) {
      setEditingEffectClipId(clip.id);
      setPreviewEffectFromTimeline(clip.effectType);
      return;
    }
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
    if (hasUnsavedChanges()) {
      setUnsavedDialogOpen(true);
      return;
    }
    setShowEditor(false);
    setCurrentProjectId(null);
    setProjectName('');
    loadProjects();
  }, [loadProjects, hasUnsavedChanges]);

  const handleForceClose = useCallback(() => {
    setUnsavedDialogOpen(false);
    setShowEditor(false);
    setCurrentProjectId(null);
    setProjectName('');
    loadProjects();
  }, [loadProjects]);

  const handleSaveAndClose = useCallback(async () => {
    setUnsavedDialogOpen(false);
    if (currentProjectId) {
      await saveProject();
    } else {
      setSaveDialogOpen(true);
      // After saving from dialog, user can manually go back
      return;
    }
    setShowEditor(false);
    setCurrentProjectId(null);
    setProjectName('');
    loadProjects();
  }, [currentProjectId, saveProject, loadProjects]);

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
                onClick={() => { setCurrentProjectId(null); setProjectName(''); setLastSavedState(getCurrentStateHash()); setShowEditor(true); }}
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
                <VideoPreview clips={state.clips} currentTime={state.currentTime} tracks={state.tracks} isPlaying={state.isPlaying} selectedClipIds={state.selectedClipIds} onUpdateClip={timeline.updateClip} onSelectClip={(id) => timeline.selectClip(id)} previewingTransition={previewingTransition} previewingFilter={filterPreviewActive} resolution={videoConfig.resolution} />
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg px-1.5 py-0.5 border">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewZoom(prev => Math.max(0.25, prev - 0.25))}><ZoomOut className="h-3 w-3" /></Button>
                <button className="text-[10px] text-muted-foreground w-10 text-center hover:text-foreground" onClick={() => setPreviewZoom(1)}>{Math.round(previewZoom * 100)}%</button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewZoom(prev => Math.min(5, prev + 0.25))}><ZoomIn className="h-3 w-3" /></Button>
              </div>
            </div>
          )}

          {/* Fixed bars between preview and timeline */}
          <div className="shrink-0 z-10 relative bg-card border-t border-border/30">
            {showResizeBar && !previewCollapsed && (
              <div className="h-5 bg-muted/40 border-b border-border/40 cursor-row-resize flex items-center justify-center group relative"
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
              <div className="flex items-center justify-end px-2 py-0.5 gap-1 bg-muted/20 border-b border-border/20">
                {!showResizeBar && !previewCollapsed && <button className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/60" onClick={() => setShowResizeBar(true)}>↕ Resize</button>}
                {!showStatusBar && <button className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/60" onClick={() => setShowStatusBar(true)}>▤ Status</button>}
              </div>
            )}
          </div>

          {/* Timeline - single scrollable area */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={timelineScrollRef}
              className={`absolute inset-0 overflow-auto ${showFloatingScrollbar ? 'scrollbar-hide' : ''}`}
              onScroll={(e) => {
                const t = e.currentTarget;
                setScrollState({ scrollLeft: t.scrollLeft, scrollTop: t.scrollTop, scrollWidth: t.scrollWidth, scrollHeight: t.scrollHeight, clientWidth: t.clientWidth, clientHeight: t.clientHeight });
              }}
            >
              <div className="inline-flex flex-col" style={{ minWidth: '100%' }}>
                {/* Ruler row */}
                <div className="flex sticky top-0 z-20">
                  <div className="w-44 shrink-0 h-7 border-b border-r bg-muted/40 flex items-center justify-center sticky left-0 z-30">
                    <TrackHeaders tracks={state.tracks} onUpdateTrack={timeline.updateTrack} onDeleteTrack={timeline.deleteTrack} onAddTrack={timeline.addTrack} onMoveTrack={timeline.moveTrack} onReorderTrack={timeline.reorderTrack} renderMode="add-button" />
                  </div>
                  <div className="flex-1">
                    <TimelineRuler duration={state.duration} zoom={state.zoom} currentTime={state.currentTime} onSeek={timeline.seekTo} onDurationChange={(d) => timeline.updateState({ duration: d })} />
                  </div>
                </div>
                {/* Tracks - headers stick left, content scrolls */}
                <div className="flex">
                  <div className="w-44 shrink-0 sticky left-0 z-10 bg-card/95">
                    <TrackHeaders tracks={state.tracks} onUpdateTrack={timeline.updateTrack} onDeleteTrack={timeline.deleteTrack} onAddTrack={timeline.addTrack} onMoveTrack={timeline.moveTrack} onReorderTrack={timeline.reorderTrack} renderMode="tracks" />
                  </div>
                  <TimelineTracks state={state} onSelectClip={(id, multi) => { timeline.selectClip(id, multi); const clip = state.clips.find(c => c.id === id); if (clip?.type !== 'effect') { setEffectsPanelOpen(true); } }} onUpdateClip={timeline.updateClip} onDeselectAll={() => { timeline.deselectAll(); setEffectsPanelOpen(false); }} onSeek={timeline.seekTo} onDoubleClickClip={handleDoubleClickClip} onAddClip={handleAddClip} onAddEffectClip={handleAddEffectClip} />
                </div>
              </div>
            </div>

            {/* Floating scrollbars */}
            {showFloatingScrollbar && (() => {
              const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = scrollState;
              const hasHScroll = scrollWidth > clientWidth;
              const hasVScroll = scrollHeight > clientHeight;
              const hThumbW = hasHScroll ? Math.max(30, (clientWidth / scrollWidth) * (clientWidth - 20)) : 0;
              const hThumbLeft = hasHScroll ? (scrollLeft / (scrollWidth - clientWidth)) * (clientWidth - 20 - hThumbW) : 0;
              const vThumbH = hasVScroll ? Math.max(30, (clientHeight / scrollHeight) * (clientHeight - 20)) : 0;
              const vThumbTop = hasVScroll ? (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - 20 - vThumbH) : 0;

              const handleHDrag = (e: React.MouseEvent) => {
                e.preventDefault();
                const startX = e.clientX;
                const startScroll = timelineScrollRef.current?.scrollLeft || 0;
                const ratio = (scrollWidth - clientWidth) / (clientWidth - 20 - hThumbW);
                const onMove = (ev: MouseEvent) => {
                  if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = startScroll + (ev.clientX - startX) * ratio;
                };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              };

              const handleVDrag = (e: React.MouseEvent) => {
                e.preventDefault();
                const startY = e.clientY;
                const startScroll = timelineScrollRef.current?.scrollTop || 0;
                const ratio = (scrollHeight - clientHeight) / (clientHeight - 20 - vThumbH);
                const onMove = (ev: MouseEvent) => {
                  if (timelineScrollRef.current) timelineScrollRef.current.scrollTop = startScroll + (ev.clientY - startY) * ratio;
                };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              };

              return (
                <>
                  {/* Floating horizontal scrollbar */}
                  {hasHScroll && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{ width: '60%', maxWidth: clientWidth - 60 }}>
                      <div className="relative h-5 rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-lg shadow-black/20 ring-1 ring-white/5 pointer-events-auto flex items-center px-1.5">
                        <div className="relative w-full h-2">
                          <div
                            className="absolute top-0 h-2 rounded-full bg-primary/50 hover:bg-primary/70 active:bg-primary transition-colors cursor-grab active:cursor-grabbing shadow-sm"
                            style={{ left: `${(hThumbLeft / (clientWidth - 20)) * 100}%`, width: `${(hThumbW / (clientWidth - 20)) * 100}%` }}
                            onMouseDown={handleHDrag}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Floating vertical scrollbar */}
                  {hasVScroll && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 z-30 pointer-events-none" style={{ height: '60%', maxHeight: clientHeight - 60 }}>
                      <div className="relative w-5 h-full rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-lg shadow-black/20 ring-1 ring-white/5 pointer-events-auto flex justify-center py-1.5">
                        <div className="relative h-full w-2">
                          <div
                            className="absolute left-0 w-2 rounded-full bg-primary/50 hover:bg-primary/70 active:bg-primary transition-colors cursor-grab active:cursor-grabbing shadow-sm"
                            style={{ top: `${(vThumbTop / (clientHeight - 20)) * 100}%`, height: `${(vThumbH / (clientHeight - 20)) * 100}%` }}
                            onMouseDown={handleVDrag}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Toggle scrollbar button */}
            <button
              onClick={() => setShowFloatingScrollbar(prev => !prev)}
              className="absolute top-1 right-1 z-40 w-5 h-5 rounded bg-muted/60 hover:bg-muted backdrop-blur-sm flex items-center justify-center transition-colors"
              title={showFloatingScrollbar ? 'Ocultar barra de rolagem' : 'Mostrar barra de rolagem'}
            >
              <GripHorizontal className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l bg-card shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center border-b px-1 py-1 gap-0.5 shrink-0">
            <Button size="sm" variant={rightPanel === 'resources' ? 'default' : 'ghost'} onClick={() => setRightPanel('resources')} className="text-[10px] gap-1 flex-1 h-7 px-1"><FolderOpen className="h-3 w-3" />Recursos</Button>
            <Button size="sm" variant={rightPanel === 'config' ? 'default' : 'ghost'} onClick={() => setRightPanel('config')} className="text-[10px] gap-1 flex-1 h-7 px-1"><Settings2 className="h-3 w-3" />Config</Button>
            <Button size="sm" variant={rightPanel === 'properties' ? 'default' : 'ghost'} onClick={() => setRightPanel('properties')} className="text-[10px] gap-1 flex-1 h-7 px-1"><Settings2 className="h-3 w-3" />Props</Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'resources' && <ResourcePanel ref={resourcePanelRef} onAddClip={handleAddClip} onAddEffectClip={handleAddEffectClip} tracks={state.tracks} clips={state.clips} onOpenCanvas={handleOpenCanvasFromToolbar} onEditCanvas={handleEditCanvasFromResource} />}
            {rightPanel === 'config' && <VideoConfigPanel config={videoConfig} onChange={setVideoConfig} />}
            {rightPanel === 'properties' && <ClipPropertiesPanel clip={selectedClip || undefined} onUpdateClip={timeline.updateClip} />}
          </div>
        </div>
      </div>

      {/* Floating Effects Toolbar */}
      {effectsPanelOpen && selectedClip && (
        <FloatingEffectsToolbar
          selectedClip={selectedClip}
          onUpdateClip={timeline.updateClip}
          onPreviewTransition={(clipId, phase) => setPreviewingTransition({ clipId, phase })}
          onToggleFilterPreview={setFilterPreviewActive}
          onClose={() => setEffectsPanelOpen(false)}
          onSimulate={(active) => setFilterPreviewActive(active)}
          isSimulating={filterPreviewActive}
        />
      )}

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

      {/* Unsaved changes dialog */}
      <AlertDialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem modificações que não foram salvas. Deseja salvar antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleForceClose}>Descartar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              <Save className="h-3.5 w-3.5 mr-1" />Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export preview dialog */}
      <Dialog open={!!exportedVideoUrl} onOpenChange={(open) => { if (!open) handleCloseExportPreview(); }}>
        <DialogContent className="max-w-3xl p-0 overflow-visible [&>button]:hidden">
          <div className="relative">
            {/* Close & Save buttons overlay */}
            <div className="absolute top-3 right-3 z-[200] flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 text-xs h-8 shadow-lg"
                onClick={handleDownloadExported}
                disabled={isConverting}
              >
                {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {isConverting ? 'Convertendo...' : 'Baixar MP4'}
              </Button>
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 text-xs h-8 shadow-lg"
                onClick={handleSaveExportedToGallery}
                disabled={isSavingToGallery}
              >
                {isSavingToGallery ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar na Galeria
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-foreground/70 hover:text-foreground bg-background/60 backdrop-blur-sm rounded-full shadow-lg"
                onClick={handleCloseExportPreview}
              >
                ✕
              </Button>
            </div>

            {/* Video player */}
            <div className="bg-black rounded-t-lg overflow-hidden">
              {exportedVideoUrl && (
                <video
                  src={exportedVideoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] object-contain"
                  controlsList="nofullscreen nodownload"
                />
              )}
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 bg-card rounded-b-lg border-t flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Vídeo Gerado</p>
                <p className="text-xs text-muted-foreground">
                  Duração: {exportedVideoDuration}s • {videoConfig.resolution} • {videoConfig.fps}fps
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Effect preview dialog from timeline double-click */}
      {previewEffectFromTimeline && (
        <Dialog open onOpenChange={() => setPreviewEffectFromTimeline(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
            <DialogTitle className="px-4 pt-4 text-sm font-semibold">
              {EFFECT_TRACK_PRESETS.find(p => p.type === previewEffectFromTimeline)?.label || 'Efeito'} — Preview
            </DialogTitle>
            <div className="flex flex-col items-center gap-3 p-4">
              <MiniEffectPreview effectType={previewEffectFromTimeline} size={280} autoPlay />
              <p className="text-xs text-muted-foreground text-center">
                {EFFECT_TRACK_PRESETS.find(p => p.type === previewEffectFromTimeline)?.description}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VideoTimelineEditor;
