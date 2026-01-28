/**
 * 이메일 발송 서비스 (Resend)
 */

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';
import { NotificationType } from '@/types/notification';

// Resend 클라이언트 (환경 변수 없으면 null)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 발신자 이메일 (Resend 대시보드에서 인증된 도메인 필요)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NAVIG <noreply@navig.app>';

/**
 * 알림 타입별 이메일 설정 맵
 */
const EMAIL_SETTINGS_MAP: Record<NotificationType, keyof EmailSettings | null> = {
  new_feedback: 'email_new_feedback',
  urgent_feedback: 'email_urgent_feedback',
  feedback_status: 'email_new_feedback',
  feedback_reply: 'email_new_feedback',
  new_version: 'email_version_upload',
  video_approved: 'email_version_upload', // 영상 승인도 영상 알림 설정 사용
  document_status: 'email_document_status',
  project_invite: 'email_new_feedback', // 기본 활성화
  deadline_reminder: 'email_deadline_reminder',
  chat_message: 'email_chat_message',
};

interface EmailSettings {
  email_new_feedback: boolean;
  email_urgent_feedback: boolean;
  email_version_upload: boolean;
  email_document_status: boolean;
  email_deadline_reminder: boolean;
  email_chat_message: boolean;
  inapp_enabled: boolean;
}

interface SendEmailParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

/**
 * EmailService
 * 알림에 대한 이메일 발송
 */
export class EmailService {
  /**
   * 이메일 발송 가능 여부 확인
   */
  static isEnabled(): boolean {
    return !!resend;
  }

  /**
   * 사용자의 이메일 설정 조회
   */
  static async getUserEmailSettings(userId: string): Promise<EmailSettings | null> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // 설정이 없으면 기본값 반환
      return {
        email_new_feedback: true,
        email_urgent_feedback: true,
        email_version_upload: true,
        email_document_status: true,
        email_deadline_reminder: true,
        email_chat_message: false,
        inapp_enabled: true,
      };
    }

    return data as EmailSettings;
  }

  /**
   * 사용자 이메일 조회
   */
  static async getUserEmail(userId: string): Promise<string | null> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('[EmailService] 사용자 이메일 조회 실패:', error);
      return null;
    }

    return data.email;
  }

  /**
   * 이메일 발송
   */
  static async send(params: SendEmailParams): Promise<boolean> {
    if (!resend) {
      console.warn('[EmailService] Resend API 키가 설정되지 않았습니다.');
      return false;
    }

    const { userId, type, title, content, link } = params;

    try {
      // 1. 사용자 이메일 설정 확인
      const settings = await this.getUserEmailSettings(userId);
      if (!settings) {
        return false;
      }

      // 2. 해당 알림 타입의 이메일 설정 확인
      const settingKey = EMAIL_SETTINGS_MAP[type];
      if (settingKey && !settings[settingKey]) {
        console.log(`[EmailService] 사용자가 ${type} 이메일을 비활성화했습니다.`);
        return false;
      }

      // 3. 사용자 이메일 조회
      const email = await this.getUserEmail(userId);
      if (!email) {
        return false;
      }

      // 4. 이메일 발송
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: title,
        html: this.generateEmailHtml(title, content, link, type),
      });

      if (error) {
        console.error('[EmailService] 이메일 발송 실패:', error);
        return false;
      }

      console.log(`[EmailService] 이메일 발송 성공: ${email}`);
      return true;
    } catch (error) {
      console.error('[EmailService] 이메일 발송 예외:', error);
      return false;
    }
  }

  /**
   * 여러 사용자에게 이메일 발송
   */
  static async sendBulk(
    userIds: string[],
    params: Omit<SendEmailParams, 'userId'>
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) => this.send({ ...params, userId }))
    );
  }

  /**
   * 이메일 HTML 생성
   */
  private static generateEmailHtml(
    title: string,
    content: string,
    link?: string,
    type?: NotificationType
  ): string {
    const isUrgent = type === 'urgent_feedback' || type === 'deadline_reminder';
    const urgentBadge = isUrgent
      ? '<span style="background-color: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">긴급</span>'
      : '';

    const actionButton = link
      ? `
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://navig.app'}${link}"
           style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 500;">
          바로가기
        </a>
      `
      : '';

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- 헤더 -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 12px 20px; border-radius: 12px;">
        <span style="color: white; font-size: 24px; font-weight: bold;">NAVIG</span>
      </div>
    </div>

    <!-- 메인 콘텐츠 -->
    <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <h1 style="margin: 0 0 16px 0; font-size: 20px; color: #111827;">
        ${title}${urgentBadge}
      </h1>

      <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
        ${content}
      </p>

      ${actionButton}
    </div>

    <!-- 푸터 -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        이 이메일은 NAVIG에서 자동으로 발송되었습니다.
      </p>
      <p style="margin: 0;">
        알림 설정은 <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://navig.app'}/settings" style="color: #7c3aed;">설정 페이지</a>에서 변경할 수 있습니다.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 마감 알림 전용 이메일 발송
   */
  static async sendDeadlineReminder(
    userId: string,
    projectTitle: string,
    daysRemaining: number
  ): Promise<boolean> {
    let title: string;
    let content: string;

    if (daysRemaining === 0) {
      title = `🔥 [NAVIG] 프로젝트 "${projectTitle}" 오늘 마감입니다!`;
      content = `프로젝트 "${projectTitle}"의 마감일이 오늘입니다. 마감 전에 모든 작업을 완료해주세요.`;
    } else if (daysRemaining === 1) {
      title = `⚠️ [NAVIG] 프로젝트 "${projectTitle}" 마감이 내일입니다`;
      content = `프로젝트 "${projectTitle}"의 마감일이 내일입니다. 마감 전에 모든 작업을 확인해주세요.`;
    } else {
      title = `[NAVIG] 프로젝트 "${projectTitle}" 마감 ${daysRemaining}일 전`;
      content = `프로젝트 "${projectTitle}"의 마감일이 ${daysRemaining}일 남았습니다.`;
    }

    return this.send({
      userId,
      type: 'deadline_reminder',
      title,
      content,
      link: '/dashboard',
    });
  }
}
