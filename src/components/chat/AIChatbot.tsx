'use client';

/**
 * AI 챗봇 컴포넌트
 *
 * 계정 기반 AI 도우미 (모든 프로젝트, 피드백 정보 포함)
 * - 접힘/펼침 상태 지원
 * - 스트리밍 응답 지원
 * - FAQ 무료 응답 지원
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  ChevronUp,
  ChevronDown,
  Send,
  Loader2,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatbotMessage, ChatbotSource } from '@/types/chatbot';

interface AIChatbotProps {
  isPanel?: boolean;
  defaultExpanded?: boolean;
  fullHeight?: boolean; // 전체 높이 사용 (헤더 패널용)
}

export function AIChatbot({ isPanel = false, defaultExpanded = false, fullHeight = false }: AIChatbotProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // 스크롤 하단으로
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 메시지 변경 시 스크롤
  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded, scrollToBottom]);

  // 펼침 시 입력창 포커스
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isExpanded]);

  // 메시지 전송
  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // 사용자 메시지 추가
    const userMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    // 입력창 포커스 유지
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    // AI 응답 placeholder 추가
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    try {
      // 히스토리 구성 (최근 10개)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          history,
          stream: true,
        }),
      });

      // 스트리밍이 아닌 에러 응답 처리
      if (!response.ok) {
        const errorData = await response.json();

        setMessages((prev) => prev.filter((m) => m.id !== assistantId));

        if (response.status === 403) {
          setError(errorData.error || 'AI 사용량을 초과했습니다.');
          if (errorData.suggestUpgrade) {
            setError('AI 챗봇은 Pro 플랜 이상에서 사용할 수 있습니다.');
          }
        } else {
          setError(errorData.error || '응답 생성에 실패했습니다.');
        }
        setIsLoading(false);
        return;
      }

      // 스트리밍 응답 처리
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE 스트리밍
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let sources: ChatbotSource[] | undefined;

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.content) {
                  fullContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: fullContent, isStreaming: true }
                        : m
                    )
                  );
                }

                if (data.done) {
                  if (data.remaining !== undefined) {
                    setRemaining(data.remaining);
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, isStreaming: false, sources }
                        : m
                    )
                  );
                }

                if (data.error) {
                  setError(data.error);
                  setMessages((prev) => prev.filter((m) => m.id !== assistantId));
                }
              } catch {
                // JSON 파싱 실패는 무시
              }
            }
          }
        }
      } else {
        // JSON 응답 (FAQ 등)
        const data = await response.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.data.message,
                  isStreaming: false,
                  sources: data.data.sources,
                }
              : m
          )
        );

        if (data.remaining !== undefined && data.remaining !== -1) {
          setRemaining(data.remaining);
        }
      }
    } catch (err) {
      console.error('[AIChatbot] Error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 대화 초기화
  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  // 접힌 상태의 배너
  if (!isExpanded) {
    return (
      <div
        className={cn(
          'shrink-0 border-b cursor-pointer transition-colors',
          'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100',
          'border-blue-200'
        )}
        onClick={() => setIsExpanded(true)}
      >
        <div className={cn('flex items-center justify-between', isPanel ? 'px-3 py-2' : 'px-4 py-3')}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600',
              isPanel ? 'h-6 w-6' : 'h-8 w-8'
            )}>
              <Bot className={cn('text-white', isPanel ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </div>
            <div>
              <span className={cn('font-medium text-gray-900', isPanel ? 'text-xs' : 'text-sm')}>
                NAVIG AI 도우미
              </span>
              {!isPanel && (
                <span className="ml-2 text-xs text-gray-500">무엇이든 물어보세요</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <span className={cn('font-medium', isPanel ? 'text-xs' : 'text-sm')}>질문하기</span>
            <ChevronDown className={cn(isPanel ? 'h-3 w-3' : 'h-4 w-4')} />
          </div>
        </div>
      </div>
    );
  }

  // 펼쳐진 상태
  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-gradient-to-b from-blue-50 to-white',
        fullHeight
          ? 'h-full' // 전체 높이 (헤더 패널용)
          : cn('shrink-0 border-b border-blue-200', isPanel ? 'max-h-[200px]' : 'max-h-[320px]')
      )}
    >
      {/* 헤더 - fullHeight 모드에서는 패널 헤더가 있으므로 생략 */}
      {!fullHeight && (
        <div className={cn(
          'flex items-center justify-between border-b border-blue-100',
          isPanel ? 'px-3 py-2' : 'px-4 py-3'
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600',
              isPanel ? 'h-6 w-6' : 'h-8 w-8'
            )}>
              <Bot className={cn('text-white', isPanel ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </div>
            <span className={cn('font-medium text-gray-900', isPanel ? 'text-xs' : 'text-sm')}>
              NAVIG AI 도우미
            </span>
            {remaining !== null && remaining >= 0 && (
              <span className="text-xs text-gray-400">(남은 횟수: {remaining})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-gray-400 hover:text-gray-600', isPanel ? 'h-6 w-6' : 'h-8 w-8')}
                onClick={handleClear}
                title="대화 초기화"
              >
                <X className={cn(isPanel ? 'h-3 w-3' : 'h-4 w-4')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn('text-gray-400 hover:text-gray-600', isPanel ? 'h-6 w-6' : 'h-8 w-8')}
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className={cn(isPanel ? 'h-3 w-3' : 'h-4 w-4')} />
            </Button>
          </div>
        </div>
      )}

      {/* fullHeight 모드에서 상단 액션 바 */}
      {fullHeight && messages.length > 0 && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-blue-100">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600 text-xs"
            onClick={handleClear}
          >
            <X className="h-3 w-3 mr-1" />
            대화 초기화
          </Button>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className={cn(
        'flex-1 overflow-y-auto min-h-0',
        fullHeight ? 'px-4 py-4' : (isPanel ? 'px-3 py-2' : 'px-4 py-3')
      )}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className={cn('text-blue-400 mb-3', fullHeight ? 'h-12 w-12' : (isPanel ? 'h-6 w-6' : 'h-8 w-8'))} />
            <p className={cn('text-gray-600 mb-2', fullHeight ? 'text-base font-medium' : (isPanel ? 'text-xs' : 'text-sm'))}>
              무엇을 도와드릴까요?
            </p>
            <p className={cn('text-gray-400', fullHeight ? 'text-sm' : 'text-xs')}>
              모든 프로젝트, 피드백, 사용법 등 무엇이든 물어보세요
            </p>
          </div>
        ) : (
          <div className={cn('space-y-3', fullHeight && 'space-y-4')}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg',
                    fullHeight ? 'px-4 py-3 text-sm' : (isPanel ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'),
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  )}
                >
                  {message.role === 'assistant' && message.isStreaming && !message.content ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className={cn('animate-spin', fullHeight ? 'h-4 w-4' : 'h-3 w-3')} />
                      <span className="text-gray-400">생각 중...</span>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            출처: {message.sources.map((s) => s.title).join(', ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className={cn(
          'flex items-center gap-2 bg-red-50 text-red-600 border-t border-red-100',
          fullHeight ? 'px-4 py-3 text-sm' : (isPanel ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')
        )}>
          <AlertCircle className={cn(fullHeight ? 'h-5 w-5' : (isPanel ? 'h-3 w-3' : 'h-4 w-4'))} />
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className={cn('text-red-400 hover:text-red-600', fullHeight ? 'h-8 w-8' : (isPanel ? 'h-5 w-5' : 'h-6 w-6'))}
            onClick={() => setError(null)}
          >
            <X className={cn(fullHeight ? 'h-4 w-4' : (isPanel ? 'h-3 w-3' : 'h-4 w-4'))} />
          </Button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className={cn(
        'flex items-end gap-2 border-t border-blue-100 bg-white shrink-0',
        fullHeight ? 'px-4 py-4' : (isPanel ? 'px-3 py-2' : 'px-4 py-3')
      )}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="질문을 입력하세요..."
          className={cn(
            'flex-1 resize-none bg-gray-50 border-gray-200 focus:border-blue-400',
            'min-h-0',
            fullHeight ? 'text-sm py-3 px-4' : (isPanel ? 'text-xs py-1.5 px-2' : 'text-sm py-2 px-3')
          )}
          rows={fullHeight ? 2 : 1}
          disabled={isLoading}
        />
        <Button
          size={fullHeight ? 'default' : (isPanel ? 'sm' : 'default')}
          className={cn(
            'bg-blue-600 hover:bg-blue-700 shrink-0',
            fullHeight ? 'h-10 w-10 p-0' : (isPanel ? 'h-7 w-7 p-0' : 'h-9 w-9 p-0')
          )}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className={cn('animate-spin', fullHeight ? 'h-5 w-5' : (isPanel ? 'h-3 w-3' : 'h-4 w-4'))} />
          ) : (
            <Send className={cn(fullHeight ? 'h-5 w-5' : (isPanel ? 'h-3 w-3' : 'h-4 w-4'))} />
          )}
        </Button>
      </div>
    </div>
  );
}
