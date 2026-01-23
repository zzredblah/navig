import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateDocumentSchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 문서 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: document, error } = await adminClient
      .from('documents')
      .select(`
        *,
        document_templates(id, name, type, fields),
        profiles!documents_created_by_fkey(id, name, email),
        signatures(id, user_id, signed_at, profiles!signatures_user_id_fkey(id, name, email))
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 프로젝트 접근 권한 확인
    const hasAccess = await checkDocumentAccess(adminClient, document.project_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: '문서 접근 권한이 없습니다' }, { status: 403 });
    }

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error('[Documents API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 문서 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 문서 존재 확인 및 권한 체크
    const { data: existingDoc } = await adminClient
      .from('documents')
      .select('id, project_id, created_by, status, version, content')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!existingDoc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 서명 완료된 문서는 수정 불가
    if (existingDoc.status === 'signed') {
      return NextResponse.json(
        { error: '서명 완료된 문서는 수정할 수 없습니다' },
        { status: 400 }
      );
    }

    // 작성자만 수정 가능
    if (existingDoc.created_by !== user.id) {
      return NextResponse.json({ error: '작성자만 수정할 수 있습니다' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const newVersion = existingDoc.version + 1;

    // draft가 아닌 경우 수정 시 상태를 draft로 리셋
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      version: newVersion,
    };
    if (existingDoc.status !== 'draft') {
      updateData.status = 'draft';
    }

    const { data: document, error: updateError } = await adminClient
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Documents API] 수정 실패:', updateError);
      return NextResponse.json({ error: '문서 수정에 실패했습니다' }, { status: 500 });
    }

    // 버전 히스토리 생성 (항상)
    await adminClient
      .from('document_versions')
      .insert({
        document_id: id,
        version: newVersion,
        content: validationResult.data.content || existingDoc.content || {},
        created_by: user.id,
      });

    return NextResponse.json({ message: '문서가 수정되었습니다', data: document });
  } catch (error) {
    console.error('[Documents API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 문서 소프트 삭제 (휴지통으로 이동)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: existingDoc } = await adminClient
      .from('documents')
      .select('id, project_id, created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!existingDoc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 작성자 또는 프로젝트 소유자만 삭제 가능
    if (existingDoc.created_by !== user.id) {
      const { data: project } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', existingDoc.project_id)
        .single();

      if (project?.client_id !== user.id) {
        return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 });
      }
    }

    // 소프트 삭제: deleted_at 설정
    const { error: deleteError } = await adminClient
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('[Documents API] 삭제 실패:', deleteError);
      return NextResponse.json({ error: '문서 삭제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '문서가 휴지통으로 이동되었습니다' });
  } catch (error) {
    console.error('[Documents API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

async function checkDocumentAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data: project } = await adminClient
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single();

  if (project?.client_id === userId) return true;

  const { data: member } = await adminClient
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return !!member;
}
