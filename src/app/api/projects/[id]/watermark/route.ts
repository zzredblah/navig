/**
 * GET/PATCH /api/projects/[id]/watermark
 * 프로젝트 워터마크 설정 조회/수정
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { watermarkSettingsSchema } from '@/lib/validations/project';
import { DEFAULT_WATERMARK_SETTINGS } from '@/types/watermark';
import type { WatermarkSettings } from '@/types/watermark';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - 워터마크 설정 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 프로젝트 멤버 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: '프로젝트에 접근할 수 없습니다' },
        { status: 403 }
      );
    }

    // 프로젝트 워터마크 설정 조회
    const { data: project, error } = await adminClient
      .from('projects')
      .select('watermark_settings')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 워터마크 설정이 없으면 기본값 반환
    const settings: WatermarkSettings =
      (project.watermark_settings as unknown as WatermarkSettings) || DEFAULT_WATERMARK_SETTINGS;

    return NextResponse.json({
      data: { settings },
    });
  } catch (error) {
    console.error('[GET /api/projects/[id]/watermark] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - 워터마크 설정 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 프로젝트 멤버 확인 (owner 또는 editor만 수정 가능)
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: '프로젝트에 접근할 수 없습니다' },
        { status: 403 }
      );
    }

    if (member.role !== 'owner' && member.role !== 'editor') {
      return NextResponse.json(
        { error: '워터마크 설정을 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();

    // 유효성 검증
    const result = watermarkSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 워터마크 설정입니다',
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const settings = result.data;

    // 워터마크 설정 업데이트
    const { data: project, error } = await adminClient
      .from('projects')
      .update({
        watermark_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select('watermark_settings')
      .single();

    if (error) {
      console.error('[PATCH /api/projects/[id]/watermark] DB 오류:', error);
      return NextResponse.json(
        { error: '워터마크 설정 저장에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { settings: project.watermark_settings as unknown as WatermarkSettings },
      message: '워터마크 설정이 저장되었습니다',
    });
  } catch (error) {
    console.error('[PATCH /api/projects/[id]/watermark] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
