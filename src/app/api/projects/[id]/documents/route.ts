import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createDocumentSchema, documentQuerySchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogger } from '@/lib/activity/logger';

type RouteParams = { params: Promise<{ id: string }> };

// 프로젝트 문서 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const hasAccess = await checkProjectAccess(adminClient, projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: '프로젝트 접근 권한이 없습니다' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = documentQuerySchema.safeParse({
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { type, status, page, limit } = queryResult.data;
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('documents')
      .select('*, document_templates(id, name, type), profiles!documents_created_by_fkey(id, name, email)', { count: 'exact' })
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: documents, error: queryError, count } = await query
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('[Documents API] 조회 실패:', queryError);
      return NextResponse.json({ error: '문서 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({
      data: documents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    console.error('[Documents API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 문서 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 프로젝트 접근 권한 확인
    const hasAccess = await checkProjectAccess(adminClient, projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: '프로젝트 접근 권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { template_id, type, title, content } = validationResult.data;

    // 템플릿 존재 확인 (template_id 지정된 경우)
    if (template_id) {
      const { data: template } = await adminClient
        .from('document_templates')
        .select('id')
        .eq('id', template_id)
        .single();

      if (!template) {
        return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 });
      }
    }

    const { data: document, error: createError } = await adminClient
      .from('documents')
      .insert({
        project_id: projectId,
        template_id: template_id || null,
        type,
        title,
        content: content || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Documents API] 생성 실패:', createError);
      return NextResponse.json({ error: '문서 생성에 실패했습니다' }, { status: 500 });
    }

    // 초기 버전 생성
    await adminClient
      .from('document_versions')
      .insert({
        document_id: document.id,
        version: 1,
        content: content || {},
        created_by: user.id,
      });

    // 활동 로그 기록
    await ActivityLogger.logDocumentCreated(
      projectId,
      user.id,
      document.id,
      title
    );

    return NextResponse.json(
      { message: '문서가 생성되었습니다', data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Documents API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 프로젝트 접근 권한 확인 헬퍼
async function checkProjectAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  projectId: string,
  userId: string
): Promise<boolean> {
  // 프로젝트 소유자 확인
  const { data: project } = await adminClient
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single();

  if (project?.client_id === userId) return true;

  // 프로젝트 멤버 확인 (초대 수락한 멤버만)
  const { data: member } = await adminClient
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null) // 초대 수락한 멤버만
    .single();

  return !!member;
}
