import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { EditMetadata } from '@/types/editing';

type RouteParams = Promise<{ id: string; editId: string }>;

// 등록 요청 스키마
const registerSchema = z.object({
  version_name: z.string().max(100).optional(),
  change_notes: z.string().max(1000).optional(),
});

// 편집 프로젝트 등록 (영상 섹션에 등록)
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: projectId, editId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 편집 프로젝트 조회
    const { data: editProject } = await adminClient
      .from('edit_projects')
      .select(`
        *,
        source_video:video_versions!source_video_id(
          id, original_filename, file_url, file_key, file_size,
          hls_url, stream_video_id, duration, resolution, codec
        )
      `)
      .eq('id', editId)
      .eq('project_id', projectId)
      .single();

    if (!editProject) {
      return NextResponse.json(
        { error: '편집 프로젝트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 작성자만 등록 가능
    if (editProject.created_by !== user.id) {
      return NextResponse.json(
        { error: '편집 프로젝트 등록 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 이미 등록된 경우
    if (editProject.status !== 'draft') {
      return NextResponse.json(
        { error: '이미 등록된 편집 프로젝트입니다' },
        { status: 400 }
      );
    }

    // 소스 영상 필요
    if (!editProject.source_video && !editProject.source_url) {
      return NextResponse.json(
        { error: '편집할 영상이 없습니다' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // 현재 프로젝트의 최대 버전 번호 조회
    const { data: maxVersion } = await adminClient
      .from('video_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (maxVersion?.version_number || 0) + 1;

    // 편집 메타데이터 가져오기
    const editMetadata = editProject.edit_metadata as unknown as EditMetadata;
    const sourceVideo = editProject.source_video as {
      id: string;
      original_filename: string;
      file_url: string | null;
      file_key: string | null;
      file_size: number;
      hls_url: string | null;
      stream_video_id: string | null;
      duration: number | null;
      resolution: string | null;
      codec: string | null;
    } | null;

    // 변경 내용 생성
    const editSummary: string[] = [];
    if (editMetadata.trim && editMetadata.trim.startTime > 0) {
      editSummary.push(`트림: ${editMetadata.trim.startTime}초~${editMetadata.trim.endTime}초`);
    }
    if (editMetadata.speed && editMetadata.speed !== 1) {
      editSummary.push(`속도: ${editMetadata.speed}x`);
    }
    if (editMetadata.textOverlays && editMetadata.textOverlays.length > 0) {
      editSummary.push(`텍스트: ${editMetadata.textOverlays.length}개`);
    }
    if (editMetadata.filters) {
      const f = editMetadata.filters;
      if (f.brightness !== 100 || f.contrast !== 100 || f.saturation !== 100 || f.grayscale !== 0) {
        editSummary.push('필터 적용');
      }
    }

    const changeNotes = validatedData.change_notes ||
      (editSummary.length > 0 ? `편집: ${editSummary.join(', ')}` : '편집된 버전');

    // video_versions에 새 버전 생성
    const { data: newVideoVersion, error: insertError } = await adminClient
      .from('video_versions')
      .insert({
        project_id: projectId,
        version_number: nextVersionNumber,
        version_name: validatedData.version_name || `편집본 v${nextVersionNumber}`,
        original_filename: sourceVideo?.original_filename || editProject.title,
        file_url: sourceVideo?.file_url || editProject.source_url,
        file_key: sourceVideo?.file_key || editProject.source_key,
        file_size: sourceVideo?.file_size || 0,
        hls_url: sourceVideo?.hls_url,
        stream_video_id: sourceVideo?.stream_video_id,
        duration: editMetadata.trim
          ? editMetadata.trim.endTime - editMetadata.trim.startTime
          : sourceVideo?.duration || editProject.original_duration,
        resolution: sourceVideo?.resolution,
        codec: sourceVideo?.codec,
        change_notes: changeNotes,
        status: 'ready',
        uploaded_by: user.id,
        // 편집 메타데이터를 저장 (향후 서버 인코딩 시 사용)
        // Note: video_versions 테이블에 edit_metadata 컬럼이 없으면 이 부분 제거
      })
      .select()
      .single();

    if (insertError) {
      console.error('[편집 등록] video_versions 생성 오류:', insertError);
      return NextResponse.json(
        { error: '영상 버전 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // 편집 프로젝트 상태 업데이트
    const { error: updateError } = await adminClient
      .from('edit_projects')
      .update({
        status: 'registered',
        registered_at: new Date().toISOString(),
        registered_video_id: newVideoVersion.id,
      })
      .eq('id', editId);

    if (updateError) {
      console.error('[편집 등록] 상태 업데이트 오류:', updateError);
      // 롤백: 생성된 video_version 삭제
      await adminClient.from('video_versions').delete().eq('id', newVideoVersion.id);
      return NextResponse.json(
        { error: '편집 프로젝트 등록에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '편집 프로젝트가 영상 섹션에 등록되었습니다',
      data: {
        videoVersionId: newVideoVersion.id,
        versionNumber: newVideoVersion.version_number,
      },
    });
  } catch (error) {
    console.error('[편집 등록] 예외:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
