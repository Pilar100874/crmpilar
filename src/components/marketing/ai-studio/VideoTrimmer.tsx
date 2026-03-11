import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isTrimming, setIsTrimming] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const animRef = useRef<number | null>(null);

  const trimStart = (trimRange[0] / 100) * duration;
  const trimEnd = (trimRange[1] / 100) * duration;
  const trimmedDuration = trimEnd - trimStart;

  // Handle video metadata loaded
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
      // Stop at trim end during playback
      if (video.currentTime >= trimEnd && isPlaying) {
        video.pause();
        setIsPlaying(false);
      }
      if (isPlaying) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, trimEnd]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // If at or past trim end, restart from trim start
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
    // Seek to the start of the new range
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

  // Export trimmed video using MediaRecorder + canvas
  const handleExportTrimmed = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsTrimming(true);
    toast.info('Processando corte do vídeo...');

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Seek to trim start
      video.currentTime = trimStart;
      video.muted = true;
      
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Capture stream from canvas
      const stream = canvas.captureStream(30);
      
      // Try to capture audio too
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch {
        // Audio capture may fail in some browsers, continue without audio
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
        recorder.onerror = (e) => reject(e);
      });

      recorder.start(100);
      video.muted = isMuted;
      await video.play();

      // Draw frames to canvas while recording
      const drawFrame = () => {
        if (video.currentTime >= trimEnd || video.paused) {
          video.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const blob = await recordingDone;
      await onSaveTrimmed(blob, trimStart, trimEnd);
      toast.success('✅ Vídeo cortado e salvo!');
    } catch (err: any) {
      console.error('[VideoTrimmer] Export error:', err);
      toast.error('Erro ao cortar vídeo: ' + (err.message || String(err)));
    } finally {
      setIsTrimming(false);
      if (video) video.muted = isMuted;
    }
  }, [trimStart, trimEnd, isMuted, onSaveTrimmed]);

  const hasTrimChanges = trimRange[0] > 0.5 || trimRange[1] < 99.5;

  return (
    <div className="flex flex-col w-full">
      {/* Video player */}
      <div className="relative bg-black rounded-t-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          muted={isMuted}
          className="w-full max-h-[55vh] object-contain"
          playsInline
          preload="auto"
          crossOrigin="anonymous"
        />
        {/* Hidden canvas for recording */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Timeline / trim bar */}
      <div className="bg-card border-t border-border px-4 pt-3 pb-2 space-y-3">
        {/* Visual timeline with playhead */}
        <div className="relative">
          {/* Time markers */}
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span>{formatTime(trimStart)}</span>
            <span className="text-primary font-semibold">{formatTime(currentTime)}</span>
            <span>{formatTime(trimEnd)}</span>
          </div>

          {/* Waveform-like visual timeline */}
          <div 
            className="relative h-10 bg-muted/50 rounded-md cursor-pointer overflow-hidden border"
            onClick={handleTimelineClick}
          >
            {/* Trim region highlight */}
            <div 
              className="absolute top-0 bottom-0 bg-primary/15 border-x-2 border-primary/40"
              style={{
                left: `${trimRange[0]}%`,
                width: `${trimRange[1] - trimRange[0]}%`,
              }}
            />
            {/* Excluded regions */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-black/30"
              style={{ width: `${trimRange[0]}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 right-0 bg-black/30"
              style={{ width: `${100 - trimRange[1]}%` }}
            />

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

        {/* Duration info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Duração original: <strong className="text-foreground">{formatTime(duration)}</strong></span>
            {hasTrimChanges && (
              <span className="text-primary">
                Selecionado: <strong>{formatTime(trimmedDuration)}</strong>
              </span>
            )}
          </div>
          {hasTrimChanges && (
            <button 
              onClick={resetTrim}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Resetar
            </button>
          )}
        </div>

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
              disabled={!videoReady}
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
