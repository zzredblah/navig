import { createClient, createAdminClient } from '@/lib/supabase/server';
import { changeStatusSchema, validTransitions } from '@/lib/validations/document';
import { DocumentStatus } from '@/types/database';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 문서 상태 변경
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 문서 조회
    const { data: document } = await adminClient
      .from('documents')
      .select('id, project_id, created_by, status, type')
      .eq('id', id)
      .single();

    if (!document) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = changeStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { status: newStatus, reject_reason } = validationResult.data;
    const currentStatus = document.status as DocumentStatus;

    // 상태 전환 유효성 검증
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { error: `'${currentStatus}' 상태에서 '${newStatus}'로 전환할 수 없습니다` },
        { status: 400 }
      );
    }

    // signed 상태는 계약서만 가능
    if (newStatus === 'signed' && document.type !== 'contract') {
      return NextResponse.json(
        { error: '서명은 계약서만 가능합니다' },
        { status: 400 }
      );
    }

    // 권한 검증
    const hasPermission = await validateStatusChangePermission(
      adminClient, document, user.id, currentStatus, newStatus
    );

    if (!hasPermission) {
      return NextResponse.json({ error: '상태 변경 권한이 없습니다' }, { status: 403 });
    }

    // 상태 업데이트
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'rejected') {
      updateData.reject_reason = reject_reason;
    }
    if (newStatus === 'draft') {
      updateData.reject_reason = null;
    }

    const { data: updatedDoc, error: updateError } = await adminClient
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Documents Status API] 상태 변경 실패:', updateError);
      return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({
      message: `문서 상태가 '${newStatus}'로 변경되었습니다`,
      data: updatedDoc,
    });
  } catch (error) {
    console.error('[Documents Status API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

async function validateStatusChangePermission(
  adminClient: ReturnType<typeof createAdminClient>,
  document: { project_id: string; created_by: string },
  userId: string,
  currentStatus: DocumentStatus,
  newStatus: string
): Promise<boolean> {
  // draft → pending: 작성자만
  if (currentStatus === 'draft' && newStatus === 'pending') {
    return document.created_by === userId;
  }

  // pending → approved/rejected: 프로젝트 소유자 또는 작성자가 아닌 멤버(검토자)
  if (currentStatus === 'pending' && (newStatus === 'approved' || newStatus === 'rejected')) {
    if (document.created_by === userId) return false; // 작성자는 자기 문서를 승인/반려 불가

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', document.project_id)
      .single();

    if (project?.client_id === userId) return true;

    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', document.project_id)
      .eq('user_id', userId)
      .single();

    return member?.role === 'owner' || member?.role === 'editor';
  }

  // rejected → draft: 작성자만
  if (currentStatus === 'rejected' && newStatus === 'draft') {
    return document.created_by === userId;
  }

  // approved → signed: 프로젝트 멤버
  if (currentStatus === 'approved' && newStatus === 'signed') {
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', document.project_id)
      .single();

    if (project?.client_id === userId) return true;

    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', document.project_id)
      .eq('user_id', userId)
      .single();

    return !!member;
  }

  return false;
}
