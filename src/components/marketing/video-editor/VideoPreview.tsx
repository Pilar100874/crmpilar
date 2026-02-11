import React from 'react';
import { TimelineClip, TimelineTrack } from './types';

interface Props {
  clips: TimelineClip[];
  currentTime: number;
  tracks: TimelineTrack[];
}

const VideoPreview: React.FC<Props> = ({ clips, currentTime, tracks }) => {
  // Find active clips at current time
  const activeClips = clips.filter((c) => {
    const track = tracks.find((t) => t.id === c.trackId);
    if (!track || !track.visible || track.muted) return false;
    return currentTime >= c.startTime && currentTime < c.startTime + c.duration;
  });

  const activeVideo = activeClips.find((c) => c.type === 'video' || c.type === 'image');
  const activeText = activeClips.find((c) => c.type === 'text');

  // Build CSS filter from clip filters
  const buildFilter = (clip?: TimelineClip) => {
    if (!clip?.filters?.length) return 'none';
    return clip.filters
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
      .join(' ');
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="relative bg-black rounded-md overflow-hidden"
        style={{ width: 480, height: 270, aspectRatio: '16/9' }}
      >
        {activeVideo ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              filter: buildFilter(activeVideo),
              opacity: activeVideo.opacity ?? 1,
            }}
          >
            {activeVideo.src ? (
              activeVideo.type === 'video' ? (
                <video src={activeVideo.src} className="w-full h-full object-cover" muted />
              ) : (
                <img src={activeVideo.src} className="w-full h-full object-cover" alt="" />
              )
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${activeVideo.color}40, ${activeVideo.color}20)`,
                }}
              >
                <div className="text-center">
                  <span className="text-4xl">🎬</span>
                  <p className="text-white/60 text-sm mt-2">{activeVideo.name}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-3xl">📽️</span>
              <p className="text-white/40 text-xs mt-2">Sem conteúdo neste ponto</p>
            </div>
          </div>
        )}

        {/* Text overlay */}
        {activeText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white text-2xl font-bold drop-shadow-lg px-4 text-center">
              {activeText.name}
            </p>
          </div>
        )}

        {/* Time overlay */}
        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-white/80 text-[10px] font-mono">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
