import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { FeedbackTemplate, CreateTemplateRequest, MAX_TEMPLATES, DEFAULT_TEMPLATES } from '@/types/feedback-template';
import type { Json } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/feedback-templates
 * 현재 사용자의 피드백 템플릿 목록 조회
 * 템플릿이 없으면 기본 템플릿 자동 생성
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('feedback_templates')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[feedback-templates/GET] 조회 실패:', error);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다.' }, { status: 500 });
    }

    let templates = (profile?.feedback_templates || []) as unknown as FeedbackTemplate[];

    // 템플릿이 없으면 기본 템플릿 자동 생성
    if (templates.length === 0) {
      const now = new Date().toISOString();
      const defaultTemplates: FeedbackTemplate[] = DEFAULT_TEMPLATES.map((t, index) => ({
        id: uuidv4(),
        title: t.title,
        content: t.content,
        is_urgent: t.is_urgent,
        order: index,
        created_at: now,
      }));

      // Admin 클라이언트로 저장
      const adminClient = createAdminClient();
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ feedback_templates: defaultTemplates as unknown as Json })
        .eq('id', user.id);

      if (updateError) {
        console.error('[feedback-templates/GET] 기본 템플릿 생성 실패:', updateError);
        // 실패해도 빈 배열 반환 (다음에 다시 시도)
      } else {
        templates = defaultTemplates;
      }
    }

    // order 순으로 정렬
    templates.sort((a, b) => a.order - b.order);

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('[feedback-templates/GET] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * POST /api/feedback-templates
 * 새 피드백 템플릿 생성
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body: CreateTemplateRequest = await request.json();

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { error: '제목과 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 현재 템플릿 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('feedback_templates')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[feedback-templates/POST] 조회 실패:', fetchError);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다.' }, { status: 500 });
    }

    const templates = (profile?.feedback_templates || []) as unknown as FeedbackTemplate[];

    // 최대 개수 확인
    if (templates.length >= MAX_TEMPLATES) {
      return NextResponse.json(
        { error: `템플릿은 최대 ${MAX_TEMPLATES}개까지 생성할 수 있습니다.` },
        { status: 400 }
      );
    }

    // 새 템플릿 생성
    const newTemplate: FeedbackTemplate = {
      id: uuidv4(),
      title: body.title.trim(),
      content: body.content.trim(),
      is_urgent: body.is_urgent || false,
      order: templates.length,
      created_at: new Date().toISOString(),
    };

    const updatedTemplates = [...templates, newTemplate];

    // Admin 클라이언트로 업데이트 (RLS 우회)
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ feedback_templates: updatedTemplates as unknown as Json })
      .eq('id', user.id);

    if (updateError) {
      console.error('[feedback-templates/POST] 업데이트 실패:', updateError);
      return NextResponse.json({ error: '템플릿 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: newTemplate }, { status: 201 });
  } catch (error) {
    console.error('[feedback-templates/POST] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * PUT /api/feedback-templates
 * 템플릿 순서 일괄 변경
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body: { templateIds: string[] } = await request.json();

    if (!body.templateIds || !Array.isArray(body.templateIds)) {
      return NextResponse.json({ error: '템플릿 ID 목록이 필요합니다.' }, { status: 400 });
    }

    // 현재 템플릿 조회
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('feedback_templates')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[feedback-templates/PUT] 조회 실패:', fetchError);
      return NextResponse.json({ error: '템플릿 조회에 실패했습니다.' }, { status: 500 });
    }

    const templates = (profile?.feedback_templates || []) as unknown as FeedbackTemplate[];

    // ID로 템플릿 맵 생성
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    // 새 순서로 재정렬
    const reorderedTemplates = body.templateIds
      .map((id, index) => {
        const template = templateMap.get(id);
        if (template) {
          return { ...template, order: index };
        }
        return null;
      })
      .filter((t): t is FeedbackTemplate => t !== null);

    // Admin 클라이언트로 업데이트
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ feedback_templates: reorderedTemplates as unknown as Json })
      .eq('id', user.id);

    if (updateError) {
      console.error('[feedback-templates/PUT] 업데이트 실패:', updateError);
      return NextResponse.json({ error: '순서 변경에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: reorderedTemplates });
  } catch (error) {
    console.error('[feedback-templates/PUT] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
