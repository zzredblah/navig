import { z } from 'zod';

/**
 * 알림 목록 조회 쿼리 스키마
 */
export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unread_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

/**
 * 알림 설정 업데이트 스키마
 */
export const updateNotificationSettingsSchema = z.object({
  email_new_feedback: z.boolean().optional(),
  email_urgent_feedback: z.boolean().optional(),
  email_version_upload: z.boolean().optional(),
  email_document_status: z.boolean().optional(),
  email_deadline_reminder: z.boolean().optional(),
  email_chat_message: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
});
