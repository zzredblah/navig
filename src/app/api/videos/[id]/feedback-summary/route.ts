/**
 * AI 피드백 요약 API
 * POST - 영상의 모든 피드백을 AI가 분석하여 요약
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import OpenAI from 'openai';

// OpenAI 클라이언트 lazy 초기화 (빌드 타임 오류 방지)
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// POST: 피드백 요약 생성
export async function POST(
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

    // AI 사용량 체크
    const usageCheck = await checkAIUsage(user.id, 'feedback_summary');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || 'AI 사용량 제한에 도달했습니다',
          remaining: usageCheck.remaining,
          resetAt: usageCheck.resetAt.toISOString(),
        },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 영상 정보 조회
    const { data: video, error: videoError } = await adminClient
      .from('video_versions')
      .select('id, project_id, original_filename, version_name')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
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
      .limit(1);

    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', video.project_id)
      .single();

    const isMember = member && member.length > 0;
    const isOwner = project?.client_id === user.id;

    if (!isMember && !isOwner) {
      return NextResponse.json(
        { error: '이 영상에 접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 피드백 목록 조회
    const { data: feedbacks, error: feedbacksError } = await adminClient
      .from('video_feedbacks')
      .select(`
        id,
        content,
        timestamp_seconds,
        is_urgent,
        status,
        created_at,
        author:profiles!created_by(name)
      `)
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true });

    if (feedbacksError) {
      console.error('[Feedback Summary] 피드백 조회 실패:', feedbacksError);
      return NextResponse.json(
        { error: '피드백 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json(
        { error: '분석할 피드백이 없습니다' },
        { status: 400 }
      );
    }

    // 피드백 텍스트 구성
    const feedbackTexts = feedbacks.map((fb, idx) => {
      const time = formatTimestamp(fb.timestamp_seconds);
      const authorName = (fb.author as { name: string } | null)?.name || '익명';
      const urgentMark = fb.is_urgent ? '[긴급]' : '';
      const statusMark = fb.status === 'resolved' ? '[해결됨]' : '';
      return `${idx + 1}. ${time} - ${authorName} ${urgentMark}${statusMark}: ${fb.content}`;
    }).join('\n');

    const videoTitle = video.version_name || video.original_filename || '영상';

    // OpenAI API 호출
    const prompt = `다음은 영상 "${videoTitle}"에 대한 피드백 목록입니다. 이 피드백들을 분석하여 다음 형식으로 요약해주세요:

1. **전체 요약**: 피드백들의 전반적인 내용을 2-3문장으로 요약
2. **주요 수정 요청**: 가장 많이 언급되거나 중요한 수정 요청 사항들 (최대 5개)
3. **긴급 사항**: 긴급 표시된 피드백들의 핵심 내용
4. **해결 현황**: 전체 피드백 중 해결된 것과 미해결인 것의 비율
5. **권장 조치**: 편집자가 우선적으로 처리해야 할 작업 제안

피드백 목록:
${feedbackTexts}

한국어로 답변해주세요. 마크다운 형식을 사용하지 말고 일반 텍스트로 작성해주세요.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 영상 제작 피드백을 분석하는 전문가입니다. 주어진 피드백들을 체계적으로 분석하고 실용적인 요약을 제공합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || '요약을 생성할 수 없습니다.';

    // AI 사용량 기록
    await recordAIUsage(user.id, 'feedback_summary', {
      videoId,
      feedbackCount: feedbacks.length,
      tokensUsed: completion.usage?.total_tokens || 0,
    });

    // 통계 계산
    const stats = {
      total: feedbacks.length,
      resolved: feedbacks.filter((fb) => fb.status === 'resolved').length,
      urgent: feedbacks.filter((fb) => fb.is_urgent).length,
      open: feedbacks.filter((fb) => fb.status === 'open').length,
    };

    return NextResponse.json({
      summary,
      stats,
      remaining: usageCheck.remaining - 1,
    });
  } catch (error) {
    console.error('[Feedback Summary] 예외:', error);

    // OpenAI 에러 처리
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// 초를 "분:초" 형식으로 변환
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
