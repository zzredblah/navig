/**
 * 멀티 캔버스 (레퍼런스 보드) 타입 정의
 */

export interface Board {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_public: boolean;
  share_token?: string;
  background_color: string;
  grid_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BoardElementStats {
  total: number;
  images: number;
  videos: number;
  texts: number;
  stickies: number;
  shapes: number;
}

export interface BoardWithCreator extends Board {
  creator: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  elementStats?: BoardElementStats;
  previewImageUrl?: string | null;
}

export type BoardElementType = 'image' | 'video' | 'text' | 'shape' | 'sticky' | 'frame';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'star' | 'line';
export type TextAlign = 'left' | 'center' | 'right';

export interface ElementContent {
  // image/video
  url?: string;
  thumbnail_url?: string;
  original_filename?: string;

  // text/sticky
  text?: string;

  // shape
  shape_type?: ShapeType;

  // frame
  children?: string[];
  frame_name?: string;
}

export interface ElementStyle {
  background_color?: string;
  border_color?: string;
  border_width?: number;
  border_radius?: number;
  font_size?: number;
  font_weight?: string;
  font_style?: string;
  text_align?: TextAlign;
  text_color?: string;
  opacity?: number;
  shadow?: boolean;
}

export interface BoardElement {
  id: string;
  board_id: string;
  type: BoardElementType;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  locked: boolean;
  content: ElementContent;
  style: ElementStyle;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BoardElementWithCreator extends BoardElement {
  creator: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

// API 요청/응답 타입
export interface CreateBoardRequest {
  title?: string;
  description?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
  background_color?: string;
  grid_enabled?: boolean;
  is_public?: boolean;
}

export interface CreateElementRequest {
  type: BoardElementType;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  rotation?: number;
  content: ElementContent;
  style?: ElementStyle;
}

export interface UpdateElementRequest {
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  locked?: boolean;
  content?: ElementContent;
  style?: ElementStyle;
}

export interface BatchUpdateElementsRequest {
  elements: Array<{
    id: string;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    z_index?: number;
    locked?: boolean;
    content?: ElementContent;
    style?: ElementStyle;
  }>;
}

// 응답 타입
export interface BoardsListResponse {
  data: BoardWithCreator[];
  total: number;
}

export interface BoardDetailResponse {
  board: BoardWithCreator;
  elements: BoardElement[];
}

export interface ShareLinkResponse {
  share_url: string;
  share_token: string;
}
