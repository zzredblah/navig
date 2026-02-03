/**
 * 포트폴리오 관련 타입 정의
 */

export interface Portfolio {
  user_id: string;
  slug: string | null;
  display_name: string | null;
  bio: string | null;
  skills: string[];
  website_url: string | null;
  contact_email: string | null;
  social_links: SocialLinks;
  is_public: boolean;
  theme: PortfolioTheme;
  custom_css: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  youtube?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  behance?: string;
  vimeo?: string;
  github?: string;
}

export type PortfolioTheme = 'default' | 'dark' | 'minimal' | 'creative';

export interface PortfolioWork {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  external_url: string | null;
  project_id: string | null;
  tags: string[];
  is_featured: boolean;
  is_public: boolean;
  view_count: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// API 요청/응답 타입
export interface CreatePortfolioRequest {
  slug?: string;
  display_name?: string;
  bio?: string;
  skills?: string[];
  website_url?: string;
  contact_email?: string;
  social_links?: SocialLinks;
  is_public?: boolean;
  theme?: PortfolioTheme;
}

export interface UpdatePortfolioRequest extends Partial<CreatePortfolioRequest> {}

export interface CreateWorkRequest {
  title: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  video_url?: string;
  external_url?: string;
  project_id?: string;
  tags?: string[];
  is_featured?: boolean;
  is_public?: boolean;
  order_index?: number;
}

export interface UpdateWorkRequest extends Partial<CreateWorkRequest> {}

export interface ReorderWorksRequest {
  works: { id: string; order_index: number }[];
}

// 공개 포트폴리오 조회 응답
export interface PublicPortfolioResponse {
  portfolio: Portfolio & {
    profile: {
      name: string;
      avatar_url: string | null;
    };
  };
  works: PortfolioWork[];
}

// 작품 카테고리
export const WORK_CATEGORIES = [
  { value: 'brand', label: '브랜드 영상' },
  { value: 'commercial', label: '광고/CF' },
  { value: 'youtube', label: '유튜브 콘텐츠' },
  { value: 'music_video', label: '뮤직비디오' },
  { value: 'documentary', label: '다큐멘터리' },
  { value: 'motion_graphics', label: '모션그래픽' },
  { value: 'short_film', label: '단편영화' },
  { value: 'wedding', label: '웨딩/이벤트' },
  { value: 'education', label: '교육/강의' },
  { value: 'other', label: '기타' },
] as const;

// 스킬 프리셋
export const SKILL_PRESETS = [
  'Premiere Pro',
  'After Effects',
  'DaVinci Resolve',
  'Final Cut Pro',
  'Cinema 4D',
  'Blender',
  'Photoshop',
  'Illustrator',
  'Figma',
  'Motion',
  'Nuke',
  'Houdini',
] as const;
