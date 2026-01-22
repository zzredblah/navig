import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(1, '프로젝트 제목을 입력해주세요').max(255, '제목은 255자 이하로 입력해주세요'),
  description: z.string().optional().nullable(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1, '프로젝트 제목을 입력해주세요').max(255, '제목은 255자 이하로 입력해주세요').optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['planning', 'production', 'review', 'completed']).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  role: z.enum(['owner', 'editor', 'viewer']).default('viewer'),
});

export const updateMemberSchema = z.object({
  role: z.enum(['owner', 'editor', 'viewer']),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['planning', 'production', 'review', 'completed']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
