import { useState, useCallback, useRef, useEffect } from 'react';
import { TimelineState, TimelineClip, TimelineTrack, DEFAULT_TRACKS, VideoFilter } from './types';

const generateId = () => `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function useTimelineState() {
  const [state, setState] = useState<TimelineState>({
    tracks: DEFAULT_TRACKS,
    clips: [],
    currentTime: 0,
    duration: 60,
    zoom: 40,
    scrollX: 0,
    scrollY: 0,
    isPlaying: false,
    selectedClipIds: [],
    snapEnabled: true,
    fps: 30,
  });

  const playIntervalRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        window.clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, []);

  const updateState = useCallback((partial: Partial<TimelineState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Playback
  const play = useCallback(() => {
    if (playIntervalRef.current) return;
    setState((prev) => ({ ...prev, isPlaying: true }));
    const interval = 1000 / 30;
    playIntervalRef.current = window.setInterval(() => {
      setState((prev) => {
        const next = prev.currentTime + 1 / 30;
        if (next >= prev.duration) {
          if (playIntervalRef.current) {
            window.clearInterval(playIntervalRef.current);
            playIntervalRef.current = null;
          }
          return { ...prev, currentTime: 0, isPlaying: false };
        }
        return { ...prev, currentTime: next };
      });
    }, interval);
  }, []);

  const pause = useCallback(() => {
    if (playIntervalRef.current) {
      window.clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const seekTo = useCallback((time: number) => {
    setState((prev) => ({
      ...prev,
      currentTime: Math.max(0, Math.min(time, prev.duration)),
    }));
  }, []);

  // Clips
  const addClip = useCallback((clip: Omit<TimelineClip, 'id'>) => {
    const newClip: TimelineClip = { ...clip, id: generateId() };
    setState((prev) => {
      const newDuration = Math.max(prev.duration, clip.startTime + clip.duration + 10);
      return { ...prev, clips: [...prev.clips, newClip], duration: newDuration };
    });
    return newClip.id;
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<TimelineClip>) => {
    setState((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteClips = useCallback((ids: string[]) => {
    setState((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => !ids.includes(c.id)),
      selectedClipIds: prev.selectedClipIds.filter((id) => !ids.includes(id)),
    }));
  }, []);

  const selectClip = useCallback((id: string, multi = false) => {
    setState((prev) => ({
      ...prev,
      selectedClipIds: multi
        ? prev.selectedClipIds.includes(id)
          ? prev.selectedClipIds.filter((sid) => sid !== id)
          : [...prev.selectedClipIds, id]
        : [id],
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState((prev) => ({ ...prev, selectedClipIds: [] }));
  }, []);

  const splitClip = useCallback((id: string, atTime: number) => {
    setState((prev) => {
      const clip = prev.clips.find((c) => c.id === id);
      if (!clip) return prev;

      const relativeTime = atTime - clip.startTime;
      if (relativeTime <= 0.1 || relativeTime >= clip.duration - 0.1) return prev;

      const clip1: TimelineClip = {
        ...clip,
        duration: relativeTime,
        trimEnd: clip.trimEnd + (clip.duration - relativeTime),
      };

      const clip2: TimelineClip = {
        ...clip,
        id: generateId(),
        startTime: atTime,
        duration: clip.duration - relativeTime,
        trimStart: clip.trimStart + relativeTime,
        transition: undefined,
      };

      return {
        ...prev,
        clips: prev.clips.map((c) => (c.id === id ? clip1 : c)).concat(clip2),
        selectedClipIds: [clip2.id],
      };
    });
  }, []);

  const duplicateClip = useCallback((id: string) => {
    setState((prev) => {
      const clip = prev.clips.find((c) => c.id === id);
      if (!clip) return prev;
      const newClip: TimelineClip = {
        ...clip,
        id: generateId(),
        startTime: clip.startTime + clip.duration + 0.5,
        transition: undefined,
      };
      const newDuration = Math.max(prev.duration, newClip.startTime + newClip.duration + 10);
      return { ...prev, clips: [...prev.clips, newClip], duration: newDuration, selectedClipIds: [newClip.id] };
    });
  }, []);

  // Tracks
  const addTrack = useCallback((track: Omit<TimelineTrack, 'id'>) => {
    const id = `track_${Date.now()}`;
    setState((prev) => ({
      ...prev,
      tracks: [...prev.tracks, { ...track, id }],
    }));
  }, []);

  const updateTrack = useCallback((id: string, updates: Partial<TimelineTrack>) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, []);

  const deleteTrack = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== id),
      clips: prev.clips.filter((c) => c.trackId !== id),
    }));
  }, []);

  const moveTrack = useCallback((id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const idx = prev.tracks.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.tracks.length) return prev;
      const newTracks = [...prev.tracks];
      [newTracks[idx], newTracks[newIdx]] = [newTracks[newIdx], newTracks[idx]];
      return { ...prev, tracks: newTracks };
    });
  }, []);

  // Zoom
  const zoomIn = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.min(200, prev.zoom * 1.3) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.max(5, prev.zoom / 1.3) }));
  }, []);

  return {
    state,
    updateState,
    play,
    pause,
    seekTo,
    addClip,
    updateClip,
    deleteClips,
    selectClip,
    deselectAll,
    splitClip,
    duplicateClip,
    addTrack,
    updateTrack,
    deleteTrack,
    moveTrack,
    zoomIn,
    zoomOut,
  };
}
