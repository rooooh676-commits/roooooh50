
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions, AppView } from './types.ts';
import { downloadVideoWithProgress } from './offlineManager.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const NEON_COLORS = [
  'shadow-[0_0_15px_rgba(220,38,38,0.5)] border-red-500',   // Red
  'shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400',  // Cyan
  'shadow-[0_0_15px_rgba(234,179,8,0.5)] border-yellow-500', // Yellow
  'shadow-[0_0_15px_rgba(168,85,247,0.5)] border-purple-500', // Purple
  'shadow-[0_0_15px_rgba(34,197,94,0.5)] border-green-500',  // Green
  'shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-500',   // Blue
];

const getNeonColor = (id: string) => {
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

const NeonLionDownloadBtn: React.FC<{ onClick: () => void, isPending: boolean }> = ({ onClick, isPending }) => (
  <button 
    onClick={onClick}
    className={`relative p-1 rounded-2xl transition-all duration-500 active:scale-90 group flex items-center justify-center ${isPending ? 'animate-pulse' : ''}`}
  >
    <div className={`absolute inset-0 blur-md rounded-full opacity-40 transition-colors ${isPending ? 'bg-yellow-400' : 'bg-red-600 group-hover:bg-cyan-400'}`}></div>
    <svg 
      className={`w-9 h-9 transition-all duration-500 relative z-10 ${isPending ? 'text-yellow-400 drop-shadow-[0_0_15px_#facc15]' : 'text-red-600 group-hover:text-cyan-400 drop-shadow-[0_0_8px_#ef4444]'}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9.5c0-1.5 1-2.5 4-2.5s4 1 4 2.5" strokeLinecap="round" />
      <circle cx="9.5" cy="11" r="0.8" fill="currentColor" />
      <circle cx="14.5" cy="11" r="0.8" fill="currentColor" />
      <path d="M12 17v-4m-2 2l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

const JoyfulNeonLion: React.FC<{ isDownloading: boolean, hasDownloads: boolean }> = ({ isDownloading, hasDownloads }) => (
  <div className="relative">
    {isDownloading && <div className="absolute inset-0 bg-yellow-400 blur-lg rounded-full opacity-40 animate-pulse"></div>}
    <svg 
      className={`w-8 h-8 transition-all duration-500 ${isDownloading ? 'text-yellow-400 scale-110 drop-shadow-[0_0_10px_#facc15]' : hasDownloads ? 'text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]' : 'text-gray-600'}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" />
      <path d="M8 9.5c0-1.5 1-2.5 4-2.5s4 1 4 2.5" strokeLinecap="round" />
      <circle cx="9.5" cy="11" r="0.8" fill="currentColor" />
      <circle cx="14.5" cy="11" r="0.8" fill="currentColor" />
      <path d="M10 15.5c.5 1 1.5 1.5 2 1.5s1.5-.5 2-1.5" strokeLinecap="round" />
    </svg>
  </div>
);

const VideoCardThumbnail: React.FC<{ 
  video: Video, 
  isOverlayActive: boolean, 
  interactions: UserInteractions,
  isFeatured?: boolean,
  isRecent?: boolean,
  onLike?: (id: string) => void
}> = ({ video, isOverlayActive, interactions, isFeatured, isRecent, onLike }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stats = useMemo(() => video ? getDeterministicStats(video.video_url) : { views: 0, likes: 0 }, [video?.video_url]);
  
  if (!video) return null;

  const isLiked = interactions?.likedIds?.includes(video.id) || false;
  const isSaved = interactions?.savedIds?.includes(video.id) || false;
  const watchItem = interactions?.watchHistory?.find(h => h.id === video.id || h.id === video.public_id);
  const progress = watchItem ? watchItem.progress : 0;
  const isHeartActive = isLiked || isSaved;
  const neonStyle = getNeonColor(video.id);
  const isActuallyTrending = video.isFeatured || isRecent;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isOverlayActive) {
      v.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.1 });
    observer.observe(v);
    return () => observer.disconnect();
  }, [video.video_url, isOverlayActive]);

  return (
    <div className={`w-full h-full relative bg-neutral-950 overflow-hidden group rounded-2xl border-2 transition-all duration-500 ${neonStyle} ${isActuallyTrending ? 'scale-[1.01] border-red-600 shadow-[0_0_15px_#dc2626]' : 'hover:scale-[1.01]'}`}>
      <video 
        ref={videoRef} 
        src={video.video_url} 
        poster={video.poster_url} 
        muted 
        loop 
        playsInline 
        className="w-full h-full object-cover opacity-100 contrast-110 saturate-125 transition-all duration-700 pointer-events-none" 
      />
      
      { isActuallyTrending && (
        <div className="absolute top-2 left-2 z-30 pointer-events-none">
           <div className="bg-black/60 backdrop-blur-md border border-red-500 px-2.5 py-1 rounded-xl shadow-[0_0_10px_red] flex items-center gap-1.5 animate-pulse">
             <span className="text-[10px] font-black text-white italic uppercase">رائج</span>
           </div>
        </div>
      )}

      <div className="absolute top-2 right-2 flex flex-col items-center gap-1 z-30">
        <button 
          onClick={(e) => { e.stopPropagation(); onLike?.(video.id); }}
          className={`p-1.5 rounded-lg backdrop-blur-md border-2 transition-all duration-300 active:scale-90 ${isHeartActive ? 'bg-red-600/30 border-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-black/40 border-white/20 hover:border-red-500/50'}`}
        >
          <svg className={`w-4 h-4 ${isHeartActive ? 'text-red-500' : 'text-gray-400'}`} fill={isHeartActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <span className="text-[9px] font-black text-red-500 drop-shadow-[0_0_5px_red] bg-black/40 px-2 py-0.5 rounded-md animate-pulse">جديد</span>
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
  initialReverse?: boolean,
  isShorts?: boolean,
  interactions: UserInteractions,
  recentIds?: string[]
}> = ({ videos, onPlay, initialReverse = false, isShorts = false, interactions, recentIds = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const DEFAULT_SPEED = 0.8;
  const [internalSpeed, setInternalSpeed] = useState(initialReverse ? -DEFAULT_SPEED : DEFAULT_SPEED);
  const requestRef = useRef<number>(null);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return videos.length < 5 ? [...videos, ...videos, ...videos, ...videos] : [...videos, ...videos, ...videos];
  }, [videos]);

  const animate = useCallback(() => {
    const container = containerRef.current;
    if (container && !isDragging) {
      container.scrollLeft += internalSpeed;
      const { scrollLeft, scrollWidth } = container;
      if (scrollWidth > 0) {
        const thirdWidth = scrollWidth / 3;
        if (scrollLeft >= (thirdWidth * 2)) container.scrollLeft -= thirdWidth;
        else if (scrollLeft <= 1) container.scrollLeft += thirdWidth;
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isDragging, internalSpeed]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  if (displayVideos.length === 0) return null;

  return (
    <div className={`relative overflow-hidden w-full ${isShorts ? 'h-64' : 'h-36'} bg-neutral-900/10 border-y border-white/5 shadow-inner`} dir="ltr">
      <div 
        ref={containerRef}
        onMouseDown={(e) => { setIsDragging(true); setStartX(e.pageX - (containerRef.current?.offsetLeft || 0)); setScrollLeftState(containerRef.current?.scrollLeft || 0); }}
        onMouseMove={(e) => { if (!isDragging || !containerRef.current) return; const x = e.pageX - (containerRef.current.offsetLeft || 0); containerRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5; }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => { if (!e.touches || e.touches.length === 0) return; const touch = e.touches[0]; setIsDragging(true); setStartX(touch.pageX - (containerRef.current?.offsetLeft || 0)); setScrollLeftState(containerRef.current?.scrollLeft || 0); }}
        onTouchMove={(e) => { if (!isDragging || !containerRef.current || !e.touches || e.touches.length === 0) return; const touch = e.touches[0]; const x = touch.pageX - (containerRef.current.offsetLeft || 0); containerRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5; }}
        onTouchEnd={() => setIsDragging(false)}
        className="flex gap-4 px-6 h-full items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      >
        {displayVideos.map((item, idx) => {
            if (!item) return null;
            const neonStyle = getNeonColor(item.id);
            const isRec = recentIds?.includes(item.id);
            return (
              <div key={`${item.id}-${idx}`} onClick={() => !isDragging && onPlay(item)} className={`${isShorts ? 'w-36 h-56' : 'w-52 h-32'} shrink-0 rounded-2xl overflow-hidden border-2 relative active:scale-95 transition-all ${neonStyle} ${item.isFeatured || isRec ? 'border-red-600 shadow-[0_0_10px_red]' : ''}`} dir="rtl">
                <video src={item.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 backdrop-blur-[1px] pointer-events-none">
                  <p className="text-[10px] font-black text-white truncate italic text-right leading-none">{item.title}</p>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, onOfflineClick, loading, isOverlayActive, downloadProgress, onLike
}) => {
  const [pullOffset, setPullOffset] = useState(0);
  const [startY, setStartY] = useState(0);
  const [rotationKey, setRotationKey] = useState(0);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setRotationKey(k => k + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const safeVideos = useMemo(() => videos || [], [videos]);
  const recentIds = useMemo(() => {
    return [...safeVideos]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 10)
      .map(v => v.id);
  }, [safeVideos]);

  const shortsOnly = useMemo(() => safeVideos.filter((v: any) => v && v.type === 'short'), [safeVideos]);
  const longsOnly = useMemo(() => safeVideos.filter((v: any) => v && v.type === 'long'), [safeVideos]);

  // استخراج الفيديوهات للاقسام المطلوبة
  const top4Longs = useMemo(() => longsOnly.slice(0, 4), [longsOnly]);
  const top4Shorts = useMemo(() => shortsOnly.slice(0, 4), [shortsOnly]);
  const marqueeShorts = useMemo(() => shortsOnly.slice(4, 16), [shortsOnly]);
  const marqueeLongs = useMemo(() => longsOnly.slice(4, 12), [longsOnly]);

  const handleDownloadAll = async () => {
    if (isBulkDownloading) return;
    if (!window.confirm("تحميل جميع الفيديوهات؟")) return;
    setIsBulkDownloading(true);
    let successCount = 0;
    for (const v of safeVideos) {
      if (!interactions.downloadedIds.includes(v.id)) {
        const ok = await downloadVideoWithProgress(v.video_url, () => {});
        if (ok) successCount++;
      }
    }
    setIsBulkDownloading(false);
    alert(`تم تحميل ${successCount} فيديوهات!`);
    onHardRefresh();
  };

  const isActuallyRefreshing = loading || pullOffset > 30;

  return (
    <div 
      onTouchStart={(e) => window.scrollY === 0 && setStartY(e.touches[0].pageY)}
      onTouchMove={(e) => { if (startY === 0) return; const diff = e.touches[0].pageY - startY; if (diff > 0 && diff < 150) setPullOffset(diff); }}
      onTouchEnd={() => { if (pullOffset > 80) onHardRefresh(); setPullOffset(0); setStartY(0); }}
      className="flex flex-col pb-8 w-full bg-black min-h-screen relative"
      style={{ transform: `translateY(${pullOffset / 2}px)` }} dir="rtl"
    >
      <header className="flex items-center justify-between py-3 bg-black sticky top-0 z-[110] px-4 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-2" onClick={onHardRefresh}>
          <img src={LOGO_URL} className={`w-9 h-9 rounded-full border-2 transition-all duration-500 ${isActuallyRefreshing ? 'border-yellow-400 shadow-[0_0_20px_#facc15]' : 'border-red-600 shadow-[0_0_10px_red]'}`} />
          <h1 className={`text-base font-black italic transition-colors duration-500 ${isActuallyRefreshing ? 'text-yellow-400' : 'text-red-600'}`}>الحديقة المرعبة</h1>
        </div>
        <div className="flex items-center gap-3">
          <NeonLionDownloadBtn onClick={handleDownloadAll} isPending={isBulkDownloading} />
          <button onClick={onOfflineClick} className="p-1 transition-all active:scale-90 relative group">
            <JoyfulNeonLion isDownloading={downloadProgress !== null} hasDownloads={interactions?.downloadedIds?.length > 0} />
          </button>
        </div>
      </header>

      <nav className="nav-container nav-mask relative h-14 bg-black/95 backdrop-blur-2xl z-[100] border-b border-white/10 sticky top-[60px] overflow-x-auto scrollbar-hide flex items-center">
        <div className="animate-marquee-train flex items-center gap-4 px-10">
          {[...(categoriesList || []), ...(categoriesList || [])].map((cat, idx) => (
            <button key={`${cat}-${idx}`} onClick={() => onCategoryClick(cat)} className="neon-white-led shrink-0 px-6 py-1.5 rounded-full text-[10px] font-black text-white italic whitespace-nowrap">{cat}</button>
          ))}
        </div>
      </nav>

      {/* القسم الأول: 4 فيديوهات طويلة فوق بعضها */}
      <SectionHeader title="أساطير القبو الطويلة" color="bg-cyan-500" />
      <div className="px-4 space-y-4">
        {top4Longs.map((v: any) => v && (
          <div key={v.id} onClick={() => onPlayLong(v, longsOnly)} className="aspect-video w-full animate-in zoom-in-95 duration-500">
            <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} isFeatured={v.isFeatured} isRecent={recentIds.includes(v.id)} onLike={onLike} />
          </div>
        ))}
      </div>

      {/* القسم الثاني: 4 فيديوهات شورتي كل 2 جانب بعضهما (2x2) */}
      <SectionHeader title="ومضات مرعبة (شورتي)" color="bg-yellow-500" />
      <div className="px-4 grid grid-cols-2 gap-3.5 mb-6">
        {top4Shorts.map((v: any) => v && (
          <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="aspect-[9/16] animate-in fade-in duration-500">
            <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} isFeatured={v.isFeatured} isRecent={recentIds.includes(v.id)} onLike={onLike} />
          </div>
        ))}
      </div>

      {/* القسم الثالث: شريط الشورت كما هو */}
      <SectionHeader title="شريط الرعب السريع" color="bg-red-500" />
      <InteractiveMarquee videos={marqueeShorts} onPlay={(v) => onPlayShort(v, shortsOnly)} isShorts={true} interactions={interactions} recentIds={recentIds} />

      {/* القسم الرابع: شريط الفيديوهات الطويلة كما هو */}
      <SectionHeader title="أساطير مرئية" color="bg-emerald-500" />
      <InteractiveMarquee videos={marqueeLongs} onPlay={(v) => onPlayLong(v, longsOnly)} interactions={interactions} recentIds={recentIds} />

      <div className="w-full h-8 bg-black flex items-center justify-center group relative border-y border-white/5 mt-4">
          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest italic z-10">Vault Secure System</span>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="px-5 py-3 flex items-center gap-2.5">
    <div className={`w-1.5 h-4 ${color} rounded-full shadow-[0_0_10px_currentColor]`}></div>
    <h2 className="text-[11px] font-black text-white italic uppercase tracking-[0.1em] drop-shadow-md">{title}</h2>
  </div>
);

export default MainContent;
