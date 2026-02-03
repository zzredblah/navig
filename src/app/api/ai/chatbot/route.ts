/**
 * AI 챗봇 API
 *
 * POST /api/ai/chatbot
 * - 계정 기반 AI 대화 (모든 프로젝트, 피드백 정보 포함)
 * - FAQ 패턴 매칭 시 AI 없이 즉시 응답 (무료 사용자도 가능)
 * - 스트리밍 응답 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import {
  getAccountContext,
  createAccountSystemPrompt,
  matchFAQ,
} from '@/lib/ai/chatbot-context';
import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatbotResponse, ChatbotSource } from '@/types/chatbot';

// OpenAI 클라이언트는 필요 시에만 초기화
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// 요청 스키마 (계정 기반 - project_id 불필요)
const requestSchema = z.object({
  message: z.string().min(1, '메시지를 입력해주세요.').max(500, '메시지가 너무 깁니다.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(10)
    .optional(),
  stream: z.boolean().optional().default(false),
});

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

    // 요청 파싱
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, history, stream } = parseResult.data;

    console.log('[Chatbot] Request:', {
      userId: user.id,
      messageLength: message.length,
      historyLength: history?.length || 0,
      stream,
    });

    // 1. FAQ 패턴 매칭 (AI 없이 즉시 응답)
    const faqMatch = matchFAQ(message);
    if (faqMatch) {
      console.log('[Chatbot] FAQ match found');

      const response: ChatbotResponse = {
        data: {
          message: faqMatch.answer,
          sources: [faqMatch.source],
          isFaq: true,
        },
        remaining: -1, // FAQ는 사용량 차감 안함
      };

      return NextResponse.json(response);
    }

    // 2. AI 사용량 확인 (FAQ가 아닌 경우에만)
    const usageCheck = await checkAIUsage(user.id, 'chatbot');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || 'AI 사용량을 초과했습니다.',
          remaining: usageCheck.remaining,
          resetAt: usageCheck.resetAt.toISOString(),
          suggestUpgrade: true,
        },
        { status: 403 }
      );
    }

    // 3. OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI 기능이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 4. 계정 컨텍스트 조회 (모든 프로젝트 및 피드백 정보)
    const context = await getAccountContext(user.id);
    if (!context) {
      return NextResponse.json(
        { error: '사용자 정보를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    // 5. 시스템 프롬프트 생성 (계정 기반)
    const systemPrompt = createAccountSystemPrompt(context);

    // 6. 대화 히스토리 구성
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 이전 대화 히스토리 추가 (최근 10개)
    if (history && history.length > 0) {
      history.forEach((h) => {
        messages.push({
          role: h.role,
          content: h.content,
        });
      });
    }

    // 현재 메시지 추가
    messages.push({ role: 'user', content: message });

    // 7. 스트리밍 응답
    if (stream) {
      const openai = getOpenAIClient();

      const streamResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      });

      // SSE 스트리밍 응답
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullContent = '';

          try {
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content || '';
              fullContent += content;

              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }

            // 완료 시 사용량 기록
            await recordAIUsage(user.id, 'chatbot', {
              messageLength: message.length,
              responseLength: fullContent.length,
            });

            // 완료 신호
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, remaining: usageCheck.remaining - 1 })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            console.error('[Chatbot] Streaming error:', error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: '응답 생성 중 오류가 발생했습니다.' })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // 8. 일반 응답 (비스트리밍)
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiMessage = completion.choices[0]?.message?.content || '죄송합니다. 응답을 생성할 수 없습니다.';

    // 소스 정보 구성 (계정 기반)
    const sources: ChatbotSource[] = [];
    if (context.projects && context.projects.length > 0) {
      sources.push({ type: 'project', title: `${context.projects.length}개 프로젝트` });
    }
    if (context.totalStats && context.totalStats.totalFeedbacks > 0) {
      sources.push({ type: 'feedback', title: '피드백 현황' });
    }

    // 사용량 기록
    await recordAIUsage(user.id, 'chatbot', {
      messageLength: message.length,
      responseLength: aiMessage.length,
    });

    console.log('[Chatbot] Success:', {
      responseLength: aiMessage.length,
      remaining: usageCheck.remaining - 1,
    });

    const response: ChatbotResponse = {
      data: {
        message: aiMessage,
        sources: sources.length > 0 ? sources : undefined,
        isFaq: false,
      },
      remaining: usageCheck.remaining - 1,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Chatbot] Error:', error);

    if (error instanceof OpenAI.APIError) {
      if ((error as { status?: number }).status === 429) {
        return NextResponse.json(
          { error: 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '응답 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
