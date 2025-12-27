
import React, { useMemo } from 'react';
import { Video } from './types';

interface CategoryPageProps {
  category: string;
  allVideos: Video[];
  isSaved: boolean;
  onToggleSave: () => void;
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video) => void;
  onBack: () => void;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category, allVideos, isSaved, onToggleSave, onPlayShort, onPlayLong, onBack }) => {
  const catVideos = useMemo(() => allVideos.filter(v => v.category === category), [allVideos, category]);

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 rounded-[2.5rem] bg-red-600/10 border border-red-600/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-4 left-4 flex gap-2 z-10">
           <button onClick={onToggleSave} className={`p-2 rounded-full border transition-all active:scale-75 ${isSaved ? 'bg-yellow-500 border-yellow-400 text-white shadow-[0_0_15px_yellow]' : 'bg-black/40 border-white/20 text-white'}`}>
             {isSaved ? (
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
             ) : (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
             )}
           </button>
           <button onClick={onBack} className="p-2 bg-black/40 border border-white/20 rounded-full text-white active:scale-75 transition-transform">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
           </button>
        </div>
        
        <div className="relative text-right pr-2">
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest opacity-60">مستودع الأقسام</span>
          <h1 className="text-3xl font-black italic text-white drop-shadow-lg">{category}</h1>
          <p className="text-[8px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">{catVideos.length} فيديوهات مؤرشفة تحت هذا الوسم</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2">
        {catVideos.map((video) => (
          <div 
            key={video.id} 
            onClick={() => video.type === 'short' ? onPlayShort(video, catVideos.filter(v => v.type === 'short')) : onPlayLong(video)}
            className="flex flex-col gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className={`relative rounded-3xl overflow-hidden border border-white/5 bg-neutral-900 ${video.type === 'short' ? 'aspect-[9/16]' : 'aspect-video'}`}>
              <video src={video.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 right-3 left-3">
                 <p className="text-[9px] font-black text-white line-clamp-1 italic text-right leading-tight">{video.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
