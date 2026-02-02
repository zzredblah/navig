/**
 * 음성 → 텍스트 변환 API (Whisper)
 *
 * POST /api/transcribe
 * - FormData: { audio: Blob, language?: 'ko' | 'en' | 'ja' }
 * - Response: { text, duration, language, confidence? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
// OpenAI 클라이언트는 필요 시에만 초기화 (빌드 시 에러 방지)
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// 지원 언어
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// 최대 파일 크기 (25MB - Whisper 제한)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
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
      console.error('[Transcribe] OPENAI_API_KEY not configured');
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

    // FormData 파싱
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const languageParam = formData.get('language') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: '오디오 파일이 필요합니다.' }, { status: 400 });
    }

    // 파일 크기 확인
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 25MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 언어 설정
    const language: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
      languageParam as SupportedLanguage
    )
      ? (languageParam as SupportedLanguage)
      : 'ko';

    // Blob → File 변환
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일 확장자 결정
    const mimeType = audioFile.type || 'audio/webm';
    let extension = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      extension = 'm4a';
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      extension = 'mp3';
    } else if (mimeType.includes('wav')) {
      extension = 'wav';
    }

    // OpenAI File 객체 생성
    const file = new File([buffer], `audio.${extension}`, { type: mimeType });

    console.log('[Transcribe] Processing audio:', {
      size: audioFile.size,
      type: mimeType,
      language,
    });

    // Whisper API 호출
    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
    });

    // 사용량 기록
    await recordAIUsage(user.id, 'voice_feedback', {
      duration: transcription.duration,
      language,
      textLength: transcription.text.length,
    });

    console.log('[Transcribe] Success:', {
      textLength: transcription.text.length,
      duration: transcription.duration,
    });

    return NextResponse.json({
      text: transcription.text,
      duration: transcription.duration || 0,
      language,
      segments: transcription.segments?.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);

    if (error instanceof OpenAI.APIError) {
      const errorStatus = (error as { status?: number }).status;
      if (errorStatus === 401) {
        return NextResponse.json(
          { error: 'AI 서비스 인증에 실패했습니다.' },
          { status: 500 }
        );
      }
      if (errorStatus === 429) {
        return NextResponse.json(
          { error: 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '음성 변환에 실패했습니다.' },
      { status: 500 }
    );
  }
}
