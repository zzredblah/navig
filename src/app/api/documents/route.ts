import { createClient, createAdminClient } from '@/lib/supabase/server';
import { documentQuerySchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';

// 전체 문서 목록 조회 (사용자가 접근 가능한 모든 프로젝트의 문서)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 사용자가 접근 가능한 프로젝트 ID 조회
    const { data: memberProjects } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    const { data: ownedProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('client_id', user.id);

    const memberProjectIds = memberProjects?.map((p) => p.project_id) || [];
    const ownedProjectIds = ownedProjects?.map((p) => p.id) || [];
    const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
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
      .select(
        '*, document_templates(id, name, type), profiles!documents_created_by_fkey(id, name, email), projects!documents_project_id_fkey(id, title)',
        { count: 'exact' }
      )
      .in('project_id', allProjectIds)
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
      console.error('[Documents API] 전체 목록 조회 실패:', queryError);
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
