/**
 * AI 템플릿 추천 API
 *
 * POST /api/ai/recommend-template
 * - 프로젝트 설명을 분석하여 적합한 문서 템플릿 추천
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import OpenAI from 'openai';
import { z } from 'zod';

// OpenAI 클라이언트는 필요 시에만 초기화 (빌드 시 에러 방지)
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// 요청 스키마
const requestSchema = z.object({
  project_description: z.string().min(10, '프로젝트 설명은 10자 이상이어야 합니다.'),
  document_type: z.enum(['work_request', 'quote', 'contract']).optional(),
});

// AI 분석 결과 타입
interface ProjectAnalysis {
  project_type: string;
  keywords: string[];
  complexity: 'simple' | 'medium' | 'complex';
  suggested_duration: string;
  budget_range: string;
}

// 템플릿 추천 결과 타입
interface TemplateRecommendation {
  template_id: string;
  template_name: string;
  template_type: string;
  match_score: number;
  reason: string;
  suggested_fields: Record<string, string>;
}

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
      return NextResponse.json(
        { error: 'AI 기능이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // AI 사용량 확인
    const usageCheck = await checkAIUsage(user.id, 'template_recommend');
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

    // 요청 파싱
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { project_description, document_type } = parseResult.data;

    console.log('[TemplateRecommend] Analyzing project:', {
      descriptionLength: project_description.length,
      documentType: document_type,
    });

    // 사용 가능한 템플릿 조회 (profiles.feedback_templates JSONB 필드 사용)
    const adminClient = createAdminClient();

    // Note: feedback_templates is stored as JSONB in profiles table
    // For now, return empty array since the table doesn't exist
    const templates: Array<{ id: string; name: string; type: string; content: string }> = [];

    // GPT를 사용한 프로젝트 분석
    const analysisResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 영상 제작 프로젝트 분석 전문가입니다.
프로젝트 설명을 분석하여 다음 정보를 JSON으로 추출하세요:
- project_type: 영상 유형 (홍보영상, 제품소개, 교육영상, 뮤직비디오, 기업소개, 광고영상, 브이로그, 다큐멘터리, 인터뷰, 웨딩영상, 행사영상, 애니메이션, 모션그래픽 등)
- keywords: 핵심 키워드 배열 (최대 5개)
- complexity: 프로젝트 복잡도 (simple, medium, complex)
- suggested_duration: 예상 제작 기간 (예: "2-3주")
- budget_range: 예상 예산 범위 (예: "100만원-300만원")

반드시 JSON 형식으로만 응답하세요.`,
        },
        { role: 'user', content: project_description },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    let analysis: ProjectAnalysis;
    try {
      analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');
    } catch {
      analysis = {
        project_type: '일반 영상',
        keywords: [],
        complexity: 'medium',
        suggested_duration: '2-4주',
        budget_range: '미정',
      };
    }

    // 템플릿이 없으면 빈 추천 반환
    if (!templates || templates.length === 0) {
      await recordAIUsage(user.id, 'template_recommend', {
        descriptionLength: project_description.length,
        recommendationCount: 0,
      });

      return NextResponse.json({
        recommendations: [],
        analysis,
      });
    }

    // 템플릿 매칭
    const matchResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 영상 제작 문서 템플릿 추천 전문가입니다.
프로젝트 정보와 사용 가능한 템플릿 목록을 보고, 가장 적합한 템플릿을 추천하세요.

응답은 다음 JSON 배열 형식으로 제공하세요:
{
  "recommendations": [
    {
      "template_id": "템플릿ID",
      "match_score": 0-100 사이의 일치도,
      "reason": "추천 이유 (한 문장)",
      "suggested_fields": { "필드명": "제안 값" }
    }
  ]
}

최대 3개까지 추천하고, match_score 기준 내림차순으로 정렬하세요.
match_score가 50 미만인 템플릿은 제외하세요.`,
        },
        {
          role: 'user',
          content: `프로젝트 정보:
- 설명: ${project_description}
- 분석된 유형: ${analysis.project_type}
- 키워드: ${analysis.keywords.join(', ')}
- 복잡도: ${analysis.complexity}
${document_type ? `- 원하는 문서 유형: ${document_type}` : ''}

사용 가능한 템플릿:
${templates.map((t) => `- ID: ${t.id}, 이름: ${t.name}, 유형: ${t.type}`).join('\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    let recommendations: TemplateRecommendation[] = [];
    try {
      const matchResult = JSON.parse(matchResponse.choices[0].message.content || '{}');
      const rawRecommendations = matchResult.recommendations || [];

      // 템플릿 정보와 매핑
      recommendations = rawRecommendations
        .filter((r: { template_id: string; match_score: number }) => {
          const template = templates.find((t) => t.id === r.template_id);
          return template && r.match_score >= 50;
        })
        .map((r: { template_id: string; match_score: number; reason: string; suggested_fields?: Record<string, string> }) => {
          const template = templates.find((t) => t.id === r.template_id)!;
          return {
            template_id: r.template_id,
            template_name: template.name,
            template_type: template.type,
            match_score: r.match_score,
            reason: r.reason,
            suggested_fields: r.suggested_fields || {},
          };
        })
        .slice(0, 3);
    } catch {
      recommendations = [];
    }

    // AI 사용량 기록
    await recordAIUsage(user.id, 'template_recommend', {
      descriptionLength: project_description.length,
      recommendationCount: recommendations.length,
      projectType: analysis.project_type,
    });

    console.log('[TemplateRecommend] Success:', {
      projectType: analysis.project_type,
      recommendationCount: recommendations.length,
    });

    return NextResponse.json({
      recommendations,
      analysis,
    });
  } catch (error) {
    console.error('[TemplateRecommend] Error:', error);

    if (error instanceof OpenAI.APIError) {
      if ((error as { status?: number }).status === 429) {
        return NextResponse.json(
          { error: 'AI 서비스 사용량이 초과되었습니다.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '템플릿 추천에 실패했습니다.' },
      { status: 500 }
    );
  }
}
