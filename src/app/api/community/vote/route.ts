/**
 * 커뮤니티 투표 API
 * POST - 투표 (생성/수정/삭제)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 투표 스키마
const voteSchema = z.object({
  target_type: z.enum(['post', 'answer']),
  target_id: z.string().uuid(),
  vote_type: z.enum(['up', 'down', 'cancel']), // cancel은 투표 취소
});

// POST: 투표
export async function POST(request: NextRequest) {
  try {
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
    const validationResult = voteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }

    const { target_type, target_id, vote_type } = validationResult.data;
    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    // 기존 투표 확인
    const { data: existingVote } = await adminClient
      .from('votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .single();

    // 투표 취소
    if (vote_type === 'cancel') {
      if (existingVote) {
        await adminClient.from('votes').delete().eq('id', existingVote.id);
      }
      return NextResponse.json({ message: '투표가 취소되었습니다' });
    }

    // 같은 투표 시 취소
    if (existingVote?.vote_type === vote_type) {
      await adminClient.from('votes').delete().eq('id', existingVote.id);
      return NextResponse.json({ message: '투표가 취소되었습니다' });
    }

    // 기존 투표 있으면 업데이트, 없으면 생성
    if (existingVote) {
      const { error: updateError } = await adminClient
        .from('votes')
        .update({ vote_type })
        .eq('id', existingVote.id);

      if (updateError) {
        console.error('[Community Vote] 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: '투표 업데이트에 실패했습니다' },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await adminClient.from('votes').insert({
        user_id: user.id,
        target_type,
        target_id,
        vote_type,
      });

      if (insertError) {
        console.error('[Community Vote] 생성 오류:', insertError);
        return NextResponse.json(
          { error: '투표에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    // 업데이트된 vote_count 반환
    const tableName = target_type === 'post' ? 'posts' : 'answers';
    const { data: updated } = await adminClient
      .from(tableName)
      .select('vote_count')
      .eq('id', target_id)
      .single();

    return NextResponse.json({
      message: vote_type === 'up' ? '추천했습니다' : '비추천했습니다',
      vote_count: updated?.vote_count || 0,
      vote_type,
    });
  } catch (error) {
    console.error('[Community Vote] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
