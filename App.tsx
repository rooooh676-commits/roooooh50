
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchCloudinaryVideos } from './cloudinaryClient.ts';
import { getRecommendedFeed } from './geminiService.ts';
import AppBar from './AppBar.tsx';
import MainContent from './MainContent.tsx';
import { downloadVideoWithProgress, removeVideoFromCache } from './offlineManager.ts';

const ShortsPlayerOverlay = lazy(() => import('./ShortsPlayerOverlay.tsx'));
const LongPlayerOverlay = lazy(() => import('./LongPlayerOverlay.tsx'));
const AdminDashboard = lazy(() => import('./AdminDashboard.tsx'));
const AIOracle = lazy(() => import('./AIOracle.tsx'));
const TrendPage = lazy(() => import('./TrendPage.tsx'));
const SavedPage = lazy(() => import('./SavedPage.tsx'));
const PrivacyPage = lazy(() => import('./PrivacyPage.tsx'));
const HiddenVideosPage = lazy(() => import('./HiddenVideosPage.tsx'));
const CategoryPage = lazy(() => import('./CategoryPage.tsx'));
const OfflinePage = lazy(() => import('./OfflinePage.tsx'));

export const OFFICIAL_CATEGORIES = [
  'هجمات مرعبة',
  'رعب حقيقي',
  'رعب الحيوانات',
  'أخطر المشاهد',
  'أهوال مرعبة',
  'رعب كوميدي',
  'لحظات مرعبة',
  'صدمه'
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{id: string, progress: number} | null>(null);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-interactions-v11');
      return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    } catch (e) {
      return { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    }
  });

  const isOverlayActive = useMemo(() => !!selectedShort || !!selectedLong, [selectedShort, selectedLong]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async (isHardRefresh = false) => {
    if (isHardRefresh || rawVideos.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await fetchCloudinaryVideos();
      if (data && data.length > 0) {
        // We attempt recommendations but don't block on them if they fail
        try {
          const recommendedOrder = await getRecommendedFeed(data, interactions);
          const orderedVideos = recommendedOrder
            .map(id => data.find(v => v.id === id || v.public_id === id))
            .filter((v): v is Video => !!v);

          const remaining = data.filter(v => !recommendedOrder.includes(v.id) && !recommendedOrder.includes(v.public_id));
          setRawVideos([...orderedVideos, ...remaining]);
        } catch (recErr) {
          console.warn("Recommendation engine error, using raw order:", recErr);
          setRawVideos(data);
        }
      } else {
        setRawVideos([]);
        setError("لم يتم العثور على فيديوهات. تأكد من إعدادات Cloudinary (Resource List).");
      }
    } catch (err) {
      console.error("Load Error:", err);
      setError("فشل الاتصال بالمستودع السحابي. يرجى التحقق من الإنترنت.");
    } finally {
      setLoading(false);
    }
  }, [interactions]);

  useEffect(() => {
    loadData(false);
  }, []);

  useEffect(() => { 
    localStorage.setItem('al-hadiqa-interactions-v11', JSON.stringify(interactions)); 
  }, [interactions]);

  const handleLikeToggle = (id: string) => {
    setInteractions(p => {
      const isAlreadyLiked = p.likedIds.includes(id);
      if (isAlreadyLiked) {
        return { ...p, likedIds: p.likedIds.filter(x => x !== id) };
      }
      return { ...p, likedIds: [...p.likedIds, id], dislikedIds: p.dislikedIds.filter(x => x !== id) };
    });
    showToast("تم تحديث الإعجابات 💀");
  };

  const handleDislike = (id: string) => {
    setInteractions(p => ({
      ...p,
      dislikedIds: Array.from(new Set([...p.dislikedIds, id])),
      likedIds: p.likedIds.filter(x => x !== id)
    }));
    showToast("تم الاستبعاد ⚰️");
    setSelectedShort(null);
    setSelectedLong(null);
  };

  const handleDownloadToggle = async (video: Video) => {
    const isDownloaded = interactions.downloadedIds.includes(video.id);
    if (isDownloaded) {
      await removeVideoFromCache(video.video_url);
      setInteractions(p => ({ ...p, downloadedIds: p.downloadedIds.filter(id => id !== video.id) }));
      showToast("تمت الإزالة");
    } else {
      setDownloadProgress({ id: video.id, progress: 0 });
      const success = await downloadVideoWithProgress(video.video_url, (p) => setDownloadProgress({ id: video.id, progress: p }));
      if (success) {
        setInteractions(p => ({ ...p, downloadedIds: [...p.downloadedIds, video.id] }));
        showToast("تم الحفظ في الخزنة 🦁");
      }
      setDownloadProgress(null);
    }
  };

  const renderContent = () => {
    if (loading && rawVideos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-red-600 font-black italic">يتم فك تشفير البيانات السحابية...</p>
        </div>
      );
    }

    if (error && rawVideos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 px-10 text-center">
          <svg className="w-16 h-16 text-red-600/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p className="text-red-500 font-black italic leading-relaxed">{error}</p>
          <button onClick={() => loadData(true)} className="bg-red-600 px-6 py-2 rounded-xl font-bold">تحديث الاتصال</button>
        </div>
      );
    }

    const filteredVideos = rawVideos.filter(v => !interactions.dislikedIds.includes(v.id));

    switch(currentView) {
      case AppView.OFFLINE:
        return <Suspense fallback={null}><OfflinePage allVideos={rawVideos} interactions={interactions} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos.filter(x=>x.type==='long')})} onBack={() => setCurrentView(AppView.HOME)} onUpdateInteractions={setInteractions} /></Suspense>;
      case AppView.CATEGORY:
        return <Suspense fallback={null}><CategoryPage category={activeCategory} allVideos={rawVideos} isSaved={interactions.savedCategoryNames.includes(activeCategory)} onToggleSave={() => {}} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos.filter(x=>x.type==='long')})} onBack={() => setCurrentView(AppView.HOME)} /></Suspense>;
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos.filter(x=>x.type==='long')})} excludedIds={interactions.dislikedIds} />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} savedCategories={[]} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos.filter(x=>x.type==='long')})} title="الإعجابات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.HIDDEN:
        return <Suspense fallback={null}><HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p => ({...p, dislikedIds: p.dislikedIds.filter(x => x !== id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos.filter(x=>x.type==='long')})} /></Suspense>;
      default:
        return (
          <MainContent 
            videos={filteredVideos} 
            categoriesList={OFFICIAL_CATEGORIES} 
            interactions={interactions}
            onPlayShort={(v: Video, l: Video[]) => setSelectedShort({video:v, list:l})}
            onPlayLong={(v: Video, l: Video[]) => setSelectedLong({video:v, list:l})}
            onCategoryClick={(c: string) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }}
            onHardRefresh={() => loadData(true)}
            onOfflineClick={() => setCurrentView(AppView.OFFLINE)}
            loading={loading}
            isOverlayActive={isOverlayActive}
            onLike={handleLikeToggle}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppBar onViewChange={setCurrentView} onRefresh={() => loadData(false)} currentView={currentView} />
      <main className="pt-20 max-w-lg mx-auto">{renderContent()}</main>
      <Suspense fallback={null}><AIOracle /></Suspense>
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1100] bg-red-600 px-6 py-2 rounded-full font-bold shadow-lg shadow-red-600/40 text-xs">{toast}</div>}
      
      {selectedShort && (
        <Suspense fallback={null}>
          <ShortsPlayerOverlay 
            initialVideo={selectedShort.video} videoList={selectedShort.list} interactions={interactions} 
            onClose={() => setSelectedShort(null)} onLike={handleLikeToggle} onDislike={handleDislike} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedShort(null); }}
            onSave={(id) => setInteractions(p => ({...p, savedIds: [...p.savedIds, id]}))} 
            onProgress={(id, pr) => {}} onDownload={handleDownloadToggle} isGlobalDownloading={false}
          />
        </Suspense>
      )}
      
      {selectedLong && (
        <Suspense fallback={null}>
          <LongPlayerOverlay 
            video={selectedLong.video} allLongVideos={selectedLong.list} onClose={() => setSelectedLong(null)} 
            onLike={() => handleLikeToggle(selectedLong.video.id)} onDislike={() => handleDislike(selectedLong.video.id)} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedLong(null); }}
            onSave={() => {}} onSwitchVideo={(v) => setSelectedLong(p => p ? {...p, video: v} : null)} 
            isLiked={interactions.likedIds.includes(selectedLong.video.id)} isDisliked={false} isSaved={false} isDownloaded={false} 
            isGlobalDownloading={false} onDownload={() => handleDownloadToggle(selectedLong.video)} onProgress={() => {}} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
