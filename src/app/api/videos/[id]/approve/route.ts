import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/videos/[id]/approve
 * 영상 승인 (클라이언트만 가능)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: videoId } = await params;
    const supabase = await createClient();

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. 영상 및 프로젝트 정보 조회
    const { data: video, error: videoError } = await adminClient
      .from('video_versions')
      .select(`
        id,
        version_number,
        version_name,
        project_id,
        uploaded_by,
        approved_at,
        project:projects!inner(
          id,
          title,
          client_id
        )
      `)
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('[videos/approve] 영상 조회 실패:', videoError);
      return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 3. 권한 확인 (프로젝트 소유자 또는 승인자 역할만 승인 가능)
    const project = video.project as { id: string; title: string; client_id: string };

    // 프로젝트 멤버 역할 조회
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single();

    const isOwner = member?.role === 'owner' || project.client_id === user.id;
    const isApprover = member?.role === 'approver';

    if (!isOwner && !isApprover) {
      return NextResponse.json(
        { error: '소유자 또는 승인자만 영상을 승인할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 4. 이미 승인된 경우
    if (video.approved_at) {
      return NextResponse.json(
        { error: '이미 승인된 영상입니다.' },
        { status: 400 }
      );
    }

    // 5. 영상 승인 처리
    const { data: updatedVideo, error: updateError } = await adminClient
      .from('video_versions')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('[videos/approve] 승인 실패:', updateError);
      return NextResponse.json({ error: '승인 처리에 실패했습니다.' }, { status: 500 });
    }

    // 6. 업로더에게 알림 생성 (본인이 업로드한 경우 제외)
    if (video.uploaded_by && video.uploaded_by !== user.id) {
      const versionDisplay = video.version_name
        ? `v${video.version_number} - ${video.version_name}`
        : `v${video.version_number}`;

      await adminClient.from('notifications').insert({
        user_id: video.uploaded_by,
        type: 'video_approved',
        title: '영상이 승인되었습니다',
        content: `"${project.title}" 프로젝트의 ${versionDisplay} 영상이 승인되었습니다.`,
        link: `/projects/${project.id}/videos/${videoId}`,
        metadata: {
          project_id: project.id,
          project_title: project.title,
          video_id: videoId,
          version_number: video.version_number,
          version_name: video.version_name,
        },
      });
    }

    return NextResponse.json({
      data: updatedVideo,
      message: '영상이 승인되었습니다.',
    });
  } catch (error) {
    console.error('[videos/approve] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/videos/[id]/approve
 * 영상 승인 취소
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: videoId } = await params;
    const supabase = await createClient();

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. 영상 조회
    const { data: video, error: videoError } = await adminClient
      .from('video_versions')
      .select(`
        id,
        approved_at,
        approved_by,
        project:projects!inner(
          id,
          client_id
        )
      `)
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 3. 권한 확인 (프로젝트 소유자 또는 승인자 역할만 취소 가능)
    const project = video.project as { id: string; client_id: string };

    // 프로젝트 멤버 역할 조회
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single();

    const isOwner = member?.role === 'owner' || project.client_id === user.id;
    const isApprover = member?.role === 'approver';

    if (!isOwner && !isApprover) {
      return NextResponse.json(
        { error: '소유자 또는 승인자만 승인을 취소할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 4. 승인되지 않은 경우
    if (!video.approved_at) {
      return NextResponse.json(
        { error: '아직 승인되지 않은 영상입니다.' },
        { status: 400 }
      );
    }

    // 5. 승인 취소
    const { data: updatedVideo, error: updateError } = await adminClient
      .from('video_versions')
      .update({
        approved_at: null,
        approved_by: null,
      })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('[videos/approve] 취소 실패:', updateError);
      return NextResponse.json({ error: '승인 취소에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      data: updatedVideo,
      message: '승인이 취소되었습니다.',
    });
  } catch (error) {
    console.error('[videos/approve] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
