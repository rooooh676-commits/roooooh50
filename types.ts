
export type VideoType = 'short' | 'long';

export interface Video {
  id: string;
  video_url: string;
  poster_url?: string;
  type: VideoType;
  likes: number;
  views: number;
  title: string;
  category: string;
  tags?: string[];
  created_at?: string;
  public_id: string;
  external_link?: string; // رابط الانتقال المخصص
  isFeatured?: boolean; // هل الفيديو رائج/مميز؟
}

export interface UserInteractions {
  likedIds: string[];
  dislikedIds: string[];
  savedIds: string[];
  savedCategoryNames: string[]; 
  watchHistory: { id: string; progress: number }[];
  downloadedIds: string[]; // تتبع الفيديوهات المحملة
}

export enum AppView {
  HOME = 'home',
  TREND = 'trend',
  LIKES = 'likes',
  SAVED = 'saved',
  UNWATCHED = 'unwatched',
  HIDDEN = 'hidden',
  PRIVACY = 'privacy',
  ADMIN = 'admin',
  CATEGORY = 'category',
  OFFLINE = 'offline'
}
