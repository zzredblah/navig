import { createClient, createAdminClient } from '@/lib/supabase/server';
import { signDocumentSchema } from '@/lib/validations/document';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

// 문서 서명
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      .select('id, project_id, type, status')
      .eq('id', id)
      .single();

    if (!document) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 계약서만 서명 가능
    if (document.type !== 'contract') {
      return NextResponse.json({ error: '계약서만 서명할 수 있습니다' }, { status: 400 });
    }

    // approved 상태에서만 서명 가능
    if (document.status !== 'approved') {
      return NextResponse.json(
        { error: '승인된 문서만 서명할 수 있습니다' },
        { status: 400 }
      );
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
      return NextResponse.json({ error: '서명 권한이 없습니다' }, { status: 403 });
    }

    // 이미 서명했는지 확인
    const { data: existingSignature } = await adminClient
      .from('signatures')
      .select('id')
      .eq('document_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingSignature) {
      return NextResponse.json({ error: '이미 서명하셨습니다' }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = signDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // IP, User-Agent 추출
    const ip = request.headers.get('x-forwarded-for')
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 서명 저장
    const { data: signature, error: signError } = await adminClient
      .from('signatures')
      .insert({
        document_id: id,
        user_id: user.id,
        signature_data: validationResult.data.signature_data,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (signError) {
      console.error('[Sign API] 서명 저장 실패:', signError);
      return NextResponse.json({ error: '서명 저장에 실패했습니다' }, { status: 500 });
    }

    // 문서 상태를 signed로 변경
    await adminClient
      .from('documents')
      .update({ status: 'signed' })
      .eq('id', id);

    return NextResponse.json(
      { message: '서명이 완료되었습니다', data: signature },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Sign API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
