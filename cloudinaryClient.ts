
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const COMMON_TAG = 'hadiqa_v4';

// الأقسام الرسمية الثمانية لضمان التوزيع
const TARGET_CATEGORIES = [
  'هجمات مرعبة',
  'رعب حقيقي',
  'رعب الحيوانات',
  'أخطر المشاهد',
  'أهوال مرعبة',
  'رعب كوميدي',
  'لحظات مرعبة',
  'صدمه'
];

/**
 * جلب الفيديوهات مع توزيعها تلقائياً على الأقسام الجديدة
 */
export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    const targetUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/list/${COMMON_TAG}.json?t=${timestamp}`;
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      const cached = localStorage.getItem('app_videos_cache');
      return cached ? JSON.parse(cached) : [];
    }

    const data = await response.json();
    const resources = data.resources || [];
    
    return mapCloudinaryData(resources);
  } catch (error) {
    console.error('Fetch Error:', error);
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  const mapped = resources.map((res: any, index: number) => {
    const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
    const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;
    const optimizedUrl = `${baseUrl}/q_auto,f_auto/v${res.version}/${res.public_id}.${res.format}`;
    const posterUrl = `${baseUrl}/q_auto,f_auto,so_0/v${res.version}/${res.public_id}.jpg`;
    
    // توزيع الفيديوهات الـ 14 (أو أكثر) على الـ 8 أقسام بشكل دوري
    // هذا يضمن امتلاء كل الصفحات بفيديوهات موجودة حالياً
    const assignedCategory = TARGET_CATEGORIES[index % TARGET_CATEGORIES.length];
    const title = res.context?.custom?.caption || `فيديو ${assignedCategory} رقم ${index + 1}`;

    return {
      id: res.public_id,
      public_id: res.public_id,
      video_url: optimizedUrl,
      poster_url: posterUrl,
      type: videoType,
      title: title,
      likes: 0,
      views: 0,
      category: assignedCategory, // تم الربط بالقسم الجديد
      created_at: res.created_at
    } as Video;
  });

  localStorage.setItem('app_videos_cache', JSON.stringify(mapped));
  return mapped;
};

export const deleteCloudinaryVideo = async (publicId: string) => {
  console.warn("Delete requires Admin API credentials.");
  return false;
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  console.warn("Update requires Admin API credentials.");
  return false;
};
