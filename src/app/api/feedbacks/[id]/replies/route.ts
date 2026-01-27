/**
 * 피드백 답글 API
 * GET  - 답글 목록 조회
 * POST - 새 답글 작성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NotificationService } from '@/lib/notifications/service';

// 답글 생성 스키마
const createReplySchema = z.object({
  content: z.string().min(1, '내용을 입력해주세요').max(1000),
});

// GET: 답글 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 피드백 조회 (권한 확인용)
    const { data: feedback, error: feedbackError } = await adminClient
      .from('video_feedbacks')
      .select('id, project_id')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', feedback.project_id)
      .eq('user_id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', feedback.project_id)
      .single();

    const isOwner = project?.client_id === user.id;

    if (!member && !isOwner) {
      return NextResponse.json(
        { error: '이 피드백에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 답글 조회
    const { data: replies, error: queryError } = await adminClient
      .from('feedback_replies')
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url)
      `
      )
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error('[Replies GET] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '답글 목록 조회 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ replies: replies || [] });
  } catch (error) {
    console.error('[Replies GET] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: 새 답글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱
    const body = await request.json();
    const validationResult = createReplySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content } = validationResult.data;

    const adminClient = createAdminClient();

    // 피드백 조회 (권한 확인용 + 알림 발송용)
    const { data: feedback, error: feedbackError } = await adminClient
      .from('video_feedbacks')
      .select('id, project_id, video_id, created_by')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', feedback.project_id)
      .eq('user_id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', feedback.project_id)
      .single();

    const isOwner = project?.client_id === user.id;

    if (!member && !isOwner) {
      return NextResponse.json(
        { error: '이 피드백에 답글을 작성할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 답글 생성
    const { data: reply, error: insertError } = await adminClient
      .from('feedback_replies')
      .insert({
        feedback_id: feedbackId,
        content,
        created_by: user.id,
      })
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url)
      `
      )
      .single();

    if (insertError) {
      console.error('[Replies POST] 생성 오류:', insertError);
      return NextResponse.json(
        { error: '답글 작성 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // 피드백 작성자에게 알림 (답글 작성자 본인 제외, 비동기)
    if (feedback.created_by !== user.id) {
      try {
        const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;

        await NotificationService.create({
          userId: feedback.created_by,
          type: 'feedback_reply',
          title: '피드백에 답글이 달렸습니다',
          content: truncatedContent,
          link: `/projects/${feedback.project_id}/videos/${feedback.video_id}`,
          metadata: {
            feedbackId,
            replyId: reply.id,
            videoId: feedback.video_id,
          },
        });
      } catch (notifError) {
        console.error('[Replies POST] 알림 생성 실패:', notifError);
        // 알림 실패는 메인 로직에 영향 없음
      }
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('[Replies POST] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
