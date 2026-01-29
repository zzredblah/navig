/**
 * Stream 영상 상태 확인 API
 * GET - Stream에서 영상 인코딩 상태 확인 및 DB 업데이트
 *
 * Webhook이 작동하지 않는 경우 폴링 용도로 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  getVideo,
  getHlsUrl,
  getThumbnailUrl,
  getDownloadUrl,
  enableDownload,
} from '@/lib/cloudflare/stream';

// GET: Stream 영상 상태 확인
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

    // 영상 레코드 조회
    const { data: video, error: queryError } = await adminClient
      .from('video_versions')
      .select('id, status, stream_video_id, stream_ready, project_id')
      .eq('id', videoId)
      .single();

    if (queryError || !video) {
      return NextResponse.json(
        { error: '영상을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 프로젝트 접근 권한 확인
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', video.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', video.project_id)
      .single();

    if (!member && project?.client_id !== user.id) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Stream 영상이 아닌 경우
    if (!video.stream_video_id) {
      return NextResponse.json({
        status: video.status,
        isStreamVideo: false,
        ready: video.status === 'ready',
      });
    }

    // 이미 준비 완료된 경우
    if (video.stream_ready && video.status === 'ready') {
      return NextResponse.json({
        status: 'ready',
        isStreamVideo: true,
        ready: true,
      });
    }

    // Stream API에서 상태 확인
    try {
      const streamVideo = await getVideo(video.stream_video_id);

      if (streamVideo.readyToStream && streamVideo.status?.state === 'ready') {
        // 인코딩 완료 - DB 업데이트
        let downloadUrl: string | null = null;
        try {
          await enableDownload(video.stream_video_id);
          downloadUrl = getDownloadUrl(video.stream_video_id);
        } catch {
          console.warn('[Stream Status] 다운로드 활성화 실패');
        }

        const updateData: Record<string, unknown> = {
          status: 'ready',
          stream_ready: true,
          hls_url: getHlsUrl(video.stream_video_id),
          thumbnail_url: streamVideo.thumbnail || getThumbnailUrl(video.stream_video_id),
          download_url: downloadUrl,
        };

        if (streamVideo.duration) {
          updateData.duration = Math.round(streamVideo.duration);
        }
        if (streamVideo.input?.width && streamVideo.input?.height) {
          updateData.resolution = `${streamVideo.input.width}x${streamVideo.input.height}`;
        }

        await adminClient
          .from('video_versions')
          .update(updateData)
          .eq('id', videoId);

        return NextResponse.json({
          status: 'ready',
          isStreamVideo: true,
          ready: true,
          streamState: streamVideo.status?.state,
          duration: streamVideo.duration,
          resolution: streamVideo.input
            ? `${streamVideo.input.width}x${streamVideo.input.height}`
            : null,
        });
      } else if (streamVideo.status?.state === 'error') {
        // 에러 상태
        await adminClient
          .from('video_versions')
          .update({ status: 'error', stream_ready: false })
          .eq('id', videoId);

        return NextResponse.json({
          status: 'error',
          isStreamVideo: true,
          ready: false,
          streamState: 'error',
          errorCode: streamVideo.status?.errorReasonCode,
          errorMessage: streamVideo.status?.errorReasonText,
        });
      } else {
        // 인코딩 진행 중
        const currentStatus = streamVideo.status?.state || 'unknown';

        // encoding 상태로 업데이트 (아직 아니라면)
        if (video.status !== 'encoding' && ['queued', 'inprogress', 'downloading'].includes(currentStatus)) {
          await adminClient
            .from('video_versions')
            .update({ status: 'encoding' })
            .eq('id', videoId);
        }

        return NextResponse.json({
          status: 'encoding',
          isStreamVideo: true,
          ready: false,
          streamState: currentStatus,
          pctComplete: streamVideo.status?.pctComplete,
        });
      }
    } catch (streamError) {
      console.error('[Stream Status] Stream API 오류:', streamError);
      return NextResponse.json({
        status: video.status,
        isStreamVideo: true,
        ready: false,
        error: 'Stream API 조회 실패',
      });
    }
  } catch (error) {
    console.error('[Stream Status] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
