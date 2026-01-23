import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const documentTypeEnum = z.enum(['request', 'estimate', 'contract']);
export const documentStatusEnum = z.enum(['draft', 'pending', 'approved', 'rejected', 'signed']);
export const templateFieldTypeEnum = z.enum(['text', 'number', 'date', 'textarea', 'select', 'file']);

// ============================================
// Template Field Schema
// ============================================

export const templateFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: templateFieldTypeEnum,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

// ============================================
// Template Schemas
// ============================================

export const createTemplateSchema = z.object({
  type: documentTypeEnum,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fields: z.array(templateFieldSchema).min(1),
  is_default: z.boolean().optional(),
});

export const updateTemplateSchema = z.object({
  type: documentTypeEnum.optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  fields: z.array(templateFieldSchema).min(1).optional(),
  is_default: z.boolean().optional(),
});

export const templateQuerySchema = z.object({
  type: documentTypeEnum.optional(),
});

// ============================================
// Document Schemas
// ============================================

export const createDocumentSchema = z.object({
  template_id: z.string().uuid().optional(),
  type: documentTypeEnum,
  title: z.string().min(1).max(255),
  content: z.record(z.unknown()).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
});

export const documentQuerySchema = z.object({
  type: documentTypeEnum.optional(),
  status: documentStatusEnum.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================
// Status Change Schema
// ============================================

const validTransitions: Record<string, string[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  approved: ['signed'],
  rejected: ['draft'],
};

export const changeStatusSchema = z.object({
  status: documentStatusEnum,
  reject_reason: z.string().min(1).max(1000).optional(),
}).refine(
  (data) => {
    if (data.status === 'rejected' && !data.reject_reason) {
      return false;
    }
    return true;
  },
  { message: '반려 시 사유를 입력해주세요.', path: ['reject_reason'] }
);

export { validTransitions };

// ============================================
// Signature Schema
// ============================================

export const signDocumentSchema = z.object({
  signature_data: z.string().min(1, '서명 데이터가 필요합니다.'),
});

// ============================================
// Type exports
// ============================================

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateQueryInput = z.infer<typeof templateQuerySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type SignDocumentInput = z.infer<typeof signDocumentSchema>;
