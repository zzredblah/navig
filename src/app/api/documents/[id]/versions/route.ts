import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 문서 버전 히스토리 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 문서 존재 확인
    const { data: document } = await adminClient
      .from('documents')
      .select('id, project_id')
      .eq('id', id)
      .single();

    if (!document) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 프로젝트 접근 권한 확인
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', document.project_id)
      .single();

    const isOwner = project?.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', document.project_id)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && !member) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 버전 히스토리 조회 (content 포함)
    const { data: versions, error: queryError } = await adminClient
      .from('document_versions')
      .select('*, profiles!document_versions_created_by_fkey(id, name, email)')
      .eq('document_id', id)
      .order('version', { ascending: false });

    if (queryError) {
      console.error('[Versions API] 조회 실패:', queryError);
      return NextResponse.json({ error: '버전 히스토리 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: versions });
  } catch (error) {
    console.error('[Versions API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
