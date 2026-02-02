/**
 * 활동 로그 서비스
 * 프로젝트 내 모든 활동을 기록하여 타임라인에 표시
 */

import { createAdminClient } from '@/lib/supabase/server';
import { CreateActivityLogParams } from '@/types/activity';

/**
 * ActivityLogger
 * Admin 클라이언트를 사용하여 활동 로그 생성 (RLS 우회)
 */
export class ActivityLogger {
  /**
   * 활동 로그 생성
   */
  static async log(params: CreateActivityLogParams): Promise<void> {
    try {
      // activity_logs 테이블은 아직 타입 정의에 없으므로 any 사용
      const adminClient = createAdminClient() as any;

      const {
        projectId,
        userId,
        activityType,
        title,
        description,
        targetType,
        targetId,
        metadata = {},
      } = params;

      const { error } = await adminClient.from('activity_logs').insert({
        project_id: projectId,
        user_id: userId,
        activity_type: activityType,
        title,
        description: description || null,
        target_type: targetType || null,
        target_id: targetId || null,
        metadata,
      });

      if (error) {
        console.error('[ActivityLogger] 활동 로그 생성 실패:', error);
        // 활동 로그 실패는 주요 기능에 영향 주지 않도록 에러 throw 안 함
      }
    } catch (error) {
      console.error('[ActivityLogger] 예외 발생:', error);
      // 활동 로그 실패는 주요 기능에 영향 주지 않도록 에러 throw 안 함
    }
  }

  /**
   * 프로젝트 생성 로그
   */
  static async logProjectCreated(
    projectId: string,
    userId: string,
    projectTitle: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'project_created',
      title: `프로젝트 "${projectTitle}"을(를) 생성했습니다`,
      targetType: 'project',
      targetId: projectId,
    });
  }

  /**
   * 멤버 초대 로그
   */
  static async logMemberInvited(
    projectId: string,
    inviterId: string,
    invitedEmail: string,
    invitedName?: string
  ): Promise<void> {
    const displayName = invitedName || invitedEmail;
    await this.log({
      projectId,
      userId: inviterId,
      activityType: 'member_invited',
      title: `${displayName}님을 프로젝트에 초대했습니다`,
      targetType: 'member',
      metadata: { invited_email: invitedEmail, invited_name: invitedName },
    });
  }

  /**
   * 멤버 참여 로그 (초대 수락)
   */
  static async logMemberJoined(
    projectId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'member_joined',
      title: `${userName}님이 프로젝트에 참여했습니다`,
      targetType: 'member',
      targetId: userId,
    });
  }

  /**
   * 영상 업로드 로그
   */
  static async logVideoUploaded(
    projectId: string,
    userId: string,
    videoId: string,
    videoTitle: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'video_uploaded',
      title: `영상 "${videoTitle}"을(를) 업로드했습니다`,
      targetType: 'video',
      targetId: videoId,
    });
  }

  /**
   * 새 버전 업로드 로그
   */
  static async logVersionUploaded(
    projectId: string,
    userId: string,
    videoId: string,
    versionNumber: number
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'version_uploaded',
      title: `영상 v${versionNumber} 버전을 업로드했습니다`,
      targetType: 'version',
      targetId: videoId,
      metadata: { version_number: versionNumber },
    });
  }

  /**
   * 피드백 생성 로그
   */
  static async logFeedbackCreated(
    projectId: string,
    userId: string,
    feedbackId: string,
    videoTitle: string,
    isUrgent: boolean = false
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'feedback_created',
      title: isUrgent
        ? `"${videoTitle}" 영상에 긴급 피드백을 남겼습니다`
        : `"${videoTitle}" 영상에 피드백을 남겼습니다`,
      targetType: 'feedback',
      targetId: feedbackId,
      metadata: { video_title: videoTitle, is_urgent: isUrgent },
    });
  }

  /**
   * 피드백 해결 로그
   */
  static async logFeedbackResolved(
    projectId: string,
    userId: string,
    feedbackId: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'feedback_resolved',
      title: '피드백을 해결 완료로 표시했습니다',
      targetType: 'feedback',
      targetId: feedbackId,
    });
  }

  /**
   * 피드백 재오픈 로그
   */
  static async logFeedbackReopened(
    projectId: string,
    userId: string,
    feedbackId: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'feedback_reopened',
      title: '피드백을 다시 열었습니다',
      targetType: 'feedback',
      targetId: feedbackId,
    });
  }

  /**
   * 문서 생성 로그
   */
  static async logDocumentCreated(
    projectId: string,
    userId: string,
    documentId: string,
    documentTitle: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'document_created',
      title: `문서 "${documentTitle}"을(를) 생성했습니다`,
      targetType: 'document',
      targetId: documentId,
    });
  }

  /**
   * 영상 승인 로그
   */
  static async logVideoApproved(
    projectId: string,
    userId: string,
    videoId: string,
    videoTitle: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'video_approved',
      title: `영상 "${videoTitle}"을(를) 승인했습니다`,
      targetType: 'video',
      targetId: videoId,
    });
  }

  /**
   * 보드 생성 로그
   */
  static async logBoardCreated(
    projectId: string,
    userId: string,
    boardId: string,
    boardTitle: string
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      activityType: 'board_created',
      title: `레퍼런스 보드 "${boardTitle}"을(를) 생성했습니다`,
      targetType: 'board',
      targetId: boardId,
    });
  }
}

// 편의 함수 export
export const logActivity = ActivityLogger.log.bind(ActivityLogger);
