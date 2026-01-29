/**
 * Cloudflare Stream Webhook API
 * POST - Stream 영상 인코딩 완료/에러 알림 수신
 *
 * Cloudflare Dashboard > Stream > Settings > Webhooks 에서 설정
 * URL: https://your-domain.com/api/webhooks/stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getVideo, getHlsUrl, getThumbnailUrl, getDownloadUrl, enableDownload } from '@/lib/cloudflare/stream';
import { headers } from 'next/headers';
import { createHmac } from 'crypto';

// Webhook 시크릿 검증 (선택사항이지만 권장)
async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;

  // 시크릿이 설정되지 않으면 검증 스킵
  if (!secret) {
    console.warn('[Stream Webhook] CLOUDFLARE_STREAM_WEBHOOK_SECRET 미설정, 서명 검증 스킵');
    return true;
  }

  if (!signature) {
    console.error('[Stream Webhook] 서명 헤더 없음');
    return false;
  }

  // Cloudflare는 timestamp.signature 형식 사용
  const [timestamp, sig] = signature.split('.');

  if (!timestamp || !sig) {
    console.error('[Stream Webhook] 서명 형식 오류');
    return false;
  }

  // 5분 이내의 요청만 허용
  const timestampMs = parseInt(timestamp) * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    console.error('[Stream Webhook] 타임스탬프 만료');
    return false;
  }

  // HMAC 검증
  const expectedSig = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  return sig === expectedSig;
}

// Stream 이벤트 타입
interface StreamWebhookEvent {
  uid: string;
  readyToStream: boolean;
  status: {
    state: 'pendingupload' | 'downloading' | 'queued' | 'inprogress' | 'ready' | 'error';
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta?: Record<string, string>;
  created?: string;
  modified?: string;
  size?: number;
  duration?: number;
  input?: {
    width: number;
    height: number;
  };
  playback?: {
    hls?: string;
    dash?: string;
  };
  thumbnail?: string;
  preview?: string;
}

// POST: Stream Webhook 수신
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get('webhook-signature');

    // 서명 검증
    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: '서명 검증 실패' },
        { status: 401 }
      );
    }

    // 이벤트 파싱
    const event: StreamWebhookEvent = JSON.parse(rawBody);

    console.log('[Stream Webhook] 이벤트 수신:', {
      uid: event.uid,
      state: event.status?.state,
      readyToStream: event.readyToStream,
    });

    const adminClient = createAdminClient();

    // stream_video_id로 영상 레코드 조회
    const { data: video, error: queryError } = await adminClient
      .from('video_versions')
      .select('id, status, stream_video_id')
      .eq('stream_video_id', event.uid)
      .single();

    if (queryError || !video) {
      console.warn('[Stream Webhook] 영상 레코드 없음:', event.uid);
      // Webhook은 성공 응답을 해야 재시도하지 않음
      return NextResponse.json({ message: '영상 레코드 없음 (무시)' });
    }

    // 이미 처리된 경우 스킵
    if (video.status === 'ready' || video.status === 'error') {
      console.log('[Stream Webhook] 이미 처리된 영상:', video.id);
      return NextResponse.json({ message: '이미 처리됨' });
    }

    // 상태에 따라 처리
    if (event.readyToStream && event.status?.state === 'ready') {
      // 인코딩 완료
      console.log('[Stream Webhook] 인코딩 완료:', event.uid);

      // Stream API에서 상세 정보 조회
      const streamVideo = await getVideo(event.uid);

      // 다운로드 활성화
      let downloadUrl: string | null = null;
      try {
        await enableDownload(event.uid);
        downloadUrl = getDownloadUrl(event.uid);
      } catch (downloadError) {
        console.warn('[Stream Webhook] 다운로드 활성화 실패:', downloadError);
      }

      // DB 업데이트
      const updateData: Record<string, unknown> = {
        status: 'ready',
        stream_ready: true,
        hls_url: getHlsUrl(event.uid),
        thumbnail_url: streamVideo.thumbnail || getThumbnailUrl(event.uid),
        download_url: downloadUrl,
      };

      // 메타데이터 업데이트
      if (streamVideo.duration) {
        updateData.duration = Math.round(streamVideo.duration);
      }
      if (streamVideo.input?.width && streamVideo.input?.height) {
        updateData.resolution = `${streamVideo.input.width}x${streamVideo.input.height}`;
      }
      if (streamVideo.size) {
        updateData.file_size = streamVideo.size;
      }

      const { error: updateError } = await adminClient
        .from('video_versions')
        .update(updateData)
        .eq('id', video.id);

      if (updateError) {
        console.error('[Stream Webhook] DB 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: 'DB 업데이트 실패' },
          { status: 500 }
        );
      }

      console.log('[Stream Webhook] 처리 완료:', video.id);
      return NextResponse.json({
        message: '영상 준비 완료',
        videoId: video.id,
      });
    } else if (event.status?.state === 'error') {
      // 인코딩 에러
      console.error('[Stream Webhook] 인코딩 에러:', {
        uid: event.uid,
        errorCode: event.status.errorReasonCode,
        errorText: event.status.errorReasonText,
      });

      const { error: updateError } = await adminClient
        .from('video_versions')
        .update({
          status: 'error',
          stream_ready: false,
        })
        .eq('id', video.id);

      if (updateError) {
        console.error('[Stream Webhook] DB 업데이트 오류:', updateError);
      }

      return NextResponse.json({
        message: '에러 상태 업데이트됨',
        videoId: video.id,
      });
    } else if (['downloading', 'queued', 'inprogress'].includes(event.status?.state)) {
      // 인코딩 진행 중 - status를 encoding으로 업데이트
      if (video.status !== 'encoding') {
        await adminClient
          .from('video_versions')
          .update({ status: 'encoding' })
          .eq('id', video.id);
      }

      return NextResponse.json({
        message: '인코딩 진행 중',
        state: event.status.state,
      });
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('[Stream Webhook] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류' },
      { status: 500 }
    );
  }
}
