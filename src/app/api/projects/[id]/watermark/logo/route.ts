/**
 * POST /api/projects/[id]/watermark/logo
 * 워터마크 로고 이미지 업로드
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { uploadFile, deleteFile } from '@/lib/cloudflare/r2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { error: '워터마크를 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 2MB 이하여야 합니다' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'PNG, JPG, WebP, SVG 파일만 업로드할 수 있습니다' },
        { status: 400 }
      );
    }

    // 기존 로고 URL 확인 (삭제용)
    const { data: project } = await adminClient
      .from('projects')
      .select('watermark_settings')
      .eq('id', projectId)
      .single();

    const existingSettings = project?.watermark_settings as { logo_url?: string } | null;
    const existingLogoUrl = existingSettings?.logo_url;

    // 파일 업로드
    const fileExt = file.name.split('.').pop() || 'png';
    const fileKey = `watermark-logos/${projectId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await uploadFile('src', fileKey, buffer, file.type);

    // 기존 로고 삭제 (URL이 다른 경우)
    if (existingLogoUrl && !existingLogoUrl.includes(fileKey)) {
      try {
        const oldKey = existingLogoUrl.split('/').slice(-2).join('/');
        await deleteFile('src', oldKey);
      } catch {
        // 삭제 실패해도 계속 진행
      }
    }

    // 워터마크 설정에 로고 URL 업데이트
    const newSettings = {
      ...(existingSettings || {}),
      logo_url: url,
    };

    await adminClient
      .from('projects')
      .update({
        watermark_settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return NextResponse.json({
      data: { logo_url: url },
      message: '로고가 업로드되었습니다',
    });
  } catch (error) {
    console.error('[POST /api/projects/[id]/watermark/logo] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    if (!member || (member.role !== 'owner' && member.role !== 'editor')) {
      return NextResponse.json(
        { error: '워터마크를 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 기존 로고 URL 확인
    const { data: project } = await adminClient
      .from('projects')
      .select('watermark_settings')
      .eq('id', projectId)
      .single();

    const existingSettings = project?.watermark_settings as { logo_url?: string } | null;
    const existingLogoUrl = existingSettings?.logo_url;

    if (existingLogoUrl) {
      try {
        const oldKey = existingLogoUrl.split('/').slice(-2).join('/');
        await deleteFile('src', oldKey);
      } catch {
        // 삭제 실패해도 계속 진행
      }
    }

    // 워터마크 설정에서 로고 URL 제거
    const newSettings = {
      ...(existingSettings || {}),
      logo_url: null,
    };

    await adminClient
      .from('projects')
      .update({
        watermark_settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return NextResponse.json({
      message: '로고가 삭제되었습니다',
    });
  } catch (error) {
    console.error('[DELETE /api/projects/[id]/watermark/logo] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
