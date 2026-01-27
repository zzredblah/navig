/**
 * 알림 생성 서비스
 * 시스템 전반에서 알림을 생성할 때 사용
 */

import { createAdminClient } from '@/lib/supabase/server';
import { CreateNotificationParams, NotificationType } from '@/types/notification';

/**
 * NotificationService
 * Admin 클라이언트를 사용하여 알림 생성 (RLS 우회)
 */
export class NotificationService {
  /**
   * 알림 생성 (인앱 알림)
   */
  static async create(params: CreateNotificationParams): Promise<void> {
    const adminClient = createAdminClient();

    const { userId, type, title, content, link, metadata = {} } = params;

    // 인앱 알림 생성
    const { error } = await adminClient.from('notifications').insert({
      user_id: userId,
      type,
      title,
      content,
      link,
      metadata,
    });

    if (error) {
      console.error('[NotificationService] 알림 생성 실패:', error);
      throw new Error('알림 생성에 실패했습니다');
    }

    // NOTE: 이메일 발송은 추후 필요 시 활성화
    // import { EmailService } from '@/lib/email/service';
    // if (EmailService.isEnabled()) {
    //   EmailService.send({ userId, type, title, content, link }).catch(console.error);
    // }
  }

  /**
   * 여러 사용자에게 동일한 알림 전송
   */
  static async createBulk(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    const adminClient = createAdminClient();

    const { type, title, content, link, metadata = {} } = params;

    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      content,
      link,
      metadata,
    }));

    const { error } = await adminClient.from('notifications').insert(notifications);

    if (error) {
      console.error('[NotificationService] 대량 알림 생성 실패:', error);
      throw new Error('알림 생성에 실패했습니다');
    }
  }

  /**
   * 프로젝트 관련 알림 생성 (프로젝트 멤버 전체에게)
   */
  static async notifyProjectMembers(
    projectId: string,
    params: Omit<CreateNotificationParams, 'userId'>,
    excludeUserId?: string
  ): Promise<void> {
    const adminClient = createAdminClient();

    // 프로젝트 멤버 조회
    const { data: members, error: membersError } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    if (membersError) {
      console.error('[NotificationService] 프로젝트 멤버 조회 실패:', membersError);
      throw new Error('프로젝트 멤버 조회에 실패했습니다');
    }

    // 프로젝트 소유자(client_id) 조회
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[NotificationService] 프로젝트 조회 실패:', projectError);
      throw new Error('프로젝트 조회에 실패했습니다');
    }

    // 중복 제거 및 제외 사용자 필터링
    const userIds = [
      ...new Set([...members.map((m) => m.user_id), project.client_id]),
    ].filter((id) => id !== excludeUserId);

    if (userIds.length > 0) {
      await this.createBulk(userIds, params);
    }
  }
}
