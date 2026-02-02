/**
 * 커뮤니티 답변 API
 * POST - 답변 작성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 답변 생성 스키마
const createAnswerSchema = z.object({
  content: z.string().min(10, '답변은 10자 이상 입력해주세요'),
});

// POST: 답변 작성
export async function POST(
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
    const validationResult = createAnswerSchema.safeParse(body);

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

    // 게시글 존재 확인 (posts 테이블은 아직 타입 정의에 없음)
    const { data: post } = await (adminClient as any)
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 답변 생성 (answers 테이블은 아직 타입 정의에 없음)
    const { data: answer, error: insertError } = await (adminClient as any)
      .from('answers')
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
      })
      .select(
        `
        *,
        author:profiles!author_id(id, name, avatar_url)
      `
      )
      .single();

    if (insertError) {
      console.error('[Community Answers POST] 생성 오류:', insertError);
      return NextResponse.json(
        { error: '답변 작성에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: answer }, { status: 201 });
  } catch (error) {
    console.error('[Community Answers POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
