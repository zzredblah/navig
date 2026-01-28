import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { FeedbackTemplate, UpdateTemplateRequest } from '@/types/feedback-template';
import type { Json } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/feedback-templates/[id]
 * 템플릿 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body: UpdateTemplateRequest = await request.json();

    // 현재 템플릿 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('feedback_templates')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[feedback-templates/PATCH] 조회 실패:', fetchError);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다.' }, { status: 500 });
    }

    const templates = (profile?.feedback_templates || []) as unknown as FeedbackTemplate[];
    const templateIndex = templates.findIndex((t) => t.id === id);

    if (templateIndex === -1) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 템플릿 수정
    const updatedTemplate = {
      ...templates[templateIndex],
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.content !== undefined && { content: body.content.trim() }),
      ...(body.is_urgent !== undefined && { is_urgent: body.is_urgent }),
      ...(body.order !== undefined && { order: body.order }),
    };

    const updatedTemplates = [...templates];
    updatedTemplates[templateIndex] = updatedTemplate;

    // Admin 클라이언트로 업데이트
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ feedback_templates: updatedTemplates as unknown as Json })
      .eq('id', user.id);

    if (updateError) {
      console.error('[feedback-templates/PATCH] 업데이트 실패:', updateError);
      return NextResponse.json({ error: '템플릿 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedTemplate });
  } catch (error) {
    console.error('[feedback-templates/PATCH] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/feedback-templates/[id]
 * 템플릿 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 현재 템플릿 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('feedback_templates')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[feedback-templates/DELETE] 조회 실패:', fetchError);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다.' }, { status: 500 });
    }

    const templates = (profile?.feedback_templates || []) as unknown as FeedbackTemplate[];
    const templateExists = templates.some((t) => t.id === id);

    if (!templateExists) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 템플릿 삭제 및 순서 재정렬
    const updatedTemplates = templates
      .filter((t) => t.id !== id)
      .map((t, index) => ({ ...t, order: index }));

    // Admin 클라이언트로 업데이트
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ feedback_templates: updatedTemplates as unknown as Json })
      .eq('id', user.id);

    if (updateError) {
      console.error('[feedback-templates/DELETE] 업데이트 실패:', updateError);
      return NextResponse.json({ error: '템플릿 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[feedback-templates/DELETE] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
