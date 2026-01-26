/**
 * 피드백 상세 API
 * GET    - 피드백 상세 조회 (답글 포함)
 * PATCH  - 피드백 수정 (내용, 상태)
 * DELETE - 피드백 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 수정 요청 스키마
const updateFeedbackSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  status: z.enum(['open', 'resolved', 'wontfix']).optional(),
});

// GET: 피드백 상세 조회 (답글 포함)
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

    // 피드백 조회
    const { data: feedback, error: queryError } = await adminClient
      .from('video_feedbacks')
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url),
        resolver:profiles!resolved_by(id, name, avatar_url)
      `
      )
      .eq('id', feedbackId)
      .single();

    if (queryError || !feedback) {
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
    const { data: replies } = await adminClient
      .from('feedback_replies')
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url)
      `
      )
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      feedback,
      replies: replies || [],
    });
  } catch (error) {
    console.error('[Feedback GET] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH: 피드백 수정
export async function PATCH(
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
    const validationResult = updateFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 기존 피드백 조회
    const { data: existingFeedback, error: queryError } = await adminClient
      .from('video_feedbacks')
      .select('*, project:projects!project_id(client_id)')
      .eq('id', feedbackId)
      .single();

    if (queryError || !existingFeedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 내용 수정은 작성자만 가능
    if (updateData.content && existingFeedback.created_by !== user.id) {
      return NextResponse.json(
        { error: '피드백 내용은 작성자만 수정할 수 있습니다' },
        { status: 403 }
      );
    }

    // 상태 변경은 프로젝트 멤버 누구나 가능
    if (updateData.status) {
      const { data: member } = await adminClient
        .from('project_members')
        .select('id')
        .eq('project_id', existingFeedback.project_id)
        .eq('user_id', user.id)
        .single();

      const isOwner = (existingFeedback.project as { client_id: string })?.client_id === user.id;

      if (!member && !isOwner) {
        return NextResponse.json(
          { error: '피드백 상태를 변경할 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // 업데이트 데이터 준비
    const updatePayload: Record<string, unknown> = { ...updateData };

    // 상태가 resolved로 변경되면 resolved_at, resolved_by 설정
    if (updateData.status === 'resolved') {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = user.id;
    } else if (updateData.status === 'open') {
      // 다시 open으로 변경되면 resolved 정보 초기화
      updatePayload.resolved_at = null;
      updatePayload.resolved_by = null;
    }

    // 피드백 수정
    const { data: feedback, error: updateError } = await adminClient
      .from('video_feedbacks')
      .update(updatePayload)
      .eq('id', feedbackId)
      .select(
        `
        *,
        author:profiles!created_by(id, name, avatar_url),
        resolver:profiles!resolved_by(id, name, avatar_url)
      `
      )
      .single();

    if (updateError) {
      console.error('[Feedback PATCH] 수정 오류:', updateError);
      return NextResponse.json(
        { error: '피드백 수정 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('[Feedback PATCH] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: 피드백 삭제
export async function DELETE(
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

    // 기존 피드백 조회
    const { data: existingFeedback, error: queryError } = await adminClient
      .from('video_feedbacks')
      .select('*, project:projects!project_id(client_id)')
      .eq('id', feedbackId)
      .single();

    if (queryError || !existingFeedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 권한 확인 (작성자 또는 프로젝트 관리자)
    const isCreator = existingFeedback.created_by === user.id;
    const isOwner = (existingFeedback.project as { client_id: string })?.client_id === user.id;

    const { data: adminMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', existingFeedback.project_id)
      .eq('user_id', user.id)
      .single();

    const isProjectOwner = adminMember?.role === 'owner';

    if (!isCreator && !isOwner && !isProjectOwner) {
      return NextResponse.json(
        { error: '이 피드백을 삭제할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 피드백 삭제 (답글은 CASCADE로 자동 삭제)
    const { error: deleteError } = await adminClient
      .from('video_feedbacks')
      .delete()
      .eq('id', feedbackId);

    if (deleteError) {
      console.error('[Feedback DELETE] 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '피드백 삭제 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '피드백이 삭제되었습니다' });
  } catch (error) {
    console.error('[Feedback DELETE] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
