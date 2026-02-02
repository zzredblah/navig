/**
 * 커뮤니티 태그 API
 * GET - 태그 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET: 태그 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    const { data: tags, error } = await adminClient
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('[Community Tags GET] 조회 오류:', error);
      return NextResponse.json(
        { error: '태그 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: tags || [] });
  } catch (error) {
    console.error('[Community Tags GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
