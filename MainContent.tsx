
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions } from './types.ts';
import { downloadVideoWithProgress } from './offlineManager.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const NEON_COLORS = [
  'shadow-[0_0_15px_rgba(220,38,38,0.5)] border-red-500',
  'shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400',
  'shadow-[0_0_15px_rgba(234,179,8,0.5)] border-yellow-500',
  'shadow-[0_0_15px_rgba(168,85,247,0.5)] border-purple-500',
  'shadow-[0_0_15px_rgba(34,197,94,0.5)] border-green-500',
  'shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-500',
];

const getNeonColor = (id: string) => {
  if (!id) return NEON_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
};

export const getDeterministicStats = (seed: string) => {
  let hash = 0;
  if (!seed) return { views: 0, likes: 0 };
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const baseViews = Math.abs(hash % 900000) + 500000; 
  const views = baseViews * (Math.abs(hash % 5) + 2); 
  const likes = Math.abs(Math.floor(views * (0.12 + (Math.abs(hash % 15) / 100)))); 
  return { views, likes };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const VideoCardThumbnail: React.FC<{ 
  video: Video, 
  isOverlayActive: boolean, 
  interactions: UserInteractions,
  onLike?: (id: string) => void
}> = ({ video, isOverlayActive, interactions, onLike }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stats = useMemo(() => video ? getDeterministicStats(video.video_url) : { views: 0, likes: 0 }, [video?.video_url]);
  
  const isLiked = interactions?.likedIds?.includes(video?.id) || false;
  const isSaved = interactions?.savedIds?.includes(video?.id) || false;
  const watchItem = interactions?.watchHistory?.find(h => h.id === video?.id || h.id === video?.public_id);
  const progress = watchItem ? watchItem.progress : 0;
  const isHeartActive = isLiked || isSaved;
  const neonStyle = getNeonColor(video?.id || '');

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isOverlayActive) {
      v.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      } else {
        v.pause();
      }
    }, { threshold: 0.1 });
    observer.observe(v);
    return () => observer.disconnect();
  }, [video?.video_url, isOverlayActive]);

  if (!video) return <div className="w-full h-full bg-neutral-900 animate-pulse rounded-2xl border-2 border-white/5" />;

  return (
    <div className={`w-full h-full relative bg-neutral-950 overflow-hidden group rounded-2xl border-2 transition-all duration-500 ${neonStyle} hover:scale-[1.01]`}>
      <video 
        ref={videoRef} 
        src={video.video_url} 
        poster={video.poster_url} 
        muted 
        loop 
        playsInline 
        className="w-full h-full object-cover opacity-100 contrast-110 saturate-125 transition-all duration-700 pointer-events-none" 
      />
      
      <div className="absolute top-2 right-2 flex flex-col items-center gap-1 z-30">
        <button 
          onClick={(e) => { e.stopPropagation(); onLike?.(video.id); }}
          className={`p-1.5 rounded-lg backdrop-blur-md border-2 transition-all duration-300 active:scale-90 ${isHeartActive ? 'bg-red-600/30 border-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-black/40 border-white/20 hover:border-red-500/50'}`}
        >
          <svg className={`w-4 h-4 ${isHeartActive ? 'text-red-500' : 'text-gray-400'}`} fill={isHeartActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 z-20 pointer-events-none">
        <p className="text-white text-[11px] font-black line-clamp-1 italic text-right leading-tight drop-shadow-[0_2px_4_black]">{video.title}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[8px] font-black text-white/80">{formatBigNumber(stats.likes)} إعجاب</span>
        </div>
      </div>
      {progress > 0 && progress < 0.99 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-30">
          <div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${progress * 100}%` }}></div>
        </div>
      )}
    </div>
  );
};

export const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void,
  isShorts?: boolean
}> = ({ videos, onPlay, isShorts = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos, ...videos, ...videos];
  }, [videos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isDragging || displayVideos.length === 0) return;
    
    let animationFrameId: number;
    const scroll = () => {
      container.scrollLeft += 0.8;
      if (container.scrollLeft >= (container.scrollWidth / 3) * 2) {
        container.scrollLeft -= container.scrollWidth / 3;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDragging, displayVideos.length]);

  if (displayVideos.length === 0) return null;

  return (
    <div className={`relative overflow-hidden w-full ${isShorts ? 'h-64' : 'h-36'} bg-neutral-900/10 border-y border-white/5`} dir="ltr">
      <div 
        ref={containerRef}
        onMouseDown={(e) => { setIsDragging(true); setStartX(e.pageX - (containerRef.current?.offsetLeft || 0)); setScrollLeftState(containerRef.current?.scrollLeft || 0); }}
        onMouseMove={(e) => { if (!isDragging || !containerRef.current) return; const x = e.pageX - (containerRef.current.offsetLeft || 0); containerRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5; }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        className="flex gap-4 px-6 h-full items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      >
        {displayVideos.map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => !isDragging && onPlay(item)} className={`${isShorts ? 'w-36 h-56' : 'w-52 h-32'} shrink-0 rounded-2xl overflow-hidden border-2 relative active:scale-95 transition-all ${getNeonColor(item.id)}`} dir="rtl">
            <video src={item.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 backdrop-blur-[1px]">
              <p className="text-[10px] font-black text-white truncate italic text-right leading-none">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, onOfflineClick, loading, isOverlayActive, onLike
}) => {
  const safeVideos = useMemo(() => videos || [], [videos]);
  const shortsOnly = useMemo(() => safeVideos.filter((v: Video) => v && v.type === 'short'), [safeVideos]);
  const longsOnly = useMemo(() => safeVideos.filter((v: Video) => v && v.type === 'long'), [safeVideos]);

  const top4Longs = useMemo(() => longsOnly.slice(0, 4), [longsOnly]);
  const top4Shorts = useMemo(() => shortsOnly.slice(0, 4), [shortsOnly]);
  const marqueeShorts = useMemo(() => shortsOnly.slice(4, 16), [shortsOnly]);
  const marqueeLongs = useMemo(() => longsOnly.slice(4, 12), [longsOnly]);

  return (
    <div className="flex flex-col pb-20 w-full bg-black min-h-screen" dir="rtl">
      <header className="flex items-center justify-between py-3 bg-black sticky top-0 z-[110] px-4 border-b border-white/5">
        <div className="flex items-center gap-2" onClick={onHardRefresh}>
          <img src={LOGO_URL} className={`w-9 h-9 rounded-full border-2 border-red-600 shadow-[0_0_10px_red] ${loading ? 'animate-spin' : ''}`} />
          <h1 className="text-base font-black italic text-red-600">الحديقة المرعبة</h1>
        </div>
        <button onClick={onOfflineClick} className="p-2 bg-neutral-900 rounded-xl border border-white/10 text-cyan-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" /><path d="M12 17v-4m-2 2l2 2 2-2" stroke="currentColor" strokeWidth="2"/></svg>
        </button>
      </header>

      <nav className="relative h-14 bg-black/95 backdrop-blur-2xl z-[100] border-b border-white/10 sticky top-[60px] overflow-x-auto scrollbar-hide flex items-center px-4">
        <div className="flex items-center gap-3">
          {categoriesList?.map((cat: string) => (
            <button key={cat} onClick={() => onCategoryClick(cat)} className="neon-white-led shrink-0 px-5 py-1.5 rounded-full text-[10px] font-black text-white italic whitespace-nowrap">{cat}</button>
          ))}
        </div>
      </nav>

      {loading && safeVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-red-600 font-black italic animate-pulse">يتم استدعاء الأرواح...</span>
        </div>
      ) : (
        <>
          <SectionHeader title="أساطير القبو الطويلة" color="bg-cyan-500" />
          <div className="px-4 space-y-4 mb-8">
            {top4Longs.map((v) => (
              <div key={v.id} onClick={() => onPlayLong(v, longsOnly)} className="aspect-video w-full">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
              </div>
            ))}
          </div>

          <SectionHeader title="ومضات مرعبة (شورتي)" color="bg-yellow-500" />
          <div className="px-4 grid grid-cols-2 gap-4 mb-8">
            {top4Shorts.map((v) => (
              <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="aspect-[9/16]">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
              </div>
            ))}
          </div>

          <SectionHeader title="شريط الرعب السريع" color="bg-red-500" />
          <InteractiveMarquee videos={marqueeShorts} onPlay={(v) => onPlayShort(v, shortsOnly)} isShorts={true} />

          <SectionHeader title="أساطير مرئية" color="bg-emerald-500" />
          <InteractiveMarquee videos={marqueeLongs} onPlay={(v) => onPlayLong(v, longsOnly)} />
        </>
      )}
      
      <div className="w-full py-10 flex justify-center opacity-20">
         <span className="text-[10px] font-black text-white italic">VAULT SECURE SYSTEM</span>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="px-5 py-4 flex items-center gap-2.5">
    <div className={`w-1.5 h-4 ${color} rounded-full shadow-[0_0_10px_currentColor]`}></div>
    <h2 className="text-[11px] font-black text-white italic uppercase tracking-[0.1em]">{title}</h2>
  </div>
);

export default MainContent;
