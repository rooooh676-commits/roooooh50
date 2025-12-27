
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Video } from './types';
import { fetchCloudinaryVideos } from './cloudinaryClient';
import { generateVideoMetadata } from './geminiService';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface AdminDashboardProps {
  onClose: () => void;
  categories: string[];
  onNewVideo?: (v: Video) => void;
  onUpdateVideo?: (v: Video) => void;
  onDeleteVideo?: (id: string) => void;
  initialVideos: Video[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, categories, onNewVideo, onUpdateVideo, onDeleteVideo, initialVideos 
}) => {
  const [currentPasscode, setCurrentPasscode] = useState(() => localStorage.getItem('hadiqa-admin-pass') || '506070');
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0] || 'هجمات مرعبة');
  const [uploadExternalLink, setUploadExternalLink] = useState('');
  
  const handleAuth = () => {
    if (passcode === currentPasscode) {
      setIsAuthenticated(true);
    } else {
      alert("رمز الحماية خاطئ.");
      setPasscode('');
    }
  };

  const filteredVideos = useMemo(() => {
    return videos.filter(v => 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [videos, searchQuery]);

  const handleAISuggestForUpload = async () => {
    setIsUploading(true);
    try {
      const meta = await generateVideoMetadata(uploadCategory);
      setUploadTitle(meta.title);
    } catch(e) {}
    setIsUploading(false);
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) return;
    setIsUploading(true);
    
    cloudinary.openUploadWidget({
      cloudName: 'dlrvn33p0',
      uploadPreset: 'Good.zooo',
      folder: 'app_videos',
      tags: ['hadiqa_v4', uploadCategory],
      context: { custom: { caption: uploadTitle || "بدون عنوان" } },
      resourceType: 'video'
    }, (err: any, res: any) => {
      if (!err && res?.event === "success") {
        const newV: Video = {
          id: res.info.public_id,
          public_id: res.info.public_id,
          video_url: res.info.secure_url,
          title: uploadTitle || "فيديو جديد",
          category: uploadCategory,
          type: res.info.height > res.info.width ? 'short' : 'long',
          likes: 0, views: 0, tags: [], isFeatured: false,
          external_link: uploadExternalLink,
          created_at: new Date().toISOString()
        };
        setVideos(p => [newV, ...p]);
        if (onNewVideo) onNewVideo(newV);
        setUploadTitle('');
        setUploadExternalLink('');
        setIsUploading(false);
      } else if (res?.event === "close") setIsUploading(false);
    });
  };

  const saveEdit = (v: Video) => {
    const updated = videos.map(item => (item.id === v.id || item.public_id === v.id) ? v : item);
    setVideos(updated);
    if (onUpdateVideo) onUpdateVideo(v);
    setEditingVideo(null);
  };

  const handleDelete = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id && v.public_id !== id));
    onDeleteVideo?.(id);
    setEditingVideo(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6" dir="rtl">
        <img src={LOGO_URL} className="w-24 h-24 rounded-full border-4 border-red-600 mb-8 shadow-[0_0_40px_red]" />
        <h2 className="text-2xl font-black text-red-600 mb-8 italic text-center">دخول المطور</h2>
        <div className="grid grid-cols-3 gap-5 max-w-[300px]">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button key={num} onClick={() => passcode.length < 6 && setPasscode(p => p + num)} className="w-20 h-20 bg-neutral-900 rounded-3xl text-3xl font-black text-white active:bg-red-600 transition-all">
              {num}
            </button>
          ))}
          <button onClick={() => setPasscode('')} className="w-20 h-20 bg-red-950/30 rounded-3xl text-sm font-black text-red-500">مسح</button>
          <button onClick={() => passcode.length < 6 && setPasscode(p => p + '0')} className="w-20 h-20 bg-neutral-900 rounded-3xl text-3xl font-black text-white">0</button>
          <button onClick={handleAuth} className="w-20 h-20 bg-red-600 rounded-3xl text-sm font-black text-white">دخول</button>
        </div>
        <button onClick={onClose} className="mt-16 text-gray-600 underline">العودة</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[900] bg-[#020202] overflow-hidden flex flex-col" dir="rtl">
      <div className="h-24 border-b-2 border-red-600/20 flex items-center justify-between px-8 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} className="w-12 h-12 rounded-full border-2 border-red-600" />
          <h1 className="text-xl font-black text-red-600 uppercase">Dev Console</h1>
        </div>
        <input 
          type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 max-w-sm mx-4 bg-neutral-900 border border-white/10 rounded-2xl py-2 px-4 text-sm text-white"
        />
        <button onClick={onClose} className="p-3 text-gray-500 hover:text-red-600 transition-colors"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-40">
        <div className="bg-neutral-900/30 border border-white/5 p-6 rounded-[2.5rem] mb-10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-black text-white">رفع كابوس جديد</h2>
             <button onClick={handleAISuggestForUpload} className="bg-purple-600/20 text-purple-400 border border-purple-500/50 px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                AI: اقتراح عنوان مرعب
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="العنوان" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="bg-black border border-white/10 rounded-xl p-4 text-white" />
            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="bg-black border border-white/10 rounded-xl p-4 text-red-500 font-black">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="رابط خارجي مخصص (اختياري)" value={uploadExternalLink} onChange={e => setUploadExternalLink(e.target.value)} className="bg-black border border-white/10 rounded-xl p-4 text-white md:col-span-2" />
            <button onClick={openUploadWidget} disabled={isUploading} className="bg-red-600 rounded-xl font-black py-4 text-white md:col-span-2 shadow-[0_0_20px_red]">الرفع الآن</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(v => (
            <div key={v.id} className={`bg-neutral-900/20 border-2 p-3 rounded-[2rem] flex items-center gap-4 transition-all ${v.isFeatured ? 'border-red-600 shadow-[0_0_15px_red]' : 'border-white/5'}`}>
              <div className="w-20 h-14 bg-black rounded-lg overflow-hidden shrink-0">
                <video src={v.video_url} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="text-xs font-black text-white truncate">{v.title}</h3>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setEditingVideo(v)} className="bg-blue-600 px-2 py-1 rounded text-[8px] font-black text-white">تعديل</button>
                  <button 
                    onClick={() => saveEdit({...v, isFeatured: !v.isFeatured})} 
                    className={`px-2 py-1 rounded text-[8px] font-black ${v.isFeatured ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-white'}`}
                  >
                    {v.isFeatured ? 'رائج حالياً' : 'جعله رائج'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingVideo && (
        <VideoEditor 
          video={editingVideo} 
          categories={categories}
          onClose={() => setEditingVideo(null)} 
          onSave={saveEdit} 
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

const VideoEditor: React.FC<{ video: Video, categories: string[], onClose: () => void, onSave: (v: Video) => void, onDelete: (id: string) => void }> = ({ video, categories, onClose, onSave, onDelete }) => {
  const [v, setV] = useState<Video>({ ...video });
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAIEdit = async () => {
    setLoadingAI(true);
    try {
      const meta = await generateVideoMetadata(v.category);
      setV(prev => ({ ...prev, title: meta.title, tags: meta.tags }));
    } catch(e) {}
    setLoadingAI(false);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto" dir="rtl">
      <div className="max-w-md mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-black text-red-600">تعديل الكابوس</h2>
           <button onClick={handleAIEdit} disabled={loadingAI} className="bg-purple-600/20 text-purple-400 border border-purple-500/50 px-3 py-1 rounded-full text-[9px] font-black">
              AI: اقتراح
           </button>
        </div>
        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
           <video src={v.video_url} autoPlay muted loop className="w-full h-full object-contain" />
        </div>
        <input type="text" value={v.title} onChange={e => setV({...v, title: e.target.value})} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-4 text-white text-sm" placeholder="العنوان" />
        <select value={v.category} onChange={e => setV({...v, category: e.target.value})} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-4 text-red-600 font-black">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="text" value={v.external_link || ''} onChange={e => setV({...v, external_link: e.target.value})} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-4 text-white text-sm" placeholder="الرابط الخارجي" />
        
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <input type="checkbox" checked={v.isFeatured} onChange={e => setV({...v, isFeatured: e.target.checked})} className="w-5 h-5 accent-red-600" id="check-trending" />
            <label htmlFor="check-trending" className="text-xs font-black text-white">تمييز كفيديو رائج (Neon Badge)</label>
        </div>

        <div className="flex gap-3">
           <button onClick={() => onSave(v)} className="flex-1 bg-red-600 py-3 rounded-xl font-black text-white">حفظ</button>
           <button onClick={onClose} className="flex-1 bg-neutral-800 py-3 rounded-xl font-black text-white">إلغاء</button>
        </div>
        <button onClick={() => window.confirm("حذف؟") && onDelete(v.id)} className="w-full text-red-500 font-bold py-2 border border-red-900/30 rounded-lg text-xs">حذف نهائي</button>
      </div>
    </div>
  );
};

export default AdminDashboard;
