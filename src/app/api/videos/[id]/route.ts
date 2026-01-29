/**
 * 영상 버전 상세 API
 * GET    - 영상 상세 조회 (Stream HLS URL 포함)
 * PATCH  - 영상 정보 수정
 * DELETE - 영상 삭제 (Stream + R2 모두 지원)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { deleteFile } from '@/lib/cloudflare/r2';
import { deleteVideo as deleteStreamVideo, isStreamConfigured } from '@/lib/cloudflare/stream';
import { z } from 'zod';

// 수정 요청 스키마
const updateVideoSchema = z.object({
  version_name: z.string().max(100).optional(),
  change_notes: z.string().min(1).optional(),
});

// GET: 영상 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 영상 조회
    const { data: video, error: queryError } = await adminClient
      .from('video_versions')
      .select(
        `
        *,
        uploader:profiles!uploaded_by(id, name, avatar_url),
        project:projects!project_id(id, title, client_id)
      `
      )
      .eq('id', videoId)
      .single();

    if (queryError || !video) {
      console.error('[Video GET] 조회 오류:', queryError);
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 멤버 확인 (역할 포함)
    const { data: member } = await adminClient
      .from('project_members')
      .select('id, role')
      .eq('project_id', video.project_id)
      .eq('user_id', user.id)
      .single();

    const isClientOwner = (video.project as { client_id: string })?.client_id === user.id;

    if (!member && !isClientOwner) {
      return NextResponse.json(
        { error: '이 영상에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 사용자 역할 결정
    const userRole = member?.role || (isClientOwner ? 'owner' : 'viewer');

    return NextResponse.json({ video, userRole });
  } catch (error) {
    console.error('[Video GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: 영상 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱 및 검증
    const body = await request.json();
    const validationResult = updateVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 기존 영상 조회
    const { data: existingVideo, error: queryError } = await adminClient
      .from('video_versions')
      .select('*, project:projects!project_id(client_id)')
      .eq('id', videoId)
      .single();

    if (queryError || !existingVideo) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 권한 확인 (업로더 본인 또는 프로젝트 소유자)
    const isUploader = existingVideo.uploaded_by === user.id;
    const isOwner =
      (existingVideo.project as { client_id: string })?.client_id === user.id;

    // 프로젝트 관리자 확인
    const { data: adminMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', existingVideo.project_id)
      .eq('user_id', user.id)
      .single();

    const isProjectOwner = adminMember?.role === 'owner';

    if (!isUploader && !isOwner && !isProjectOwner) {
      return NextResponse.json(
        { error: '이 영상을 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 영상 정보 수정
    const { data: video, error: updateError } = await adminClient
      .from('video_versions')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('[Video PATCH] 수정 오류:', updateError);
      return NextResponse.json(
        { error: '영상 수정 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ video });
  } catch (error) {
    console.error('[Video PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 영상 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 기존 영상 조회
    const { data: existingVideo, error: queryError } = await adminClient
      .from('video_versions')
      .select('*, project:projects!project_id(client_id)')
      .eq('id', videoId)
      .single();

    if (queryError || !existingVideo) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 권한 확인 (업로더 본인 또는 프로젝트 소유자)
    const isUploader = existingVideo.uploaded_by === user.id;
    const isOwner =
      (existingVideo.project as { client_id: string })?.client_id === user.id;

    // 프로젝트 관리자 확인
    const { data: adminMember } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', existingVideo.project_id)
      .eq('user_id', user.id)
      .single();

    const isProjectOwner = adminMember?.role === 'owner';

    if (!isUploader && !isOwner && !isProjectOwner) {
      return NextResponse.json(
        { error: '이 영상을 삭제할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Stream 영상 삭제
    if (existingVideo.stream_video_id && isStreamConfigured()) {
      try {
        await deleteStreamVideo(existingVideo.stream_video_id);
        console.log('[Video DELETE] Stream 영상 삭제 성공:', existingVideo.stream_video_id);
      } catch (streamError) {
        console.error('[Video DELETE] Stream 영상 삭제 오류:', streamError);
        // Stream 삭제 실패해도 DB 삭제는 진행
      }
    }

    // R2에서 파일 삭제 (R2 업로드인 경우)
    if (existingVideo.file_key) {
      try {
        await deleteFile('videos', existingVideo.file_key);
      } catch (r2Error) {
        console.error('[Video DELETE] R2 파일 삭제 오류:', r2Error);
        // R2 삭제 실패해도 DB 삭제는 진행
      }
    }

    // R2에서 썸네일 삭제
    if (existingVideo.thumbnail_key) {
      try {
        await deleteFile('videos', existingVideo.thumbnail_key);
      } catch (r2Error) {
        console.error('[Video DELETE] R2 썸네일 삭제 오류:', r2Error);
      }
    }

    // DB에서 영상 삭제
    const { error: deleteError } = await adminClient
      .from('video_versions')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      console.error('[Video DELETE] DB 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '영상 삭제 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '영상이 삭제되었습니다' });
  } catch (error) {
    console.error('[Video DELETE] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
