/**
 * 음성 피드백 API
 *
 * POST /api/videos/:id/voice-feedback
 * - 음성 녹음을 텍스트로 변환하고 피드백으로 자동 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import OpenAI from 'openai';

// OpenAI 클라이언트는 필요 시에만 초기화 (빌드 시 에러 방지)
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: videoId } = await params;

    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI 기능이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // AI 사용량 확인
    const usageCheck = await checkAIUsage(user.id, 'voice_feedback');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || 'AI 사용량을 초과했습니다.',
          remaining: usageCheck.remaining,
          resetAt: usageCheck.resetAt.toISOString(),
        },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 영상 버전 확인 및 프로젝트 접근 권한 확인
    const { data: version, error: versionError } = await adminClient
      .from('video_versions')
      .select(`
        id,
        project_id,
        version_number,
        projects!inner(id, client_id)
      `)
      .eq('id', videoId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 프로젝트 멤버 확인
    const { data: membership } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', version.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const isOwner = version.projects?.client_id === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: '이 프로젝트에 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const timecode = parseFloat(formData.get('timecode') as string) || 0;
    const language = (formData.get('language') as string) || 'ko';

    if (!audioFile) {
      return NextResponse.json({ error: '오디오 파일이 필요합니다.' }, { status: 400 });
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 25MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // Blob → File 변환
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    let extension = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      extension = 'm4a';
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      extension = 'mp3';
    }

    const file = new File([buffer], `audio.${extension}`, { type: mimeType });

    console.log('[VoiceFeedback] Transcribing audio:', {
      videoId,
      timecode,
      size: audioFile.size,
      language,
    });

    // Whisper API 호출
    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
    });

    if (!transcription.text.trim()) {
      return NextResponse.json(
        { error: '음성을 인식할 수 없습니다. 다시 녹음해주세요.' },
        { status: 400 }
      );
    }

    // 피드백 생성
    const { data: feedback, error: feedbackError } = await adminClient
      .from('video_feedbacks')
      .insert({
        video_id: videoId,
        project_id: version.project_id,
        content: transcription.text,
        timestamp_seconds: Math.floor(timecode),
        created_by: user.id,
      })
      .select(`
        *,
        author:profiles!video_feedbacks_created_by_fkey(id, name, avatar_url)
      `)
      .single();

    if (feedbackError) {
      console.error('[VoiceFeedback] Feedback creation failed:', feedbackError);
      return NextResponse.json(
        { error: '피드백 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // AI 사용량 기록
    await recordAIUsage(user.id, 'voice_feedback', {
      videoId,
      feedbackId: feedback.id,
      duration: transcription.duration,
      language,
    });

    console.log('[VoiceFeedback] Success:', {
      feedbackId: feedback.id,
      textLength: transcription.text.length,
    });

    return NextResponse.json({
      feedback,
      transcription: {
        text: transcription.text,
        duration: transcription.duration || 0,
        language,
      },
    });
  } catch (error) {
    console.error('[VoiceFeedback] Error:', error);

    if (error instanceof OpenAI.APIError) {
      if ((error as { status?: number }).status === 429) {
        return NextResponse.json(
          { error: 'AI 서비스 사용량이 초과되었습니다.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '음성 피드백 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
