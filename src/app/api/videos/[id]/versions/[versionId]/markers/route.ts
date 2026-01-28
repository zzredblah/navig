import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 마커 생성 스키마
const createMarkerSchema = z.object({
  type: z.enum(['visual', 'audio', 'text', 'effect', 'other']),
  start_time: z.number().min(0),
  end_time: z.number().min(0),
  description: z.string().optional(),
  compared_version_id: z.string().uuid().optional(),
}).refine(data => data.end_time >= data.start_time, {
  message: 'end_time must be greater than or equal to start_time',
});

// GET: 마커 목록 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { versionId } = await params;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 마커 목록 조회 with 작성자 정보
    const { data: markers, error } = await adminClient
      .from('video_change_markers')
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url)
      `)
      .eq('version_id', versionId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[Markers] 조회 실패:', error);
      return NextResponse.json({ error: '마커 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ markers: markers || [] });
  } catch (error) {
    console.error('[Markers] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 마커 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { versionId } = await params;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const parseResult = createMarkerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { type, start_time, end_time, description, compared_version_id } = parseResult.data;

    const adminClient = createAdminClient();

    // 버전 존재 확인 및 권한 확인
    const { data: version, error: versionError } = await adminClient
      .from('video_versions')
      .select('id, project_id')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: '영상 버전을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로젝트 멤버 확인
    const { data: membership } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', version.project_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 마커 생성
    const { data: marker, error: createError } = await adminClient
      .from('video_change_markers')
      .insert({
        version_id: versionId,
        compared_version_id: compared_version_id || null,
        type,
        start_time,
        end_time,
        description: description || null,
        created_by: user.id,
      })
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('[Markers] 생성 실패:', createError);
      return NextResponse.json({ error: '마커 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ marker }, { status: 201 });
  } catch (error) {
    console.error('[Markers] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
