import { z } from 'zod';

// 보드 요소 타입
export const boardElementTypeSchema = z.enum([
  'image',
  'video',
  'text',
  'shape',
  'sticky',
  'frame',
]);

// 도형 타입
export const shapeTypeSchema = z.enum([
  'rectangle',
  'circle',
  'triangle',
  'arrow',
]);

// 텍스트 정렬
export const textAlignSchema = z.enum(['left', 'center', 'right']);

// 요소 콘텐츠
export const elementContentSchema = z.object({
  url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  original_filename: z.string().optional(),
  text: z.string().optional(),
  shape_type: shapeTypeSchema.optional(),
  children: z.array(z.string()).optional(),
});

// 요소 스타일
export const elementStyleSchema = z.object({
  background_color: z.string().optional(),
  border_color: z.string().optional(),
  border_width: z.number().optional(),
  border_radius: z.number().optional(),
  font_size: z.number().optional(),
  font_weight: z.string().optional(),
  text_align: textAlignSchema.optional(),
  text_color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.boolean().optional(),
});

// 보드 목록 쿼리
export const boardsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// 보드 생성
export const createBoardSchema = z.object({
  title: z.string().min(1).max(255).default('새 보드'),
  description: z.string().max(2000).optional(),
});

// 보드 수정
export const updateBoardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  grid_enabled: z.boolean().optional(),
  is_public: z.boolean().optional(),
  thumbnail_url: z.string().url().optional().nullable(),
});

// 요소 생성
export const createElementSchema = z.object({
  type: boardElementTypeSchema,
  position_x: z.number().default(0),
  position_y: z.number().default(0),
  width: z.number().positive().default(200),
  height: z.number().positive().default(200),
  rotation: z.number().default(0),
  content: elementContentSchema.default({}),
  style: elementStyleSchema.optional(),
});

// 요소 수정
export const updateElementSchema = z.object({
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.number().optional(),
  z_index: z.number().int().optional(),
  locked: z.boolean().optional(),
  content: elementContentSchema.optional(),
  style: elementStyleSchema.optional(),
});

// 일괄 요소 수정
export const batchUpdateElementsSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string().uuid(),
      position_x: z.number().optional(),
      position_y: z.number().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      rotation: z.number().optional(),
      z_index: z.number().int().optional(),
      locked: z.boolean().optional(),
      content: elementContentSchema.optional(),
      style: elementStyleSchema.optional(),
    })
  ).min(1).max(100),
});

export type BoardsQuery = z.infer<typeof boardsQuerySchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateElementInput = z.infer<typeof createElementSchema>;
export type UpdateElementInput = z.infer<typeof updateElementSchema>;
export type BatchUpdateElementsInput = z.infer<typeof batchUpdateElementsSchema>;
