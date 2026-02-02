/**
 * 커뮤니티 게시글 상세 API
 * GET   - 게시글 상세 조회
 * PATCH - 게시글 수정 (답변 채택 포함)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 수정 스키마
const updatePostSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(10).optional(),
  accepted_answer_id: z.string().uuid().optional(),
});

// GET: 게시글 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    // 게시글 조회
    const { data: post, error: postError } = await adminClient
      .from('posts')
      .select(
        `
        *,
        author:profiles!author_id(id, name, avatar_url),
        post_tags(
          tag:tags(id, name, color)
        )
      `
      )
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 조회수 증가
    await adminClient
      .from('posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', postId);

    // 답변 조회
    const { data: answers } = await adminClient
      .from('answers')
      .select(
        `
        *,
        author:profiles!author_id(id, name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

    // 현재 사용자의 투표 정보 조회 (인증된 경우)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userVotes: { target_id: string; vote_type: string }[] = [];
    if (user) {
      const { data: votes } = await adminClient
        .from('votes')
        .select('target_id, vote_type')
        .eq('user_id', user.id)
        .in('target_id', [postId, ...(answers?.map((a: any) => a.id) || [])]);
      userVotes = votes || [];
    }

    return NextResponse.json({
      data: {
        ...post,
        view_count: post.view_count + 1,
        answers: answers || [],
      },
      userVotes,
    });
  } catch (error) {
    console.error('[Community Post GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: 게시글 수정 (답변 채택 포함)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();

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

    const body = await request.json();
    const validationResult = updatePostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    // 게시글 존재 및 권한 확인
    const { data: existingPost } = await adminClient
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!existingPost) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (existingPost.author_id !== user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 답변 채택 시 답변 상태도 업데이트
    const updatePayload: Record<string, unknown> = { ...updateData };
    if (updateData.accepted_answer_id) {
      updatePayload.is_solved = true;

      // 기존 채택 취소
      await adminClient
        .from('answers')
        .update({ is_accepted: false })
        .eq('post_id', postId);

      // 새 답변 채택
      await adminClient
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', updateData.accepted_answer_id);
    }

    // 게시글 업데이트
    const { data: post, error: updateError } = await adminClient
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      console.error('[Community Post PATCH] 수정 오류:', updateError);
      return NextResponse.json(
        { error: '게시글 수정에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error('[Community Post PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
