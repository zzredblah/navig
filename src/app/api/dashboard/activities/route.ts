import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { activitiesQuerySchema } from '@/lib/validations/dashboard';

/**
 * GET /api/dashboard/activities
 * 최근 활동 조회 (피드백, 버전, 문서, 프로젝트, 채팅 등)
 *
 * Query Parameters:
 * - limit?: number (기본 10, 최대 50)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 쿼리 파라미터 파싱 및 검증
    const { searchParams } = new URL(request.url);
    const queryResult = activitiesQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { limit } = queryResult.data;

    // 3. Admin 클라이언트로 데이터 조회
    const adminClient = createAdminClient();

    // 소유한 프로젝트 ID
    const { data: ownedProjects, error: ownedError } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    if (ownedError) {
      console.error('[Dashboard Activities] 소유 프로젝트 조회 실패:', ownedError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 멤버로 참여한 프로젝트 ID
    const { data: memberProjects, error: memberError } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('[Dashboard Activities] 멤버 프로젝트 조회 실패:', memberError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    const ownedIds = ownedProjects?.map(p => p.id) || [];
    const memberIds = memberProjects?.map(m => m.project_id) || [];
    const allProjectIds = [...new Set([...ownedIds, ...memberIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ activities: [] }, { status: 200 });
    }

    // 4. 각종 활동 조회 및 통합
    const activities: Array<{
      type: 'feedback' | 'version' | 'document' | 'project';
      action: 'created' | 'updated' | 'status_changed';
      title: string;
      project_name: string;
      actor_name: string;
      actor_avatar: string | null;
      created_at: string;
      link: string;
    }> = [];

    // 피드백 생성 활동
    const { data: feedbacks } = await adminClient
      .from('video_feedbacks')
      .select(`
        id,
        content,
        created_at,
        project_id,
        video_id,
        created_by,
        projects!inner(id, title),
        profiles!video_feedbacks_created_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (feedbacks) {
      feedbacks.forEach((fb: any) => {
        activities.push({
          type: 'feedback',
          action: 'created',
          title: fb.content.substring(0, 50) + (fb.content.length > 50 ? '...' : ''),
          project_name: fb.projects?.title || '알 수 없음',
          actor_name: fb.profiles?.name || '알 수 없음',
          actor_avatar: fb.profiles?.avatar_url || null,
          created_at: fb.created_at,
          link: `/projects/${fb.project_id}/videos/${fb.video_id}`,
        });
      });
    }

    // 영상 버전 업로드 활동
    const { data: versions } = await adminClient
      .from('video_versions')
      .select(`
        id,
        version_name,
        original_filename,
        created_at,
        project_id,
        uploaded_by,
        projects!inner(id, title),
        profiles!video_versions_uploaded_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (versions) {
      versions.forEach((version: any) => {
        activities.push({
          type: 'version',
          action: 'created',
          title: version.version_name || version.original_filename || '새 버전',
          project_name: version.projects?.title || '알 수 없음',
          actor_name: version.profiles?.name || '알 수 없음',
          actor_avatar: version.profiles?.avatar_url || null,
          created_at: version.created_at,
          link: `/projects/${version.project_id}/videos/${version.id}`,
        });
      });
    }

    // 문서 생성 활동
    const { data: documents } = await adminClient
      .from('documents')
      .select(`
        id,
        title,
        type,
        created_at,
        project_id,
        created_by,
        projects!inner(id, title),
        profiles!documents_created_by_fkey(id, name, avatar_url)
      `)
      .in('project_id', allProjectIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (documents) {
      documents.forEach((doc: any) => {
        activities.push({
          type: 'document',
          action: 'created',
          title: doc.title,
          project_name: doc.projects?.title || '알 수 없음',
          actor_name: doc.profiles?.name || '알 수 없음',
          actor_avatar: doc.profiles?.avatar_url || null,
          created_at: doc.created_at,
          link: `/projects/${doc.project_id}/documents/${doc.id}`,
        });
      });
    }

    // 프로젝트 생성 활동
    const { data: projectActivities } = await adminClient
      .from('projects')
      .select(`
        id,
        title,
        created_at,
        client_id,
        profiles!projects_client_id_fkey(id, name, avatar_url)
      `)
      .in('id', allProjectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectActivities) {
      projectActivities.forEach((proj: any) => {
        activities.push({
          type: 'project',
          action: 'created',
          title: proj.title,
          project_name: proj.title,
          actor_name: proj.profiles?.name || '알 수 없음',
          actor_avatar: proj.profiles?.avatar_url || null,
          created_at: proj.created_at,
          link: `/projects/${proj.id}`,
        });
      });
    }

    // 5. 시간순 정렬 및 제한
    activities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({ activities: limitedActivities }, { status: 200 });

  } catch (error) {
    console.error('[Dashboard Activities] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
