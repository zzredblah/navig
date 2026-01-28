import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 마커 수정 스키마
const updateMarkerSchema = z.object({
  type: z.enum(['visual', 'audio', 'text', 'effect', 'other']).optional(),
  start_time: z.number().min(0).optional(),
  end_time: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
}).refine(data => {
  if (data.start_time !== undefined && data.end_time !== undefined) {
    return data.end_time >= data.start_time;
  }
  return true;
}, {
  message: 'end_time must be greater than or equal to start_time',
});

// PATCH: 마커 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string; markerId: string }> }
) {
  try {
    const supabase = await createClient();
    const { markerId } = await params;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const parseResult = updateMarkerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 마커 조회 및 권한 확인
    const { data: existingMarker, error: markerError } = await adminClient
      .from('video_change_markers')
      .select(`
        *,
        version:video_versions!version_id(project_id)
      `)
      .eq('id', markerId)
      .single();

    if (markerError || !existingMarker) {
      return NextResponse.json({ error: '마커를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 작성자 또는 관리자 확인
    if (existingMarker.created_by !== user.id) {
      const { data: membership } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', (existingMarker.version as { project_id: string }).project_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 마커 업데이트
    const updates: Record<string, unknown> = {};
    if (parseResult.data.type !== undefined) updates.type = parseResult.data.type;
    if (parseResult.data.start_time !== undefined) updates.start_time = parseResult.data.start_time;
    if (parseResult.data.end_time !== undefined) updates.end_time = parseResult.data.end_time;
    if (parseResult.data.description !== undefined) updates.description = parseResult.data.description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

    const { data: marker, error: updateError } = await adminClient
      .from('video_change_markers')
      .update(updates)
      .eq('id', markerId)
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('[Markers] 수정 실패:', updateError);
      return NextResponse.json({ error: '마커 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ marker });
  } catch (error) {
    console.error('[Markers] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 마커 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string; markerId: string }> }
) {
  try {
    const supabase = await createClient();
    const { markerId } = await params;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 마커 조회 및 권한 확인
    const { data: existingMarker, error: markerError } = await adminClient
      .from('video_change_markers')
      .select(`
        *,
        version:video_versions!version_id(project_id)
      `)
      .eq('id', markerId)
      .single();

    if (markerError || !existingMarker) {
      return NextResponse.json({ error: '마커를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 작성자 또는 관리자 확인
    if (existingMarker.created_by !== user.id) {
      const { data: membership } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', (existingMarker.version as { project_id: string }).project_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 마커 삭제
    const { error: deleteError } = await adminClient
      .from('video_change_markers')
      .delete()
      .eq('id', markerId);

    if (deleteError) {
      console.error('[Markers] 삭제 실패:', deleteError);
      return NextResponse.json({ error: '마커 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Markers] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
