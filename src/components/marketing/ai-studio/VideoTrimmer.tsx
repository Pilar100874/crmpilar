import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, Pause, SkipBack, SkipForward, Scissors, Save, 
  Loader2, Volume2, VolumeX, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoTrimmerProps {
  videoUrl: string;
  onSaveTrimmed: (blob: Blob, startTime: number, endTime: number) => Promise<void>;
  onSaveOriginal: () => void;
  isSaving?: boolean;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
};

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ videoUrl, onSaveTrimmed, onSaveOriginal, isSaving }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isTrimming, setIsTrimming] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const abortRef = useRef(false);

  const trimStart = (trimRange[0] / 100) * duration;
  const trimEnd = (trimRange[1] / 100) * duration;
  const trimmedDuration = trimEnd - trimStart;

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setTrimRange([0, 100]);
    setVideoReady(true);
  }, []);

  // Sync current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= trimEnd && (isPlaying || isPreviewing)) {
        video.pause();
        video.currentTime = trimStart;
        setIsPlaying(false);
        setIsPreviewing(false);
      }
      if (isPlaying || isPreviewing) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying || isPreviewing) {
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, isPreviewing, trimEnd, trimStart]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime >= trimEnd - 0.1 || video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      video.play();
      setIsPlaying(true);
    }
  }, [isPlaying, trimStart, trimEnd]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleTrimRangeChange = useCallback((values: number[]) => {
    setTrimRange([values[0], values[1]]);
    const newStart = (values[0] / 100) * duration;
    seekTo(newStart);
  }, [duration, seekTo]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    seekTo(Math.max(trimStart, Math.min(trimEnd, time)));
  }, [duration, trimStart, trimEnd, seekTo]);

  const resetTrim = useCallback(() => {
    setTrimRange([0, 100]);
    seekTo(0);
  }, [seekTo]);

  // Preview trimmed section
  const handlePreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    video.currentTime = trimStart;
    setCurrentTime(trimStart);
    
    setTimeout(() => {
      video.play();
      setIsPreviewing(true);
    }, 100);
  }, [trimStart]);

  // Export trimmed video - download original and re-encode
  const handleExportTrimmed = useCallback(async () => {
    setIsTrimming(true);
    setTrimProgress(0);
    abortRef.current = false;
    toast.info('Processando corte do vídeo...');

    try {
      // Fetch the video as blob to avoid CORS issues with canvas
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Falha ao carregar vídeo');
      const sourceBlob = await response.blob();
      const localUrl = URL.createObjectURL(sourceBlob);

      // Create a hidden video element for recording
      const offscreenVideo = document.createElement('video');
      offscreenVideo.src = localUrl;
      offscreenVideo.muted = false;
      offscreenVideo.playsInline = true;
      offscreenVideo.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        offscreenVideo.onloadedmetadata = () => resolve();
        offscreenVideo.onerror = () => reject(new Error('Erro ao carregar vídeo para corte'));
        setTimeout(() => reject(new Error('Timeout ao carregar vídeo')), 15000);
      });

      // Setup canvas
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = offscreenVideo.videoWidth || 1280;
      canvas.height = offscreenVideo.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context indisponível');

      // Seek to start
      offscreenVideo.currentTime = trimStart;
      await new Promise<void>((resolve) => {
        offscreenVideo.onseeked = () => resolve();
      });

      // Setup stream from canvas
      const canvasStream = canvas.captureStream(30);

      // Try to add audio
      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(offscreenVideo);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      } catch {
        // Audio capture may fail, continue without
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
        recorder.onerror = () => reject(new Error('Erro no MediaRecorder'));
      });

      recorder.start(100);
      await offscreenVideo.play();

      // Draw frames
      const drawFrame = () => {
        if (abortRef.current) {
          offscreenVideo.pause();
          recorder.stop();
          return;
        }
        if (offscreenVideo.currentTime >= trimEnd || offscreenVideo.paused || offscreenVideo.ended) {
          offscreenVideo.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(offscreenVideo, 0, 0, canvas.width, canvas.height);
        // Update progress
        const elapsed = offscreenVideo.currentTime - trimStart;
        const total = trimEnd - trimStart;
        setTrimProgress(Math.min(100, (elapsed / total) * 100));
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const blob = await recordingDone;
      
      // Cleanup
      URL.revokeObjectURL(localUrl);
      offscreenVideo.remove();
      if (audioCtx) audioCtx.close().catch(() => {});

      if (blob.size < 100) {
        throw new Error('O vídeo cortado ficou vazio. Tente ajustar a seleção.');
      }

      await onSaveTrimmed(blob, trimStart, trimEnd);
      toast.success('✅ Vídeo cortado e salvo!');
    } catch (err: any) {
      console.error('[VideoTrimmer] Export error:', err);
      toast.error('Erro ao cortar vídeo: ' + (err.message || String(err)));
    } finally {
      setIsTrimming(false);
      setTrimProgress(0);
    }
  }, [trimStart, trimEnd, videoUrl, onSaveTrimmed]);

  const hasTrimChanges = trimRange[0] > 0.5 || trimRange[1] < 99.5;

  return (
    <div className="flex flex-col w-full">
      {/* Video player */}
      <div className="relative bg-black rounded-t-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => { setIsPlaying(false); setIsPreviewing(false); }}
          muted={isMuted}
          className="w-full max-h-[55vh] object-contain"
          playsInline
          preload="auto"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Timeline / trim bar */}
      <div className="bg-card border-t border-border px-4 pt-3 pb-2 space-y-3">
        {/* Time markers */}
        <div className="relative">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span>{formatTime(trimStart)}</span>
            <span className="text-primary font-semibold">{formatTime(currentTime)}</span>
            <span>{formatTime(trimEnd)}</span>
          </div>

          {/* Visual timeline */}
          <div 
            className="relative h-10 bg-muted/50 rounded-md cursor-pointer overflow-hidden border"
            onClick={handleTimelineClick}
          >
            {/* Trim region */}
            <div 
              className="absolute top-0 bottom-0 bg-primary/15 border-x-2 border-primary/40"
              style={{ left: `${trimRange[0]}%`, width: `${trimRange[1] - trimRange[0]}%` }}
            />
            <div className="absolute top-0 bottom-0 left-0 bg-black/30" style={{ width: `${trimRange[0]}%` }} />
            <div className="absolute top-0 bottom-0 right-0 bg-black/30" style={{ width: `${100 - trimRange[1]}%` }} />

            {/* Faux waveform */}
            <div className="absolute inset-0 flex items-end px-0.5 gap-px pointer-events-none">
              {Array.from({ length: 80 }).map((_, i) => {
                const pos = (i / 80) * 100;
                const inRange = pos >= trimRange[0] && pos <= trimRange[1];
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-colors"
                    style={{
                      height: `${20 + Math.sin(i * 0.5) * 30 + Math.sin(i * 1.3) * 20}%`,
                      backgroundColor: inRange ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--muted-foreground) / 0.15)',
                    }}
                  />
                );
              })}
            </div>

            {/* Playhead */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3.5 h-2 bg-red-500 rounded-b-sm" 
                  style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </div>
            )}
          </div>

          {/* Dual-thumb trim slider */}
          <div className="mt-2">
            <Slider
              value={trimRange}
              onValueChange={handleTrimRangeChange}
              min={0}
              max={100}
              step={0.1}
              minStepsBetweenThumbs={2}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-2.5 [&_[role=slider]]:rounded-sm [&_[role=slider]]:border-primary"
            />
          </div>
        </div>

        {/* Duration info + progress */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Duração original: <strong className="text-foreground">{formatTime(duration)}</strong></span>
            {hasTrimChanges && (
              <span className="text-primary">
                Selecionado: <strong>{formatTime(trimmedDuration)}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isTrimming && (
              <span className="text-primary text-xs font-medium">{Math.round(trimProgress)}%</span>
            )}
            {hasTrimChanges && !isTrimming && (
              <button 
                onClick={resetTrim}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Resetar
              </button>
            )}
          </div>
        </div>

        {/* Progress bar during trimming */}
        {isTrimming && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${trimProgress}%` }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => seekTo(trimStart)} title="Ir para início">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={isPlaying ? 'default' : 'outline'}
              className="h-9 w-9"
              onClick={togglePlay}
              disabled={!videoReady || isTrimming}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => seekTo(trimEnd)} title="Ir para fim">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)} title={isMuted ? 'Ativar som' : 'Silenciar'}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {hasTrimChanges && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={handlePreview}
                  disabled={isTrimming || isSaving || isPreviewing}
                >
                  <Play className="h-3.5 w-3.5" />
                  {isPreviewing ? 'Simulando...' : 'Simular Corte'}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 text-xs"
                  onClick={handleExportTrimmed}
                  disabled={isTrimming || isSaving}
                >
                  {isTrimming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                  {isTrimming ? 'Cortando...' : 'Cortar e Salvar'}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={onSaveOriginal}
              disabled={isSaving || isTrimming}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Original
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimmer;
