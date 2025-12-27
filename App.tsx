
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
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isTitleYellow, setIsTitleYellow] = useState(false);
  
  // حالة التحميل العالمية
  const [downloadProgress, setDownloadProgress] = useState<{id: string, progress: number} | null>(null);

  const isOverlayActive = useMemo(() => !!selectedShort || !!selectedLong, [selectedShort, selectedLong]);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-interactions-v11');
      const data = saved ? JSON.parse(saved) : null;
      return data || { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    } catch (e) {
      return { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    }
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async (isHardRefresh = false) => {
    if (isHardRefresh) setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      const recommendedOrder = await getRecommendedFeed(data, interactions);
      const orderedVideos = recommendedOrder
        .map(id => data.find(v => v.id === id || v.public_id === id))
        .filter((v): v is Video => !!v);

      const remaining = data.filter(v => !recommendedOrder.includes(v.id) && !recommendedOrder.includes(v.public_id));
      setRawVideos([...orderedVideos, ...remaining]);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
      if (isHardRefresh) setIsTitleYellow(false);
    }
  }, [interactions]);

  useEffect(() => {
    loadData(false);
    if (!navigator.onLine) {
       showToast("أنت تعمل بدون إنترنت. تصفح الخزنة 💀");
       setCurrentView(AppView.OFFLINE);
    }
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
    showToast(interactions.likedIds.includes(id) ? "تمت الإزالة من الإعجابات" : "تم الإعجاب! 💀");
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
      if (window.confirm("هل تريد إزالة هذا الفيديو من الخزنة؟")) {
        await removeVideoFromCache(video.video_url);
        setInteractions(p => ({
          ...p,
          downloadedIds: p.downloadedIds.filter(id => id !== video.id)
        }));
        showToast("تمت الإزالة من الخزنة");
      }
    } else {
      setDownloadProgress({ id: video.id, progress: 0 });
      const success = await downloadVideoWithProgress(video.video_url, (p) => {
        setDownloadProgress({ id: video.id, progress: p });
      });
      
      if (success) {
        setInteractions(p => ({
          ...p,
          downloadedIds: [...new Set([...p.downloadedIds, video.id])]
        }));
        showToast("تم الحفظ في الخزنة 🦁");
      } else {
        showToast("فشل التحميل.. حاول لاحقاً");
      }
      setDownloadProgress(null);
    }
  };

  const renderContent = () => {
    const shortsOnly = rawVideos.filter(v => v.type === 'short');
    const longsOnly = rawVideos.filter(v => v.type === 'long');

    switch(currentView) {
      case AppView.OFFLINE:
        return (
          <Suspense fallback={null}>
            <OfflinePage 
              allVideos={rawVideos} 
              interactions={interactions} 
              onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} 
              onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} 
              onBack={() => setCurrentView(AppView.HOME)}
              onUpdateInteractions={setInteractions}
            />
          </Suspense>
        );
      case AppView.CATEGORY:
        return (
          <Suspense fallback={null}>
            <CategoryPage 
              category={activeCategory} 
              allVideos={rawVideos} 
              isSaved={interactions.savedCategoryNames.includes(activeCategory)}
              onToggleSave={() => {
                const isSaved = interactions.savedCategoryNames.includes(activeCategory);
                setInteractions(p => ({
                  ...p,
                  savedCategoryNames: isSaved ? p.savedCategoryNames.filter(c => c !== activeCategory) : [...p.savedCategoryNames, activeCategory]
                }));
                showToast(isSaved ? "تمت الإزالة ⚰️" : "تم الحفظ 🖤");
              }}
              onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} 
              onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} 
              onBack={() => setCurrentView(AppView.HOME)} 
            />
          </Suspense>
        );
      case AppView.ADMIN:
        return <Suspense fallback={null}><AdminDashboard onClose={() => setCurrentView(AppView.HOME)} categories={OFFICIAL_CATEGORIES} initialVideos={rawVideos} onNewVideo={(v) => setRawVideos(prev => [v, ...prev])} /></Suspense>;
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} excludedIds={interactions.dislikedIds} />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} savedCategories={[]} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} title="الإعجابات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} savedCategories={interactions.savedCategoryNames} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} title="المحفوظات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(prev => ({...prev, dislikedIds: prev.dislikedIds.filter(x => x !== id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} />;
      case AppView.PRIVACY:
        return <PrivacyPage onOpenAdmin={() => setCurrentView(AppView.ADMIN)} />;
      default:
        return (
          <MainContent 
            videos={rawVideos} 
            categoriesList={OFFICIAL_CATEGORIES} 
            interactions={interactions}
            onPlayShort={(v, l) => setSelectedShort({video:v, list:l.filter(x => x.type === 'short')})}
            onPlayLong={(v, l) => setSelectedLong({video:v, list:l.filter(x => x.type === 'long')})}
            onCategoryClick={(c: string) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }}
            onHardRefresh={() => loadData(true)}
            onOfflineClick={() => setCurrentView(AppView.OFFLINE)}
            loading={loading}
            isTitleYellow={isTitleYellow}
            isOverlayActive={isOverlayActive}
            downloadProgress={downloadProgress}
            onLike={handleLikeToggle}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* شريط التحميل العلوي النيوني */}
      {downloadProgress && (
        <div className="fixed top-0 left-0 w-full h-1 z-[2000] bg-black/20">
          <div 
            className="h-full bg-yellow-400 shadow-[0_0_10px_#facc15,0_0_20px_#facc15] transition-all duration-300" 
            style={{ width: `${downloadProgress.progress}%` }}
          ></div>
        </div>
      )}

      <AppBar onViewChange={setCurrentView} onRefresh={() => loadData(false)} currentView={currentView} />
      <main className="pt-20 max-w-lg mx-auto overflow-x-hidden">{renderContent()}</main>

      <Suspense fallback={null}><AIOracle /></Suspense>
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] bg-red-600 px-6 py-2 rounded-full font-bold shadow-lg shadow-red-600/40 text-xs text-center min-w-[200px]">{toast}</div>}
      
      {selectedShort && (
        <Suspense fallback={null}>
          <ShortsPlayerOverlay 
            initialVideo={selectedShort.video} 
            videoList={selectedShort.list} 
            interactions={interactions} 
            onClose={() => setSelectedShort(null)} 
            onLike={handleLikeToggle} 
            onDislike={handleDislike} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedShort(null); }}
            onSave={(id) => setInteractions(p => p.savedIds.includes(id) ? p : ({...p, savedIds: [...p.savedIds, id]}))} 
            onProgress={(id, pr) => setInteractions(p => {
               const history = [...p.watchHistory];
               const idx = history.findIndex(h => h.id === id);
               if (idx > -1) { if (pr > history[idx].progress) history[idx].progress = pr; }
               else { history.push({ id, progress: pr }); }
               return { ...p, watchHistory: history };
            })} 
            onDownload={(video) => handleDownloadToggle(video)}
            isGlobalDownloading={downloadProgress !== null}
          />
        </Suspense>
      )}
      
      {selectedLong && (
        <Suspense fallback={null}>
          <LongPlayerOverlay 
            video={selectedLong.video} 
            allLongVideos={selectedLong.list} 
            onClose={() => setSelectedLong(null)} 
            onLike={() => handleLikeToggle(selectedLong.video.id)} 
            onDislike={() => handleDislike(selectedLong.video.id)} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedLong(null); }}
            onSave={() => setInteractions(p => p.savedIds.includes(selectedLong.video.id) ? p : ({...p, savedIds: [...p.savedIds, selectedLong.video.id]}))} 
            onSwitchVideo={(v) => setSelectedLong(p => p ? {...p, video: v} : null)} 
            isLiked={interactions.likedIds.includes(selectedLong.video.id)} 
            isDisliked={interactions.dislikedIds.includes(selectedLong.video.id)} 
            isSaved={interactions.savedIds.includes(selectedLong.video.id)} 
            isDownloaded={interactions.downloadedIds.includes(selectedLong.video.id)}
            onDownload={() => handleDownloadToggle(selectedLong.video)}
            isGlobalDownloading={downloadProgress !== null}
            onProgress={(pr) => setInteractions(p => {
               const id = selectedLong.video.id;
               const history = [...p.watchHistory];
               const idx = history.findIndex(h => h.id === id);
               if (idx > -1) { if (pr > history[idx].progress) history[idx].progress = pr; }
               else { history.push({ id, progress: pr }); }
               return { ...p, watchHistory: history };
            })} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
